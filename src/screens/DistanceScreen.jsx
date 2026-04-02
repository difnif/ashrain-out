import { useState, useRef, useEffect, useCallback } from "react";
import { PASTEL, dist, closestPointOnLine } from "../config";

// ============================================================
// DistanceScreen — 거리 개념부터 각의 이등분선까지
// Stages:
//   1: 두 점 사이의 거리
//   2: 점과 직선 사이의 거리
//   3: 각 = 두 반직선 (브릿지)
//   4: 각의 내부에서 d₁ = d₂ 찾기
//   5: 같은 거리인 점들의 모임 → 직선
//   6: 컴퍼스 작도
//   7: 자취 발견 (자동 반복 → 줌아웃)
//   8: 왜 항상 같은 직선? + RHS 합동 증명
// ============================================================

const STAGE_INFO = [
  { n: 1, title: "두 점 사이의 거리", sub: "가장 짧은 경로 = 직선" },
  { n: 2, title: "점과 직선 사이의 거리", sub: "수직 거리가 최단!" },
  { n: 3, title: "각이란 무엇인가", sub: "두 반직선이 벌어진 정도" },
  { n: 4, title: "같은 거리 찾기", sub: "d₁ = d₂인 점을 찾아봐!" },
  { n: 5, title: "점들의 모임", sub: "같은 거리인 점들을 이으면?" },
  { n: 6, title: "컴퍼스로 작도", sub: "같은 거리를 두 번 써보자" },
  { n: 7, title: "자취 발견", sub: "컴퍼스를 다르게 벌려도…?" },
  { n: 8, title: "왜 항상 같은 직선?", sub: "RHS 합동으로 증명" },
];

function ptOnSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.1) return a;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function ptToLineDist(p, a, b) {
  const c = ptOnSeg(p, a, b);
  return dist(p, c);
}

function footOfPerp(p, a, dir) {
  const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
  const ux = dir.x / len, uy = dir.y / len;
  const t = (p.x - a.x) * ux + (p.y - a.y) * uy;
  if (t < 0) return null;
  return { x: a.x + ux * t, y: a.y + uy * t };
}

function distToRay(p, origin, dir) {
  const foot = footOfPerp(p, origin, dir);
  if (!foot) return dist(p, origin);
  return dist(p, foot);
}

// Given angle vertex V, ray dirs d1 & d2, find angle bisector direction
function bisectorDir(d1, d2) {
  const len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
  const len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);
  const u1 = { x: d1.x / len1, y: d1.y / len1 };
  const u2 = { x: d2.x / len2, y: d2.y / len2 };
  return { x: u1.x + u2.x, y: u1.y + u2.y };
}

export function renderDistanceScreen(ctx) {
  const { theme, themeKey, setScreen, playSfx, showMsg, isPC } = ctx;
  return <DistanceScreenInner theme={theme} themeKey={themeKey} setScreen={setScreen}
    playSfx={playSfx} showMsg={showMsg} isPC={isPC} />;
}

