"""
ingest.py
Loads scraped JSON documents, splits them into chunks of 400-500 tokens,
generates Gemini embeddings for each chunk, and stores them in Supabase.
Skips already ingested files to allow incremental runs without duplicates.
"""

import os
import json
import time
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client
import tiktoken

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RAW_DOCS_DIR = os.path.join(os.path.dirname(__file__), "../data/raw_docs")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "../data/processed_docs")
INGESTED_LOG = os.path.join(os.path.dirname(__file__), "../data/ingested_files.txt")

EMBEDDING_MODEL = "models/gemini-embedding-001"
CHUNK_SIZE = 450
CHUNK_OVERLAP = 50


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)


# ---------------------------------------------------------------------------
# Ingestion tracking
# ---------------------------------------------------------------------------

def load_ingested_files() -> set:
    """Load list of already ingested filenames to skip on re-runs."""
    if not os.path.exists(INGESTED_LOG):
        return set()
    with open(INGESTED_LOG, "r") as f:
        return set(line.strip() for line in f if line.strip())


def mark_file_ingested(filename: str) -> None:
    """Mark a file as ingested so it is skipped on future runs."""
    with open(INGESTED_LOG, "a") as f:
        f.write(filename + "\n")


# ---------------------------------------------------------------------------
# Text chunking
# ---------------------------------------------------------------------------

def split_into_chunks(text: str, title: str, url: str) -> list:
    """Split text into overlapping chunks of approximately CHUNK_SIZE tokens."""
    encoder = tiktoken.get_encoding("cl100k_base")
    tokens = encoder.encode(text)
    chunks = []

    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoder.decode(chunk_tokens)
        chunks.append({"content": chunk_text, "title": title, "url": url})
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


# ---------------------------------------------------------------------------
# Embedding generation
# ---------------------------------------------------------------------------

def generate_embedding(text: str) -> list:
    """Generate an embedding vector for the given text using Gemini."""
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document"
    )
    return result["embedding"]


# ---------------------------------------------------------------------------
# Supabase insertion
# ---------------------------------------------------------------------------

def insert_chunk(chunk: dict, embedding: list) -> None:
    """Insert a single chunk and its embedding into the Supabase documents table."""
    supabase.table("documents").insert({
        "content": chunk["content"],
        "embedding": embedding,
        "title": chunk["title"],
        "url": chunk["url"]
    }).execute()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    # Load already ingested files to skip them
    ingested_files = load_ingested_files()

    doc_files = sorted([f for f in os.listdir(RAW_DOCS_DIR) if f.endswith(".json")])

    # Filter out already ingested files
    pending_files = [f for f in doc_files if f not in ingested_files]

    print(f"Total documents: {len(doc_files)}")
    print(f"Already ingested: {len(ingested_files)}")
    print(f"Pending ingestion: {len(pending_files)}")

    total_chunks = 0

    for i, filename in enumerate(pending_files):
        filepath = os.path.join(RAW_DOCS_DIR, filename)

        with open(filepath, "r", encoding="utf-8") as f:
            doc = json.load(f)

        title = doc.get("title", "")
        url = doc.get("url", "")
        content = doc.get("content", "")

        if not content.strip():
            print(f"Skipping {filename} (empty content)")
            mark_file_ingested(filename)
            continue

        chunks = split_into_chunks(content, title, url)
        print(f"Processing ({i+1}/{len(pending_files)}): {filename} -> {len(chunks)} chunks")

        processed_chunks = []
        failed = False

        for j, chunk in enumerate(chunks):
            try:
                embedding = generate_embedding(chunk["content"])
                insert_chunk(chunk, embedding)

                processed_chunks.append({
                    "content": chunk["content"],
                    "title": chunk["title"],
                    "url": chunk["url"],
                    "chunk_index": j
                })

                total_chunks += 1
                time.sleep(0.5)

            except Exception as e:
                print(f"Error processing chunk {j} of {filename}: {e}")
                # If quota exceeded stop immediately
                if "429" in str(e) or "quota" in str(e).lower():
                    print("Quota exceeded. Run the script again tomorrow to continue.")
                    print(f"Progress saved. {len(ingested_files) + i} files ingested so far.")
                    return
                failed = True
                continue

        # Only mark as ingested if all chunks succeeded
        if not failed:
            mark_file_ingested(filename)

        # Save processed chunks locally
        processed_filename = filename.replace("doc_", "processed_")
        processed_path = os.path.join(PROCESSED_DIR, processed_filename)
        with open(processed_path, "w", encoding="utf-8") as f:
            json.dump(processed_chunks, f, ensure_ascii=False, indent=2)

    print(f"Ingestion complete. Inserted {total_chunks} new chunks into Supabase.")


if __name__ == "__main__":
    main()