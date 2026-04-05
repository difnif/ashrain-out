import { useFirestoreSync } from "./hooks/useFirestoreSync";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PASTEL, THEMES, TONES,
  dist, midpoint, lerp,
  perpBisector, angleBisector, lineIntersection,
  circumcenter, incenter, pointToSegDist, closestPointOnLine,
  triangleType, angleAtVertex, detectTriangleFromStroke,
} from "./config";
import { ErrorBoundary } from "./components/ErrorBoundary";
import FloatingMsg from "./components/FloatingMsg";
import InfoPanel from "./components/InfoPanel";
import { renderLoginScreen, renderSignupScreen } from "./screens/AuthScreens";
import { renderPlazaScreen } from "./screens/PlazaScreen";
import {
  renderAdminScreen, renderAdminStudentsScreen, renderAdminPermsScreen,
  renderAdminSignupsScreen, renderAdminScriptsScreen,
} from "./screens/AdminScreens";
import { renderProblemScreen } from "./screens/ProblemScreen";
import { renderStudentHomeScreen } from "./screens/StudentHomeScreen";
import { renderQuestionInboxScreen } from "./screens/QuestionInboxScreen";
import { renderCongruenceScreen } from "./screens/CongruenceScreen";
import { TutorialOverlay, useTutorial } from "./components/TutorialOverlay";
import { renderLearningDashboard } from "./screens/LearningDashboard";
import { renderParentHomeScreen } from "./screens/ParentHomeScreen";
import { renderSVGEditorScreen } from "./screens/SVGEditorScreen";
import { renderRankingScreen } from "./screens/RankingScreen";
import { renderQuizScreen } from "./screens/QuizScreen";
import { renderDistanceScreen } from "./screens/DistanceScreen";
import { renderSettingsScreen } from "./screens/SettingsScreen";
import { renderDrawScreen } from "./screens/DrawScreen";
import { getProperties as getPropertiesFn, renderHighlight as renderHighlightFn, renderTriangleAnim as renderTriangleAnimFn } from "./rendering/TriangleRenderer";
import { useUserSystem } from "./hooks/useUserSystem";
import { useJakdoCanvas } from "./hooks/useJakdoCanvas";

// ============================================================
// ashrain.out — Interactive Geometry Education App (v5.1)
// ============================================================

