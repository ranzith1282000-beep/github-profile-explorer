import type { GitHubRepo } from "./types";

export type RepoSort = "stars" | "updated" | "name";
export type RepoType = "all" | "sources" | "forks" | "archived";

export interface RepoFilters {
  query: string;
  sort: RepoSort;
  language: string;
  type: RepoType;
}

/** Pure so it can be unit-tested: search name, description and topics, then filter and sort. */
export function filterRepos(repos: GitHubRepo[], { query, sort, language, type }: RepoFilters) {
  const q = query.trim().toLowerCase();
  return repos
    .filter((r) => {
      if (type === "sources" && r.fork) return false;
      if (type === "forks" && !r.fork) return false;
      if (type === "archived" && !r.archived) return false;
      if (language !== "all" && (r.language ?? "none") !== language) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.topics ?? []).some((t) => t.includes(q))
      );
    })
    .sort((a, b) => {
      if (sort === "stars") return b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      return (b.pushed_at ?? b.updated_at).localeCompare(a.pushed_at ?? a.updated_at);
    });
}
