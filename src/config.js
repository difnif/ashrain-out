// ============================================================
// ashrain.out — Config, Constants, Math Utilities
// ============================================================

export const PASTEL = {
  pink: "#F4B9B2", coral: "#E8A598", mint: "#A8D5BA",
  lavender: "#C3B1E1", yellow: "#F6E3BA", sky: "#B5D5E8",
  peach: "#FADADD", sage: "#D4E2D4", cream: "#FFF8F0",
  blush: "#F7E1D7", dustyRose: "#DCAE96", lilac: "#E6E0F3", gold: "#F5C542",
};

export const THEMES = {
  light: {
    bg: "#FFF8F0", card: "#FFFFFF", text: "#4A3F35", textSec: "#8B7E74",
    border: "#E8DDD4", accent: PASTEL.coral, accentSoft: PASTEL.peach,
    svgBg: "#FEFCF9", line: "#4A3F35", lineLight: "#C9BFB5",
  },
  dark: {
    bg: "#1E1B18", card: "#2A2622", text: "#E8DDD4", textSec: "#9B8E82",
    border: "#3D3630", accent: PASTEL.coral, accentSoft: "#3D2F2A",
    svgBg: "#242120", line: "#E8DDD4", lineLight: "#5A4F45",
  },
};

export const TONES = {
  default: {
    name: "기본",
    guide: {
      compassStart: "자, 가보자고!",
      rulerFirst: "아직이예요. 컴퍼스부터 골라주세요!",
      oneEdge: "수직이등분선 그리실 건가요?",
      twoEdge: "아~ 각 이등분선 그리실 거군요!!",
      backToOne: "가 아니라~ 수직이등분선!!",
      tooShort: "너무 짧아서 교점이 안 생기네요!!",
      remainAuto: "나머지도 직접 해볼래?\n아니면 내가 그려줄까?",
      earlyCenter: "쪼옴.. 마저 그리고 눌러라.\n그거 한 번 더 누르는 게 뭐 어려운 일이라고\n확 그냥 진짜 아오.. 잔소리 잔소리..",
      circleDef: "한 점에서 같은 거리에 있는\n모든 점들의 자취(집합)",
      triangleFail: "삼각형이 만들어지지 않아요!\n가장 긴 변이 나머지 두 변의 합보다 길어요.",
      selectEdge: "변을 터치하면 수직이등분선,\n꼭지점을 터치하면 각의 이등분선!",
      drawHint: "손가락으로 삼각형을 그려보세요!",
      drawAlmost: "거의 다 됐어요! 시작점 근처에서 떼세요.",
      drawFail: "삼각형 모양이 아닌 것 같아요. 다시 그려볼까요?",
    },
  },
  nagging: {
    name: "잔소리",
    guide: {
      compassStart: "자, 가보자고! 집중 좀 하고!",
      rulerFirst: "아직이라니까!! 컴퍼스부터 골라!!",
      oneEdge: "수직이등분선 그리실 건가요? 제대로 좀 해봐!",
      twoEdge: "아~ 각 이등분선?? 그래 그래 해봐!!",
      backToOne: "가 아니라~ 수직이등분선!! 왔다갔다 하지 마!!",
      tooShort: "너무 짧잖아!! 교점이 안 생기네!! 다시!!",
      remainAuto: "나머지도 해! 뭐 어려운 거라고!\n아니면 내가 그려줄까, 진짜?",
      earlyCenter: "쪼옴.. 마저 그리고 눌러라.\n그거 한 번 더 누르는 게 뭐 어려운 일이라고\n확 그냥 진짜 아오.. 잔소리 잔소리..",
      circleDef: "한 점에서 같은 거리에 있는\n모든 점들의 자취! 외워!!",
      triangleFail: "안 만들어진다니까!! 긴 변이 너무 길어!!\n다시 입력해!!",
      selectEdge: "변을 터치하면 수직이등분선!\n꼭지점 터치하면 각이등분선! 빨리 해!",
      drawHint: "삼각형 그려!! 빨리!!",
      drawAlmost: "거의 다 됐으니까 시작점 근처에서 떼라고!!",
      drawFail: "이게 삼각형이야?! 다시 그려!!",
    },
  },
  cute: {
    name: "더러운",
    guide: {
      compassStart: "자~ 같이 해보자요~ 화이팅!♡",
      rulerFirst: "앗! 아직이에요~ 컴퍼스부터 골라주세요~♡",
      oneEdge: "수직이등분선 그려주시는 건가요~?♡",
      twoEdge: "오~ 각의 이등분선이군요~!! 멋져요~♡",
      backToOne: "앗 수직이등분선으로 바꾸셨군요~ 좋아요!♡",
      tooShort: "앙~ 너무 짧아서 안 만나져요ㅠㅠ\n다시 해줄 수 있어요~?♡",
      remainAuto: "나머지도 해볼래요~?\n아니면 제가 도와드릴까요~?♡",
      earlyCenter: "조금만 더 해주시면 안 될까요~?\n한 번만 더~ 네~? 부탁이에요~♡",
      circleDef: "한 점에서 같은 거리에 있는\n모든 점들의 자취에요~♡ 예쁘죠?",
      triangleFail: "앙~ 삼각형이 안 만들어져요ㅠㅠ\n다시 해볼까요~?♡",
      selectEdge: "변을 터치하면 수직이등분선~\n꼭지점을 터치하면 각의 이등분선이에요!♡",
      drawHint: "손가락으로 삼각형을 그려주세요~♡",
      drawAlmost: "거의 다 됐어요~! 시작점 근처에서 떼주세요~♡",
      drawFail: "음~ 삼각형이 아닌 것 같아요~ 다시 해볼까요~?♡",
    },
  },
};

