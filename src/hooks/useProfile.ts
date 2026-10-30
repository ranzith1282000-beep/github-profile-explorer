import { useEffect, useState } from "react";
import { GitHubError, getEvents, getRepos, getUser } from "@/lib/github";
import type { GitHubEvent, GitHubRepo, GitHubUser } from "@/lib/types";

export type ProfileState =
  | { status: "idle" }
  | { status: "loading"; login: string }
  | { status: "error"; login: string; error: GitHubError }
  | {
      status: "ready";
      login: string;
      user: GitHubUser;
      repos: GitHubRepo[];
      reposTruncated: boolean;
      events: GitHubEvent[] | null;
      eventsError: GitHubError | null;
      loadedAt: Date;
    };

function toGitHubError(err: unknown) {
  return err instanceof GitHubError ? err : new GitHubError("http", "Something went wrong loading this profile.");
}

/**
 * Loads a profile in two steps: the user first (to know how many repo pages to request),
 * then repositories and events in parallel. If only the events fail, the profile still shows.
 */
export function useProfile(login: string | null, reloadKey = 0): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "idle" });

  useEffect(() => {
    if (!login) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setState({ status: "loading", login });

    (async () => {
      try {
        const user = await getUser(login, signal);
        const [repoResult, eventResult] = await Promise.allSettled([
          getRepos(user.login, user.public_repos, signal),
          getEvents(user.login, signal),
        ]);
        if (signal.aborted) return;
        if (repoResult.status === "rejected") throw repoResult.reason;
        setState({
          status: "ready",
          login,
          user,
          repos: repoResult.value.repos,
          reposTruncated: repoResult.value.truncated,
          events: eventResult.status === "fulfilled" ? eventResult.value : null,
          eventsError: eventResult.status === "rejected" ? toGitHubError(eventResult.reason) : null,
          loadedAt: new Date(),
        });
      } catch (err) {
        if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setState({ status: "error", login, error: toGitHubError(err) });
      }
    })();

    return () => controller.abort();
  }, [login, reloadKey]);

  return state;
}
