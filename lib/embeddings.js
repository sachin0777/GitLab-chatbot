/**
 * lib/embeddings.js
 * Generates embeddings for user queries using the Gemini API.
 * Must use the same model used during ingestion to ensure vector compatibility.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

/**
 * Generates a 3072-dimension embedding vector for the given text.
 * Uses task_type "RETRIEVAL_QUERY" since this is for querying, not indexing.
 *
 * @param {string} text - The user query to embed
 * @returns {Promise<number[]>} - Embedding vector as an array of floats
 */
export async function generateQueryEmbedding(text) {
  const response = await fetch(GEMINI_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding error: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}
