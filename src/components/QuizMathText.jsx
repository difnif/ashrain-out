// QuizMathText.jsx — 퀴즈 전용 수식 렌더러
// 담당: 퀴즈 채팅방 전담
// 태그:
//   [seg]AB[/seg]   → 선분 (overline)
//   [exp]base|exp[/exp]  → 지수 (base^exp, <sup>으로 윗첨자)
//   [frac]num|den[/frac] → 분수 (상하 분자/분모)
//   [rep]34[/rep]   → 순환마디 (overline, 색 강조)
//
// 공용 MathSpan을 import하지 않고 자체 파서로 처리 (채팅방 소유권 유지)

const TAG_RE = /\[(seg|exp|frac|rep)\]([^|\]]+?)(?:\|([^\]]+?))?\[\/\1\]/g;

function TagFrag({ kind, a, b, color }) {
  if (kind === "seg") {
    return (
      <span style={{
        textDecoration: "overline",
        textDecorationThickness: "2px",
        textDecorationColor: color || "currentColor",
        fontWeight: 600,
      }}>{a}</span>
    );
  }
  if (kind === "exp") {
    return (
      <span>
        {a}<sup style={{ fontSize: "0.72em", marginLeft: 1 }}>{b}</sup>
      </span>
    );
  }
  if (kind === "rep") {
    // 순환마디: overline + 강조색
    return (
      <span style={{
        textDecoration: "overline",
        textDecorationThickness: "2px",
        textDecorationColor: color || "#D95F4B",
        fontWeight: 700,
      }}>{a}</span>
    );
  }
  if (kind === "frac") {
    return (
      <span style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        verticalAlign: "-0.4em",
        margin: "0 3px",
        lineHeight: 1.1,
      }}>
        <span style={{ fontSize: "0.82em", padding: "0 4px" }}>{a}</span>
        <span style={{
          width: "100%",
          height: 1.5,
          background: color || "currentColor",
          margin: "1px 0",
        }} />
        <span style={{ fontSize: "0.82em", padding: "0 4px" }}>{b}</span>
      </span>
    );
  }
  return null;
}

export default function QuizMathText({ children, highlightColor }) {
  if (children == null) return null;
  const text = String(children);

  // 태그가 없으면 pre-wrap으로 바로 반환 (개행 유지)
  if (!text.includes("[")) return <>{text}</>;

  const parts = [];
  let last = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", val: text.slice(last, m.index) });
    }
    parts.push({ kind: m[1], a: m[2], b: m[3] });
    last = TAG_RE.lastIndex;
  }
  if (last < text.length) {
    parts.push({ kind: "text", val: text.slice(last) });
  }

  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text"
          ? <span key={i}>{p.val}</span>
          : <TagFrag key={i} kind={p.kind} a={p.a} b={p.b} color={highlightColor} />
      )}
    </>
  );
}
