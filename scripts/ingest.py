"""
ingest.py
Loads scraped JSON documents, splits them into chunks of 400-500 tokens,
generates Gemini embeddings for each chunk, and stores them in Supabase.
"""

import os
import json
import time
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client
import tiktoken

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RAW_DOCS_DIR = os.path.join(os.path.dirname(__file__), "../data/raw_docs")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "../data/processed_docs")

EMBEDDING_MODEL = "models/gemini-embedding-001"  # Gemini embedding model, outputs 768 dimensions
CHUNK_SIZE = 450       # target tokens per chunk
CHUNK_OVERLAP = 50     # token overlap between consecutive chunks


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)


# ---------------------------------------------------------------------------
# Text chunking
# ---------------------------------------------------------------------------

def split_into_chunks(text: str, title: str, url: str) -> list:
    """
    Split text into overlapping chunks of approximately CHUNK_SIZE tokens.
    Each chunk includes metadata (title and url) for retrieval context.
    """
    encoder = tiktoken.get_encoding("cl100k_base")
    tokens = encoder.encode(text)
    chunks = []

    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = encoder.decode(chunk_tokens)

        chunks.append({
            "content": chunk_text,
            "title": title,
            "url": url
        })

        # Advance by chunk size minus overlap so consecutive chunks share context
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


# ---------------------------------------------------------------------------
# Embedding generation
# ---------------------------------------------------------------------------

def generate_embedding(text: str) -> list:
    """
    Generate an embedding vector for the given text using Gemini.
    Returns a list of floats (768 dimensions).
    """
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
    """
    Insert a single chunk and its embedding into the Supabase documents table.
    """
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

    # Load all scraped JSON files
    doc_files = [f for f in os.listdir(RAW_DOCS_DIR) if f.endswith(".json")]
    print(f"Found {len(doc_files)} documents to process")

    total_chunks = 0

    for i, filename in enumerate(sorted(doc_files)):
        filepath = os.path.join(RAW_DOCS_DIR, filename)

        with open(filepath, "r", encoding="utf-8") as f:
            doc = json.load(f)

        title = doc.get("title", "")
        url = doc.get("url", "")
        content = doc.get("content", "")

        if not content.strip():
            print(f"Skipping {filename} (empty content)")
            continue

        # Split document into chunks
        chunks = split_into_chunks(content, title, url)
        print(f"Processing ({i+1}/{len(doc_files)}): {filename} -> {len(chunks)} chunks")

        processed_chunks = []

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

                # Small delay to stay within Gemini free tier rate limits
                time.sleep(0.5)

            except Exception as e:
                print(f"Error processing chunk {j} of {filename}: {e}")
                continue

        # Save processed chunks locally for reference
        processed_filename = filename.replace("doc_", "processed_")
        processed_path = os.path.join(PROCESSED_DIR, processed_filename)
        with open(processed_path, "w", encoding="utf-8") as f:
            json.dump(processed_chunks, f, ensure_ascii=False, indent=2)

    print(f"Ingestion complete. Inserted {total_chunks} chunks into Supabase.")


if __name__ == "__main__":
    main()