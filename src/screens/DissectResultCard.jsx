// src/screens/DissectResultCard.jsx
// 해부실 5가지 검토 결과를 카드 형태로 렌더링
// MathSpan/MathInner는 ProblemScreen.jsx와 동일 로직을 자체 보유 (공용화는 추후 총괄방에서)

import { PASTEL } from "../config";

// ============================================================
// MathSpan 자체 보유 (ProblemScreen.jsx와 동일 로직)
// ============================================================
const SUP_MAP = {
  "\u00B2": "2", "\u00B3": "3", "\u00B9": "1",
  "\u2070": "0", "\u2074": "4", "\u2075": "5",
  "\u2076": "6", "\u2077": "7", "\u2078": "8", "\u2079": "9",
  "\u207A": "+", "\u207B": "-", "\u207F": "n",
  "\u02E3": "x", "\u02B8": "y",
  "\u1D43": "a", "\u1D47": "b", "\u1D9C": "c",
  "\u1D48": "d", "\u1D49": "e",
};
const SUP_CHARS = Object.keys(SUP_MAP).join("");
const SUP_RE = new RegExp(`([a-zA-Z0-9])([${SUP_CHARS}]+)`, "g");

function FracSpan({ num, den, color }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 3px", lineHeight: 1.2 }}>
      <span style={{ fontSize: "0.85em", padding: "0 4px", color }}>{num}</span>
      <span style={{ width: "100%", height: 1.5, background: color || "currentColor", margin: "1px 0" }} />
      <span style={{ fontSize: "0.85em", padding: "0 4px", color }}>{den}</span>
    </span>
  );
}

function ExpSpan({ base, exp, color }) {
  return (
    <span style={{ display: "inline", whiteSpace: "nowrap" }}>
      <span style={{ color }}>{base}</span>
      <sup style={{ fontSize: "0.75em", lineHeight: 0, verticalAlign: "super", color, marginLeft: "1px" }}>{exp}</sup>
    </span>
  );
}

