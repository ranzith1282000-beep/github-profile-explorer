// The parts of GitHub's REST API responses this app uses.

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: "User" | "Organization" | string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  /** In list responses GitHub sets this to the star count, for historical reasons. */
  watchers_count: number;
  /** The real watcher count. Only present on the single-repository endpoint. */
  subscribers_count?: number;
  /** Includes open pull requests as well as issues. */
  open_issues_count: number;
  license: { spdx_id: string | null; name: string } | null;
  default_branch: string;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  owner: { login: string };
}

export interface GitHubReadme {
  path: string;
  content: string;
  encoding: string;
  html_url: string;
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: EventPayload;
}

export interface EventPayload {
  action?: string;
  ref?: string | null;
  ref_type?: string;
  head?: string;
  size?: number;
  commits?: { sha: string; message: string }[];
  pull_request?: { number: number; title?: string; html_url?: string; merged?: boolean };
  issue?: { number: number; title: string; html_url: string; pull_request?: unknown };
  comment?: { html_url: string; body?: string };
  release?: { name: string | null; tag_name: string; html_url: string };
  forkee?: { full_name: string; html_url: string };
  member?: { login: string };
  pages?: { page_name: string; action: string }[];
}

export interface RateLimit {
  limit: number;
  remaining: number;
  resetAt: Date;
}