// --- Math Utilities ---
export const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
export const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function perpBisector(p1, p2, triA, triB, triC) {
  const mid = midpoint(p1, p2);
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / d, ny = dx / d;
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 0.8;
  return { start: { x: mid.x - nx * len, y: mid.y - ny * len }, end: { x: mid.x + nx * len, y: mid.y + ny * len }, mid };
}

export function angleBisector(vertex, p1, p2, triA, triB, triC) {
  const d1 = dist(vertex, p1), d2 = dist(vertex, p2);
  const u1 = { x: (p1.x - vertex.x) / d1, y: (p1.y - vertex.y) / d1 };
  const u2 = { x: (p2.x - vertex.x) / d2, y: (p2.y - vertex.y) / d2 };
  const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
  const bisLen = Math.sqrt(bis.x ** 2 + bis.y ** 2);
  if (bisLen < 0.001) return null;
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 0.8;
  return { start: vertex, end: { x: vertex.x + (bis.x / bisLen) * len, y: vertex.y + (bis.y / bisLen) * len } };
}

export function lineIntersection(a1, a2, b1, b2) {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const det = d1x * d2y - d1y * d2x;
  if (Math.abs(det) < 0.0001) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / det;
  return { x: a1.x + t * d1x, y: a1.y + t * d1y };
}

export function circumcenter(A, B, C) {
  const pb1 = perpBisector(A, B, A, B, C), pb2 = perpBisector(B, C, A, B, C);
  return lineIntersection(pb1.start, pb1.end, pb2.start, pb2.end);
}

export function incenter(A, B, C) {
  const a = dist(B, C), b = dist(A, C), c = dist(A, B);
  const p = a + b + c;
  return { x: (a * A.x + b * B.x + c * C.x) / p, y: (a * A.y + b * B.y + c * C.y) / p };
}

export function pointToSegDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function closestPointOnLine(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function triangleType(A, B, C) {
  const a = dist(B, C), b = dist(A, C), c = dist(A, B);
  const types = [];
  const eps = 0.5;
  if (Math.abs(a - b) < eps && Math.abs(b - c) < eps) types.push("정삼각형");
  else if (Math.abs(a - b) < eps || Math.abs(b - c) < eps || Math.abs(a - c) < eps) types.push("이등변삼각형");
  const sides = [a, b, c].sort((x, y) => x - y);
  const sq0 = sides[0] ** 2, sq1 = sides[1] ** 2, sq2 = sides[2] ** 2;
  if (Math.abs(sq0 + sq1 - sq2) < 2) types.push("직각삼각형");
  else if (sq0 + sq1 < sq2) types.push("둔각삼각형");
  else types.push("예각삼각형");
  return types;
}

export function angleAtVertex(vertex, p1, p2) {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.atan2(Math.abs(cross), dot);
}

// --- Freehand → Triangle Detector ---
// Takes array of {x,y} points from freehand drawing
// Returns {A, B, C} if valid triangle, null otherwise
export function detectTriangleFromStroke(points, svgW, svgH) {
  if (points.length < 10) return null;

  // 1. Simplify using Ramer-Douglas-Peucker
  const simplified = rdpSimplify(points, 8);
  if (simplified.length < 4) return null; // need at least 3 corners + close

  // 2. Find 3 most significant direction changes (corners)
  const corners = findCorners(simplified, 25); // min 25° direction change
  if (corners.length < 3) return null;

  // 3. Take the 3 best corners
  corners.sort((a, b) => b.angle - a.angle);
  const top3 = corners.slice(0, 3).sort((a, b) => a.idx - b.idx);
  const A = simplified[top3[0].idx];
  const B = simplified[top3[1].idx];
  const C = simplified[top3[2].idx];

  // 4. Validate: check area is reasonable
  const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  if (area < 400) return null; // too small

  // 5. Check all sides are reasonable length
  const ab = dist(A, B), bc = dist(B, C), ac = dist(A, C);
  const minSide = Math.min(ab, bc, ac);
  if (minSide < 20) return null; // side too short

  // 6. Check triangle inequality
  const maxSide = Math.max(ab, bc, ac);
  if (maxSide >= ab + bc + ac - maxSide) return null;

  // 7. Compute scale (use actual pixel distances → virtual lengths)
  const maxS = Math.max(ab, bc, ac);
  const scale = maxS / 10; // normalize so longest side ≈ 10 units

  return {
    A: { x: A.x, y: A.y },
    B: { x: B.x, y: B.y },
    C: { x: C.x, y: C.y },
    sides: [ab / scale, bc / scale, ac / scale].sort((a, b) => a - b),
    scale,
  };
}

// Ramer-Douglas-Peucker simplification
function rdpSimplify(pts, epsilon) {
  if (pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  const start = pts[0], end = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointToLineDist(pts[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function pointToLineDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return dist(p, proj);
}

function findCorners(pts, minAngleDeg) {
  const corners = [];
  const minRad = minAngleDeg * Math.PI / 180;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const a1 = Math.atan2(cur.y - prev.y, cur.x - prev.x);
    const a2 = Math.atan2(next.y - cur.y, next.x - cur.x);
    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > minRad) {
      corners.push({ idx: i, angle: diff });
    }
  }
  return corners;
}
