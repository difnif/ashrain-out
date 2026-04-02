// SVGEditorScreen.jsx — 관리자용 SVG 오브젝트 에디터
// 수학 설명 콘텐츠의 오브젝트 위치/크기를 드래그로 조정, JSON 내보내기

import { useState, useRef, useCallback, useEffect } from "react";
import { PASTEL } from "../config";

// ── 스테이지별 오브젝트 스키마 ──
// type: "point" | "line" | "rect" | "path" | "text" | "circle"
const CONTENT_SCHEMAS = {
  distance: {
    name: "거리 (DistanceScreen)",
    stages: [
      { n: 1, title: "집에서 학교까지", objects: [
        { id: "home", type: "point", label: "🏠 집", x: 50, y: 280, color: PASTEL.coral },
        { id: "school", type: "point", label: "🏫 학교", x: 300, y: 60, color: PASTEL.sky },
        { id: "grid", type: "rect", label: "격자 영역", x: 30, y: 40, w: 310, h: 260, color: "#ccc" },
      ]},
      { n: 2, title: "거리의 정의", objects: [
        { id: "box", type: "rect", label: "추상화 박스", x: 10, y: 25, w: 120, h: 90, color: PASTEL.lavender },
        { id: "ptA", type: "point", label: "점 A", x: 72, y: 155, color: PASTEL.sky },
        { id: "ptB", type: "point", label: "점 B", x: 288, y: 155, color: PASTEL.sky },
      ]},
      { n: 3, title: "두 점 사이의 거리", objects: [
        { id: "ptA", type: "point", label: "점 A", x: 65, y: 160, color: PASTEL.sky },
        { id: "ptB", type: "point", label: "점 B", x: 295, y: 160, color: PASTEL.sky },
        { id: "curveLabel", type: "text", label: "곡선 라벨", x: 180, y: 77, text: "✕ 곡선" },
        { id: "zigLabel", type: "text", label: "지그재그 라벨", x: 200, y: 115, text: "✕ 지그재그" },
      ]},
      { n: 4, title: "점과 직선", objects: [
        { id: "lineY", type: "line", label: "직선 ℓ", x1: 15, y1: 155, x2: 345, y2: 155, color: PASTEL.sky },
        { id: "ptP", type: "point", label: "점 P", x: 180, y: 80, color: PASTEL.coral },
        { id: "footH", type: "point", label: "수선의 발 H", x: 180, y: 155, color: PASTEL.mint },
      ]},
      { n: 5, title: "평행선 거리", objects: [
        { id: "lineL", type: "line", label: "직선 ℓ", x1: 15, y1: 110, x2: 345, y2: 110, color: PASTEL.sky },
        { id: "lineM", type: "line", label: "직선 m", x1: 15, y1: 210, x2: 345, y2: 210, color: PASTEL.coral },
        { id: "midPt", type: "point", label: "중점", x: 180, y: 160, color: PASTEL.mint },
      ]},
      { n: 6, title: "점들의 모임", objects: [
        { id: "lineL", type: "line", label: "직선 ℓ", x1: 15, y1: 100, x2: 345, y2: 100, color: PASTEL.sky },
        { id: "lineM", type: "line", label: "직선 m", x1: 15, y1: 220, x2: 345, y2: 220, color: PASTEL.coral },
        { id: "lineN", type: "line", label: "직선 N", x1: 15, y1: 160, x2: 345, y2: 160, color: PASTEL.mint },
      ]},
      { n: 7, title: "직선을 돌려보면", objects: [
        { id: "pivot", type: "point", label: "회전 중심(교점)", x: 30, y: 155, color: PASTEL.coral },
        { id: "lineL", type: "line", label: "직선 ℓ", x1: 15, y1: 100, x2: 345, y2: 100, color: PASTEL.sky },
        { id: "lineM", type: "line", label: "직선 m", x1: 15, y1: 210, x2: 345, y2: 210, color: PASTEL.coral },
      ]},
      { n: 8, title: "돌아간 정도", objects: [
        { id: "vtx", type: "point", label: "꼭짓점", x: 30, y: 155, color: PASTEL.coral },
        { id: "arcLabel", type: "text", label: "각도 표시", x: 80, y: 140, text: "θ°" },
      ]},
      { n: 9, title: "엇각", objects: [
        { id: "lineL", type: "line", label: "직선 ℓ", x1: 15, y1: 100, x2: 345, y2: 100, color: PASTEL.sky },
        { id: "lineM", type: "line", label: "직선 m", x1: 15, y1: 210, x2: 345, y2: 210, color: PASTEL.coral },
        { id: "transversal", type: "line", label: "횡단선", x1: 100, y1: 30, x2: 260, y2: 280, color: PASTEL.lavender },
      ]},
      { n: 10, title: "엇각의 크기", objects: [
        { id: "angleA", type: "text", label: "각 α", x: 130, y: 90, text: "α" },
        { id: "angleB", type: "text", label: "각 β", x: 220, y: 200, text: "β = α" },
      ]},
      { n: 11, title: "각의 이등분선", objects: [
        { id: "vtx", type: "point", label: "꼭짓점 O", x: 30, y: 155, color: PASTEL.coral },
        { id: "bisector", type: "line", label: "이등분선", x1: 30, y1: 155, x2: 340, y2: 155, color: PASTEL.mint },
      ]},
      { n: 12, title: "직선 N 위의 점들", objects: [
        { id: "ptOnN", type: "point", label: "점 P (N 위)", x: 200, y: 155, color: PASTEL.mint },
        { id: "foot1", type: "point", label: "수선의 발 1", x: 200, y: 100, color: "#aaa" },
        { id: "foot2", type: "point", label: "수선의 발 2", x: 200, y: 210, color: "#aaa" },
      ]},
      { n: 13, title: "회전 후에도", objects: [
        { id: "label", type: "text", label: "d₁ = d₂ 표시", x: 180, y: 150, text: "d₁ = d₂" },
      ]},
      { n: 14, title: "이론적 증명", objects: [
        { id: "triL", type: "rect", label: "삼각형 L 영역", x: 80, y: 80, w: 100, h: 120, color: PASTEL.sky },
        { id: "triR", type: "rect", label: "삼각형 R 영역", x: 180, y: 80, w: 100, h: 120, color: PASTEL.coral },
      ]},
      { n: 15, title: "수형도", objects: [
        { id: "root", type: "point", label: "거리 (루트)", x: 180, y: 40, color: PASTEL.coral },
        { id: "branch1", type: "text", label: "두 점", x: 60, y: 100, text: "두 점" },
        { id: "branch2", type: "text", label: "점과 직선", x: 180, y: 100, text: "점과 직선" },
        { id: "branch3", type: "text", label: "각의 이등분선", x: 300, y: 100, text: "이등분선" },
      ]},
    ],
  },
};

