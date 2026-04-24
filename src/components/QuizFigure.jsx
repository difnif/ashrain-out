// QuizFigure.jsx — 퀴즈 전용 도형 SVG 프리셋
// 담당: 퀴즈 채팅방 전담
//
// 설계 원칙:
//   - 모든 외심/내심/반지름은 삼각형 좌표로부터 수학 공식으로 계산
//   - 뷰박스 260 × 170, 여백 고려하여 설계
//   - theme.text 색상을 stroke로 사용

// ═══════════════════════════════════════════════════════════════
// ── 수학 유틸 ──
// ═══════════════════════════════════════════════════════════════

function dist(P, Q) {
  const dx = P[0] - Q[0], dy = P[1] - Q[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// 외심: 세 꼭짓점으로부터 같은 거리에 있는 점
function circumcenter(A, B, C) {
  const [ax, ay] = A, [bx, by] = B, [cx, cy] = C;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  return [ux, uy];
}

// 내심: 무게 있는 평균 (무게 = 반대변 길이)
function incenter(A, B, C) {
  const a = dist(B, C), b = dist(C, A), c = dist(A, B);
  const s = a + b + c;
  return [(a * A[0] + b * B[0] + c * C[0]) / s, (a * A[1] + b * B[1] + c * C[1]) / s];
}

// 내접원 반지름
function inradius(A, B, C) {
  const a = dist(B, C), b = dist(C, A), c = dist(A, B);
  const area = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1])) / 2;
  return (2 * area) / (a + b + c);
}

// 점에서 직선 AB 위로의 수선의 발
function footOnLine(P, A, B) {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const t = ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / (dx * dx + dy * dy);
  return [A[0] + t * dx, A[1] + t * dy];
}

// ═══════════════════════════════════════════════════════════════
// ── 공통 컴포넌트 ──
// ═══════════════════════════════════════════════════════════════

function Label({ x, y, children, color = "#333", size = 11, weight = 600 }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color}
      textAnchor="middle" dominantBaseline="middle"
      style={{ fontFamily: "'Noto Serif KR', serif" }}>
      {children}
    </text>
  );
}

// 직각 표시 (꼭짓점 P 기준, 두 변이 수평/수직일 때)
function RightAngleMark({ P, dx = 8, dy = -8, stroke }) {
  return (
    <polyline
      points={`${P[0] + dx},${P[1]} ${P[0] + dx},${P[1] + dy} ${P[0]},${P[1] + dy}`}
      fill="none" stroke={stroke} strokeWidth={1} />
  );
}

// 각 호 표시 (꼭짓점 V에서 두 방향으로 반지름 r인 호)
function AngleArc({ V, P1, P2, r = 14, stroke, strokeWidth = 1.2, dashed = false }) {
  const d1 = [P1[0] - V[0], P1[1] - V[1]];
  const d2 = [P2[0] - V[0], P2[1] - V[1]];
  const n1 = Math.hypot(...d1), n2 = Math.hypot(...d2);
  const u1 = [d1[0] / n1, d1[1] / n1];
  const u2 = [d2[0] / n2, d2[1] / n2];
  const S = [V[0] + u1[0] * r, V[1] + u1[1] * r];
  const E = [V[0] + u2[0] * r, V[1] + u2[1] * r];
  const cross = u1[0] * u2[1] - u1[1] * u2[0];
  const sweep = cross > 0 ? 1 : 0;
  return (
    <path d={`M ${S[0]} ${S[1]} A ${r} ${r} 0 0 ${sweep} ${E[0]} ${E[1]}`}
      fill="none" stroke={stroke} strokeWidth={strokeWidth}
      strokeDasharray={dashed ? "2,2" : undefined} />
  );
}

// 변 위 중점에 tick 표시 (변의 같음을 나타냄)
function SideTick({ P1, P2, count = 1, color, size = 4 }) {
  const mx = (P1[0] + P2[0]) / 2, my = (P1[1] + P2[1]) / 2;
  const dx = P2[0] - P1[0], dy = P2[1] - P1[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const tx = dx / len, ty = dy / len;
  const marks = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 4;
    const cx = mx + tx * off;
    const cy = my + ty * off;
    marks.push(
      <line key={i}
        x1={cx - nx * size} y1={cy - ny * size}
        x2={cx + nx * size} y2={cy + ny * size}
        stroke={color} strokeWidth={1.5} />
    );
  }
  return <>{marks}</>;
}

