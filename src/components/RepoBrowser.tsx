import { useDeferredValue, useMemo, useState } from "react";
import { formatCount, formatDate, timeAgo } from "@/lib/format";
import { languageColor } from "@/lib/languages";
import { filterRepos, type RepoFilters, type RepoSort, type RepoType } from "@/lib/repos";
import type { GitHubRepo } from "@/lib/types";
import { Icon } from "./icons";
import { Button } from "./ui/button";
import { Badge, Input, NativeSelect } from "./ui/primitives";

const PAGE = 24;

export function RepoBrowser({ repos, onOpenRepo }: { repos: GitHubRepo[]; onOpenRepo: (repo: GitHubRepo) => void }) {
  const [filters, setFilters] = useState<RepoFilters>({ query: "", sort: "stars", language: "all", type: "all" });
  const [limit, setLimit] = useState(PAGE);
  const deferredQuery = useDeferredValue(filters.query);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    repos.forEach((r) => counts.set(r.language ?? "none", (counts.get(r.language ?? "none") ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [repos]);

  const results = useMemo(() => filterRepos(repos, { ...filters, query: deferredQuery }), [repos, filters, deferredQuery]);
  const update = (patch: Partial<RepoFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };
  const filtered = filters.query || filters.language !== "all" || filters.type !== "all";

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <label htmlFor="repo-search" className="sr-only">
            Find a repository
          </label>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="repo-search"
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Find a repository by name, description or topic"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:contents">
          <label className="sr-only" htmlFor="repo-type">
            Type
          </label>
          <NativeSelect id="repo-type" value={filters.type} onChange={(e) => update({ type: e.target.value as RepoType })}>
            <option value="all">All types</option>
            <option value="sources">Sources</option>
            <option value="forks">Forks</option>
            <option value="archived">Archived</option>
          </NativeSelect>
          <label className="sr-only" htmlFor="repo-language">
            Language
          </label>
          <NativeSelect id="repo-language" value={filters.language} onChange={(e) => update({ language: e.target.value })}>
            <option value="all">All languages</option>
            {languages.map(([lang, n]) => (
              <option key={lang} value={lang}>
                {lang === "none" ? "No language" : lang} ({n})
              </option>
            ))}
          </NativeSelect>
          <label className="sr-only" htmlFor="repo-sort">
            Sort by
          </label>
          <NativeSelect id="repo-sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value as RepoSort })}>
            <option value="stars">Most stars</option>
            <option value="updated">Recently pushed</option>
            <option value="name">Name (A–Z)</option>
          </NativeSelect>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p aria-live="polite">
          {results.length === repos.length
            ? `${formatCount(repos.length)} ${repos.length === 1 ? "repository" : "repositories"}`
            : `${formatCount(results.length)} of ${formatCount(repos.length)} repositories match`}
        </p>
        {filtered && (
          <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" onClick={() => update({ query: "", language: "all", type: "all" })}>
            Clear filters
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Icon name="search" className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 font-medium">{repos.length ? "No repositories match" : "No public repositories yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {repos.length ? "Try a different word, or clear the filters." : "This account hasn't published any public repositories."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {results.slice(0, limit).map((repo) => (
            <li key={repo.id} className="min-w-0">
              <RepoCard repo={repo} onOpen={() => onOpenRepo(repo)} />
            </li>
          ))}
        </ul>
      )}

      {results.length > limit && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({formatCount(results.length - limit)} left)
          </Button>
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo, onOpen }: { repo: GitHubRepo; onOpen: () => void }) {
  const topics = repo.topics ?? [];
  return (
    <article className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/60">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-medium">
          <button
            type="button"
            onClick={onOpen}
            className="cursor-pointer truncate text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Open details for ${repo.name}`}
          >
            {repo.name}
          </button>
        </h3>
        <div className="flex shrink-0 gap-1">
          {repo.fork && <Badge variant="outline">Fork</Badge>}
          {repo.archived && (
            <Badge variant="outline" className="text-muted-foreground">
              Archived
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{repo.description || "No description"}</p>
      {topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
          {topics.slice(0, 5).map((t) => (
            <li key={t}>
              <Badge variant="topic">{t}</Badge>
            </li>
          ))}
          {topics.length > 5 && <li className="text-xs text-muted-foreground">+{topics.length - 5}</li>}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: languageColor(repo.language) }} aria-hidden="true" />
            {repo.language}
          </span>
        )}
        <span className="tabular flex items-center gap-1" title={`${repo.stargazers_count} stars`}>
          <Icon name="star" className="size-3.5" />
          {formatCount(repo.stargazers_count)}
        </span>
        <span className="tabular flex items-center gap-1" title={`${repo.forks_count} forks`}>
          <Icon name="fork" className="size-3.5" />
          {formatCount(repo.forks_count)}
        </span>
        {repo.pushed_at && (
          <span title={`Last push ${formatDate(repo.pushed_at)}`}>Updated {timeAgo(repo.pushed_at)}</span>
        )}
      </div>
    </article>
  );
}