// ── 헬퍼 ──
const HANDLE_R = 6;
function snapGrid(v, grid = 5) { return Math.round(v / grid) * grid; }

export function renderSVGEditorScreen(ctx) {
  return <SVGEditorInner theme={ctx.theme} setScreen={ctx.setScreen} playSfx={ctx.playSfx} showMsg={ctx.showMsg} />;
}

function SVGEditorInner({ theme, setScreen, playSfx, showMsg }) {
  const [contentKey, setContentKey] = useState("distance");
  const [stageIdx, setStageIdx] = useState(0);
  const [objects, setObjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dragState, setDragState] = useState(null); // { id, handle, startX, startY, origObj }
  const svgRef = useRef(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showJSON, setShowJSON] = useState(false);

  const W = 360, H = 320;
  const schema = CONTENT_SCHEMAS[contentKey];
  const stages = schema?.stages || [];
  const currentStage = stages[stageIdx];

  // Load objects when stage changes
  useEffect(() => {
    if (!currentStage) return;
    // Try load from localStorage first
    const saved = localStorage.getItem(`svged_${contentKey}_${currentStage.n}`);
    if (saved) {
      try { setObjects(JSON.parse(saved)); return; } catch {}
    }
    setObjects(currentStage.objects.map(o => ({ ...o })));
    setSelected(null);
  }, [contentKey, stageIdx]);

  const saveLocal = useCallback(() => {
    if (!currentStage) return;
    localStorage.setItem(`svged_${contentKey}_${currentStage.n}`, JSON.stringify(objects));
    showMsg("저장!", 1000);
  }, [objects, contentKey, currentStage]);

  const resetStage = () => {
    if (!currentStage) return;
    localStorage.removeItem(`svged_${contentKey}_${currentStage.n}`);
    setObjects(currentStage.objects.map(o => ({ ...o })));
    setSelected(null);
    showMsg("초기화됨", 1000);
  };

  const getSVGCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width * W,
      y: (clientY - rect.top) / rect.height * H,
    };
  };

  const handleDown = (e, id, handle = "move") => {
    e.stopPropagation();
    e.preventDefault();
    const pt = getSVGCoords(e);
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    setSelected(id);
    setDragState({ id, handle, startX: pt.x, startY: pt.y, origObj: { ...obj } });
  };

  const handleMove = (e) => {
    if (!dragState) return;
    e.preventDefault();
    const pt = getSVGCoords(e);
    const dx = pt.x - dragState.startX;
    const dy = pt.y - dragState.startY;
    const orig = dragState.origObj;
    const s = snapEnabled ? snapGrid : v => v;

    setObjects(prev => prev.map(o => {
      if (o.id !== dragState.id) return o;
      if (dragState.handle === "move") {
        if (o.type === "point" || o.type === "text" || o.type === "circle") {
          return { ...o, x: s(orig.x + dx), y: s(orig.y + dy) };
        }
        if (o.type === "line") {
          return { ...o, x1: s(orig.x1 + dx), y1: s(orig.y1 + dy), x2: s(orig.x2 + dx), y2: s(orig.y2 + dy) };
        }
        if (o.type === "rect") {
          return { ...o, x: s(orig.x + dx), y: s(orig.y + dy) };
        }
      }
      if (dragState.handle === "p1" && o.type === "line") {
        return { ...o, x1: s(orig.x1 + dx), y1: s(orig.y1 + dy) };
      }
      if (dragState.handle === "p2" && o.type === "line") {
        return { ...o, x2: s(orig.x2 + dx), y2: s(orig.y2 + dy) };
      }
      if (dragState.handle === "resize" && o.type === "rect") {
        return { ...o, w: Math.max(20, s(orig.w + dx)), h: Math.max(20, s(orig.h + dy)) };
      }
      return o;
    }));
  };

  const handleUp = () => {
    if (dragState) saveLocal();
    setDragState(null);
  };

  const exportJSON = () => {
    const out = {};
    stages.forEach((st, i) => {
      const key = `svged_${contentKey}_${st.n}`;
      const saved = localStorage.getItem(key);
      if (saved) out[`stage_${st.n}`] = JSON.parse(saved);
    });
    const json = JSON.stringify(out, null, 2);
    navigator.clipboard?.writeText(json).then(() => showMsg("JSON 복사 완료! 📋", 2000));
    return json;
  };

  const sel = objects.find(o => o.id === selected);

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, gap: 8 }}>
        <button onClick={() => { playSfx("click"); setScreen("admin"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 관리자</button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.text, textAlign: "center" }}>🎨 SVG 에디터</span>
        <button onClick={() => setSnapEnabled(!snapEnabled)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${snapEnabled ? PASTEL.mint : theme.border}`, background: snapEnabled ? `${PASTEL.mint}15` : theme.card, color: theme.text, fontSize: 9, cursor: "pointer" }}>
          {snapEnabled ? "⊞ 스냅 ON" : "⊞ 스냅 OFF"}
        </button>
      </div>

      {/* Content selector + Stage nav */}
      <div style={{ flexShrink: 0, padding: "8px 12px", display: "flex", gap: 6, alignItems: "center", borderBottom: `1px solid ${theme.border}` }}>
        <select value={contentKey} onChange={e => { setContentKey(e.target.value); setStageIdx(0); }}
          style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 11 }}>
          {Object.entries(CONTENT_SCHEMAS).map(([k, v]) => (
            <option key={k} value={k}>{v.name}</option>
          ))}
        </select>
        <button onClick={() => stageIdx > 0 && setStageIdx(stageIdx - 1)} disabled={stageIdx === 0}
          style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 12, cursor: "pointer", opacity: stageIdx === 0 ? 0.3 : 1 }}>◀</button>
        <span style={{ fontSize: 11, color: theme.text, fontWeight: 700, flex: 1, textAlign: "center" }}>
          {currentStage ? `${currentStage.n}. ${currentStage.title}` : "—"}
        </span>
        <button onClick={() => stageIdx < stages.length - 1 && setStageIdx(stageIdx + 1)} disabled={stageIdx >= stages.length - 1}
          style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 12, cursor: "pointer", opacity: stageIdx >= stages.length - 1 ? 0.3 : 1 }}>▶</button>
      </div>

      {/* SVG Canvas */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ flex: 1, background: theme.card, touchAction: "none" }}
          onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
          onTouchMove={handleMove} onTouchEnd={handleUp}
          onClick={() => setSelected(null)}>
          {/* Grid */}
          {snapEnabled && Array.from({ length: Math.floor(W / 20) + 1 }, (_, i) => (
            <line key={`gv${i}`} x1={i * 20} y1={0} x2={i * 20} y2={H} stroke={`${theme.textSec}10`} strokeWidth={0.5} />
          ))}
          {snapEnabled && Array.from({ length: Math.floor(H / 20) + 1 }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * 20} x2={W} y2={i * 20} stroke={`${theme.textSec}10`} strokeWidth={0.5} />
          ))}

          {/* Objects */}
          {objects.map(obj => {
            const isSel = obj.id === selected;
            const strokeSel = isSel ? PASTEL.coral : "transparent";

            if (obj.type === "point") {
              return (
                <g key={obj.id}>
                  <circle cx={obj.x} cy={obj.y} r={isSel ? 10 : 7} fill={obj.color || PASTEL.sky} stroke={strokeSel} strokeWidth={isSel ? 2 : 0} opacity={0.9}
                    onMouseDown={e => handleDown(e, obj.id)} onTouchStart={e => handleDown(e, obj.id)} style={{ cursor: "grab" }} />
                  <text x={obj.x} y={obj.y - 14} textAnchor="middle" fontSize={8} fill={theme.textSec}>{obj.label}</text>
                  {isSel && <text x={obj.x} y={obj.y + 22} textAnchor="middle" fontSize={7} fill={PASTEL.coral}>({Math.round(obj.x)}, {Math.round(obj.y)})</text>}
                </g>
              );
            }

            if (obj.type === "line") {
              const mx = (obj.x1 + obj.x2) / 2, my = (obj.y1 + obj.y2) / 2;
              return (
                <g key={obj.id}>
                  <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2} stroke={obj.color || theme.text} strokeWidth={isSel ? 3 : 2}
                    onMouseDown={e => handleDown(e, obj.id)} onTouchStart={e => handleDown(e, obj.id)} style={{ cursor: "grab" }} />
                  <text x={mx} y={my - 10} textAnchor="middle" fontSize={8} fill={theme.textSec}>{obj.label}</text>
                  {/* Endpoint handles */}
                  {isSel && <>
                    <circle cx={obj.x1} cy={obj.y1} r={HANDLE_R} fill="white" stroke={PASTEL.coral} strokeWidth={2}
                      onMouseDown={e => handleDown(e, obj.id, "p1")} onTouchStart={e => handleDown(e, obj.id, "p1")} style={{ cursor: "crosshair" }} />
                    <circle cx={obj.x2} cy={obj.y2} r={HANDLE_R} fill="white" stroke={PASTEL.coral} strokeWidth={2}
                      onMouseDown={e => handleDown(e, obj.id, "p2")} onTouchStart={e => handleDown(e, obj.id, "p2")} style={{ cursor: "crosshair" }} />
                    <text x={obj.x1} y={obj.y1 - 10} textAnchor="middle" fontSize={7} fill={PASTEL.coral}>({Math.round(obj.x1)},{Math.round(obj.y1)})</text>
                    <text x={obj.x2} y={obj.y2 - 10} textAnchor="middle" fontSize={7} fill={PASTEL.coral}>({Math.round(obj.x2)},{Math.round(obj.y2)})</text>
                  </>}
                </g>
              );
            }

            if (obj.type === "rect") {
              return (
                <g key={obj.id}>
                  <rect x={obj.x} y={obj.y} width={obj.w} height={obj.h} rx={4} fill={`${obj.color || theme.textSec}20`} stroke={isSel ? PASTEL.coral : `${obj.color || theme.textSec}40`} strokeWidth={isSel ? 2 : 1}
                    onMouseDown={e => handleDown(e, obj.id)} onTouchStart={e => handleDown(e, obj.id)} style={{ cursor: "grab" }} />
                  <text x={obj.x + obj.w / 2} y={obj.y - 6} textAnchor="middle" fontSize={8} fill={theme.textSec}>{obj.label}</text>
                  {isSel && <>
                    <circle cx={obj.x + obj.w} cy={obj.y + obj.h} r={HANDLE_R} fill="white" stroke={PASTEL.coral} strokeWidth={2}
                      onMouseDown={e => handleDown(e, obj.id, "resize")} onTouchStart={e => handleDown(e, obj.id, "resize")} style={{ cursor: "nwse-resize" }} />
                    <text x={obj.x} y={obj.y - 6} fontSize={7} fill={PASTEL.coral}>({Math.round(obj.x)},{Math.round(obj.y)}) {Math.round(obj.w)}×{Math.round(obj.h)}</text>
                  </>}
                </g>
              );
            }

            if (obj.type === "text") {
              return (
                <g key={obj.id}>
                  <text x={obj.x} y={obj.y} textAnchor="middle" fontSize={12} fill={isSel ? PASTEL.coral : theme.text} fontWeight={600}
                    onMouseDown={e => handleDown(e, obj.id)} onTouchStart={e => handleDown(e, obj.id)} style={{ cursor: "grab" }}>
                    {obj.text || obj.label}
                  </text>
                  {isSel && <text x={obj.x} y={obj.y + 16} textAnchor="middle" fontSize={7} fill={PASTEL.coral}>({Math.round(obj.x)}, {Math.round(obj.y)})</text>}
                </g>
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* Selected object info */}
      {sel && (
        <div style={{ flexShrink: 0, padding: "8px 12px", borderTop: `1px solid ${theme.border}`, background: `${PASTEL.coral}06`, fontSize: 11, color: theme.text }}>
          <b style={{ color: PASTEL.coral }}>{sel.label}</b>
          <span style={{ marginLeft: 8, color: theme.textSec }}>
            {sel.type === "point" && `(${Math.round(sel.x)}, ${Math.round(sel.y)})`}
            {sel.type === "line" && `(${Math.round(sel.x1)},${Math.round(sel.y1)}) → (${Math.round(sel.x2)},${Math.round(sel.y2)})`}
            {sel.type === "rect" && `(${Math.round(sel.x)},${Math.round(sel.y)}) ${Math.round(sel.w)}×${Math.round(sel.h)}`}
            {sel.type === "text" && `(${Math.round(sel.x)}, ${Math.round(sel.y)})`}
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ flexShrink: 0, padding: "8px 12px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={resetStage} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>↻ 초기화</button>
        <button onClick={saveLocal} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${PASTEL.mint}40`, background: `${PASTEL.mint}10`, color: PASTEL.mint, fontSize: 10, cursor: "pointer" }}>💾 저장</button>
        <button onClick={() => { exportJSON(); setShowJSON(true); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${PASTEL.sky}40`, background: `${PASTEL.sky}10`, color: PASTEL.sky, fontSize: 10, cursor: "pointer" }}>📋 JSON 복사</button>
        <button onClick={() => setShowJSON(!showJSON)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>{showJSON ? "JSON 닫기" : "JSON 보기"}</button>
      </div>

      {/* JSON preview */}
      {showJSON && (
        <div style={{ flexShrink: 0, maxHeight: 200, overflowY: "auto", padding: "8px 12px", background: theme.bg, borderTop: `1px solid ${theme.border}` }}>
          <pre style={{ fontSize: 9, color: theme.textSec, whiteSpace: "pre-wrap", margin: 0 }}>
            {JSON.stringify(objects, null, 2)}
          </pre>
        </div>
      )}

      {/* Stage thumbnails */}
      <div style={{ flexShrink: 0, padding: "6px 8px", borderTop: `1px solid ${theme.border}`, overflowX: "auto", display: "flex", gap: 4 }}>
        {stages.map((st, i) => {
          const hasSaved = !!localStorage.getItem(`svged_${contentKey}_${st.n}`);
          return (
            <button key={st.n} onClick={() => setStageIdx(i)} style={{
              flexShrink: 0, padding: "4px 8px", borderRadius: 6, fontSize: 9, cursor: "pointer",
              border: stageIdx === i ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
              background: stageIdx === i ? `${PASTEL.coral}10` : hasSaved ? `${PASTEL.mint}10` : theme.card,
              color: theme.text, whiteSpace: "nowrap",
            }}>
              {st.n}{hasSaved && " ✓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
