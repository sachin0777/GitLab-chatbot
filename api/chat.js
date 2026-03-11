/**
 * api/chat.js
 * Vercel serverless function that handles chat requests.
 *
 * Endpoint: POST /api/chat
 * Request body: { "question": "What is GitLab CI?" }
 * Response: { "answer": "...", "sources": ["url1", "url2"] }
 */

import { runRAGPipeline } from "../lib/rag.js";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { question } = req.body;

  // Validate request body
  if (!question || typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ error: "A valid question is required." });
  }

  try {
    const { answer, sources } = await runRAGPipeline(question.trim());

    return res.status(200).json({ answer, sources });

  } catch (error) {
    console.error("RAG pipeline error:", error);
    return res.status(500).json({
      error: "An error occurred while processing your question. Please try again.",
    });
  }
}