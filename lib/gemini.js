/**
 * lib/gemini.js
 * Handles chat completions using the Groq API.
 * Groq is OpenAI-compatible and has a free tier.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CHAT_MODEL = "llama-3.1-8b-instant";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generateAnswer(question, context) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that answers questions strictly using GitLab documentation. If the answer is not found in the provided context, respond with exactly: 'I could not find that information in the GitLab documentation.' Do not make up information or use knowledge outside the provided context."
        },
        {
          role: "user",
          content: `CONTEXT FROM GITLAB DOCUMENTATION:\n${context}\n\nUSER QUESTION:\n${question}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq chat error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
