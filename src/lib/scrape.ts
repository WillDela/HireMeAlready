// Minimal web search + page scraping for company research (question generation).
// DuckDuckGo's HTML endpoint needs no API key; pages are fetched directly and reduced
// to plain text. Everything fails soft: a blocked search or page just yields less.

import { log } from "@/lib/log";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const MAX_HTML_BYTES = 3 * 1024 * 1024;

export type SearchResult = { url: string; title: string };
export type ScrapedPage = { url: string; title: string; text: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Readable text of an HTML page: no scripts, styles or chrome, one block per line. */
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|noscript|svg|head|nav|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/?(p|div|li|ul|ol|h[1-6]|br|tr|section|article|blockquote|summary|details|dt|dd)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Top organic results for a query, or [] if the search is blocked or fails. */
export async function searchWeb(query: string, limit = 8): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: { "user-agent": USER_AGENT, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ q: query }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: SearchResult[] = [];
    for (const m of html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const href = decodeEntities(m[1]);
      // Results link through duckduckgo.com/l/?uddg=<target>; ads link elsewhere.
      const url = new URL(href, "https://duckduckgo.com").searchParams.get("uddg") ?? href;
      if (!/^https?:\/\//.test(url) || url.includes("duckduckgo.com/y.js")) continue;
      results.push({ url, title: htmlToText(m[2]) });
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    log.warn("scrape", "web search failed", { query, err });
    return [];
  }
}

/** The page's readable text, or null if it can't be fetched or isn't HTML. */
export async function fetchPageText(url: string, maxChars = 20000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("html")) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_HTML_BYTES) return null;
    const text = htmlToText((await res.text()).slice(0, MAX_HTML_BYTES));
    return text.length > 200 ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}

/** Runs each query, fetches the distinct result pages in parallel, and keeps the ones that loaded. */
export async function scrapeSearch(queries: string[], maxPages: number): Promise<ScrapedPage[]> {
  const seen = new Set<string>();
  const results = (await Promise.all(queries.map((q) => searchWeb(q))))
    .flat()
    .filter(({ url }) => {
      const key = url.replace(/[?#].*$/, "").replace(/\/$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxPages);
  const pages = await Promise.all(
    results.map(async (r) => {
      const text = await fetchPageText(r.url);
      return text ? { ...r, text } : null;
    }),
  );
  return pages.filter((p) => p !== null);
}
