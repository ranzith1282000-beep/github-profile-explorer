import { describe, expect, it } from "vitest";
import { describeEvent } from "../src/lib/events";
import { formatCount, normaliseUrl, timeAgo } from "../src/lib/format";
import { decodeBase64Utf8, parseLogin, readRateLimit } from "../src/lib/github";
import { resolveReadmeUrl } from "../src/lib/readme";
import { filterRepos } from "../src/lib/repos";
import type { GitHubEvent, GitHubRepo } from "../src/lib/types";

describe("parseLogin", () => {
  it("accepts usernames, @handles and profile links", () => {
    expect(parseLogin("torvalds")).toBe("torvalds");
    expect(parseLogin("  @gaearon ")).toBe("gaearon");
    expect(parseLogin("https://github.com/sindresorhus?tab=repositories")).toBe("sindresorhus");
    expect(parseLogin("ranzith1282000-beep")).toBe("ranzith1282000-beep");
  });

  it("rejects strings GitHub wouldn't allow as a username", () => {
    expect(parseLogin("")).toBeNull();
    expect(parseLogin("-leading")).toBeNull();
    expect(parseLogin("double--hyphen")).toBeNull();
    expect(parseLogin("has space")).toBeNull();
    expect(parseLogin("a".repeat(40))).toBeNull();
  });
});

describe("readRateLimit", () => {
  it("reads GitHub's rate-limit headers", () => {
    const headers = new Headers({ "x-ratelimit-limit": "60", "x-ratelimit-remaining": "12", "x-ratelimit-reset": "1700000000" });
    expect(readRateLimit(headers)).toEqual({ limit: 60, remaining: 12, resetAt: new Date(1700000000 * 1000) });
    expect(readRateLimit(new Headers())).toBeNull();
  });
});

describe("decodeBase64Utf8", () => {
  it("keeps accents and emoji intact", () => {
    const text = "# Café ☕ — naïve 🚀";
    const bytes = new TextEncoder().encode(text);
    const base64 = btoa(String.fromCharCode(...bytes)).replace(/(.{20})/g, "$1\n"); // GitHub wraps lines too
    expect(decodeBase64Utf8(base64)).toBe(text);
  });
});

describe("resolveReadmeUrl", () => {
  const src = { fullName: "me/app", branch: "main", path: "docs/README.md" };
  it("resolves relative images to raw files and links to GitHub pages", () => {
    expect(resolveReadmeUrl("img/shot.png", "image", src)).toBe("https://raw.githubusercontent.com/me/app/main/docs/img/shot.png");
    expect(resolveReadmeUrl("../LICENSE", "link", src)).toBe("https://github.com/me/app/blob/main/LICENSE");
    expect(resolveReadmeUrl("/images/a.png", "image", src)).toBe("https://raw.githubusercontent.com/me/app/main/images/a.png");
  });
  it("leaves absolute URLs and anchors alone, but fixes /blob/ image links", () => {
    expect(resolveReadmeUrl("https://example.com/a.png", "image", src)).toBe("https://example.com/a.png");
    expect(resolveReadmeUrl("#install", "link", src)).toBe("#install");
    expect(resolveReadmeUrl("https://github.com/me/app/blob/main/a.png", "image", src)).toBe("https://github.com/me/app/raw/main/a.png");
  });
});

describe("format", () => {
  it("shortens large counts", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1234)).toBe("1.2K");
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
  it("describes time relative to now", () => {
    const now = new Date("2024-06-30T12:00:00Z");
    expect(timeAgo("2024-06-30T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2024-06-30T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2024-06-29T12:00:00Z", now)).toBe("yesterday");
  });
  it("adds a scheme to bare blog URLs", () => {
    expect(normaliseUrl("example.com/")).toEqual({ href: "https://example.com/", label: "example.com" });
  });
});

describe("describeEvent", () => {
  const base = { id: "1", created_at: "2024-06-30T12:00:00Z", repo: { name: "me/app" } };
  it("describes pushes with and without commit details", () => {
    const withCommits = describeEvent({
      ...base,
      type: "PushEvent",
      payload: { ref: "refs/heads/main", size: 2, commits: [{ sha: "a1b2c3d4e5", message: "Fix bug\n\nlong body" }] },
    } as GitHubEvent);
    expect(withCommits.title).toBe("Pushed 2 commits to main");
    expect(withCommits.commits[0].message).toBe("Fix bug");

    const bare = describeEvent({ ...base, type: "PushEvent", payload: { ref: "refs/heads/dev", head: "ffee00" } } as GitHubEvent);
    expect(bare.title).toBe("Pushed to dev");
    expect(bare.url).toBe("https://github.com/me/app/commit/ffee00");
  });
  it("recognises merged pull requests and new branches", () => {
    const pr = describeEvent({
      ...base,
      type: "PullRequestEvent",
      payload: { action: "closed", pull_request: { number: 7, title: "Add tests", merged: true } },
    } as GitHubEvent);
    expect(pr).toMatchObject({ kind: "pr", title: "Merged pull request #7: Add tests" });
    const branch = describeEvent({ ...base, type: "CreateEvent", payload: { ref: "feature", ref_type: "branch" } } as GitHubEvent);
    expect(branch).toMatchObject({ kind: "branch", title: "Created branch feature" });
  });
});

describe("filterRepos", () => {
  const r = (name: string, extra: Partial<GitHubRepo> = {}) =>
    ({
      name,
      description: null,
      topics: [],
      fork: false,
      archived: false,
      language: "Python",
      stargazers_count: 0,
      pushed_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      ...extra,
    }) as GitHubRepo;
  const repos = [
    r("weather-ml", { stargazers_count: 5, topics: ["machine-learning"], pushed_at: "2024-03-01T00:00:00Z" }),
    r("dashboard", { language: "TypeScript", stargazers_count: 9, description: "Sales dashboard" }),
    r("old-fork", { fork: true, stargazers_count: 1, pushed_at: "2024-05-01T00:00:00Z" }),
  ];
  const all = { query: "", sort: "stars" as const, language: "all", type: "all" as const };

  it("searches names, descriptions and topics", () => {
    expect(filterRepos(repos, { ...all, query: "machine" }).map((x) => x.name)).toEqual(["weather-ml"]);
    expect(filterRepos(repos, { ...all, query: "SALES" }).map((x) => x.name)).toEqual(["dashboard"]);
  });
  it("filters by type and language, and sorts", () => {
    expect(filterRepos(repos, { ...all, type: "forks" }).map((x) => x.name)).toEqual(["old-fork"]);
    expect(filterRepos(repos, { ...all, language: "Python", type: "sources" }).map((x) => x.name)).toEqual(["weather-ml"]);
    expect(filterRepos(repos, all).map((x) => x.name)).toEqual(["dashboard", "weather-ml", "old-fork"]);
    expect(filterRepos(repos, { ...all, sort: "updated" }).map((x) => x.name)).toEqual(["old-fork", "weather-ml", "dashboard"]);
    expect(filterRepos(repos, { ...all, sort: "name" }).map((x) => x.name)).toEqual(["dashboard", "old-fork", "weather-ml"]);
  });
});
