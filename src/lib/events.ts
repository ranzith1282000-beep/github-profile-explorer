import type { GitHubEvent } from "./types";

export type ActivityKind = "push" | "pr" | "issue" | "star" | "release" | "branch" | "fork" | "other";

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  repo: string;
  repoUrl: string;
  url: string;
  date: string;
  /** Commit messages for pushes, newest last. Empty if GitHub didn't include them. */
  commits: { sha: string; message: string; url: string }[];
  /** Total commits in the push; can be higher than commits.length. */
  commitCount?: number;
  /** The commit the branch pointed to after the push. */
  head?: string;
}

export const ACTIVITY_FILTERS: { kind: ActivityKind | "all"; label: string }[] = [
  { kind: "all", label: "All" },
  { kind: "push", label: "Pushes" },
  { kind: "pr", label: "Pull requests" },
  { kind: "issue", label: "Issues" },
  { kind: "star", label: "Stars" },
  { kind: "release", label: "Releases" },
  { kind: "branch", label: "Branches & tags" },
];

const branchName = (ref?: string | null) => (ref ?? "").replace(/^refs\/(heads|tags)\//, "");

/** Turns a raw public event into a short, readable sentence and a link. */
export function describeEvent(event: GitHubEvent): Activity {
  const repo = event.repo.name;
  const repoUrl = `https://github.com/${repo}`;
  const p = event.payload;
  const base = { id: event.id, repo, repoUrl, url: repoUrl, date: event.created_at, commits: [] as Activity["commits"] };

  switch (event.type) {
    case "PushEvent": {
      const count = p.size ?? p.commits?.length;
      const branch = branchName(p.ref);
      const commits = (p.commits ?? []).map((c) => ({
        sha: c.sha,
        message: c.message.split("\n")[0],
        url: `${repoUrl}/commit/${c.sha}`,
      }));
      // Since 2025 GitHub's public events omit the commit list and count, so often only the head commit is known
      const what = count ? ` ${count} ${count === 1 ? "commit" : "commits"}` : "";
      return {
        ...base,
        kind: "push",
        title: `Pushed${what} to ${branch || "a branch"}`,
        url: p.head ? `${repoUrl}/commit/${p.head}` : `${repoUrl}/tree/${branch}`,
        commits,
        commitCount: count,
        head: p.head,
      };
    }
    case "PullRequestEvent": {
      const pr = p.pull_request;
      const action = p.action === "closed" && pr?.merged ? "Merged" : capitalise(p.action ?? "Updated");
      return {
        ...base,
        kind: "pr",
        title: `${action} pull request #${pr?.number ?? ""}${pr?.title ? `: ${pr.title}` : ""}`,
        url: pr?.html_url ?? `${repoUrl}/pull/${pr?.number ?? ""}`,
      };
    }
    case "PullRequestReviewEvent":
      return {
        ...base,
        kind: "pr",
        title: `Reviewed pull request #${p.pull_request?.number ?? ""}${p.pull_request?.title ? `: ${p.pull_request.title}` : ""}`,
        url: p.pull_request?.html_url ?? repoUrl,
      };
    case "PullRequestReviewCommentEvent":
      return {
        ...base,
        kind: "pr",
        title: `Commented on pull request #${p.pull_request?.number ?? ""}`,
        url: p.comment?.html_url ?? repoUrl,
      };
    case "IssuesEvent":
      return {
        ...base,
        kind: "issue",
        title: `${capitalise(p.action ?? "Updated")} issue #${p.issue?.number}: ${p.issue?.title ?? ""}`,
        url: p.issue?.html_url ?? repoUrl,
      };
    case "IssueCommentEvent": {
      const onPr = Boolean(p.issue?.pull_request);
      return {
        ...base,
        kind: onPr ? "pr" : "issue",
        title: `Commented on ${onPr ? "pull request" : "issue"} #${p.issue?.number}: ${p.issue?.title ?? ""}`,
        url: p.comment?.html_url ?? p.issue?.html_url ?? repoUrl,
      };
    }
    case "WatchEvent":
      return { ...base, kind: "star", title: `Starred ${repo}` };
    case "ReleaseEvent":
      return {
        ...base,
        kind: "release",
        title: `Published release ${p.release?.name || p.release?.tag_name || ""}`.trim(),
        url: p.release?.html_url ?? `${repoUrl}/releases`,
      };
    case "CreateEvent":
      if (p.ref_type === "repository") return { ...base, kind: "other", title: `Created repository ${repo}` };
      return {
        ...base,
        kind: "branch",
        title: `Created ${p.ref_type ?? "branch"} ${p.ref ?? ""}`.trim(),
        url: p.ref_type === "tag" ? `${repoUrl}/releases/tag/${p.ref}` : `${repoUrl}/tree/${p.ref}`,
      };
    case "DeleteEvent":
      return { ...base, kind: "branch", title: `Deleted ${p.ref_type ?? "branch"} ${p.ref ?? ""}`.trim() };
    case "ForkEvent":
      return {
        ...base,
        kind: "fork",
        title: `Forked ${repo}${p.forkee ? ` to ${p.forkee.full_name}` : ""}`,
        url: p.forkee?.html_url ?? repoUrl,
      };
    case "PublicEvent":
      return { ...base, kind: "other", title: `Made ${repo} public` };
    case "MemberEvent":
      return { ...base, kind: "other", title: `${capitalise(p.action ?? "Added")} ${p.member?.login ?? "a collaborator"}` };
    case "GollumEvent":
      return { ...base, kind: "other", title: `Updated the wiki`, url: `${repoUrl}/wiki` };
    case "CommitCommentEvent":
      return { ...base, kind: "other", title: `Commented on a commit`, url: p.comment?.html_url ?? repoUrl };
    default:
      return { ...base, kind: "other", title: event.type.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2") };
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
