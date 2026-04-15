// ============================================================
// ashrain.out — WrongNoteAnnotator (sub-view, modal overlay)
// ============================================================
// 사진 위에 형광펜/색연필/지우개로 표시하는 SVG 레이어.
// Detail에서 사진을 위로 스와이프 → 마운트, 확인/취소 → 언마운트.
//
// 도구:
//  - 형광펜 (highlighter): 굵고 반투명 (#ffeb3b 등)
//  - 색연필 (pencil): 가늘고 불투명 (검정/빨강/파랑 등)
//  - 지우개 (eraser): 터치한 path 삭제
//
// Pointer Events 사용 → touchstart/mousedown 중복 방지 (project rule)

import { useState, useRef, useCallback, useEffect } from "react";
import { PASTEL } from "../config";
import { useBackGuard } from "../hooks/useBackGuard";

const HIGHLIGHTER_COLORS = ["#FFEB3B", "#FFCDD2", "#C8E6C9", "#BBDEFB"];
const PENCIL_COLORS = ["#212121", "#D32F2F", "#1976D2", "#388E3C"];

const TOOL_CONFIG = {
  highlighter: { strokeWidth: 18, opacity: 0.45, lineCap: "round" },
  pencil: { strokeWidth: 2.5, opacity: 1, lineCap: "round" },
};

