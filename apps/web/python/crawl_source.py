import asyncio
import json
import random
import re
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse, urlsplit, urlunsplit

from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (X11; Linux x86_64)",
]

THIN_CONTENT_THRESHOLD = 400
NAME_MAX_LEN = 40
TITLE_SEPARATORS = r"[|•]| [\-–—] |⭐|🎁|🎊|🌊|🌴|☕|🔥|✨|💫|💥|✅|👉|🎯"
NAME_TOKEN_RE = re.compile(r"^[A-Za-z][A-Za-z' -]*[A-Za-z]$|^[A-Za-z]$")
BAD_NAME_VERBS = re.compile(
    r"\b(teach|teaches|teaching|tutor|tutors|tutoring|learn|learning|help|helps|helping|"
    r"coach|coaches|coaching|certified|experience|speaks|join|book|find|match)\b",
    re.IGNORECASE,
)
SENTENCE_PUNCT_RE = re.compile(r"[.!?]")
BRAND_RE = re.compile(r"\bAmazingTalker\b", re.IGNORECASE)

def domain_of(url: str) -> str:
    return urlparse(url).netloc

def canonical_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def parse_json_ld_name(soup: BeautifulSoup) -> str | None:
    for s in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            raw = s.get_text(strip=True)
            if not raw:
                continue
            data = json.loads(raw)
        except Exception:
            continue

        candidates = data if isinstance(data, list) else [data]
        for obj in candidates:
            if isinstance(obj, dict) and obj.get("name"):
                return str(obj["name"]).strip() or None
    return None


def normalize_candidate_name(text: str | None) -> str | None:
    if not text:
        return None

    cleaned = BRAND_RE.sub(" ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -|•⭐")
    if not cleaned:
        return None

    parts = [part.strip(" -|•⭐") for part in re.split(TITLE_SEPARATORS, cleaned) if part.strip(" -|•⭐")]
    if not parts:
        parts = [cleaned]

    for part in parts:
        part = BRAND_RE.sub(" ", part)
        part = re.sub(r"\s+", " ", part).strip(" -|•⭐")
        if not part:
            continue

        tokens = part.split()
        if not 2 <= len(tokens) <= 5:
            continue
        if len(part) > NAME_MAX_LEN:
            continue
        if SENTENCE_PUNCT_RE.search(part):
            continue
        if BAD_NAME_VERBS.search(part):
            continue
        if all(NAME_TOKEN_RE.fullmatch(token) for token in tokens):
            return part

    return None

async def polite_delay(min_s: float, max_s: float):
    await asyncio.sleep(random.uniform(min_s, max_s))

async def safe_arun(
    crawler: AsyncWebCrawler,
    url: str,
    config: Optional[CrawlerRunConfig] = None,
    timeout_sec: int = 75
):
    """
    Hard-stop a page if it hangs. Returns None on timeout/error.
    """
    try:
        if config is None:
            return await asyncio.wait_for(crawler.arun(url=url), timeout=timeout_sec)
        return await asyncio.wait_for(crawler.arun(url=url, config=config), timeout=timeout_sec)
    except asyncio.TimeoutError:
        print(f"[TIMEOUT] {url}")
        return None
    except Exception as e:
        print(f"[ERROR] {url} -> {e}")
        return None

def extract_profile_generic(html: str, url: str):
    soup = BeautifulSoup(html or "", "lxml")
    raw_text = soup.get_text(separator=" ", strip=True)
    lower = raw_text.lower()
    if len(raw_text) < 50:
        return None

    quality_flags: List[str] = []
    js_disabled = "javascript is disabled" in lower or "enable javascript" in lower
    thin_content = len(raw_text) < THIN_CONTENT_THRESHOLD
    if js_disabled:
        quality_flags.append("js_disabled")
    if thin_content:
        quality_flags.append("thin_content")

    name_source = None
    name_confidence = "low"
    name = None

    json_ld_name = parse_json_ld_name(soup)
    if json_ld_name:
        name_source = "json_ld"
        name = normalize_candidate_name(json_ld_name)
        name_confidence = "high" if name else "low"
    elif not name:
        og = soup.find("meta", property="og:title")
        if og and og.get("content"):
            name_source = "og_title"
            name = normalize_candidate_name(og["content"])
            name_confidence = "medium" if name else "low"

        if not name and soup.title and soup.title.string:
            name_source = "title"
            name = normalize_candidate_name(soup.title.string)
            name_confidence = "medium" if name else "low"

    if not name and name_source is not None:
        quality_flags.append("bad_name")
    if name is None and name_source is None:
        name_source = "missing"

    # --- HEADLINE ---
    headline = None
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc and meta_desc.get("content"):
        headline = meta_desc["content"].strip()

    h2 = soup.find("h2")
    if h2:
        headline = h2.get_text(" ", strip=True)

    # --- BIO ---
    paras = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    paras = [p for p in paras if len(p) >= 40]
    bio = " ".join(paras[:4]) if paras else None

    # heuristic price/location (keep)
    price = None
    m = re.search(r'(\bUS\$|\bUSD|\$)\s?\d+(\.\d+)?', raw_text)
    if m:
        price = m.group(0)

    location = None
    loc = re.search(r'\b(Seoul|Korea|South Korea|Japan|Tokyo|Hong Kong|Singapore|Taiwan|Taipei)\b', raw_text, re.IGNORECASE)
    if loc:
        location = loc.group(0)

    return {
        "source_url": canonical_url(url),
        "source_domain": domain_of(url),
        "name": name,
        "headline": headline,
        "bio": bio,
        "subjects": [],
        "languages": [],
        "price": price,
        "location": location,
        "raw_text": raw_text,
        "metadata": {
            "extractor": "generic_v6",
            "raw_text_len": len(raw_text),
            "name_confidence": name_confidence,
            "name_source": name_source,
            "quality_flags": quality_flags,
        }
    }

