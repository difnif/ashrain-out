// QuizFigure.jsx — 퀴즈 전용 도형 SVG 프리셋
// 담당: 퀴즈 채팅방 전담
//
// 사용법: problem.figure = "circum-right" | "circum-acute" | "circum-obtuse" |
//                         "incircle" | "isosceles" | "right-triangle" |
//                         "exterior-angle"
//
// 각 프리셋은 260×160 viewBox 기준, 색상 prop으로 테마 대응

function Label({ x, y, children, color = "#333", size = 11, weight = 600 }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={color}
      textAnchor="middle" dominantBaseline="middle"
      style={{ fontFamily: "'Noto Serif KR', serif" }}>
      {children}
    </text>
  );
}

// ─── 1. 예각삼각형 + 외심(내부) ──────────────────
function CircumAcute({ stroke, fill, accent }) {
  // 삼각형 ABC
  const A = [130, 30], B = [40, 130], C = [220, 130];
  // 외심 O (근사값 — 세 꼭짓점에서 같은 거리)
  const O = [130, 95];
  const R = 65;
  return (
    <>
      <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={accent} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      {/* 외심에서 꼭짓점까지 반지름 */}
      <line x1={O[0]} y1={O[1]} x2={A[0]} y2={A[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <line x1={O[0]} y1={O[1]} x2={B[0]} y2={B[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <line x1={O[0]} y1={O[1]} x2={C[0]} y2={C[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <circle cx={O[0]} cy={O[1]} r={3} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 6} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 6} color={stroke}>C</Label>
      <Label x={O[0] + 10} y={O[1] + 2} color={accent}>O</Label>
    </>
  );
}

// ─── 2. 직각삼각형 + 외심(빗변 중점) ──────────────────
function CircumRight({ stroke, fill, accent }) {
  // 직각 C (오른쪽 아래), 빗변 AB
  const A = [40, 130], B = [220, 130], C = [220, 30];
  const O = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2]; // 빗변 AC 중점... 아니 AB가 밑변, 빗변은 AC? 다시
  // 직각이 B에 있도록 재배치: A 왼쪽 위, B 오른쪽 아래, C 왼쪽 아래 → 빗변 AB
  const A2 = [220, 30], B2 = [40, 130], C2 = [40, 30];
  const Ohyp = [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2];
  const Rhyp = Math.hypot(A2[0] - Ohyp[0], A2[1] - Ohyp[1]);
  return (
    <>
      <circle cx={Ohyp[0]} cy={Ohyp[1]} r={Rhyp} fill="none" stroke={accent} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
      <polygon points={`${A2} ${B2} ${C2}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      {/* 직각 표시 */}
      <polyline points={`${C2[0] + 10},${C2[1]} ${C2[0] + 10},${C2[1] + 10} ${C2[0]},${C2[1] + 10}`}
        fill="none" stroke={stroke} strokeWidth={1} />
      <line x1={Ohyp[0]} y1={Ohyp[1]} x2={C2[0]} y2={C2[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <circle cx={Ohyp[0]} cy={Ohyp[1]} r={3} fill={accent} />
      <Label x={A2[0] + 10} y={A2[1]} color={stroke}>A</Label>
      <Label x={B2[0] - 10} y={B2[1] + 6} color={stroke}>B</Label>
      <Label x={C2[0] - 10} y={C2[1]} color={stroke}>C</Label>
      <Label x={Ohyp[0]} y={Ohyp[1] - 10} color={accent}>O</Label>
    </>
  );
}

// ─── 3. 둔각삼각형 + 외심(외부) ──────────────────
function CircumObtuse({ stroke, fill, accent }) {
  const A = [70, 40], B = [40, 120], C = [230, 125];
  const O = [135, 155]; // 외부 (아래쪽)
  const R = Math.hypot(A[0] - O[0], A[1] - O[1]);
  return (
    <>
      <circle cx={O[0]} cy={O[1]} r={R} fill="none" stroke={accent} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      <circle cx={O[0]} cy={O[1]} r={3} fill={accent} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      <Label x={O[0]} y={O[1] + 12} color={accent}>O</Label>
    </>
  );
}

// ─── 4. 내접원 (내심 I + 세 변 접점) ──────────────────
function Incircle({ stroke, fill, accent }) {
  const A = [130, 25], B = [35, 135], C = [225, 135];
  const I = [130, 100];
  const r = 28;
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      <circle cx={I[0]} cy={I[1]} r={r} fill={accent} fillOpacity={0.1} stroke={accent} strokeWidth={1.2} />
      <circle cx={I[0]} cy={I[1]} r={2.5} fill={accent} />
      {/* 내심에서 밑변까지 반지름 표시 */}
      <line x1={I[0]} y1={I[1]} x2={I[0]} y2={I[1] + r} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <Label x={I[0] + 15} y={I[1] + r / 2 + 2} color={accent} size={10}>r</Label>
      <Label x={A[0]} y={A[1] - 8} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      <Label x={I[0] - 10} y={I[1]} color={accent}>I</Label>
    </>
  );
}

// ─── 5. 이등변삼각형 ──────────────────
function Isosceles({ stroke, fill, accent }) {
  const A = [130, 25], B = [55, 135], C = [205, 135];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      {/* 두 변 같음 표시 (짧은 슬래시) */}
      <line x1={85} y1={80} x2={95} y2={85} stroke={accent} strokeWidth={2} />
      <line x1={175} y1={80} x2={165} y2={85} stroke={accent} strokeWidth={2} />
      {/* 밑각 표시 (호) */}
      <path d={`M ${B[0] + 20} ${B[1]} A 20 20 0 0 0 ${B[0] + 13} ${B[1] - 15}`}
        fill="none" stroke={accent} strokeWidth={1.2} />
      <path d={`M ${C[0] - 20} ${C[1]} A 20 20 0 0 1 ${C[0] - 13} ${C[1] - 15}`}
        fill="none" stroke={accent} strokeWidth={1.2} />
      <Label x={A[0]} y={A[1] - 8} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
    </>
  );
}

// ─── 6. 직각삼각형 (일반) ──────────────────
function RightTriangle({ stroke, fill, accent }) {
  const A = [40, 30], B = [40, 135], C = [220, 135];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      {/* 직각 표시 */}
      <polyline points={`${B[0] + 10},${B[1]} ${B[0] + 10},${B[1] - 10} ${B[0]},${B[1] - 10}`}
        fill="none" stroke={stroke} strokeWidth={1} />
      <Label x={A[0] - 10} y={A[1]} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      {/* 빗변 AC 라벨 (중앙) */}
      <Label x={(A[0] + C[0]) / 2 + 15} y={(A[1] + C[1]) / 2 - 10} color={accent} size={10}>빗변</Label>
    </>
  );
}

// ─── 7. 외각 정리 도형 ──────────────────
function ExteriorAngle({ stroke, fill, accent }) {
  const A = [130, 30], B = [60, 130], C = [200, 130];
  const Cext = [250, 130]; // C에서 변 BC 연장
  return (
    <>
      <line x1={B[0]} y1={B[1]} x2={Cext[0]} y2={Cext[1]} stroke={stroke} strokeWidth={1} opacity={0.4} />
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.15} stroke={stroke} strokeWidth={1.5} />
      {/* 외각 호 */}
      <path d={`M ${C[0] + 18} ${C[1]} A 18 18 0 0 0 ${C[0] + 10} ${C[1] - 15}`}
        fill="none" stroke={accent} strokeWidth={1.5} />
      <Label x={C[0] + 28} y={C[1] - 12} color={accent} size={10}>외각</Label>
      {/* 두 내각 A, B 호 */}
      <path d={`M ${A[0] - 14} ${A[1] + 10} A 16 16 0 0 0 ${A[0] + 14} ${A[1] + 10}`}
        fill="none" stroke={accent} strokeWidth={1} />
      <path d={`M ${B[0] + 18} ${B[1]} A 18 18 0 0 0 ${B[0] + 10} ${B[1] - 15}`}
        fill="none" stroke={accent} strokeWidth={1} />
      <Label x={A[0]} y={A[1] - 10} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0]} y={C[1] + 12} color={stroke}>C</Label>
    </>
  );
}

// ─── 8. 내심 + BC에 평행한 직선 DE (둘레 구하기) ──────────────────
// 삼각형 ABC 내부 내심 I를 지나 BC에 평행한 직선이 AB, AC와 D, E에서 만남
// BD=DI, CE=EI (이등변) → △ADE 둘레 = AB+AC
function IncircleParallel({ stroke, fill, accent }) {
  const A = [130, 25];
  const B = [40, 140];
  const C = [220, 140];
  // 내심 I (근사 중심)
  const I = [130, 95];
  // D: AB 위, E: AC 위 — I를 지나 BC(수평)에 평행
  const t = (I[1] - A[1]) / (B[1] - A[1]); // y 기준 비율
  const D = [A[0] + (B[0] - A[0]) * t, I[1]];
  const E = [A[0] + (C[0] - A[0]) * t, I[1]];
  return (
    <>
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.08} stroke={stroke} strokeWidth={1.5} />
      {/* DE 평행선 (강조) */}
      <line x1={D[0]} y1={D[1]} x2={E[0]} y2={E[1]} stroke={accent} strokeWidth={2} />
      {/* 각 이등분선 (B→I, C→I) */}
      <line x1={B[0]} y1={B[1]} x2={I[0]} y2={I[1]} stroke={accent} strokeWidth={1} strokeDasharray="3,2" opacity={0.6} />
      <line x1={C[0]} y1={C[1]} x2={I[0]} y2={I[1]} stroke={accent} strokeWidth={1} strokeDasharray="3,2" opacity={0.6} />
      {/* △ADE 강조 */}
      <polygon points={`${A} ${D} ${E}`} fill={accent} fillOpacity={0.18} stroke="none" />
      {/* 평행 기호 (∥) — DE와 BC에 작은 tick */}
      <line x1={(D[0] + E[0]) / 2 - 3} y1={D[1] - 5} x2={(D[0] + E[0]) / 2 - 3} y2={D[1] + 5} stroke={accent} strokeWidth={1.2} />
      <line x1={(D[0] + E[0]) / 2 + 3} y1={D[1] - 5} x2={(D[0] + E[0]) / 2 + 3} y2={D[1] + 5} stroke={accent} strokeWidth={1.2} />
      <line x1={(B[0] + C[0]) / 2 - 3} y1={B[1] - 5} x2={(B[0] + C[0]) / 2 - 3} y2={B[1] + 5} stroke={accent} strokeWidth={1.2} />
      <line x1={(B[0] + C[0]) / 2 + 3} y1={B[1] - 5} x2={(B[0] + C[0]) / 2 + 3} y2={B[1] + 5} stroke={accent} strokeWidth={1.2} />
      {/* 내심 점 */}
      <circle cx={I[0]} cy={I[1]} r={2.5} fill={accent} />
      <Label x={A[0]} y={A[1] - 8} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      <Label x={D[0] - 10} y={D[1] - 3} color={accent}>D</Label>
      <Label x={E[0] + 10} y={E[1] - 3} color={accent}>E</Label>
      <Label x={I[0] + 8} y={I[1] + 10} color={accent} size={10}>I</Label>
    </>
  );
}

// ─── 9. 직각삼각형 + 내접원 + 접선 길이 ──────────────────
// 직각이 B, 두 직각변 a=BC, b=AB, 빗변 c=AC
// 내접원 중심 I, 반지름 r
// 접점 P(AB), Q(BC), R(AC) — BP=BQ=r (B가 직각이라 정사각형)
function RightIncircleTangent({ stroke, fill, accent }) {
  // 큰 사이즈로 배치
  const B = [50, 130];
  const A = [50, 30];   // 수직 위
  const C = [220, 130]; // 수평 오른쪽
  // 내접원 대략: r ≈ (a + b - c)/2, 여기선 시각용으로
  const r = 22;
  const I = [B[0] + r, B[1] - r];
  // 접점
  const P = [B[0], I[1]];       // AB 위
  const Q = [I[0], B[1]];       // BC 위
  // AC 위 접점 R은 시각적으로만
  const R = [130, 80];
  return (
    <>
      {/* 삼각형 */}
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1} stroke={stroke} strokeWidth={1.5} />
      {/* 직각 표시 */}
      <polyline points={`${B[0] + 10},${B[1]} ${B[0] + 10},${B[1] - 10} ${B[0]},${B[1] - 10}`}
        fill="none" stroke={stroke} strokeWidth={1} />
      {/* 내접원 */}
      <circle cx={I[0]} cy={I[1]} r={r} fill={accent} fillOpacity={0.1} stroke={accent} strokeWidth={1.2} />
      <circle cx={I[0]} cy={I[1]} r={2.5} fill={accent} />
      {/* 반지름 표시 (I→P 수직, I→Q 수평) */}
      <line x1={I[0]} y1={I[1]} x2={P[0]} y2={P[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      <line x1={I[0]} y1={I[1]} x2={Q[0]} y2={Q[1]} stroke={accent} strokeWidth={1} strokeDasharray="2,2" />
      {/* 접점 마커 */}
      <circle cx={P[0]} cy={P[1]} r={2} fill={accent} />
      <circle cx={Q[0]} cy={Q[1]} r={2} fill={accent} />
      <circle cx={R[0]} cy={R[1]} r={2} fill={accent} />
      {/* 라벨 */}
      <Label x={A[0] - 10} y={A[1]} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      <Label x={P[0] - 12} y={P[1]} color={accent} size={10}>P</Label>
      <Label x={Q[0]} y={Q[1] + 12} color={accent} size={10}>Q</Label>
      <Label x={R[0] + 12} y={R[1] - 4} color={accent} size={10}>R</Label>
      <Label x={I[0] + 8} y={I[1] - 8} color={accent} size={10}>I</Label>
    </>
  );
}

// ─── 10. 별·이등변 복합 (외각 연쇄) ──────────────────
// 이등변삼각형 ABC (AB=AC) 내부/외부에 또 다른 이등변 쐐기가 연결된 모양
// 학생이 "외각 = 이웃하지 않은 두 내각의 합" 연쇄 적용
function StarIsosceles({ stroke, fill, accent }) {
  // 큰 이등변 ABC (꼭지각 A)
  const A = [130, 20];
  const B = [50, 150];
  const C = [210, 150];
  // 변 AB 위 점 D, 변 AC 위 점 E (중간쯤)
  const D = [90, 85];
  const E = [170, 85];
  // 내부에 작은 이등변 DEF (F는 BC 위)
  const F = [130, 150];
  return (
    <>
      {/* 큰 삼각형 */}
      <polygon points={`${A} ${B} ${C}`} fill={fill} fillOpacity={0.1} stroke={stroke} strokeWidth={1.5} />
      {/* 내부 삼각형 강조 */}
      <polygon points={`${D} ${F} ${E}`} fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={1.2} />
      {/* AB=AC 표시 (짧은 슬래시 2개) */}
      <line x1={A[0] - 35} y1={50} x2={A[0] - 28} y2={55} stroke={accent} strokeWidth={1.5} />
      <line x1={A[0] - 33} y1={53} x2={A[0] - 26} y2={58} stroke={accent} strokeWidth={1.5} />
      <line x1={A[0] + 28} y1={55} x2={A[0] + 35} y2={50} stroke={accent} strokeWidth={1.5} />
      <line x1={A[0] + 26} y1={58} x2={A[0] + 33} y2={53} stroke={accent} strokeWidth={1.5} />
      {/* DF=EF 표시 (한 슬래시씩) */}
      <line x1={108} y1={120} x2={114} y2={124} stroke="#8B5CF6" strokeWidth={1.5} />
      <line x1={146} y1={124} x2={152} y2={120} stroke="#8B5CF6" strokeWidth={1.5} />
      {/* 라벨 */}
      <Label x={A[0]} y={A[1] - 8} color={stroke}>A</Label>
      <Label x={B[0] - 10} y={B[1] + 5} color={stroke}>B</Label>
      <Label x={C[0] + 10} y={C[1] + 5} color={stroke}>C</Label>
      <Label x={D[0] - 12} y={D[1]} color={accent}>D</Label>
      <Label x={E[0] + 12} y={E[1]} color={accent}>E</Label>
      <Label x={F[0]} y={F[1] + 12} color={accent}>F</Label>
    </>
  );
}

const REGISTRY = {
  "circum-acute": CircumAcute,
  "circum-right": CircumRight,
  "circum-obtuse": CircumObtuse,
  "incircle": Incircle,
  "isosceles": Isosceles,
  "right-triangle": RightTriangle,
  "exterior-angle": ExteriorAngle,
  "incircle-parallel": IncircleParallel,
  "right-incircle-tangent": RightIncircleTangent,
  "star-isosceles": StarIsosceles,
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
      <svg viewBox="0 0 260 170" width="200" height="130"
        style={{ maxWidth: "100%" }}>
        <Shape stroke={stroke} fill={fill} accent={accent} />
      </svg>
    </div>
  );
}
