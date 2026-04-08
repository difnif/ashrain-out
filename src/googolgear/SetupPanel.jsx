import { useState, useRef, useCallback } from "react";
import GearTowerScene from "./GearTowerScene";

// 셋업 패널 — phase에 따라 B 또는 E 입력
// props: phase ("B" | "E"), value, onChange, onNext, onBack, theme, B (E phase일 때 프리뷰용)
export default function SetupPanel({
  phase, value, onChange, onNext, onBack, theme, B,
}) {
  const dragRef = useRef(null);
  const startYRef = useRef(0);
  const startValRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const min = 2;
  const max = 100;

  const onPointerDown = useCallback((e) => {
    setDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [value]);

  const onPointerMove = useCallback((e) => {
    if (!dragging) return;
    const dy = startYRef.current - e.clientY; // 위로 드래그하면 +
    const delta = Math.round(dy / 6); // 6px당 1단위
    const next = Math.max(min, Math.min(max, startValRef.current + delta));
    if (next !== value) onChange(next);
  }, [dragging, value, onChange]);

  const onPointerUp = useCallback((e) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const title = phase === "B" ? "밑 (톱니 수)" : "지수 (단 수)";
  const sub = phase === "B"
    ? "기어 한 단의 톱니가 몇 개일까?"
    : "기어를 몇 단까지 직렬로 연결할까?";
  const help = phase === "B"
    ? "톱니가 많을수록, 한 단에서 더 많이 줄여요."
    : "단수가 많을수록, 거듭제곱이 빠르게 커져요.";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: 16,
      gap: 12,
      color: theme.text,
      background: theme.bg,
    }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 500 }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{sub}</p>
      </div>

      {/* 프리뷰 */}
      <div style={{
        flex: 1,
        minHeight: 200,
        borderRadius: 12,
        background: theme.border + "22",
        position: "relative",
      }}>
        <GearTowerScene
          B={phase === "B" ? value : (B || 10)}
          E={phase === "E" ? value : 1}
          previewMode={phase === "B" ? "single" : "tower"}
          theme={theme}
        />
      </div>

      {/* 드래그 입력 */}
      <div
        ref={dragRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          padding: "16px 20px",
          borderRadius: 14,
          background: theme.border + "33",
          border: dragging ? `2px solid ${theme.accent}` : `2px solid transparent`,
          cursor: "ns-resize",
          touchAction: "none",
          userSelect: "none",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>↕ 위아래로 드래그</div>
        <div style={{ fontSize: 42, fontWeight: 500, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{min} ~ {max}</div>
      </div>

      {/* B^E 표시 (E 단계에서만) */}
      {phase === "E" && (
        <div style={{
          padding: 10,
          borderRadius: 10,
          background: theme.accent + "22",
          textAlign: "center",
          fontSize: 14,
        }}>
          B<sup>E</sup> = {B}<sup>{value}</sup>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 11, opacity: 0.6, textAlign: "center" }}>{help}</p>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.text,
            fontSize: 14,
            cursor: "pointer",
          }}
        >이전</button>
        <button
          onClick={onNext}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: theme.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >다음 →</button>
      </div>
    </div>
  );
}
