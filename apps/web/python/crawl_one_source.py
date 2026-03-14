import asyncio
import json
import random
import re
from dataclasses import dataclass
from typing import List, Dict, Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (X11; Linux x86_64)",
]

def domain_of(url: str) -> str:
    return urlparse(url).netloc

async def polite_delay(min_s: float = 3.0, max_s: float = 5.0):
    await asyncio.sleep(random.uniform(min_s, max_s))

def extract_profile_generic(html: str, url: str) -> Dict[str, Any]:
    """
    Generic extractor:
    - name: first h1
    - headline: first h2 or strong-ish top line
    - bio: concatenation of first few meaningful paragraphs
    - subjects/languages/price/location: left blank for now (site-specific later)
    - raw_text: full text
    """
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator=" ", strip=True)

    h1 = soup.find("h1")
    name = h1.get_text(" ", strip=True) if h1 else None

    h2 = soup.find("h2")
    headline = h2.get_text(" ", strip=True) if h2 else None

    paras = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    paras = [p for p in paras if len(p) >= 40]
    bio = " ".join(paras[:3]) if paras else None

    # You will improve these later per-site
    return {
        "source_url": url,
        "source_domain": domain_of(url),
        "name": name,
        "headline": headline,
        "bio": bio,
        "subjects": [],
        "languages": [],
        "price": None,
        "location": None,
        "raw_text": text,
        "metadata": {
            "extractor": "generic_v1"
        }
    }

async def crawl_source(start_url: str, profile_url_regex: str, max_profiles: int = 30) -> List[str]:
    """
    1) Fetch listing page
    2) Extract links
    3) Filter links matching regex
    4) Return unique absolute URLs
    """
    async with AsyncWebCrawler(user_agent=random.choice(USER_AGENTS)) as crawler:
        listing = await crawler.arun(start_url)
        html = listing.html or ""
        links = re.findall(r'href="([^"]+)"', html)

        abs_links = []
        for href in links:
            abs_links.append(urljoin(start_url, href))

        # filter by regex
        pat = re.compile(profile_url_regex)
        candidates = [u for u in abs_links if pat.search(u)]

        # dedupe preserve order
        seen = set()
        out = []
        for u in candidates:
            if u in seen:
                continue
            seen.add(u)
            out.append(u)
            if len(out) >= max_profiles:
                break

        return out

async def fetch_profiles(urls: List[str], out_path: str):
    async with AsyncWebCrawler(user_agent=random.choice(USER_AGENTS)) as crawler:
        with open(out_path, "w", encoding="utf-8") as f:
            for i, url in enumerate(urls, start=1):
                await polite_delay(3, 5)
                page = await crawler.arun(url)
                html = page.html or ""
                item = extract_profile_generic(html, url)
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
                print(f"[{i}/{len(urls)}] staged json -> {url}")

async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_url", required=True)
    parser.add_argument("--profile_url_regex", required=True)
    parser.add_argument("--max_profiles", type=int, default=30)
    parser.add_argument("--out", default="tmp/crawl_out.ndjson")
    args = parser.parse_args()

    urls = await crawl_source(args.start_url, args.profile_url_regex, args.max_profiles)
    print(f"Discovered {len(urls)} profile URLs")
    await fetch_profiles(urls, args.out)
    print(f"Done. Wrote: {args.out}")

if __name__ == "__main__":
    asyncio.run(main())
