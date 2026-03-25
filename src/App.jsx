import { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";

// ============================================================
// ashrain.out — Interactive Geometry Education App (v2.4)
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
  // Limit to just beyond triangle bounds (not infinite)
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 0.8;
  return { start: { x: mid.x - nx * len, y: mid.y - ny * len }, end: { x: mid.x + nx * len, y: mid.y + ny * len }, mid };
}

function angleBisector(vertex, p1, p2, triA, triB, triC) {
  const d1 = dist(vertex, p1), d2 = dist(vertex, p2);
  const u1 = { x: (p1.x - vertex.x) / d1, y: (p1.y - vertex.y) / d1 };
  const u2 = { x: (p2.x - vertex.x) / d2, y: (p2.y - vertex.y) / d2 };
  const bis = { x: u1.x + u2.x, y: u1.y + u2.y };
  const bisLen = Math.sqrt(bis.x ** 2 + bis.y ** 2);
  if (bisLen < 0.001) return null;
  // Limit to just beyond triangle
  const allPts = [triA, triB, triC];
  const maxDim = Math.max(
    Math.max(...allPts.map(p => p.x)) - Math.min(...allPts.map(p => p.x)),
    Math.max(...allPts.map(p => p.y)) - Math.min(...allPts.map(p => p.y))
  );
  const len = maxDim * 0.8;
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

// --- Freehand → Triangle Detector ---
function detectTriangleFromStroke(points, svgW, svgH) {
  if (points.length < 10) return null;
  const simplified = rdpSimplify(points, 8);
  if (simplified.length < 4) return null;
  const corners = findCorners(simplified, 25);
  if (corners.length < 3) return null;
  corners.sort((a, b) => b.angle - a.angle);
  const top3 = corners.slice(0, 3).sort((a, b) => a.idx - b.idx);
  const A = simplified[top3[0].idx];
  const B = simplified[top3[1].idx];
  const C = simplified[top3[2].idx];
  const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  if (area < 400) return null;
  const ab = dist(A, B), bc = dist(B, C), ac = dist(A, C);
  const minSide = Math.min(ab, bc, ac);
  if (minSide < 20) return null;
  const maxSide = Math.max(ab, bc, ac);
  if (maxSide >= ab + bc + ac - maxSide) return null;
  const maxS = Math.max(ab, bc, ac);
  const scale = maxS / 10;
  return {
    A: { x: A.x, y: A.y }, B: { x: B.x, y: B.y }, C: { x: C.x, y: C.y },
    sides: [ab / scale, bc / scale, ac / scale].sort((a, b) => a - b), scale,
  };
}
function rdpSimplify(pts, epsilon) {
  if (pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  const start = pts[0], end = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy;
    const d = lenSq === 0 ? dist(pts[i], start) :
      dist(pts[i], { x: start.x + ((pts[i].x-start.x)*dx+(pts[i].y-start.y)*dy)/lenSq*dx,
                      y: start.y + ((pts[i].x-start.x)*dx+(pts[i].y-start.y)*dy)/lenSq*dy });
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(pts.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}
function findCorners(pts, minAngleDeg) {
  const corners = [], minRad = minAngleDeg * Math.PI / 180;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i-1], cur = pts[i], next = pts[i+1];
    const a1 = Math.atan2(cur.y-prev.y, cur.x-prev.x);
    const a2 = Math.atan2(next.y-cur.y, next.x-cur.x);
    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2*Math.PI - diff;
    if (diff > minRad) corners.push({ idx: i, angle: diff });
  }
  return corners;
}

// --- Components ---

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: "monospace", background: "#1E1B18", color: "#E8A598", minHeight: "100vh" }}>
        <h2>ashrain.out 오류 발생</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 20, color: "#E8DDD4" }}>
          {this.state.error.message}
        </pre>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, marginTop: 10, color: "#9B8E82" }}>
          {this.state.error.stack}
        </pre>
        <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
          style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, background: "#E8A598", color: "white", border: "none", fontSize: 14, cursor: "pointer" }}>
          데이터 초기화 후 새로고침
        </button>
      </div>
    );
    return this.props.children;
  }
}

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
function AppInner() {
  // Session persistence
  const savedUser = useMemo(() => { try { return JSON.parse(localStorage.getItem("ar_user")); } catch { return null; } }, []);
  const savedScreen = useMemo(() => {
    const s = localStorage.getItem("ar_screen");
    return (savedUser && s && s !== "login") ? s : (savedUser ? "menu" : "login");
  }, [savedUser]);

  const [screen, setScreenRaw] = useState(savedScreen);
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem("ar_theme") || "light");
  const [toneKey, setToneKey] = useState(() => localStorage.getItem("ar_tone") || "default");
  const [user, setUser] = useState(savedUser);
  const [isAdmin, setIsAdmin] = useState(() => savedUser?.role === "admin");
  const theme = THEMES[themeKey];
  const tone = TONES[toneKey];

  // Screen setter with history + localStorage
  const setScreen = useCallback((s) => {
    setScreenRaw(s);
    localStorage.setItem("ar_screen", s);
    window.history.pushState({ screen: s }, "", `#${s}`);
  }, []);

  // Back button support
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state?.screen || "menu";
      setScreenRaw(s);
      localStorage.setItem("ar_screen", s);
    };
    window.addEventListener("popstate", onPop);
    // Set initial history state
    if (!window.history.state) window.history.replaceState({ screen: screen }, "", `#${screen}`);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Persist user login
  useEffect(() => {
    if (user) localStorage.setItem("ar_user", JSON.stringify(user));
    else localStorage.removeItem("ar_user");
  }, [user]);

  // Persist theme/tone
  useEffect(() => { localStorage.setItem("ar_theme", themeKey); }, [themeKey]);
  useEffect(() => { localStorage.setItem("ar_tone", toneKey); }, [toneKey]);

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

  // B-mode (multi-step drawing) state
  const [drawStep, setDrawStep] = useState(0); // 0=idle, 1=drawing lines, 2=drawing angles, 3=preview
  const [drawStrokes, setDrawStrokes] = useState([]); // completed strokes: [{start, end, length}]
  const [drawAngles, setDrawAngles] = useState([]); // completed angle marks: [{vertex, angle}]
  const [currentStroke, setCurrentStroke] = useState([]); // points of stroke in progress
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPreview, setDrawPreview] = useState(null); // {a,b,c} or {b,c,angle} etc

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

  // Screen-specific state (must be top-level for hooks rules)
  const [signupName, setSignupName] = useState("");
  const [signupId, setSignupId] = useState("");
  const [signupPw, setSignupPw] = useState("");
  const [signupPwConfirm, setSignupPwConfirm] = useState("");
  const [signupMsg, setSignupMsg] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState(() => { try { return JSON.parse(localStorage.getItem("ar_chat")) || []; } catch { return []; } });
  const [chatNotif, setChatNotif] = useState(true);
  const chatEndRef = useRef(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({ id: "", name: "", pw: "1234", role: "student" });
  const [memberFilter, setMemberFilter] = useState("all");
  const [editToneKey, setEditToneKey] = useState("default");

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

  // Zoom scale for counter-scaling decorations
  const zs = useMemo(() => {
    const vb = manualView || viewBox;
    if (!vb) return 1;
    return vb.w / svgSize.w;
  }, [manualView, viewBox, svgSize]);

  // Helper: wraps children in a group that counter-scales around (x,y) to keep fixed screen size
  const FixedG = useCallback(({ x, y, children }) => (
    <g transform={`translate(${x}, ${y}) scale(${zs}) translate(${-x}, ${-y})`}>{children}</g>
  ), [zs]);

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

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const vb = getActiveVB();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88; // scroll down = zoom out, up = zoom in
    const svg = svgRef.current;
    if (!svg) return;
    // Zoom toward mouse position
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const newW = vb.w * zoomFactor, newH = vb.h * zoomFactor;
    const ratio = (zoomFactor - 1);
    const newX = vb.x - (svgPt.x - vb.x) * ratio;
    const newY = vb.y - (svgPt.y - vb.y) * ratio;
    setManualView({ x: newX, y: newY, w: Math.max(50, newW), h: Math.max(50, newH) });
  }, [getActiveVB]);

  // Middle mouse button pan
  const middleMouseRef = useRef({ active: false, startX: 0, startY: 0, startVB: null });

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1) { // middle button
      e.preventDefault();
      middleMouseRef.current = {
        active: true,
        startX: e.clientX, startY: e.clientY,
        startVB: { ...getActiveVB() },
      };
    }
  }, [getActiveVB]);

  const handleMouseMove = useCallback((e) => {
    const mm = middleMouseRef.current;
    if (!mm.active) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pixToSvgX = mm.startVB.w / rect.width;
    const pixToSvgY = mm.startVB.h / rect.height;
    const dx = (mm.startX - e.clientX) * pixToSvgX;
    const dy = (mm.startY - e.clientY) * pixToSvgY;
    setManualView({ x: mm.startVB.x + dx, y: mm.startVB.y + dy, w: mm.startVB.w, h: mm.startVB.h });
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) middleMouseRef.current.active = false;
  }, []);

  // PC detection for responsive layout
  // PC mode = wide screen OR mobile landscape
  const [isPC, setIsPC] = useState(() => window.innerWidth > 768 || (window.innerWidth > window.innerHeight && window.innerWidth > 600));
  useEffect(() => {
    const check = () => setIsPC(window.innerWidth > 768 || (window.innerWidth > window.innerHeight && window.innerWidth > 600));
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 200));
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  // --- User & Role System ---
  // Roles: admin(관리자), assistant(조교), student(수강생), external(외부생)
  const ROLES = { admin: "관리자", assistant: "조교", student: "수강생", external: "외부생" };
  const [members, setMembers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ar_members"));
      if (saved && saved.length > 0) return saved;
      // Default admin account
      return [{ id: "admin", name: "관리자", nickname: "선생님", pw: "admin1234", role: "admin" }];
    } catch { return [{ id: "admin", name: "관리자", nickname: "선생님", pw: "admin1234", role: "admin" }]; }
  });
  const [signupRequests, setSignupRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ar_signups")) || []; } catch { return []; }
  });
  const [autoApprove, setAutoApprove] = useState(() => localStorage.getItem("ar_autoapprove") === "true");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");

  // Persist
  useEffect(() => { localStorage.setItem("ar_members", JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem("ar_signups", JSON.stringify(signupRequests)); }, [signupRequests]);
  useEffect(() => { localStorage.setItem("ar_autoapprove", autoApprove ? "true" : "false"); }, [autoApprove]);

  // Permission helpers
  const userRole = user?.role || "external";
  const canAdmin = userRole === "admin" || userRole === "assistant";
  const canArchive = userRole !== "external";
  const canEditMember = useCallback((targetRole) => {
    if (userRole === "admin") return true;
    if (userRole === "assistant") return targetRole === "student" || targetRole === "external";
    return false;
  }, [userRole]);

  const handleLogin = useCallback(() => {
    const found = members.find(s => s.id === loginId && s.pw === loginPw);
    if (found) {
      setUser({ name: found.name, nickname: found.nickname, role: found.role, id: found.id });
      setIsAdmin(found.role === "admin" || found.role === "assistant");
      setScreen("menu");
      setLoginError("");
    } else {
      setLoginError("아이디 또는 비밀번호가 올바르지 않아요.");
      playSfx("error");
    }
  }, [loginId, loginPw, members, playSfx, setScreen]);

  const handleLogout = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem("ar_user");
    localStorage.removeItem("ar_screen");
    sessionStorage.removeItem("ar_work");
    setLoginId(""); setLoginPw(""); setLoginError("");
    setScreenRaw("login");
    window.history.replaceState({ screen: "login" }, "", "#login");
    playSfx("click");
  }, [playSfx]);

  const handleSignupRequest = useCallback((name, id, pw, requestedRole = "student") => {
    if (!name || !id || !pw) return "모든 항목을 입력해주세요.";
    if (members.find(s => s.id === id)) return "이미 존재하는 아이디입니다.";
    if (signupRequests.find(s => s.id === id)) return "이미 신청된 아이디입니다.";
    if (id.length < 3) return "아이디는 3자 이상이어야 합니다.";

    if (autoApprove) {
      setMembers(prev => [...prev, { id, name, nickname: "", pw, role: requestedRole }]);
      playSfx("success");
      return "auto";
    } else {
      setSignupRequests(prev => [...prev, { id, name, pw, role: requestedRole, date: new Date().toISOString() }]);
      playSfx("success");
      return "pending";
    }
  }, [members, signupRequests, autoApprove, playSfx]);

  const approveSignup = useCallback((reqId) => {
    const req = signupRequests.find(r => r.id === reqId);
    if (!req) return;
    setMembers(prev => [...prev, { id: req.id, name: req.name, nickname: "", pw: req.pw, role: req.role || "student" }]);
    setSignupRequests(prev => prev.filter(r => r.id !== reqId));
    playSfx("success");
  }, [signupRequests, playSfx]);

  const rejectSignup = useCallback((reqId) => {
    setSignupRequests(prev => prev.filter(r => r.id !== reqId));
    playSfx("pop");
  }, [playSfx]);

  // Update member (admin/assistant can edit based on permissions)
  const updateMember = useCallback((targetId, updates) => {
    setMembers(prev => prev.map(m => m.id === targetId ? { ...m, ...updates } : m));
  }, []);

  const deleteMember = useCallback((targetId) => {
    setMembers(prev => prev.filter(m => m.id !== targetId));
    playSfx("pop");
  }, [playSfx]);

  // Backward compat: students = non-admin members
  const students = useMemo(() => members.filter(m => m.role !== "admin"), [members]);

  // Jakdo (작도) state
  const [jakdoTool, setJakdoTool] = useState(null); // "compass" | "ruler"
  const [jakdoArcs, setJakdoArcs] = useState([]); // {center, radius, startAngle, endAngle, intersections[]}
  const [jakdoRulerLines, setJakdoRulerLines] = useState([]);
  const [compassPhase, setCompassPhase] = useState("idle"); // "idle"|"radiusSet"|"drawingArc"
  const [compassCenter, setCompassCenter] = useState(null);
  const [compassRadius, setCompassRadius] = useState(0);
  const [compassDragPt, setCompassDragPt] = useState(null); // live drag point for radius preview
  const [arcDrawPoints, setArcDrawPoints] = useState([]); // freehand points while drawing arc
  const [rulerStart, setRulerStart] = useState(null);
  const [crossedEdges, setCrossedEdges] = useState(0);
  const [rulerPhase, setRulerPhase] = useState("idle"); // "idle"|"drawing"
  const [pressedSnap, setPressedSnap] = useState(null); // currently pressed snap point
  const MAX_ARCS = 12;
  const MAX_RULER_LINES = 8;

  // Custom cursors (data URI SVGs)
  const compassCursors = useMemo(() => {
    const needle = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="28" r="2" fill="%23E8A598"/><line x1="16" y1="28" x2="16" y2="4" stroke="%23E8A598" stroke-width="2"/><circle cx="16" cy="4" r="3" fill="none" stroke="%23E8A598" stroke-width="1.5"/></svg>')}") 16 28, crosshair`;
    const handle = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><line x1="8" y1="28" x2="16" y2="4" stroke="%23C3B1E1" stroke-width="2"/><line x1="24" y1="28" x2="16" y2="4" stroke="%23C3B1E1" stroke-width="2"/><circle cx="16" cy="4" r="3" fill="%23C3B1E1"/></svg>')}") 16 4, crosshair`;
    const pencil = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><line x1="16" y1="28" x2="10" y2="4" stroke="%23E8A598" stroke-width="2"/><line x1="16" y1="28" x2="22" y2="4" stroke="%23C3B1E1" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="16" cy="28" r="2.5" fill="%23E8A598"/></svg>')}") 16 28, crosshair`;
    const ruler = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="4" y="12" width="24" height="8" rx="2" fill="none" stroke="%23B5D5E8" stroke-width="1.5"/><line x1="8" y1="12" x2="8" y2="16" stroke="%23B5D5E8" stroke-width="1"/><line x1="12" y1="12" x2="12" y2="16" stroke="%23B5D5E8" stroke-width="1"/><line x1="16" y1="12" x2="16" y2="18" stroke="%23B5D5E8" stroke-width="1.5"/><line x1="20" y1="12" x2="20" y2="16" stroke="%23B5D5E8" stroke-width="1"/><line x1="24" y1="12" x2="24" y2="16" stroke="%23B5D5E8" stroke-width="1"/></svg>')}") 16 16, crosshair`;
    return { needle, handle, pencil, ruler };
  }, []);

  const getJakdoCursor = useCallback(() => {
    if (buildPhase !== "jakdo") return "default";
    if (jakdoTool === "ruler") return compassCursors.ruler;
    if (jakdoTool === "compass") {
      if (compassPhase === "idle") return compassCursors.needle;
      if (compassPhase === "radiusSet") return compassCursors.handle;
      if (compassPhase === "drawingArc") return compassCursors.pencil;
    }
    return "crosshair";
  }, [buildPhase, jakdoTool, compassPhase, compassCursors]);

  // Compass sub-step (for 3-button UI)
  // compassPhase: "idle" → "centerSet" → "radiusSet" → "drawingArc"
  const compassStep = compassPhase === "idle" ? 0 : compassPhase === "centerSet" ? 0 : compassPhase === "radiusSet" ? 1 : 2;

  // Undo history — must be before deleteArc/deleteRulerLine
  const [undoStack, setUndoStack] = useState([]);
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-20), {
      jedoLines: [...jedoLines], jedoCenter, jedoCircle, jedoType,
      jakdoArcs: [...jakdoArcs], jakdoRulerLines: [...jakdoRulerLines],
    }]);
  }, [jedoLines, jedoCenter, jedoCircle, jedoType, jakdoArcs, jakdoRulerLines]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setJedoLines(last.jedoLines); setJedoCenter(last.jedoCenter);
    setJedoCircle(last.jedoCircle); setJedoType(last.jedoType);
    setJakdoArcs(last.jakdoArcs); setJakdoRulerLines(last.jakdoRulerLines);
    playSfx("pop");
  }, [undoStack, playSfx]);

  // Delete arc/line by index
  const deleteArc = useCallback((idx) => {
    pushUndo();
    setJakdoArcs(prev => prev.filter((_, i) => i !== idx));
    playSfx("pop");
  }, [pushUndo, playSfx]);

  const deleteRulerLine = useCallback((idx) => {
    pushUndo();
    setJakdoRulerLines(prev => prev.filter((_, i) => i !== idx));
    playSfx("pop");
  }, [pushUndo, playSfx]);

  // Auto-save work in progress
  useEffect(() => {
    if (!triangle || buildPhase === "input" || buildPhase === "animating") return;
    try {
      sessionStorage.setItem("ar_work", JSON.stringify({
        triangle, buildPhase, triMode, jedoLines, jedoCenter, jedoCircle, jedoType,
        jakdoArcs, jakdoRulerLines, jakdoTool, showProperties, selectedProp, sssInput,
      }));
    } catch(e) {}
  }, [triangle, buildPhase, triMode, jedoLines, jedoCenter, jedoCircle, jedoType, jakdoArcs, jakdoRulerLines, jakdoTool, showProperties, selectedProp, sssInput]);

  // Restore work on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("ar_work"));
      if (saved?.triangle && !triangle) {
        setTriangle(saved.triangle); setBuildPhase(saved.buildPhase || "modeSelect");
        setTriMode(saved.triMode || "sss"); setJedoLines(saved.jedoLines || []);
        setJedoCenter(saved.jedoCenter); setJedoCircle(saved.jedoCircle);
        setJedoType(saved.jedoType); setJakdoArcs(saved.jakdoArcs || []);
        setJakdoRulerLines(saved.jakdoRulerLines || []);
        setJakdoTool(saved.jakdoTool); setShowProperties(saved.showProperties || false);
        setSelectedProp(saved.selectedProp); if (saved.sssInput) setSssInput(saved.sssInput);
      }
    } catch(e) {}
  }, []);

  // All snap points (vertices + arc-edge intersections + arc-arc intersections)
  const jakdoSnaps = useMemo(() => {
    if (!triangle) return [];
    const { A, B, C } = triangle;
    const pts = [{ ...A, label: "A" }, { ...B, label: "B" }, { ...C, label: "C" }];
    jakdoArcs.forEach(arc => { if (arc.intersections) arc.intersections.forEach(ip => pts.push(ip)); });
    if (jedoCenter) pts.push(jedoCenter);
    return pts;
  }, [triangle, jakdoArcs, jedoCenter]);

  // Circle-segment intersection
  const circleSegIntersect = useCallback((cx, cy, r, p1, p2) => {
    const dx = p2.x-p1.x, dy = p2.y-p1.y;
    const fx = p1.x-cx, fy = p1.y-cy;
    const a = dx*dx+dy*dy, b = 2*(fx*dx+fy*dy), c2 = fx*fx+fy*fy-r*r;
    let disc = b*b-4*a*c2;
    if (disc < 0) return [];
    disc = Math.sqrt(disc);
    const pts = [];
    for (const t of [(-b-disc)/(2*a), (-b+disc)/(2*a)]) {
      if (t >= -0.02 && t <= 1.02) pts.push({ x: p1.x+t*dx, y: p1.y+t*dy });
    }
    return pts;
  }, []);

  const showMsg = useCallback((msg, duration = 2500) => {
    setFloatingMsg(msg);
    setTimeout(() => setFloatingMsg(null), duration);
  }, []);

  // --- Jakdo SVG coord helper ---
  const svgCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    const src = e.touches ? e.touches[0] : e;
    if (!src) return null;
    pt.x = src.clientX; pt.y = src.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  // --- Jakdo Compass Interaction (3 phases) ---
  const handleJakdoDown = useCallback((e) => {
    if (!triangle || buildPhase !== "jakdo") return;
    if (e.button === 1) return;
    const p = svgCoords(e);
    if (!p) return;

    if (jakdoTool === "compass") {
      if (compassPhase === "idle") {
        // Check max arcs
        if (jakdoArcs.length >= MAX_ARCS) {
          showMsg(`호는 최대 ${MAX_ARCS}개까지! 기존 호를 삭제해주세요.`, 2500);
          playSfx("error"); return;
        }
        let nearest = null, minD = 25;
        for (const sp of jakdoSnaps) {
          const d = dist(p, sp);
          if (d < minD) { minD = d; nearest = sp; }
        }
        if (nearest) {
          setPressedSnap({ x: nearest.x, y: nearest.y });
          setCompassCenter({ x: nearest.x, y: nearest.y });
          setCompassPhase("radiusSet");
          setCompassDragPt(p);
          playSfx("click");
          // Clear press after short delay
          setTimeout(() => setPressedSnap(null), 400);
        }
      } else if (compassPhase === "radiusSet") {
        setCompassDragPt(p);
      } else if (compassPhase === "drawingArc") {
        setArcDrawPoints([p]);
      }
    } else if (jakdoTool === "ruler") {
      if (jakdoRulerLines.length >= MAX_RULER_LINES) {
        showMsg(`직선은 최대 ${MAX_RULER_LINES}개까지!`, 2500);
        playSfx("error"); return;
      }
      let nearest = null, minD = 25;
      for (const sp of jakdoSnaps) {
        const d = dist(p, sp);
        if (d < minD) { minD = d; nearest = sp; }
      }
      if (nearest) {
        setPressedSnap({ x: nearest.x, y: nearest.y });
        setRulerStart({ x: nearest.x, y: nearest.y });
        playSfx("click");
        setTimeout(() => setPressedSnap(null), 400);
      }
    }
  }, [triangle, buildPhase, jakdoTool, compassPhase, jakdoSnaps, jakdoArcs, jakdoRulerLines, svgCoords, playSfx, showMsg]);

  const handleJakdoMove = useCallback((e) => {
    if (!triangle || buildPhase !== "jakdo") return;
    const p = svgCoords(e);
    if (!p) return;

    if (jakdoTool === "compass") {
      if (compassPhase === "radiusSet" && compassCenter) {
        setCompassDragPt(p);
        setCompassRadius(dist(p, compassCenter));
        // Count edge crossings
        const { A, B, C } = triangle;
        const r = dist(p, compassCenter);
        let crossed = 0;
        for (const [e1, e2] of [[A,B],[B,C],[A,C]]) {
          const ips = circleSegIntersect(compassCenter.x, compassCenter.y, r, e1, e2);
          if (ips.length > 0) crossed++;
        }
        setCrossedEdges(crossed);
      } else if (compassPhase === "drawingArc") {
        setArcDrawPoints(prev => [...prev, p]);
      }
    }
  }, [triangle, buildPhase, jakdoTool, compassPhase, compassCenter, svgCoords, circleSegIntersect]);

  const handleJakdoUp = useCallback((e) => {
    if (!triangle || buildPhase !== "jakdo") return;

    if (jakdoTool === "compass") {
      if (compassPhase === "radiusSet" && compassCenter && compassRadius > 8) {
        // Radius drag released — just lock radius, DON'T auto-transition
        // User must press "호 돌리기" button to enter arc drawing
        setCompassDragPt(null);
        showMsg("반지름 고정! '호 돌리기' 버튼을 눌러주세요.", 2000);
        playSfx("pop");
      } else if (compassPhase === "radiusSet") {
        // Too short — reset
        setCompassPhase("idle"); setCompassCenter(null); setCompassRadius(0);
        setCompassDragPt(null);
      } else if (compassPhase === "drawingArc" && arcDrawPoints.length > 3) {
        // Arc drawn — create arc, pushUndo first
        const firstPt = arcDrawPoints[0], lastPt = arcDrawPoints[arcDrawPoints.length - 1];
        const startAngle = Math.atan2(firstPt.y - compassCenter.y, firstPt.x - compassCenter.x);
        const endAngle = Math.atan2(lastPt.y - compassCenter.y, lastPt.x - compassCenter.x);

        const { A, B, C } = triangle;
        const intersections = [];
        for (const [e1, e2] of [[A,B],[B,C],[A,C]]) {
          const ips = circleSegIntersect(compassCenter.x, compassCenter.y, compassRadius, e1, e2);
          intersections.push(...ips);
        }
        jakdoArcs.forEach(prevArc => {
          const d = dist(compassCenter, prevArc.center);
          if (d < compassRadius + prevArc.radius && d > Math.abs(compassRadius - prevArc.radius)) {
            const a2 = (compassRadius**2 - prevArc.radius**2 + d**2) / (2*d);
            const h = Math.sqrt(Math.max(0, compassRadius**2 - a2**2));
            const dx = (prevArc.center.x - compassCenter.x)/d, dy = (prevArc.center.y - compassCenter.y)/d;
            const mx = compassCenter.x + a2*dx, my = compassCenter.y + a2*dy;
            intersections.push({ x: mx + h*(-dy), y: my + h*dx });
            intersections.push({ x: mx - h*(-dy), y: my - h*dx });
          }
        });

        // Determine sweep direction from freehand points
        const midIdx = Math.floor(arcDrawPoints.length / 2);
        const midPt = arcDrawPoints[midIdx];
        const midAngle = Math.atan2(midPt.y - compassCenter.y, midPt.x - compassCenter.x);
        let s2m = midAngle - startAngle;
        if (s2m < -Math.PI) s2m += 2*Math.PI;
        if (s2m > Math.PI) s2m -= 2*Math.PI;
        let s2e = endAngle - startAngle;
        if (s2e < -Math.PI) s2e += 2*Math.PI;
        if (s2e > Math.PI) s2e -= 2*Math.PI;
        // If midpoint is in the "short" direction and end is too, sweepCW matches sign
        // Otherwise the arc goes the long way around
        const sweepCW = s2m > 0;

        const newArc = { center: {...compassCenter}, radius: compassRadius, startAngle, endAngle, intersections, id: Date.now(), sweepCW };
        pushUndo();
        setJakdoArcs(prev => [...prev, newArc]);
        playSfx("draw");

        // Reset compass fully after arc creation
        setCompassPhase("idle"); setCompassCenter(null); setCompassRadius(0);
        setArcDrawPoints([]); setCrossedEdges(0); setCompassDragPt(null);
      } else if (compassPhase === "drawingArc") {
        // Too short arc — reset to try again
        setArcDrawPoints([]);
        setCompassPhase("idle"); setCompassCenter(null); setCompassRadius(0);
        setCompassDragPt(null);
      }
    } else if (jakdoTool === "ruler" && rulerStart) {
      const p = svgCoords(e.changedTouches ? e.changedTouches[0] : e);
      if (!p) { setRulerStart(null); return; }
      let nearest = p, minD = 25;
      for (const sp of jakdoSnaps) {
        const d = dist(p, sp);
        if (d < minD) { minD = d; nearest = sp; }
      }
      if (dist(rulerStart, nearest) > 10) {
        pushUndo();
        setJakdoRulerLines(prev => [...prev, { start: rulerStart, end: { x: nearest.x, y: nearest.y } }]);
        playSfx("draw");
      }
      setRulerStart(null);
    }
  }, [triangle, buildPhase, jakdoTool, compassPhase, compassCenter, compassRadius, arcDrawPoints, crossedEdges, rulerStart, jakdoSnaps, jakdoArcs, svgCoords, playSfx, pushUndo, showMsg, activeTone, circleSegIntersect]);

  // Random idle dialogue
  const [idleMsg, setIdleMsg] = useState("");
  const idleDialogues = useMemo(() => ({
    default: ["오늘도 기하학 해볼까?", "삼각형의 비밀을 찾아보자!", "수학은 아름다워요.", "천천히 생각해봐요.", "외심? 내심? 뭐부터 해볼까?"],
    nagging: ["빨리 해!! 뭐해!!", "멍때리지 말고 시작해!!", "오늘 안에 끝내자!!", "집중!! 집중!!!", "한 문제라도 풀어봐!!"],
    cute: ["오늘도 같이 해요~♡", "삼각형이 기다려요~", "화이팅이에요~♡", "천천히 해도 괜찮아요~", "멋진 하루 되세요~♡"],
  }), []);
  useEffect(() => {
    const show = () => {
      const msgs = idleDialogues[toneKey] || idleDialogues.default;
      setIdleMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    };
    show();
    const interval = setInterval(show, 15000);
    return () => clearInterval(interval);
  }, [toneKey, idleDialogues]);

  // Archive state
  const [archives, setArchives] = useState([]);
  const [showArchiveSave, setShowArchiveSave] = useState(false);
  const [archivePublic, setArchivePublic] = useState(true);

  const saveToArchive = useCallback(() => {
    if (!triangle || !jedoCircle) return;
    const entry = {
      id: Date.now(),
      triangle: { ...triangle },
      jedoType, jedoCenter, jedoCircle,
      jedoLines: [...jedoLines],
      jakdoArcs: [...jakdoArcs],
      jakdoRulerLines: [...jakdoRulerLines],
      isPublic: archivePublic,
      date: new Date().toISOString(),
      user: user?.name || "익명",
    };
    setArchives(prev => [entry, ...prev]);
    playSfx("success");
    setShowArchiveSave(false);
    setScreen("menu"); // or "archive" when implemented
  }, [triangle, jedoCircle, jedoType, jedoCenter, jedoLines, jakdoArcs, jakdoRulerLines, archivePublic, user, playSfx, setScreen]);

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

  // Fixed base version: baseLen is the bottom (BC), side1=AB, side2=AC
  const generateTriangleWithBase = useCallback((baseLen, side1, side2) => {
    const bl = parseFloat(baseLen), s1 = parseFloat(side1), s2 = parseFloat(side2);
    if (isNaN(bl) || isNaN(s1) || isNaN(s2) || bl <= 0 || s1 <= 0 || s2 <= 0) return null;
    const maxS = Math.max(bl, s1, s2);
    if (maxS >= (bl + s1 + s2 - maxS)) return null;

    const scale = (svgSize.w * 0.6) / maxS;
    const base = bl * scale;
    const ab = s1 * scale; // B→A
    const ac = s2 * scale; // C→A

    const cx = svgSize.w / 2;
    const baseY = svgSize.h * 0.7;
    const Bx = cx - base / 2, By = baseY;
    const Cx = cx + base / 2, Cy = baseY;

    // cosine of angle B: (AB² + BC² - AC²) / (2·AB·BC)
    const cosB = (ab * ab + base * base - ac * ac) / (2 * ab * base);
    if (Math.abs(cosB) > 1) return null;
    const sinB = Math.sqrt(1 - cosB * cosB);
    const Ax = Bx + ab * cosB;
    const Ay = By - ab * sinB;

    return {
      A: { x: Ax, y: Ay },
      B: { x: Bx, y: By },
      C: { x: Cx, y: Cy },
      sides: [bl, s1, s2].sort((a, b) => a - b),
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

  // --- B-mode: Multi-step drawing (SSS/SAS/ASA specific) ---
  // Utility: recognize a straight line from freehand stroke
  const recognizeLine = useCallback((pts) => {
    if (pts.length < 5) return null;
    const s = pts[0], e = pts[pts.length - 1];
    const len = dist(s, e);
    if (len < 30) return null; // too short
    // Check straightness: max perpendicular distance
    let maxD = 0;
    for (const p of pts) {
      const dx = e.x - s.x, dy = e.y - s.y;
      const lenSq = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / lenSq));
      const proj = { x: s.x + t * dx, y: s.y + t * dy };
      maxD = Math.max(maxD, dist(p, proj));
    }
    if (maxD > len * 0.25) return null; // too curved
    return { start: s, end: e, length: len };
  }, []);

  // Utility: recognize an angle (V/<) from freehand stroke
  // Hybrid: farthest-point vertex (robust) + regression directions (accurate)
  const recognizeAngle = useCallback((pts) => {
    if (pts.length < 6) return null;
    const A = pts[0], B = pts[pts.length - 1];
    const baseDist = dist(A, B);
    if (baseDist < 15) return null;

    // Find vertex: farthest point from line A→B
    let maxD = 0, vertexIdx = -1;
    const dx = B.x - A.x, dy = B.y - A.y, lenSq = dx * dx + dy * dy;
    for (let i = 1; i < pts.length - 1; i++) {
      const px = pts[i].x - A.x, py = pts[i].y - A.y;
      const d = Math.abs(px * dy - py * dx) / Math.sqrt(lenSq);
      if (d > maxD) { maxD = d; vertexIdx = i; }
    }
    if (vertexIdx < 1 || maxD < 8) return null;

    // Split into two arms and fit direction via regression
    const arm1 = pts.slice(0, vertexIdx + 1);
    const arm2 = pts.slice(vertexIdx);
    if (arm1.length < 3 || arm2.length < 3) return null;

    const fitDir = (p) => {
      const n = p.length;
      let sx = 0, sxx = 0, sxy1 = 0, sxy2 = 0, sumx = 0, sumy = 0;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        sx += t; sxx += t * t;
        sxy1 += t * p[i].x; sxy2 += t * p[i].y;
        sumx += p[i].x; sumy += p[i].y;
      }
      const denom = n * sxx - sx * sx;
      if (Math.abs(denom) < 0.001) return null;
      return { dx: (n * sxy1 - sx * sumx) / denom, dy: (n * sxy2 - sx * sumy) / denom };
    };

    const d1 = fitDir(arm1), d2 = fitDir(arm2);
    if (!d1 || !d2) return null;
    const l1 = Math.sqrt(d1.dx ** 2 + d1.dy ** 2);
    const l2 = Math.sqrt(d2.dx ** 2 + d2.dy ** 2);
    if (l1 < 1 || l2 < 1) return null;

    const cosA = Math.max(-1, Math.min(1, (d1.dx * d2.dx + d1.dy * d2.dy) / (l1 * l2)));
    let angle = Math.acos(cosA) * 180 / Math.PI;
    // Regression directions: arm1 goes start→vertex, arm2 goes vertex→end
    // Their angle IS the opening angle directly (no 180° correction needed)
    if (angle < 3 || angle > 177) return null;
    return { vertex: pts[vertexIdx], angle, arm1: A, arm2: B };
  }, []);

  // Drawing scale: pixels → abstract units (longest drawable line ≈ 10)
  const drawScale = useMemo(() => svgSize.w * 0.06, [svgSize]);

  const handleDrawStart = useCallback((e) => {
    if (buildPhase !== "input" || inputMode !== "B" || triangle || drawStep === 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    const src = e.touches ? e.touches[0] : e;
    pt.x = src.clientX; pt.y = src.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    setIsDrawing(true);
    setCurrentStroke([{ x: svgPt.x, y: svgPt.y }]);
  }, [buildPhase, inputMode, triangle, drawStep]);

  const handleDrawMove = useCallback((e) => {
    if (!isDrawing) return;
    const svg = svgRef.current;
    if (!svg) return;
    const src = e.touches ? e.touches[0] : e;
    const pt = svg.createSVGPoint();
    pt.x = src.clientX; pt.y = src.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    setCurrentStroke(prev => [...prev, { x: svgPt.x, y: svgPt.y }]);
  }, [isDrawing]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length < 5) { setCurrentStroke([]); return; }

    const mode = triMode;
    if (drawStep === 1) {
      // Drawing lines phase
      const line = recognizeLine(currentStroke);
      if (!line) {
        showMsg("직선으로 그어주세요!", 1500);
        playSfx("error");
        setCurrentStroke([]);
        return;
      }
      const newStrokes = [...drawStrokes, { ...line, lengthUnit: line.length / drawScale }];
      setDrawStrokes(newStrokes);
      playSfx("draw");
      setCurrentStroke([]);

      // Check completion
      const neededLines = mode === "sss" ? 3 : mode === "sas" ? 2 : 1;
      if (newStrokes.length >= neededLines) {
        if (mode === "sss") {
          // SSS complete → generate triangle
          const a = newStrokes[0].lengthUnit, b = newStrokes[1].lengthUnit, c = newStrokes[2].lengthUnit;
          const tri = generateTriangle(a, b, c);
          if (tri) {
            setTriangle({ ...tri, mode: "sss" });
            setBuildPhase("animating");
            setDrawStep(0);
            playSfx("success");
          } else {
            showMsg("이 세 변으로는 삼각형을 만들 수 없어요!", 2500);
            playSfx("error");
            setDrawStrokes([]); setDrawStep(1);
          }
        } else {
          // SAS/ASA needs angles next
          setDrawStep(2);
          if (mode === "sas") showMsg("이제 빈 공간에 < 모양으로\n끼인각을 표시해보세요!", 3000);
          else showMsg("이제 빈 공간에 < 모양으로\n각도를 2개 표시해보세요!", 3000);
        }
      } else {
        showMsg(`${neededLines - newStrokes.length}개 더 그어주세요!`, 1500);
      }
    } else if (drawStep === 2) {
      // Drawing angles phase
      const ang = recognizeAngle(currentStroke);
      if (!ang) {
        showMsg("< 모양으로 각도를 그려주세요!", 1500);
        playSfx("error");
        setCurrentStroke([]);
        return;
      }
      const newAngles = [...drawAngles, ang];
      setDrawAngles(newAngles);
      playSfx("draw");
      setCurrentStroke([]);

      const neededAngles = mode === "sas" ? 1 : 2;
      if (newAngles.length >= neededAngles) {
        // Generate triangle
        if (mode === "sas") {
          const b = drawStrokes[0].lengthUnit, c = drawStrokes[1].lengthUnit;
          const angle = newAngles[0].angle;
          const rad = angle * Math.PI / 180;
          const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad));
          const tri = generateTriangleWithBase(a, c, b);
          if (tri) {
            setTriangle({ ...tri, mode: "sas", sasData: { b, c, angle } });
            setBuildPhase("animating");
            setDrawStep(0);
            playSfx("success");
          } else {
            showMsg("삼각형을 만들 수 없어요! 다시 시도해주세요.", 2500);
            playSfx("error");
            setDrawStrokes([]); setDrawAngles([]); setDrawStep(1);
          }
        } else {
          // ASA
          const a = drawStrokes[0].lengthUnit;
          const angB = newAngles[0].angle, angC = newAngles[1].angle;
          if (angB + angC >= 180) {
            showMsg("두 각의 합이 180° 이상이에요!", 2500);
            playSfx("error");
            setDrawAngles([]); setDrawStep(2);
            return;
          }
          const angA = 180 - angB - angC;
          const radA = angA * Math.PI / 180;
          const b = a * Math.sin(angB * Math.PI / 180) / Math.sin(radA);
          const c = a * Math.sin(angC * Math.PI / 180) / Math.sin(radA);
          const tri = generateTriangleWithBase(a, c, b);
          if (tri) {
            setTriangle({ ...tri, mode: "asa", asaData: { a, angB, angC } });
            setBuildPhase("animating");
            setDrawStep(0);
            playSfx("success");
          } else {
            showMsg("삼각형을 만들 수 없어요!", 2500);
            playSfx("error");
            setDrawStrokes([]); setDrawAngles([]); setDrawStep(1);
          }
        }
      } else {
        showMsg(`${neededAngles - newAngles.length}개 더 그려주세요!`, 1500);
      }
    }
  }, [isDrawing, currentStroke, drawStep, triMode, drawStrokes, drawAngles, drawScale,
      recognizeLine, recognizeAngle, generateTriangle, generateTriangleWithBase,
      playSfx, showMsg]);

  const retryDraw = useCallback(() => {
    setDrawStrokes([]); setDrawAngles([]); setCurrentStroke([]);
    setDrawStep(triMode ? 1 : 0); setDrawPreview(null);
  }, [triMode]);

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
        pushUndo();
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
        pushUndo();
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
    setJakdoTool(null);
    setJakdoArcs([]);
    setJakdoRulerLines([]);
    setCompassPhase("idle");
    setCompassCenter(null);
    setCompassRadius(0);
    setCompassDragPt(null);
    setArcDrawPoints([]);
    setRulerStart(null);
    setCrossedEdges(0);
    setRulerPhase("idle");
    setUndoStack([]);
    setShowArchiveSave(false);
    setDrawStrokes([]); setDrawAngles([]); setCurrentStroke([]); setDrawStep(0);
    setDrawPreview(null);
    setIsDrawing(false);
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
        {/* Vertices — fixed screen size via FixedG */}
        {[A, B, C].map((p, i) => {
          const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
          const dx = p.x - centroid.x, dy = p.y - centroid.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const labelDist = 18;
          const lx = p.x + (dx/d) * labelDist;
          const ly = p.y + (dy/d) * labelDist;
          return (
          <FixedG key={i} x={p.x} y={p.y}>
            <circle cx={p.x} cy={p.y} r={(buildPhase === "jedo" && jedoType !== "circum") ? 14 : 6}
              fill={(buildPhase === "jedo" && jedoType !== "circum") ? "transparent" : PASTEL.coral}
              stroke={(buildPhase === "jedo" && jedoType !== "circum") ? PASTEL.lavender : "none"}
              strokeWidth={(buildPhase === "jedo" && jedoType !== "circum") ? 2 : 0}
              strokeDasharray={(buildPhase === "jedo" && jedoType !== "circum") ? "4 2" : "none"}
              style={{ cursor: (buildPhase === "jedo" && jedoType !== "circum") ? "pointer" : "default" }}
            />
            <circle cx={p.x} cy={p.y} r={4} fill={PASTEL.coral} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={theme.text}
              fontSize={13} fontFamily="'Playfair Display', serif" fontWeight={700}>
              {["A", "B", "C"][i]}
            </text>
          </FixedG>
          );
        })}
        {/* Edge labels + Angle arcs — visible only in modeSelect */}
        {buildPhase === "modeSelect" && (
          <g style={{ animation: "fadeIn 0.5s ease" }}>
            {/* Edge lengths */}
            {[[A, B, "c"], [B, C, "a"], [A, C, "b"]].map(([p1, p2, label], i) => {
              const mid = midpoint(p1, p2);
              const dx = p2.x - p1.x, dy = p2.y - p1.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              // Normal offset, push label outward from centroid
              const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
              const midToCx = mid.x - centroid.x, midToCy = mid.y - centroid.y;
              const midToCD = Math.sqrt(midToCx*midToCx + midToCy*midToCy) || 1;
              const offset = 18;
              const lx = mid.x + (midToCx/midToCD) * offset;
              const ly = mid.y + (midToCy/midToCD) * offset;
              const val = dist(p1, p2) / (triangle.scale || 1);
              return (
                <FixedG key={`edge${i}`} x={lx} y={ly}>
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                    fill={theme.textSec} fontSize={11} fontFamily="'Noto Serif KR', serif">
                    {label}={val.toFixed(1)}
                  </text>
                </FixedG>
              );
            })}
            {/* Angle arcs + labels + right angle markers + callout for tight angles */}
            {[[A, B, C, "A"], [B, A, C, "B"], [C, A, B, "C"]].map(([vertex, p1, p2, label], i) => {
              const ang = angleAtVertex(vertex, p1, p2);
              const angDeg = ang * 180 / Math.PI;
              const isRightAngle = Math.abs(angDeg - 90) < 1.5;
              const isTight = angDeg < 35;
              const arcR = (isTight ? 16 : 24);
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
                  <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
                    <path d={`M ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${corner3.x} ${corner3.y}`}
                      fill="none" stroke={arcColor} strokeWidth={1.8} opacity={0.9} />
                    <text x={lblPos.x} y={lblPos.y} textAnchor="middle"
                      dominantBaseline="central" fill={arcColor}
                      fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                      90°
                    </text>
                  </FixedG>
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
                  <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
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
                  </FixedG>
                );
              }

              // Normal: label inside arc
              const labelR = arcR + 14;
              const labelPos = { x: vertex.x + labelR*Math.cos(midAngle), y: vertex.y + labelR*Math.sin(midAngle) };
              return (
                <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
                  <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
                    fill="none" stroke={arcColor} strokeWidth={2} opacity={0.8} />
                  <text x={labelPos.x} y={labelPos.y} textAnchor="middle"
                    dominantBaseline="central" fill={arcColor}
                    fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                    {angDeg.toFixed(1)}°
                  </text>
                </FixedG>
              );
            })}
          </g>
        )}
        {/* Edge click highlights for jedo mode — hide when doing angle bisectors */}
        {buildPhase === "jedo" && jedoType !== "in" && [[A, B, "AB"], [B, C, "BC"], [A, C, "AC"]].map(([p1, p2, key], i) => {
          const mid = midpoint(p1, p2);
          const done = jedoLines.find(l => l.key === `perp_${key}`);
          return (
            <g key={`edge-hit-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="transparent" strokeWidth={30}
                style={{ cursor: "pointer", vectorEffect: "none" }} />
              {!done && (
                <FixedG x={mid.x} y={mid.y}>
                  <circle cx={mid.x} cy={mid.y} r={8}
                    fill="transparent" stroke={PASTEL.sky} strokeWidth={1.5}
                    strokeDasharray="3 2" opacity={0.7}>
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </FixedG>
              )}
              {done && (
                <FixedG x={mid.x} y={mid.y}>
                  <circle cx={mid.x} cy={mid.y} r={4} fill={PASTEL.sky} opacity={0.5} />
                </FixedG>
              )}
            </g>
          );
        })}
        {/* Jedo lines — extending beyond triangle */}
        {jedoLines.map((line, i) => (
          <line key={i} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            stroke={line.color} strokeWidth={1.5} strokeDasharray={"6 3"} opacity={0.7}
          />
        ))}
        {/* Center point */}
        {jedoCenter && (() => {
          // Find label position that avoids vertices
          const verts = [A, B, C];
          let lx = jedoCenter.x + 16, ly = jedoCenter.y - 8;
          // Check if default position is too close to any vertex
          const tooClose = verts.some(v => dist(v, { x: lx, y: ly }) < 25);
          if (tooClose) {
            // Place label on opposite side of nearest vertex
            const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
            const awayX = jedoCenter.x - centroid.x, awayY = jedoCenter.y - centroid.y;
            const awayLen = Math.sqrt(awayX*awayX+awayY*awayY) || 1;
            lx = jedoCenter.x + (awayX/awayLen) * 20;
            ly = jedoCenter.y + (awayY/awayLen) * 20 - 6;
          }
          return (
          <g style={{ cursor: "pointer" }}>
            <FixedG x={jedoCenter.x} y={jedoCenter.y}>
              <circle cx={jedoCenter.x} cy={jedoCenter.y} r={12}
                fill="transparent" stroke={PASTEL.coral} strokeWidth={2}>
                {jedoLines.length >= 3 && (
                  <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
              <circle cx={jedoCenter.x} cy={jedoCenter.y} r={4} fill={PASTEL.coral} />
              <text x={lx} y={ly} fill={theme.text}
                fontSize={12} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                {jedoType === "circum" ? "외심" : "내심"}
              </text>
            </FixedG>
            {/* Guide lines */}
            {jedoType === "circum" && jedoLines.length >= 3 && !jedoCircle && [A, B, C].map((p, i) => (
              <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={p.x} y2={p.y}
                stroke={theme.lineLight} strokeWidth={1} strokeDasharray={"4 4"} opacity={0.5} />
            ))}
            {jedoType === "in" && jedoLines.length >= 3 && !jedoCircle && [[A, B], [B, C], [A, C]].map(([p1, p2], i) => {
              const cp = closestPointOnLine(jedoCenter, p1, p2);
              return (
                <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={cp.x} y2={cp.y}
                  stroke={theme.lineLight} strokeWidth={1} strokeDasharray={"4 4"} opacity={0.5} />
              );
            })}
          </g>
          );
        })()}
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
            type="text" placeholder="아이디" value={loginId}
            onChange={e => { setLoginId(e.target.value); setLoginError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${loginError ? PASTEL.coral : PASTEL.blush}`, fontSize: 14, marginBottom: 12,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />
          <input
            type="password" placeholder="비밀번호" value={loginPw}
            onChange={e => { setLoginPw(e.target.value); setLoginError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${loginError ? PASTEL.coral : PASTEL.blush}`, fontSize: 14, marginBottom: loginError ? 8 : 24,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />
          {loginError && (
            <p style={{ fontSize: 12, color: PASTEL.coral, marginBottom: 16, fontFamily: "'Noto Serif KR', serif" }}>
              {loginError}
            </p>
          )}

          <button
            onClick={handleLogin}
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

          <button
            onClick={() => setScreenRaw("signup")}
            style={{
              width: "100%", padding: "13px", borderRadius: 14, marginTop: 10,
              border: `1.5px solid ${PASTEL.blush}`,
              background: "rgba(255,248,240,0.6)",
              color: "#8B7E74", fontSize: 13, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", letterSpacing: 0.5,
              transition: "all 0.3s ease",
            }}
          >
            회원가입
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

  // --- Signup Screen ---
  if (screen === "signup") {

    const doSignup = () => {
      if (signupPw !== signupPwConfirm) { setSignupMsg("비밀번호가 일치하지 않아요."); return; }
      if (signupPw.length < 4) { setSignupMsg("비밀번호는 4자 이상으로 해주세요."); return; }
      if (signupId.length < 3) { setSignupMsg("아이디는 3자 이상으로 해주세요."); return; }
      const result = handleSignupRequest(signupName, signupId, signupPw);
      if (result === "auto") {
        setSignupMsg(""); setSignupDone(true);
      } else if (result === "pending") {
        setSignupMsg(""); setSignupDone(true);
      } else {
        setSignupMsg(result);
      }
    };

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${PASTEL.cream} 0%, ${PASTEL.blush} 30%, ${PASTEL.lilac} 60%, ${PASTEL.sky} 100%)`,
        fontFamily: "'Noto Serif KR', serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          input:focus { outline: none; border-color: ${PASTEL.coral} !important; box-shadow: 0 0 0 3px rgba(232,165,152,0.2); }`}</style>

        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          borderRadius: 28, padding: "40px 36px", width: "min(380px, 90vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)",
          animation: "fadeIn 0.6s ease", textAlign: "center",
        }}>
          <h2 style={{ fontSize: 24, color: "#4A3F35", margin: "0 0 6px 0", fontFamily: "'Playfair Display', serif" }}>
            회원가입
          </h2>
          <p style={{ fontSize: 12, color: "#8B7E74", margin: "0 0 28px 0", fontStyle: "italic" }}>
            ashrain.out에 오신 것을 환영해요
          </p>

          {signupDone ? (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>{autoApprove ? "🎉" : "📨"}</p>
              <p style={{ fontSize: 15, color: "#4A3F35", fontWeight: 700, marginBottom: 8 }}>
                {autoApprove ? "가입이 완료되었어요!" : "가입 신청이 접수되었어요!"}
              </p>
              <p style={{ fontSize: 12, color: "#8B7E74", marginBottom: 24, lineHeight: 1.6 }}>
                {autoApprove 
                  ? "바로 로그인할 수 있어요." 
                  : "선생님이 승인하면 로그인할 수 있어요.\n조금만 기다려주세요!"}
              </p>
              <button onClick={() => setScreenRaw("login")} style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>로그인으로 돌아가기</button>
            </div>
          ) : (
            <>
              <input placeholder="이름 (실명)" value={signupName} onChange={e => setSignupName(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input placeholder="아이디 (3자 이상)" value={signupId} onChange={e => setSignupId(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input type="password" placeholder="비밀번호 (4자 이상)" value={signupPw} onChange={e => setSignupPw(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input type="password" placeholder="비밀번호 확인" value={signupPwConfirm} onChange={e => setSignupPwConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSignup()}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: signupMsg ? 8 : 20, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />

              {signupMsg && <p style={{ fontSize: 12, color: PASTEL.coral, marginBottom: 12 }}>{signupMsg}</p>}

              <button onClick={doSignup} style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.mint}, ${PASTEL.sage})`,
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                marginBottom: 10,
              }}>가입 신청하기</button>

              <button onClick={() => setScreenRaw("login")} style={{
                width: "100%", padding: "12px", borderRadius: 14,
                border: `1.5px solid ${PASTEL.blush}`, background: "transparent",
                color: "#8B7E74", fontSize: 13, cursor: "pointer",
              }}>← 로그인으로 돌아가기</button>

              <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 16, lineHeight: 1.5 }}>
                가입 후 선생님의 승인이 필요합니다.
              </p>
            </>
          )}
        </div>
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
      { icon: "◎", label: "아카이브", desc: "나만의 작품 갤러리", disabled: !canArchive, action: canArchive ? () => {} : undefined },
      { icon: "🏛️", label: "광장", desc: "실시간 채팅 · 순위", action: () => setScreen("plaza") },
      { icon: "✦", label: "설정", desc: "테마, 알림, 말투 모드", action: () => setScreen("settings") },
    ];
    if (canAdmin) menuItems.push({ icon: "🔧", label: "관리자", desc: "회원·대사·효과음 관리", action: () => setScreen("admin") });

    return (
      <ScreenWrap>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", marginBottom:40, animation:"fadeIn 0.6s ease" }}>
            <div style={{ fontSize:11, letterSpacing:6, color:theme.textSec, textTransform:"uppercase", marginBottom:8 }}>geometry atelier</div>
            <h1 style={{ fontSize:32, color:theme.text, margin:"0 0 12px 0", fontFamily:"'Playfair Display', serif" }}>ashrain.out</h1>
            {/* User info + logout */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <span style={{ fontSize:12, color:theme.textSec }}>
                {user?.nickname || user?.name || "게스트"}
              </span>
              <span style={{ fontSize:9, padding:"2px 8px", borderRadius:6, background:`${PASTEL.coral}15`, color:PASTEL.coral, fontWeight:700 }}>
                {ROLES[userRole]}
              </span>
              <button onClick={handleLogout} style={{
                background:"none", border:`1px solid ${theme.border}`, borderRadius:8,
                padding:"4px 10px", fontSize:11, color:theme.textSec, cursor:"pointer",
                fontFamily:"'Noto Serif KR', serif",
              }}>로그아웃</button>
            </div>
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

  // --- Plaza (광장) Screen ---
  if (screen === "plaza") {

    const sendChat = () => {
      if (!chatMsg.trim()) return;
      const newMsg = { user: user?.nickname || user?.name || "익명", role: userRole, text: chatMsg.trim(), time: Date.now() };
      const updated = [...chatLog, newMsg].slice(-100); // keep last 100
      setChatLog(updated);
      localStorage.setItem("ar_chat", JSON.stringify(updated));
      setChatMsg("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };

    return (
      <ScreenWrap title="광장" back="메뉴" backTo="menu">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" }}>
            {chatLog.length === 0 && (
              <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 40 }}>
                아직 대화가 없어요. 첫 메시지를 보내보세요!
              </p>
            )}
            {chatLog.map((msg, i) => {
              const isMe = msg.user === (user?.nickname || user?.name);
              return (
                <div key={i} style={{
                  display: "flex", flexDirection: isMe ? "row-reverse" : "row",
                  marginBottom: 8, animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
                    background: isMe ? `${PASTEL.coral}20` : theme.card,
                    border: `1px solid ${isMe ? PASTEL.coral : theme.border}`,
                  }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 4,
                        background: `${roleColors[msg.role] || theme.textSec}20`,
                        color: roleColors[msg.role] || theme.textSec,
                      }}>{ROLES[msg.role] || ""}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>{msg.user}</span>
                      <span style={{ fontSize: 9, color: theme.textSec }}>
                        {new Date(msg.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: theme.text, margin: 0, lineHeight: 1.5, fontFamily: "'Noto Serif KR', serif" }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{
            display: "flex", gap: 8, padding: "12px 16px",
            borderTop: `1px solid ${theme.border}`, background: theme.card,
          }}>
            <button onClick={() => setChatNotif(!chatNotif)} style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${theme.border}`,
              background: chatNotif ? `${PASTEL.coral}15` : theme.bg,
              fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>{chatNotif ? "🔔" : "🔕"}</button>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="메시지를 입력하세요..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                border: `1.5px solid ${theme.border}`, background: theme.bg,
                color: theme.text, fontSize: 13, fontFamily: "'Noto Serif KR', serif",
              }} />
            <button onClick={sendChat} style={{
              padding: "10px 18px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>전송</button>
          </div>
        </div>
      </ScreenWrap>
    );
  }

  // --- Polygons & Circles Screen (다각형과 원) ---
  if (screen === "polygons") {
    const hasSavedWork = (() => { try { return !!JSON.parse(sessionStorage.getItem("ar_work"))?.triangle; } catch { return false; } })();

    const enterDraw = (loadSaved) => {
      if (loadSaved) {
        // Work will auto-restore from sessionStorage via the existing useEffect
        setScreen("draw");
      } else {
        sessionStorage.removeItem("ar_work");
        resetAll();
        setScreen("draw");
        setBuildPhase("input");
        setTriMode("sss");
      }
    };


    const topics = [
      { icon: "△", label: "삼각형 작도", desc: hasSavedWork ? "이전 작업 있음 ✦" : "SSS · SAS · ASA", compact: true,
        action: () => { if (hasSavedWork) setShowLoadDialog(true); else enterDraw(false); } },
      { icon: "⊙⊙", label: "외접원 옆에 내접원", desc: "두 원의 관계", compact: true, disabled: true },
      { icon: "O · I", label: "외심 옆에 내심", desc: "두 중심의 비교", compact: true, disabled: true },
      { icon: "▲", label: "이등변삼각형", desc: "성질과 활용", compact: true, disabled: true },
      { icon: "∟≅", label: "직각삼각형의 합동", desc: "RHA · RHS", compact: true, disabled: true },
    ];
    return (
      <ScreenWrap title="다각형과 원" back="공부하기" backTo="study">
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, position:"relative" }}>
          <p style={{ fontSize:12, color:theme.textSec, textAlign:"center", margin:"20px 0 0 0" }}>중1-2 · 중2-2 기하 단원</p>
          <MenuGrid items={topics} cols={2} />

          {/* Saved work dialog */}
          {showLoadDialog && (
            <div style={{
              position:"fixed", top:0, left:0, right:0, bottom:0,
              background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center",
              zIndex:1000, animation:"fadeIn 0.2s ease",
            }} onClick={() => setShowLoadDialog(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                background:theme.card, borderRadius:24, padding:"32px 28px",
                width:"min(340px, 85vw)", boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
                border:`1px solid ${theme.border}`, textAlign:"center",
              }}>
                <p style={{ fontSize:18, marginBottom:4 }}>📂</p>
                <p style={{ fontSize:15, fontWeight:700, color:theme.text, marginBottom:8, fontFamily:"'Playfair Display', serif" }}>
                  이전 작업이 있어요
                </p>
                <p style={{ fontSize:12, color:theme.textSec, marginBottom:20, lineHeight:1.5, fontFamily:"'Noto Serif KR', serif" }}>
                  저장된 작업을 이어서 하시겠어요?
                </p>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => { setShowLoadDialog(false); enterDraw(true); }} style={{
                    flex:1, padding:"14px", borderRadius:14, border:"none",
                    background:`linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                    color:"white", fontSize:14, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif",
                  }}>이어서 하기</button>
                  <button onClick={() => { setShowLoadDialog(false); enterDraw(false); }} style={{
                    flex:1, padding:"14px", borderRadius:14,
                    border:`1.5px solid ${theme.border}`, background:theme.card,
                    color:theme.textSec, fontSize:13, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif",
                  }}>새로 시작</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScreenWrap>
    );
  }

  // --- Admin Screen ---
  if (screen === "admin") {
    const adminItems = [
      { icon: "💬", label: "대사 스크립트", desc: "말투별 대사 수정", action: () => setScreen("admin-scripts") },
      { icon: "🔊", label: "효과음 관리", desc: "모드별 효과음 설정", disabled: true },
      { icon: "👤", label: "회원 관리", desc: "권한 · 계정 · 비밀번호", action: () => setScreen("admin-students") },
      { icon: signupRequests.length > 0 ? "🔔" : "📋", label: "가입 신청", desc: signupRequests.length > 0 ? `${signupRequests.length}건 대기 중` : "신청 관리 · 자동승인", action: () => setScreen("admin-signups") },
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

  // --- Admin Member Management ---
  if (screen === "admin-students") {

    const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };
    const inputStyle = { flex: "1 1 70px", padding: "9px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" };

    const addMember = () => {
      if (!newMemberForm.id || !newMemberForm.name) return;
      if (members.find(m => m.id === newMemberForm.id)) { showMsg("이미 존재하는 아이디!", 2000); return; }
      setMembers(prev => [...prev, { ...newMemberForm, nickname: "" }]);
      setNewMemberForm({ id: "", name: "", pw: "1234", role: "student" });
      playSfx("success");
    };

    const filtered = memberFilter === "all" ? members : members.filter(m => m.role === memberFilter);
    const isSelf = (m) => m.id === user?.id;

    return (
      <ScreenWrap title="회원 관리" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Add new member */}
          {userRole === "admin" && (
            <div style={{ background: theme.card, borderRadius: 16, border: `1.5px solid ${PASTEL.mint}`, padding: 14, marginBottom: 16, animation: "fadeIn 0.3s ease" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: PASTEL.mint, display: "block", marginBottom: 10 }}>+ 회원 추가</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input placeholder="이름" value={newMemberForm.name} onChange={e => setNewMemberForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                <input placeholder="아이디" value={newMemberForm.id} onChange={e => setNewMemberForm(p => ({ ...p, id: e.target.value }))} style={inputStyle} />
                <input placeholder="비밀번호" value={newMemberForm.pw} onChange={e => setNewMemberForm(p => ({ ...p, pw: e.target.value }))} style={inputStyle} />
                <select value={newMemberForm.role} onChange={e => setNewMemberForm(p => ({ ...p, role: e.target.value }))}
                  style={{ ...inputStyle, flex: "0 0 80px" }}>
                  <option value="student">수강생</option>
                  <option value="external">외부생</option>
                  <option value="assistant">조교</option>
                </select>
                <button onClick={addMember} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: PASTEL.mint, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>추가</button>
              </div>
            </div>
          )}

          {/* Role filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {[["all", "전체", null], ["admin", "관리자", PASTEL.coral], ["assistant", "조교", PASTEL.lavender], ["student", "수강생", PASTEL.sky], ["external", "외부생", PASTEL.sage]].map(([key, label, color]) => (
              <button key={key} onClick={() => setMemberFilter(key)} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11,
                border: `1.5px solid ${memberFilter === key ? (color || theme.text) : theme.border}`,
                background: memberFilter === key ? `${color || theme.text}15` : theme.card,
                color: memberFilter === key ? (color || theme.text) : theme.textSec,
                cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
                fontWeight: memberFilter === key ? 700 : 400,
              }}>
                {label} ({key === "all" ? members.length : members.filter(m => m.role === key).length})
              </button>
            ))}
          </div>

          {/* Member list */}
          {filtered.map((m) => {
            const isEditing = editingMemberId === m.id;
            const editable = isSelf(m) || canEditMember(m.role);
            const rc = roleColors[m.role] || theme.textSec;
            return (
              <div key={m.id} style={{
                background: theme.card, borderRadius: 14, border: `1px solid ${isEditing ? rc : theme.border}`,
                padding: 12, marginBottom: 8, transition: "border-color 0.2s",
              }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>이름</label>
                        <input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} style={{ ...inputStyle, width: "100%" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>아이디</label>
                        <input value={m.id} disabled style={{ ...inputStyle, width: "100%", opacity: 0.5 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>닉네임</label>
                        <input value={m.nickname || ""} onChange={e => updateMember(m.id, { nickname: e.target.value })} style={{ ...inputStyle, width: "100%" }} placeholder="미설정" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>비밀번호</label>
                        <input value={m.pw} onChange={e => updateMember(m.id, { pw: e.target.value })} style={{ ...inputStyle, width: "100%" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {/* Role change — only admin can change roles, not self-demote */}
                      {userRole === "admin" && !isSelf(m) && (
                        <select value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })}
                          style={{ ...inputStyle, flex: "0 0 90px" }}>
                          <option value="admin">관리자</option>
                          <option value="assistant">조교</option>
                          <option value="student">수강생</option>
                          <option value="external">외부생</option>
                        </select>
                      )}
                      {isSelf(m) && <span style={{ fontSize: 10, color: PASTEL.coral }}>내 계정</span>}
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setEditingMemberId(null)} style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", background: rc, color: "white", fontSize: 11, cursor: "pointer",
                      }}>저장</button>
                      {!isSelf(m) && userRole === "admin" && (
                        <button onClick={() => { deleteMember(m.id); setEditingMemberId(null); }} style={{
                          padding: "7px 14px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer",
                        }}>삭제</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div onClick={() => editable && setEditingMemberId(m.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: editable ? "pointer" : "default" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${rc}20`, color: rc, fontWeight: 700 }}>
                        {ROLES[m.role]}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: theme.textSec }}>@{m.id}</span>
                      {m.nickname && <span style={{ fontSize: 10, color: PASTEL.lavender }}>"{m.nickname}"</span>}
                      {isSelf(m) && <span style={{ fontSize: 9, color: PASTEL.coral, fontWeight: 700 }}>ME</span>}
                    </div>
                    {editable && <span style={{ fontSize: 11, color: theme.textSec }}>편집 ›</span>}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 40 }}>해당 회원이 없어요.</p>}
          <div style={{ height: 60 }} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Admin Signup Management ---
  if (screen === "admin-signups") {
    return (
      <ScreenWrap title="가입 신청 관리" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Auto-approve toggle */}
          <div style={{
            background: theme.card, borderRadius: 16, border: `1.5px solid ${autoApprove ? PASTEL.mint : theme.border}`,
            padding: 16, marginBottom: 20, animation: "fadeIn 0.3s ease",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Noto Serif KR', serif" }}>
                자동 승인
              </span>
              <p style={{ fontSize: 11, color: theme.textSec, margin: "4px 0 0 0" }}>
                {autoApprove ? "신청 즉시 가입이 완료됩니다" : "관리자가 직접 승인해야 합니다"}
              </p>
            </div>
            <button onClick={() => setAutoApprove(!autoApprove)} style={{
              width: 52, height: 28, borderRadius: 14, border: "none",
              background: autoApprove ? PASTEL.mint : theme.lineLight,
              cursor: "pointer", position: "relative", transition: "background 0.3s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: "white",
                position: "absolute", top: 3,
                left: autoApprove ? 27 : 3, transition: "left 0.3s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* Pending requests */}
          <label style={{ fontSize: 12, color: theme.textSec, marginBottom: 8, display: "block" }}>
            대기 중인 신청 ({signupRequests.length}건)
          </label>
          {signupRequests.length === 0 && (
            <div style={{
              textAlign: "center", padding: "40px 20px", color: theme.textSec,
              fontSize: 13, animation: "fadeIn 0.4s ease",
            }}>
              대기 중인 가입 신청이 없어요.
            </div>
          )}
          {signupRequests.map((req, i) => (
            <div key={req.id} style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: 14, marginBottom: 10, animation: `fadeIn ${0.3 + i * 0.05}s ease`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{req.name}</span>
                  <span style={{ fontSize: 12, color: theme.textSec, marginLeft: 8 }}>@{req.id}</span>
                </div>
                <span style={{ fontSize: 10, color: theme.textSec }}>
                  {new Date(req.date).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveSignup(req.id)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  background: PASTEL.mint, color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
                }}>승인</button>
                <button onClick={() => rejectSignup(req.id)} style={{
                  padding: "10px 16px", borderRadius: 10,
                  border: `1px solid ${PASTEL.coral}`, background: "transparent",
                  color: PASTEL.coral, fontSize: 13, cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}>거절</button>
              </div>
            </div>
          ))}

          {/* Approved students count */}
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 14,
            background: theme.bg, border: `1px solid ${theme.border}`,
            textAlign: "center", fontSize: 12, color: theme.textSec,
          }}>
            현재 등록된 학생: {students.length}명
          </div>
          <div style={{ height: 60 }} />
        </div>
      </ScreenWrap>
    );
  }

  // --- Admin Script Editor ---
  if (screen === "admin-scripts") {
    const currentScript = customScripts[editToneKey]?.guide || {};
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
        [editToneKey]: {
          ...prev[editToneKey],
          guide: { ...prev[editToneKey].guide, [key]: value }
        }
      }));
    };

    const resetToDefault = () => {
      setCustomScripts(prev => ({
        ...prev,
        [editToneKey]: JSON.parse(JSON.stringify(TONES[editToneKey]))
      }));
    };

    return (
      <ScreenWrap title="대사 스크립트 편집" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Tone selector tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[["default","기본"],["nagging","잔소리"],["cute","더러운"]].map(([k,label]) => (
              <button key={k} onClick={() => setEditToneKey(k)} style={{
                flex:1, padding:"10px", borderRadius:12,
                border:`2px solid ${editToneKey===k?PASTEL.coral:theme.border}`,
                background:editToneKey===k?theme.accentSoft:theme.card,
                color:theme.text, fontSize:13, fontWeight:editToneKey===k?700:400,
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

            {/* Account info */}
            <div style={{ textAlign:"center", marginBottom:60, padding: 16, borderRadius: 14, background: theme.bg, border: `1px solid ${theme.border}` }}>
              <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 4 }}>내 계정</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{user?.name || "게스트"}</p>
              <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 8, background: `${PASTEL.coral}15`, color: PASTEL.coral, fontWeight: 700 }}>
                {ROLES[userRole] || userRole}
              </span>
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
          padding: "12px 16px", borderBottom: `1px solid ${theme.border}`,
        }}>
          <button onClick={() => { setScreen("polygons"); }} style={{
            background: "none", border: "none", color: theme.textSec, fontSize: 13,
            cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
          }}>← 목록</button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Undo button */}
            {(buildPhase === "jedo" || buildPhase === "jakdo") && (
              <button onClick={() => { handleUndo(); }} disabled={undoStack.length === 0} style={{
                background: "none", border: `1px solid ${undoStack.length > 0 ? theme.border : "transparent"}`,
                borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: undoStack.length > 0 ? "pointer" : "default",
                color: undoStack.length > 0 ? theme.text : theme.lineLight,
                fontFamily: "'Noto Serif KR', serif", transition: "all 0.2s",
              }}>↩ 되돌리기</button>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>
              삼각형 그리기
            </span>
          </div>
          <button onClick={() => { resetAll(); sessionStorage.removeItem("ar_work"); }} style={{
            background: "none", border: "none", color: PASTEL.coral, fontSize: 12,
            cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
          }}>재시도 ↻</button>
        </div>

        {/* Content area: PC = row (SVG left, panels right), Mobile = column */}
        <div style={{
          flex: 1, display: "flex",
          flexDirection: isPC ? "row" : "column",
          overflow: "hidden",
        }}>

        {/* Left section: mode tabs + SVG + properties */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mode tabs - A/B toggle + sub-modes */}
        {buildPhase === "input" && !triangle && (
          <div style={{ padding: "10px 20px", animation: "fadeIn 0.4s ease" }}>
            {/* A/B toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[["A", "수치 입력"], ["B", "직접 그리기"]].map(([key, label]) => (
                <button key={key} onClick={() => {
                  setInputMode(key);
                  if (!triMode) setTriMode("sss");
                  setDrawStrokes([]); setDrawAngles([]); setCurrentStroke([]); setDrawStep(0);
                }} style={{
                  flex: 1, padding: "8px", borderRadius: 10, fontSize: 12,
                  border: `2px solid ${inputMode === key ? PASTEL.coral : theme.border}`,
                  background: inputMode === key ? theme.accentSoft : theme.card,
                  color: theme.text, cursor: "pointer", fontWeight: inputMode === key ? 700 : 400,
                  fontFamily: "'Noto Serif KR', serif", transition: "all 0.3s ease",
                }}>
                  {key === "A" ? "✏️" : "👆"} {label}
                </button>
              ))}
            </div>
            {/* SSS/SAS/ASA sub-tabs (both modes) */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {[["sss", "SSS"], ["sas", "SAS"], ["asa", "ASA"]].map(([key, label]) => (
                <button key={key} onClick={() => {
                  setTriMode(key);
                  setDrawStrokes([]); setDrawAngles([]); setCurrentStroke([]);
                  if (inputMode === "B") setDrawStep(1);
                }} style={{
                  padding: "8px 20px", borderRadius: 12, fontSize: 13,
                  border: `1.5px solid ${triMode === key ? PASTEL.coral : theme.border}`,
                  background: triMode === key ? theme.accentSoft : theme.card,
                  color: theme.text, cursor: "pointer", fontWeight: triMode === key ? 700 : 400,
                  fontFamily: "'Playfair Display', serif", transition: "all 0.3s ease",
                }}>{label}</button>
              ))}
            </div>
            {/* B-mode drawing guide */}
            {inputMode === "B" && drawStep > 0 && (
              <p style={{ fontSize: 12, color: PASTEL.coral, textAlign: "center", margin: 0, fontFamily: "'Noto Serif KR', serif", fontWeight: 700 }}>
                {drawStep === 1 && triMode === "sss" && `세 변을 각각 그려주세요! (${drawStrokes.length}/3)`}
                {drawStep === 1 && triMode === "sas" && `두 변을 먼저 각각 그려주세요! (${drawStrokes.length}/2)`}
                {drawStep === 1 && triMode === "asa" && `밑변을 먼저 그려주세요! (${drawStrokes.length}/1)`}
                {drawStep === 2 && triMode === "sas" && `< 모양으로 끼인각을 표시해보세요! (${drawAngles.length}/1)`}
                {drawStep === 2 && triMode === "asa" && `< 모양으로 각도를 2개 표시해보세요! (${drawAngles.length}/2)`}
              </p>
            )}
            {inputMode === "B" && drawStep === 0 && triMode && (
              <p style={{ fontSize: 12, color: theme.textSec, textAlign: "center", margin: 0, fontFamily: "'Noto Serif KR', serif" }}>
                위에서 모드를 선택하면 시작돼요!
              </p>
            )}
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
              cursor: buildPhase === "jedo" ? "crosshair" : buildPhase === "jakdo" ? getJakdoCursor() : inputMode === "B" && buildPhase === "input" && !triangle ? "crosshair" : "default",
              transition: "height 0.4s ease, border-color 0.3s ease, border-radius 0.3s ease",
              width: "100%", maxWidth: svgSize.w,
              touchAction: "none",
            }}
            onClick={buildPhase === "jedo" ? handleJedoClick : undefined}
            onWheel={handleWheel}
            onMouseDown={(e) => { handleMouseDown(e); if(buildPhase==="jakdo") handleJakdoDown(e); handleDrawStart(e); }}
            onMouseMove={(e) => { handleMouseMove(e); if(buildPhase==="jakdo") handleJakdoMove(e); handleDrawMove(e); }}
            onMouseUp={(e) => { handleMouseUp(e); if(buildPhase==="jakdo") handleJakdoUp(e); handleDrawEnd(e); }}
            onTouchStart={(e) => { handleTouchStart(e); if(buildPhase==="jakdo") handleJakdoDown(e); handleDrawStart(e); }}
            onTouchMove={(e) => { handleTouchMove(e); if(buildPhase==="jakdo") handleJakdoMove(e); handleDrawMove(e); }}
            onTouchEnd={(e) => { handleTouchEnd(e); if(buildPhase==="jakdo") handleJakdoUp(e); handleDrawEnd(e); }}
          >
            {/* Global SVG styles — keep stroke width constant on zoom */}
            <defs>
              <style>{`
                line, path, polyline, polygon, circle { vector-effect: non-scaling-stroke; }
              `}</style>
            </defs>
            {/* Grid dots */}
            {[...Array(Math.floor(svgSize.w / 30))].map((_, i) =>
              [...Array(Math.floor(svgSize.h / 30))].map((_, j) => (
                <circle key={`${i}-${j}`} cx={15 + i * 30} cy={15 + j * 30} r={0.8}
                  fill={theme.lineLight} opacity={0.3} />
              ))
            )}

            {renderTriangleAnim()}

            {/* B-mode: completed strokes (lines) */}
            {inputMode === "B" && drawStep > 0 && drawStrokes.map((s, i) => (
              <g key={`ds${i}`}>
                <line x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y}
                  stroke={PASTEL.coral} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
                <FixedG x={(s.start.x+s.end.x)/2} y={(s.start.y+s.end.y)/2}>
                  <text x={(s.start.x+s.end.x)/2} y={(s.start.y+s.end.y)/2 - 12}
                    textAnchor="middle" fill={PASTEL.coral} fontSize={11}
                    fontFamily="'Playfair Display', serif" fontWeight={700}>
                    {s.lengthUnit.toFixed(1)}
                  </text>
                </FixedG>
                <FixedG x={s.start.x} y={s.start.y}>
                  <circle cx={s.start.x} cy={s.start.y} r={4} fill={PASTEL.coral} />
                </FixedG>
                <FixedG x={s.end.x} y={s.end.y}>
                  <circle cx={s.end.x} cy={s.end.y} r={4} fill={PASTEL.coral} />
                </FixedG>
              </g>
            ))}
            {/* B-mode: completed angle marks */}
            {inputMode === "B" && drawStep === 2 && drawAngles.map((a, i) => (
              <g key={`da${i}`}>
                <line x1={a.arm1.x} y1={a.arm1.y} x2={a.vertex.x} y2={a.vertex.y}
                  stroke={PASTEL.lavender} strokeWidth={2} opacity={0.7} />
                <line x1={a.vertex.x} y1={a.vertex.y} x2={a.arm2.x} y2={a.arm2.y}
                  stroke={PASTEL.lavender} strokeWidth={2} opacity={0.7} />
                <FixedG x={a.vertex.x} y={a.vertex.y}>
                  <circle cx={a.vertex.x} cy={a.vertex.y} r={4} fill={PASTEL.lavender} />
                  <text x={a.vertex.x} y={a.vertex.y - 14} textAnchor="middle"
                    fill={PASTEL.lavender} fontSize={11} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                    {a.angle.toFixed(1)}°
                  </text>
                </FixedG>
              </g>
            ))}
            {/* B-mode: current stroke in progress */}
            {inputMode === "B" && isDrawing && currentStroke.length > 1 && (
              <polyline
                points={currentStroke.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={drawStep === 2 ? PASTEL.lavender : PASTEL.coral}
                strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.6}
              />
            )}

            {/* Property highlight overlay */}
            {showProperties && renderHighlight()}

            {/* Jakdo drawn arcs (proper arc paths) */}
            {jakdoArcs.map((arc, i) => {
              const sx = arc.center.x + arc.radius * Math.cos(arc.startAngle);
              const sy = arc.center.y + arc.radius * Math.sin(arc.startAngle);
              const ex = arc.center.x + arc.radius * Math.cos(arc.endAngle);
              const ey = arc.center.y + arc.radius * Math.sin(arc.endAngle);
              // Compute actual swept angle respecting drawing direction
              let swept = arc.endAngle - arc.startAngle;
              // Normalize to [0, 2π] for CW or [-2π, 0] for CCW based on freehand direction
              if (arc.sweepCW !== undefined) {
                // Use stored sweep direction
                if (arc.sweepCW) { while (swept < 0) swept += 2*Math.PI; }
                else { while (swept > 0) swept -= 2*Math.PI; }
              } else {
                if (swept < -Math.PI) swept += 2*Math.PI;
                if (swept > Math.PI) swept -= 2*Math.PI;
              }
              const largeArc = Math.abs(swept) > Math.PI ? 1 : 0;
              const sweep = swept > 0 ? 1 : 0;
              return (
                <g key={`arc${i}`}>
                  <path d={`M ${sx} ${sy} A ${arc.radius} ${arc.radius} 0 ${largeArc} ${sweep} ${ex} ${ey}`}
                    fill="none" stroke={PASTEL.lavender} strokeWidth={2} opacity={0.8} />
                  {/* Intersection points — only show in jakdo mode, hide during jedo */}
                  {buildPhase === "jakdo" && arc.intersections?.map((ip, j) => (
                    <FixedG key={j} x={ip.x} y={ip.y}>
                      <circle cx={ip.x} cy={ip.y} r={5}
                        fill={PASTEL.coral} stroke="white" strokeWidth={1.5} opacity={0.9}
                        style={{ cursor: "pointer" }}>
                        <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    </FixedG>
                  ))}
                </g>
              );
            })}
            {/* Jakdo ruler lines */}
            {jakdoRulerLines.map((line, i) => (
              <line key={`rl${i}`} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
                stroke={PASTEL.sky} strokeWidth={2} opacity={0.8} />
            ))}
            {/* Compass Phase 2: radius preview (dotted line) */}
            {compassPhase === "radiusSet" && compassCenter && compassDragPt && (
              <g>
                <line x1={compassCenter.x} y1={compassCenter.y} x2={compassDragPt.x} y2={compassDragPt.y}
                  stroke={PASTEL.coral} strokeWidth={1.5} strokeDasharray={"5 3"} opacity={0.7} />
                <circle cx={compassCenter.x} cy={compassCenter.y} r={compassRadius}
                  fill="none" stroke={PASTEL.coral} strokeWidth={1} strokeDasharray="3 5" opacity={0.3} />
                <FixedG x={compassCenter.x + 10} y={compassCenter.y - 10}>
                  <text x={compassCenter.x + 10} y={compassCenter.y - 10} fill={PASTEL.coral}
                    fontSize={11} fontFamily="'Noto Serif KR', serif">
                    r={compassRadius > 0 ? (compassRadius / (triangle?.scale || 1)).toFixed(1) : "..."}
                  </text>
                </FixedG>
              </g>
            )}
            {/* Compass Phase 3: freehand arc preview */}
            {compassPhase === "drawingArc" && compassCenter && compassRadius > 0 && (
              <g>
                <circle cx={compassCenter.x} cy={compassCenter.y} r={compassRadius}
                  fill="none" stroke={PASTEL.lavender} strokeWidth={1} strokeDasharray="3 5" opacity={0.2} />
                <FixedG x={compassCenter.x} y={compassCenter.y}>
                  <circle cx={compassCenter.x} cy={compassCenter.y} r={3} fill={PASTEL.coral} />
                </FixedG>
                {arcDrawPoints.length > 1 && (
                  <polyline
                    points={arcDrawPoints.map(p => {
                      const a = Math.atan2(p.y - compassCenter.y, p.x - compassCenter.x);
                      return `${compassCenter.x + compassRadius*Math.cos(a)},${compassCenter.y + compassRadius*Math.sin(a)}`;
                    }).join(" ")}
                    fill="none" stroke={PASTEL.coral} strokeWidth={2.5} opacity={0.8} />
                )}
              </g>
            )}
            {/* Ruler start point preview */}
            {rulerStart && buildPhase === "jakdo" && jakdoTool === "ruler" && (
              <FixedG x={rulerStart.x} y={rulerStart.y}>
                <circle cx={rulerStart.x} cy={rulerStart.y} r={5} fill={PASTEL.sky} opacity={0.8}>
                  <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
                </circle>
              </FixedG>
            )}
            {/* Snap points glow in jakdo mode */}
            {buildPhase === "jakdo" && (compassPhase === "idle" || jakdoTool === "ruler") && jakdoSnaps.map((sp, i) => {
              const isPressed = pressedSnap && Math.abs(sp.x - pressedSnap.x) < 2 && Math.abs(sp.y - pressedSnap.y) < 2;
              return (
                <FixedG key={`snap${i}`} x={sp.x} y={sp.y}>
                  <circle cx={sp.x} cy={sp.y} r={isPressed ? 12 : 8}
                    fill={isPressed ? `${PASTEL.coral}40` : "transparent"}
                    stroke={isPressed ? PASTEL.coral : PASTEL.coral}
                    strokeWidth={isPressed ? 2.5 : 1}
                    strokeDasharray={isPressed ? "none" : "2 2"}
                    opacity={isPressed ? 1 : 0.4}
                    style={{ transition: "all 0.15s ease" }} />
                </FixedG>
              );
            })}

            {/* Fail animation */}
            {failAnim && (
              <FixedG x={svgSize.w / 2} y={svgSize.h / 2}>
                <text x={svgSize.w / 2} y={svgSize.h / 2} textAnchor="middle"
                  fill={PASTEL.coral} fontSize={14} fontFamily="'Noto Serif KR', serif"
                  opacity={0.8}>
                  ✕ 삼각형 불가
                </text>
              </FixedG>
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

        {/* Scrollable Properties List — only this scrolls (mobile only, PC uses right panel) */}
        {showProperties && !isPC && (
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
              {/* Archive save in mobile properties */}
              {!isPC && jedoCircle && (
                <button onClick={() => setShowArchiveSave(true)} style={{
                  width: "100%", padding: "12px", borderRadius: 12, marginTop: 12,
                  border: `1.5px solid ${PASTEL.mint}`, background: `${PASTEL.mint}15`,
                  color: theme.text, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}>📁 아카이브에 저장</button>
              )}
            </div>
          </div>
        )}

        </div>{/* end left section */}

        {/* Right section: panels (PC = sidebar, Mobile = bottom) */}
        <div style={{
          ...(isPC ? {
            width: 340, flexShrink: 0, borderLeft: `1px solid ${theme.border}`,
            overflowY: "auto", background: theme.card,
            display: "flex", flexDirection: "column",
          } : {}),
          display: (!isPC && showProperties && !showArchiveSave) ? "none" : undefined,
        }}>

        {/* PC sidebar header */}
        {isPC && (
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
            <div style={{ fontSize: 11, color: theme.textSec, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>
              {buildPhase === "input" ? "입력 패널" :
               buildPhase === "modeSelect" ? "모드 선택" :
               buildPhase === "jedo" ? "제도 모드" :
               buildPhase === "jakdo" ? "작도 도구" : "도구"}
            </div>
          </div>
        )}

        {/* Input Panel */}
        {/* Idle dialogue when no active input needed */}
        {buildPhase && buildPhase !== "input" && !showProperties && !showArchiveSave && (
          <div style={{
            padding: "16px 20px", borderTop: isPC ? "none" : `1px solid ${theme.border}`,
            background: isPC ? "transparent" : theme.card,
            textAlign: "center", animation: "fadeIn 0.5s ease",
          }}>
            <p style={{ fontSize: 13, color: theme.textSec, fontFamily: "'Noto Serif KR', serif", fontStyle: "italic" }}>
              {idleMsg}
            </p>
          </div>
        )}

        {/* Archive save dialog */}
        {showArchiveSave && (
          <div style={{
            padding: "20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 14, fontFamily: "'Playfair Display', serif" }}>
              아카이브에 저장
            </p>
            <label style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
              fontSize: 13, color: theme.text, cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
            }}>
              <input type="checkbox" checked={archivePublic} onChange={e => setArchivePublic(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: PASTEL.coral }} />
              공개로 저장 (피드에 공유)
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveToArchive} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}>저장하기</button>
              <button onClick={() => setShowArchiveSave(false)} style={{
                padding: "12px 20px", borderRadius: 12,
                border: `1px solid ${theme.border}`, background: theme.card,
                color: theme.textSec, fontSize: 13, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}>취소</button>
            </div>
          </div>
        )}

        {/* Properties "성질 확인" + archive save in right panel for PC */}
        {jedoCircle && showProperties && isPC && (
          <div style={{ padding: "12px 16px 60px 16px", overflowY: "auto", flex: 1, borderTop: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>
                ✦ {jedoType === "circum" ? "외심 & 외접원" : "내심 & 내접원"}
              </span>
              <button onClick={() => { setShowProperties(false); setSelectedProp(null); }} style={{
                background: "none", border: "none", color: theme.textSec, fontSize: 12, cursor: "pointer",
              }}>접기 ▲</button>
            </div>
            {getProperties().map((item, i) => {
              const isSelected = selectedProp === item.id;
              return (
                <button key={item.id} onClick={() => setSelectedProp(isSelected ? null : item.id)} style={{
                  width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: 12,
                  background: isSelected ? `${item.color}20` : theme.card,
                  border: `1.5px solid ${isSelected ? item.color : theme.border}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 4, minHeight: 28, borderRadius: 2, background: item.color, opacity: isSelected ? 1 : 0.4 }} />
                  <span style={{ fontSize: 12, color: isSelected ? item.color : theme.text, fontWeight: item.bold ? 700 : 400,
                    fontFamily: "'Noto Serif KR', serif", lineHeight: 1.5 }}>{item.text}</span>
                </button>
              );
            })}
            {/* Archive save button in properties */}
            <button onClick={() => setShowArchiveSave(true)} style={{
              width: "100%", padding: "12px", borderRadius: 12, marginTop: 12,
              border: `1.5px solid ${PASTEL.mint}`, background: `${PASTEL.mint}15`,
              color: theme.text, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>📁 아카이브에 저장</button>
          </div>
        )}

        {/* B-mode drawing status panel */}
        {buildPhase === "input" && inputMode === "B" && drawStep > 0 && !triangle && (
          <div style={{
            padding: "14px 20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.3s ease",
          }}>
            {/* Progress indicators */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {drawStrokes.map((s, i) => (
                <span key={`sl${i}`} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: `${PASTEL.coral}15`, color: PASTEL.coral, fontWeight: 700 }}>
                  변{i+1}={s.lengthUnit.toFixed(1)}
                </span>
              ))}
              {drawAngles.map((a, i) => (
                <span key={`al${i}`} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: `${PASTEL.lavender}15`, color: PASTEL.lavender, fontWeight: 700 }}>
                  ∠{i+1}={a.angle.toFixed(1)}°
                </span>
              ))}
            </div>
            {/* Retry button */}
            <button onClick={retryDraw} style={{
              width: "100%", padding: "12px", borderRadius: 12,
              border: `1.5px solid ${theme.border}`, background: theme.card,
              color: theme.textSec, fontSize: 12, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>↻ 처음부터 다시 그리기</button>
          </div>
        )}

        {/* B-mode initial guide (no mode selected or step 0) */}
        {buildPhase === "input" && inputMode === "B" && drawStep === 0 && !triangle && (
          <div style={{
            padding: "16px 20px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.3s ease", textAlign: "center",
          }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>👆</p>
            <p style={{ fontSize: 13, color: theme.text, fontFamily: "'Noto Serif KR', serif", marginBottom: 4 }}>
              위에서 SSS / SAS / ASA를 선택하세요
            </p>
            <p style={{ fontSize: 11, color: theme.textSec, fontFamily: "'Noto Serif KR', serif" }}>
              모드별로 다른 방식으로 삼각형을 그려요
            </p>
          </div>
        )}

        {/* Input Panel (original for non-PC or when PC properties not shown) */}
        {buildPhase === "input" && !triangle && triMode === "sss" && (
          <div style={{
            padding: isPC ? "16px" : "20px", borderTop: isPC ? "none" : `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", flexDirection: isPC ? "column" : "row", gap: 10, marginBottom: 14 }}>
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

        {buildPhase === "input" && !triangle && triMode === "sas" && (
          <div style={{
            padding: isPC ? "16px" : "20px", borderTop: isPC ? "none" : `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", flexDirection: isPC ? "column" : "row", gap: 10, marginBottom: 14 }}>
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
              // a=BC (base), c=AB (side1 from B to A), b=AC (side2 from C to A)
              const tri = generateTriangleWithBase(a, c, b);
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

        {buildPhase === "input" && !triangle && triMode === "asa" && (
          <div style={{
            padding: isPC ? "16px" : "20px", borderTop: isPC ? "none" : `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ display: "flex", flexDirection: isPC ? "column" : "row", gap: 10, marginBottom: 14 }}>
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
              // a=BC (base), b=AC (side from C to A), c=AB (side from B to A)
              const tri = generateTriangleWithBase(a, c, b);
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

        {/* Mode Selection - hidden when properties are open */}
        {buildPhase === "modeSelect" && !showProperties && (
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
            padding: "14px 16px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.5s ease",
          }}>
            <style>{`
              @keyframes compassSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes compassPoke { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
              @keyframes compassStretch { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(1.15); } }
              @keyframes rulerSlide { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
              @keyframes rulerDraw { 0% { width: 0; } 100% { width: 100%; } }
            `}</style>

            {/* Tool selector row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => {
                if (jakdoTool !== "compass") {
                  setJakdoTool("compass"); setCompassPhase("idle");
                  if (!jakdoTool) showMsg(activeTone.guide.compassStart, 2000);
                  playSfx("click");
                }
              }} style={{
                flex: 1, padding: "10px 8px", borderRadius: 12,
                border: `2px solid ${jakdoTool === "compass" ? PASTEL.coral : theme.border}`,
                background: jakdoTool === "compass" ? theme.accentSoft : theme.card,
                color: theme.text, fontSize: 13, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: jakdoTool === "compass" ? 700 : 400,
              }}>
                <span style={{ display: "inline-block", animation: jakdoTool === "compass" ? "compassSpin 3s linear infinite" : "none" }}>⭕</span> 컴퍼스
              </button>
              <button onClick={() => {
                if (jakdoArcs.length === 0) { showMsg(activeTone.guide.rulerFirst, 2000); playSfx("error"); return; }
                setJakdoTool("ruler"); setRulerPhase("idle"); playSfx("click");
              }} style={{
                flex: 1, padding: "10px 8px", borderRadius: 12,
                border: `2px solid ${jakdoTool === "ruler" ? PASTEL.sky : theme.border}`,
                background: jakdoTool === "ruler" ? `${PASTEL.sky}15` : theme.card,
                color: jakdoArcs.length > 0 ? theme.text : theme.textSec,
                fontSize: 13, cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif", fontWeight: jakdoTool === "ruler" ? 700 : 400,
              }}>
                <span style={{ display: "inline-block", animation: jakdoTool === "ruler" ? "rulerSlide 1.5s ease-in-out infinite" : "none" }}>📏</span> 눈금없는 자
              </button>
            </div>

            {/* Compass sub-steps — clickable for phase control */}
            {jakdoTool === "compass" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {/* Step 0: Center */}
                <div onClick={() => {
                  setCompassPhase("idle"); setCompassCenter(null); setCompassRadius(0);
                  setCompassDragPt(null); setArcDrawPoints([]);
                }} style={{
                  flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10, cursor: "pointer",
                  background: compassStep === 0 ? `${PASTEL.coral}20` : theme.bg,
                  border: `1.5px solid ${compassStep === 0 ? PASTEL.coral : compassStep > 0 ? PASTEL.mint : theme.border}`,
                  transition: "all 0.3s ease",
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2, display: "inline-block",
                    animation: compassStep === 0 ? "compassPoke 1s ease infinite" : "none" }}>📍</div>
                  <div style={{ fontSize: 10, color: compassStep === 0 ? PASTEL.coral : compassStep > 0 ? PASTEL.mint : theme.textSec,
                    fontWeight: compassStep === 0 ? 700 : 400, fontFamily: "'Noto Serif KR', serif" }}>중심점 찍기</div>
                  {compassStep > 0 && <div style={{ fontSize: 9, color: PASTEL.mint }}>✓</div>}
                </div>
                {/* Step 1: Radius */}
                <div style={{
                  flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10,
                  background: compassStep === 1 ? `${PASTEL.coral}20` : theme.bg,
                  border: `1.5px solid ${compassStep === 1 ? PASTEL.coral : compassStep > 1 ? PASTEL.mint : theme.border}`,
                  opacity: compassStep >= 1 ? 1 : 0.4, transition: "all 0.3s ease",
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2, display: "inline-block",
                    animation: compassStep === 1 ? "compassStretch 1.2s ease infinite" : "none" }}>↔️</div>
                  <div style={{ fontSize: 10, color: compassStep === 1 ? PASTEL.coral : compassStep > 1 ? PASTEL.mint : theme.textSec,
                    fontWeight: compassStep === 1 ? 700 : 400, fontFamily: "'Noto Serif KR', serif" }}>거리 벌리기</div>
                  {compassRadius > 0 && compassStep >= 1 && <div style={{ fontSize: 9, color: PASTEL.mint }}>✓ r={( compassRadius / (triangle?.scale || 1)).toFixed(1)}</div>}
                </div>
                {/* Step 2: Draw Arc — clickable to enter arc mode */}
                <div onClick={() => {
                  if (compassPhase === "radiusSet" && compassRadius > 8) {
                    setCompassPhase("drawingArc");
                    setArcDrawPoints([]);
                    showMsg("호를 그려주세요!", 1500);
                    playSfx("click");
                  }
                }} style={{
                  flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10,
                  cursor: compassPhase === "radiusSet" && compassRadius > 8 ? "pointer" : "default",
                  background: compassStep === 2 ? `${PASTEL.coral}20` : theme.bg,
                  border: `1.5px solid ${compassStep === 2 ? PASTEL.coral : theme.border}`,
                  opacity: (compassPhase === "radiusSet" && compassRadius > 8) || compassStep === 2 ? 1 : 0.4,
                  transition: "all 0.3s ease",
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2, display: "inline-block",
                    animation: compassStep === 2 ? "compassSpin 2s linear infinite" : "none" }}>🌀</div>
                  <div style={{ fontSize: 10, color: compassStep === 2 ? PASTEL.coral : theme.textSec,
                    fontWeight: compassStep === 2 ? 700 : 400, fontFamily: "'Noto Serif KR', serif" }}>호 돌리기</div>
                </div>
              </div>
            )}

            {/* Ruler sub-steps */}
            {jakdoTool === "ruler" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {[
                  { label: "자 대기", icon: "📏", active: !rulerStart },
                  { label: "선 긋기", icon: "✏️", active: !!rulerStart },
                ].map(({ label, icon, active }, idx) => (
                  <div key={idx} style={{
                    flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10,
                    background: active ? `${PASTEL.sky}20` : theme.bg,
                    border: `1.5px solid ${active ? PASTEL.sky : theme.border}`,
                    transition: "all 0.3s ease",
                  }}>
                    <div style={{
                      fontSize: 18, marginBottom: 2, display: "inline-block",
                      animation: active ? "rulerSlide 1.5s ease-in-out infinite" : "none",
                    }}>{icon}</div>
                    <div style={{
                      fontSize: 10, color: active ? PASTEL.sky : theme.textSec,
                      fontWeight: active ? 700 : 400, fontFamily: "'Noto Serif KR', serif",
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Status + Work list */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: theme.textSec, padding: "3px 8px", background: theme.bg, borderRadius: 6 }}>
                호 {jakdoArcs.length}/{MAX_ARCS} · 선 {jakdoRulerLines.length}/{MAX_RULER_LINES}
              </span>
              {crossedEdges > 0 && compassPhase === "radiusSet" && (
                <span style={{ fontSize: 10, color: PASTEL.mint, padding: "3px 8px", background: `${PASTEL.mint}15`, borderRadius: 6, fontWeight: 700 }}>
                  {crossedEdges === 1 ? "수직이등분선?" : "각이등분선!"}
                </span>
              )}
            </div>

            {/* Work history (deletable) */}
            {(jakdoArcs.length > 0 || jakdoRulerLines.length > 0) && (
              <div style={{ maxHeight: 120, overflowY: "auto", marginBottom: 8, borderRadius: 8, background: theme.bg, padding: "6px", WebkitOverflowScrolling: "touch" }}>
                {jakdoArcs.map((arc, i) => (
                  <div key={`a${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px", fontSize: 10, color: PASTEL.lavender }}>
                    <span>⭕ 호 #{i+1}</span>
                    <button onClick={() => deleteArc(i)} style={{
                      background: "none", border: "none", color: PASTEL.coral, fontSize: 10, cursor: "pointer", padding: "2px 6px",
                    }}>✕</button>
                  </div>
                ))}
                {jakdoRulerLines.map((_, i) => (
                  <div key={`l${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px", fontSize: 10, color: PASTEL.sky }}>
                    <span>📏 선 #{i+1}</span>
                    <button onClick={() => deleteRulerLine(i)} style={{
                      background: "none", border: "none", color: PASTEL.coral, fontSize: 10, cursor: "pointer", padding: "2px 6px",
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Guide text */}
            <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center", margin: 0 }}>
              {jakdoTool === "compass" && compassStep === 0 && "꼭지점이나 교점을 터치하세요"}
              {jakdoTool === "compass" && compassStep === 1 && compassDragPt && "드래그해서 반지름을 정해주세요"}
              {jakdoTool === "compass" && compassStep === 1 && !compassDragPt && compassRadius > 0 && "'호 돌리기' 버튼을 눌러주세요"}
              {jakdoTool === "compass" && compassStep === 1 && !compassDragPt && compassRadius === 0 && "드래그해서 반지름을 정해주세요"}
              {jakdoTool === "compass" && compassStep === 2 && "손가락으로 호를 그려주세요"}
              {jakdoTool === "ruler" && !rulerStart && "시작점을 터치하세요"}
              {jakdoTool === "ruler" && rulerStart && "끝점을 터치하세요"}
              {!jakdoTool && "도구를 선택해주세요"}
            </p>
          </div>
        )}
        </div>{/* end right section */}
        </div>{/* end content area */}
      </div>
    );
  }

  return null;
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
