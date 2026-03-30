import { useState, useEffect, useRef } from "react";
import { PASTEL, dist } from "../config";

// Build a right triangle from RHA or RHS input
function buildRightTriangle(mode, v1, v2, flipX, offsetX, offsetY, scale) {
  // mode: "rha" (hyp, angle_deg) or "rhs" (hyp, side)
  let hyp, adj, opp, angleA;
  if (mode === "rha") {
    hyp = v1; angleA = v2 * Math.PI / 180;
    adj = hyp * Math.cos(angleA);
    opp = hyp * Math.sin(angleA);
  } else {
    hyp = v1; adj = v2;
    opp = Math.sqrt(hyp * hyp - adj * adj);
    angleA = Math.atan2(opp, adj);
  }

  const s = scale;
  const B = { x: offsetX, y: offsetY };
  const C = { x: offsetX + (flipX ? -adj * s : adj * s), y: offsetY };
  const A = { x: C.x, y: offsetY - opp * s };

  return { A, B, C, hyp, adj, opp, angleA: angleA * 180 / Math.PI, scale: s };
}

// Angle arc SVG path
function ArcPath({ cx, cy, r, startAngle, endAngle, color, sw = 1.5 }) {
  const sa = startAngle * Math.PI / 180;
  const ea = endAngle * Math.PI / 180;
  const sx = cx + r * Math.cos(sa), sy = cy - r * Math.sin(sa);
  const ex = cx + r * Math.cos(ea), ey = cy - r * Math.sin(ea);
  let sweep = ea - sa;
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sf = sweep > 0 ? 0 : 1;
  return <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sf} ${ex} ${ey}`}
    fill="none" stroke={color} strokeWidth={sw} />;
}

// Right angle mark
function RightMark({ x, y, dir1, dir2, size = 8, color }) {
  const p1 = { x: x + dir1.x * size, y: y + dir1.y * size };
  const p2 = { x: p1.x + dir2.x * size, y: p1.y + dir2.y * size };
  const p3 = { x: x + dir2.x * size, y: y + dir2.y * size };
  return <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`}
    fill="none" stroke={color} strokeWidth={1.2} />;
}

