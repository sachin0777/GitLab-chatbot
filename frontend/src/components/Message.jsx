/**
 * frontend/src/components/Message.jsx
 * Renders a single chat message — either from the user or the assistant.
 * Also displays source links when provided with an assistant message.
 */

export default function Message({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: "16px",
      }}
    >
      {/* Role label */}
      <span
        style={{
          fontSize: "11px",
          color: "#888",
          marginBottom: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {isUser ? "You" : "GitLab Assistant"}
      </span>

      {/* Message bubble */}
      <div
        style={{
          maxWidth: "75%",
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          backgroundColor: isUser ? "#fc6d26" : "#f4f4f5",
          color: isUser ? "#fff" : "#111",
          fontSize: "14px",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>

      {/* Source links — only shown on assistant messages */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div style={{ marginTop: "8px", maxWidth: "75%" }}>
          <span style={{ fontSize: "11px", color: "#888" }}>Sources:</span>
          <ul style={{ margin: "4px 0 0 0", padding: "0", listStyle: "none" }}>
            {message.sources.map((url, index) => (
              <li key={index}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    color: "#fc6d26",
                    textDecoration: "none",
                    wordBreak: "break-all",
                  }}
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}