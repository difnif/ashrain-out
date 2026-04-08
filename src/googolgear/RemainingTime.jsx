import { useState } from "react";

// 우주 상수
const UNIVERSE_AGE_YEARS = 1.38e10;          // 138억 년
const OBSERVABLE_UNIVERSE_LY = 9.3e10;        // 관측 가능한 우주 지름 (광년)
const MIN_PER_YEAR = 60 * 24 * 365.25;        // 분/년

// log10(B^E / rpm / minPerYear) — 거대한 수를 직접 다루지 않고 로그로 처리
// 결과: log10(남은 년수)
function logYears(B, E, rpm) {
  if (rpm <= 0 || B < 2 || E < 1) return null;
  return E * Math.log10(B) - Math.log10(rpm) - Math.log10(MIN_PER_YEAR);
}

// log10(x) → "a.bb × 10^c" 형태로 변환
function formatScientific(logVal, sigFigs = 2) {
  if (logVal === null || !isFinite(logVal)) return null;
  const exp = Math.floor(logVal);
  const mantissa = Math.pow(10, logVal - exp);
  return {
    mantissa: mantissa.toFixed(sigFigs),
    exp,
  };
}

// 위첨자 변환 (10^90 → 10⁹⁰)
const SUPER = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuper(n) {
  const s = String(n);
  let out = "";
  for (const ch of s) {
    if (ch === "-") out += "⁻";
    else out += SUPER[parseInt(ch, 10)] || ch;
  }
  return out;
}

function formatBig(sci) {
  if (!sci) return "—";
  if (sci.exp < 4) {
    // 작은 수는 일반 표기
    const val = parseFloat(sci.mantissa) * Math.pow(10, sci.exp);
    return val.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  }
  return `${sci.mantissa} × 10${toSuper(sci.exp)}`;
}

export default function RemainingTime({ B, E, rpm, theme }) {
  const [unit, setUnit] = useState("years"); // "years" | "lightyears"

  const ly = logYears(B, E, rpm);
  const sci = formatScientific(ly);

  // 우주 나이 배수: log10(years / universeAge) = ly - log10(universeAge)
  const compareLog = ly !== null
    ? ly - Math.log10(unit === "years" ? UNIVERSE_AGE_YEARS : OBSERVABLE_UNIVERSE_LY)
    : null;
  const compareSci = formatScientific(compareLog, 2);

  const labelMain = unit === "years" ? "남은 시간" : "빛이 갈 거리";
  const valueLabel = unit === "years" ? "년" : "광년";
  const compareLabel = unit === "years" ? "우주 나이의" : "관측 가능한 우주 지름의";
  const compareSuffix = unit === "years" ? "배" : "배";

  const isStopped = rpm <= 0;

  return (
    <div style={{
      background: theme.border + "33",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      color: theme.text,
      lineHeight: 1.5,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ opacity: 0.7, fontSize: 11 }}>{labelMain}</span>
        <button
          onClick={() => setUnit(u => u === "years" ? "lightyears" : "years")}
          style={{
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.text,
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {unit === "years" ? "년 ⇄" : "광년 ⇄"}
        </button>
      </div>
      {isStopped ? (
        <div style={{ fontWeight: 500, fontSize: 14, opacity: 0.5 }}>— (멈춤)</div>
      ) : (
        <>
          <div style={{ fontWeight: 500, fontSize: 14 }}>
            {formatBig(sci)} {valueLabel}
          </div>
          {compareSci && compareSci.exp > 0 && (
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
              = {compareLabel} {formatBig(compareSci)} {compareSuffix}
            </div>
          )}
        </>
      )}
    </div>
  );
}
