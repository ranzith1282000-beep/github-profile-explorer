import DOMPurify from "dompurify";
import { marked } from "marked";

interface ReadmeSource {
  fullName: string;
  branch: string;
  /** Path of the README inside the repo, e.g. "docs/README.md". */
  path: string;
}

const ABSOLUTE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * Resolves a link or image path written relative to the README, the way GitHub does:
 * images load from raw.githubusercontent.com, links open the file on github.com.
 */
export function resolveReadmeUrl(url: string, kind: "image" | "link", { fullName, branch, path }: ReadmeSource) {
  if (url.startsWith("#")) return url;
  if (ABSOLUTE.test(url)) {
    // github.com/<owner>/<repo>/blob/... is a web page, not an image; GitHub serves the file at /raw/
    return kind === "image" ? url.replace(/^(https:\/\/github\.com\/[^/]+\/[^/]+)\/blob\//, "$1/raw/") : url;
  }
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
  const root =
    kind === "image"
      ? `https://raw.githubusercontent.com/${fullName}/${branch}/`
      : `https://github.com/${fullName}/blob/${branch}/`;
  try {
    return new URL(url.startsWith("/") ? url.slice(1) : url, root + (url.startsWith("/") ? "" : dir)).href;
  } catch {
    return url;
  }
}

/** Markdown -> sanitised HTML. Scripts, event handlers and iframes are removed by DOMPurify. */
export function renderReadme(markdown: string, source: ReadmeSource) {
  const html = marked.parse(markdown, { async: false, gfm: true });
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });

  fragment.querySelectorAll("img[src]").forEach((img) => {
    img.setAttribute("src", resolveReadmeUrl(img.getAttribute("src") ?? "", "image", source));
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  });
  fragment.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    a.setAttribute("href", resolveReadmeUrl(href, "link", source));
    if (!href.startsWith("#")) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });

  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}
