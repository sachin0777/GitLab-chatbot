/**
 * lib/rag.js
 * Core RAG (Retrieval Augmented Generation) pipeline.
 *
 * Pipeline steps:
 * 1. Receive user question
 * 2. Generate embedding for the question using Gemini
 * 3. Query Supabase for the top 3 most similar document chunks
 * 4. Combine retrieved chunks as context
 * 5. Send context + question to Gemini for answer generation
 * 6. Return the answer and source URLs
 */

import { generateQueryEmbedding } from "./embeddings.js";
import { generateAnswer } from "./gemini.js";
import { supabase } from "./supabase.js";

const TOP_K = 3; // number of chunks to retrieve

/**
 * Retrieves the most relevant document chunks from Supabase
 * using cosine similarity search on the embedding vectors.
 *
 * @param {number[]} embedding - Query embedding vector
 * @returns {Promise<Array>} - Array of matching document chunks
 */
async function retrieveRelevantChunks(embedding) {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: TOP_K,
  });

  if (error) {
    throw new Error(`Supabase similarity search error: ${error.message}`);
  }

  return data;
}

/**
 * Main RAG pipeline function.
 * Takes a user question and returns a generated answer with source references.
 *
 * @param {string} question - The user's question
 * @returns {Promise<{answer: string, sources: string[]}>}
 */
export async function runRAGPipeline(question) {
  // Step 1: Generate embedding for the user question
  const queryEmbedding = await generateQueryEmbedding(question);

  // Step 2: Retrieve top matching chunks from Supabase
  const chunks = await retrieveRelevantChunks(queryEmbedding);

  if (!chunks || chunks.length === 0) {
    return {
      answer: "I could not find that information in the GitLab documentation.",
      sources: [],
    };
  }

  // Step 3: Combine chunk content into a single context string
  const context = chunks.map((chunk) => chunk.content).join("\n\n---\n\n");

  // Step 4: Deduplicate source URLs
  const sources = [...new Set(chunks.map((chunk) => chunk.url))];

  // Step 5: Generate answer using Gemini with retrieved context
  const answer = await generateAnswer(question, context);

  return { answer, sources };
}