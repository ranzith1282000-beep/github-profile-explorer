import { useMemo, useState } from "react";
import { ACTIVITY_FILTERS, describeEvent, type Activity, type ActivityKind } from "@/lib/events";
import { formatDate, timeAgo } from "@/lib/format";
import type { GitHubEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icons";
import { Button } from "./ui/button";

const ICONS: Record<ActivityKind, IconName> = {
  push: "commit",
  pr: "pr",
  issue: "issue",
  star: "star",
  release: "tag",
  branch: "branch",
  fork: "fork",
  other: "activity",
};

const PAGE = 30;

export function ActivityFeed({ events }: { events: GitHubEvent[] }) {
  const all = useMemo(() => events.map(describeEvent), [events]);
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    all.forEach((a) => c.set(a.kind, (c.get(a.kind) ?? 0) + 1));
    return c;
  }, [all]);
  const items = kind === "all" ? all : all.filter((a) => a.kind === kind);

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Icon name="activity" className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 font-medium">No recent public activity</p>
        <p className="mt-1 text-sm text-muted-foreground">GitHub shows public events from the last 90 days, and there aren't any.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-1.5">
        {ACTIVITY_FILTERS.map((f) => {
          const n = f.kind === "all" ? all.length : (counts.get(f.kind) ?? 0);
          if (f.kind !== "all" && n === 0) return null;
          const active = kind === f.kind;
          return (
            <button
              key={f.kind}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setKind(f.kind);
                setLimit(PAGE);
              }}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {f.label}
              <span className={cn("tabular", active ? "opacity-80" : "text-muted-foreground")}>{n}</span>
            </button>
          );
        })}
      </div>

      <ol className="relative space-y-0">
        {items.slice(0, limit).map((a, i) => (
          <ActivityItem key={a.id} activity={a} last={i === Math.min(limit, items.length) - 1} />
        ))}
      </ol>

      {items.length > limit && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
            Show older activity
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity: a, last }: { activity: Activity; last: boolean }) {
  return (
    <li className="relative flex gap-3 pb-5">
      {!last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" aria-hidden="true" />}
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
        <Icon name={ICONS[a.kind]} className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium break-words hover:underline">
            {a.title}
          </a>
          {a.kind !== "star" && a.kind !== "fork" && (
            <>
              <span className="text-muted-foreground"> in </span>
              <a href={a.repoUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] break-all hover:underline">
                {a.repo}
              </a>
            </>
          )}
        </p>
        <time dateTime={a.date} title={formatDate(a.date)} className="text-xs text-muted-foreground">
          {timeAgo(a.date)}
        </time>
        {a.commits.length === 0 && a.head && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="commit" className="size-3.5" />
            Head commit{" "}
            <a href={`${a.repoUrl}/commit/${a.head}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
              {a.head.slice(0, 7)}
            </a>
          </p>
        )}
        {a.commits.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-md border bg-muted/40 p-2.5">
            {a.commits.slice(-3).reverse().map((c) => (
              <li key={c.sha} className="flex min-w-0 items-baseline gap-2 text-xs">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-mono text-muted-foreground hover:underline">
                  {c.sha.slice(0, 7)}
                </a>
                <span className="truncate">{c.message}</span>
              </li>
            ))}
            {a.commitCount !== undefined && a.commitCount > Math.min(3, a.commits.length) && (
              <li className="text-xs text-muted-foreground">and {a.commitCount - Math.min(3, a.commits.length)} more</li>
            )}
          </ul>
        )}
      </div>
    </li>
  );
}
