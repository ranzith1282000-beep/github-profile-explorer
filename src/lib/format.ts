const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

/** 1234 -> "1.2K". Numbers under 1,000 are shown in full. */
export function formatCount(n: number) {
  return n < 1000 ? full.format(n) : compact.format(n);
}

export function formatFull(n: number) {
  return full.format(n);
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 hours ago", "yesterday", "in 5 minutes". */
export function timeAgo(date: string | Date, now: Date = new Date()) {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Repo size comes from GitHub in kilobytes. */
export function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${(kb / 1024 / 1024).toFixed(1)} GB`;
}

/** Adds https:// to blog URLs saved without it, and drops it for display. */
export function normaliseUrl(url: string) {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return { href, label: href.replace(/^https?:\/\//i, "").replace(/\/$/, "") };
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${formatFull(n)} ${n === 1 ? word : pluralWord}`;
}