function DistanceScreenInner({ theme, themeKey, setScreen, playSfx, showMsg, isPC }) {
  const [stage, setStage] = useState(1);
  const [sub, setSub] = useState(0); // sub-step within stage
  const svgRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ w: 360, h: 400 });
  const containerRef = useRef(null);

  // Stage 1 state
  const [s1Points, setS1Points] = useState([]);
  const [s1Paths, setS1Paths] = useState([]);

  // Stage 2 state
  const [s2Tries, setS2Tries] = useState([]);
  const [s2FoundPerp, setS2FoundPerp] = useState(false);

  // Stage 4 state
  const [s4Point, setS4Point] = useState(null);
  const [s4Dragging, setS4Dragging] = useState(false);
  const [s4Found, setS4Found] = useState(false);

  // Stage 5 state
  const [s5Points, setS5Points] = useState([]);
  const [s5ShowLine, setS5ShowLine] = useState(false);

  // Stage 6 state
  const [s6Phase, setS6Phase] = useState(0); // 0=explain, 1=bigArc, 2=smallArcs, 3=done

  // Stage 7 state
  const [s7Phase, setS7Phase] = useState(0); // 0=clear, 1=animating, 2=done
  const [s7Points, setS7Points] = useState([]);
  const [s7ArcIdx, setS7ArcIdx] = useState(0);
  const [s7Zoom, setS7Zoom] = useState(1);
  const s7Timer = useRef(null);

  // Stage 8 state
  const [s8Step, setS8Step] = useState(0);

  // Shared angle geometry (stages 3-8)
  const cx = svgSize.w / 2, cy = svgSize.h * 0.7;
  const V = { x: cx - 60, y: cy }; // vertex
  const angDeg = 54;
  const halfAng = (angDeg / 2) * Math.PI / 180;
  const baseAng = -Math.PI / 4; // base angle direction
  const dir1 = { x: Math.cos(baseAng - halfAng), y: Math.sin(baseAng - halfAng) };
  const dir2 = { x: Math.cos(baseAng + halfAng), y: Math.sin(baseAng + halfAng) };
  const rayLen = Math.max(svgSize.w, svgSize.h) * 1.2;
  const R1end = { x: V.x + dir1.x * rayLen, y: V.y + dir1.y * rayLen };
  const R2end = { x: V.x + dir2.x * rayLen, y: V.y + dir2.y * rayLen };
  const bisDir = bisectorDir(dir1, dir2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setSvgSize({ w: e.contentRect.width, h: Math.min(e.contentRect.height, 500) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset sub-state when stage changes
  useEffect(() => {
    setSub(0);
    setS1Points([]); setS1Paths([]);
    setS2Tries([]); setS2FoundPerp(false);
    setS4Point(null); setS4Found(false); setS4Dragging(false);
    setS5Points([]); setS5ShowLine(false);
    setS6Phase(0);
    setS7Phase(0); setS7Points([]); setS7ArcIdx(0); setS7Zoom(1);
    setS8Step(0);
    if (s7Timer.current) clearInterval(s7Timer.current);
  }, [stage]);

  const getSvgPt = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // ========== Stage 1: Two point distance ==========
  const renderStage1 = () => {
    const A = { x: svgSize.w * 0.2, y: svgSize.h * 0.5 };
    const B = { x: svgSize.w * 0.8, y: svgSize.h * 0.5 };
    const straight = dist(A, B);

    // curved paths
    const curves = [
      { d: `M ${A.x} ${A.y} Q ${cx} ${svgSize.h * 0.15} ${B.x} ${B.y}`, label: "곡선 ①", color: "#ccc", approxLen: straight * 1.3 },
      { d: `M ${A.x} ${A.y} L ${A.x} ${svgSize.h * 0.25} L ${B.x} ${svgSize.h * 0.25} L ${B.x} ${B.y}`, label: "꺾인선 ②", color: "#bbb", approxLen: straight * 1.5 },
    ];

    return (
      <g>
        {/* Curved paths */}
        {sub >= 1 && curves.map((c, i) => (
          <g key={i}>
            <path d={c.d} fill="none" stroke={c.color} strokeWidth={2} strokeDasharray="6 4" />
            <text x={cx} y={svgSize.h * (i === 0 ? 0.22 : 0.2)} textAnchor="middle"
              fontSize={10} fill={c.color}>{c.label}: ≈{c.approxLen.toFixed(0)}</text>
          </g>
        ))}
        {/* Straight line */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={sub >= 2 ? PASTEL.coral : theme.line} strokeWidth={sub >= 2 ? 3 : 2} />
        {sub >= 2 && (
          <text x={cx} y={A.y + 20} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>
            직선: {straight.toFixed(0)} ← 가장 짧다!
          </text>
        )}
        {/* Points */}
        <circle cx={A.x} cy={A.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2} />
        <circle cx={B.x} cy={B.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2} />
        <text x={A.x} y={A.y - 14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>A</text>
        <text x={B.x} y={B.y - 14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>B</text>
      </g>
    );
  };

  // ========== Stage 2: Point-line distance ==========
  const s2Line = { a: { x: svgSize.w * 0.1, y: svgSize.h * 0.65 }, b: { x: svgSize.w * 0.9, y: svgSize.h * 0.65 } };
  const s2Point = { x: svgSize.w * 0.45, y: svgSize.h * 0.25 };
  const s2Foot = closestPointOnLine(s2Point, s2Line.a, s2Line.b);

  const handleS2Tap = (e) => {
    if (s2FoundPerp) return;
    const pt = getSvgPt(e);
    // project tap onto line
    const onLine = ptOnSeg(pt, s2Line.a, s2Line.b);
    const d = dist(s2Point, onLine);
    const perpDist = dist(s2Point, s2Foot);
    const isPerp = Math.abs(d - perpDist) < 8;

    const trial = { target: onLine, dist: d, isPerp };
    setS2Tries(prev => [...prev, trial]);

    if (isPerp) {
      setS2FoundPerp(true);
      playSfx("success");
      showMsg("수직 거리가 가장 짧아! 🎉", 2000);
    } else {
      playSfx("click");
    }
  };

  const renderStage2 = () => (
    <g>
      {/* Line */}
      <line x1={s2Line.a.x} y1={s2Line.a.y} x2={s2Line.b.x} y2={s2Line.b.y}
        stroke={theme.line} strokeWidth={2} />
      <text x={svgSize.w * 0.92} y={s2Line.a.y - 8} fontSize={10} fill={theme.textSec}>직선 ℓ</text>

      {/* Point */}
      <circle cx={s2Point.x} cy={s2Point.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2} />
      <text x={s2Point.x + 12} y={s2Point.y + 4} fontSize={12} fill={theme.text} fontWeight={700}>P</text>

      {/* Trials */}
      {s2Tries.map((t, i) => (
        <g key={i}>
          <line x1={s2Point.x} y1={s2Point.y} x2={t.target.x} y2={t.target.y}
            stroke={t.isPerp ? PASTEL.coral : `${theme.textSec}60`} strokeWidth={t.isPerp ? 3 : 1.5}
            strokeDasharray={t.isPerp ? "none" : "4 3"} />
          <circle cx={t.target.x} cy={t.target.y} r={4} fill={t.isPerp ? PASTEL.coral : theme.textSec} />
          <text x={(s2Point.x + t.target.x) / 2 + 10} y={(s2Point.y + t.target.y) / 2}
            fontSize={10} fill={t.isPerp ? PASTEL.coral : theme.textSec} fontWeight={t.isPerp ? 700 : 400}>
            {t.dist.toFixed(0)}{t.isPerp ? " ✓" : ""}
          </text>
        </g>
      ))}

      {/* Perpendicular indicator */}
      {s2FoundPerp && (
        <g>
          <rect x={s2Foot.x - 8} y={s2Foot.y - 8} width={8} height={8}
            fill="none" stroke={PASTEL.coral} strokeWidth={1.5} />
          <text x={s2Foot.x + 16} y={s2Foot.y + 4} fontSize={11} fill={PASTEL.coral} fontWeight={700}>
            ⊥ 수직!
          </text>
        </g>
      )}

      {/* Tap hint */}
      {!s2FoundPerp && s2Tries.length < 1 && (
        <text x={cx} y={s2Line.a.y + 30} textAnchor="middle" fontSize={11} fill={theme.textSec}>
          직선 위 아무 곳이나 터치해봐!
        </text>
      )}
      {!s2FoundPerp && s2Tries.length >= 2 && (
        <text x={cx} y={s2Line.a.y + 30} textAnchor="middle" fontSize={11} fill={PASTEL.mint}>
          💡 가장 짧은 거리를 찾아봐!
        </text>
      )}
    </g>
  );

  // ========== Stage 3: Angle bridge ==========
  const renderStage3 = () => (
    <g>
      {/* Rays */}
      <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2} />
      <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2} />
      <circle cx={V.x} cy={V.y} r={5} fill={PASTEL.coral} />
      <text x={V.x - 18} y={V.y + 5} fontSize={12} fill={theme.text} fontWeight={700}>V</text>

      {/* Angle arc */}
      {(() => {
        const r = 40;
        const a1 = Math.atan2(dir1.y, dir1.x), a2 = Math.atan2(dir2.y, dir2.x);
        return <path
          d={`M ${V.x + r * Math.cos(a1)} ${V.y + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${V.x + r * Math.cos(a2)} ${V.y + r * Math.sin(a2)}`}
          fill="none" stroke={PASTEL.yellow} strokeWidth={2.5} />;
      })()}

      {sub >= 1 && (
        <text x={cx + 20} y={svgSize.h * 0.25} fontSize={12} fill={theme.text} textAnchor="middle">
          한 점에서 시작하는 두 반직선이{"\n"}벌어진 정도 = 각
        </text>
      )}
      {sub >= 2 && (
        <text x={cx + 20} y={svgSize.h * 0.38} fontSize={12} fill={PASTEL.mint} textAnchor="middle" fontWeight={700}>
          💡 이 두 반직선에서 "거리"를 쓸 수 있지 않을까?
        </text>
      )}
    </g>
  );

  // ========== Stage 4: Find d₁ = d₂ ==========
  const handleS4Start = (e) => {
    e.preventDefault();
    const pt = getSvgPt(e);
    setS4Point(pt);
    setS4Dragging(true);
    setS4Found(false);
  };
  const handleS4Move = (e) => {
    if (!s4Dragging) return;
    e.preventDefault();
    const pt = getSvgPt(e);
    setS4Point(pt);
    const d1 = distToRay(pt, V, dir1);
    const d2 = distToRay(pt, V, dir2);
    if (Math.abs(d1 - d2) < 6 && d1 > 15) {
      if (!s4Found) { setS4Found(true); playSfx("success"); }
    } else {
      setS4Found(false);
    }
  };
  const handleS4End = () => setS4Dragging(false);

  const renderStage4 = () => {
    const d1 = s4Point ? distToRay(s4Point, V, dir1) : 0;
    const d2 = s4Point ? distToRay(s4Point, V, dir2) : 0;
    const f1 = s4Point ? footOfPerp(s4Point, V, dir1) : null;
    const f2 = s4Point ? footOfPerp(s4Point, V, dir2) : null;

    return (
      <g>
        <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2} />
        <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2} />
        <circle cx={V.x} cy={V.y} r={4} fill={PASTEL.coral} />

        {s4Point && f1 && f2 && (
          <g>
            <line x1={s4Point.x} y1={s4Point.y} x2={f1.x} y2={f1.y}
              stroke={PASTEL.sky} strokeWidth={2} strokeDasharray="4 3" />
            <line x1={s4Point.x} y1={s4Point.y} x2={f2.x} y2={f2.y}
              stroke={PASTEL.mint} strokeWidth={2} strokeDasharray="4 3" />
            <circle cx={f1.x} cy={f1.y} r={3} fill={PASTEL.sky} />
            <circle cx={f2.x} cy={f2.y} r={3} fill={PASTEL.mint} />
            <text x={f1.x - 20} y={f1.y - 8} fontSize={10} fill={PASTEL.sky} fontWeight={700}>
              d₁={d1.toFixed(0)}
            </text>
            <text x={f2.x + 8} y={f2.y - 8} fontSize={10} fill={PASTEL.mint} fontWeight={700}>
              d₂={d2.toFixed(0)}
            </text>
          </g>
        )}

        {s4Point && (
          <circle cx={s4Point.x} cy={s4Point.y} r={10}
            fill={s4Found ? `${PASTEL.coral}40` : `${PASTEL.sky}40`}
            stroke={s4Found ? PASTEL.coral : PASTEL.sky} strokeWidth={2} />
        )}

        {s4Found && s4Point && (
          <text x={s4Point.x} y={s4Point.y - 18} textAnchor="middle"
            fontSize={12} fill={PASTEL.coral} fontWeight={700}>
            d₁ = d₂ !
          </text>
        )}

        {!s4Point && (
          <text x={cx} y={svgSize.h * 0.15} textAnchor="middle" fontSize={12} fill={theme.textSec}>
            각의 내부를 터치하고 드래그해서 d₁ = d₂인 점을 찾아봐!
          </text>
        )}
      </g>
    );
  };

  // ========== Stage 5: Collect equal-distance points ==========
  const handleS5Tap = (e) => {
    if (s5ShowLine || s5Points.length >= 6) return;
    const pt = getSvgPt(e);
    const d1 = distToRay(pt, V, dir1);
    const d2 = distToRay(pt, V, dir2);
    if (Math.abs(d1 - d2) < 10 && d1 > 10) {
      // snap to bisector
      const bLen = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
      const bux = bisDir.x / bLen, buy = bisDir.y / bLen;
      const t = (pt.x - V.x) * bux + (pt.y - V.y) * buy;
      const snapped = { x: V.x + bux * Math.max(20, t), y: V.y + buy * Math.max(20, t) };
      setS5Points(prev => [...prev, snapped]);
      playSfx("success");
      if (s5Points.length >= 3) {
        setTimeout(() => setS5ShowLine(true), 600);
      }
    } else {
      playSfx("error");
      showMsg("d₁ ≠ d₂ — 더 가운데로!", 1200);
    }
  };

  const renderStage5 = () => (
    <g>
      <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2} />
      <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2} />
      <circle cx={V.x} cy={V.y} r={4} fill={PASTEL.coral} />

      {s5Points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={6} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}
          style={{ animation: "fadeIn 0.3s ease" }} />
      ))}

      {s5ShowLine && (() => {
        const bLen = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
        const bux = bisDir.x / bLen, buy = bisDir.y / bLen;
        const end = { x: V.x + bux * rayLen, y: V.y + buy * rayLen };
        return (
          <g>
            <line x1={V.x} y1={V.y} x2={end.x} y2={end.y}
              stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 4"
              style={{ animation: "fadeIn 0.5s ease" }} />
            <text x={cx + 40} y={svgSize.h * 0.2} textAnchor="middle"
              fontSize={13} fill={PASTEL.coral} fontWeight={700}>
              이 점들의 모임 = 각의 이등분선!
            </text>
          </g>
        );
      })()}

      {!s5ShowLine && (
        <text x={cx} y={svgSize.h * 0.12} textAnchor="middle" fontSize={11} fill={theme.textSec}>
          d₁ = d₂인 점을 {Math.max(0, 4 - s5Points.length)}개 더 찾아봐!
        </text>
      )}
    </g>
  );

  // ========== Stage 6: Compass construction ==========
  const renderStage6 = () => {
    const bigR = 80;
    const int1 = { x: V.x + dir1.x * bigR, y: V.y + dir1.y * bigR };
    const int2 = { x: V.x + dir2.x * bigR, y: V.y + dir2.y * bigR };
    const smallR = 50;
    // intersection of small arcs from int1 and int2
    const bLen = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
    const bux = bisDir.x / bLen, buy = bisDir.y / bLen;
    // compute exact intersection point
    const midI = { x: (int1.x + int2.x) / 2, y: (int1.y + int2.y) / 2 };
    const dHalf = dist(int1, int2) / 2;
    const h = Math.sqrt(Math.max(0, smallR * smallR - dHalf * dHalf));
    const perpX = -(int2.y - int1.y) / (2 * dHalf);
    const perpY = (int2.x - int1.x) / (2 * dHalf);
    // pick the intersection inside the angle
    const cand1 = { x: midI.x + perpX * h, y: midI.y + perpY * h };
    const cand2 = { x: midI.x - perpX * h, y: midI.y - perpY * h };
    const crossPt = dist(cand1, V) > dist(cand2, V) ? cand1 : cand2;

    return (
      <g>
        <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2} />
        <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2} />
        <circle cx={V.x} cy={V.y} r={4} fill={PASTEL.coral} />

        {/* Big arc */}
        {s6Phase >= 1 && (
          <g>
            <circle cx={V.x} cy={V.y} r={bigR} fill="none" stroke={`${PASTEL.sky}50`} strokeWidth={1.5} strokeDasharray="4 4" />
            <circle cx={int1.x} cy={int1.y} r={5} fill={PASTEL.sky} />
            <circle cx={int2.x} cy={int2.y} r={5} fill={PASTEL.sky} />
            <text x={V.x + 20} y={V.y - bigR - 8} fontSize={9} fill={PASTEL.sky}>같은 거리 r₁</text>
          </g>
        )}

        {/* Small arcs */}
        {s6Phase >= 2 && (
          <g>
            <circle cx={int1.x} cy={int1.y} r={smallR} fill="none" stroke={`${PASTEL.mint}40`} strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={int2.x} cy={int2.y} r={smallR} fill="none" stroke={`${PASTEL.mint}40`} strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={crossPt.x} cy={crossPt.y} r={6} fill={PASTEL.coral} stroke="#fff" strokeWidth={2} />
            <text x={crossPt.x + 12} y={crossPt.y - 8} fontSize={10} fill={PASTEL.mint}>같은 거리 r₂</text>
          </g>
        )}

        {/* Bisector line */}
        {s6Phase >= 3 && (
          <g>
            <line x1={V.x} y1={V.y} x2={crossPt.x} y2={crossPt.y}
              stroke={PASTEL.coral} strokeWidth={2.5} />
            <text x={cx + 40} y={svgSize.h * 0.15} textAnchor="middle"
              fontSize={12} fill={PASTEL.coral} fontWeight={700}>
              "같은 거리"를 두 번 써서 작도 완성!
            </text>
          </g>
        )}
      </g>
    );
  };

  // ========== Stage 7: Locus discovery — auto-repeat with zoom ==========
  const startS7Anim = () => {
    setS7Phase(1);
    setS7Points([]);
    setS7ArcIdx(0);
    setS7Zoom(1);

    const radii = [40, 55, 70, 85, 100, 120, 140, 165, 190, 220];
    const smallR = 45;
    let idx = 0;

    const bLen = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
    const bux = bisDir.x / bLen, buy = bisDir.y / bLen;

    s7Timer.current = setInterval(() => {
      if (idx >= radii.length) {
        clearInterval(s7Timer.current);
        setTimeout(() => setS7Phase(2), 800);
        return;
      }
      const bigR = radii[idx];
      const int1 = { x: V.x + dir1.x * bigR, y: V.y + dir1.y * bigR };
      const int2 = { x: V.x + dir2.x * bigR, y: V.y + dir2.y * bigR };
      const midI = { x: (int1.x + int2.x) / 2, y: (int1.y + int2.y) / 2 };
      const dHalf = dist(int1, int2) / 2;
      const sr = Math.max(dHalf + 5, smallR);
      const h = Math.sqrt(Math.max(0, sr * sr - dHalf * dHalf));
      const perpX = -(int2.y - int1.y) / (2 * dHalf);
      const perpY = (int2.x - int1.x) / (2 * dHalf);
      const cand1 = { x: midI.x + perpX * h, y: midI.y + perpY * h };
      const cand2 = { x: midI.x - perpX * h, y: midI.y - perpY * h };
      const crossPt = dist(cand1, V) > dist(cand2, V) ? cand1 : cand2;

      setS7Points(prev => [...prev, { pt: crossPt, bigR, int1, int2 }]);
      setS7ArcIdx(idx);

      // Zoom out after 5th point
      if (idx >= 4) {
        setS7Zoom(z => Math.max(0.55, z - 0.06));
      }
      idx++;
    }, 700);
  };

  const renderStage7 = () => {
    const scale = s7Zoom;
    // view origin for zoom
    const ox = V.x * (1 - scale);
    const oy = V.y * (1 - scale);

    return (
      <g transform={`translate(${ox}, ${oy}) scale(${scale})`}>
        <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2 / scale} />
        <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2 / scale} />
        <circle cx={V.x} cy={V.y} r={4 / scale} fill={PASTEL.coral} />

        {/* Ghost arcs — only show latest */}
        {s7Phase === 1 && s7Points.length > 0 && (() => {
          const last = s7Points[s7Points.length - 1];
          return (
            <g opacity={0.35}>
              <circle cx={V.x} cy={V.y} r={last.bigR} fill="none" stroke={PASTEL.sky} strokeWidth={1 / scale} strokeDasharray="3 3" />
              <circle cx={last.int1.x} cy={last.int1.y} r={3 / scale} fill={PASTEL.sky} />
              <circle cx={last.int2.x} cy={last.int2.y} r={3 / scale} fill={PASTEL.sky} />
            </g>
          );
        })()}

        {/* Accumulated points */}
        {s7Points.map((p, i) => (
          <circle key={i} cx={p.pt.x} cy={p.pt.y} r={6 / scale}
            fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5 / scale} />
        ))}

        {/* Final line */}
        {s7Phase === 2 && (() => {
          const bLen2 = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
          const bux2 = bisDir.x / bLen2, buy2 = bisDir.y / bLen2;
          const end = { x: V.x + bux2 * rayLen * 1.5, y: V.y + buy2 * rayLen * 1.5 };
          return (
            <line x1={V.x} y1={V.y} x2={end.x} y2={end.y}
              stroke={PASTEL.coral} strokeWidth={3 / scale}
              style={{ animation: "fadeIn 0.8s ease" }} />
          );
        })()}
      </g>
    );
  };

  // ========== Stage 8: RHS proof ==========
  const proofSteps = [
    { title: "각의 이등분선 위의 점 P", desc: "점 P에서 두 반직선에 수선을 내리면\n수선의 발 F₁, F₂가 생겨" },
    { title: "직각삼각형 두 개!", desc: "△VF₁P와 △VF₂P가 생기는데\n∠VF₁P = ∠VF₂P = 90° (수선이니까)" },
    { title: "RHS 합동 조건 확인", desc: "빗변 VP 공통 (H)\n∠VF₁P = ∠VF₂P = 90° (R)\nVF₁ = VF₂ (이등분선의 작도에서!)" },
    { title: "∴ PF₁ = PF₂", desc: "RHS 합동이니까 대응하는 변 PF₁ = PF₂\n즉, d₁ = d₂ — 두 반직선까지 거리가 같다!" },
    { title: "결론", desc: "각의 이등분선 위의 모든 점에서\n두 변까지의 수직 거리가 같다.\n\n이게 바로 내심으로 가는 열쇠야!\n→ 세 이등분선의 교점 = 세 변까지 거리 같은 점" },
  ];

  const renderStage8 = () => {
    const bLen2 = Math.sqrt(bisDir.x ** 2 + bisDir.y ** 2);
    const bux = bisDir.x / bLen2, buy = bisDir.y / bLen2;
    const P = { x: V.x + bux * 120, y: V.y + buy * 120 };
    const F1 = footOfPerp(P, V, dir1);
    const F2 = footOfPerp(P, V, dir2);

    return (
      <g>
        <line x1={V.x} y1={V.y} x2={R1end.x} y2={R1end.y} stroke={theme.line} strokeWidth={2} />
        <line x1={V.x} y1={V.y} x2={R2end.x} y2={R2end.y} stroke={theme.line} strokeWidth={2} />
        {/* Bisector */}
        <line x1={V.x} y1={V.y} x2={V.x + bux * rayLen} y2={V.y + buy * rayLen}
          stroke={`${PASTEL.coral}50`} strokeWidth={1.5} strokeDasharray="6 4" />
        <circle cx={V.x} cy={V.y} r={4} fill={PASTEL.coral} />

        {/* Point P */}
        {s8Step >= 0 && (
          <circle cx={P.x} cy={P.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2} />
        )}
        {s8Step >= 0 && <text x={P.x + 12} y={P.y - 8} fontSize={11} fill={PASTEL.coral} fontWeight={700}>P</text>}

        {/* Perpendiculars */}
        {s8Step >= 1 && F1 && F2 && (
          <g>
            <line x1={P.x} y1={P.y} x2={F1.x} y2={F1.y} stroke={PASTEL.sky} strokeWidth={2} />
            <line x1={P.x} y1={P.y} x2={F2.x} y2={F2.y} stroke={PASTEL.mint} strokeWidth={2} />
            <circle cx={F1.x} cy={F1.y} r={4} fill={PASTEL.sky} />
            <circle cx={F2.x} cy={F2.y} r={4} fill={PASTEL.mint} />
            <text x={F1.x - 16} y={F1.y + 14} fontSize={9} fill={PASTEL.sky} fontWeight={700}>F₁</text>
            <text x={F2.x + 8} y={F2.y + 14} fontSize={9} fill={PASTEL.mint} fontWeight={700}>F₂</text>
            {/* right angle marks */}
            {[F1, F2].map((f, i) => {
              const d = i === 0 ? dir1 : dir2;
              const dLen = Math.sqrt(d.x * d.x + d.y * d.y);
              const ux = d.x / dLen * 8, uy = d.y / dLen * 8;
              const nx = -(P.y - f.y), ny = (P.x - f.x);
              const nLen = Math.sqrt(nx * nx + ny * ny);
              const px = nx / nLen * 8, py = ny / nLen * 8;
              return <path key={i} d={`M ${f.x + ux} ${f.y + uy} L ${f.x + ux + px} ${f.y + uy + py} L ${f.x + px} ${f.y + py}`}
                fill="none" stroke={i === 0 ? PASTEL.sky : PASTEL.mint} strokeWidth={1.5} />;
            })}
          </g>
        )}

        {/* Triangles highlight */}
        {s8Step >= 2 && F1 && F2 && (
          <g>
            <polygon points={`${V.x},${V.y} ${F1.x},${F1.y} ${P.x},${P.y}`}
              fill={`${PASTEL.sky}18`} stroke={PASTEL.sky} strokeWidth={1.5} />
            <polygon points={`${V.x},${V.y} ${F2.x},${F2.y} ${P.x},${P.y}`}
              fill={`${PASTEL.mint}18`} stroke={PASTEL.mint} strokeWidth={1.5} />
            <line x1={V.x} y1={V.y} x2={P.x} y2={P.y} stroke={PASTEL.coral} strokeWidth={2.5} />
            <text x={(V.x + P.x) / 2 + 12} y={(V.y + P.y) / 2} fontSize={9} fill={PASTEL.coral} fontWeight={700}>VP (공통)</text>
          </g>
        )}

        {/* d₁ = d₂ labels */}
        {s8Step >= 3 && F1 && F2 && (
          <g>
            <text x={(P.x + F1.x) / 2 - 18} y={(P.y + F1.y) / 2 - 4} fontSize={10} fill={PASTEL.sky} fontWeight={700}>d₁</text>
            <text x={(P.x + F2.x) / 2 + 10} y={(P.y + F2.y) / 2 - 4} fontSize={10} fill={PASTEL.mint} fontWeight={700}>d₂</text>
            <text x={P.x} y={P.y - 22} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>
              d₁ = d₂ ✓
            </text>
          </g>
        )}
      </g>
    );
  };

  // ========== INTERACTION HANDLERS ==========
  const handleSvgPointer = (e) => {
    if (stage === 2 && !s2FoundPerp) handleS2Tap(e);
    if (stage === 4) handleS4Start(e);
    if (stage === 5 && !s5ShowLine) handleS5Tap(e);
  };

  // ========== RENDER ==========
  const info = STAGE_INFO[stage - 1];
  const canNext = (
    (stage === 1 && sub >= 2) ||
    (stage === 2 && s2FoundPerp) ||
    (stage === 3 && sub >= 2) ||
    (stage === 4 && s4Found) ||
    (stage === 5 && s5ShowLine) ||
    (stage === 6 && s6Phase >= 3) ||
    (stage === 7 && s7Phase >= 2) ||
    (stage === 8 && s8Step >= proofSteps.length - 1)
  );

  const handleNext = () => {
    // Sub-step progression first
    if (stage === 1 && sub < 2) { setSub(sub + 1); return; }
    if (stage === 3 && sub < 2) { setSub(sub + 1); return; }
    if (stage === 6 && s6Phase < 3) { setS6Phase(s6Phase + 1); return; }
    if (stage === 7 && s7Phase === 0) { startS7Anim(); return; }
    if (stage === 8 && s8Step < proofSteps.length - 1) { setS8Step(s8Step + 1); return; }

    // Move to next stage
    if (stage < 8) {
      playSfx("click");
      setStage(stage + 1);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: theme.bg, overflow: "hidden" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{
        padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${theme.border}`, background: theme.card, flexShrink: 0,
      }}>
        <button onClick={() => setScreen("polygons")} style={{
          background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer",
        }}>← 돌아가기</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{info.title}</div>
          <div style={{ fontSize: 10, color: theme.textSec }}>{info.sub}</div>
        </div>
        <div style={{ fontSize: 10, color: theme.textSec }}>{stage}/8</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: theme.border, flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${(stage / 8) * 100}%`, background: PASTEL.coral, transition: "width 0.5s ease" }} />
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg ref={svgRef} width={svgSize.w} height={svgSize.h}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onPointerDown={handleSvgPointer}
          onPointerMove={stage === 4 ? handleS4Move : undefined}
          onPointerUp={stage === 4 ? handleS4End : undefined}
        >
          <rect width={svgSize.w} height={svgSize.h} fill={theme.svgBg} />
          {stage === 1 && renderStage1()}
          {stage === 2 && renderStage2()}
          {stage === 3 && renderStage3()}
          {stage === 4 && renderStage4()}
          {stage === 5 && renderStage5()}
          {stage === 6 && renderStage6()}
          {stage === 7 && renderStage7()}
          {stage === 8 && renderStage8()}
        </svg>
      </div>

      {/* Bottom panel */}
      <div style={{
        padding: "12px 16px 20px", borderTop: `1px solid ${theme.border}`,
        background: theme.card, flexShrink: 0,
      }}>
        {/* Proof text for stage 8 */}
        {stage === 8 && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, marginBottom: 10,
            background: `${PASTEL.lavender}10`, border: `1px solid ${PASTEL.lavender}30`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PASTEL.lavender, marginBottom: 4 }}>
              {proofSteps[s8Step].title}
            </div>
            <div style={{ fontSize: 12, color: theme.text, lineHeight: 2, whiteSpace: "pre-wrap" }}>
              {proofSteps[s8Step].desc}
            </div>
          </div>
        )}

        {/* Explanation text for other stages */}
        {stage === 1 && sub === 0 && (
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 2, marginBottom: 8 }}>
            두 점 A, B를 연결하는 경로는 무한히 많아. 곡선, 꺾인선, 직선… 어떤 게 가장 짧을까?
          </p>
        )}
        {stage === 1 && sub >= 1 && sub < 2 && (
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 2, marginBottom: 8 }}>
            여러 경로를 비교해보면… 직선이 항상 가장 짧아!
          </p>
        )}
        {stage === 1 && sub >= 2 && (
          <p style={{ fontSize: 12, color: PASTEL.coral, lineHeight: 2, marginBottom: 8, fontWeight: 700 }}>
            ✦ 거리 = 가장 짧은 경로 = 직선의 길이. 이게 출발점이야!
          </p>
        )}
        {stage === 2 && !s2FoundPerp && (
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 2, marginBottom: 8 }}>
            점 P에서 직선 ℓ 위의 여러 점까지 거리를 재볼까? 직선 위를 터치해봐!
          </p>
        )}
        {stage === 2 && s2FoundPerp && (
          <p style={{ fontSize: 12, color: PASTEL.coral, lineHeight: 2, marginBottom: 8, fontWeight: 700 }}>
            ✦ 점에서 직선까지의 거리 = 수직 거리(최단 거리)!
          </p>
        )}
        {stage === 7 && s7Phase === 0 && (
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 2, marginBottom: 8 }}>
            아까 작도한 각의 이등분선을 지웠어. 이번엔 컴퍼스를 다르게 벌려서 10번 반복하면 어떻게 될까?
          </p>
        )}
        {stage === 7 && s7Phase === 2 && (
          <p style={{ fontSize: 12, color: PASTEL.coral, lineHeight: 2, marginBottom: 8, fontWeight: 700 }}>
            ✦ 컴퍼스를 아무리 다르게 벌려도, 교점은 항상 같은 직선 위! 이 점들의 자취 = 각의 이등분선
          </p>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 8 }}>
          {stage > 1 && (
            <button onClick={() => { setStage(stage - 1); playSfx("click"); }} style={{
              padding: "12px 16px", borderRadius: 12, border: `1px solid ${theme.border}`,
              background: theme.card, color: theme.textSec, fontSize: 12, cursor: "pointer", flexShrink: 0,
            }}>← 이전</button>
          )}
          <button onClick={handleNext} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "none",
            background: canNext ? `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})` : `${theme.textSec}20`,
            color: canNext ? "#fff" : theme.textSec,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "all 0.3s",
          }}>
            {stage === 8 && s8Step >= proofSteps.length - 1
              ? "완료! 🎉"
              : stage === 7 && s7Phase === 0
                ? "▶ 자동 작도 시작"
                : stage === 6 && s6Phase < 3
                  ? "다음 단계 →"
                  : stage === 8
                    ? "다음 →"
                    : canNext ? "다음 →" : "진행해봐!"}
          </button>
        </div>

        {/* Stage dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
          {STAGE_INFO.map((_, i) => (
            <div key={i} style={{
              width: i === stage - 1 ? 16 : 6, height: 6, borderRadius: 3,
              background: i < stage ? PASTEL.coral : i === stage - 1 ? PASTEL.coral : `${theme.textSec}30`,
              transition: "all 0.3s",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
