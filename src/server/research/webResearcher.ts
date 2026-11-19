import type { WebResearchSource } from "../../models/types.js";

export interface CrawledPage {
  url: string;
  title: string;
  snippet: string;
  content: string;
  section: string;
  wordCount: number;
  links: string[];
  isSubpage: boolean;
}

export interface LiveResearchReport {
  sources: WebResearchSource[];
  totalPagesRead: number;
  searchQueries: string[];
  contextPrompt: string;
}

const SKIP_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|ico|css|js|mjs|woff2?|ttf|eot|pdf|zip|tar|gz|mp4|mp3|webm|wav)$/i;

/**
 * Validates that a URL is public HTTP/HTTPS and blocks loopback/private/metadata SSRF targets.
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }
    if (host === "::1" || host === "[::1]" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
      return false;
    }
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      if (
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 192 && b === 168) ||
        (a === 172 && b >= 16 && b <= 31)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function extractUrlsFromText(text: string, maxUrls = 4): string[] {
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,10}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
  const matches = text.match(urlRegex) || [];
  const clean = matches
    .map((u) => u.replace(/[),.;:!?]+$/, ""))
    .filter(isSafePublicUrl);
  return [...new Set(clean)].slice(0, maxUrls);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleFromHtml(html: string, fallbackUrl: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    const t = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, ""));
    if (t) return t.slice(0, 140);
  }
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) {
    const t = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, ""));
    if (t) return t.slice(0, 140);
  }
  try {
    const u = new URL(fallbackUrl);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return fallbackUrl;
  }
}

function inferSectionLabel(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return "Home";
    const first = path.split("/")[0];
    return first.slice(0, 28);
  } catch {
    return "Page";
  }
}

function extractSameOriginLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return links;
  }

  const hrefRegex = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
      continue;
    }
    try {
      const resolved = new URL(rawHref, base);
      resolved.hash = "";
      if (resolved.origin !== base.origin) continue;
      if (!isSafePublicUrl(resolved.href)) continue;
      if (SKIP_EXTENSIONS.test(resolved.pathname)) continue;
      if (resolved.href === base.href || resolved.href === `${base.origin}${base.pathname}`) continue;
      links.push(resolved.href);
    } catch {
      // skip invalid href
    }
  }

  // Score links so key website sections (docs, features, pricing, about, api, blog, product) are prioritized
  const priorityKeywords = /(doc|docs|guide|feature|pricing|about|api|product|service|blog|news|changelog|faq|contact|architecture|overview|team)/i;
  const unique = [...new Set(links)];
  unique.sort((a, b) => {
    const aScore = (priorityKeywords.test(a) ? 10 : 0) - a.length * 0.03;
    const bScore = (priorityKeywords.test(b) ? 10 : 0) - b.length * 0.03;
    return bScore - aScore;
  });
  return unique.slice(0, 24);
}

/**
 * Fetches and parses a single web page while preserving navigation links & readable content across all sections.
 */