function MathInner({ children }) {
  if (!children) return null;
  const text = String(children).replace(/\u0305/g, ""); // combining overline 제거
  const regex = /\[(seg|line|ray)\](.+?)\[\/\1\]/g;
  const parts = []; let last = 0; let mm;
  while ((mm = regex.exec(text)) !== null) {
    if (mm.index > last) parts.push({ type: "text", val: text.slice(last, mm.index) });
    parts.push({ type: mm[1], val: mm[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
  if (parts.length === 0) return <>{text}</>;
  return <>{parts.map((p, i) => {
    if (p.type === "seg") return <span key={i} style={{ textDecoration: "overline", textDecorationColor: "#D95F4B", textDecorationThickness: "2px", fontWeight: 600 }}>{p.val}</span>;
    if (p.type === "line") return <span key={i} style={{ textDecoration: "overline", textDecorationStyle: "double", fontWeight: 600 }}>{p.val}</span>;
    if (p.type === "ray") return <span key={i}><span style={{ textDecoration: "overline", textDecorationThickness: "2px", fontWeight: 600 }}>{p.val.charAt(0)}</span>{p.val.slice(1)}→</span>;
    return <span key={i}>{p.val}</span>;
  })}</>;
}

export function MathSpan({ children, highlightColor }) {
  if (!children) return null;
  let text = String(children);
  text = text.replace(SUP_RE, (match, base, supSeq) => {
    const converted = supSeq.split("").map(ch => SUP_MAP[ch] || ch).join("");
    return `[exp]${base}|${converted}[/exp]`;
  });
  text = text.replace(/([a-zA-Z0-9])\^\(([^)]+)\)/g, "[exp]$1|$2[/exp]");
  text = text.replace(/([a-zA-Z0-9])\^([a-zA-Z0-9]+)/g, "[exp]$1|$2[/exp]");
  const tagRegex = /\[(exp|frac)\](.+?)\|(.+?)\[\/\1\]/g;
  const parts = []; let last = 0; let m;
  while ((m = tagRegex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", val: text.slice(last, m.index) });
    parts.push({ type: m[1], a: m[2], b: m[3] });
    last = tagRegex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
  if (parts.length === 0) return <MathInner>{text}</MathInner>;
  return <>{parts.map((p, i) => {
    if (p.type === "frac") return <FracSpan key={i} num={p.a} den={p.b} color={highlightColor} />;
    if (p.type === "exp") return <ExpSpan key={i} base={p.a} exp={p.b} color={highlightColor} />;
    return <MathInner key={i}>{p.val}</MathInner>;
  })}</>;
}

// ============================================================
// 판정 배지 (verdict / scope 시각화)
// ============================================================
const VERDICT_STYLE = {
  // numberVariation.verdict
  robust:      { label: "견고",   color: PASTEL.mint,     icon: "🟢" },
  fragile:     { label: "취약",   color: PASTEL.coral,    icon: "🔴" },
  conditional: { label: "조건부", color: PASTEL.yellow,   icon: "🟡" },
  // generalRelation.scope / shortcut.scope
  always:      { label: "항상 성립",     color: PASTEL.mint,     icon: "✅" },
  specific:    { label: "특정 유형만",   color: PASTEL.yellow,   icon: "⚠️" },
  coincidence: { label: "우연의 결과",   color: PASTEL.coral,    icon: "🎲" },
  none:        { label: "없음",          color: PASTEL.sage,     icon: "—" },
  unknown:     { label: "판정 불가",     color: PASTEL.sage,     icon: "?" },
  // examples
  ok:          { label: "성립",   color: PASTEL.mint,  icon: "✓" },
  break:       { label: "깨짐",   color: PASTEL.coral, icon: "✗" },
};

function VerdictBadge({ verdict, theme }) {
  const v = VERDICT_STYLE[verdict] || VERDICT_STYLE.unknown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      background: `${v.color}25`,
      border: `1px solid ${v.color}`,
      color: theme.text,
      fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      <span>{v.icon}</span>
      <span>{v.label}</span>
    </span>
  );
}

// ============================================================
// 카드 셸 (제목 + 아이콘 + 배지 + 본문)
// ============================================================
function CardShell({ icon, title, badge, children, theme, accentColor }) {
  return (
    <div style={{
      marginBottom: 14,
      padding: 14,
      borderRadius: 16,
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderLeft: `4px solid ${accentColor || PASTEL.coral}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 10, paddingBottom: 8,
        borderBottom: `1px solid ${theme.border}`,
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, flex: 1 }}>{title}</span>
        {badge}
      </div>
      <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// 1. 숫자 변경 견고성 카드
// ============================================================
export function NumberVariationCard({ data, theme }) {
  if (!data) return null;
  return (
    <CardShell
      icon="🔢"
      title="숫자 변경 견고성"
      badge={<VerdictBadge verdict={data.verdict} theme={theme} />}
      theme={theme}
      accentColor={VERDICT_STYLE[data.verdict]?.color}
    >
      {data.summary && (
        <div style={{ fontWeight: 700, marginBottom: 8, color: theme.text }}>
          <MathSpan>{data.summary}</MathSpan>
        </div>
      )}
      {data.analysis && (
        <div style={{ marginBottom: 12, whiteSpace: "pre-wrap" }}>
          <MathSpan>{data.analysis}</MathSpan>
        </div>
      )}
      {data.examples?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, marginBottom: 6 }}>
            구체 예시
          </div>
          {data.examples.map((ex, i) => (
            <div key={i} style={{
              padding: "8px 10px",
              marginBottom: 6,
              borderRadius: 10,
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <VerdictBadge verdict={ex.verdict} theme={theme} />
              <div style={{ flex: 1, fontSize: 11 }}>
                <div><b>변경:</b> <MathSpan>{ex.change}</MathSpan></div>
                <div style={{ color: theme.textSec, marginTop: 2 }}>
                  <b>결과:</b> <MathSpan>{ex.result}</MathSpan>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ============================================================
// 2. 결과 관계의 일반성 카드
// ============================================================
export function GeneralRelationCard({ data, theme }) {
  if (!data) return null;
  return (
    <CardShell
      icon="🧩"
      title="결과 관계의 일반성"
      badge={<VerdictBadge verdict={data.scope} theme={theme} />}
      theme={theme}
      accentColor={VERDICT_STYLE[data.scope]?.color}
    >
      {data.summary && (
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          <MathSpan>{data.summary}</MathSpan>
        </div>
      )}
      {data.claimedRelation && (
        <div style={{
          padding: "8px 12px",
          marginBottom: 10,
          borderRadius: 10,
          background: `${PASTEL.lavender}15`,
          border: `1px solid ${PASTEL.lavender}50`,
          fontSize: 13,
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 10, color: theme.textSec, marginRight: 6 }}>도출 관계:</span>
          <MathSpan>{data.claimedRelation}</MathSpan>
        </div>
      )}
      {data.analysis && (
        <div style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
          <MathSpan>{data.analysis}</MathSpan>
        </div>
      )}
      {data.counterexamples?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PASTEL.coral, marginBottom: 6 }}>
            반례 / 예외
          </div>
          {data.counterexamples.map((ce, i) => (
            <div key={i} style={{
              padding: "6px 10px", marginBottom: 4,
              borderRadius: 8,
              background: `${PASTEL.coral}10`,
              fontSize: 11,
            }}>
              <MathSpan>{ce}</MathSpan>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

// ============================================================
// 3. 성질 증명 시연 카드
// ============================================================
export function ProofDemoCard({ data, theme }) {
  if (!data) return null;
  return (
    <CardShell
      icon="📐"
      title="성질 증명 시연"
      theme={theme}
      accentColor={PASTEL.sky}
    >
      {data.propertyName && (
        <div style={{
          fontSize: 13, fontWeight: 700,
          marginBottom: 10,
          padding: "6px 10px",
          background: `${PASTEL.sky}20`,
          borderRadius: 8,
          color: theme.text,
        }}>
          <MathSpan>{data.propertyName}</MathSpan>
        </div>
      )}
      {data.givens?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, marginBottom: 4 }}>
            주어진 조건
          </div>
          {data.givens.map((g, i) => (
            <div key={i} style={{ padding: "3px 0", fontSize: 12 }}>
              · <MathSpan>{g}</MathSpan>
            </div>
          ))}
        </div>
      )}
      {data.steps?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, marginBottom: 6 }}>
            증명 단계
          </div>
          {data.steps.map((s, i) => (
            <div key={i} style={{
              padding: "8px 10px", marginBottom: 6,
              borderRadius: 10,
              background: theme.bg,
              border: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: PASTEL.sky, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</span>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>
                    <MathSpan>{s.claim}</MathSpan>
                  </div>
                  {s.reason && (
                    <div style={{ color: theme.textSec, fontSize: 11, marginTop: 3 }}>
                      ← <MathSpan>{s.reason}</MathSpan>
                    </div>
                  )}
                  {s.curriculumTag && (
                    <div style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: `${PASTEL.lavender}30`,
                      fontSize: 10,
                      color: theme.textSec,
                    }}>
                      📖 {s.curriculumTag}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.conclusion && (
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          borderRadius: 10,
          background: `${PASTEL.mint}25`,
          border: `1px solid ${PASTEL.mint}`,
          fontWeight: 700,
          fontSize: 12,
        }}>
          <MathSpan>{data.conclusion}</MathSpan>
        </div>
      )}
    </CardShell>
  );
}

// ============================================================
// 4. 편법 검토 카드
// ============================================================
export function ShortcutCard({ data, theme }) {
  if (!data) return null;
  const isNone = data.scope === "none" || !data.method || data.method === "없음";
  return (
    <CardShell
      icon="⚡"
      title="편법 검토"
      badge={<VerdictBadge verdict={data.scope} theme={theme} />}
      theme={theme}
      accentColor={VERDICT_STYLE[data.scope]?.color}
    >
      {isNone ? (
        <div style={{ color: theme.textSec, fontStyle: "italic" }}>
          이 문제에는 별도의 편법이 없거나, 정공법이 곧 최단 경로입니다.
        </div>
      ) : (
        <>
          {data.summary && (
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              <MathSpan>{data.summary}</MathSpan>
            </div>
          )}
          {data.method && (
            <div style={{
              padding: "8px 12px",
              marginBottom: 10,
              borderRadius: 10,
              background: `${PASTEL.yellow}25`,
              border: `1px solid ${PASTEL.yellow}`,
              fontSize: 12,
            }}>
              <span style={{ fontSize: 10, color: theme.textSec, marginRight: 6 }}>편법:</span>
              <MathSpan>{data.method}</MathSpan>
            </div>
          )}
          {data.analysis && (
            <div style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
              <MathSpan>{data.analysis}</MathSpan>
            </div>
          )}
          {data.warning && (
            <div style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: `${PASTEL.coral}15`,
              border: `1px dashed ${PASTEL.coral}80`,
              fontSize: 11,
            }}>
              <span style={{ fontWeight: 700, color: PASTEL.coral }}>⚠️ 주의: </span>
              <MathSpan>{data.warning}</MathSpan>
            </div>
          )}
        </>
      )}
    </CardShell>
  );
}

// ============================================================
// 5. 검산 팁 카드
// ============================================================
export function VerificationCard({ data, theme }) {
  if (!data) return null;
  return (
    <CardShell
      icon="🔍"
      title="검산 팁"
      badge={
        <VerdictBadge
          verdict={data.available ? "ok" : "none"}
          theme={theme}
        />
      }
      theme={theme}
      accentColor={data.available ? PASTEL.mint : PASTEL.sage}
    >
      {data.available && data.tips?.length > 0 ? (
        <div>
          {data.tips.map((tip, i) => (
            <div key={i} style={{
              padding: "8px 10px",
              marginBottom: 6,
              borderRadius: 10,
              background: theme.bg,
              border: `1px solid ${theme.border}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 3 }}>
                {tip.method}
              </div>
              <div style={{ fontSize: 11, color: theme.textSec, lineHeight: 1.6 }}>
                <MathSpan>{tip.detail}</MathSpan>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: theme.textSec, fontStyle: "italic" }}>
          {data.note || "이 문제에 대한 의미있는 검산법이 마땅치 않습니다."}
        </div>
      )}
      {data.available && data.note && (
        <div style={{
          marginTop: 8,
          padding: "6px 10px",
          fontSize: 10,
          color: theme.textSec,
          background: theme.bg,
          borderRadius: 8,
        }}>
          💡 {data.note}
        </div>
      )}
    </CardShell>
  );
}
