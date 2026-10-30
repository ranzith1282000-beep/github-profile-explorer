import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Theme } from "@/hooks/useAppState";
import { parseLogin } from "@/lib/github";
import { formatTime } from "@/lib/format";
import type { RateLimit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";
import { Button } from "./ui/button";
import { Kbd } from "./ui/primitives";

interface HeaderProps {
  currentLogin: string | null;
  onSearch: (login: string) => void;
  onHome: () => void;
  rate: RateLimit | null;
  hasToken: boolean;
  onOpenToken: () => void;
  theme: Theme;
  onCycleTheme: () => void;
}

export function Header({ currentLogin, onSearch, onHome, rate, hasToken, onOpenToken, theme, onCycleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Profile Explorer home"
        >
          <Logo />
          <span className="hidden font-semibold tracking-tight md:inline">Profile Explorer</span>
        </button>

        <SearchForm key={currentLogin ?? ""} initial={currentLogin ?? ""} onSearch={onSearch} className="max-w-md flex-1" />

        <div className="ml-auto flex items-center gap-1">
          <RateChip rate={rate} hasToken={hasToken} onClick={onOpenToken} />
          <Button variant="ghost" size="icon" onClick={onCycleTheme} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`}>
            <Icon name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor"} />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  // A 3x3 slice of an activity graph
  const levels = [4, 2, 4, 1, 4, 2, 3, 1, 4];
  return (
    <span className="grid size-7 grid-cols-3 gap-[2px] rounded-md bg-primary p-[5px]" aria-hidden="true">
      {levels.map((l, i) => (
        <span key={i} className="rounded-[1.5px]" style={{ background: `var(--heat-${l})` }} />
      ))}
    </span>
  );
}

export function SearchForm({
  initial = "",
  onSearch,
  className,
  size = "default",
  autoFocus,
}: {
  initial?: string;
  onSearch: (login: string) => void;
  className?: string;
  size?: "default" | "lg";
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" or Ctrl/Cmd+K focuses the search box, unless you're already typing somewhere
  useEffect(() => {
    if (size === "lg") return; // only the header search owns the shortcut
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [size]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      inputRef.current?.focus();
      return;
    }
    const login = parseLogin(value);
    if (!login) {
      setError("Usernames use letters, numbers and single hyphens, up to 39 characters.");
      return;
    }
    setError(null);
    inputRef.current?.blur();
    onSearch(login);
  }

  const lg = size === "lg";
  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <label htmlFor={lg ? "hero-search" : "header-search"} className="sr-only">
        GitHub username
      </label>
      <Icon
        name="search"
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", lg ? "left-4 size-5" : "left-3")}
      />
      <input
        ref={inputRef}
        id={lg ? "hero-search" : "header-search"}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        placeholder={lg ? "Username or profile link" : "Search a username"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${lg ? "hero" : "header"}-search-error` : undefined}
        className={cn(
          "w-full min-w-0 rounded-md border border-input bg-background shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          lg ? "h-12 pr-28 pl-11 text-base" : "h-9 pr-12 pl-9 text-sm",
          error && "border-destructive",
        )}
      />
      {lg ? (
        <Button type="submit" className="absolute top-1.5 right-1.5 h-9">
          Explore
        </Button>
      ) : (
        <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
      )}
      {error && (
        <p
          id={`${lg ? "hero" : "header"}-search-error`}
          role="alert"
          className={cn(
            "text-xs text-destructive",
            lg ? "mt-2" : "absolute top-full left-0 mt-1 w-max max-w-[80vw] rounded-md border bg-background px-2 py-1 shadow-md",
          )}
        >
          {error}
        </p>
      )}
    </form>
  );
}

function RateChip({ rate, hasToken, onClick }: { rate: RateLimit | null; hasToken: boolean; onClick: () => void }) {
  const low = rate !== null && rate.remaining / rate.limit < 0.2;
  const label = rate
    ? `${rate.remaining} of ${rate.limit} GitHub API requests left this hour, resets at ${formatTime(rate.resetAt)}. ${hasToken ? "Manage token" : "Add a token for a higher limit"}`
    : hasToken
      ? "Manage GitHub token"
      : "Add a GitHub token";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        low && "border-destructive/40 text-destructive",
      )}
    >
      <Icon name="key" className={cn("size-3.5", hasToken ? "text-success" : "text-muted-foreground")} />
      {rate ? (
        <span className="tabular hidden sm:inline">
          {rate.remaining}
          <span className="text-muted-foreground">/{rate.limit}</span>
        </span>
      ) : (
        <span className="hidden sm:inline">{hasToken ? "Token" : "Add token"}</span>
      )}
    </button>
  );
}