// ═══════════════════════════════════════════════════════════════
// ── 1. 외심 — 예각삼각형 ──
// ═══════════════════════════════════════════════════════════════
function CircumAcute({ stroke, fill, accent }) {
  const A = [130, 30], B = [50, 135], C = [215, 135];
  const O = circumcenter(A, B, C);
  const R = dist(A, O);
  return (
    <>
      <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={accent}
        strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      {[A, B, C].map((P, i) => (
        <line key={i} x1={O[0]} y1={O[1]} x2={P[0]} y2={P[1]}
          stroke={accent} strokeWidth={1} strokeDasharray="2,2" opacity={0.7} />
      ))}
      <circle cx={O[0]} cy={O[1]} r={2.5} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={O[0] + 10} y={O[1] + 2} color={accent}>O</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 2. 외심 — 직각삼각형 (빗변 중점) ──
// ═══════════════════════════════════════════════════════════════
function CircumRight({ stroke, fill, accent }) {
  const A = [60, 30], B = [60, 140], C = [220, 140];
  const O = circumcenter(A, B, C);
  const R = dist(A, O);
  return (
    <>
      <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={accent}
        strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <RightAngleMark P={B} stroke={stroke} />
      <line x1={O[0]} y1={O[1]} x2={B[0]} y2={B[1]}
        stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <circle cx={O[0]} cy={O[1]} r={2.5} fill={accent} />
      <Label x={A[0] - 10} y={A[1]} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={O[0] + 8} y={O[1] - 8} color={accent}>O</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 3. 외심 — 둔각삼각형 (외부) ──
// ═══════════════════════════════════════════════════════════════
function CircumObtuse({ stroke, fill, accent }) {
  const A = [130, 40], B = [55, 100], C = [205, 100];
  const O = circumcenter(A, B, C);
  const R = dist(A, O);
  return (
    <>
      <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={accent}
        strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <circle cx={O[0]} cy={O[1]} r={2.5} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1]} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1]} color={stroke}>C</Label>
      <Label x={O[0] + 10} y={O[1] + 2} color={accent}>O</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 4. 내심 + 내접원 ──
// ═══════════════════════════════════════════════════════════════
function Incircle({ stroke, fill, accent }) {
  const A = [130, 30], B = [45, 140], C = [215, 140];
  const I = incenter(A, B, C);
  const r = inradius(A, B, C);
  const footBC = [I[0], C[1]];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <circle cx={I[0]} cy={I[1]} r={r} fill={accent} fillOpacity={0.1}
        stroke={accent} strokeWidth={1.2} />
      <line x1={I[0]} y1={I[1]} x2={footBC[0]} y2={footBC[1]}
        stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <Label x={I[0] + 12} y={(I[1] + footBC[1]) / 2 + 2} color={accent} size={10}>r</Label>
      <circle cx={I[0]} cy={I[1]} r={2} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={I[0] - 10} y={I[1]} color={accent}>I</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 5. 이등변삼각형 ──
// ═══════════════════════════════════════════════════════════════
function Isosceles({ stroke, fill, accent }) {
  const A = [130, 25], B = [55, 140], C = [205, 140];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <SideTick P1={A} P2={B} count={1} color={accent} />
      <SideTick P1={A} P2={C} count={1} color={accent} />
      <AngleArc V={B} P1={A} P2={C} r={16} stroke={accent} />
      <AngleArc V={C} P1={A} P2={B} r={16} stroke={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 6. 일반 직각삼각형 ──
// ═══════════════════════════════════════════════════════════════
function RightTriangle({ stroke, fill, accent }) {
  const A = [50, 30], B = [50, 140], C = [220, 140];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <RightAngleMark P={B} stroke={stroke} />
      <Label x={A[0] - 10} y={A[1]} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={(A[0] + C[0]) / 2 + 15} y={(A[1] + C[1]) / 2 - 10}
        color={accent} size={10}>빗변</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 7. 외각 정리 ──
// ═══════════════════════════════════════════════════════════════
function ExteriorAngle({ stroke, fill, accent }) {
  const A = [130, 35], B = [60, 130], C = [200, 130];
  const Cext = [250, 130];
  return (
    <>
      <line x1={B[0]} y1={B[1]} x2={Cext[0]} y2={Cext[1]}
        stroke={stroke} strokeWidth={1} opacity={0.4} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.12}
        stroke={stroke} strokeWidth={1.5} />
      <AngleArc V={C} P1={A} P2={Cext} r={16} stroke={accent} strokeWidth={1.5} />
      <Label x={C[0] + 28} y={C[1] - 12} color={accent} size={10}>외각</Label>
      <AngleArc V={A} P1={B} P2={C} r={14} stroke={accent} />
      <AngleArc V={B} P1={A} P2={C} r={14} stroke={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0]} y={C[1] + 12} color={stroke}>C</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 8. 내심 + BC 평행선 DE ──
// ═══════════════════════════════════════════════════════════════
function IncircleParallel({ stroke, fill, accent }) {
  const A = [130, 30], B = [45, 140], C = [215, 140];
  const I = incenter(A, B, C);
  const t = (I[1] - A[1]) / (B[1] - A[1]);
  const D = [A[0] + (B[0] - A[0]) * t, I[1]];
  const E = [A[0] + (C[0] - A[0]) * t, I[1]];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.08}
        stroke={stroke} strokeWidth={1.5} />
      <line x1={B[0]} y1={B[1]} x2={I[0]} y2={I[1]}
        stroke={accent} strokeWidth={1} strokeDasharray="3,2" opacity={0.55} />
      <line x1={C[0]} y1={C[1]} x2={I[0]} y2={I[1]}
        stroke={accent} strokeWidth={1} strokeDasharray="3,2" opacity={0.55} />
      <line x1={D[0]} y1={D[1]} x2={E[0]} y2={E[1]}
        stroke={accent} strokeWidth={2} />
      <polygon points={`${A} ${D} ${E}`} fill={accent} fillOpacity={0.2} stroke="none" />
      <text x={(D[0] + E[0]) / 2} y={D[1] - 4} fontSize={10}
        fill={accent} textAnchor="middle" fontWeight={700}>∥</text>
      <text x={(B[0] + C[0]) / 2} y={B[1] - 4} fontSize={10}
        fill={accent} textAnchor="middle" fontWeight={700}>∥</text>
      <circle cx={I[0]} cy={I[1]} r={2.5} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={D[0] - 10} y={D[1] - 4} color={accent}>D</Label>
      <Label x={E[0] + 10} y={E[1] - 4} color={accent}>E</Label>
      <Label x={I[0] + 8} y={I[1] + 10} color={accent} size={10}>I</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 9. 직각삼각형 + 내접원 — 비례 팩토리 ──
// ═══════════════════════════════════════════════════════════════
function makeRightIncircle(a, b, c) {
  return function RightIncircleFigure({ stroke, fill, accent }) {
    const pad = 30;
    const W = 260 - pad * 2;
    const H = 170 - pad * 2;
    const scale = Math.min(W / a, H / b);
    const pxB = b * scale;
    const originX = pad;
    const originY = pad + pxB;
    const toPx = (x, y) => [originX + x * scale, originY - y * scale];

    const B = toPx(0, 0);
    const A = toPx(0, b);
    const C = toPx(a, 0);

    const r = (a + b - c) / 2;
    const I = toPx(r, r);
    const P = toPx(0, r);
    const Q = toPx(r, 0);
    const R = footOnLine(I, A, C);
    const rPx = r * scale;

    return (
      <>
        <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
          stroke={stroke} strokeWidth={1.5} />
        <RightAngleMark P={B} stroke={stroke} />
        <circle cx={I[0]} cy={I[1]} r={rPx} fill={accent} fillOpacity={0.1}
          stroke={accent} strokeWidth={1.2} />
        <circle cx={I[0]} cy={I[1]} r={2} fill={accent} />
        <line x1={I[0]} y1={I[1]} x2={P[0]} y2={P[1]}
          stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
        <line x1={I[0]} y1={I[1]} x2={Q[0]} y2={Q[1]}
          stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
        <circle cx={P[0]} cy={P[1]} r={2} fill={accent} />
        <circle cx={Q[0]} cy={Q[1]} r={2} fill={accent} />
        <circle cx={R[0]} cy={R[1]} r={2} fill={accent} />
        <Label x={A[0] - 10} y={A[1]} color={stroke}>A</Label>
        <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
        <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
        <Label x={P[0] - 10} y={P[1]} color={accent} size={10}>P</Label>
        <Label x={Q[0]} y={Q[1] + 10} color={accent} size={10}>Q</Label>
        <Label x={R[0] + 10} y={R[1] - 3} color={accent} size={10}>R</Label>
        <Label x={I[0] + 8} y={I[1] - 6} color={accent} size={10}>I</Label>
      </>
    );
  };
}

// ═══════════════════════════════════════════════════════════════
// ── 10. 이등변 + 내부 보조선 (외각 연쇄) ──
// ═══════════════════════════════════════════════════════════════
function StarIsosceles({ stroke, fill, accent }) {
  const A = [130, 25], B = [55, 145], C = [205, 145];
  const D = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const E = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      <line x1={B[0]} y1={B[1]} x2={E[0]} y2={E[1]}
        stroke={accent} strokeWidth={1.2} opacity={0.7} />
      <SideTick P1={A} P2={B} count={1} color={accent} />
      <SideTick P1={A} P2={C} count={1} color={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={D[0] - 10} y={D[1]} color={accent}>D</Label>
      <Label x={E[0] + 10} y={E[1]} color={accent}>E</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 10a. 이등변 AB=AC + AC 위 점 D (BD=BC 조건) ──
// b9, b10 전용: D는 AC 위, BD 선분, BD=BC 틱 강조
// 옵션: showAngleABisect (BD가 ∠B 이등분선)
// 옵션: angleALabel (∠A 값을 A 옆에 표시)
// ═══════════════════════════════════════════════════════════════
function makeIsoWithD_onAC_BDeqBC({ showAngleBisect = false, angleALabel = null }) {
  return function IsoBDeqBCFigure({ stroke, fill, accent }) {
    const A = [130, 20], B = [80, 150], C = [180, 150];
    // D: AC 위, BD=BC 되는 점 (수학 계산: t ≈ 0.485)
    const t = 0.485;
    const D = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t];
    return (
      <>
        {/* 큰 삼각형 */}
        <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
          stroke={stroke} strokeWidth={1.5} />
        {/* BD 선분 (보조선) */}
        <line x1={B[0]} y1={B[1]} x2={D[0]} y2={D[1]}
          stroke={accent} strokeWidth={1.3} />
        {/* AB=AC 틱 (빨강, 한 개씩) */}
        <SideTick P1={A} P2={B} count={1} color={accent} />
        <SideTick P1={A} P2={C} count={1} color={accent} />
        {/* BD=BC 틱 (보라, 다른 색으로 구분) */}
        <SideTick P1={B} P2={D} count={2} color="#8B5CF6" />
        <SideTick P1={B} P2={C} count={2} color="#8B5CF6" />
        {/* ∠B 이등분선 표시 (옵션): BD가 이등분이면 ∠ABD와 ∠DBC 양쪽에 작은 호 */}
        {showAngleBisect && (
          <>
            <AngleArc V={B} P1={A} P2={D} r={20} stroke="#10B981" strokeWidth={1.2} />
            <AngleArc V={B} P1={D} P2={C} r={20} stroke="#10B981" strokeWidth={1.2} />
          </>
        )}
        {/* ∠A 값 표시 (옵션) */}
        {angleALabel && (
          <>
            <AngleArc V={A} P1={B} P2={C} r={14} stroke={accent} />
            <text x={A[0]} y={A[1] + 22} fontSize={10} fill={accent}
              fontWeight={700} textAnchor="middle">{angleALabel}</text>
          </>
        )}
        {/* 라벨 */}
        <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
        <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
        <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
        <Label x={D[0] + 10} y={D[1] - 4} color={accent}>D</Label>
      </>
    );
  };
}

// ═══════════════════════════════════════════════════════════════
// ── 10b. 이등변 AB=AC + BC 위 D + AC 위 E (AD=AE, ∠DAE 표시) ──
// b11 전용
// ═══════════════════════════════════════════════════════════════
function IsoD_onBC_E_onAC_ADeqAE({ stroke, fill, accent }) {
  const A = [130, 20], B = [80, 150], C = [180, 150];
  // D는 BC 중점(대략), E는 AC 위에서 AE=AD 되는 점 (계산: u ≈ 0.933)
  const D = [130, 150];
  const u = 0.933;
  const E = [A[0] + (C[0] - A[0]) * u, A[1] + (C[1] - A[1]) * u];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      {/* AD, AE, DE 선분 */}
      <line x1={A[0]} y1={A[1]} x2={D[0]} y2={D[1]}
        stroke={accent} strokeWidth={1.3} />
      <line x1={A[0]} y1={A[1]} x2={E[0]} y2={E[1]}
        stroke={accent} strokeWidth={1.3} />
      <line x1={D[0]} y1={D[1]} x2={E[0]} y2={E[1]}
        stroke={accent} strokeWidth={1.3} />
      {/* △ADE 강조 */}
      <polygon points={`${A} ${D} ${E}`} fill={accent} fillOpacity={0.15} stroke="none" />
      {/* AB=AC 틱 */}
      <SideTick P1={A} P2={B} count={1} color={accent} />
      <SideTick P1={A} P2={C} count={1} color={accent} />
      {/* AD=AE 틱 (보라) */}
      <SideTick P1={A} P2={D} count={2} color="#8B5CF6" />
      <SideTick P1={A} P2={E} count={2} color="#8B5CF6" />
      {/* ∠DAE 호 */}
      <AngleArc V={A} P1={D} P2={E} r={14} stroke="#10B981" strokeWidth={1.3} />
      {/* 라벨 */}
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={D[0]} y={D[1] + 12} color={accent}>D</Label>
      <Label x={E[0] + 10} y={E[1] - 4} color={accent}>E</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 10c. 이등변 AB=AC + AC 위 D (AD=BD 조건) ──
// b12 전용
// ═══════════════════════════════════════════════════════════════
function IsoD_onAC_ADeqBD({ stroke, fill, accent }) {
  const A = [130, 20], B = [80, 150], C = [180, 150];
  // D: AC 위, AD=BD 되는 점 (수학 계산: t ≈ 0.674)
  const t = 0.674;
  const D = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      {/* BD 보조선 */}
      <line x1={B[0]} y1={B[1]} x2={D[0]} y2={D[1]}
        stroke={accent} strokeWidth={1.3} />
      {/* AB=AC 틱 (빨강) */}
      <SideTick P1={A} P2={B} count={1} color={accent} />
      <SideTick P1={A} P2={C} count={1} color={accent} />
      {/* AD=BD 틱 (보라) */}
      <SideTick P1={A} P2={D} count={2} color="#8B5CF6" />
      <SideTick P1={B} P2={D} count={2} color="#8B5CF6" />
      {/* ∠A 호 + 라벨 */}
      <AngleArc V={A} P1={B} P2={C} r={14} stroke="#10B981" strokeWidth={1.2} />
      {/* 라벨 */}
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={D[0] + 10} y={D[1] - 4} color={accent}>D</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 11. 직각삼각형 쌍 (합동 비교) ──
// ═══════════════════════════════════════════════════════════════
function RightPair({ stroke, fill, accent, ticks = [], arcs = [], rightAngles = [] }) {
  const A1 = [45, 30], B1 = [45, 140], C1 = [120, 140];
  const D1 = [160, 30], E1 = [160, 140], F1 = [235, 140];
  const SIDES = {
    AB: [A1, B1], BC: [B1, C1], AC: [A1, C1],
    DE: [D1, E1], EF: [E1, F1], DF: [D1, F1],
  };
  const CORNERS = { A: A1, B: B1, C: C1, D: D1, E: E1, F: F1 };
  return (
    <>
      <polygon points={`${A1} ${B1} ${C1}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      <polygon points={`${D1} ${E1} ${F1}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      {rightAngles.map(c => <RightAngleMark key={c} P={CORNERS[c]} stroke={stroke} />)}
      {ticks.map((t, i) => {
        const [P1, P2] = SIDES[t.side] || [];
        if (!P1) return null;
        const color = t.count === 1 ? accent : "#8B5CF6";
        return <SideTick key={i} P1={P1} P2={P2} count={t.count} color={color} />;
      })}
      {arcs.map((c, i) => {
        const p = CORNERS[c]; if (!p) return null;
        return (
          <circle key={`arc-${i}`} cx={p[0]} cy={p[1]} r={10}
            fill="none" stroke={accent} strokeWidth={1.2}
            strokeDasharray="2,2" opacity={0.7} />
        );
      })}
      <Label x={A1[0] - 10} y={A1[1]} color={stroke}>A</Label>
      <Label x={B1[0] - 10} y={B1[1] + 6} color={stroke}>B</Label>
      <Label x={C1[0] + 10} y={C1[1] + 6} color={stroke}>C</Label>
      <Label x={D1[0] - 10} y={D1[1]} color={stroke}>D</Label>
      <Label x={E1[0] - 10} y={E1[1] + 6} color={stroke}>E</Label>
      <Label x={F1[0] + 10} y={F1[1] + 6} color={stroke}>F</Label>
    </>
  );
}

const RightPairTwoSidesSame = (p) => RightPair({ ...p,
  ticks: [{ side: "BC", count: 1 }, { side: "EF", count: 1 },
          { side: "AC", count: 2 }, { side: "DF", count: 2 }],
  rightAngles: ["B", "E"] });

const RightPairHypAndAngle = (p) => RightPair({ ...p,
  ticks: [{ side: "AC", count: 1 }, { side: "DF", count: 1 }],
  arcs: ["A", "D"], rightAngles: ["B", "E"] });

const RightPairTwoLegs = (p) => RightPair({ ...p,
  ticks: [{ side: "BC", count: 1 }, { side: "EF", count: 1 },
          { side: "AB", count: 2 }, { side: "DE", count: 2 }],
  rightAngles: ["B", "E"] });

const RightPairNeedHyp = (p) => RightPair({ ...p,
  ticks: [{ side: "BC", count: 1 }, { side: "EF", count: 1 }],
  rightAngles: ["B", "E"] });

// ═══════════════════════════════════════════════════════════════
// ── [신규 12] 일반 삼각형 + 세 내각 호 ──
// ═══════════════════════════════════════════════════════════════
function TriangleAngles({ stroke, fill, accent }) {
  const A = [130, 35], B = [50, 135], C = [215, 135];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1}
        stroke={stroke} strokeWidth={1.5} />
      <AngleArc V={A} P1={B} P2={C} r={14} stroke={accent} />
      <AngleArc V={B} P1={C} P2={A} r={14} stroke={accent} />
      <AngleArc V={C} P1={A} P2={B} r={14} stroke={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 13] 평행선 + 가로지르는 직선 (동위각/엇각) ──
// ═══════════════════════════════════════════════════════════════
function ParallelCut({ stroke, fill, accent }) {
  const y1 = 55, y2 = 125;
  const x1 = 20, x2 = 240;
  const T1 = [60, 30], T2 = [200, 150];
  function intersect(y) {
    const t = (y - T1[1]) / (T2[1] - T1[1]);
    return [T1[0] + t * (T2[0] - T1[0]), y];
  }
  const P = intersect(y1);
  const Q = intersect(y2);
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={stroke} strokeWidth={1.5} />
      <line x1={x1} y1={y2} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.5} />
      <line x1={T1[0]} y1={T1[1]} x2={T2[0]} y2={T2[1]}
        stroke={stroke} strokeWidth={1.5} />
      <text x={x2 - 15} y={y1 - 6} fontSize={12} fill={accent} fontWeight={700}>▶</text>
      <text x={x2 - 15} y={y2 - 6} fontSize={12} fill={accent} fontWeight={700}>▶</text>
      <circle cx={P[0]} cy={P[1]} r={2} fill={accent} />
      <circle cx={Q[0]} cy={Q[1]} r={2} fill={accent} />
      <AngleArc V={P} P1={[P[0] + 40, P[1]]} P2={T2} r={12} stroke={accent} />
      <AngleArc V={Q} P1={[Q[0] + 40, Q[1]]} P2={T2} r={12} stroke={accent} />
      <Label x={x1 - 10} y={y1} color={stroke}>ℓ</Label>
      <Label x={x1 - 10} y={y2} color={stroke}>m</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 14] 평행선 꺾은 점 (ℓ∥m 사이 Z) ──
// ═══════════════════════════════════════════════════════════════
function ParallelZigzag({ stroke, fill, accent }) {
  const y1 = 50, y2 = 140;
  const x1 = 25, x2 = 235;
  const P = [155, 95];
  const Lp = [70, y1];
  const Mp = [130, y2];
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={stroke} strokeWidth={1.5} />
      <line x1={x1} y1={y2} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.5} />
      <text x={x2 - 15} y={y1 - 6} fontSize={12} fill={accent} fontWeight={700}>▶</text>
      <text x={x2 - 15} y={y2 - 6} fontSize={12} fill={accent} fontWeight={700}>▶</text>
      <line x1={Lp[0]} y1={Lp[1]} x2={P[0]} y2={P[1]} stroke={stroke} strokeWidth={1.5} />
      <line x1={P[0]} y1={P[1]} x2={Mp[0]} y2={Mp[1]} stroke={stroke} strokeWidth={1.5} />
      <AngleArc V={P} P1={Lp} P2={Mp} r={14} stroke={accent} strokeWidth={1.5} />
      <AngleArc V={Lp} P1={[Lp[0] + 40, y1]} P2={P} r={12} stroke={accent} />
      <AngleArc V={Mp} P1={[Mp[0] + 40, y2]} P2={P} r={12} stroke={accent} />
      <circle cx={P[0]} cy={P[1]} r={2.5} fill={accent} />
      <Label x={x1 - 10} y={y1} color={stroke}>ℓ</Label>
      <Label x={x1 - 10} y={y2} color={stroke}>m</Label>
      <Label x={P[0] + 10} y={P[1] + 2} color={accent}>P</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 15] 정육각형 ──
// ═══════════════════════════════════════════════════════════════
function PolygonHexagon({ stroke, fill, accent }) {
  const cx = 130, cy = 85, R = 55;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const theta = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push([cx + R * Math.cos(theta), cy + R * Math.sin(theta)]);
  }
  return (
    <>
      <polygon points={pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
        fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.5} />
      <AngleArc V={pts[1]} P1={pts[0]} P2={pts[2]} r={14} stroke={accent} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 16] 정오각형 ──
// ═══════════════════════════════════════════════════════════════
function PolygonPentagon({ stroke, fill, accent }) {
  const cx = 130, cy = 90, R = 55;
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const theta = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push([cx + R * Math.cos(theta), cy + R * Math.sin(theta)]);
  }
  return (
    <>
      <polygon points={pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
        fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.5} />
      <AngleArc V={pts[0]} P1={pts[4]} P2={pts[1]} r={14} stroke={accent} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 17] 각 이등분선 ──
// ═══════════════════════════════════════════════════════════════
function AngleBisector({ stroke, fill, accent }) {
  const V = [60, 90];
  const L1 = [230, 40];
  const L2 = [230, 140];
  const d1 = [L1[0] - V[0], L1[1] - V[1]];
  const d2 = [L2[0] - V[0], L2[1] - V[1]];
  const n1 = Math.hypot(...d1), n2 = Math.hypot(...d2);
  const mid = [d1[0] / n1 + d2[0] / n2, d1[1] / n1 + d2[1] / n2];
  const mn = Math.hypot(...mid);
  const B = [V[0] + (mid[0] / mn) * 170, V[1] + (mid[1] / mn) * 170];
  return (
    <>
      <line x1={V[0]} y1={V[1]} x2={L1[0]} y2={L1[1]}
        stroke={stroke} strokeWidth={1.5} />
      <line x1={V[0]} y1={V[1]} x2={L2[0]} y2={L2[1]}
        stroke={stroke} strokeWidth={1.5} />
      <line x1={V[0]} y1={V[1]} x2={B[0]} y2={B[1]}
        stroke={accent} strokeWidth={1.5} strokeDasharray="4,2" />
      <AngleArc V={V} P1={L1} P2={B} r={22} stroke={accent} strokeWidth={1.2} />
      <AngleArc V={V} P1={B} P2={L2} r={22} stroke={accent} strokeWidth={1.2} />
      <AngleArc V={V} P1={L1} P2={B} r={28} stroke={accent} strokeWidth={1.2} />
      <AngleArc V={V} P1={B} P2={L2} r={28} stroke={accent} strokeWidth={1.2} />
      <Label x={V[0] - 8} y={V[1]} color={stroke}>O</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── [신규 18] 수직이등분선 ──
// ═══════════════════════════════════════════════════════════════
function PerpendicularBisector({ stroke, fill, accent }) {
  const A = [50, 130], B = [220, 130];
  const M = [(A[0] + B[0]) / 2, A[1]];
  const perpLen = 70;
  const top = [M[0], M[1] - perpLen];
  const bot = [M[0], M[1] + 10];
  return (
    <>
      <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]}
        stroke={stroke} strokeWidth={1.5} />
      <line x1={top[0]} y1={top[1]} x2={bot[0]} y2={bot[1]}
        stroke={accent} strokeWidth={1.5} strokeDasharray="4,2" />
      <SideTick P1={A} P2={M} count={1} color={accent} />
      <SideTick P1={M} P2={B} count={1} color={accent} />
      <polyline points={`${M[0] + 8},${M[1]} ${M[0] + 8},${M[1] - 8} ${M[0]},${M[1] - 8}`}
        fill="none" stroke={stroke} strokeWidth={1} />
      <circle cx={M[0]} cy={M[1]} r={2} fill={accent} />
      <Label x={A[0] - 10} y={A[1] + 6} color={stroke}>A</Label>
      <Label x={B[0] + 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={M[0] - 10} y={M[1] + 12} color={accent} size={10}>M</Label>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── REGISTRY ──
// ═══════════════════════════════════════════════════════════════
const REGISTRY = {
  "circum-acute": CircumAcute,
  "circum-right": CircumRight,
  "circum-obtuse": CircumObtuse,
  "incircle": Incircle,
  "incircle-parallel": IncircleParallel,
  "isosceles": Isosceles,
  "right-triangle": RightTriangle,
  "exterior-angle": ExteriorAngle,
  "right-incircle-3-4-5": makeRightIncircle(3, 4, 5),
  "right-incircle-5-12-13": makeRightIncircle(5, 12, 13),
  "right-incircle-6-8-10": makeRightIncircle(6, 8, 10),
  "right-incircle-8-15-17": makeRightIncircle(8, 15, 17),
  "right-incircle-tangent": makeRightIncircle(5, 12, 13),
  "star-isosceles": StarIsosceles,
  // 외각+이등변 연쇄 전용 (b9~b12)
  "iso-bd-eq-bc": makeIsoWithD_onAC_BDeqBC({}),
  "iso-bd-eq-bc-bisect": makeIsoWithD_onAC_BDeqBC({ showAngleBisect: true }),
  "iso-bd-eq-bc-a20": makeIsoWithD_onAC_BDeqBC({ angleALabel: "∠A=20°" }),
  "iso-de-adeqae": IsoD_onBC_E_onAC_ADeqAE,
  "iso-ad-eq-bd": IsoD_onAC_ADeqBD,
  "right-pair-rhs": RightPairTwoSidesSame,
  "right-pair-rha": RightPairHypAndAngle,
  "right-pair-two-legs": RightPairTwoLegs,
  "right-pair-need-hyp": RightPairNeedHyp,
  // 신규 7종
  "triangle-angles": TriangleAngles,
  "parallel-cut": ParallelCut,
  "parallel-zigzag": ParallelZigzag,
  "polygon-hexagon": PolygonHexagon,
  "polygon-pentagon": PolygonPentagon,
  "angle-bisector": AngleBisector,
  "perpendicular-bisector": PerpendicularBisector,
};

export default function QuizFigure({ name, theme }) {
  const Shape = REGISTRY[name];
  if (!Shape) return null;
  const stroke = theme?.text || "#333";
  const fill = theme?.text || "#333";
  const accent = "#D95F4B";
  return (
    <div style={{
      display: "flex", justifyContent: "center",
      marginTop: 12, marginBottom: 4,
    }}>
      <svg viewBox="0 0 260 170" width="220" height="143"
        style={{ maxWidth: "100%" }}>
        <Shape stroke={stroke} fill={fill} accent={accent} />
      </svg>
    </div>
  );
}