def dedupe_preserve_order(urls: List[str]) -> List[str]:
    seen = set()
    out = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out

async def discover_profile_urls(
    crawler: AsyncWebCrawler,
    start_url: str,
    profile_regex: str,
    max_profiles: int
) -> List[str]:
    """
    Fetch listing page, wait until profile links appear, then parse <a href>.
    """
    # For JS listings: wait until links exist
    run_cfg = CrawlerRunConfig(
        wait_for="css:a[href*='teachers-and-tutors']",
        wait_for_timeout=20000,
        page_timeout=60000
    )

    page = await safe_arun(crawler, start_url, run_cfg, timeout_sec=75)
    if not page:
        return []

    html = page.html or ""
    soup = BeautifulSoup(html, "lxml")
    hrefs = [a.get("href") for a in soup.find_all("a") if a.get("href")]

    abs_links = [canonical_url(urljoin(start_url, h)) for h in hrefs]
    pat = re.compile(profile_regex)
    candidates = [u for u in abs_links if pat.search(u)]

    candidates = dedupe_preserve_order(candidates)
    out = candidates[:max_profiles]

    print(f"Discovered {len(out)} candidate profile URLs")
    print("Sample URLs:", out[:10])
    return out

async def crawl_source(
    key: str,
    start_urls: List[str],
    profile_regex: str,
    max_profiles: int,
    delay_min: float,
    delay_max: float,
    out_path: str
):
    """
    Discover profile URLs from listing pages, then fetch each profile and extract fields.
    Writes NDJSON.
    """
    ua = random.choice(USER_AGENTS)
    async with AsyncWebCrawler(user_agent=ua) as crawler:
        # discovery
        all_profiles: List[str] = []
        for start in start_urls:
            urls = await discover_profile_urls(crawler, start, profile_regex, max_profiles)
            all_profiles.extend(urls)

        profile_urls = dedupe_preserve_order(all_profiles)[:max_profiles]
        print(f"[{key}] Discovered {len(profile_urls)} profile URLs")

        # IMPORTANT: do NOT wait for h1. Some pages never have it.
        profile_cfg = CrawlerRunConfig(
            wait_for="css:body",
            wait_for_timeout=20000,
            page_timeout=60000
        )

        wrote = 0
        skipped = 0

        with open(out_path, "w", encoding="utf-8") as f:
            for i, url in enumerate(profile_urls, start=1):
                await polite_delay(delay_min, delay_max)

                page = await safe_arun(crawler, url, profile_cfg, timeout_sec=75)
                if not page:
                    skipped += 1
                    continue

                item = extract_profile_generic(page.html or "", url)
                if not item:
                    print(f"[SKIP] noscript/empty: {url}")
                    skipped += 1
                    continue

                f.write(json.dumps(item, ensure_ascii=False) + "\n")
                wrote += 1
                print(f"[{key}] [{i}/{len(profile_urls)}] wrote {url}")

        print(f"[{key}] Done -> {out_path} (wrote={wrote}, skipped={skipped})")

async def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--source_key", required=True)
    args = parser.parse_args()

    cfg = json.load(open("crawling/sources.json", "r", encoding="utf-8"))
    src = next((s for s in cfg["sources"] if s["key"] == args.source_key), None)
    if not src:
        raise SystemExit(f"Source key not found: {args.source_key}")

    out_path = f"tmp/{src['key']}.ndjson"
    await crawl_source(
        key=src["key"],
        start_urls=src["start_urls"],
        profile_regex=src["profile_url_regex"],
        max_profiles=int(src.get("max_profiles", 30)),
        delay_min=float(src.get("delay_min_sec", 3)),
        delay_max=float(src.get("delay_max_sec", 5)),
        out_path=out_path
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped by user.")