export function CongruenceScreenInner({ theme, setScreen, playSfx, showMsg, ScreenWrap }) {
  const [mode, setMode] = useState(null); // "rha" | "rhs"
  const [v1, setV1] = useState(""); // hypotenuse
  const [v2, setV2] = useState(""); // angle (rha) or side (rhs)
  const [error, setError] = useState("");
  const [tri, setTri] = useState(null);
  const [step, setStep] = useState(-1); // proof step

  const canvasW = Math.min(window.innerWidth - 20, 400);
  const canvasH = 320;
  const scale = Math.min(canvasW * 0.25, canvasH * 0.3);

  const handleSubmit = () => {
    const nv1 = parseFloat(v1), nv2 = parseFloat(v2);
    if (isNaN(nv1) || isNaN(nv2) || nv1 <= 0 || nv2 <= 0) {
      setError("양수를 입력해주세요"); return;
    }
    if (mode === "rha") {
      if (nv2 >= 90 || nv2 <= 0) { setError("예각(0°~90°)을 입력해주세요"); return; }
    } else {
      if (nv2 >= nv1) { setError("변의 길이는 빗변보다 짧아야 해요"); return; }
    }
    setError("");
    const sc = scale / nv1;
    const t1 = buildRightTriangle(mode, nv1, nv2, false, canvasW * 0.15, canvasH * 0.7, sc);
    const t2 = buildRightTriangle(mode, nv1, nv2, true, canvasW * 0.85, canvasH * 0.7, sc);
    setTri({ t1, t2, hyp: nv1, v2: nv2 });
    setStep(0);
    playSfx("click");
  };

  const reset = () => { setTri(null); setStep(-1); setMode(null); playSfx("click"); };

  const inputStyle = {
    flex: 1, padding: "10px", borderRadius: 10,
    border: `1.5px solid ${theme.border}`, background: theme.bg,
    color: theme.text, fontSize: 14, textAlign: "center",
    fontFamily: "'Noto Serif KR', serif",
  };

  // Colors
  const COL = { hyp: "#D95F4B", angle: "#3A8FC2", side: "#2E9E6B", right: "#9B7FBF", dim: theme.textSec, match: "#E8A040" };

  // Proof steps
  const rhaSteps = [
    { title: "RHA 합동 조건", desc: "직각(R), 빗변(H), 한 예각(A)이 같은 두 삼각형" },
    { title: "ASA와 다른 점?", desc: "ASA는 '끼인변' 양 끝의 각이 같아야 하는데,\nRHA에서 빗변은 직각과 예각 사이의 변이 아니다" },
    { title: "핵심: 나머지 각", desc: `직각삼각형이므로 ∠C = 90°\n∴ ∠B = 180° - 90° - ∠A = ${tri ? (90 - tri.v2).toFixed(1) : "?"}°\n두 삼각형의 세 번째 각도 같다!` },
    { title: "ASA 성립!", desc: `∠A = ∠D, 빗변 AB = DE, ∠B = ∠E\n→ 빗변 양 끝의 두 각이 같다\n→ ASA 합동!` },
    { title: "∴ RHA = ASA 합동 ✓", desc: "직각삼각형에서 빗변과 한 예각이 같으면\n나머지 각이 자동으로 결정되므로\nASA 합동 조건을 만족한다" },
  ];

  const rhsSteps = [
    { title: "RHS 합동 조건", desc: "직각(R), 빗변(H), 한 변(S)이 같은 두 삼각형" },
    { title: "SSS와 다른 점?", desc: "세 변이 아닌 두 변만 알고 있다\n나머지 한 변을 모르는데 합동일까?" },
    { title: "삼각형 붙이기", desc: "같은 변(S)을 맞대어 두 삼각형을 붙이면..." },
    { title: "이등변삼각형!", desc: `AB = DB = ${tri ? tri.hyp : "?"} (빗변)\n→ △ABD는 이등변삼각형!` },
    { title: "수선의 성질", desc: "∠ACB = ∠DCB = 90°이므로\nC는 밑변 AD의 중점\n→ AC = DC" },
    { title: "세 번째 변 결정", desc: `피타고라스: AC = √(${tri ? tri.hyp : "?"}² - ${tri ? tri.v2 : "?"}²)\n= ${tri ? Math.sqrt(tri.hyp ** 2 - tri.v2 ** 2).toFixed(2) : "?"}\n두 삼각형의 세 번째 변도 같다!` },
    { title: "∴ RHS = SSS 합동 ✓", desc: "직각삼각형에서 빗변과 한 변이 같으면\n피타고라스 정리로 나머지 변이 결정되므로\nSSS 합동 조건을 만족한다" },
  ];

  const steps = mode === "rha" ? rhaSteps : rhsSteps;
  const maxStep = steps.length - 1;

  // RHS flip animation state
  const [flipProgress, setFlipProgress] = useState(0);
  useEffect(() => {
    if (mode !== "rhs" || step !== 2 || !tri) return;
    setFlipProgress(0);
    let start = null;
    const dur = 1500;
    const anim = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setFlipProgress(p);
      if (p < 1) requestAnimationFrame(anim);
    };
    const id = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(id);
  }, [step, mode]);

  // Render triangles on canvas
  const renderCanvas = () => {
    if (!tri) return null;
    const { t1, t2 } = tri;

    // For RHS step 2+: animated flip
    let t2Draw = t2;
    let showFlipped = false;
    if (mode === "rhs" && step >= 2) {
      showFlipped = true;
      const p = step === 2 ? flipProgress : 1;
      // Flip t2 to align BC with t1's BC, D' on opposite side
      const targetA = { x: t1.C.x, y: t1.C.y - (t1.C.y - t1.A.y) * -1 }; // mirror A across BC line
      // Actually: flip so that t2 shares BC with t1, and t2's A goes to opposite side
      const flippedA = { x: t1.C.x, y: t1.C.y + (t1.C.y - t1.A.y) * -1 };
      // Actually simpler: t1 has right angle at C, so:
      // t1: B at left, C at right bottom, A at right top (above C)
      // Flipped: D at right bottom (below C) = mirror of A across the BC line
      const mirrorA = { x: t1.A.x, y: 2 * t1.C.y - t1.A.y };

      // Interpolate t2 positions toward flipped position
      const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      t2Draw = {
        ...t2,
        A: lerp(t2.A, mirrorA, p),
        B: lerp(t2.B, t1.B, p),
        C: lerp(t2.C, t1.C, p),
      };
    }

    // Highlight colors based on step
    const t1Color = COL.dim;
    const t2Color = step >= 2 && mode === "rhs" ? COL.match : COL.dim;

    return (
      <svg width={canvasW} height={canvasH} style={{ background: theme.svgBg, borderRadius: 14, border: `1px solid ${theme.border}` }}>
        {/* Triangle 1 */}
        <polygon points={`${t1.A.x},${t1.A.y} ${t1.B.x},${t1.B.y} ${t1.C.x},${t1.C.y}`}
          fill={`${COL.hyp}08`} stroke={theme.text} strokeWidth={2} strokeLinejoin="round" />

        {/* Triangle 2 (or flipped) */}
        {(!showFlipped || step === 2) && (
          <polygon points={`${t2Draw.A.x},${t2Draw.A.y} ${t2Draw.B.x},${t2Draw.B.y} ${t2Draw.C.x},${t2Draw.C.y}`}
            fill={showFlipped ? `${COL.match}10` : `${COL.side}08`} stroke={showFlipped ? COL.match : theme.text}
            strokeWidth={2} strokeLinejoin="round" strokeDasharray={showFlipped && flipProgress < 1 ? "6,4" : "none"} />
        )}
        {showFlipped && step > 2 && (
          <polygon points={`${t2Draw.A.x},${t2Draw.A.y} ${t2Draw.B.x},${t2Draw.B.y} ${t2Draw.C.x},${t2Draw.C.y}`}
            fill={`${COL.match}10`} stroke={COL.match} strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* Right angle marks */}
        <RightMark x={t1.C.x} y={t1.C.y}
          dir1={{ x: (t1.B.x - t1.C.x) / dist(t1.B, t1.C), y: (t1.B.y - t1.C.y) / dist(t1.B, t1.C) }}
          dir2={{ x: (t1.A.x - t1.C.x) / dist(t1.A, t1.C), y: (t1.A.y - t1.C.y) / dist(t1.A, t1.C) }}
          color={COL.right} />
        {!showFlipped && (
          <RightMark x={t2.C.x} y={t2.C.y}
            dir1={{ x: (t2.B.x - t2.C.x) / dist(t2.B, t2.C), y: (t2.B.y - t2.C.y) / dist(t2.B, t2.C) }}
            dir2={{ x: (t2.A.x - t2.C.x) / dist(t2.A, t2.C), y: (t2.A.y - t2.C.y) / dist(t2.A, t2.C) }}
            color={COL.right} />
        )}

        {/* Labels */}
        <text x={t1.A.x - 12} y={t1.A.y - 6} fontSize={12} fill={theme.text} fontWeight={700}>A</text>
        <text x={t1.B.x - 14} y={t1.B.y + 14} fontSize={12} fill={theme.text} fontWeight={700}>B</text>
        <text x={t1.C.x + 4} y={t1.C.y + 14} fontSize={12} fill={theme.text} fontWeight={700}>C</text>

        {!showFlipped ? (<>
          <text x={t2.A.x + 4} y={t2.A.y - 6} fontSize={12} fill={theme.text} fontWeight={700}>D</text>
          <text x={t2.B.x + 4} y={t2.B.y + 14} fontSize={12} fill={theme.text} fontWeight={700}>E</text>
          <text x={t2.C.x - 14} y={t2.C.y + 14} fontSize={12} fill={theme.text} fontWeight={700}>F</text>
        </>) : (
          <text x={t2Draw.A.x + 4} y={t2Draw.A.y + (t2Draw.A.y > t1.C.y ? 16 : -6)}
            fontSize={12} fill={COL.match} fontWeight={700}>D'</text>
        )}

        {/* Hypotenuse highlight */}
        {step >= 0 && <>
          <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={COL.hyp} strokeWidth={3} opacity={0.6} />
          {!showFlipped && <line x1={t2.A.x} y1={t2.A.y} x2={t2.B.x} y2={t2.B.y} stroke={COL.hyp} strokeWidth={3} opacity={0.6} />}
        </>}

        {/* Angle highlight for RHA */}
        {mode === "rha" && step >= 0 && <>
          <ArcPath cx={t1.B.x} cy={t1.B.y} r={18}
            startAngle={0} endAngle={Math.atan2(t1.C.y - t1.A.y, t1.A.x - t1.B.x) * 180 / Math.PI > 0 ? Math.atan2(-(t1.A.y - t1.B.y), t1.A.x - t1.B.x) * 180 / Math.PI : 90 - tri.v2}
            color={COL.angle} sw={2} />
        </>}

        {/* Side highlight for RHS */}
        {mode === "rhs" && step >= 0 && <>
          <line x1={t1.B.x} y1={t1.B.y} x2={t1.C.x} y2={t1.C.y} stroke={COL.side} strokeWidth={3} opacity={0.7} />
          {!showFlipped && <line x1={t2.B.x} y1={t2.B.y} x2={t2.C.x} y2={t2.C.y} stroke={COL.side} strokeWidth={3} opacity={0.7} />}
        </>}

        {/* RHS: isosceles highlight at step 3+ */}
        {mode === "rhs" && step >= 3 && showFlipped && <>
          <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={COL.hyp} strokeWidth={2.5} />
          <line x1={t2Draw.A.x} y1={t2Draw.A.y} x2={t2Draw.B.x} y2={t2Draw.B.y} stroke={COL.hyp} strokeWidth={2.5} strokeDasharray="6,3" />
          <text x={(t1.B.x + t2Draw.B.x) / 2 - 30} y={(t1.B.y + t2Draw.B.y) / 2}
            fontSize={10} fill={COL.hyp} fontWeight={700}>이등변</text>
        </>}

        {/* RHA step 2: show angle calculation */}
        {mode === "rha" && step >= 2 && <>
          <text x={canvasW / 2} y={30} textAnchor="middle" fontSize={11} fill={COL.angle} fontWeight={700}>
            ∠B = 180° - 90° - {tri.v2}° = {(90 - tri.v2).toFixed(1)}°
          </text>
        </>}

        {/* Equal marks on matching sides */}
        {step >= maxStep - 1 && <>
          {/* tick marks on hypotenuse */}
          {(() => {
            const mx = (t1.A.x + t1.B.x) / 2, my = (t1.A.y + t1.B.y) / 2;
            const dx = t1.B.x - t1.A.x, dy = t1.B.y - t1.A.y, len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len * 6, ny = dx / len * 6;
            return <line x1={mx - nx} y1={my - ny} x2={mx + nx} y2={my + ny} stroke={COL.hyp} strokeWidth={2} />;
          })()}
        </>}
      </svg>
    );
  };

  return (
    <ScreenWrap title="직각삼각형의 합동 조건" back="그려서 공부하기" backTo="polygons">
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {!mode ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, padding: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>∟≅</div>
            <p style={{ fontSize: 12, color: theme.textSec, textAlign: "center" }}>
              직각삼각형의 합동 조건을 선택하세요
            </p>
            <div style={{ display: "flex", gap: 12, width: "min(340px, 90vw)" }}>
              <button onClick={() => setMode("rha")} style={{
                flex: 1, padding: "20px 14px", borderRadius: 16,
                border: `2px solid ${COL.angle}`, background: theme.card,
                color: theme.text, fontSize: 15, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
              }}>
                RHA
                <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>빗변 + 한 예각</span>
              </button>
              <button onClick={() => setMode("rhs")} style={{
                flex: 1, padding: "20px 14px", borderRadius: 16,
                border: `2px solid ${COL.side}`, background: theme.card,
                color: theme.text, fontSize: 15, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
              }}>
                RHS
                <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>빗변 + 한 변</span>
              </button>
            </div>
          </div>
        ) : !tri ? (
          <div style={{ padding: 20, animation: "fadeIn 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: mode === "rha" ? COL.angle : COL.side }}>
                {mode.toUpperCase()} 합동
              </span>
              <p style={{ fontSize: 12, color: theme.textSec, marginTop: 4 }}>
                {mode === "rha" ? "빗변의 길이와 한 예각의 크기를 입력하세요" : "빗변의 길이와 다른 한 변의 길이를 입력하세요"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: COL.hyp, fontWeight: 700 }}>빗변 (H)</label>
                <input value={v1} onChange={e => setV1(e.target.value)} placeholder="예: 10" style={inputStyle}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: mode === "rha" ? COL.angle : COL.side, fontWeight: 700 }}>
                  {mode === "rha" ? "예각 (A) °" : "한 변 (S)"}
                </label>
                <input value={v2} onChange={e => setV2(e.target.value)}
                  placeholder={mode === "rha" ? "예: 30" : "예: 6"} style={inputStyle}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              </div>
            </div>
            <button onClick={handleSubmit} style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>삼각형 만들기</button>
            {error && <p style={{ fontSize: 11, color: PASTEL.coral, textAlign: "center", marginTop: 8 }}>{error}</p>}
            <button onClick={() => setMode(null)} style={{
              width: "100%", marginTop: 8, padding: 10, borderRadius: 10,
              border: `1px solid ${theme.border}`, background: "transparent",
              color: theme.textSec, fontSize: 12, cursor: "pointer",
            }}>← 돌아가기</button>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Canvas */}
            <div style={{ padding: "12px 10px 8px", textAlign: "center" }}>
              {renderCanvas()}
            </div>

            {/* Proof step card */}
            <div style={{
              margin: "0 16px 12px", padding: "16px", borderRadius: 16,
              background: theme.card, border: `1.5px solid ${step >= maxStep ? PASTEL.mint : theme.border}`,
              transition: "border-color 0.3s",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: step >= maxStep ? PASTEL.mint : theme.text, marginBottom: 8 }}>
                {step >= 0 && step <= maxStep ? `${step + 1}/${steps.length} · ${steps[step].title}` : ""}
              </div>
              <p style={{ fontSize: 12, color: theme.text, lineHeight: 1.8, whiteSpace: "pre-line", margin: 0 }}>
                {step >= 0 && step <= maxStep ? steps[step].desc : ""}
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  border: `1px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>← 이전</button>
              )}
              {step < maxStep ? (
                <button onClick={() => setStep(s => s + 1)} style={{
                  flex: 2, padding: "10px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                  color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>다음 →</button>
              ) : (
                <button onClick={reset} style={{
                  flex: 2, padding: "10px", borderRadius: 12, border: "none",
                  background: PASTEL.mint, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>다시 하기</button>
              )}
            </div>
          </div>
        )}
      </div>
    </ScreenWrap>
  );
}

export function renderCongruenceScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, ScreenWrap } = ctx;
  return <CongruenceScreenInner theme={theme} setScreen={setScreen}
    playSfx={playSfx} showMsg={showMsg} ScreenWrap={ScreenWrap} />;
}