function ScreenWrapOuter({ children, title, back, backTo, theme, playSfx, setScreen, themeKey }) {
  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} } .blink{animation:blink 1.2s ease-in-out infinite}
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }`}</style>
      {title && (
        <div style={{ flexShrink: 0, display:"flex", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${theme.border}` }}>
          {back && <button onClick={() => { playSfx("click"); setScreen(backTo||"menu"); }} style={{ background:"none", border:"none", color:theme.textSec, fontSize:13, cursor:"pointer", fontFamily:"'Noto Serif KR', serif" }}>← {back}</button>}
          <span style={{ flex:1, textAlign:"center", fontSize:14, fontWeight:700, color:theme.text, fontFamily:"'Playfair Display', serif" }}>{title}</span>
          {back && <span style={{width:40}} />}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

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
  const showMsg = useCallback((msg, duration = 2500) => {
    setFloatingMsg(msg);
    setTimeout(() => setFloatingMsg(null), duration);
  }, []);
  const [showProperties, setShowProperties] = useState(false);
  const [selectedProp, setSelectedProp] = useState(null);
  const [canvasHeight, setCanvasHeight] = useState(null); // null = auto (svgSize.h), number = manual
  const canvasDragRef = useRef(null);
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
  const [compareSelected, setCompareSelected] = useState(null);

  // Student mode / LMS state
  const [isStudentModePreview, setIsStudentModePreview] = useState(false);
  const [helpRequests, setHelpRequests] = useState([]);
  const [studentHomework, setStudentHomework] = useState([]);
  const [studentArchive, setStudentArchive] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("ar_archive"));
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [studentNotifications, setStudentNotifications] = useState([]);
  const [studentDiary, setStudentDiary] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("ar_diary"));
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("ar_diary", JSON.stringify(studentDiary)); }, [studentDiary]);

  const [signupRole, setSignupRole] = useState("student");
  const [crossTalkPosts, setCrossTalkPosts] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("ar_crosstalk"));
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("ar_crosstalk", JSON.stringify(crossTalkPosts)); }, [crossTalkPosts]);

  const [analysisModel, setAnalysisModel] = useState(() => localStorage.getItem("ar_analysis_model") || "claude-sonnet-4-20250514");
  useEffect(() => { localStorage.setItem("ar_analysis_model", analysisModel); }, [analysisModel]);

  const [archiveDefaultPublic, setArchiveDefaultPublic] = useState(() => localStorage.getItem("ar_archive_public") === "true");
  useEffect(() => { localStorage.setItem("ar_archive_public", archiveDefaultPublic); }, [archiveDefaultPublic]);

  const sendHomeworkToChild = useCallback((hwData) => {
    if (!hwData) return;
    setStudentHomework(prev => [...prev, {
      id: `hw-${Date.now()}`, ...hwData,
      assignedAt: Date.now(), status: "assigned", reviewCount: 0,
    }]);
    setStudentNotifications(prev => [...prev, {
      id: `notif-hw-${Date.now()}`, userId: hwData.studentId,
      title: "📝 새 숙제!", message: hwData.problemType || "복습 숙제",
      time: Date.now(), read: false, type: "homework",
    }]);
  }, []);

  const tutorial = useTutorial();
  useEffect(() => {
    if (screen === "menu") tutorial.trigger("welcome");
    if (screen === "draw" || screen === "polygons") tutorial.trigger("draw-first");
    if (screen === "sentence") tutorial.trigger("problem-first");
  }, [screen]);

  const [helpPopupData, setHelpPopupData] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(null);
  const svgPanRef = useRef(null);

  const [dndStart, setDndStart] = useState(() => localStorage.getItem("ar_dnd_start") || "23:00");
  const [dndEnd, setDndEnd] = useState(() => localStorage.getItem("ar_dnd_end") || "07:00");

  // Firestore sync for LMS data (질문·숙제·알림)
  useFirestoreSync("data", "helpRequests", helpRequests, setHelpRequests, []);
  useFirestoreSync("data", "homework", studentHomework, setStudentHomework, []);
  useFirestoreSync("data", "notifications", studentNotifications, setStudentNotifications, []);

  // localStorage for non-shared data
  useEffect(() => { localStorage.setItem("ar_archive", JSON.stringify(studentArchive)); }, [studentArchive]);
  useEffect(() => { localStorage.setItem("ar_dnd_start", dndStart); }, [dndStart]);
  useEffect(() => { localStorage.setItem("ar_dnd_end", dndEnd); }, [dndEnd]);
  const [drawGoal, setDrawGoal] = useState("construct");
  const [proofStep, setProofStep] = useState(0); // "construct" | "compare" | "combined"
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("ar_chat"));
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  useFirestoreSync("plaza", "chat", chatLog, setChatLog, []);
  const [chatNotif, setChatNotif] = useState(true);
  const chatEndRef = useRef(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({ id: "", name: "", pw: "1234", role: "student" });
  const [memberFilter, setMemberFilter] = useState("all");
  const [editToneKey, setEditToneKey] = useState("default");
  // [Angle data removed]

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


  // --- User & Role System (custom hook) ---
  const userSystem = useUserSystem({
    user, setUser, screen, setScreen, setScreenRaw, setIsAdmin, playSfx, showMsg,
    triangle, buildPhase, setBuildPhase, jedoLines, setJedoLines, jedoCenter, setJedoCenter,
    jedoCircle, setJedoCircle, jedoType, setJedoType, selectedProp, setSelectedProp,
    svgSize, activeTone, theme,
    triMode, setTriMode, setTriangle, sssInput, setSssInput,
    showProperties, setShowProperties, viewBox,
  });
  const {
    ROLES, members, setMembers, signupRequests, setSignupRequests,
    autoApprove, setAutoApprove, loginId, setLoginId, loginPw, setLoginPw,
    loginError, setLoginError, angleDrawingRef, angleOverlay, setAngleOverlay,
    userRole, DEFAULT_PERMS, PERM_LABELS, PERM_GROUPS, rolePerms, setRolePerms,
    hasPerm, canAdmin, canArchive, canEditMember,
    plazaCalls, setPlazaCalls, callUser,
    handleLogin, handleLogout, handleSignupRequest,
    approveSignup, rejectSignup, updateMember, deleteMember, students,
    compassCursors, getJakdoCursor, compassStep, currentGuide,
    guideSteps, guideDataRef, guideHandleTap,
    circleSegIntersect, pushUndo, handleUndo, deleteArc, deleteRulerLine,
    jakdoTool, setJakdoTool, jakdoArcs, setJakdoArcs,
    jakdoRulerLines, setJakdoRulerLines, jakdoSnaps,
    compassPhase, setCompassPhase, compassCenter, setCompassCenter,
    compassRadius, setCompassRadius, compassDragPt, setCompassDragPt,
    arcDrawPoints, setArcDrawPoints, crossedEdges,
    rulerPhase, setRulerPhase, rulerStart,
    guideGoal, setGuideGoal, guideStep, setGuideStep,
    MAX_ARCS, MAX_RULER_LINES,
    setCrossedEdges, setGuideIntersections, setGuideSubStep,
    setPressedSnap, setRulerStart, setUndoStack,
    undoStack, pressedSnap, guideIntersections, guideSubStep,
  } = userSystem;

  // --- Jakdo/Canvas Logic (custom hook) ---
  const jakdoCanvas = useJakdoCanvas({
    triangle, setTriangle, buildPhase, setBuildPhase, triMode, setTriMode,
    inputMode, setInputMode, sssInput, setSssInput, drawStep, setDrawStep,
    drawStrokes, setDrawStrokes, drawAngles, setDrawAngles,
    currentStroke, setCurrentStroke, isDrawing, setIsDrawing, drawPreview, setDrawPreview,
    animPhase, setAnimPhase, animProgress, setAnimProgress, animRef,
    jedoLines, setJedoLines, jedoCenter, setJedoCenter, jedoCircle, setJedoCircle,
    jedoType, setJedoType, svgSize, svgRef, screen, setScreen,
    playSfx, showMsg, activeTone, theme, user, canvasHeight, setCanvasHeight,
    jakdoTool, setJakdoTool, jakdoArcs, setJakdoArcs,
    jakdoRulerLines, setJakdoRulerLines, jakdoSnaps,
    compassPhase, setCompassPhase, compassCenter, setCompassCenter,
    compassRadius, setCompassRadius, compassDragPt, setCompassDragPt,
    arcDrawPoints, setArcDrawPoints, crossedEdges,
    rulerStart, rulerPhase, setRulerPhase,
    guideGoal, setGuideGoal, guideStep, setGuideStep, guideSteps,
    currentGuide, guideHandleTap, guideDataRef,
    circleSegIntersect, pushUndo, deleteArc, deleteRulerLine,
    compassStep, MAX_ARCS, MAX_RULER_LINES, drawGoal,
    // Additional from useUserSystem
    setCrossedEdges, setGuideIntersections, setGuideSubStep,
    setPressedSnap, setRulerStart, setUndoStack,
    // Additional from App.jsx
    setManualView, setSelectedProp, setShowProperties, setViewBox, toneKey,
  });
  const {
    svgCoords, handleJakdoDown, handleJakdoMove, handleJakdoUp,
    generateTriangleWithBase, handleSSSSubmit,
    handleDrawStart, handleDrawMove, handleDrawEnd,
    handleJedoClick, resetAll, recognizeAngle, recognizeLine,
    saveToArchive, showArchiveSave, setShowArchiveSave, archivePublic, setArchivePublic,
    failAnim, idleMsg, retryDraw, generateTriangle,
  } = jakdoCanvas;

  // --- Properties Data with highlight info ---
  // Properties, Highlight, Animation — see rendering/TriangleRenderer.jsx
  const getProperties = () => getPropertiesFn({ triangle, jedoCenter, jedoCircle, jedoType });
  const renderHighlight = () => renderHighlightFn({ triangle, jedoCenter, jedoCircle, jedoType, selectedProp, zs, FixedG, jedoLines, jakdoArcs, jakdoRulerLines });
  const renderTriangleAnim = () => renderTriangleAnimFn({ triangle, animPhase, animProgress, buildPhase, jedoLines, jedoCenter, jedoCircle, jedoType, jakdoArcs, jakdoRulerLines, jakdoSnaps, svgSize, floatingMsg, showProperties, selectedProp, compassCenter, compassRadius, compassPhase, compassDragPt, arcDrawPoints, rulerStart, crossedEdges, currentStroke, zs, FixedG, theme, themeKey, getActiveVB });


  // --- SVG Highlight Rendering ---

  // --- Render Triangle with Animation ---

  // ============ SCREENS ============

  // --- Login Screen ---

  // ============ SCREENS ============

  // --- Shared UI Helpers ---
  const ScreenWrap = useCallback(({ children, title, back, backTo }) => (
    <ScreenWrapOuter theme={theme} playSfx={playSfx} setScreen={setScreen} themeKey={themeKey}
      title={title} back={back} backTo={backTo}>{children}</ScreenWrapOuter>
  ), [theme, themeKey, playSfx, setScreen]);

  const MenuGrid = useMemo(() => ({ items, cols = 2 }) => (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:14, width:"min(440px,90vw)", padding:"0 16px", margin:"0 auto" }}>
      {items.map((item, i) => item.section ? (
        <div key={i} style={{ gridColumn: "1 / -1", fontSize: 11, fontWeight: 700, color: theme.textSec, letterSpacing: 1, padding: "8px 4px 0" }}>
          {item.icon} {item.label}
        </div>
      ) : (
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
  ), [theme, themeKey, playSfx, PASTEL]);


  // Context object for extracted screen render functions
  const ctx = {
    theme, themeKey, setThemeKey, toneKey, setToneKey, PASTEL,
    user, userRole, isAdmin, setScreen, setScreenRaw, playSfx, showMsg, activeTone, isPC,
    loginId, setLoginId, loginPw, setLoginPw, loginError, setLoginError, handleLogin,
    signupName, setSignupName, signupId, setSignupId, signupPw, setSignupPw,
    signupPwConfirm, setSignupPwConfirm, signupMsg, setSignupMsg, signupDone, setSignupDone,
    handleSignupRequest, autoApprove, setAutoApprove,
    members, setMembers, ROLES, students,
    editingMemberId, setEditingMemberId, newMemberForm, setNewMemberForm, memberFilter, setMemberFilter,
    canAdmin, canArchive, canEditMember, updateMember, deleteMember,
    signupRequests, setSignupRequests, approveSignup, rejectSignup,
    hasPerm, rolePerms, setRolePerms, DEFAULT_PERMS, PERM_LABELS, PERM_GROUPS,
    chatMsg, setChatMsg, chatLog, setChatLog, chatEndRef, chatNotif, setChatNotif,
    plazaCalls, callUser,
    bgmOn, setBgmOn, sfxOn, setSfxOn, bgmVol, setBgmVol, sfxVol, setSfxVol,
    handleLogout,
    editToneKey, setEditToneKey, customScripts, setCustomScripts,
    drawGoal, setDrawGoal, compareSelected, setCompareSelected, canvasDragRef,
    isStudentModePreview, isAdminPreview: isStudentModePreview,
    exitPreview: () => { setIsStudentModePreview(false); setScreen("admin"); },
    helpRequests, setHelpRequests,
    homework: studentHomework, setHomework: setStudentHomework,
    archive: studentArchive, setArchive: setStudentArchive,
    notifications: studentNotifications, setNotifications: setStudentNotifications,
    diary: studentDiary, setDiary: setStudentDiary,
    signupRole, setSignupRole,
    crossTalkPosts, setCrossTalkPosts, sendHomeworkToChild,
    publicArchive: (studentArchive || []).filter(a => a.isPublic && !a.hidden).map(a => ({ ...a, userId: undefined, userName: undefined })),
    tutorial,
    analysisModel, setAnalysisModel,
    archiveDefaultPublic, setArchiveDefaultPublic,
    helpPopupData, setHelpPopupData, canvasWidth, setCanvasWidth, svgPanRef,
    dndStart, dndEnd, setDndStart, setDndEnd,
    triangle, setTriangle, triMode, setTriMode, inputMode, setInputMode,
    buildPhase, setBuildPhase, sssInput, setSssInput, animPhase, animProgress,
    jedoLines, jedoCenter, jedoCircle, jedoType,
    setJedoCenter, setJedoCircle, setJedoType,
    svgRef, svgSize, svgContainerRef, scrollContainerRef,
    viewBox, manualView, setViewBox, setManualView,
    getActiveVB, zs, FixedG, canvasHeight, setCanvasHeight,
    jakdoTool, setJakdoTool, jakdoArcs, setJakdoArcs, jakdoRulerLines, setJakdoRulerLines, jakdoSnaps,
    compassPhase, setCompassPhase, compassCenter, setCompassCenter,
    compassRadius, setCompassRadius, compassStep, compassDragPt, setCompassDragPt,
    arcDrawPoints, setArcDrawPoints, crossedEdges,
    rulerStart, rulerPhase, setRulerPhase,
    compassCursors, getJakdoCursor,
    guideGoal, setGuideGoal, guideStep, setGuideStep, guideSteps, currentGuide, guideHandleTap,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel,
    resetView, pushUndo, deleteArc, deleteRulerLine,
    drawStep, setDrawStep, drawStrokes, setDrawStrokes, drawAngles, setDrawAngles,
    currentStroke, setCurrentStroke, isDrawing, drawPreview,
    handleDrawStart, handleDrawMove, handleDrawEnd, handleSSSSubmit,
    showProperties, setShowProperties, selectedProp, setSelectedProp, floatingMsg,
    showArchiveSave, setShowArchiveSave, archivePublic, setArchivePublic,
    renderTriangleAnim, renderHighlight, getProperties,
    handleJedoClick, handleJakdoDown, handleJakdoMove, handleJakdoUp, handleUndo,
    resetAll, generateTriangleWithBase,
    failAnim, idleMsg, retryDraw, generateTriangle,
    proofStep, setProofStep,
    undoStack, pressedSnap, guideIntersections, guideSubStep,
    ScreenWrap, MenuGrid,
  };

  if (screen === "login") return renderLoginScreen(ctx);
  if (screen === "signup") return renderSignupScreen(ctx);


  // --- Signup Screen ---

  // --- Menu Screen ---
  // Student/External users → student home instead of admin menu
  // Parent → parent home
  if (screen === "menu" && userRole === "parent") {
    return renderParentHomeScreen(ctx);
  }

  // Student/External → student home
  if (screen === "menu" && userRole && userRole !== "admin" && userRole !== "assistant" && userRole !== "parent") {
    return renderStudentHomeScreen(ctx);
  }

  const TutOverlay = () => tutorial?.activeTutorial ? (
    <TutorialOverlay tutorialId={tutorial.activeTutorial} theme={theme} onComplete={() => tutorial.setActiveTutorial(null)} />
  ) : null;

  if (screen === "menu") {
    const menuItems = [
      { icon: "📖", label: "복습하기", desc: "기하학 개념 학습", action: () => setScreen("study") },
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


  // --- Study Screen (복습하기) ---
  if (screen === "study") {
    const categories = [
      { icon: "⬡", label: "그려서 공부하기", desc: "삼각형, 외심, 내심", action: () => setScreen("polygons") },
      { icon: "📝", label: "문제의 문장 이해하기", desc: "AI 조건추출 · 유형분류 · 풀이방향", action: () => setScreen("sentence") },
      { icon: "🧮", label: "쓸모 없어 보이는 수학", desc: "일상 속 숨은 수학 발견하기", disabled: true },
      { icon: "🧠", label: "쓸모 있는데 어려운 수학", desc: "심화 개념 도전하기", disabled: true },
    ];
    return (
      <ScreenWrap title="복습하기" back="메뉴" backTo="menu">
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MenuGrid items={categories} cols={1} />
        </div>
      </ScreenWrap>
    );
  }


  // --- Parent Home ---
  if (screen === "parent-home") return renderParentHomeScreen(ctx);

  // --- Student Mode ---
  if (screen === "student-mode") {
    if (!isStudentModePreview) setIsStudentModePreview(true);
    return renderStudentHomeScreen(ctx);
  }
  if (screen === "student-home") return renderStudentHomeScreen(ctx);

  // --- Learning Dashboard ---
  if (screen === "learning-dashboard") return renderLearningDashboard(ctx);

  // --- Question Inbox ---
  if (screen === "question-inbox") return renderQuestionInboxScreen(ctx);

  // --- Sentence Understanding Screen (문제의 문장 이해하기) ---
  if (screen === "sentence") return renderProblemScreen(ctx);

    // --- Congruence Screen ---
  if (screen === "congruence") return renderCongruenceScreen(ctx);

  // --- SVG Editor ---
  if (screen === "svg-editor") return renderSVGEditorScreen(ctx);

  // --- Ranking Screen ---
  if (screen === "ranking") return renderRankingScreen(ctx);

  // --- Quiz Screen ---
  if (screen === "quiz") return renderQuizScreen(ctx);

  // --- Distance Screen (거리 개념) ---
  if (screen === "distance") return renderDistanceScreen(ctx);

  // --- Plaza (광장) Screen ---
  if (screen === "plaza") return renderPlazaScreen(ctx);


  // --- 그려서 공부하기 Screen ---
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
      { icon: "🏆", label: "순위표", desc: "일간·주간·월간 랭킹", compact: true, action: () => setScreen("ranking") },
      { icon: "⚡", label: "퀴즈", desc: "오늘의 문제·스피드·OX", compact: true, action: () => setScreen("quiz") },
      { icon: "📏", label: "거리", desc: "점·직선·각의 이등분선까지", compact: true, action: () => setScreen("distance") },
      { icon: "△", label: "삼각형에서 원까지", desc: hasSavedWork ? "이전 작업 있음 ✦" : "SSS · SAS · ASA",
        action: () => { if (hasSavedWork) setShowLoadDialog(true); else { setDrawGoal("construct"); enterDraw(false); } } },
      { icon: "⊙⊙", label: "외접원 옆에 내접원", desc: "두 원의 관계", compact: true, action: () => { setDrawGoal("compare"); resetAll(); setBuildPhase("input"); setTriMode("sss"); setScreen("draw"); } },
      { icon: "O · I", label: "외심 옆에 내심", desc: "예각삼각형 전용", compact: true, action: () => { setDrawGoal("combined"); resetAll(); setBuildPhase("input"); setTriMode("sss"); setScreen("draw"); } },
      { icon: "∟≅", label: "직각삼각형의 합동 조건", desc: "RHA · RHS", compact: true, action: () => setScreen("congruence") },
    ];
    return (
      <ScreenWrap title="그려서 공부하기" back="복습하기" backTo="study">
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
                  <button onClick={() => { setDrawGoal("construct"); setShowLoadDialog(false); enterDraw(true); }} style={{
                    flex:1, padding:"14px", borderRadius:14, border:"none",
                    background:`linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                    color:"white", fontSize:14, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif",
                  }}>이어서 하기</button>
                  <button onClick={() => { setDrawGoal("construct"); setShowLoadDialog(false); enterDraw(false); }} style={{
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
  if (screen === "admin") return renderAdminScreen(ctx);

  // --- Admin Member Management ---
  if (screen === "admin-students") return renderAdminStudentsScreen(ctx);

  // --- Admin Signup Management ---
  // --- Admin Permissions Screen ---
  if (screen === "admin-perms") return renderAdminPermsScreen(ctx);

  if (screen === "admin-signups") return renderAdminSignupsScreen(ctx);


  // --- Admin Script Editor ---
  if (screen === "admin-model") {
    const MODELS = [
      { key: "claude-opus-4-20250514", label: "Opus", desc: "최고 성능, 느림, 비쌈", icon: "👑" },
      { key: "claude-sonnet-4-20250514", label: "Sonnet", desc: "균형 잡힌 성능 (기본값)", icon: "⚡" },
      { key: "claude-haiku-4-5-20251001", label: "Haiku", desc: "빠르고 저렴", icon: "🚀" },
    ];
    return (
      <ScreenWrap title="분석 모델 설정" back="관리자" backTo="admin">
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 16 }}>문제 분석 시 사용할 Claude 모델을 선택하세요.</p>
          {MODELS.map(m => (
            <button key={m.key} onClick={() => { setAnalysisModel(m.key); playSfx("click"); showMsg(m.label + " 모델로 변경!", 1500); }}
              style={{
                width: "100%", textAlign: "left", padding: "16px", marginBottom: 8, borderRadius: 14,
                border: "2px solid " + (analysisModel === m.key ? PASTEL.coral : theme.border),
                background: analysisModel === m.key ? PASTEL.coral + "08" : theme.card,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              }}>
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{m.label}</div>
                <div style={{ fontSize: 11, color: theme.textSec }}>{m.desc}</div>
                <div style={{ fontSize: 9, color: theme.textSec, marginTop: 2 }}>{m.key}</div>
              </div>
              {analysisModel === m.key && <span style={{ marginLeft: "auto", color: PASTEL.coral, fontWeight: 700 }}>{"✓"}</span>}
            </button>
          ))}
        </div>
      </ScreenWrap>
    );
  }
  if (screen === "admin-scripts") return renderAdminScriptsScreen(ctx);


  // --- Settings Screen ---
  if (screen === "settings") return renderSettingsScreen(ctx);


  // --- Draw Screen ---
  if (screen === "draw") return renderDrawScreen(ctx);


  return null;
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