export async function crawlPageRaw(url: string, isSubpage = false, maxChars = 5500): Promise<CrawledPage | null> {
  if (!isSafePublicUrl(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NovaMuseResearchBot/1.0; +https://nova.ai)",
        Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(7500),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const finalUrl = res.url || url;
    if (!isSafePublicUrl(finalUrl)) return null;

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const rawBody = await res.text();
    if (!rawBody) return null;

    if (ctype.includes("application/json") || ctype.includes("text/plain") || ctype.includes("text/markdown")) {
      const text = rawBody.replace(/\s+/g, " ").trim().slice(0, maxChars);
      return {
        url: finalUrl,
        title: extractTitleFromHtml(rawBody, finalUrl),
        snippet: text.slice(0, 240),
        content: text,
        section: inferSectionLabel(finalUrl),
        wordCount: text ? text.split(/\s+/).length : 0,
        links: [],
        isSubpage,
      };
    }

    const links = extractSameOriginLinks(rawBody, finalUrl);
    const title = extractTitleFromHtml(rawBody, finalUrl);

    // Preserve nav/header/footer/main/article structure rather than blindly deleting nav text
    const cleanText = decodeHtmlEntities(
      rawBody
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
        .replace(/<\/?(p|div|li|h1|h2|h3|h4|section|article|tr|br)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    ).slice(0, maxChars);

    if (!cleanText || cleanText.length < 30) return null;

    return {
      url: finalUrl,
      title,
      snippet: cleanText.slice(0, 260),
      content: cleanText,
      section: inferSectionLabel(finalUrl),
      wordCount: cleanText.split(/\s+/).length,
      links,
      isSubpage,
    };
  } catch {
    return null;
  }
}

async function fetchSitemapLinks(originUrl: string, limit = 8): Promise<string[]> {
  try {
    const u = new URL(originUrl);
    const sitemapUrl = `${u.origin}/sitemap.xml`;
    if (!isSafePublicUrl(sitemapUrl)) return [];
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "NovaMuseResearchBot/1.0" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs: string[] = [];
    const locRegex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = locRegex.exec(xml)) !== null && locs.length < limit) {
      const candidate = match[1].trim();
      try {
        const cu = new URL(candidate);
        if (cu.origin === u.origin && isSafePublicUrl(candidate) && !SKIP_EXTENSIONS.test(cu.pathname)) {
          locs.push(candidate);
        }
      } catch {
        // skip
      }
    }
    return [...new Set(locs)];
  } catch {
    return [];
  }
}

/**
 * Crawls a website's entry page AND discovers/fetches internal subpages across different sections in parallel.
 */
export async function crawlWebsiteDeep(startUrl: string, options?: { maxPages?: number }): Promise<CrawledPage[]> {
  const maxPages = Math.min(Math.max(options?.maxPages ?? 6, 1), 10);
  const rootPage = await crawlPageRaw(startUrl, false, 5500);
  if (!rootPage) return [];

  const pages: CrawledPage[] = [rootPage];
  if (maxPages === 1) return pages;

  let candidateUrls = [...rootPage.links];
  if (candidateUrls.length < maxPages - 1) {
    const sitemapLinks = await fetchSitemapLinks(rootPage.url, maxPages * 2);
    for (const sUrl of sitemapLinks) {
      if (sUrl !== rootPage.url && !candidateUrls.includes(sUrl)) {
        candidateUrls.push(sUrl);
      }
    }
  }

  // Pick diverse sections so we cover all parts of the website instead of 5 links in the same directory
  const seenSections = new Set<string>([rootPage.section.toLowerCase()]);
  const prioritized: string[] = [];
  const rest: string[] = [];
  for (const link of candidateUrls) {
    const sec = inferSectionLabel(link).toLowerCase();
    if (!seenSections.has(sec)) {
      seenSections.add(sec);
      prioritized.push(link);
    } else {
      rest.push(link);
    }
  }
  const subTargets = [...prioritized, ...rest].slice(0, maxPages - 1);

  if (subTargets.length > 0) {
    const results = await Promise.allSettled(
      subTargets.map((subUrl) => crawlPageRaw(subUrl, true, 3800))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        pages.push(r.value);
      }
    }
  }

  return pages;
}

interface SearchHit {
  url: string;
  title: string;
  snippet: string;
}

function unwrapDuckDuckGoHref(rawHref: string): string {
  try {
    if (rawHref.includes("uddg=")) {
      const parsed = new URL(rawHref.startsWith("//") ? `https:${rawHref}` : rawHref, "https://html.duckduckgo.com");
      const target = parsed.searchParams.get("uddg");
      if (target) return decodeURIComponent(target);
    }
    if (rawHref.startsWith("//")) return `https:${rawHref}`;
    return rawHref;
  } catch {
    return rawHref;
  }
}

