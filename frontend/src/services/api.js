/**
 * frontend/src/services/api.js
 * Handles all communication between the React frontend and the /api/chat endpoint.
 */

const API_URL = "/api/chat";

/**
 * Sends a question to the RAG pipeline and returns the answer and sources.
 *
 * @param {string} question - The user's question
 * @returns {Promise<{answer: string, sources: string[]}>}
 */
export async function sendQuestion(question) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get a response from the server.");
  }

  return response.json();
}