# GitLab RAG Chatbot

An AI-powered chatbot that answers questions about GitLab using Retrieval-Augmented Generation (RAG). It scrapes GitLab documentation, generates embeddings, stores them in Supabase (pgvector), and uses Groq (LLaMA 3.1) to generate accurate answers with source citations.

![GitLab Chatbot](https://img.shields.io/badge/GitLab-RAG%20Chatbot-fc6d26?style=for-the-badge&logo=gitlab)

## Features

- 🔍 **RAG Pipeline** — Retrieves relevant documentation chunks via vector similarity search
- 🤖 **LLaMA 3.1 (via Groq)** — Fast, accurate answer generation grounded in context
- 📊 **Gemini Embeddings** — Uses `gemini-embedding-001` for 3072-dimension vectors
- 🗄️ **Supabase pgvector** — Scalable vector storage with cosine similarity search
- ⚡ **Vercel Serverless** — Zero-config deployment with serverless API functions
- 💬 **React Chat UI** — Clean, responsive chat interface built with Vite + React

## Architecture

```
User Question
    │
    ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React UI   │────▶│  /api/chat (Vercel│────▶│  Gemini API │
│  (Vite)     │     │   Serverless)    │     │ (Embeddings)│
└─────────────┘     └──────────────────┘     └─────────────┘
                            │                       │
                            ▼                       ▼
                    ┌──────────────┐         ┌─────────────┐
                    │  Groq API    │         │  Supabase   │
                    │ (LLaMA 3.1) │         │ (pgvector)  │
                    └──────────────┘         └─────────────┘
```

## Project Structure

```
gitlab-rag-chatbot/
├── api/
│   └── chat.js              # Vercel serverless function (POST /api/chat)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx      # Main chat interface
│   │   │   └── Message.jsx   # Individual message bubble
│   │   ├── services/
│   │   │   └── api.js        # Frontend API client
│   │   ├── App.jsx           # Root component
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── lib/
│   ├── embeddings.js         # Gemini embedding generation
│   ├── gemini.js             # Groq chat completion
│   ├── rag.js                # Core RAG pipeline
│   └── supabase.js           # Supabase client
├── scripts/
│   ├── scraper.py            # GitLab docs scraper
│   └── ingest.py             # Embedding ingestion to Supabase
├── vercel.json               # Vercel deployment config
├── package.json
├── requirements.txt          # Python dependencies (for scraping/ingestion)
└── .env                      # Environment variables (not committed)
```

## Prerequisites

- **Node.js** v18+
- **Python** 3.9+ (only for data scraping/ingestion)
- **Vercel CLI** — `npm i -g vercel`
- API keys for: **Gemini**, **Groq**, **Supabase**

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/sachin0777/GitLab-chatbot.git
cd GitLab-chatbot
```

### 2. Install dependencies

```bash
# Root dependencies (API/serverless functions)
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

### 4. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the `pgvector` extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Create the documents table:
   ```sql
   CREATE TABLE documents (
     id BIGSERIAL PRIMARY KEY,
     content TEXT,
     url TEXT,
     embedding VECTOR(3072)
   );
   ```
4. Create the similarity search function:
   ```sql
   CREATE OR REPLACE FUNCTION match_documents(
     query_embedding VECTOR(3072),
     match_count INT DEFAULT 3
   )
   RETURNS TABLE (id BIGINT, content TEXT, url TEXT, similarity FLOAT)
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       documents.id,
       documents.content,
       documents.url,
       1 - (documents.embedding <=> query_embedding) AS similarity
     FROM documents
     ORDER BY documents.embedding <=> query_embedding
     LIMIT match_count;
   END;
   $$;
   ```

### 5. Scrape and ingest data (optional — only if database is empty)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Scrape GitLab documentation
python scripts/scraper.py

# Generate embeddings and upload to Supabase
python scripts/ingest.py
```

### 6. Run locally

```bash
vercel dev
```

The app will be available at **http://localhost:3000**.

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository
3. Add the following **Environment Variables** in the Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
4. Click **Deploy**

Vercel will automatically detect the `vercel.json` configuration and deploy both the frontend and API.

## API Reference

### `POST /api/chat`

Send a question and receive an AI-generated answer with sources.

**Request:**
```json
{
  "question": "What is GitLab CI?"
}
```

**Response:**
```json
{
  "answer": "GitLab CI is...",
  "sources": [
    "https://about.gitlab.com/solutions/continuous-integration/",
    "https://about.gitlab.com/direction/ci/"
  ]
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7 |
| API | Vercel Serverless Functions (Node.js) |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| LLM | Groq (LLaMA 3.1 8B Instant) |
| Vector DB | Supabase (PostgreSQL + pgvector) |
| Scraping | Python (BeautifulSoup, Requests) |

## License

MIT