export default function WrongNoteAnnotator({
  theme,
  playSfx,
  showMsg,
  photoBase64,
  photoW = 1024,
  photoH = 1024,
  initialAnnotations = [],
  onSave,    // (annotations) => void
  onCancel,  // () => void
}) {
  const [tool, setTool] = useState("highlighter"); // "highlighter" | "pencil" | "eraser"
  const [color, setColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [paths, setPaths] = useState(initialAnnotations);
  const [drawing, setDrawing] = useState(false);
  const currentPathRef = useRef(null);
  const svgRef = useRef(null);

  // Undo 스택: 매 동작(stroke 완료 / 지우기 / 모두 지우기)마다 직전 paths 상태를 push
  // 메모리 보호를 위해 상한 50
  const UNDO_LIMIT = 50;
  const [undoStack, setUndoStack] = useState([]);
  const pushUndo = useCallback((prevPaths) => {
    setUndoStack((s) => {
      const next = [...s, prevPaths];
      if (next.length > UNDO_LIMIT) next.shift();
      return next;
    });
  }, []);
  const handleUndo = useCallback(() => {
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setPaths(prev);
      playSfx?.("click");
      return s.slice(0, -1);
    });
  }, [playSfx]);

  // 도구 변경 시 색상 자동 전환
  const switchTool = useCallback(
    (t) => {
      setTool(t);
      if (t === "highlighter") setColor(HIGHLIGHTER_COLORS[0]);
      else if (t === "pencil") setColor(PENCIL_COLORS[0]);
      playSfx?.("click");
    },
    [playSfx]
  );

  // 좌표 변환: 클라이언트 → SVG viewBox
  const toSvgCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * photoW;
    const y = ((e.clientY - rect.top) / rect.height) * photoH;
    return { x, y };
  }, [photoW, photoH]);

  // 점 → 원의 거리
  const pointToPathDistance = (px, py, points) => {
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - px;
      const dy = points[i].y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      const pt = toSvgCoords(e);
      if (!pt) return;

      if (tool === "eraser") {
        // 지우개: 터치한 좌표에 가까운 path 제거
        const ERASER_RADIUS = 24;
        setPaths((prev) => {
          const next = prev.filter((p) => {
            const d = pointToPathDistance(pt.x, pt.y, p.points || []);
            return d > ERASER_RADIUS;
          });
          // 실제로 뭔가 지워졌을 때만 undo 스택에 push
          if (next.length !== prev.length) {
            pushUndo(prev);
          }
          return next;
        });
        return;
      }

      // 형광펜/색연필: 새 path 시작 — 직전 paths를 undo 스택에 push
      pushUndo(paths);
      const newPath = {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool,
        color,
        points: [pt],
      };
      currentPathRef.current = newPath;
      setPaths((prev) => [...prev, newPath]);
      setDrawing(true);
    },
    [tool, color, toSvgCoords, paths, pushUndo]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!drawing) {
        // 지우개는 드래그하면서도 지우기
        if (tool === "eraser" && (e.buttons === 1 || e.pressure > 0)) {
          handlePointerDown(e);
        }
        return;
      }
      e.preventDefault();
      const pt = toSvgCoords(e);
      if (!pt || !currentPathRef.current) return;
      const cur = currentPathRef.current;
      cur.points.push(pt);
      // 강제 리렌더
      setPaths((prev) => prev.map((p) => (p.id === cur.id ? { ...cur } : p)));
    },
    [drawing, tool, toSvgCoords, handlePointerDown]
  );

  const handlePointerUp = useCallback(() => {
    if (drawing) {
      setDrawing(false);
      currentPathRef.current = null;
    }
  }, [drawing]);

  // ESC = 취소, Ctrl/Cmd+Z = undo
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        finishBackGuard();
        onCancel?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, handleUndo, finishBackGuard]);

  // 안드로이드 ◁ / 브라우저 ← 가드: 누르면 메인이 아니라 onCancel로.
  // 정상 종료 경로(저장/취소/ESC)에서는 반드시 finish()를 호출해 더미 history entry를 회수.
  const finishBackGuard = useBackGuard(onCancel, true);

  const handleSave = () => {
    playSfx?.("success");
    finishBackGuard();
    onSave?.(paths);
  };

  const handleClear = () => {
    if (paths.length === 0) return;
    if (window.confirm("모든 표시를 지울까요?")) {
      pushUndo(paths);
      setPaths([]);
      playSfx?.("click");
    }
  };

  // path를 SVG d 문자열로 변환
  const pointsToD = (points) => {
    if (!points || points.length === 0) return "";
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const currentColors =
    tool === "highlighter"
      ? HIGHLIGHTER_COLORS
      : tool === "pencil"
      ? PENCIL_COLORS
      : [];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#fff",
        }}
      >
        <button
          onClick={() => {
            playSfx?.("click");
            finishBackGuard();
            onCancel?.();
          }}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 13,
            cursor: "pointer",
            padding: 6,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          취소
        </button>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 12,
            opacity: 0.8,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          오답 표시
        </div>
        <button
          onClick={handleSave}
          style={{
            padding: "6px 14px",
            background: PASTEL.coral,
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          확인
        </button>
      </div>

      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "100%",
            maxHeight: "100%",
            display: "inline-block",
          }}
        >
          <img
            src={photoBase64}
            alt=""
            draggable={false}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${photoW} ${photoH}`}
            preserveAspectRatio="none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              touchAction: "none",
              cursor: tool === "eraser" ? "crosshair" : "crosshair",
            }}
          >
            {paths.map((p) => {
              const cfg = TOOL_CONFIG[p.tool] || TOOL_CONFIG.pencil;
              return (
                <path
                  key={p.id}
                  d={pointsToD(p.points)}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={cfg.strokeWidth}
                  strokeOpacity={cfg.opacity}
                  strokeLinecap={cfg.lineCap}
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(20,18,16,0.95)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* 도구 선택 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            justifyContent: "center",
          }}
        >
          {[
            { k: "highlighter", icon: "🖍", label: "형광펜" },
            { k: "pencil", icon: "✏", label: "색연필" },
            { k: "eraser", icon: "🧽", label: "지우개" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => switchTool(opt.k)}
              style={{
                flex: 1,
                maxWidth: 90,
                padding: "8px 6px",
                borderRadius: 10,
                border: `1.5px solid ${
                  tool === opt.k ? PASTEL.coral : "rgba(255,255,255,0.2)"
                }`,
                background:
                  tool === opt.k
                    ? "rgba(232,165,152,0.2)"
                    : "rgba(255,255,255,0.05)",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              <div style={{ fontSize: 18 }}>{opt.icon}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.85 }}>
                {opt.label}
              </div>
            </button>
          ))}
        </div>

        {/* 액션 row (undo / 모두 지우기) — 모든 도구에서 표시 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{
              padding: "6px 14px",
              height: 30,
              fontSize: 11,
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 14,
              background: "transparent",
              color: "#fff",
              cursor: undoStack.length === 0 ? "not-allowed" : "pointer",
              opacity: undoStack.length === 0 ? 0.35 : 1,
              fontFamily: "'Noto Serif KR', serif",
            }}
            aria-label="되돌리기"
          >
            ↶ 되돌리기{undoStack.length > 0 ? ` (${undoStack.length})` : ""}
          </button>
          <button
            onClick={handleClear}
            disabled={paths.length === 0}
            style={{
              padding: "6px 14px",
              height: 30,
              fontSize: 11,
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 14,
              background: "transparent",
              color: "#fff",
              cursor: paths.length === 0 ? "not-allowed" : "pointer",
              opacity: paths.length === 0 ? 0.35 : 1,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            모두 지우기
          </button>
        </div>

        {/* 색상 팔레트 (지우개 제외) */}
        {currentColors.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            {currentColors.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  playSfx?.("click");
                }}
                aria-label={`색상 ${c}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border:
                    color === c
                      ? "3px solid #fff"
                      : "1px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  padding: 0,
                  opacity: tool === "highlighter" ? 0.7 : 1,
                }}
              />
            ))}
          </div>
        )}

        {tool === "eraser" && (
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            지우고 싶은 표시를 터치하세요
          </div>
        )}
      </div>
    </div>
  );
}
