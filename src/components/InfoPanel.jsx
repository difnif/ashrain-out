export default function InfoPanel({ data, theme }) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, right: 12,
      background: theme.card, borderRadius: 16, padding: "16px 20px",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.1)", border: `1px solid ${theme.border}`,
      maxHeight: "40%", overflowY: "auto", zIndex: 50,
    }}>
      {data.map((item, i) => (
        <div key={i} style={{
          marginBottom: 8, fontSize: 13, color: theme.text,
          fontFamily: "'Noto Serif KR', serif", lineHeight: 1.6,
        }}>
          {item.color && <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: item.color, marginRight: 8, verticalAlign: "middle",
          }} />}
          <span style={{ fontWeight: item.bold ? 700 : 400 }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
