/**
 * frontend/src/components/Chat.jsx
 * Main chat interface component.
 * Manages chat history, handles user input, and calls the API.
 */

import { useState, useRef, useEffect } from "react";
import Message from "./Message";
import { sendQuestion } from "../services/api";

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am the GitLab Documentation Assistant. Ask me anything about GitLab's handbook or product direction.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit() {
    const question = input.trim();
    if (!question || loading) return;

    // Add user message to chat history
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { answer, sources } = await sendQuestion(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, sources },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Allow sending message with Enter key (Shift+Enter for new line)
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e4e4e7",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <img
          src="https://about.gitlab.com/images/press/logo/png/gitlab-logo-500.png"
          alt="GitLab"
          style={{ height: "28px" }}
        />
        <div>
          <div style={{ fontWeight: "600", fontSize: "15px" }}>
            GitLab Documentation Assistant
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            Powered by GitLab Handbook and Direction pages
          </div>
        </div>
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          backgroundColor: "#fafafa",
        }}
      >
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#888",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#fc6d26",
                animation: "pulse 1s infinite",
              }}
            />
            Searching GitLab documentation...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid #e4e4e7",
          backgroundColor: "#fff",
          display: "flex",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about GitLab..."
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #e4e4e7",
            fontSize: "14px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            backgroundColor: loading ? "#f4f4f5" : "#fff",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px",
            backgroundColor:
              loading || !input.trim() ? "#f4f4f5" : "#fc6d26",
            color: loading || !input.trim() ? "#aaa" : "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>

      {/* Pulse animation for loading dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}