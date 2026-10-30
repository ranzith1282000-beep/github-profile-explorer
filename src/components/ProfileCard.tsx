import { useState, type ReactNode } from "react";
import { formatCount, formatDate, normaliseUrl, timeAgo } from "@/lib/format";
import type { GitHubUser } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { Button, buttonVariants } from "./ui/button";
import { Badge, Card } from "./ui/primitives";

export function ProfileCard({ user }: { user: GitHubUser }) {
  const blog = user.blog ? normaliseUrl(user.blog) : null;
  const details: { icon: IconName; content: ReactNode; label: string }[] = [];
  if (user.company) details.push({ icon: "building", label: "Company", content: user.company });
  if (user.location) details.push({ icon: "pin", label: "Location", content: user.location });
  if (blog)
    details.push({
      icon: "link",
      label: "Website",
      content: (
        <a href={blog.href} target="_blank" rel="noopener noreferrer me" className="break-all hover:underline">
          {blog.label}
        </a>
      ),
    });
  if (user.twitter_username)
    details.push({
      icon: "at",
      label: "X (Twitter)",
      content: (
        <a href={`https://x.com/${user.twitter_username}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          @{user.twitter_username}
        </a>
      ),
    });
  details.push({
    icon: "calendar",
    label: "Joined",
    content: (
      <span title={formatDate(user.created_at)}>
        Joined {formatDate(user.created_at)} <span className="text-muted-foreground">({timeAgo(user.created_at)})</span>
      </span>
    ),
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 p-5 lg:flex-col">
        <img
          src={`${user.avatar_url}${user.avatar_url.includes("?") ? "&" : "?"}s=240`}
          alt={`${user.login}'s avatar`}
          width={120}
          height={120}
          className="size-20 shrink-0 rounded-full border bg-muted object-cover sm:size-24 lg:size-full lg:max-w-60"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-tight font-semibold tracking-tight break-words">{user.name || user.login}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-base text-muted-foreground">
            <span className="font-mono text-sm">{user.login}</span>
            {user.type === "Organization" && <Badge variant="secondary">Organization</Badge>}
          </p>
          {user.bio && <p className="mt-3 text-sm leading-relaxed break-words">{user.bio}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3 text-sm">
        <Icon name="users" className="text-muted-foreground" />
        <a href={`${user.html_url}?tab=followers`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          <strong className="tabular font-semibold">{formatCount(user.followers)}</strong>{" "}
          <span className="text-muted-foreground">{user.followers === 1 ? "follower" : "followers"}</span>
        </a>
        <a href={`${user.html_url}?tab=following`} target="_blank" rel="noopener noreferrer" className="hover:underline">
          <strong className="tabular font-semibold">{formatCount(user.following)}</strong>{" "}
          <span className="text-muted-foreground">following</span>
        </a>
        <span>
          <strong className="tabular font-semibold">{formatCount(user.public_repos)}</strong>{" "}
          <span className="text-muted-foreground">public repos</span>
        </span>
      </div>

      <dl className="space-y-2 border-t px-5 py-4 text-sm">
        {details.map((d) => (
          <div key={d.label} className="flex min-w-0 items-center gap-2.5">
            <dt className="shrink-0">
              <Icon name={d.icon} className="text-muted-foreground" />
              <span className="sr-only">{d.label}</span>
            </dt>
            <dd className="min-w-0 break-words">{d.content}</dd>
          </div>
        ))}
      </dl>

      <div className="flex gap-2 border-t p-4">
        <a href={user.html_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", className: "flex-1" })}>
          Open on GitHub <Icon name="external" className="size-3.5" />
        </a>
        <CopyLinkButton login={user.login} />
      </div>
    </Card>
  );
}

function CopyLinkButton({ login }: { login: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = new URL(window.location.href);
    url.search = `?user=${encodeURIComponent(login)}`;
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt?.("Copy this link", url.href);
    }
  }
  return (
    <Button variant="outline" onClick={copy} aria-live="polite" title="Copy a shareable link to this profile">
      <Icon name={copied ? "check" : "link"} className={copied ? "text-success" : undefined} />
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
