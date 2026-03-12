/**
 * frontend/src/components/Chat.jsx
 * Main chat interface with enhanced GitLab-themed dark UI.
 */

import { useState, useRef, useEffect } from "react";
import Message from "./Message";
import { sendQuestion } from "../services/api";

const SUGGESTED_QUESTIONS = [
  "What are GitLab's core values?",
  "How does GitLab CI/CD work?",
  "What is GitLab's product direction?",
  "How does GitLab handle remote work?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am the GitLab Documentation Assistant. I can answer questions about GitLab's handbook, values, processes, and product direction. What would you like to know?",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(question) {
    const q = (question || input).trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const { answer, sources } = await sendQuestion(q);
      setMessages(prev => [...prev, { role: "assistant", content: answer, sources }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      maxWidth: "860px",
      margin: "0 auto",
      background: "#0d0d0d",
      position: "relative",
    }}>

      {/* Background grid pattern */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(252, 109, 38, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(252, 109, 38, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(13,13,13,0.95)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* GitLab logo mark */}
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #fc6d26 0%, #e24329 50%, #fca326 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontWeight: "700",
            fontSize: "16px",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(252, 109, 38, 0.4)",
          }}>G</div>
          <div>
            <div style={{
              fontWeight: "600",
              fontSize: "15px",
              color: "#f0f0f0",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}>
              GitLab Assistant
            </div>
            <div style={{
              fontSize: "11px",
              color: "#555",
              fontFamily: "'Space Mono', monospace",
            }}>
              handbook + direction
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "#161616",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "20px",
        }}>
          <div style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#2ecc71",
            boxShadow: "0 0 6px rgba(46, 204, 113, 0.6)",
          }} />
          <span style={{ fontSize: "11px", color: "#555", fontFamily: "'Space Mono', monospace" }}>
            online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 24px",
        position: "relative",
        zIndex: 1,
      }}>

        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {/* Suggested questions */}
        {showSuggestions && (
          <div style={{
            marginTop: "24px",
            animation: "fadeInUp 0.4s ease forwards",
          }}>
            <div style={{
              fontSize: "11px",
              color: "#444",
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}>
              Suggested questions
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  style={{
                    padding: "8px 14px",
                    background: "#161616",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    color: "#888",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    e.target.style.borderColor = "rgba(252, 109, 38, 0.4)";
                    e.target.style.color = "#fc6d26";
                    e.target.style.background = "rgba(252, 109, 38, 0.05)";
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    e.target.style.color = "#888";
                    e.target.style.background = "#161616";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            background: "#1f1f1f",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "18px 18px 18px 4px",
            width: "fit-content",
            marginBottom: "24px",
            animation: "fadeInUp 0.3s ease forwards",
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#fc6d26",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: "13px", color: "#555", fontFamily: "'Space Mono', monospace" }}>
              searching docs...
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(226, 67, 41, 0.1)",
            border: "1px solid rgba(226, 67, 41, 0.3)",
            borderRadius: "8px",
            color: "#e24329",
            fontSize: "13px",
            marginBottom: "16px",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "16px 24px 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(13,13,13,0.95)",
        backdropFilter: "blur(10px)",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          background: "#161616",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "10px 10px 10px 16px",
          transition: "border-color 0.2s",
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(252, 109, 38, 0.4)"}
          onBlurCapture={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about GitLab..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f0f0f0",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              resize: "none",
              lineHeight: "1.6",
              paddingTop: "2px",
            }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "none",
              background: loading || !input.trim()
                ? "#2a2a2a"
                : "linear-gradient(135deg, #fc6d26, #e24329)",
              color: loading || !input.trim() ? "#444" : "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
              boxShadow: loading || !input.trim()
                ? "none"
                : "0 4px 12px rgba(252, 109, 38, 0.35)",
              fontSize: "16px",
            }}
          >
            {loading ? "..." : "↑"}
          </button>
        </div>
        <div style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#333",
          marginTop: "10px",
          fontFamily: "'Space Mono', monospace",
        }}>
          Enter to send  ·  Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}