import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// ashrain.out — Interactive Geometry Education App
// ============================================================

// --- Constants & Config ---
const PASTEL = {
  pink: "#F4B9B2", coral: "#E8A598", mint: "#A8D5BA",
  lavender: "#C3B1E1", yellow: "#F6E3BA", sky: "#B5D5E8",
  peach: "#FADADD", sage: "#D4E2D4", cream: "#FFF8F0",
  blush: "#F7E1D7", dustyRose: "#DCAE96", lilac: "#E6E0F3",
};

const THEMES = {
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

const TONES = {
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
    },
  },
};

// --- Utility Functions ---
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function perpBisector(p1, p2, triA, triB, triC) {
  const mid = midpoint(p1, p2);
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / d, ny = dx / d;
  // Extend well beyond the triangle
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 2;
  return { start: { x: mid.x - nx * len, y: mid.y - ny * len }, end: { x: mid.x + nx * len, y: mid.y + ny * len }, mid };
}

function angleBisector(vertex, p1, p2, triA, triB, triC) {
  const d1 = dist(vertex, p1), d2 = dist(vertex, p2);
  const u1 = { x: (p1.x - vertex.x) / d1, y: (p1.y - vertex.y) / d1 };
  const u2 = { x: (p2.x - vertex.x) / d2, y: (p2.y - vertex.y) / d2 };
  const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
  const bisLen = Math.sqrt(bis.x ** 2 + bis.y ** 2);
  if (bisLen < 0.001) return null;
  // Extend well beyond the triangle
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 2;
  return { start: vertex, end: { x: vertex.x + (bis.x / bisLen) * len, y: vertex.y + (bis.y / bisLen) * len } };
}

function lineIntersection(a1, a2, b1, b2) {
  const d1x = a2.x - a1.x, d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x, d2y = b2.y - b1.y;
  const det = d1x * d2y - d1y * d2x;
  if (Math.abs(det) < 0.0001) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / det;
  return { x: a1.x + t * d1x, y: a1.y + t * d1y };
}

function circumcenter(A, B, C) {
  const pb1 = perpBisector(A, B, A, B, C), pb2 = perpBisector(B, C, A, B, C);
  return lineIntersection(pb1.start, pb1.end, pb2.start, pb2.end);
}

function incenter(A, B, C) {
  const a = dist(B, C), b = dist(A, C), c = dist(A, B);
  const p = a + b + c;
  return { x: (a * A.x + b * B.x + c * C.x) / p, y: (a * A.y + b * B.y + c * C.y) / p };
}

function pointToSegDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function closestPointOnLine(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function triangleType(A, B, C) {
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

function angleAtVertex(vertex, p1, p2) {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.atan2(Math.abs(cross), dot);
}

// --- Components ---

function FloatingMsg({ msg, theme }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
      background: theme.card, color: theme.text, padding: "12px 24px",
      borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      border: `2px solid ${theme.accent}`, zIndex: 100, maxWidth: "80%",
      textAlign: "center", whiteSpace: "pre-line", fontSize: 14,
      fontFamily: "'Noto Serif KR', serif", animation: "fadeIn 0.3s ease",
    }}>
      {msg}
    </div>
  );
}