export async function searchWebLive(query: string, maxResults = 5): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];
  const seenUrls = new Set<string>();

  // 1. DuckDuckGo HTML Search (returns real external URLs + titles + snippets)
  try {
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const htmlRes = await fetch(htmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const resultBlockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi;
      let match: RegExpExecArray | null;
      while ((match = resultBlockRegex.exec(html)) !== null && hits.length < maxResults) {
        const resolvedUrl = unwrapDuckDuckGoHref(match[1]);
        if (!isSafePublicUrl(resolvedUrl) || seenUrls.has(resolvedUrl)) continue;
        const title = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ""));
        const snippet = match[3] ? decodeHtmlEntities(match[3].replace(/<[^>]+>/g, "")) : "";
        if (title) {
          seenUrls.add(resolvedUrl);
          hits.push({ url: resolvedUrl, title, snippet });
        }
      }
    }
  } catch {
    // continue to fallbacks
  }

  // 2. DuckDuckGo Instant Answer API
  if (hits.length < 3) {
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { "User-Agent": "NovaMuseResearchBot/1.0" },
        signal: AbortSignal.timeout(4500),
      });
      if (ddgRes.ok) {
        const data = (await ddgRes.json()) as any;
        if (data.AbstractText && data.AbstractURL && isSafePublicUrl(data.AbstractURL) && !seenUrls.has(data.AbstractURL)) {
          seenUrls.add(data.AbstractURL);
          hits.push({
            url: data.AbstractURL,
            title: data.Heading || "Instant Summary",
            snippet: String(data.AbstractText).slice(0, 400),
          });
        }
        if (Array.isArray(data.RelatedTopics)) {
          for (const t of data.RelatedTopics) {
            if (hits.length >= maxResults) break;
            if (t?.FirstURL && t?.Text && isSafePublicUrl(t.FirstURL) && !seenUrls.has(t.FirstURL)) {
              seenUrls.add(t.FirstURL);
              hits.push({
                url: t.FirstURL,
                title: String(t.Text).split(" - ")[0].slice(0, 90),
                snippet: String(t.Text).slice(0, 300),
              });
            }
          }
        }
      }
    } catch {
      // continue
    }
  }

  // 3. Wikipedia API fallback for factual/reference queries
  if (hits.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json`;
      const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(4500) });
      if (wikiRes.ok) {
        const arr = (await wikiRes.json()) as any[];
        const titles: string[] = Array.isArray(arr?.[1]) ? arr[1] : [];
        const descs: string[] = Array.isArray(arr?.[2]) ? arr[2] : [];
        const urls: string[] = Array.isArray(arr?.[3]) ? arr[3] : [];
        for (let i = 0; i < urls.length && hits.length < maxResults; i++) {
          if (isSafePublicUrl(urls[i]) && !seenUrls.has(urls[i])) {
            seenUrls.add(urls[i]);
            hits.push({
              url: urls[i],
              title: titles[i] || "Wikipedia Reference",
              snippet: descs[i] || "",
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return hits.slice(0, maxResults);
}

/**
 * Determines whether live internet search/research should run for a message.
 */
export function needsLiveInternetResearch(text: string, explicitWebToggle?: boolean): boolean {
  if (explicitWebToggle === true) return true;
  if (explicitWebToggle === false) return extractUrlsFromText(text, 1).length > 0;

  const trimmed = text.trim();
  if (!trimmed) return false;
  if (extractUrlsFromText(trimmed, 1).length > 0) return true;
  if (trimmed.length > 420) return false;

  const lower = trimmed.toLowerCase();
  if (/^(continue|go on|keep going|yes|ok|okay|do it|finish|next)\b/i.test(lower)) {
    return false;
  }

  const internetIntent = [
    "search the web", "search online", "look up", "research", "check online",
    "latest", "current", "today", "news", "weather", "stock price", "crypto price",
    "bitcoin price", "exchange rate", "who won", "election results", "breaking news",
    "live score", "current president", "current prime minister", "current ceo",
    "release date", "trending", "website", "all parts of", "crawl", "scrape",
    "documentation for", "pricing for", "what is happening"
  ];
  return internetIntent.some((kw) => lower.includes(kw));
}

/**
 * Performs comprehensive live internet research:
 * - Deep-crawls explicit URLs across multiple internal sections in parallel
 * - Runs live search queries and reads full target pages in parallel
 */
export async function conductLiveResearch(params: {
  query: string;
  explicitUrls?: string[];
  deepCrawl?: boolean;
  maxPagesPerSite?: number;
  maxSearchHitsToRead?: number;
}): Promise<LiveResearchReport> {
  const {
    query,
    explicitUrls = extractUrlsFromText(params.query, 3),
    deepCrawl = true,
    maxPagesPerSite = 6,
    maxSearchHitsToRead = 4,
  } = params;

  const collectedPages: CrawledPage[] = [];
  const searchQueries: string[] = [];

  // 1. Deep-crawl all explicit URLs (covering main page + diverse site subpages)
  if (explicitUrls.length > 0) {
    const siteResults = await Promise.allSettled(
      explicitUrls.map((u) =>
        deepCrawl
          ? crawlWebsiteDeep(u, { maxPages: maxPagesPerSite })
          : crawlPageRaw(u, false, 5500).then((p) => (p ? [p] : []))
      )
    );
    for (const r of siteResults) {
      if (r.status === "fulfilled" && r.value.length > 0) {
        collectedPages.push(...r.value);
      }
    }
  }

  // 2. Also run live web search if query asks a question beyond just a bare URL
  const cleanedSearchQuery = query
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(please|can you|research|search the web for|look up|check online)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  if (cleanedSearchQuery.length >= 4 && (explicitUrls.length === 0 || cleanedSearchQuery.split(/\s+/).length >= 3)) {
    searchQueries.push(cleanedSearchQuery);
    const hits = await searchWebLive(cleanedSearchQuery, 5);
    const topUrls = hits
      .map((h) => h.url)
      .filter((u) => !collectedPages.some((p) => p.url === u))
      .slice(0, maxSearchHitsToRead);

    const crawledHits = await Promise.allSettled(
      topUrls.map((u) => crawlPageRaw(u, false, 3600))
    );

    crawledHits.forEach((res, idx) => {
      const hit = hits[idx];
      if (res.status === "fulfilled" && res.value) {
        collectedPages.push(res.value);
      } else if (hit) {
        collectedPages.push({
          url: hit.url,
          title: hit.title,
          snippet: hit.snippet,
          content: hit.snippet || hit.title,
          section: inferSectionLabel(hit.url),
          wordCount: (hit.snippet || hit.title).split(/\s+/).length,
          links: [],
          isSubpage: false,
        });
      }
    });
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniquePages = collectedPages.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  const sources: WebResearchSource[] = uniquePages.map((p) => ({
    url: p.url,
    title: p.title,
    snippet: p.snippet,
    section: p.section,
    wordCount: p.wordCount,
    isSubpage: p.isSubpage,
  }));

  const contextSections = uniquePages.map(
    (p, idx) =>
      `### [Source ${idx + 1}] ${p.title} (${p.section})\nURL: ${p.url}\n${p.content.slice(0, 3200)}`
  );

  const contextPrompt =
    uniquePages.length > 0
      ? `[🌐 LIVE INTERNET RESEARCH & FULL-SITE CONTENT — ${uniquePages.length} pages retrieved]\n` +
        `Use these live verified web pages and cite relevant URLs cleanly in your response:\n\n` +
        contextSections.join("\n\n---\n\n")
      : "";

  return {
    sources,
    totalPagesRead: uniquePages.length,
    searchQueries,
    contextPrompt,
  };
}
