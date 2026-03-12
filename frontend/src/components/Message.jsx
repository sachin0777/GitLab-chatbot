/**
 * frontend/src/components/Message.jsx
 * Renders a single chat message with enhanced GitLab-themed styling.
 */

export default function Message({ message }) {
  const isUser = message.role === "user";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: "24px",
      animation: "fadeInUp 0.3s ease forwards",
    }}>
      {/* Role label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "6px",
      }}>
        {!isUser && (
          <div style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fc6d26, #e24329)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: "700",
            color: "#fff",
            fontFamily: "'Space Mono', monospace",
          }}>G</div>
        )}
        <span style={{
          fontSize: "11px",
          color: isUser ? "#555" : "#888",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {isUser ? "You" : "GitLab Assistant"}
        </span>
      </div>

      {/* Message bubble */}
      <div style={{
        maxWidth: "78%",
        padding: "14px 18px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser
          ? "linear-gradient(135deg, #fc6d26, #e24329)"
          : "#1f1f1f",
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
        color: isUser ? "#fff" : "#e8e8e8",
        fontSize: "14px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: isUser
          ? "0 4px 20px rgba(252, 109, 38, 0.25)"
          : "0 2px 12px rgba(0,0,0,0.3)",
      }}>
        {message.content}
      </div>

      {/* Source links */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div style={{
          marginTop: "10px",
          maxWidth: "78%",
          padding: "10px 14px",
          background: "#161616",
          border: "1px solid rgba(252, 109, 38, 0.15)",
          borderRadius: "8px",
        }}>
          <div style={{
            fontSize: "10px",
            color: "#fc6d26",
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}>
            Sources
          </div>
          {message.sources.map((url, index) => (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                fontSize: "12px",
                color: "#888",
                textDecoration: "none",
                wordBreak: "break-all",
                padding: "2px 0",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.target.style.color = "#fc6d26"}
              onMouseLeave={e => e.target.style.color = "#888"}
            >
              {url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}