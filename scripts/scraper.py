"""
scraper.py
Crawls GitLab Handbook and Direction pages, extracts clean article text,
and saves each page as a JSON file to data/raw_docs/.
Skips URLs that have already been scraped to allow incremental runs.
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
VISITED_LOG = os.path.join(os.path.dirname(__file__), "../data/scraped_urls.txt")

SEED_URLS = [
    "https://handbook.gitlab.com/handbook/",
    "https://about.gitlab.com/direction/",
]

ALLOWED_DOMAINS = {"handbook.gitlab.com", "about.gitlab.com"}

# Number of NEW pages to collect per seed (excludes already visited)
NEW_PAGES_PER_SEED = 200


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def load_visited_urls() -> set:
    """Load previously scraped URLs from the log file."""
    if not os.path.exists(VISITED_LOG):
        return set()
    with open(VISITED_LOG, "r") as f:
        return set(line.strip() for line in f if line.strip())


def save_visited_url(url: str) -> None:
    """Append a newly scraped URL to the log file."""
    with open(VISITED_LOG, "a") as f:
        f.write(url + "\n")


def is_allowed_url(url: str) -> bool:
    """Return True if the URL belongs to an allowed domain."""
    domain = urlparse(url).netloc
    return domain in ALLOWED_DOMAINS


def extract_clean_text(soup: BeautifulSoup) -> str:
    """Remove navigation, footer, header, and sidebar elements,
    then return the remaining page text as a single clean string."""
    for tag in soup.find_all(["nav", "footer", "header", "aside", "script", "style"]):
        tag.decompose()

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
    text = " ".join(text.split())
    return text


def extract_page_links(soup: BeautifulSoup, base_url: str) -> list:
    """Extract all internal links from the page."""
    links = []
    for anchor in soup.find_all("a", href=True):
        full_url = urljoin(base_url, anchor["href"])
        full_url = full_url.split("#")[0].split("?")[0]
        if is_allowed_url(full_url) and full_url.startswith("https://"):
            links.append(full_url)
    return list(set(links))


# ---------------------------------------------------------------------------
# Page scraper
# ---------------------------------------------------------------------------

def scrape_page(url: str) -> Optional[dict]:
    """Fetch a single URL and return a document dict."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; GitLabRAGBot/1.0)"}
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"Skipped {url} (HTTP {response.status_code})")
            return None

        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.string.strip() if soup.title else url
        content = extract_clean_text(soup)

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

def crawl(seed_url: str, new_pages_target: int, already_visited: set) -> list:
    """
    Breadth-first crawl starting from seed_url.
    Collects exactly new_pages_target NEW pages not in already_visited.
    """
    queue = [seed_url]
    queued = set([seed_url])
    docs = []
    new_count = 0

    print(f"Starting crawl: {seed_url} (target: {new_pages_target} new pages)")

    while queue and new_count < new_pages_target:
        url = queue.pop(0)

        # Skip if already scraped in a previous run
        if url in already_visited:
            # Still follow its links to find new pages
            try:
                response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
                soup = BeautifulSoup(response.text, "lxml")
                for link in extract_page_links(soup, url):
                    if link not in queued and link not in already_visited:
                        queue.append(link)
                        queued.add(link)
            except Exception:
                pass
            time.sleep(0.3)
            continue

        print(f"Scraping new page ({new_count + 1}/{new_pages_target}): {url}")
        doc = scrape_page(url)

        if doc:
            docs.append(doc)
            save_visited_url(url)
            new_count += 1

            # Extract links for further crawling
            try:
                response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
                soup = BeautifulSoup(response.text, "lxml")
                for link in extract_page_links(soup, url):
                    if link not in queued and link not in already_visited:
                        queue.append(link)
                        queued.add(link)
            except Exception as e:
                print(f"Failed to extract links from {url}: {e}")

        time.sleep(0.5)

    print(f"Crawl complete. Collected {len(docs)} new documents from {seed_url}")
    return docs


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    already_visited = load_visited_urls()
    print(f"Found {len(already_visited)} previously scraped URLs. Skipping those.")

    existing_docs = [f for f in os.listdir(OUTPUT_DIR) if f.endswith(".json")]
    start_index = len(existing_docs) + 1

    all_docs = []
    for seed in SEED_URLS:
        docs = crawl(seed, NEW_PAGES_PER_SEED, already_visited)
        all_docs.extend(docs)
        # Update already_visited so second seed doesn't re-scrape first seed's new pages
        already_visited.update(doc["url"] for doc in docs)

    for i, doc in enumerate(all_docs):
        filename = f"doc_{start_index + i:04d}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(all_docs)} new documents to {OUTPUT_DIR}")
    print(f"Total documents now: {start_index + len(all_docs) - 1}")


if __name__ == "__main__":
    main()