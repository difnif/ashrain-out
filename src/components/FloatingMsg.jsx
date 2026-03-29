export default function FloatingMsg({ msg, theme }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
      background: theme.card, color: theme.text, padding: "12px 24px",
      borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      border: `2px solid ${theme.accent}`, zIndex: 100, maxWidth: "80%",
      textAlign: "center", whiteSpace: "pre-line", fontSize: 14,
      fontFamily: "'Noto Serif KR', serif", animation: "fadeIn 0.3s ease",
    }}>
      {msg}
    </div>
  );
}
