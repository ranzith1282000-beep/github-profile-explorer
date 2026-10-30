import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "./icons";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/primitives";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  remembered: boolean;
  onSave: (token: string, remember: boolean) => void;
  onClear: () => void;
}

export function TokenDialog({ open, onOpenChange, token, remembered, onSave, onClear }: Props) {
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(remembered);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setRemember(remembered);
      setError(null);
    }
  }, [open, remembered]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = value.trim();
    if (!/^(gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}$/.test(clean)) {
      setError("That doesn't look like a GitHub token. They start with github_pat_ or ghp_.");
      return;
    }
    onSave(clean, remember);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="GitHub API token"
      description="Optional. Without a token GitHub allows 60 requests an hour from your network. With one, you get 5,000."
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        {token && (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="check" className="text-success" />
              <span className="truncate">
                Using token <span className="font-mono">…{token.slice(-4)}</span>
                {remembered ? ", saved in this browser" : ", for this visit only"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClear();
                onOpenChange(false);
              }}
            >
              <Icon name="trash" className="size-3.5" /> Remove
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="token-input" className="text-sm font-medium">
            {token ? "Replace token" : "Personal access token"}
          </label>
          <Input
            id="token-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="github_pat_…"
            aria-invalid={error ? true : undefined}
            aria-describedby="token-help"
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <p id="token-help" className="text-xs leading-relaxed text-muted-foreground">
            Create a{" "}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              fine-grained token
            </a>{" "}
            with <strong>Public repositories (read-only)</strong> access and no other permissions. It's sent only to
            api.github.com, straight from your browser.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            id="token-remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
          />
          <span>
            Remember on this device
            <span className="block text-xs text-muted-foreground">Stored in this browser's local storage. Leave unticked on shared computers.</span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!value.trim()}>
            Save token
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
