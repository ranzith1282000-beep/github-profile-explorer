import { useEffect, useState } from "react";
import { GitHubError, decodeBase64Utf8, getReadme, getRepo } from "@/lib/github";
import { formatDate, formatFull, formatSize, normaliseUrl, timeAgo } from "@/lib/format";
import { languageColor } from "@/lib/languages";
import { renderReadme } from "@/lib/readme";
import type { GitHubRepo } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { buttonVariants } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Badge, Skeleton } from "./ui/primitives";

type ReadmeState =
  | { status: "loading" }
  | { status: "ready"; html: string; url: string }
  | { status: "none" }
  | { status: "error"; message: string };

export function RepoDrawer({ repo, onClose }: { repo: GitHubRepo | null; onClose: () => void }) {
  // Keep showing the last repo while the sheet animates closed
  const [shown, setShown] = useState<GitHubRepo | null>(repo);
  useEffect(() => {
    if (repo) setShown(repo);
  }, [repo]);

  return (
    <Dialog
      open={repo !== null}
      onOpenChange={(open) => !open && onClose()}
      variant="sheet"
      title={
        shown ? (
          <span className="flex min-w-0 items-center gap-2">
            <Icon name="repo" className="text-muted-foreground" />
            <span className="truncate">
              <span className="font-normal text-muted-foreground">{shown.owner.login} / </span>
              {shown.name}
            </span>
          </span>
        ) : (
          ""
        )
      }
      description={shown?.description || undefined}
    >
      {shown && repo && <RepoDetails key={shown.id} repo={shown} />}
    </Dialog>
  );
}

function RepoDetails({ repo: listed }: { repo: GitHubRepo }) {
  const [repo, setRepo] = useState(listed);
  const [readme, setReadme] = useState<ReadmeState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // Full repo record: needed for the real watcher count (subscribers_count)
    getRepo(listed.full_name, controller.signal).then(setRepo, () => {});
    getReadme(listed.full_name, controller.signal).then(
      (file) => {
        if (!file) return setReadme({ status: "none" });
        const markdown = decodeBase64Utf8(file.content);
        const html = renderReadme(markdown, { fullName: listed.full_name, branch: listed.default_branch, path: file.path });
        setReadme({ status: "ready", html, url: file.html_url });
      },
      (err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof GitHubError && err.kind === "rate_limited"
            ? "The hourly API limit has been reached, so the README can't load right now. Add a token to raise the limit."
            : err instanceof GitHubError
              ? err.message
              : "The README couldn't be loaded.";
        setReadme({ status: "error", message });
      },
    );
    return () => controller.abort();
  }, [listed.full_name, listed.default_branch]);

  const homepage = repo.homepage ? normaliseUrl(repo.homepage) : null;
  const facts: { icon: IconName; label: string; value: string; title?: string }[] = [
    { icon: "star", label: "Stars", value: formatFull(repo.stargazers_count) },
    { icon: "fork", label: "Forks", value: formatFull(repo.forks_count) },
    {
      icon: "eye",
      label: "Watchers",
      value: repo.subscribers_count !== undefined ? formatFull(repo.subscribers_count) : "…",
    },
    { icon: "issue", label: "Open issues & PRs", value: formatFull(repo.open_issues_count) },
    { icon: "branch", label: "Default branch", value: repo.default_branch },
    { icon: "scale", label: "License", value: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : repo.license?.name ?? "None" },
    { icon: "archive", label: "Size", value: formatSize(repo.size) },
    { icon: "calendar", label: "Created", value: formatDate(repo.created_at) },
    {
      icon: "clock",
      label: "Last push",
      value: repo.pushed_at ? timeAgo(repo.pushed_at) : "Never",
      title: repo.pushed_at ? formatDate(repo.pushed_at) : undefined,
    },
  ];

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-wrap gap-2">
        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
          Open on GitHub <Icon name="external" className="size-3.5" />
        </a>
        {homepage && (
          <a href={homepage.href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Icon name="link" className="size-3.5" /> {homepage.label}
          </a>
        )}
        {repo.fork && <Badge variant="outline">Fork</Badge>}
        {repo.archived && <Badge variant="outline">Archived</Badge>}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="bg-card px-3 py-2.5" title={f.title}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name={f.icon} className="size-3.5" />
              {f.label}
            </dt>
            <dd className="tabular mt-1 truncate text-sm font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>

      {(repo.language || (repo.topics ?? []).length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {repo.language && (
            <Badge variant="outline" className="gap-1.5">
              <span className="size-2 rounded-full" style={{ background: languageColor(repo.language) }} aria-hidden="true" />
              {repo.language}
            </Badge>
          )}
          {(repo.topics ?? []).map((t) => (
            <Badge key={t} variant="topic">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <section aria-labelledby="readme-heading" className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 id="readme-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="repo" className="text-muted-foreground" /> README
          </h3>
          {readme.status === "ready" && (
            <a href={readme.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
              View on GitHub
            </a>
          )}
        </div>
        <div className="p-4 sm:p-6">
          {readme.status === "loading" && (
            <div className="space-y-3" aria-label="Loading README">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {readme.status === "none" && <p className="text-sm text-muted-foreground">This repository doesn't have a README.</p>}
          {readme.status === "error" && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <Icon name="alert" className="mt-0.5" /> {readme.message}
            </p>
          )}
          {readme.status === "ready" && (
            // Sanitised with DOMPurify in renderReadme()
            <div className="markdown" dangerouslySetInnerHTML={{ __html: readme.html }} />
          )}
        </div>
      </section>
    </div>
  );
}
