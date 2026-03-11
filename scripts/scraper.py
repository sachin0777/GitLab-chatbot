"""
scraper.py
Crawls GitLab Handbook and Direction pages, extracts clean article text,
and saves each page as a JSON file to data/raw_docs/.
"""

import requests
import json
import os
import time
from typing import Optional
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../data/raw_docs")

SEED_URLS = [
    "https://handbook.gitlab.com/handbook/",
    "https://about.gitlab.com/direction/",
]

# Only follow links within these domains
ALLOWED_DOMAINS = {"handbook.gitlab.com", "about.gitlab.com"}

# Maximum pages to crawl per seed URL
MAX_PAGES = 50


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def is_allowed_url(url: str) -> bool:
    """Return True if the URL belongs to an allowed domain."""
    domain = urlparse(url).netloc
    return domain in ALLOWED_DOMAINS


def extract_clean_text(soup: BeautifulSoup) -> str:
    """
    Remove navigation, footer, header, and sidebar elements,
    then return the remaining page text as a single clean string.
    """
    for tag in soup.find_all(["nav", "footer", "header", "aside", "script", "style"]):
        tag.decompose()

    # Prefer semantic content containers
    main_content = (
        soup.find("article")
        or soup.find("main")
        or soup.find(id="content")
        or soup.find(class_="content")
        or soup.body
    )

    if main_content is None:
        return ""

    text = main_content.get_text(separator=" ", strip=True)
    # Collapse extra whitespace and newlines
    text = " ".join(text.split())
    return text


def extract_page_links(soup: BeautifulSoup, base_url: str) -> list:
    """
    Extract all internal links from the page.
    Strips URL fragments and query parameters.
    """
    links = []
    for anchor in soup.find_all("a", href=True):
        full_url = urljoin(base_url, anchor["href"])
        # Remove fragments (#section) and query strings (?param=value)
        full_url = full_url.split("#")[0].split("?")[0]
        if is_allowed_url(full_url) and full_url.startswith("https://"):
            links.append(full_url)
    return list(set(links))


# ---------------------------------------------------------------------------
# Page scraper
# ---------------------------------------------------------------------------

def scrape_page(url: str) -> Optional[dict]:
    """
    Fetch a single URL and return a document dict with title, url, and content.
    Returns None if the page cannot be fetched or has insufficient content.
    """
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; GitLabRAGBot/1.0)"}
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"Skipped {url} (HTTP {response.status_code})")
            return None

        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.string.strip() if soup.title else url
        content = extract_clean_text(soup)

        # Skip pages with very little content
        if len(content) < 100:
            print(f"Skipped {url} (content too short)")
            return None

        return {"title": title, "url": url, "content": content}

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None


# ---------------------------------------------------------------------------
# Crawler
# ---------------------------------------------------------------------------

def crawl(seed_url: str, max_pages: int) -> list:
    """
    Breadth-first crawl starting from seed_url.
    Stops after visiting max_pages unique URLs.
    Returns a list of document dicts.
    """
    visited = set()
    queue = [seed_url]
    docs = []

    print(f"Starting crawl: {seed_url}")

    while queue and len(visited) < max_pages:
        url = queue.pop(0)

        if url in visited:
            continue
        visited.add(url)

        print(f"Scraping ({len(visited)}/{max_pages}): {url}")
        doc = scrape_page(url)

        if doc:
            docs.append(doc)
            # Fetch links from this page to continue crawling
            try:
                response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
                soup = BeautifulSoup(response.text, "lxml")
                for link in extract_page_links(soup, url):
                    if link not in visited:
                        queue.append(link)
            except Exception as e:
                print(f"Failed to extract links from {url}: {e}")

        # Polite delay to avoid overwhelming the server
        time.sleep(0.5)

    print(f"Crawl complete. Collected {len(docs)} documents from {seed_url}")
    return docs


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_docs = []

    for seed in SEED_URLS:
        docs = crawl(seed, MAX_PAGES)
        all_docs.extend(docs)

    # Save each document as an individual JSON file
    for i, doc in enumerate(all_docs):
        filename = f"doc_{i+1:04d}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(all_docs)} documents to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()