function InfoPanel({ data, theme }) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, right: 12,
      background: theme.card, borderRadius: 16, padding: "16px 20px",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.1)", border: `1px solid ${theme.border}`,
      maxHeight: "40%", overflowY: "auto", zIndex: 50,
    }}>
      {data.map((item, i) => (
        <div key={i} style={{
          marginBottom: 8, fontSize: 13, color: theme.text,
          fontFamily: "'Noto Serif KR', serif", lineHeight: 1.6,
        }}>
          {item.color && <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: item.color, marginRight: 8, verticalAlign: "middle",
          }} />}
          <span style={{ fontWeight: item.bold ? 700 : 400 }}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main App
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("login");
  const [themeKey, setThemeKey] = useState("light");
  const [toneKey, setToneKey] = useState("default");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const theme = THEMES[themeKey];
  const tone = TONES[toneKey];

  // Audio state
  const [bgmOn, setBgmOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [bgmVol, setBgmVol] = useState(0.3);
  const [sfxVol, setSfxVol] = useState(0.5);

  // Custom scripts (admin-editable, keyed by toneKey)
  const [customScripts, setCustomScripts] = useState(() => {
    const saved = null; // would load from Firestore
    return saved || JSON.parse(JSON.stringify(TONES));
  });

  // Get active tone (custom if edited, otherwise default)
  const activeTone = customScripts[toneKey] || TONES[toneKey];

  // Simple SFX player
  const playSfx = useCallback((type) => {
    if (!sfxOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = sfxVol * 0.3;
      const sfxMap = {
        click: { freq: 800, dur: 0.08, type: 'sine' },
        success: { freq: 600, dur: 0.2, type: 'sine' },
        error: { freq: 200, dur: 0.3, type: 'sawtooth' },
        draw: { freq: 500, dur: 0.12, type: 'triangle' },
        complete: { freq: 900, dur: 0.15, type: 'sine' },
        pop: { freq: 1200, dur: 0.06, type: 'sine' },
      };
      const s = sfxMap[type] || sfxMap.click;
      osc.frequency.value = s.freq; osc.type = s.type;
      osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
      osc.stop(ctx.currentTime + s.dur + 0.05);
    } catch(e) {}
  }, [sfxOn, sfxVol]);

  // Triangle state
  const [triMode, setTriMode] = useState(null); // "sss","sas","asa"
  const [inputMode, setInputMode] = useState("A"); // A=number, B=freedraw
  const [triangle, setTriangle] = useState(null); // {A,B,C}
  const [buildPhase, setBuildPhase] = useState(null); // "input","animating","done","modeSelect","jedo","jakdo","properties"
  const [sssInput, setSssInput] = useState({ a: "", b: "", c: "" });

  // Animation
  const [animPhase, setAnimPhase] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);
  const animRef = useRef(null);

  // Jedo state
  const [jedoLines, setJedoLines] = useState([]);
  const [jedoCenter, setJedoCenter] = useState(null);
  const [jedoCircle, setJedoCircle] = useState(null);
  const [jedoType, setJedoType] = useState(null); // "circum" or "in"
  const [floatingMsg, setFloatingMsg] = useState(null);
  const [showProperties, setShowProperties] = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [viewBox, setViewBox] = useState(null); // null = default, or {x,y,w,h}
  const [manualView, setManualView] = useState(null); // user pinch/pan override
  const touchRef = useRef({ startDist: 0, startVB: null, startMid: null, panning: false });

  // SVG sizing
  const svgRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const svgContainerRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 32, 600);
      const h = Math.min(window.innerHeight * 0.55, 500);
      setSvgSize({ w, h });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Smart viewBox: only expand when circle overflows, otherwise keep default
  useEffect(() => {
    if (!triangle) { setViewBox(null); return; }
    const { A, B, C } = triangle;

    // Only adjust viewBox when circle is drawn and overflows
    if (!jedoCircle) { setViewBox(null); return; }

    const { cx, cy, r } = jedoCircle;
    const pad = 40;

    // Bounds of triangle + circle
    const allX = [A.x, B.x, C.x, cx - r, cx + r];
    const allY = [A.y, B.y, C.y, cy - r, cy + r];
    if (jedoCenter) { allX.push(jedoCenter.x); allY.push(jedoCenter.y); }

    let minX = Math.min(...allX) - pad;
    let maxX = Math.max(...allX) + pad;
    let minY = Math.min(...allY) - pad;
    let maxY = Math.max(...allY) + pad;

    // Check if everything fits in default viewBox
    const fitsDefault = minX >= 0 && minY >= 0 && maxX <= svgSize.w && maxY <= svgSize.h;
    if (fitsDefault) { setViewBox(null); return; }

    // Expand: ensure aspect ratio matches SVG
    let vw = maxX - minX, vh = maxY - minY;
    const svgAspect = svgSize.w / svgSize.h;
    const contentAspect = vw / vh;
    if (contentAspect > svgAspect) {
      const newVh = vw / svgAspect;
      const centerY = (minY + maxY) / 2;
      minY = centerY - newVh / 2;
      vh = newVh;
    } else {
      const newVw = vh * svgAspect;
      const centerX = (minX + maxX) / 2;
      minX = centerX - newVw / 2;
      vw = newVw;
    }
    setViewBox({ x: minX, y: minY, w: vw, h: vh });
  }, [jedoCircle, triangle, svgSize]);

  // Computed active viewBox (manual override > auto > default)
  const getActiveVB = useCallback(() => {
    if (manualView) return manualView;
    if (viewBox) return viewBox;
    return { x: 0, y: 0, w: svgSize.w, h: svgSize.h };
  }, [manualView, viewBox, svgSize]);

  // Touch pinch-zoom and pan handlers
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
      touchRef.current = {
        startDist: Math.sqrt(dx*dx + dy*dy),
        startVB: { ...getActiveVB() },
        startMid: { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 },
        panning: true,
      };
    }
  }, [getActiveVB]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchRef.current.panning) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
      const curDist = Math.sqrt(dx*dx + dy*dy);
      const curMid = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
      const { startDist, startVB, startMid } = touchRef.current;

      // Zoom: ratio of finger distances
      const scale = Math.max(0.3, Math.min(3, startDist / curDist));
      const newW = startVB.w * scale;
      const newH = startVB.h * scale;

      // Pan: convert screen pixel delta to SVG coordinate delta
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const pixelToSvgX = startVB.w / rect.width;
      const pixelToSvgY = startVB.h / rect.height;
      const panX = (startMid.x - curMid.x) * pixelToSvgX;
      const panY = (startMid.y - curMid.y) * pixelToSvgY;

      // New viewBox centered on zoom point
      const cx = startVB.x + startVB.w / 2 + panX;
      const cy = startVB.y + startVB.h / 2 + panY;

      setManualView({ x: cx - newW/2, y: cy - newH/2, w: newW, h: newH });
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      touchRef.current.panning = false;
    }
  }, []);

  // Reset manual view button
  const resetView = useCallback(() => {
    setManualView(null);
  }, []);

  const showMsg = useCallback((msg, duration = 2500) => {
    setFloatingMsg(msg);
    setTimeout(() => setFloatingMsg(null), duration);
  }, []);

  // --- Triangle Generation from SSS ---
  const generateTriangle = useCallback((a, b, c) => {
    const sides = [
      { len: parseFloat(a), label: "a" },
      { len: parseFloat(b), label: "b" },
      { len: parseFloat(c), label: "c" },
    ].sort((x, y) => x.len - y.len);

    if (sides[2].len >= sides[0].len + sides[1].len) {
      return null; // invalid
    }

    const maxSide = sides[2].len;
    const scale = (svgSize.w * 0.6) / maxSide;

    const base = sides[2].len * scale;
    const s1 = sides[0].len * scale;
    const s2 = sides[1].len * scale;

    const cx = svgSize.w / 2;
    const baseY = svgSize.h * 0.7;

    const Bx = cx - base / 2, By = baseY;
    const Cx = cx + base / 2, Cy = baseY;
    const cosA = (base * base + s2 * s2 - s1 * s1) / (2 * base * s2);
    const sinA = Math.sqrt(1 - cosA * cosA);
    const Ax = Bx + s2 * cosA;
    const Ay = By - s2 * sinA;

    return {
      A: { x: Ax, y: Ay },
      B: { x: Bx, y: By },
      C: { x: Cx, y: Cy },
      sides: sides.map(s => s.len),
      scale,
    };
  }, [svgSize]);

  // --- Animation for triangle building ---
  useEffect(() => {
    if (buildPhase !== "animating") return;
    let start = null;
    const totalDuration = 3000;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / totalDuration, 1);
      setAnimProgress(progress);

      if (progress < 0.25) setAnimPhase(0); // parallel lines
      else if (progress < 0.5) setAnimPhase(1); // attach at right angle
      else if (progress < 0.85) setAnimPhase(2); // rotate to form triangle
      else setAnimPhase(3); // complete

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setBuildPhase("modeSelect");
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [buildPhase]);

  // --- Failed triangle animation ---
  const [failAnim, setFailAnim] = useState(false);
  const failAnimRef = useRef(null);

  // --- Handlers ---
  const handleSSSSubmit = () => {
    const { a, b, c } = sssInput;
    if (!a || !b || !c) return;
    const tri = generateTriangle(a, b, c);
    if (!tri) {
      setFailAnim(true);
      showMsg(activeTone.guide.triangleFail, 3000);
      setTimeout(() => setFailAnim(false), 3500);
      return;
    }
    setTriangle({ ...tri, mode: "sss" });
    setBuildPhase("animating");
  };

  const handleJedoClick = (e) => {
    if (!triangle || buildPhase !== "jedo") return;
    const svg = svgRef.current;
    if (!svg) return;

    // Convert screen coordinates to SVG viewBox coordinates
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = svgPt.x;
    const y = svgPt.y;

    const { A, B, C } = triangle;

    // Check if clicked on center
    if (jedoCenter) {
      const dc = dist({ x, y }, jedoCenter);
      if (dc < 20) {
        if (jedoLines.length < 3) {
          showMsg(activeTone.guide.earlyCenter, 3500);
          return;
        }
        // Show circle definition then draw circle
        showMsg(activeTone.guide.circleDef, 3000);
        setTimeout(() => {
          if (jedoType === "circum") {
            const r = dist(jedoCenter, A);
            setJedoCircle({ cx: jedoCenter.x, cy: jedoCenter.y, r });
          } else {
            const r = pointToSegDist(jedoCenter, A, B);
            setJedoCircle({ cx: jedoCenter.x, cy: jedoCenter.y, r });
          }
        }, 1500);
        return;
      }
    }

    const edges = [
      { p1: A, p2: B, key: "AB" },
      { p1: B, p2: C, key: "BC" },
      { p1: A, p2: C, key: "AC" },
    ];
    const vertices = [
      { p: A, other1: B, other2: C, key: "A" },
      { p: B, other1: A, other2: C, key: "B" },
      { p: C, other1: A, other2: B, key: "C" },
    ];

    // Check vertices first (angle bisector)
    for (const v of vertices) {
      if (dist({ x, y }, v.p) < 25) {
        if (jedoLines.find(l => l.key === `ang_${v.key}`)) return;
        if (jedoType && jedoType !== "in") {
          showMsg("외심 작도 중이에요! 변을 클릭해주세요.", 2000);
          return;
        }
        const bis = angleBisector(v.p, v.other1, v.other2, A, B, C);
        if (!bis) return;
        const newLine = { ...bis, key: `ang_${v.key}`, type: "angle", color: PASTEL.lavender };
        const newLines = [...jedoLines, newLine];
        setJedoLines(newLines);
        setJedoType("in");

        if (newLines.filter(l => l.type === "angle").length >= 2) {
          const angLines = newLines.filter(l => l.type === "angle");
          const center = lineIntersection(angLines[0].start, angLines[0].end, angLines[1].start, angLines[1].end);
          if (center) setJedoCenter(center);
        }
        return;
      }
    }

    // Check edges (perpendicular bisector)
    for (const edge of edges) {
      const d = pointToSegDist({ x, y }, edge.p1, edge.p2);
      if (d < 20) {
        if (jedoLines.find(l => l.key === `perp_${edge.key}`)) return;
        if (jedoType && jedoType !== "circum") {
          showMsg("내심 작도 중이에요! 꼭지점을 클릭해주세요.", 2000);
          return;
        }
        const pb = perpBisector(edge.p1, edge.p2, A, B, C);
        const newLine = { ...pb, key: `perp_${edge.key}`, type: "perp", color: PASTEL.sky };
        const newLines = [...jedoLines, newLine];
        setJedoLines(newLines);
        setJedoType("circum");

        if (newLines.filter(l => l.type === "perp").length >= 2) {
          const perpLines = newLines.filter(l => l.type === "perp");
          const center = lineIntersection(perpLines[0].start, perpLines[0].end, perpLines[1].start, perpLines[1].end);
          if (center) setJedoCenter(center);
        }
        return;
      }
    }
  };

  const resetAll = () => {
    setTriangle(null);
    setBuildPhase(null);
    setTriMode(null);
    setJedoLines([]);
    setJedoCenter(null);
    setJedoCircle(null);
    setJedoType(null);
    setShowProperties(false);
    setSelectedProp(null);
    setCanvasCollapsed(false);
    setViewBox(null);
    setManualView(null);
    setSssInput({ a: "", b: "", c: "" });
  };

  // --- Properties Data with highlight info ---
  const getProperties = () => {
    if (!triangle || !jedoCenter || !jedoCircle) return [];
    const { A, B, C } = triangle;
    const types = triangleType(A, B, C);
    const O = jedoCenter;
    const props = [];

    props.push({ id: "type", text: `삼각형 종류: ${types.join(", ")}`, bold: true, color: PASTEL.coral,
      highlight: "triType" });

    if (jedoType === "circum") {
      const r = jedoCircle.r;
      props.push({ id: "cRadius", text: `외접원의 반지름 R = ${(r / (triangle.scale || 1)).toFixed(1)}`, color: PASTEL.sky,
        highlight: "circumRadius" });
      props.push({ id: "cEqual", text: `OA = OB = OC (외심에서 세 꼭지점까지 거리 동일)`, color: "#7EC8E3",
        highlight: "circumRadiiAll" });

      const angA = angleAtVertex(A, B, C) * 180 / Math.PI;
      const angB = angleAtVertex(B, A, C) * 180 / Math.PI;
      const angC = angleAtVertex(C, A, B) * 180 / Math.PI;
      props.push({ id: "angles", text: `∠A = ${angA.toFixed(1)}°, ∠B = ${angB.toFixed(1)}°, ∠C = ${angC.toFixed(1)}°`, color: PASTEL.yellow,
        highlight: "allAngles" });
      props.push({ id: "central", text: `∠BOC = 2∠A = ${(2 * angA).toFixed(1)}° (중심각 = 2 × 원주각)`, color: PASTEL.mint, bold: true,
        highlight: "centralAngle" });

      const angOBC = angleAtVertex(B, O, C) * 180 / Math.PI / 2;
      const angOCA = angleAtVertex(C, O, A) * 180 / Math.PI / 2;
      const angOAB = angleAtVertex(A, O, B) * 180 / Math.PI / 2;
      props.push({ id: "iso90", text: `∠OBC + ∠OCA + ∠OAB = ${(angOBC + angOCA + angOAB).toFixed(1)}° = 90°`, color: PASTEL.lavender, bold: true,
        highlight: "isoTriangles" });

      if (types.includes("직각삼각형")) props.push({ id: "right", text: "→ 직각삼각형: 외심이 빗변의 중점에 위치!", bold: true, color: "#FF8A80", highlight: "rightHyp" });
      if (types.includes("둔각삼각형")) props.push({ id: "obtuse", text: "→ 둔각삼각형: 외심이 삼각형 바깥에 위치!", bold: true, color: "#FF8A80", highlight: "obtuseOut" });
      if (types.includes("예각삼각형")) props.push({ id: "acute", text: "→ 예각삼각형: 외심이 삼각형 내부에 위치!", bold: true, color: "#82C9A5", highlight: "acuteIn" });
      if (types.includes("이등변삼각형")) props.push({ id: "isoCircum", text: "→ 이등변삼각형: 외심이 꼭지각의 이등분선 위!", bold: true, color: "#FFB74D", highlight: "isoBisector" });

      // Isosceles triangles formed by circumcenter
      props.push({ id: "isoOAB", text: `△OAB: OA = OB = R → 이등변삼각형`, color: "#F48FB1", highlight: "isoOAB" });
      props.push({ id: "isoOBC", text: `△OBC: OB = OC = R → 이등변삼각형`, color: "#80CBC4", highlight: "isoOBC" });
      props.push({ id: "isoOCA", text: `△OCA: OC = OA = R → 이등변삼각형`, color: "#CE93D8", highlight: "isoOCA" });
    } else {
      const r = jedoCircle.r;
      const a = dist(B, C), b = dist(A, C), c = dist(A, B);
      props.push({ id: "iRadius", text: `내접원의 반지름 r = ${(r / (triangle.scale || 1)).toFixed(1)}`, color: PASTEL.lavender,
        highlight: "inRadius" });
      props.push({ id: "iEqual", text: `내심에서 세 변까지의 거리가 모두 같다 (= r)`, color: "#B39DDB",
        highlight: "inRadiiAll" });

      const angA = angleAtVertex(A, B, C) * 180 / Math.PI;
      const angBIC = 90 + angA / 2;
      props.push({ id: "bicAngle", text: `∠BIC = 90° + ½∠A = ${angBIC.toFixed(1)}°`, color: PASTEL.mint, bold: true,
        highlight: "bicAngle" });

      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      props.push({ id: "area", text: `넓이 S = ½ × r × (a+b+c) = ${(area / ((triangle.scale || 1) ** 2)).toFixed(1)}`, color: PASTEL.yellow, bold: true,
        highlight: "areaFill" });
      props.push({ id: "bisRatio", text: `각의 이등분선은 대변을 양 옆 변의 비로 나눈다`, color: PASTEL.peach,
        highlight: "bisectorRatio" });

      // Congruent triangles formed by incenter
      props.push({ id: "congA", text: `△AFI ≅ △AEI (RHS 합동: AI 공통, IF=IE=r, ∠F=∠E=90°)`, bold: true, color: "#FF8A65", highlight: "congA" });
      props.push({ id: "congB", text: `△BDI ≅ △BFI (RHS 합동: BI 공통, ID=IF=r, ∠D=∠F=90°)`, bold: true, color: "#4FC3F7", highlight: "congB" });
      props.push({ id: "congC", text: `△CDI ≅ △CEI (RHS 합동: CI 공통, ID=IE=r, ∠D=∠E=90°)`, bold: true, color: "#AED581", highlight: "congC" });
    }
    return props;
  };

  // --- SVG Highlight Rendering ---
  const renderHighlight = () => {
    if (!selectedProp || !triangle || !jedoCenter || !jedoCircle) return null;
    const { A, B, C } = triangle;
    const O = jedoCenter;
    const prop = getProperties().find(p => p.id === selectedProp);
    if (!prop) return null;
    const hc = prop.color; // highlight color
    const hcAlpha = hc + "40"; // with transparency

    switch (prop.highlight) {
      case "triType": {
        const types = triangleType(A, B, C);
        // Highlight the triangle itself with type color
        return (
          <g>
            <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill={hcAlpha} stroke={hc} strokeWidth={3} />
            <text x={(A.x+B.x+C.x)/3} y={(A.y+B.y+C.y)/3} textAnchor="middle"
              fill={hc} fontSize={13} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {types.join(", ")}
            </text>
          </g>
        );
      }
      case "circumRadius": {
        const r = jedoCircle.r;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2.5} />
            <text x={(O.x+A.x)/2+10} y={(O.y+A.y)/2-8} fill={hc} fontSize={11}
              fontWeight={700} fontFamily="'Noto Serif KR', serif">
              R = {(r / (triangle.scale || 1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "circumRadiiAll": {
        return (
          <g>
            {[A, B, C].map((p, i) => (
              <line key={i} x1={O.x} y1={O.y} x2={p.x} y2={p.y}
                stroke={hc} strokeWidth={2.5} strokeDasharray="6 3" />
            ))}
            {[A, B, C].map((p, i) => (
              <circle key={`dot${i}`} cx={p.x} cy={p.y} r={6} fill={hc} opacity={0.7} />
            ))}
          </g>
        );
      }
      case "allAngles": {
        return (
          <g>
            {[[A, B, C, "∠A"], [B, A, C, "∠B"], [C, A, B, "∠C"]].map(([v, p1, p2, label], i) => {
              const ang = (angleAtVertex(v, p1, p2) * 180 / Math.PI).toFixed(1);
              const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
              const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
              let diff = a2 - a1;
              if (diff < -Math.PI) diff += 2 * Math.PI;
              if (diff > Math.PI) diff -= 2 * Math.PI;
              const midA = a1 + diff / 2;
              const arcR = 30;
              const sweepFlag = diff > 0 ? 1 : 0;
              const colors = ["#FFE082", "#FFF176", "#FFD54F"];
              return (
                <g key={i}>
                  <path
                    d={`M ${v.x + arcR * Math.cos(a1)} ${v.y + arcR * Math.sin(a1)} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${v.x + arcR * Math.cos(a2)} ${v.y + arcR * Math.sin(a2)}`}
                    fill="none" stroke={colors[i]} strokeWidth={3} />
                  <text x={v.x + (arcR+16)*Math.cos(midA)} y={v.y + (arcR+16)*Math.sin(midA)}
                    textAnchor="middle" dominantBaseline="central" fill={colors[i]}
                    fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
                    {ang}°
                  </text>
                </g>
              );
            })}
          </g>
        );
      }
      case "centralAngle": {
        const angA = angleAtVertex(A, B, C);
        const angBOC = angleAtVertex(O, B, C); // Angle at O between B and C? No, ∠BOC = angle at O
        // Draw angle arc at O between OB and OC, and arc at A
        const a1o = Math.atan2(B.y - O.y, B.x - O.x);
        const a2o = Math.atan2(C.y - O.y, C.x - O.x);
        let diffO = a2o - a1o; if (diffO < -Math.PI) diffO += 2*Math.PI; if (diffO > Math.PI) diffO -= 2*Math.PI;
        const sweepO = diffO > 0 ? 1 : 0;
        const rO = 25;
        const a1a = Math.atan2(B.y - A.y, B.x - A.x);
        const a2a = Math.atan2(C.y - A.y, C.x - A.x);
        let diffA = a2a - a1a; if (diffA < -Math.PI) diffA += 2*Math.PI; if (diffA > Math.PI) diffA -= 2*Math.PI;
        const sweepA = diffA > 0 ? 1 : 0;
        const rA = 22;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <path d={`M ${O.x+rO*Math.cos(a1o)} ${O.y+rO*Math.sin(a1o)} A ${rO} ${rO} 0 0 ${sweepO} ${O.x+rO*Math.cos(a2o)} ${O.y+rO*Math.sin(a2o)}`}
              fill="none" stroke={hc} strokeWidth={3} />
            <text x={O.x+40*Math.cos(a1o+diffO/2)} y={O.y+40*Math.sin(a1o+diffO/2)}
              textAnchor="middle" dominantBaseline="central" fill={hc}
              fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠BOC
            </text>
            <path d={`M ${A.x+rA*Math.cos(a1a)} ${A.y+rA*Math.sin(a1a)} A ${rA} ${rA} 0 0 ${sweepA} ${A.x+rA*Math.cos(a2a)} ${A.y+rA*Math.sin(a2a)}`}
              fill="none" stroke="#FF8A65" strokeWidth={3} />
            <text x={A.x+38*Math.cos(a1a+diffA/2)} y={A.y+38*Math.sin(a1a+diffA/2)}
              textAnchor="middle" dominantBaseline="central" fill="#FF8A65"
              fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠A
            </text>
          </g>
        );
      }
      case "isoTriangles": {
        // Highlight three isoceles triangles OBC, OCA, OAB
        const colors = ["rgba(195,177,225,0.25)", "rgba(168,213,186,0.25)", "rgba(246,227,186,0.25)"];
        const strokes = [PASTEL.lavender, PASTEL.mint, PASTEL.yellow];
        return (
          <g>
            {[[O,B,C],[O,C,A],[O,A,B]].map(([p1,p2,p3], i) => (
              <polygon key={i} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                fill={colors[i]} stroke={strokes[i]} strokeWidth={2} />
            ))}
          </g>
        );
      }
      case "inRadius": {
        const r = jedoCircle.r;
        // Show one radius line from incenter to nearest point on AB
        const cp = closestPointOnLine(O, A, B);
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={cp.x} y2={cp.y} stroke={hc} strokeWidth={2.5} />
            <circle cx={cp.x} cy={cp.y} r={4} fill={hc} />
            <text x={(O.x+cp.x)/2+10} y={(O.y+cp.y)/2-8} fill={hc} fontSize={11}
              fontWeight={700} fontFamily="'Noto Serif KR', serif">
              r = {(r / (triangle.scale || 1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "inRadiiAll": {
        return (
          <g>
            {[[A,B],[B,C],[A,C]].map(([p1,p2], i) => {
              const cp = closestPointOnLine(O, p1, p2);
              return (
                <g key={i}>
                  <line x1={O.x} y1={O.y} x2={cp.x} y2={cp.y}
                    stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
                  <circle cx={cp.x} cy={cp.y} r={5} fill={hc} opacity={0.7} />
                </g>
              );
            })}
          </g>
        );
      }
      case "bicAngle": {
        // ∠BIC at incenter
        const a1 = Math.atan2(B.y - O.y, B.x - O.x);
        const a2 = Math.atan2(C.y - O.y, C.x - O.x);
        let diff = a2 - a1; if (diff < -Math.PI) diff += 2*Math.PI; if (diff > Math.PI) diff -= 2*Math.PI;
        const sweep = diff > 0 ? 1 : 0;
        const r = 20;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <path d={`M ${O.x+r*Math.cos(a1)} ${O.y+r*Math.sin(a1)} A ${r} ${r} 0 0 ${sweep} ${O.x+r*Math.cos(a2)} ${O.y+r*Math.sin(a2)}`}
              fill="none" stroke={hc} strokeWidth={3} />
            <text x={O.x+35*Math.cos(a1+diff/2)} y={O.y+35*Math.sin(a1+diff/2)}
              textAnchor="middle" dominantBaseline="central" fill={hc}
              fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠BIC
            </text>
          </g>
        );
      }
      case "areaFill": {
        return (
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
            fill={hcAlpha} stroke={hc} strokeWidth={2} />
        );
      }
      case "bisectorRatio": {
        // Show angle bisector from A hitting BC, splitting it
        const bis = angleBisector(A, B, C, A, B, C);
        if (!bis) return null;
        const foot = lineIntersection(bis.start, bis.end, B, C);
        if (!foot) return null;
        const dBF = dist(B, foot), dFC = dist(foot, C);
        const dAB = dist(A, B), dAC = dist(A, C);
        return (
          <g>
            <line x1={A.x} y1={A.y} x2={foot.x} y2={foot.y} stroke={hc} strokeWidth={2.5} />
            <circle cx={foot.x} cy={foot.y} r={5} fill={hc} />
            <text x={(B.x+foot.x)/2} y={(B.y+foot.y)/2 - 12} textAnchor="middle"
              fill="#FF8A65" fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {(dBF / (triangle.scale||1)).toFixed(1)}
            </text>
            <text x={(C.x+foot.x)/2} y={(C.y+foot.y)/2 - 12} textAnchor="middle"
              fill="#4FC3F7" fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {(dFC / (triangle.scale||1)).toFixed(1)}
            </text>
            <text x={foot.x} y={foot.y + 18} textAnchor="middle"
              fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              AB:AC = {(dAB/(triangle.scale||1)).toFixed(1)}:{(dAC/(triangle.scale||1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "isoOAB": {
        const eqLen = dist(O, A);
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${A.x},${A.y} ${B.x},${B.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} />
            {/* Equal marks on OA and OB */}
            {[A, B].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+A.x+B.x)/3} y={(O.y+A.y+B.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "isoOBC": {
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} />
            {[B, C].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+B.x+C.x)/3} y={(O.y+B.y+C.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "isoOCA": {
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${C.x},${C.y} ${A.x},${A.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2} />
            {[C, A].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+C.x+A.x)/3} y={(O.y+C.y+A.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "congA": {
        // △AFI ≅ △AEI — I=incenter, F=foot on AB, E=foot on AC
        const F = closestPointOnLine(O, A, B);
        const E = closestPointOnLine(O, A, C);
        return (
          <g>
            <polygon points={`${A.x},${A.y} ${F.x},${F.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${A.x},${A.y} ${E.x},${E.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {/* Right angle marks at F and E */}
            {[F, E].map((foot, i) => {
              const side = i === 0 ? [A, B] : [A, C];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={F.x} cy={F.y} r={4} fill={hc} />
            <circle cx={E.x} cy={E.y} r={4} fill={hc} />
            <text x={F.x - 12} y={F.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>F</text>
            <text x={E.x + 8} y={E.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>E</text>
            <text x={(A.x+O.x)/2 + 14} y={(A.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      case "congB": {
        // △BDI ≅ △BFI — D=foot on BC, F=foot on AB
        const D = closestPointOnLine(O, B, C);
        const F = closestPointOnLine(O, A, B);
        return (
          <g>
            <polygon points={`${B.x},${B.y} ${D.x},${D.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${B.x},${B.y} ${F.x},${F.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {[D, F].map((foot, i) => {
              const side = i === 0 ? [B, C] : [A, B];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={D.x} cy={D.y} r={4} fill={hc} />
            <circle cx={F.x} cy={F.y} r={4} fill={hc} />
            <text x={D.x + 8} y={D.y + 14} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>D</text>
            <text x={F.x - 12} y={F.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>F</text>
            <text x={(B.x+O.x)/2 + 14} y={(B.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      case "congC": {
        // △CDI ≅ △CEI — D=foot on BC, E=foot on AC
        const D = closestPointOnLine(O, B, C);
        const E = closestPointOnLine(O, A, C);
        return (
          <g>
            <polygon points={`${C.x},${C.y} ${D.x},${D.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${C.x},${C.y} ${E.x},${E.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {[D, E].map((foot, i) => {
              const side = i === 0 ? [B, C] : [A, C];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={D.x} cy={D.y} r={4} fill={hc} />
            <circle cx={E.x} cy={E.y} r={4} fill={hc} />
            <text x={D.x + 8} y={D.y + 14} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>D</text>
            <text x={E.x + 8} y={E.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>E</text>
            <text x={(C.x+O.x)/2 + 14} y={(C.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      default:
        return null;
    }
  };

  // --- Render Triangle with Animation ---
  const renderTriangleAnim = () => {
    if (!triangle) return null;
    const { A, B, C, sides, scale } = triangle;
    const s = sides.map(v => v * scale);

    if (buildPhase === "animating") {
      const cx = svgSize.w / 2;
      const mode = triangle.mode || "sss";
      const ease = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

      if (mode === "sss") {
        // SSS: 3 parallel lines → attach to base → rotate to form triangle
        if (animPhase === 0) {
          const lineAlpha = Math.min(animProgress / 0.2, 1);
          const spacing = 30, y0 = svgSize.h / 2 - spacing;
          return (
            <g opacity={lineAlpha}>
              <line x1={cx-s[0]/2} y1={y0} x2={cx+s[0]/2} y2={y0} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={cx-s[1]/2} y1={y0+spacing} x2={cx+s[1]/2} y2={y0+spacing} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={cx-s[2]/2} y1={y0+spacing*2} x2={cx+s[2]/2} y2={y0+spacing*2} stroke={PASTEL.coral} strokeWidth={3} />
            </g>
          );
        }
        if (animPhase === 1) {
          const t = (animProgress-0.25)/0.25;
          const baseY = svgSize.h*0.7, bx1 = cx-s[2]/2, bx2 = cx+s[2]/2;
          const s1p1 = lerp({x:cx-s[0]/2,y:svgSize.h/2-30},{x:bx1,y:baseY},t);
          const s1p2 = lerp({x:cx+s[0]/2,y:svgSize.h/2-30},{x:bx1,y:baseY-s[0]},t);
          const s2p1 = lerp({x:cx-s[1]/2,y:svgSize.h/2},{x:bx2,y:baseY},t);
          const s2p2 = lerp({x:cx+s[1]/2,y:svgSize.h/2},{x:bx2,y:baseY-s[1]},t);
          return (
            <g>
              <line x1={bx1} y1={baseY} x2={bx2} y2={baseY} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={s1p1.x} y1={s1p1.y} x2={s1p2.x} y2={s1p2.y} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={s2p1.x} y1={s2p1.y} x2={s2p2.x} y2={s2p2.y} stroke={PASTEL.sky} strokeWidth={3} />
            </g>
          );
        }
        if (animPhase >= 2) {
          const t = Math.min((animProgress-0.5)/0.35, 1);
          const eased = ease(t);
          const baseY = svgSize.h*0.7, bx1 = cx-s[2]/2, bx2 = cx+s[2]/2;
          const targetAngleL = -Math.acos((s[2]*s[2]+s[1]*s[1]-s[0]*s[0])/(2*s[2]*s[1]));
          const currentAngleL = lerp({x:-Math.PI/2,y:0},{x:targetAngleL,y:0},eased).x;
          const targetAngleR = Math.PI+Math.acos((s[2]*s[2]+s[0]*s[0]-s[1]*s[1])/(2*s[2]*s[0]));
          const currentAngleR = lerp({x:Math.PI+Math.PI/2,y:0},{x:targetAngleR,y:0},eased).x;
          const lx = bx1+s[1]*Math.cos(currentAngleL), ly = baseY+s[1]*Math.sin(currentAngleL);
          const rx = bx2+s[0]*Math.cos(currentAngleR), ry = baseY+s[0]*Math.sin(currentAngleR);
          return (
            <g>
              <line x1={bx1} y1={baseY} x2={bx2} y2={baseY} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={bx1} y1={baseY} x2={lx} y2={ly} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={bx2} y1={baseY} x2={rx} y2={ry} stroke={PASTEL.mint} strokeWidth={3} />
              {animPhase===3 && <>
                <circle cx={lx} cy={ly} r={5} fill={PASTEL.coral} />
                <circle cx={bx1} cy={baseY} r={5} fill={PASTEL.coral} />
                <circle cx={bx2} cy={baseY} r={5} fill={PASTEL.coral} />
              </>}
            </g>
          );
        }
      }

      if (mode === "sas") {
        // SAS: Two sides appear → join at angle → connect remaining endpoints
        const baseY = svgSize.h * 0.7;
        // B is bottom-left vertex (origin of the angle)
        if (animPhase === 0) {
          // Phase 0: Two sides appear side by side
          const alpha = Math.min(animProgress / 0.2, 1);
          const spacing = 25, y0 = svgSize.h / 2;
          return (
            <g opacity={alpha}>
              <line x1={cx-s[1]/2} y1={y0-spacing/2} x2={cx+s[1]/2} y2={y0-spacing/2} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={cx-s[0]/2} y1={y0+spacing/2} x2={cx+s[0]/2} y2={y0+spacing/2} stroke={PASTEL.mint} strokeWidth={3} />
              {/* Angle indicator */}
              <text x={cx} y={y0+spacing*1.5} textAnchor="middle" fill={PASTEL.coral} fontSize={12}
                fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                ∠ = {triangle.sasData?.angle}°
              </text>
            </g>
          );
        }
        if (animPhase === 1) {
          // Phase 1: Two sides move to B and join at the angle
          const t = ease((animProgress-0.25)/0.25);
          const bx = B.x, by = B.y;
          // Side b (AB) goes from B upward at angle
          const angAB = Math.atan2(A.y-B.y, A.x-B.x);
          const angBC = Math.atan2(C.y-B.y, C.x-B.x);
          // Animate from vertical to target angle
          const curAngL = lerp({x:-Math.PI/2,y:0},{x:angAB,y:0},t).x;
          const curAngR = lerp({x:-Math.PI/2+0.3,y:0},{x:angBC,y:0},t).x;
          const sAB = dist(A,B), sBC = dist(B,C);
          const lx = bx+sAB*Math.cos(curAngL), ly = by+sAB*Math.sin(curAngL);
          const rx = bx+sBC*Math.cos(curAngR), ry = by+sBC*Math.sin(curAngR);
          return (
            <g>
              <line x1={bx} y1={by} x2={lx} y2={ly} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={bx} y1={by} x2={rx} y2={ry} stroke={PASTEL.mint} strokeWidth={3} />
              <circle cx={bx} cy={by} r={5} fill={PASTEL.coral} />
            </g>
          );
        }
        if (animPhase >= 2) {
          // Phase 2-3: Third side connects the two endpoints
          const t = Math.min((animProgress-0.5)/0.35, 1);
          const eased = ease(t);
          const sAB = dist(A,B), sBC = dist(B,C);
          const angAB = Math.atan2(A.y-B.y, A.x-B.x);
          const angBC = Math.atan2(C.y-B.y, C.x-B.x);
          const endA = {x:B.x+sAB*Math.cos(angAB), y:B.y+sAB*Math.sin(angAB)};
          const endC = {x:B.x+sBC*Math.cos(angBC), y:B.y+sBC*Math.sin(angBC)};
          // Draw the closing side with growing animation
          const closeMid = lerp(endA, endC, 0.5);
          const closeStart = lerp(closeMid, endA, eased);
          const closeEnd = lerp(closeMid, endC, eased);
          return (
            <g>
              <line x1={B.x} y1={B.y} x2={endA.x} y2={endA.y} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={B.x} y1={B.y} x2={endC.x} y2={endC.y} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={closeStart.x} y1={closeStart.y} x2={closeEnd.x} y2={closeEnd.y} stroke={PASTEL.coral} strokeWidth={3} />
              <circle cx={B.x} cy={B.y} r={5} fill={PASTEL.coral} />
              {animPhase===3 && <>
                <circle cx={endA.x} cy={endA.y} r={5} fill={PASTEL.coral} />
                <circle cx={endC.x} cy={endC.y} r={5} fill={PASTEL.coral} />
              </>}
            </g>
          );
        }
      }

      if (mode === "asa") {
        // ASA: Base appears → angles extend from both endpoints → meet at apex
        if (animPhase === 0) {
          // Phase 0: Base (BC) appears
          const alpha = Math.min(animProgress / 0.2, 1);
          return (
            <g opacity={alpha}>
              <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={PASTEL.coral} strokeWidth={3} />
              <circle cx={B.x} cy={B.y} r={4} fill={PASTEL.coral} />
              <circle cx={C.x} cy={C.y} r={4} fill={PASTEL.coral} />
            </g>
          );
        }
        if (animPhase === 1 || animPhase >= 2) {
          // Phase 1-2: Two lines extend from B and C at their angles, growing toward A
          const t1 = Math.min((animProgress-0.25)/0.5, 1);
          const eased = ease(Math.max(0, t1));
          const angBA = Math.atan2(A.y-B.y, A.x-B.x);
          const angCA = Math.atan2(A.y-C.y, A.x-C.x);
          const maxLenB = dist(B, A), maxLenC = dist(C, A);
          const curLenB = maxLenB * eased, curLenC = maxLenC * eased;
          const endB = {x: B.x+curLenB*Math.cos(angBA), y: B.y+curLenB*Math.sin(angBA)};
          const endC2 = {x: C.x+curLenC*Math.cos(angCA), y: C.y+curLenC*Math.sin(angCA)};
          // Angle arcs at B and C
          const arcR = 20;
          const angBC_B = Math.atan2(C.y-B.y, C.x-B.x);
          const angBC_C = Math.atan2(B.y-C.y, B.x-C.x);
          return (
            <g>
              <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={B.x} y1={B.y} x2={endB.x} y2={endB.y} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={C.x} y1={C.y} x2={endC2.x} y2={endC2.y} stroke={PASTEL.mint} strokeWidth={3} />
              {/* Angle arcs */}
              {eased > 0.1 && <>
                <path d={`M ${B.x+arcR*Math.cos(angBC_B)} ${B.y+arcR*Math.sin(angBC_B)} A ${arcR} ${arcR} 0 0 0 ${B.x+arcR*Math.cos(angBA)} ${B.y+arcR*Math.sin(angBA)}`}
                  fill="none" stroke={PASTEL.sky} strokeWidth={2} opacity={0.7} />
                <path d={`M ${C.x+arcR*Math.cos(angBC_C)} ${C.y+arcR*Math.sin(angBC_C)} A ${arcR} ${arcR} 0 0 1 ${C.x+arcR*Math.cos(angCA)} ${C.y+arcR*Math.sin(angCA)}`}
                  fill="none" stroke={PASTEL.mint} strokeWidth={2} opacity={0.7} />
              </>}
              <circle cx={B.x} cy={B.y} r={5} fill={PASTEL.coral} />
              <circle cx={C.x} cy={C.y} r={5} fill={PASTEL.coral} />
              {animPhase >= 2 && eased > 0.95 && (
                <circle cx={A.x} cy={A.y} r={5} fill={PASTEL.coral}>
                  <animate attributeName="r" values="3;7;5" dur="0.5s" fill="freeze" />
                </circle>
              )}
            </g>
          );
        }
      }
    }

    // --- Static triangle (after animation) ---
    return (
      <g>
        {/* Triangle fill */}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill={themeKey === "dark" ? "rgba(232,165,152,0.08)" : "rgba(232,165,152,0.12)"}
          stroke={theme.line}
          strokeWidth={2.5}
        />
        {/* Vertices */}
        {[A, B, C].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={buildPhase === "jedo" ? 14 : 6}
              fill={buildPhase === "jedo" ? "transparent" : PASTEL.coral}
              stroke={buildPhase === "jedo" ? PASTEL.lavender : "none"}
              strokeWidth={buildPhase === "jedo" ? 2 : 0}
              strokeDasharray={buildPhase === "jedo" ? "4 2" : "none"}
              style={{ cursor: buildPhase === "jedo" ? "pointer" : "default" }}
            />
            <circle cx={p.x} cy={p.y} r={4} fill={PASTEL.coral} />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fill={theme.text}
              fontSize={13} fontFamily="'Playfair Display', serif" fontWeight={700}>
              {["A", "B", "C"][i]}
            </text>
          </g>
        ))}
        {/* Edge labels + Angle arcs — visible only in modeSelect */}
        {buildPhase === "modeSelect" && (
          <g style={{ animation: "fadeIn 0.5s ease" }}>
            {/* Edge lengths */}
            {[[A, B, "c"], [B, C, "a"], [A, C, "b"]].map(([p1, p2, label], i) => {
              const mid = midpoint(p1, p2);
              const dx = p2.x - p1.x, dy = p2.y - p1.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const nx = -dy / len * 16, ny = dx / len * 16;
              const val = dist(p1, p2) / (triangle.scale || 1);
              return (
                <text key={`edge${i}`} x={mid.x + nx} y={mid.y + ny} textAnchor="middle"
                  fill={theme.textSec} fontSize={11} fontFamily="'Noto Serif KR', serif">
                  {label}={val.toFixed(1)}
                </text>
              );
            })}
            {/* Angle arcs + labels + right angle markers + callout for tight angles */}
            {[[A, B, C, "A"], [B, A, C, "B"], [C, A, B, "C"]].map(([vertex, p1, p2, label], i) => {
              const ang = angleAtVertex(vertex, p1, p2);
              const angDeg = ang * 180 / Math.PI;
              const isRightAngle = Math.abs(angDeg - 90) < 1.5;
              const isTight = angDeg < 35;
              const arcR = isTight ? 16 : 24;
              const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
              const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
              let startAngle = a1, endAngle = a2;
              let diff = endAngle - startAngle;
              if (diff < -Math.PI) diff += 2 * Math.PI;
              if (diff > Math.PI) diff -= 2 * Math.PI;
              const sweepFlag = diff > 0 ? 1 : 0;
              const midAngle = startAngle + diff / 2;
              const arcColor = [PASTEL.coral, PASTEL.sky, PASTEL.mint][i];

              if (isRightAngle) {
                const sqSize = 14;
                const u1 = { x: Math.cos(a1), y: Math.sin(a1) };
                const u2 = { x: Math.cos(a2), y: Math.sin(a2) };
                const corner1 = { x: vertex.x + u1.x*sqSize, y: vertex.y + u1.y*sqSize };
                const corner2 = { x: vertex.x + u1.x*sqSize + u2.x*sqSize, y: vertex.y + u1.y*sqSize + u2.y*sqSize };
                const corner3 = { x: vertex.x + u2.x*sqSize, y: vertex.y + u2.y*sqSize };
                // Label along the bisector direction, close to vertex
                const lblR = 38;
                const lblPos = { x: vertex.x + lblR*Math.cos(midAngle), y: vertex.y + lblR*Math.sin(midAngle) };
                return (
                  <g key={`ang${i}`}>
                    <path d={`M ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${corner3.x} ${corner3.y}`}
                      fill="none" stroke={arcColor} strokeWidth={1.8} opacity={0.9} />
                    <text x={lblPos.x} y={lblPos.y} textAnchor="middle"
                      dominantBaseline="central" fill={arcColor}
                      fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                      90°
                    </text>
                  </g>
                );
              }

              const arcStart = { x: vertex.x + arcR*Math.cos(startAngle), y: vertex.y + arcR*Math.sin(startAngle) };
              const arcEnd = { x: vertex.x + arcR*Math.cos(endAngle), y: vertex.y + arcR*Math.sin(endAngle) };

              if (isTight) {
                // Callout: short line from arc outward along bisector, staying near vertex
                const arcMid = { x: vertex.x + arcR*Math.cos(midAngle), y: vertex.y + arcR*Math.sin(midAngle) };
                const calloutR = arcR + 28; // only 28px beyond arc — stays close
                const calloutEnd = { x: vertex.x + calloutR*Math.cos(midAngle), y: vertex.y + calloutR*Math.sin(midAngle) };
                return (
                  <g key={`ang${i}`}>
                    <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
                      fill="none" stroke={arcColor} strokeWidth={2} opacity={0.8} />
                    <line x1={arcMid.x} y1={arcMid.y} x2={calloutEnd.x} y2={calloutEnd.y}
                      stroke={arcColor} strokeWidth={1} opacity={0.5} />
                    <circle cx={arcMid.x} cy={arcMid.y} r={1.5} fill={arcColor} opacity={0.6} />
                    <text x={calloutEnd.x} y={calloutEnd.y - 6} textAnchor="middle"
                      dominantBaseline="central" fill={arcColor}
                      fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                      {angDeg.toFixed(1)}°
                    </text>
                  </g>
                );
              }

              // Normal: label inside arc
              const labelR = arcR + 14;
              const labelPos = { x: vertex.x + labelR*Math.cos(midAngle), y: vertex.y + labelR*Math.sin(midAngle) };
              return (
                <g key={`ang${i}`}>
                  <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
                    fill="none" stroke={arcColor} strokeWidth={2} opacity={0.8} />
                  <text x={labelPos.x} y={labelPos.y} textAnchor="middle"
                    dominantBaseline="central" fill={arcColor}
                    fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                    {angDeg.toFixed(1)}°
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {/* Edge click highlights for jedo mode */}
        {buildPhase === "jedo" && [[A, B, "AB"], [B, C, "BC"], [A, C, "AC"]].map(([p1, p2, key], i) => {
          const mid = midpoint(p1, p2);
          const done = jedoLines.find(l => l.key === `perp_${key}`);
          return (
            <g key={`edge-hit-${i}`}>
              {/* Thick invisible hit area */}
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="transparent" strokeWidth={30}
                style={{ cursor: "pointer" }} />
              {/* Visible highlight on edge midpoint */}
              {!done && (
                <circle cx={mid.x} cy={mid.y} r={8}
                  fill="transparent" stroke={PASTEL.sky} strokeWidth={1.5}
                  strokeDasharray="3 2" opacity={0.7}>
                  <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {done && (
                <circle cx={mid.x} cy={mid.y} r={4} fill={PASTEL.sky} opacity={0.5} />
              )}
            </g>
          );
        })}
        {/* Jedo lines — extending beyond triangle */}
        {jedoLines.map((line, i) => (
          <line key={i} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            stroke={line.color} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7}
          />
        ))}
        {/* Center point */}
        {jedoCenter && (
          <g style={{ cursor: "pointer" }}>
            <circle cx={jedoCenter.x} cy={jedoCenter.y} r={12}
              fill="transparent" stroke={PASTEL.coral} strokeWidth={2}>
              {jedoLines.length >= 3 && (
                <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={jedoCenter.x} cy={jedoCenter.y} r={4} fill={PASTEL.coral} />
            <text x={jedoCenter.x + 16} y={jedoCenter.y - 8} fill={theme.text}
              fontSize={12} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
              {jedoType === "circum" ? "외심" : "내심"}
            </text>
            {/* Guide lines (gray leads) */}
            {jedoType === "circum" && jedoLines.length >= 3 && !jedoCircle && [A, B, C].map((p, i) => (
              <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={p.x} y2={p.y}
                stroke={theme.lineLight} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
            ))}
            {jedoType === "in" && jedoLines.length >= 3 && !jedoCircle && [[A, B], [B, C], [A, C]].map(([p1, p2], i) => {
              const cp = closestPointOnLine(jedoCenter, p1, p2);
              return (
                <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={cp.x} y2={cp.y}
                  stroke={theme.lineLight} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
              );
            })}
          </g>
        )}
        {/* Circle */}
        {jedoCircle && (
          <circle cx={jedoCircle.cx} cy={jedoCircle.cy} r={jedoCircle.r}
            fill="none" stroke={jedoType === "circum" ? PASTEL.sky : PASTEL.lavender}
            strokeWidth={2} opacity={0.8}>
            <animate attributeName="r" from="0" to={jedoCircle.r} dur="0.8s" fill="freeze" />
          </circle>
        )}
      </g>
    );
  };

  // ============ SCREENS ============

  // --- Login Screen ---
  if (screen === "login") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${PASTEL.cream} 0%, ${PASTEL.blush} 30%, ${PASTEL.lilac} 60%, ${PASTEL.sky} 100%)`,
        fontFamily: "'Playfair Display', serif", position: "relative", overflow: "hidden",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes gentlePulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
          input:focus { outline: none; border-color: ${PASTEL.coral} !important; box-shadow: 0 0 0 3px rgba(232,165,152,0.2); }
        `}</style>

        {/* Decorative elements */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [40, 60, 30, 50, 45, 35, 55, 25, 70, 40, 50, 35][i],
            height: [40, 60, 30, 50, 45, 35, 55, 25, 70, 40, 50, 35][i],
            borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "4px" : "50% 0 50% 0",
            background: [PASTEL.pink, PASTEL.mint, PASTEL.lavender, PASTEL.yellow, PASTEL.sky, PASTEL.peach, PASTEL.sage, PASTEL.coral, PASTEL.lilac, PASTEL.blush, PASTEL.dustyRose, PASTEL.cream][i],
            opacity: 0.25,
            top: `${[8, 15, 60, 75, 25, 85, 40, 10, 55, 70, 30, 90][i]}%`,
            left: `${[5, 80, 10, 85, 50, 30, 75, 40, 90, 15, 65, 55][i]}%`,
            animation: `float ${3 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}

        {/* Main card */}
        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          borderRadius: 28, padding: "48px 40px", width: "min(380px, 90vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)",
          animation: "fadeIn 0.8s ease", zIndex: 10, textAlign: "center",
        }}>
          <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 6, color: PASTEL.dustyRose, textTransform: "uppercase" }}>
            welcome to
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 700, color: "#4A3F35", margin: "0 0 6px 0",
            fontFamily: "'Playfair Display', serif",
          }}>
            ashrain.out
          </h1>
          <p style={{ fontSize: 13, color: "#8B7E74", margin: "0 0 36px 0", fontFamily: "'Noto Serif KR', serif", fontStyle: "italic" }}>
            기하학의 아름다움을 만나다
          </p>

          <input
            type="text" placeholder="아이디"
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${PASTEL.blush}`, fontSize: 14, marginBottom: 12,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />
          <input
            type="password" placeholder="비밀번호"
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${PASTEL.blush}`, fontSize: 14, marginBottom: 24,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />

          <button
            onClick={() => { setUser({ name: "학생" }); setScreen("menu"); }}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", letterSpacing: 1,
              transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(232,165,152,0.3)",
            }}
            onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={e => e.target.style.transform = "translateY(0)"}
          >
            로그인
          </button>
        </div>

        <p style={{
          marginTop: 24, fontSize: 11, color: "rgba(74,63,53,0.5)", zIndex: 10,
          fontFamily: "'Playfair Display', serif", letterSpacing: 2,
        }}>
          © 2026 ashrain.out
        </p>
      </div>
    );
  }

  // --- Shared UI Helpers ---
  const ScreenWrap = ({ children, title, back, backTo }) => (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }`}</style>
      {title && (
        <div style={{ display:"flex", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${theme.border}` }}>
          {back && <button onClick={() => { playSfx("click"); setScreen(backTo||"menu"); }} style={{ background:"none", border:"none", color:theme.textSec, fontSize:13, cursor:"pointer", fontFamily:"'Noto Serif KR', serif" }}>← {back}</button>}
          <span style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:700, color:theme.text, fontFamily:"'Playfair Display', serif" }}>{title}</span>
          {back && <span style={{width:40}} />}
        </div>
      )}
      {children}
    </div>
  );

  const MenuGrid = ({ items, cols = 2 }) => (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:14, width:"min(440px,90vw)", padding:"0 16px", margin:"0 auto" }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { playSfx("click"); item.action?.(); }} disabled={item.disabled} style={{
          background: theme.card, border:`1.5px solid ${theme.border}`, borderRadius:20,
          padding: item.compact ? "18px 14px" : "24px 14px", cursor: item.disabled ? "default" : "pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap:6,
          transition:"all 0.3s ease", animation:`fadeIn ${0.3+i*0.08}s ease`,
          opacity: item.disabled ? 0.4 : 1,
          boxShadow:`0 4px 15px rgba(0,0,0,${themeKey==="dark"?"0.2":"0.04"})`,
        }}
          onMouseOver={e => { if(!item.disabled) { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor=PASTEL.coral; }}}
          onMouseOut={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor=theme.border; }}
        >
          <span style={{ fontSize: item.compact ? 22 : 28, animation:`float ${3+i*0.2}s ease-in-out infinite` }}>{item.icon}</span>
          <span style={{ fontSize: item.compact ? 13 : 15, fontWeight:700, color:theme.text }}>{item.label}</span>
          {item.desc && <span style={{ fontSize:11, color:theme.textSec, textAlign:"center" }}>{item.desc}</span>}
          {item.disabled && <span style={{ fontSize:10, color:PASTEL.coral }}>준비 중</span>}
        </button>
      ))}
    </div>
  );

  // --- Menu Screen ---
  if (screen === "menu") {
    const menuItems = [
      { icon: "📖", label: "공부하기", desc: "기하학 개념 학습", action: () => setScreen("study") },
      { icon: "◎", label: "아카이브", desc: "나만의 작품 갤러리", disabled: true },
      { icon: "♡", label: "피드백", desc: "선생님과 소통하세요", disabled: true },
      { icon: "✦", label: "설정", desc: "테마, 알림, 말투 모드", action: () => setScreen("settings") },
    ];
    if (isAdmin) menuItems.push({ icon: "🔧", label: "관리자", desc: "대사·효과음 관리", action: () => setScreen("admin") });

    return (
      <ScreenWrap>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", marginBottom:40, animation:"fadeIn 0.6s ease" }}>
            <div style={{ fontSize:11, letterSpacing:6, color:theme.textSec, textTransform:"uppercase", marginBottom:8 }}>geometry atelier</div>
            <h1 style={{ fontSize:32, color:theme.text, margin:0, fontFamily:"'Playfair Display', serif" }}>ashrain.out</h1>
          </div>
          <MenuGrid items={menuItems} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Study Screen (공부하기) ---
  if (screen === "study") {
    const categories = [
      { icon: "⬡", label: "다각형과 원", desc: "삼각형, 외심, 내심", action: () => setScreen("polygons") },
    ];
    return (
      <ScreenWrap title="공부하기" back="메뉴" backTo="menu">
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MenuGrid items={categories} cols={1} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Polygons & Circles Screen (다각형과 원) ---
  if (screen === "polygons") {
    const topics = [
      { icon: "△", label: "삼각형 작도", desc: "SSS · SAS · ASA", compact: true,
        action: () => { setScreen("draw"); setBuildPhase("input"); setTriMode("sss"); } },
      { icon: "⊙⊙", label: "외접원 옆에 내접원", desc: "두 원의 관계", compact: true, disabled: true },
      { icon: "O · I", label: "외심 옆에 내심", desc: "두 중심의 비교", compact: true, disabled: true },
      { icon: "▲", label: "이등변삼각형", desc: "성질과 활용", compact: true, disabled: true },
      { icon: "∟≅", label: "직각삼각형의 합동", desc: "RHA · RHS", compact: true, disabled: true },
    ];
    return (
      <ScreenWrap title="다각형과 원" back="공부하기" backTo="study">
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <p style={{ fontSize:12, color:theme.textSec, textAlign:"center", margin:"20px 0 0 0" }}>중1-2 · 중2-2 기하 단원</p>
          <MenuGrid items={topics} cols={2} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Admin Screen ---
  if (screen === "admin") {
    const adminItems = [
      { icon: "💬", label: "대사 스크립트", desc: "말투별 대사 수정", action: () => setScreen("admin-scripts") },
      { icon: "🔊", label: "효과음 관리", desc: "모드별 효과음 설정", disabled: true },
      { icon: "👤", label: "학생 관리", desc: "계정 · 비밀번호", disabled: true },
      { icon: "📊", label: "통계/랭킹", desc: "진행 현황 확인", disabled: true },
    ];
    return (
      <ScreenWrap title="관리자" back="메뉴" backTo="menu">
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MenuGrid items={adminItems} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Admin Script Editor ---
  if (screen === "admin-scripts") {
    const [editTone, setEditTone] = useState(toneKey);
    const currentScript = customScripts[editTone]?.guide || {};
    const scriptKeys = Object.keys(TONES.default.guide);
    const scriptLabels = {
      compassStart: "컴퍼스 선택 시",
      rulerFirst: "자 먼저 선택 시",
      oneEdge: "1변 지나침",
      twoEdge: "2변 지나침",
      backToOne: "다시 1변",
      tooShort: "거리 너무 짧음",
      remainAuto: "나머지 자동 그리기 제안",
      earlyCenter: "3개 전 중심 클릭",
      circleDef: "원의 정의",
      triangleFail: "삼각형 성립 불가",
      selectEdge: "제도 모드 안내",
    };

    const updateScript = (key, value) => {
      setCustomScripts(prev => ({
        ...prev,
        [editTone]: {
          ...prev[editTone],
          guide: { ...prev[editTone].guide, [key]: value }
        }
      }));
    };

    const resetToDefault = () => {
      setCustomScripts(prev => ({
        ...prev,
        [editTone]: JSON.parse(JSON.stringify(TONES[editTone]))
      }));
    };

    return (
      <ScreenWrap title="대사 스크립트 편집" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Tone selector tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[["default","기본"],["nagging","잔소리"],["cute","더러운"]].map(([k,label]) => (
              <button key={k} onClick={() => setEditTone(k)} style={{
                flex:1, padding:"10px", borderRadius:12,
                border:`2px solid ${editTone===k?PASTEL.coral:theme.border}`,
                background:editTone===k?theme.accentSoft:theme.card,
                color:theme.text, fontSize:13, fontWeight:editTone===k?700:400,
                cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
              }}>{label}</button>
            ))}
          </div>

          {/* Script entries */}
          {scriptKeys.map((key, i) => (
            <div key={key} style={{
              marginBottom:14, background:theme.card, borderRadius:14,
              border:`1px solid ${theme.border}`, padding:"14px",
              animation:`fadeIn ${0.2+i*0.03}s ease`,
            }}>
              <label style={{ fontSize:11, color:PASTEL.coral, fontWeight:700, display:"block", marginBottom:6 }}>
                {scriptLabels[key] || key}
              </label>
              <textarea
                value={currentScript[key] || ""}
                onChange={e => updateScript(key, e.target.value)}
                rows={2}
                style={{
                  width:"100%", padding:"10px", borderRadius:10,
                  border:`1px solid ${theme.border}`, background:theme.bg,
                  color:theme.text, fontSize:13, fontFamily:"'Noto Serif KR', serif",
                  resize:"vertical", boxSizing:"border-box", lineHeight:1.5,
                }}
              />
            </div>
          ))}

          {/* Reset button */}
          <button onClick={resetToDefault} style={{
            width:"100%", padding:"14px", borderRadius:14,
            border:`1.5px solid ${theme.border}`, background:theme.card,
            color:theme.textSec, fontSize:13, cursor:"pointer",
            fontFamily:"'Noto Serif KR', serif", marginBottom:60,
          }}>
            이 모드 대사 초기화
          </button>
        </div>
      </ScreenWrap>
    );
  }

  // --- Settings Screen ---
  if (screen === "settings") {
    const SliderRow = ({ label, value, onChange, icon }) => (
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:12, color:theme.text, width:50 }}>{label}</span>
        <input type="range" min="0" max="100" value={value*100}
          onChange={e => onChange(parseInt(e.target.value)/100)}
          style={{ flex:1, accentColor:PASTEL.coral }} />
        <span style={{ fontSize:11, color:theme.textSec, width:30 }}>{Math.round(value*100)}%</span>
      </div>
    );

    return (
      <ScreenWrap title="설정" back="메뉴" backTo="menu">
        <div style={{ flex:1, overflowY:"auto", padding:"20px", WebkitOverflowScrolling:"touch" }}>
          <div style={{ maxWidth:400, margin:"0 auto" }}>

            {/* Theme */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.5s ease" }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>테마</label>
              <div style={{ display:"flex", gap:10 }}>
                {[["light","라이트"],["dark","다크"]].map(([key,label]) => (
                  <button key={key} onClick={() => setThemeKey(key)} style={{
                    flex:1, padding:"12px", borderRadius:14,
                    border:`2px solid ${themeKey===key?PASTEL.coral:theme.border}`,
                    background:themeKey===key?theme.accentSoft:theme.card,
                    color:theme.text, fontSize:13, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif", fontWeight:themeKey===key?700:400,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.6s ease" }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>말투 모드</label>
              <div style={{ display:"flex", gap:10 }}>
                {[["default","기본"],["nagging","잔소리"],["cute","더러운"]].map(([key,label]) => (
                  <button key={key} onClick={() => setToneKey(key)} style={{
                    flex:1, padding:"12px", borderRadius:14,
                    border:`2px solid ${toneKey===key?PASTEL.coral:theme.border}`,
                    background:toneKey===key?theme.accentSoft:theme.card,
                    color:theme.text, fontSize:13, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif", fontWeight:toneKey===key?700:400,
                  }}>{label}</button>
                ))}
              </div>
              <p style={{ fontSize:11, color:theme.textSec, marginTop:8 }}>
                {toneKey==="default"&&"일반 안내는 친절하게, 오류만 잔소리로!"}
                {toneKey==="nagging"&&"전부 다 잔소리 모드!! 각오하세요!!"}
                {toneKey==="cute"&&"앙~ 전부 애교 모드에요~♡"}
              </p>
            </div>

            {/* Audio */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.7s ease", background:theme.card, borderRadius:16, border:`1px solid ${theme.border}`, padding:20 }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:16, display:"block" }}>오디오</label>
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                <button onClick={() => setBgmOn(!bgmOn)} style={{
                  flex:1, padding:"10px", borderRadius:12,
                  border:`1.5px solid ${bgmOn?PASTEL.mint:theme.border}`,
                  background:bgmOn?`${PASTEL.mint}20`:theme.card,
                  color:theme.text, fontSize:12, cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
                }}>🎵 배경음악 {bgmOn?"ON":"OFF"}</button>
                <button onClick={() => { setSfxOn(!sfxOn); if(!sfxOn) playSfx("pop"); }} style={{
                  flex:1, padding:"10px", borderRadius:12,
                  border:`1.5px solid ${sfxOn?PASTEL.sky:theme.border}`,
                  background:sfxOn?`${PASTEL.sky}20`:theme.card,
                  color:theme.text, fontSize:12, cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
                }}>🔊 효과음 {sfxOn?"ON":"OFF"}</button>
              </div>
              {bgmOn && <SliderRow label="배경음악" value={bgmVol} onChange={setBgmVol} icon="🎵" />}
              {sfxOn && <SliderRow label="효과음" value={sfxVol} onChange={setSfxVol} icon="🔊" />}
            </div>

            {/* Nickname */}
            <div style={{ padding:20, borderRadius:16, background:theme.card, border:`1px solid ${theme.border}`, animation:"fadeIn 0.8s ease", marginBottom:28 }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>닉네임</label>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input defaultValue="학생" style={{
                  flex:1, padding:"10px 14px", borderRadius:10,
                  border:`1.5px solid ${theme.border}`, background:theme.bg,
                  color:theme.text, fontSize:14, fontFamily:"'Noto Serif KR', serif",
                }} />
                <span style={{ fontSize:11, color:theme.textSec, whiteSpace:"nowrap" }}>2주마다 변경 가능</span>
              </div>
            </div>

            {/* Admin toggle (hidden) */}
            <div style={{ textAlign:"center", marginBottom:60 }}>
              <button onClick={() => setIsAdmin(!isAdmin)} style={{
                background:"none", border:"none", color:theme.textSec, fontSize:11,
                cursor:"pointer", fontFamily:"'Noto Serif KR', serif", opacity:0.4,
              }}>
                {isAdmin ? "🔧 관리자 모드 해제" : "관리자 모드 활성화"}
              </button>
            </div>
          </div>
        </div>
      </ScreenWrap>
    );
  }

  // --- Draw Screen ---
  if (screen === "draw") {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: theme.bg, fontFamily: "'Noto Serif KR', serif",
        transition: "background 0.5s ease", overflow: "hidden",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
          input:focus { outline: none; border-color: ${PASTEL.coral} !important; }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${theme.border}`,
        }}>
          <button onClick={() => { resetAll(); setScreen("polygons"); }} style={{
            background: "none", border: "none", color: theme.textSec, fontSize: 13,
            cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
          }}>← 목록</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>
            삼각형 그리기
          </span>
          <button onClick={resetAll} style={{
            background: "none", border: "none", color: theme.textSec, fontSize: 12,
            cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
          }}>초기화</button>
        </div>

        {/* Mode tabs */}
        {buildPhase === "input" && (
          <div style={{ display: "flex", gap: 8, padding: "12px 20px", animation: "fadeIn 0.4s ease" }}>
            {[["sss", "SSS"], ["sas", "SAS"], ["asa", "ASA"]].map(([key, label]) => (
              <button key={key} onClick={() => setTriMode(key)} style={{
                padding: "8px 20px", borderRadius: 12, fontSize: 13,
                border: `1.5px solid ${triMode === key ? PASTEL.coral : theme.border}`,
                background: triMode === key ? theme.accentSoft : theme.card,
                color: theme.text, cursor: "pointer", fontWeight: triMode === key ? 700 : 400,
                fontFamily: "'Playfair Display', serif", transition: "all 0.3s ease",
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* Fixed SVG Canvas Container */}
        <div ref={svgContainerRef} style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 16px", position: "relative",
          flex: "0 0 auto",
          background: theme.bg,
        }}>
          <FloatingMsg msg={floatingMsg} theme={theme} />

          {/* Canvas collapse/expand toggle */}
          {triangle && buildPhase !== "animating" && buildPhase !== "input" && (
            <button onClick={() => setCanvasCollapsed(prev => !prev)} style={{
              alignSelf: "flex-end", background: "none", border: `1px solid ${theme.border}`,
              borderRadius: 8, padding: "4px 10px", fontSize: 11, color: theme.textSec,
              cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
              marginBottom: 4, transition: "all 0.3s ease",
            }}>
              {canvasCollapsed ? "캔버스 펼치기 ▼" : "캔버스 접기 ▲"}
            </button>
          )}

          {/* View reset button */}
          {manualView && (
            <button onClick={resetView} style={{
              alignSelf: "flex-end", background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 8, padding: "4px 10px", fontSize: 11, color: theme.textSec,
              cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
              marginBottom: 4,
            }}>
              뷰 초기화 ↺
            </button>
          )}

          <svg ref={svgRef} width={svgSize.w}
            height={canvasCollapsed ? Math.max(svgSize.h * 0.45, 180) : svgSize.h}
            viewBox={`${getActiveVB().x} ${getActiveVB().y} ${getActiveVB().w} ${getActiveVB().h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              background: theme.svgBg, borderRadius: canvasCollapsed ? 12 : 20,
              border: `1.5px solid ${showProperties && selectedProp ? getProperties().find(p=>p.id===selectedProp)?.color || theme.border : theme.border}`,
              boxShadow: `0 4px 20px rgba(0,0,0,${themeKey === "dark" ? "0.2" : "0.05"})`,
              cursor: buildPhase === "jedo" ? "crosshair" : "default",
              transition: "height 0.4s ease, border-color 0.3s ease, border-radius 0.3s ease",
              width: "100%", maxWidth: svgSize.w,
              touchAction: "none",
            }}
            onClick={handleJedoClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grid dots */}
            {[...Array(Math.floor(svgSize.w / 30))].map((_, i) =>
              [...Array(Math.floor(svgSize.h / 30))].map((_, j) => (
                <circle key={`${i}-${j}`} cx={15 + i * 30} cy={15 + j * 30} r={0.8}
                  fill={theme.lineLight} opacity={0.3} />
              ))
            )}

            {renderTriangleAnim()}

            {/* Property highlight overlay */}
            {showProperties && renderHighlight()}

            {/* Fail animation */}
            {failAnim && (
              <text x={svgSize.w / 2} y={svgSize.h / 2} textAnchor="middle"
                fill={PASTEL.coral} fontSize={14} fontFamily="'Noto Serif KR', serif"
                opacity={0.8}>
                ✕ 삼각형 불가
              </text>
            )}
          </svg>

          {/* Jedo guide message */}
          {buildPhase === "jedo" && !jedoCircle && jedoLines.length === 0 && (
            <div style={{
              marginTop: 12, padding: "10px 20px", borderRadius: 12,
              background: theme.card, border: `1px solid ${theme.border}`,
              fontSize: 13, color: theme.text, textAlign: "center",
              animation: "fadeIn 0.5s ease", whiteSpace: "pre-line",
            }}>
              {activeTone.guide.selectEdge}
            </div>
          )}

          {/* Properties button */}
          {jedoCircle && !showProperties && (
            <button onClick={() => {
              setShowProperties(true);
              setSelectedProp(null);
            }} style={{
              marginTop: 12, padding: "12px 28px", borderRadius: 14,
              border: `1.5px solid ${PASTEL.coral}`, background: theme.card,
              color: theme.text, fontSize: 14, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
              animation: "fadeIn 0.5s ease", transition: "all 0.3s ease",
            }}
              onMouseOver={e => e.target.style.background = theme.accentSoft}
              onMouseOut={e => e.target.style.background = theme.card}
            >
              ✦ 성질 확인하기
            </button>
          )}
        </div>

        {/* Scrollable Properties List — only this scrolls */}
        {showProperties && (
          <div ref={scrollContainerRef} style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            borderTop: `1px solid ${theme.border}`,
          }}>
            <div style={{
              padding: "12px 16px 120px 16px",
              animation: "fadeIn 0.5s ease",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 12, padding: "0 4px",
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>
                  ✦ {jedoType === "circum" ? "외심 & 외접원" : "내심 & 내접원"} 성질
                </span>
                <button onClick={() => { setShowProperties(false); setSelectedProp(null); }} style={{
                  background: "none", border: "none", color: theme.textSec, fontSize: 12,
                  cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
                }}>접기 ▲</button>
              </div>
              {getProperties().map((item, i) => {
                const isSelected = selectedProp === item.id;
                return (
                  <button key={item.id} onClick={() => {
                    setSelectedProp(isSelected ? null : item.id);
                  }} style={{
                    width: "100%", textAlign: "left",
                    padding: "14px 18px", marginBottom: 8, borderRadius: 14,
                    background: isSelected ? (themeKey === "dark" ? `${item.color}15` : `${item.color}20`) : theme.card,
                    border: `2px solid ${isSelected ? item.color : theme.border}`,
                    cursor: "pointer", transition: "all 0.3s ease",
                    boxShadow: isSelected ? `0 2px 12px ${item.color}30` : "none",
                    display: "flex", alignItems: "center", gap: 12,
                    animation: `fadeIn ${0.3 + i * 0.05}s ease`,
                  }}>
                    <div style={{
                      width: 6, minHeight: 32, borderRadius: 3,
                      background: item.color, opacity: isSelected ? 1 : 0.5,
                      transition: "opacity 0.3s ease",
                    }} />
                    <div>
                      <div style={{
                        fontSize: 13, color: isSelected ? item.color : theme.text,
                        fontWeight: item.bold ? 700 : 500,
                        fontFamily: "'Noto Serif KR', serif",
                        lineHeight: 1.6, transition: "color 0.3s ease",
                      }}>
                        {item.text}
                      </div>
                      {isSelected && (
                        <div style={{
                          fontSize: 11, color: theme.textSec, marginTop: 4,
                          fontFamily: "'Noto Serif KR', serif",
                        }}>
                          ↑ 위 도형에서 확인하세요
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Panel */}
        {buildPhase === "input" && triMode === "sss" && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[["a", "변 a"], ["b", "변 b"], ["c", "변 c"]].map(([key, label]) => (
                <div key={key} style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: theme.textSec, marginBottom: 4, display: "block" }}>{label}</label>
                  <input type="number" value={sssInput[key]}
                    onChange={e => setSssInput(p => ({ ...p, [key]: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 10,
                      border: `1.5px solid ${theme.border}`, background: theme.bg,
                      color: theme.text, fontSize: 15, textAlign: "center",
                      fontFamily: "'Playfair Display', serif", boxSizing: "border-box",
                      transition: "all 0.3s ease",
                    }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button onClick={handleSSSSubmit} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", letterSpacing: 1,
              transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(232,165,152,0.3)",
            }}>
              생성하기
            </button>
          </div>
        )}

        {buildPhase === "input" && triMode === "sas" && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[["b", "변 b"], ["angle", "끼인각 (°)"], ["c", "변 c"]].map(([key, label]) => (
                <div key={key} style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: theme.textSec, marginBottom: 4, display: "block" }}>{label}</label>
                  <input type="number" value={sssInput[key] || ""}
                    onChange={e => setSssInput(p => ({ ...p, [key]: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 10,
                      border: `1.5px solid ${theme.border}`, background: theme.bg,
                      color: theme.text, fontSize: 15, textAlign: "center",
                      fontFamily: "'Playfair Display', serif", boxSizing: "border-box",
                    }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => {
              const b = parseFloat(sssInput.b), c = parseFloat(sssInput.c), ang = parseFloat(sssInput.angle);
              if (!b || !c || !ang || ang >= 180 || ang <= 0) {
                showMsg(activeTone.guide.triangleFail, 2500);
                return;
              }
              const rad = ang * Math.PI / 180;
              const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad));
              const tri = generateTriangle(a, b, c);
              if (!tri) { showMsg(activeTone.guide.triangleFail, 2500); return; }
              setTriangle({ ...tri, mode: "sas", sasData: { b, c, angle: ang } });
              setBuildPhase("animating");
            }} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>
              생성하기
            </button>
          </div>
        )}

        {buildPhase === "input" && triMode === "asa" && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[["angB", "∠B (°)"], ["a", "변 a"], ["angC", "∠C (°)"]].map(([key, label]) => (
                <div key={key} style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: theme.textSec, marginBottom: 4, display: "block" }}>{label}</label>
                  <input type="number" value={sssInput[key] || ""}
                    onChange={e => setSssInput(p => ({ ...p, [key]: e.target.value }))}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 10,
                      border: `1.5px solid ${theme.border}`, background: theme.bg,
                      color: theme.text, fontSize: 15, textAlign: "center",
                      fontFamily: "'Playfair Display', serif", boxSizing: "border-box",
                    }}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => {
              const a = parseFloat(sssInput.a), angB = parseFloat(sssInput.angB), angC = parseFloat(sssInput.angC);
              if (!a || !angB || !angC || angB + angC >= 180) {
                showMsg(activeTone.guide.triangleFail, 2500);
                return;
              }
              const angA = 180 - angB - angC;
              const radA = angA * Math.PI / 180, radB = angB * Math.PI / 180;
              const b = a * Math.sin(radB) / Math.sin(radA);
              const c = a * Math.sin(angC * Math.PI / 180) / Math.sin(radA);
              const tri = generateTriangle(a, b, c);
              if (!tri) { showMsg(activeTone.guide.triangleFail, 2500); return; }
              setTriangle({ ...tri, mode: "asa", asaData: { a, angB, angC } });
              setBuildPhase("animating");
            }} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>
              생성하기
            </button>
          </div>
        )}

        {/* Mode Selection */}
        {buildPhase === "modeSelect" && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.5s ease",
          }}>
            <p style={{ fontSize: 13, color: theme.textSec, textAlign: "center", marginBottom: 14 }}>
              삼각형이 완성되었어요! 모드를 선택하세요.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => {
                setBuildPhase("jedo");
                showMsg(activeTone.guide.selectEdge, 3000);
              }} style={{
                flex: 1, padding: "16px", borderRadius: 16,
                border: `2px solid ${PASTEL.sky}`, background: theme.card,
                color: theme.text, fontSize: 15, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                transition: "all 0.3s ease",
              }}
                onMouseOver={e => e.target.style.background = theme.accentSoft}
                onMouseOut={e => e.target.style.background = theme.card}
              >
                📐 제도
                <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>터치로 자동 작도</span>
              </button>
              <button onClick={() => {
                setBuildPhase("jakdo");
                showMsg(activeTone.guide.compassStart, 2500);
              }} style={{
                flex: 1, padding: "16px", borderRadius: 16,
                border: `2px solid ${PASTEL.lavender}`, background: theme.card,
                color: theme.text, fontSize: 15, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                transition: "all 0.3s ease",
              }}
                onMouseOver={e => e.target.style.background = theme.accentSoft}
                onMouseOut={e => e.target.style.background = theme.card}
              >
                🔵 작도
                <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>컴퍼스 + 자</span>
              </button>
            </div>
          </div>
        )}

        {/* Jakdo placeholder */}
        {buildPhase === "jakdo" && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.5s ease",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 14, color: theme.text, marginBottom: 12 }}>작도 모드</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={{
                padding: "14px 28px", borderRadius: 14,
                border: `2px solid ${PASTEL.sky}`, background: theme.card,
                color: theme.text, fontSize: 14, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
              }}>
                🔵 컴퍼스
              </button>
              <button onClick={() => showMsg(activeTone.guide.rulerFirst, 2000)} style={{
                padding: "14px 28px", borderRadius: 14,
                border: `2px solid ${theme.border}`, background: theme.card,
                color: theme.textSec, fontSize: 14, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}>
                📏 눈금없는 자
              </button>
            </div>
            <p style={{ fontSize: 11, color: theme.textSec, marginTop: 12 }}>
              ✦ 작도 모드는 다음 업데이트에서 완전히 구현됩니다
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
