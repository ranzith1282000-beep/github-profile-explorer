import type { GitHubEvent, GitHubReadme, GitHubRepo, GitHubUser, RateLimit } from "./types";

const API = "https://api.github.com";

/** Most repositories fetched per profile: 3 pages of 100. Keeps a big account to 3 requests. */
export const MAX_REPO_PAGES = 3;
/** GitHub's public events API returns at most 300 events from the last 90 days. */
export const MAX_EVENT_PAGES = 3;

export type GitHubErrorKind = "not_found" | "rate_limited" | "bad_token" | "network" | "http";

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status?: number;
  readonly resetAt?: Date;

  constructor(kind: GitHubErrorKind, message: string, status?: number, resetAt?: Date) {
    super(message);
    this.name = "GitHubError";
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }
}

let token: string | null = null;
const rateListeners = new Set<(rate: RateLimit) => void>();

/** The token is only ever sent to api.github.com. */
export function setToken(value: string | null) {
  token = value?.trim() || null;
}

export function hasToken() {
  return token !== null;
}

export function onRateLimit(listener: (rate: RateLimit) => void) {
  rateListeners.add(listener);
  return () => {
    rateListeners.delete(listener);
  };
}

export function readRateLimit(headers: Headers): RateLimit | null {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (limit === null || remaining === null || reset === null) return null;
  return { limit: Number(limit), remaining: Number(remaining), resetAt: new Date(Number(reset) * 1000) };
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API + path, { headers, signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new GitHubError("network", "Couldn't reach GitHub. Check your internet connection and try again.");
  }

  const rate = readRateLimit(res.headers);
  if (rate) rateListeners.forEach((listener) => listener(rate));

  if (res.ok) return (await res.json()) as T;

  if (res.status === 404) throw new GitHubError("not_found", "Not found on GitHub.", 404);
  if (res.status === 401) {
    throw new GitHubError(
      "bad_token",
      "GitHub didn't accept your token. It may have expired or been revoked. Replace it, or remove it to browse without one.",
      401,
    );
  }
  if ((res.status === 403 || res.status === 429) && (rate?.remaining === 0 || res.headers.has("retry-after"))) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const resetAt = rate?.resetAt ?? (retryAfter ? new Date(Date.now() + retryAfter * 1000) : undefined);
    throw new GitHubError("rate_limited", "GitHub's hourly request limit has been reached.", res.status, resetAt);
  }
  throw new GitHubError("http", `GitHub returned an error (HTTP ${res.status}). Try again in a moment.`, res.status);
}

const enc = encodeURIComponent;

export function getUser(login: string, signal?: AbortSignal) {
  return request<GitHubUser>(`/users/${enc(login)}`, signal);
}

export async function getRepos(login: string, publicRepos: number, signal?: AbortSignal) {
  const pages = Math.min(Math.ceil(publicRepos / 100), MAX_REPO_PAGES);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      request<GitHubRepo[]>(`/users/${enc(login)}/repos?per_page=100&sort=pushed&page=${i + 1}`, signal),
    ),
  );
  const repos = results.flat();
  return { repos, truncated: publicRepos > repos.length };
}

export async function getEvents(login: string, signal?: AbortSignal) {
  const events: GitHubEvent[] = [];
  for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
    const batch = await request<GitHubEvent[]>(`/users/${enc(login)}/events/public?per_page=100&page=${page}`, signal);
    events.push(...batch);
    if (batch.length < 100) break;
  }
  return events;
}

export function getRepo(fullName: string, signal?: AbortSignal) {
  const [owner, name] = fullName.split("/");
  return request<GitHubRepo>(`/repos/${enc(owner)}/${enc(name)}`, signal);
}

/** Returns null when the repository has no README. */
export async function getReadme(fullName: string, signal?: AbortSignal) {
  const [owner, name] = fullName.split("/");
  try {
    return await request<GitHubReadme>(`/repos/${enc(owner)}/${enc(name)}/readme`, signal);
  } catch (err) {
    if (err instanceof GitHubError && err.kind === "not_found") return null;
    throw err;
  }
}

/** GitHub sends README content as base64. Decode it as UTF-8 so emoji and accents survive. */
export function decodeBase64Utf8(content: string) {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const LOGIN_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Accepts "torvalds", "@torvalds" or a profile URL, and returns the login, or null if it can't be one. */
export function parseLogin(input: string): string | null {
  let value = input.trim();
  const fromUrl = value.match(/github\.com\/([^/?#\s]+)/i);
  if (fromUrl) value = fromUrl[1];
  value = value.replace(/^@/, "");
  return LOGIN_PATTERN.test(value) ? value : null;
}
