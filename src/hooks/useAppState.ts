import { useCallback, useEffect, useState } from "react";
import { onRateLimit, setToken } from "@/lib/github";
import type { RateLimit } from "@/lib/types";
import { storage } from "@/lib/utils";

/* ---------- Theme: light, dark or follow the system ---------- */

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "gpe:theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* not saved, still applied */
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((t) => (t === "system" ? "light" : t === "light" ? "dark" : "system"));
  }, []);
  return { theme, cycle };
}

/* ---------- API rate limit, as reported by GitHub's response headers ---------- */

export function useRateLimit() {
  const [rate, setRate] = useState<RateLimit | null>(null);
  useEffect(() => onRateLimit(setRate), []);
  return rate;
}

/* ---------- Optional personal access token ---------- */

const TOKEN_KEY = "gpe:token";

export function useToken() {
  // Read once at start-up. A remembered token lives in localStorage; otherwise it lasts for this tab only.
  const [token, setTokenState] = useState<string | null>(() => {
    const saved = storage.get<string | null>(TOKEN_KEY, null);
    setToken(saved);
    return saved;
  });
  const [remembered, setRemembered] = useState(() => token !== null);

  const save = useCallback((value: string, remember: boolean) => {
    const clean = value.trim();
    setToken(clean);
    setTokenState(clean);
    setRemembered(remember);
    if (remember) storage.set(TOKEN_KEY, clean);
    else storage.remove(TOKEN_KEY);
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setRemembered(false);
    storage.remove(TOKEN_KEY);
  }, []);

  return { token, remembered, save, clear };
}

/* ---------- Recent searches, kept in this browser ---------- */

export interface RecentSearch {
  login: string;
  name: string | null;
  avatarUrl: string;
  at: string;
}

const RECENT_KEY = "gpe:recent";
const MAX_RECENT = 8;

export function useRecentSearches() {
  const [recent, setRecent] = useState<RecentSearch[]>(() => storage.get<RecentSearch[]>(RECENT_KEY, []));

  const add = useCallback((entry: Omit<RecentSearch, "at">) => {
    setRecent((list) => {
      const next = [
        { ...entry, at: new Date().toISOString() },
        ...list.filter((r) => r.login.toLowerCase() !== entry.login.toLowerCase()),
      ].slice(0, MAX_RECENT);
      storage.set(RECENT_KEY, next);
      return next;
    });
  }, []);

  const remove = useCallback((login: string) => {
    setRecent((list) => {
      const next = list.filter((r) => r.login !== login);
      storage.set(RECENT_KEY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    storage.remove(RECENT_KEY);
  }, []);

  return { recent, add, remove, clear };
}

/* ---------- ?user= in the address bar, so profiles can be shared and the back button works ---------- */

function readUserParam() {
  return new URLSearchParams(window.location.search).get("user");
}

export function useUserParam() {
  const [login, setLogin] = useState<string | null>(readUserParam);

  useEffect(() => {
    const onPop = () => setLogin(readUserParam());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: string | null) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("user", next);
    else url.searchParams.delete("user");
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setLogin(next);
    window.scrollTo({ top: 0 });
  }, []);

  return { login, navigate };
}
