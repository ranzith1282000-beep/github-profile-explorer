import { formatCount, formatFull, plural } from "@/lib/format";
import { languageColor } from "@/lib/languages";
import { languageBreakdown, topRepos, totals, type LanguageShare } from "@/lib/stats";
import type { GitHubRepo } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/primitives";

interface Props {
  repos: GitHubRepo[];
  truncated: boolean;
  onOpenRepo: (repo: GitHubRepo) => void;
}

export function StatsDashboard({ repos, truncated, onOpenRepo }: Props) {
  const t = totals(repos);
  const languages = languageBreakdown(repos);
  const top = topRepos(repos, 3);
  const starred = topRepos(repos, 8).filter((r) => r.stargazers_count > 0);

  const cards: { label: string; value: number; icon: IconName; hint: string; note?: string }[] = [
    { label: "Stars", value: t.stars, icon: "star", hint: "Stars across their own repositories" },
    { label: "Forks", value: t.forks, icon: "fork", hint: "Times their repositories were forked" },
    {
      label: "Watchers",
      value: t.watchers,
      icon: "eye",
      hint: "GitHub's repository list reports watchers equal to stars. Open a repository to see how many people actually watch it.",
      note: "GitHub lists these as stars",
    },
    { label: "Open issues & PRs", value: t.openIssues, icon: "issue", hint: "GitHub counts open pull requests together with issues" },
  ];

  return (
    <section aria-labelledby="stats-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="stats-heading" className="text-lg font-semibold tracking-tight">
          Overview
        </h2>
        <p className="text-xs text-muted-foreground">
          Across {plural(t.sourceRepos, "source repository", "source repositories")}
          {t.forkedRepos > 0 && ` (${plural(t.forkedRepos, "fork")} excluded)`}
          {truncated && `, from the ${formatFull(repos.length)} most recently pushed`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4" title={c.hint}>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium tracking-wide uppercase">{c.label}</span>
              <Icon name={c.icon} className="size-4" />
            </div>
            <p className="tabular mt-2 text-2xl font-semibold tracking-tight" aria-label={`${formatFull(c.value)} ${c.label}`}>
              {formatCount(c.value)}
            </p>
            {c.note && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.note}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
            <CardDescription>Main language of each source repository</CardDescription>
          </CardHeader>
          <CardContent>
            {languages.length ? <LanguageDonut data={languages} /> : <Empty text="No language detected in their repositories." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most-starred repositories</CardTitle>
            <CardDescription>{starred.length ? `Top ${starred.length} by stars` : "Ranked by stars"}</CardDescription>
          </CardHeader>
          <CardContent>
            {starred.length ? <StarsBar repos={starred} onOpenRepo={onOpenRepo} /> : <Empty text="None of their repositories have stars yet." />}
          </CardContent>
        </Card>
      </div>

      {top.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Top repositories</h3>
          <ul className="grid gap-3 md:grid-cols-3">
            {top.map((repo) => (
              <li key={repo.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenRepo(repo)}
                  className="flex h-full w-full cursor-pointer flex-col rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <Icon name="repo" className="text-muted-foreground" />
                    <span className="truncate">{repo.name}</span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {repo.description || "No description"}
                  </span>
                  <span className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full" style={{ background: languageColor(repo.language) }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="tabular flex items-center gap-1">
                      <Icon name="star" className="size-3.5" /> {formatCount(repo.stargazers_count)}
                    </span>
                    <span className="tabular flex items-center gap-1">
                      <Icon name="fork" className="size-3.5" /> {formatCount(repo.forks_count)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

/** Donut drawn with stroke-dasharray arcs on a circle whose circumference is 100 units. */
function LanguageDonut({ data }: { data: LanguageShare[] }) {
  const r = 15.915; // 2πr ≈ 100
  let offset = 25; // start at 12 o'clock
  const total = data.reduce((acc, d) => acc + d.repos, 0);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <figure className="relative size-36 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-0" role="img" aria-label="Language breakdown donut chart">
          <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="6" />
          {data.map((d) => {
            const length = d.share * 100;
            const gap = data.length > 1 ? 0.6 : 0;
            const segment = (
              <circle
                key={d.language}
                cx="21"
                cy="21"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="6"
                strokeDasharray={`${Math.max(length - gap, 0.1)} ${100 - Math.max(length - gap, 0.1)}`}
                strokeDashoffset={offset}
              >
                <title>{`${d.language}: ${d.repos} (${Math.round(d.share * 100)}%)`}</title>
              </circle>
            );
            offset -= length;
            return segment;
          })}
        </svg>
        <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-xl font-semibold">{formatFull(total)}</span>
          <span className="text-[11px] text-muted-foreground">{total === 1 ? "repo" : "repos"}</span>
        </figcaption>
      </figure>
      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.language} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{d.language}</span>
            <span className="tabular text-muted-foreground">{d.repos}</span>
            <span className="tabular w-10 text-right font-medium">{Math.round(d.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StarsBar({ repos, onOpenRepo }: { repos: GitHubRepo[]; onOpenRepo: (repo: GitHubRepo) => void }) {
  const max = Math.max(...repos.map((r) => r.stargazers_count));
  return (
    <ol className="space-y-2" aria-label="Repositories by stars">
      {repos.map((repo) => (
        <li key={repo.id}>
          <button
            type="button"
            onClick={() => onOpenRepo(repo)}
            className="group grid w-full cursor-pointer grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            title={`${repo.name}: ${formatFull(repo.stargazers_count)} stars`}
          >
            <span className="truncate group-hover:underline">{repo.name}</span>
            <span className="h-5 overflow-hidden rounded bg-muted">
              <span
                className="block h-full rounded transition-[width] duration-500"
                style={{ width: `${Math.max((repo.stargazers_count / max) * 100, 1.5)}%`, background: languageColor(repo.language) }}
              />
            </span>
            <span className="tabular w-12 text-right text-muted-foreground">{formatCount(repo.stargazers_count)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
