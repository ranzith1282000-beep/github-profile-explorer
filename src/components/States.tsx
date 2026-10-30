import { useEffect, useState, type ReactNode } from "react";
import type { RecentSearch } from "@/hooks/useAppState";
import type { GitHubError } from "@/lib/github";
import { formatTime, timeAgo } from "@/lib/format";
import { Icon, type IconName } from "./icons";
import { Button } from "./ui/button";
import { Card, Skeleton } from "./ui/primitives";

/* ---------- Suggested profiles ---------- */

export const SUGGESTED = [
  { login: "torvalds", blurb: "Creator of Linux and Git" },
  { login: "gaearon", blurb: "Co-author of Redux, React team" },
  { login: "sindresorhus", blurb: "Maintains 1,000+ open-source packages" },
  { login: "yyx990803", blurb: "Creator of Vue.js and Vite" },
  { login: "karpathy", blurb: "AI researcher, nanoGPT and micrograd" },
  { login: "tiangolo", blurb: "Creator of FastAPI" },
];

export function ExploreRow({ onPick, compact = false }: { onPick: (login: string) => void; compact?: boolean }) {
  return (
    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="mb-3 text-sm font-semibold">
        {compact ? "Try another profile" : "Explore notable profiles"}
      </h2>
      <ul className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {SUGGESTED.map((s) => (
          <li key={s.login} className="min-w-0">
            {compact ? (
              <button
                type="button"
                onClick={() => onPick(s.login)}
                className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border bg-card pr-3 pl-1 text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <img src={`https://github.com/${s.login}.png?size=48`} alt="" width={24} height={24} className="size-6 rounded-full bg-muted" loading="lazy" />
                {s.login}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPick(s.login)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors hover:border-ring/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <img src={`https://github.com/${s.login}.png?size=96`} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full border bg-muted" loading="lazy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm font-medium">{s.login}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.blurb}</span>
                </span>
                <Icon name="arrowRight" className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Recent searches ---------- */

export function RecentSearches({
  recent,
  onPick,
  onRemove,
  onClear,
}: {
  recent: RecentSearch[];
  onPick: (login: string) => void;
  onRemove: (login: string) => void;
  onClear: () => void;
}) {
  if (recent.length === 0) return null;
  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="history" className="text-muted-foreground" /> Recent searches
        </h2>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          Clear all
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {recent.map((r) => (
          <li key={r.login} className="flex items-center rounded-full border bg-card text-sm">
            <button
              type="button"
              onClick={() => onPick(r.login)}
              title={`Searched ${timeAgo(r.at)}`}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-l-full pr-2 pl-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <img src={r.avatarUrl} alt="" width={24} height={24} className="size-6 rounded-full bg-muted" loading="lazy" />
              <span className="font-mono">{r.login}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(r.login)}
              aria-label={`Remove ${r.login} from recent searches`}
              className="inline-flex h-8 cursor-pointer items-center rounded-r-full pr-2.5 pl-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Icon name="x" className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Errors ---------- */

function useCountdown(target?: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const minutes = Math.max(0, Math.ceil((target.getTime() - now) / 60_000));
  return minutes;
}

export function ErrorState({
  login,
  error,
  hasToken,
  onRetry,
  onOpenToken,
  onPick,
}: {
  login: string;
  error: GitHubError;
  hasToken: boolean;
  onRetry: () => void;
  onOpenToken: () => void;
  onPick: (login: string) => void;
}) {
  const minutes = useCountdown(error.kind === "rate_limited" ? error.resetAt : undefined);

  let icon: IconName = "alert";
  let title = "Something went wrong";
  let body: ReactNode = error.message;
  let actions: ReactNode = (
    <Button onClick={onRetry}>
      <Icon name="refresh" /> Try again
    </Button>
  );

  if (error.kind === "not_found") {
    icon = "userX";
    title = `No GitHub user called "${login}"`;
    body = "Check the spelling. Usernames aren't case-sensitive, but the account may have been renamed or deleted.";
    actions = null;
  } else if (error.kind === "rate_limited") {
    icon = "clock";
    title = "GitHub's hourly limit has been reached";
    body = (
      <>
        {hasToken
          ? "All of this hour's requests for your token have been used."
          : "Browsing without a token allows 60 requests an hour, and they've all been used."}
        {error.resetAt && (
          <>
            {" "}
            The limit resets at <strong className="text-foreground">{formatTime(error.resetAt)}</strong>
            {minutes !== null && minutes > 0 && ` (in ${minutes} ${minutes === 1 ? "minute" : "minutes"})`}.
          </>
        )}
        {!hasToken && " Adding a personal access token raises the limit to 5,000 an hour."}
      </>
    );
    actions = (
      <>
        {!hasToken && (
          <Button onClick={onOpenToken}>
            <Icon name="key" /> Add a token
          </Button>
        )}
        <Button variant="outline" onClick={onRetry} disabled={minutes !== null && minutes > 0}>
          <Icon name="refresh" /> Try again
        </Button>
      </>
    );
  } else if (error.kind === "bad_token") {
    icon = "key";
    title = "Your token was rejected";
    actions = (
      <Button onClick={onOpenToken}>
        <Icon name="key" /> Manage token
      </Button>
    );
  } else if (error.kind === "network") {
    icon = "wifiOff";
    title = "Can't reach GitHub";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-10">
      <Card role="alert" className="flex flex-col items-center px-6 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon name={icon} className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold break-words">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
        {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
      </Card>
      <ExploreRow onPick={onPick} compact />
    </div>
  );
}

/* ---------- Loading skeleton, laid out like the profile page ---------- */

export function ProfileSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" aria-busy="true" aria-label="Loading profile">
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <Skeleton className="size-20 rounded-full sm:size-24 lg:size-60" />
          <div className="flex-1 space-y-2 lg:w-full">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="space-y-2 pt-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-4 w-1/2" />
          ))}
        </div>
      </Card>
      <div className="min-w-0 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[86px] rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl lg:col-span-3" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
