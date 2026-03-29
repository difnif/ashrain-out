import { useState, useEffect, useRef, useMemo } from "react";
import { PASTEL, dist, circumcenter, incenter, triangleType, angleAtVertex } from "../config";

// === Triangle input + side-by-side circumscribed/inscribed visualization ===

function buildTriangle(a, b, c, svgW, svgH, scale) {
  // Place triangle centered in given area
  const A = { x: 0, y: 0 };
  const B = { x: c * scale, y: 0 };
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const sinA = Math.sqrt(1 - cosA * cosA);
  const C = { x: b * cosA * scale, y: -b * sinA * scale };

  // Center in area
  const cx = (A.x + B.x + C.x) / 3;
  const cy = (A.y + B.y + C.y) / 3;
  const ox = svgW / 2 - cx;
  const oy = svgH / 2 - cy;

  return {
    A: { x: A.x + ox, y: A.y + oy },
    B: { x: B.x + ox, y: B.y + oy },
    C: { x: C.x + ox, y: C.y + oy },
    sides: [a, b, c],
  };
}

function TriangleInput({ onSubmit, acuteOnly, theme }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const na = parseFloat(a), nb = parseFloat(b), nc = parseFloat(c);
    if (isNaN(na) || isNaN(nb) || isNaN(nc) || na <= 0 || nb <= 0 || nc <= 0) {
      setError("양수를 입력해주세요"); return;
    }
    const mx = Math.max(na, nb, nc);
    if (mx >= na + nb + nc - mx) {
      setError("삼각형이 만들어지지 않아요!"); return;
    }
    if (acuteOnly) {
      const sides = [na, nb, nc].sort((x, y) => x - y);
      if (sides[0] ** 2 + sides[1] ** 2 <= sides[2] ** 2) {
        setError("예각삼각형만 가능해요! (가장 긴 변² < 나머지 두 변²의 합)"); return;
      }
    }
    setError("");
    onSubmit(na, nb, nc);
  };

  const inputStyle = {
    flex: 1, padding: "10px", borderRadius: 10,
    border: `1.5px solid ${theme.border}`, background: theme.bg,
    color: theme.text, fontSize: 14, textAlign: "center",
    fontFamily: "'Noto Serif KR', serif",
  };

  return (
    <div style={{ padding: "20px 16px", animation: "fadeIn 0.5s ease" }}>
      <p style={{ fontSize: 12, color: theme.textSec, textAlign: "center", marginBottom: 12 }}>
        세 변의 길이를 입력하세요 (SSS)
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={a} onChange={e => setA(e.target.value)} placeholder="a" style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        <input value={b} onChange={e => setB(e.target.value)} placeholder="b" style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        <input value={c} onChange={e => setC(e.target.value)} placeholder="c" style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />
      </div>
      <button onClick={handleSubmit} style={{
        width: "100%", padding: "12px", borderRadius: 12, border: "none",
        background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
        color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>삼각형 만들기</button>
      {error && <p style={{ fontSize: 11, color: PASTEL.coral, textAlign: "center", marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// Animated SVG scene for circumscribed OR inscribed circle
function CircleScene({ tri, type, svgW, svgH, animPhase }) {
  const { A, B, C, sides } = tri;
  const [a, b, c] = sides;

  // Compute centers
  const O = circumcenter(A, B, C); // circumcenter
  const I = incenter(A, B, C);     // incenter
  const R = O ? dist(O, A) : 0;    // circumradius

  // Inradius: area / semi-perimeter
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const r = area / s;

  const center = type === "circum" ? O : I;
  const radius = type === "circum" ? R : r;

  if (!center) return null;

  // Foot of perpendicular from incenter to each side
  const footOnSeg = (p, s1, s2) => {
    const dx = s2.x - s1.x, dy = s2.y - s1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return s1;
    const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / lenSq));
    return { x: s1.x + t * dx, y: s1.y + t * dy };
  };

  const footBC = footOnSeg(I, B, C);
  const footAC = footOnSeg(I, A, C);
  const footAB = footOnSeg(I, A, B);

  // Animation progress (0-4 phases)
  // Phase 0: triangle, Phase 1: center dot, Phase 2: lines, Phase 3: circle, Phase 4: marks
  const triOpacity = animPhase >= 0 ? 1 : 0;
  const centerOpacity = animPhase >= 1 ? 1 : 0;
  const linesOpacity = animPhase >= 2 ? 1 : 0;
  const circleOpacity = animPhase >= 3 ? 1 : 0;
  const marksOpacity = animPhase >= 4 ? 1 : 0;

  // Equal length marks (small ticks perpendicular to line)
  const tick = (p1, p2, count) => {
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len * 6, ny = dx / len * 6;
    const marks = [];
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 4;
      const bx = mx + (dx / len) * off, by = my + (dy / len) * off;
      marks.push(<line key={i} x1={bx - nx} y1={by - ny} x2={bx + nx} y2={by + ny}
        stroke={PASTEL.coral} strokeWidth={1.5} />);
    }
    return marks;
  };

  // Angle arc
  const angleArc = (vertex, p1, p2, r, color) => {
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    const sx = vertex.x + r * Math.cos(a1), sy = vertex.y + r * Math.sin(a1);
    const ex = vertex.x + r * Math.cos(a2), ey = vertex.y + r * Math.sin(a2);
    let sweep = a2 - a1;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    const sweepFlag = sweep > 0 ? 1 : 0;
    return <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex} ${ey}`}
      fill="none" stroke={color} strokeWidth={1.5} />;
  };

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ background: "transparent" }}>

      {/* Triangle */}
      <g opacity={triOpacity} style={{ transition: "opacity 0.5s" }}>
        <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="none" stroke={PASTEL.coral} strokeWidth={2} strokeLinejoin="round" />
        {/* Vertex labels */}
        <text x={A.x} y={A.y - 8} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>A</text>
        <text x={B.x} y={B.y + 16} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>B</text>
        <text x={C.x} y={C.y - 8} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>C</text>
      </g>

      {/* Center point */}
      <g opacity={centerOpacity} style={{ transition: "opacity 0.5s ease 0.3s" }}>
        <circle cx={center.x} cy={center.y} r={3.5}
          fill={type === "circum" ? PASTEL.sky : PASTEL.mint} />
        <text x={center.x + 8} y={center.y - 8} fontSize={10}
          fill={type === "circum" ? PASTEL.sky : PASTEL.mint} fontWeight={700}>
          {type === "circum" ? "O" : "I"}
        </text>
      </g>

      {/* Lines from center */}
      <g opacity={linesOpacity} style={{ transition: "opacity 0.5s ease 0.6s" }}>
        {type === "circum" ? (<>
          {/* Circumcenter → each vertex (radii) */}
          <line x1={center.x} y1={center.y} x2={A.x} y2={A.y} stroke={PASTEL.sky} strokeWidth={1} strokeDasharray="4,3" />
          <line x1={center.x} y1={center.y} x2={B.x} y2={B.y} stroke={PASTEL.sky} strokeWidth={1} strokeDasharray="4,3" />
          <line x1={center.x} y1={center.y} x2={C.x} y2={C.y} stroke={PASTEL.sky} strokeWidth={1} strokeDasharray="4,3" />
        </>) : (<>
          {/* Incenter → perpendicular foot on each side */}
          <line x1={center.x} y1={center.y} x2={footBC.x} y2={footBC.y} stroke={PASTEL.mint} strokeWidth={1} strokeDasharray="4,3" />
          <line x1={center.x} y1={center.y} x2={footAC.x} y2={footAC.y} stroke={PASTEL.mint} strokeWidth={1} strokeDasharray="4,3" />
          <line x1={center.x} y1={center.y} x2={footAB.x} y2={footAB.y} stroke={PASTEL.mint} strokeWidth={1} strokeDasharray="4,3" />
          {/* Right angle marks at feet */}
          {[footBC, footAC, footAB].map((ft, i) => {
            const dx = center.x - ft.x, dy = center.y - ft.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return null;
            const nx = -dy / len * 6, ny = dx / len * 6;
            const ux = dx / len * 6, uy = dy / len * 6;
            return <path key={i} d={`M ${ft.x + nx} ${ft.y + ny} L ${ft.x + nx + ux} ${ft.y + ny + uy} L ${ft.x + ux} ${ft.y + uy}`}
              fill="none" stroke={PASTEL.mint} strokeWidth={1} />;
          })}
        </>)}
      </g>

      {/* Circle */}
      <g opacity={circleOpacity} style={{ transition: "opacity 0.5s ease 0.9s" }}>
        <circle cx={center.x} cy={center.y} r={radius}
          fill="none" stroke={type === "circum" ? PASTEL.sky : PASTEL.mint}
          strokeWidth={1.5} strokeDasharray={type === "circum" ? "none" : "none"} />
      </g>

      {/* Equal marks */}
      <g opacity={marksOpacity} style={{ transition: "opacity 0.5s ease 1.2s" }}>
        {type === "circum" ? (<>
          {/* OA = OB = OC = R */}
          {tick(center, A, 1)}
          {tick(center, B, 1)}
          {tick(center, C, 1)}
        </>) : (<>
          {/* ID₁ = ID₂ = ID₃ = r */}
          {tick(center, footBC, 2)}
          {tick(center, footAC, 2)}
          {tick(center, footAB, 2)}
        </>)}
      </g>
    </svg>
  );
}

// Combined scene (both circles on one triangle) for 외심 옆에 내심
function CombinedScene({ tri, svgW, svgH, animPhase }) {
  const { A, B, C, sides } = tri;
  const [a, b, c] = sides;

  const O = circumcenter(A, B, C);
  const I = incenter(A, B, C);
  const R = O ? dist(O, A) : 0;
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const r = area / s;

  const footOnSeg = (p, s1, s2) => {
    const dx = s2.x - s1.x, dy = s2.y - s1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return s1;
    const t = Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / lenSq));
    return { x: s1.x + t * dx, y: s1.y + t * dy };
  };

  const footBC = footOnSeg(I, B, C);
  const footAC = footOnSeg(I, A, C);
  const footAB = footOnSeg(I, A, B);

  if (!O) return null;

  const tick = (p1, p2, count, color) => {
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;
    const nx = -dy / len * 6, ny = dx / len * 6;
    const marks = [];
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 4;
      const bx = mx + (dx / len) * off, by = my + (dy / len) * off;
      marks.push(<line key={i} x1={bx - nx} y1={by - ny} x2={bx + nx} y2={by + ny}
        stroke={color} strokeWidth={1.5} />);
    }
    return marks;
  };

  const triOp = animPhase >= 0 ? 1 : 0;
  const circumOp = animPhase >= 1 ? 1 : 0;
  const inOp = animPhase >= 2 ? 1 : 0;
  const linesOp = animPhase >= 3 ? 1 : 0;
  const marksOp = animPhase >= 4 ? 1 : 0;

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ background: "transparent" }}>
      {/* Triangle */}
      <g opacity={triOp} style={{ transition: "opacity 0.5s" }}>
        <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="none" stroke={PASTEL.coral} strokeWidth={2} strokeLinejoin="round" />
        <text x={A.x} y={A.y - 8} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>A</text>
        <text x={B.x} y={B.y + 16} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>B</text>
        <text x={C.x} y={C.y - 8} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>C</text>
      </g>

      {/* Circumscribed circle + center */}
      <g opacity={circumOp} style={{ transition: "opacity 0.5s ease 0.3s" }}>
        <circle cx={O.x} cy={O.y} r={R} fill="none" stroke={PASTEL.sky} strokeWidth={1.5} />
        <circle cx={O.x} cy={O.y} r={3} fill={PASTEL.sky} />
        <text x={O.x + 8} y={O.y - 8} fontSize={10} fill={PASTEL.sky} fontWeight={700}>O</text>
      </g>

      {/* Inscribed circle + center */}
      <g opacity={inOp} style={{ transition: "opacity 0.5s ease 0.6s" }}>
        <circle cx={I.x} cy={I.y} r={r} fill="none" stroke={PASTEL.mint} strokeWidth={1.5} />
        <circle cx={I.x} cy={I.y} r={3} fill={PASTEL.mint} />
        <text x={I.x - 14} y={I.y + 14} fontSize={10} fill={PASTEL.mint} fontWeight={700}>I</text>
      </g>

      {/* Lines */}
      <g opacity={linesOp} style={{ transition: "opacity 0.5s ease 0.9s" }}>
        {/* O → vertices */}
        <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={PASTEL.sky} strokeWidth={0.8} strokeDasharray="3,3" />
        <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={PASTEL.sky} strokeWidth={0.8} strokeDasharray="3,3" />
        <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={PASTEL.sky} strokeWidth={0.8} strokeDasharray="3,3" />
        {/* I → feet */}
        <line x1={I.x} y1={I.y} x2={footBC.x} y2={footBC.y} stroke={PASTEL.mint} strokeWidth={0.8} strokeDasharray="3,3" />
        <line x1={I.x} y1={I.y} x2={footAC.x} y2={footAC.y} stroke={PASTEL.mint} strokeWidth={0.8} strokeDasharray="3,3" />
        <line x1={I.x} y1={I.y} x2={footAB.x} y2={footAB.y} stroke={PASTEL.mint} strokeWidth={0.8} strokeDasharray="3,3" />
      </g>

      {/* Equal marks */}
      <g opacity={marksOp} style={{ transition: "opacity 0.5s ease 1.2s" }}>
        {tick(O, A, 1, PASTEL.sky)}
        {tick(O, B, 1, PASTEL.sky)}
        {tick(O, C, 1, PASTEL.sky)}
        {tick(I, footBC, 2, PASTEL.mint)}
        {tick(I, footAC, 2, PASTEL.mint)}
        {tick(I, footAB, 2, PASTEL.mint)}
      </g>
    </svg>
  );
}

// Formula display
function Formulas({ sides, type, theme }) {
  const [a, b, c] = sides;
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const R = (a * b * c) / (4 * area);
  const r = area / s;

  const formulaStyle = {
    background: theme.card, borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${theme.border}`, flex: 1, minWidth: 0,
  };
  const labelStyle = (color) => ({
    fontSize: 10, fontWeight: 700, color, marginBottom: 6, display: "block",
  });
  const eqStyle = { fontSize: 13, color: theme.text, lineHeight: 1.8, fontFamily: "'Noto Serif KR', serif" };

  if (type === "side-by-side") {
    return (
      <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
        <div style={formulaStyle}>
          <span style={labelStyle(PASTEL.sky)}>외접원 (Circumscribed)</span>
          <div style={eqStyle}>
            <div>OA = OB = OC = R</div>
            <div>R = abc / 4S</div>
            <div style={{ fontSize: 11, color: PASTEL.sky, marginTop: 4 }}>
              = {a.toFixed(1)}×{b.toFixed(1)}×{c.toFixed(1)} / {(4 * area).toFixed(1)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: PASTEL.sky }}>
              R ≈ {R.toFixed(2)}
            </div>
          </div>
        </div>
        <div style={formulaStyle}>
          <span style={labelStyle(PASTEL.mint)}>내접원 (Inscribed)</span>
          <div style={eqStyle}>
            <div>ID₁ = ID₂ = ID₃ = r</div>
            <div>r = S / s</div>
            <div style={{ fontSize: 11, color: PASTEL.mint, marginTop: 4 }}>
              = {area.toFixed(1)} / {s.toFixed(1)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: PASTEL.mint }}>
              r ≈ {r.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Combined view formulas
  return (
    <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
      <div style={formulaStyle}>
        <span style={labelStyle(PASTEL.sky)}>외심 O</span>
        <div style={eqStyle}>
          <div>OA = OB = OC</div>
          <div>R = abc / 4S</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: PASTEL.sky }}>R ≈ {R.toFixed(2)}</div>
        </div>
      </div>
      <div style={formulaStyle}>
        <span style={labelStyle(PASTEL.mint)}>내심 I</span>
        <div style={eqStyle}>
          <div>ID₁ = ID₂ = ID₃</div>
          <div>r = S / s</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: PASTEL.mint }}>r ≈ {r.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

// Main screen component
export function renderCompareScreen(ctx, mode) {
  const { theme, setScreen, playSfx, ScreenWrap } = ctx;

  const isCombined = mode === "combined";
  const title = isCombined ? "외심 옆에 내심" : "외접원 옆에 내접원";

  // We need state but this is a render function, not a component.
  // Use a wrapper component approach via a key trick
  return <CompareScreenInner theme={theme} setScreen={setScreen} playSfx={playSfx}
    ScreenWrap={ScreenWrap} isCombined={isCombined} title={title} />;
}

function CompareScreenInner({ theme, setScreen, playSfx, ScreenWrap, isCombined, title }) {
  const [tri, setTri] = useState(null);
  const [animPhase, setAnimPhase] = useState(-1);
  const containerRef = useRef(null);
  const [svgW, setSvgW] = useState(170);

  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 32, 600);
      setSvgW(isCombined ? Math.min(w, 360) : Math.floor((w - 16) / 2));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [isCombined]);

  const svgH = Math.min(svgW * 1.1, 260);

  const handleSubmit = (a, b, c) => {
    const scale = Math.min(svgW * 0.6, svgH * 0.5) / Math.max(a, b, c);

    if (isCombined) {
      const t = buildTriangle(a, b, c, svgW, svgH, scale);
      setTri({ ...t, sides: [a, b, c] });
    } else {
      const tL = buildTriangle(a, b, c, svgW, svgH, scale);
      const tR = buildTriangle(a, b, c, svgW, svgH, scale);
      setTri({ left: { ...tL, sides: [a, b, c] }, right: { ...tR, sides: [a, b, c] }, sides: [a, b, c] });
    }
    setAnimPhase(-1);
    playSfx("click");

    // Animate phases
    setTimeout(() => setAnimPhase(0), 200);
    setTimeout(() => setAnimPhase(1), 700);
    setTimeout(() => setAnimPhase(2), 1200);
    setTimeout(() => setAnimPhase(3), 1800);
    setTimeout(() => setAnimPhase(4), 2400);
  };

  const reset = () => {
    setTri(null);
    setAnimPhase(-1);
    playSfx("click");
  };

  return (
    <ScreenWrap title={title} back="그려서 공부하기" backTo="polygons">
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {!tri ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 300 }}>
            <div style={{ width: "min(340px, 90vw)" }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{isCombined ? "O · I" : "⊙⊙"}</div>
                <p style={{ fontSize: 12, color: theme.textSec }}>
                  {isCombined ? "하나의 삼각형에 외접원과 내접원을 함께" : "외접원과 내접원을 나란히 비교"}
                </p>
                {isCombined && (
                  <p style={{ fontSize: 10, color: PASTEL.coral, marginTop: 4 }}>
                    ※ 예각삼각형만 가능합니다
                  </p>
                )}
              </div>
              <TriangleInput onSubmit={handleSubmit} acuteOnly={isCombined} theme={theme} />
            </div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            {/* SVG area */}
            <div style={{
              display: "flex", justifyContent: "center", gap: isCombined ? 0 : 8,
              padding: "16px 8px 8px", flexWrap: "wrap",
            }}>
              {isCombined ? (
                <div style={{ textAlign: "center" }}>
                  <CombinedScene tri={tri} svgW={svgW} svgH={svgH} animPhase={animPhase} />
                </div>
              ) : (<>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: PASTEL.sky, fontWeight: 700, marginBottom: 4 }}>외접원</div>
                  <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
                    <CircleScene tri={tri.left} type="circum" svgW={svgW} svgH={svgH} animPhase={animPhase} />
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: PASTEL.mint, fontWeight: 700, marginBottom: 4 }}>내접원</div>
                  <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, overflow: "hidden" }}>
                    <CircleScene tri={tri.right} type="in" svgW={svgW} svgH={svgH} animPhase={animPhase} />
                  </div>
                </div>
              </>)}
            </div>

            {/* Formulas — shown after animation */}
            {animPhase >= 4 && (
              <div style={{ animation: "fadeIn 0.5s ease" }}>
                <Formulas sides={tri.sides || tri.left?.sides || [3,4,5]}
                  type={isCombined ? "combined" : "side-by-side"} theme={theme} />

                {/* Triangle info */}
                <div style={{ textAlign: "center", padding: "0 16px 8px" }}>
                  <p style={{ fontSize: 11, color: theme.textSec }}>
                    {triangleType(
                      isCombined ? tri.A : tri.left.A,
                      isCombined ? tri.B : tri.left.B,
                      isCombined ? tri.C : tri.left.C
                    ).join(" · ")}
                    {(() => {
                      const ss = tri.sides || tri.left.sides;
                      const sp = (ss[0]+ss[1]+ss[2])/2;
                      return ` | S(넓이) ≈ ${Math.sqrt(sp*(sp-ss[0])*(sp-ss[1])*(sp-ss[2])).toFixed(1)}`;
                    })()}
                  </p>
                </div>
              </div>
            )}

            {/* Reset button */}
            <div style={{ textAlign: "center", padding: "8px 16px 20px" }}>
              <button onClick={reset} style={{
                padding: "10px 24px", borderRadius: 12,
                border: `1.5px solid ${theme.border}`, background: theme.card,
                color: theme.textSec, fontSize: 12, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}>다른 삼각형 그리기</button>
            </div>
          </div>
        )}
      </div>
    </ScreenWrap>
  );
}
