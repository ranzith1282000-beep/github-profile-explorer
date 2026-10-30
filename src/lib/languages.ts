// Colours GitHub uses for common languages (from github-linguist), so charts look familiar.
const COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  "Jupyter Notebook": "#DA5B0B",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  "Objective-C": "#438eff",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  R: "#198CE7",
  Julia: "#a270ba",
  Shell: "#89e051",
  PowerShell: "#012456",
  HTML: "#e34c26",
  CSS: "#663399",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Astro: "#ff5a03",
  Lua: "#000080",
  Perl: "#0298c3",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  Clojure: "#db5855",
  OCaml: "#ef7a08",
  Zig: "#ec915c",
  Nix: "#7e7eff",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  TeX: "#3D6117",
  "Vim Script": "#199f4b",
  "Emacs Lisp": "#c065db",
  MATLAB: "#e16737",
  Assembly: "#6E4C13",
  Solidity: "#AA6746",
  HCL: "#844FBA",
  "Power Query": "#ffcc00",
  SQL: "#e38c00",
  TSQL: "#e38c00",
  PLpgSQL: "#336790",
  Markdown: "#083fa1",
};

/** A stable colour for any language; unknown languages get a hue derived from their name. */
export function languageColor(language: string | null) {
  if (!language) return "#9ca3af";
  if (COLORS[language]) return COLORS[language];
  let hash = 0;
  for (const ch of language) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 55% 52%)`;
}
