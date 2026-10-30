import { describe, expect, it } from "vitest";
import { buildHeatmap, eventWeight, languageBreakdown, topRepos, totals } from "../src/lib/stats";
import type { GitHubEvent, GitHubRepo } from "../src/lib/types";

function repo(overrides: Partial<GitHubRepo>): GitHubRepo {
  return {
    id: Math.floor(Math.random() * 1e9),
    name: "repo",
    full_name: "me/repo",
    html_url: "https://github.com/me/repo",
    description: null,
    fork: false,
    archived: false,
    homepage: null,
    language: "Python",
    topics: [],
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    license: null,
    default_branch: "main",
    size: 10,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    pushed_at: "2024-01-01T00:00:00Z",
    owner: { login: "me" },
    ...overrides,
  };
}

function event(type: string, created_at: string, payload: GitHubEvent["payload"] = {}): GitHubEvent {
  return { id: created_at + type, type, created_at, repo: { name: "me/repo" }, payload };
}

describe("totals", () => {
  it("adds up source repositories and leaves forks out", () => {
    const t = totals([
      repo({ stargazers_count: 10, forks_count: 2, watchers_count: 10, open_issues_count: 3 }),
      repo({ stargazers_count: 5, forks_count: 1, watchers_count: 5, open_issues_count: 0 }),
      repo({ fork: true, stargazers_count: 1000, forks_count: 100 }),
    ]);
    expect(t).toEqual({ repos: 3, sourceRepos: 2, forkedRepos: 1, stars: 15, forks: 3, watchers: 15, openIssues: 3 });
  });
});

describe("languageBreakdown", () => {
  it("counts each source repo's main language and groups the long tail as Other", () => {
    const repos = [
      ...Array.from({ length: 4 }, () => repo({ language: "Python" })),
      ...Array.from({ length: 2 }, () => repo({ language: "TypeScript" })),
      repo({ language: "Go" }),
      repo({ language: "Rust" }),
      repo({ language: null }),
      repo({ language: "C", fork: true }),
    ];
    const rows = languageBreakdown(repos, 2);
    expect(rows.map((r) => [r.language, r.repos])).toEqual([
      ["Python", 4],
      ["TypeScript", 2],
      ["Other", 2],
    ]);
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1);
  });

  it("returns nothing when no repository has a language", () => {
    expect(languageBreakdown([repo({ language: null })])).toEqual([]);
  });
});

describe("topRepos", () => {
  it("ranks source repos by stars", () => {
    const names = topRepos(
      [repo({ name: "a", stargazers_count: 1 }), repo({ name: "b", stargazers_count: 9 }), repo({ name: "c", fork: true, stargazers_count: 99 })],
      2,
    ).map((r) => r.name);
    expect(names).toEqual(["b", "a"]);
  });
});

describe("eventWeight", () => {
  it("counts commits when GitHub includes them, otherwise one per event", () => {
    expect(eventWeight(event("PushEvent", "2024-01-01T10:00:00Z", { size: 4 }))).toBe(4);
    expect(eventWeight(event("PushEvent", "2024-01-01T10:00:00Z", { head: "abc" }))).toBe(1);
    expect(eventWeight(event("WatchEvent", "2024-01-01T10:00:00Z"))).toBe(1);
  });
});

describe("buildHeatmap", () => {
  const today = new Date(2024, 5, 30); // Sunday 30 June 2024
  const at = (day: number, month = 5) => new Date(2024, month, day, 12).toISOString();

  it("covers 91 days in Sunday-first weeks and totals the events", () => {
    const map = buildHeatmap([event("PushEvent", at(30), { size: 3 }), event("IssuesEvent", at(29)), event("WatchEvent", at(29))], today);
    const days = map.weeks.flat().filter((d) => d.inRange);
    expect(days).toHaveLength(91);
    expect(map.weeks.every((w) => new Date(`${w[0].date}T00:00:00`).getDay() === 0)).toBe(true);
    expect(map.total).toBe(5);
    expect(map.activeDays).toBe(2);
    expect(map.busiest?.date).toBe("2024-06-30");
  });

  it("splits counts into four levels relative to the busiest day", () => {
    const events = [
      event("PushEvent", at(10), { size: 8 }),
      event("PushEvent", at(11), { size: 4 }),
      event("PushEvent", at(12), { size: 1 }),
    ];
    const byDate = Object.fromEntries(buildHeatmap(events, today).weeks.flat().map((d) => [d.date, d.level]));
    expect(byDate["2024-06-10"]).toBe(4);
    expect(byDate["2024-06-11"]).toBe(2);
    expect(byDate["2024-06-12"]).toBe(1);
    expect(byDate["2024-06-13"]).toBe(0);
  });

  it("ignores events older than the window", () => {
    expect(buildHeatmap([event("PushEvent", at(1, 0), { size: 5 })], today).total).toBe(0);
  });

  it("measures streaks, and an empty today doesn't end the current one", () => {
    const events = [10, 11, 12, 13, 27, 28, 29].map((d) => event("WatchEvent", at(d)));
    const map = buildHeatmap(events, today);
    expect(map.longestStreak).toBe(4);
    expect(map.currentStreak).toBe(3);
  });
});
