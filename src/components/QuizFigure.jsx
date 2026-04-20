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

const REGISTRY = {
  "circum-acute": CircumAcute,
  "circum-right": CircumRight,
  "circum-obtuse": CircumObtuse,
  "incircle": Incircle,
  "isosceles": Isosceles,
  "right-triangle": RightTriangle,
  "exterior-angle": ExteriorAngle,
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
