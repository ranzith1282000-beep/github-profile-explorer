import { languageColor } from "./languages";
import type { GitHubEvent, GitHubRepo } from "./types";

export interface ProfileTotals {
  repos: number;
  sourceRepos: number;
  forkedRepos: number;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
}

/** Totals across the user's own (non-fork) repositories, so forked projects don't inflate them. */
export function totals(repos: GitHubRepo[]): ProfileTotals {
  const sources = repos.filter((r) => !r.fork);
  const sum = (key: "stargazers_count" | "forks_count" | "watchers_count" | "open_issues_count") =>
    sources.reduce((acc, r) => acc + r[key], 0);
  return {
    repos: repos.length,
    sourceRepos: sources.length,
    forkedRepos: repos.length - sources.length,
    stars: sum("stargazers_count"),
    forks: sum("forks_count"),
    watchers: sum("watchers_count"),
    openIssues: sum("open_issues_count"),
  };
}

export interface LanguageShare {
  language: string;
  repos: number;
  share: number;
  color: string;
}

/**
 * Share of source repositories by their main language. Counting repositories rather than
 * bytes of code needs no extra API calls (bytes would cost one request per repository).
 */
export function languageBreakdown(repos: GitHubRepo[], top = 6): LanguageShare[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((acc, [, n]) => acc + n, 0);
  const rows = head.map(([language, n]) => ({ language, repos: n, share: n / total, color: languageColor(language) }));
  if (rest > 0) rows.push({ language: "Other", repos: rest, share: rest / total, color: "#9ca3af" });
  return rows;
}

export function topRepos(repos: GitHubRepo[], n = 3) {
  return repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || (b.pushed_at ?? "").localeCompare(a.pushed_at ?? ""))
    .slice(0, n);
}

/* ---------- Activity heatmap ---------- */

export interface HeatDay {
  date: string; // YYYY-MM-DD, local time
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  inRange: boolean;
}

export interface Heatmap {
  weeks: HeatDay[][];
  total: number;
  activeDays: number;
  busiest: HeatDay | null;
  longestStreak: number;
  currentStreak: number;
}

export const HEATMAP_DAYS = 91;

export function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Every public event counts once. A push counts once per commit when GitHub includes the
 * commit count (older events do; since 2025 the public events API usually leaves it out).
 */
export function eventWeight(event: GitHubEvent) {
  if (event.type !== "PushEvent") return 1;
  const commits = event.payload.size ?? event.payload.commits?.length ?? 1;
  return Math.max(1, commits);
}

/**
 * Builds a GitHub-style grid (columns are weeks starting on Sunday) for the last `days` days.
 * Levels split the busiest day's count into quarters, as GitHub's own graph does.
 */
export function buildHeatmap(events: GitHubEvent[], today: Date = new Date(), days = HEATMAP_DAYS): Heatmap {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = localDateKey(new Date(event.created_at));
    counts.set(key, (counts.get(key) ?? 0) + eventWeight(event));
  }

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back to Sunday

  const inRangeDays: HeatDay[] = [];
  const weeks: HeatDay[][] = [];
  const cursor = new Date(gridStart);
  while (cursor <= end) {
    const week: HeatDay[] = [];
    for (let i = 0; i < 7 && cursor <= end; i++) {
      const key = localDateKey(cursor);
      const inRange = cursor >= start;
      const day: HeatDay = { date: key, count: inRange ? (counts.get(key) ?? 0) : 0, level: 0, inRange };
      week.push(day);
      if (inRange) inRangeDays.push(day);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const max = Math.max(0, ...inRangeDays.map((d) => d.count));
  for (const day of inRangeDays) {
    day.level = day.count === 0 ? 0 : (Math.min(4, Math.ceil((day.count / max) * 4)) as HeatDay["level"]);
  }

  let longest = 0;
  let run = 0;
  for (const day of inRangeDays) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // The current streak may still continue today, so an empty today doesn't break it.
  let current = 0;
  for (let i = inRangeDays.length - 1; i >= 0; i--) {
    if (inRangeDays[i].count > 0) current++;
    else if (i !== inRangeDays.length - 1) break;
  }

  const busiest = inRangeDays.reduce<HeatDay | null>((best, d) => (d.count > (best?.count ?? 0) ? d : best), null);
  return {
    weeks,
    total: inRangeDays.reduce((acc, d) => acc + d.count, 0),
    activeDays: inRangeDays.filter((d) => d.count > 0).length,
    busiest,
    longestStreak: longest,
    currentStreak: current,
  };
}
