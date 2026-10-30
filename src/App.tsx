import { useEffect, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { ContributionHeatmap } from "./components/ContributionHeatmap";
import { Header, SearchForm } from "./components/Header";
import { Icon } from "./components/icons";
import { ProfileCard } from "./components/ProfileCard";
import { RepoBrowser } from "./components/RepoBrowser";
import { RepoDrawer } from "./components/RepoDrawer";
import { StatsDashboard } from "./components/StatsDashboard";
import { ErrorState, ExploreRow, ProfileSkeleton, RecentSearches } from "./components/States";
import { TokenDialog } from "./components/TokenDialog";
import { Tabs } from "./components/ui/tabs";
import { useRateLimit, useRecentSearches, useTheme, useToken, useUserParam } from "./hooks/useAppState";
import { useProfile } from "./hooks/useProfile";
import { formatCount, timeAgo } from "./lib/format";
import type { GitHubRepo } from "./lib/types";

export default function App() {
  const { theme, cycle } = useTheme();
  const token = useToken();
  const rate = useRateLimit();
  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches();
  const { login, navigate } = useUserParam();
  const [reloadKey, setReloadKey] = useState(0);
  const profile = useProfile(login, reloadKey);
  const [openRepo, setOpenRepo] = useState<GitHubRepo | null>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tab, setTab] = useState<"repos" | "activity">("repos");

  // Remember successful searches, and keep the tab title in step
  useEffect(() => {
    if (profile.status === "ready") {
      addRecent({ login: profile.user.login, name: profile.user.name, avatarUrl: profile.user.avatar_url });
      document.title = `${profile.user.name || profile.user.login} (@${profile.user.login}) · Profile Explorer`;
    } else if (profile.status === "idle") {
      document.title = "GitHub Profile Explorer";
    }
  }, [profile, addRecent]);

  useEffect(() => {
    setOpenRepo(null);
    setTab("repos");
  }, [login]);

  const search = (next: string) => {
    if (next.toLowerCase() === login?.toLowerCase()) setReloadKey((k) => k + 1);
    else navigate(next);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Header
        currentLogin={profile.status === "idle" ? null : login}
        onSearch={search}
        onHome={() => navigate(null)}
        rate={rate}
        hasToken={token.token !== null}
        onOpenToken={() => setTokenOpen(true)}
        theme={theme}
        onCycleTheme={cycle}
      />

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {profile.status === "idle" && (
          <Landing
            onSearch={search}
            recent={recent}
            onRemoveRecent={removeRecent}
            onClearRecent={clearRecent}
          />
        )}

        {profile.status === "loading" && <ProfileSkeleton />}

        {profile.status === "error" && (
          <ErrorState
            login={profile.login}
            error={profile.error}
            hasToken={token.token !== null}
            onRetry={() => setReloadKey((k) => k + 1)}
            onOpenToken={() => setTokenOpen(true)}
            onPick={search}
          />
        )}

        {profile.status === "ready" && (
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Profile">
              <ProfileCard user={profile.user} />
              <p className="mt-3 px-1 text-xs text-muted-foreground">
                Loaded {timeAgo(profile.loadedAt)} from the GitHub API.{" "}
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="cursor-pointer underline underline-offset-2 hover:text-foreground">
                  Refresh
                </button>
              </p>
            </aside>

            <div className="min-w-0 space-y-6">
              <StatsDashboard repos={profile.repos} truncated={profile.reposTruncated} onOpenRepo={setOpenRepo} />

              {profile.events ? (
                <ContributionHeatmap events={profile.events} />
              ) : (
                <EventsUnavailable message={profile.eventsError?.message} />
              )}

              <Tabs
                label="Profile sections"
                value={tab}
                onChange={setTab}
                tabs={[
                  {
                    value: "repos",
                    label: (
                      <>
                        <Icon name="repo" className="size-3.5" /> Repositories
                        <span className="tabular text-muted-foreground">{formatCount(profile.repos.length)}</span>
                      </>
                    ),
                  },
                  {
                    value: "activity",
                    label: (
                      <>
                        <Icon name="activity" className="size-3.5" /> Activity
                        {profile.events && <span className="tabular text-muted-foreground">{formatCount(profile.events.length)}</span>}
                      </>
                    ),
                  },
                ]}
              >
                {(value, panelProps) => (
                  <div {...panelProps} className="focus-visible:outline-none">
                    {value === "repos" ? (
                      <RepoBrowser key={profile.user.login} repos={profile.repos} onOpenRepo={setOpenRepo} />
                    ) : profile.events ? (
                      <ActivityFeed events={profile.events} />
                    ) : (
                      <EventsUnavailable message={profile.eventsError?.message} />
                    )}
                  </div>
                )}
              </Tabs>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <p>
            Built by{" "}
            <a href="https://github.com/ranzith1282000-beep" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              Ranjith K
            </a>{" "}
            with React, TypeScript and Tailwind. Data from GitHub's public REST API. Not affiliated with GitHub.
          </p>
          <a
            href="https://github.com/ranzith1282000-beep/github-profile-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Icon name="code" className="size-3.5" /> Source code
          </a>
        </div>
      </footer>

      <RepoDrawer repo={openRepo} onClose={() => setOpenRepo(null)} />
      <TokenDialog
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        token={token.token}
        remembered={token.remembered}
        onSave={(value, remember) => {
          token.save(value, remember);
          if (login) setReloadKey((k) => k + 1);
        }}
        onClear={token.clear}
      />
    </div>
  );
}

function Landing({
  onSearch,
  recent,
  onRemoveRecent,
  onClearRecent,
}: {
  onSearch: (login: string) => void;
  recent: ReturnType<typeof useRecentSearches>["recent"];
  onRemoveRecent: (login: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6 sm:py-12">
      <section className="text-center" aria-labelledby="hero-heading">
        <HeroGraph />
        <h1 id="hero-heading" className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Explore any GitHub profile
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          See someone's repositories, languages, stars and recent public activity on one page. Search a username, or paste a
          profile link.
        </p>
        <SearchForm size="lg" onSearch={onSearch} className="mx-auto mt-8 max-w-xl text-left" autoFocus />
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: press <kbd className="rounded border bg-muted px-1 font-mono">/</kbd> anywhere to search. Share a profile with a link
          like <span className="font-mono">?user=torvalds</span>.
        </p>
      </section>

      <RecentSearches recent={recent} onPick={onSearch} onRemove={onRemoveRecent} onClear={onClearRecent} />
      <ExploreRow onPick={onSearch} />
    </div>
  );
}

/** A decorative strip of activity-graph cells, with a fixed pattern so it looks the same every visit. */
function HeroGraph() {
  const weeks = 26;
  const level = (w: number, d: number) => {
    const v = Math.sin(w * 1.7 + d * 2.3) * 0.5 + Math.sin(w * 0.45) * 0.5;
    return v > 0.55 ? 4 : v > 0.3 ? 3 : v > 0.05 ? 2 : v > -0.25 ? 1 : 0;
  };
  return (
    <div className="mx-auto flex w-max max-w-full justify-center gap-[3px] overflow-hidden" aria-hidden="true">
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="flex flex-col gap-[3px]">
          {Array.from({ length: 7 }, (_, d) => (
            <span key={d} className="size-2.5 rounded-[2px] sm:size-3" style={{ background: `var(--heat-${level(w, d)})` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EventsUnavailable({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <Icon name="alert" className="mx-auto size-5" />
      <p className="mt-2">Recent activity couldn't be loaded. {message}</p>
    </div>
  );
}
