import asyncio
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig

URL = "https://en.amazingtalker.com/teachers-and-tutors/katrina-2008bfab-1247-4e8a-af0b-90b3b5abaf7c"

async def main():
    cfg = CrawlerRunConfig(wait_for="css:body", wait_for_timeout=15000, page_timeout=60000)
    async with AsyncWebCrawler() as crawler:
        res = await crawler.arun(url=URL, config=cfg)
        html = res.html or ""
        print("HTML length:", len(html))
        with open("tmp/debug_profile.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Wrote tmp/debug_profile.html")

if __name__ == "__main__":
    asyncio.run(main())
