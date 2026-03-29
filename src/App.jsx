import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PASTEL, THEMES, TONES,
  dist, midpoint, lerp,
  perpBisector, angleBisector, lineIntersection,
  circumcenter, incenter, pointToSegDist, closestPointOnLine,
  triangleType, angleAtVertex, detectTriangleFromStroke,
} from "./config";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingMsg from "./components/FloatingMsg";
import InfoPanel from "./components/InfoPanel";
import { renderLoginScreen, renderSignupScreen } from "./screens/AuthScreens";
import { renderPlazaScreen } from "./screens/PlazaScreen";
import {
  renderAdminScreen, renderAdminStudentsScreen, renderAdminPermsScreen,
  renderAdminSignupsScreen, renderAdminAnglesScreen, renderAdminScriptsScreen,
} from "./screens/AdminScreens";
import { renderSettingsScreen } from "./screens/SettingsScreen";
import { renderDrawScreen } from "./screens/DrawScreen";
import { getProperties as getPropertiesFn, renderHighlight as renderHighlightFn, renderTriangleAnim as renderTriangleAnimFn } from "./rendering/TriangleRenderer";

// ============================================================
// ashrain.out — Interactive Geometry Education App (v5.1)
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
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState(() => { try { return JSON.parse(localStorage.getItem("ar_chat")) || []; } catch { return []; } });
  const [chatNotif, setChatNotif] = useState(true);
  const chatEndRef = useRef(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [newMemberForm, setNewMemberForm] = useState({ id: "", name: "", pw: "1234", role: "student" });
  const [memberFilter, setMemberFilter] = useState("all");
  const [editToneKey, setEditToneKey] = useState("default");
  const [collectedAngles, setCollectedAngles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ar_angle_data")) || []; } catch { return []; }
  });
  const [angleCollectStroke, setAngleCollectStroke] = useState([]); // current drawing
  const angleCollectRef = useRef(null);

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

  // Online presence heartbeat for plaza
  useEffect(() => {
    if (screen !== "plaza") return;
    const myName = user?.nickname || user?.name || "익명";
    const update = () => {
      try {
        const online = JSON.parse(localStorage.getItem("ar_online") || "{}");
        online[myName] = { time: Date.now(), role: user?.role || "external" };
        for (const k of Object.keys(online)) { if (Date.now() - online[k].time > 30000) delete online[k]; }
        localStorage.setItem("ar_online", JSON.stringify(online));
      } catch {}
    };
    update();
    const iv = setInterval(update, 10000);
    return () => {
      clearInterval(iv);
      try {
        const online = JSON.parse(localStorage.getItem("ar_online") || "{}");
        delete online[myName];
        localStorage.setItem("ar_online", JSON.stringify(online));
      } catch {}
    };
  }, [screen, user]);

  // Teacher call notification listener — admin only, checks every 5s
  useEffect(() => {
    if (user?.role !== "admin") return;
    let lastCallTime = 0;
    const check = () => {
      try {
        const call = JSON.parse(localStorage.getItem("ar_teacher_call") || "null");
        if (call && call.time > lastCallTime) {
          lastCallTime = call.time;
          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("선생님 호출!", { body: `${call.from}님이 호출했어요`, icon: "📢" });
          }
          showMsg(`📢 ${call.from}님이 호출했어요!`, 4000);
          playSfx("success");
        }
      } catch {}
    };
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, [user, showMsg, playSfx]);

  // Register touch+mouse events on angle collection SVG with { passive: false }
  // Angle data collection state
  const angleDrawingRef = useRef(false);
  const [angleOverlay, setAngleOverlay] = useState(false);


  // User role shorthand (used throughout)
  const userRole = user?.role || "external";

  // Permission system — role-based access control
  const DEFAULT_PERMS = {
    assistant: { study: true, draw: true, jedo: true, guide: true, plaza_read: true, plaza_write: true, plaza_call: true, archive_save: true, admin_members: true, admin_signups: true, admin_angles: false, admin_scripts: false },
    student: { study: true, draw: true, jedo: true, guide: true, plaza_read: true, plaza_write: true, plaza_call: true, archive_save: true, admin_members: false, admin_signups: false, admin_angles: false, admin_scripts: false },
    external: { study: true, draw: true, jedo: false, guide: false, plaza_read: true, plaza_write: false, plaza_call: false, archive_save: false, admin_members: false, admin_signups: false, admin_angles: false, admin_scripts: false },
  };
  const PERM_LABELS = {
    study: "복습하기 접근", draw: "삼각형 그리기", jedo: "제도 모드", guide: "가이드 작도",
    plaza_read: "광장 보기", plaza_write: "광장 채팅", plaza_call: "호출 기능",
    archive_save: "아카이브 저장", admin_members: "회원 관리", admin_signups: "가입 신청 관리",
    admin_angles: "앵글 데이터", admin_scripts: "대사 스크립트",
  };
  const PERM_GROUPS = [
    { label: "복습하기", keys: ["study", "draw", "jedo", "guide"] },
    { label: "광장", keys: ["plaza_read", "plaza_write", "plaza_call"] },
    { label: "저장", keys: ["archive_save"] },
    { label: "관리자", keys: ["admin_members", "admin_signups", "admin_angles", "admin_scripts"] },
  ];
  const [rolePerms, setRolePerms] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ar_perms")) || {}; } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("ar_perms", JSON.stringify(rolePerms)); }, [rolePerms]);

  const hasPerm = useCallback((perm) => {
    if (userRole === "admin") return true;
    const custom = rolePerms[userRole];
    if (custom && custom[perm] !== undefined) return custom[perm];
    return DEFAULT_PERMS[userRole]?.[perm] ?? false;
  }, [userRole, rolePerms]);

  // Permission helpers
  const canAdmin = userRole === "admin" || userRole === "assistant";
  const canArchive = hasPerm("archive_save");
  const canEditMember = useCallback((targetRole) => {
    if (userRole === "admin") return true;
    if (userRole === "assistant" && hasPerm("admin_members")) return targetRole === "student" || targetRole === "external";
    return false;
  }, [userRole, hasPerm]);

  // Plaza call/mention system
  const [plazaCalls, setPlazaCalls] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ar_calls")) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("ar_calls", JSON.stringify(plazaCalls)); }, [plazaCalls]);

  const callUser = useCallback((targetName) => {
    const myName = user?.nickname || user?.name || "익명";
    const call = { from: myName, to: targetName, time: Date.now() };
    setPlazaCalls(prev => [...prev.slice(-9), call]); // max 10
    playSfx("click");

    // Teacher call: trigger notification
    if (targetName === "선생님" || members.find(m => m.role === "admin" && (m.nickname || m.name) === targetName)) {
      try {
        localStorage.setItem("ar_teacher_call", JSON.stringify({ from: myName, time: Date.now() }));
      } catch {}
    }
  }, [user, members, playSfx]);

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
  // Guided construction state
  const [guideGoal, setGuideGoal] = useState(null); // "circumcenter" | "incenter" | null (free)
  const [guideStep, setGuideStep] = useState(0);
  const [guideSubStep, setGuideSubStep] = useState(0); // 0=center, 1=radius, 2=arc for compass; 0=start,1=end for ruler
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

  // Guide construction — user taps points, app auto-draws everything
  const [guideIntersections, setGuideIntersections] = useState([]); // [{x,y}] intersection points for current step

  const guideSteps = useMemo(() => {
    if (!triangle || !guideGoal || guideGoal === "select") return [];
    const { A, B, C } = triangle;
    if (guideGoal === "circumcenter") {
      return [
        { type: "tap", msg: "변 AB의 수직이등분선!\n점 A를 터치하세요", target: A, targetLabel: "A", highlight: "AB", edge: [A, B], role: "first" },
        { type: "tap", msg: "같은 반지름으로\n점 B를 터치하세요", target: B, targetLabel: "B", highlight: "AB", edge: [A, B], role: "second" },
        { type: "tap_inter", msg: "교차점을 터치하면\n수직이등분선이 그려져요!", highlight: "AB" },
        { type: "done_line", msg: "변 AB 수직이등분선 완성! ✨" },
        { type: "tap", msg: "변 BC도 해봅시다!\n점 B를 터치하세요", target: B, targetLabel: "B", highlight: "BC", edge: [B, C], role: "first" },
        { type: "tap", msg: "같은 반지름으로\n점 C를 터치하세요", target: C, targetLabel: "C", highlight: "BC", edge: [B, C], role: "second" },
        { type: "tap_inter", msg: "교차점을 터치하세요!", highlight: "BC" },
        { type: "done_line", msg: "변 BC 수직이등분선 완성! ✨" },
        { type: "tap_center", msg: "외심을 터치하세요!\n외접원이 그려집니다" },
      ];
    } else if (guideGoal === "incenter") {
      return [
        // Vertex A: step-by-step
        { type: "tap_vertex", msg: "꼭지점 A의 각의 이등분선!\n점 A를 터치하세요", target: A, targetLabel: "A", highlight: "vertex_A", vertex: A, arms: [B, C] },
        { type: "tap_edge_inter", msg: "호와 변의 교차점을\n하나 터치하세요", highlight: "vertex_A", vertex: A, arms: [B, C], role: "first_inter" },
        { type: "tap_edge_inter", msg: "다른 교차점도\n터치하세요", highlight: "vertex_A", vertex: A, arms: [B, C], role: "second_inter" },
        { type: "tap_inner", msg: "두 호의 교차점을 터치하면\n각의 이등분선이 그려져요!", highlight: "vertex_A", bisectFrom: A },
        { type: "done_line", msg: "꼭지점 A 각의 이등분선 완성! ✨" },
        // Vertex B: step-by-step
        { type: "tap_vertex", msg: "꼭지점 B도 해봅시다!\n점 B를 터치하세요", target: B, targetLabel: "B", highlight: "vertex_B", vertex: B, arms: [A, C] },
        { type: "tap_edge_inter", msg: "호와 변의 교차점을\n하나 터치하세요", highlight: "vertex_B", vertex: B, arms: [A, C], role: "first_inter" },
        { type: "tap_edge_inter", msg: "다른 교차점도\n터치하세요", highlight: "vertex_B", vertex: B, arms: [A, C], role: "second_inter" },
        { type: "tap_inner", msg: "두 호의 교차점을\n터치하세요!", highlight: "vertex_B", bisectFrom: B },
        { type: "done_line", msg: "꼭지점 B 각의 이등분선 완성! ✨" },
        { type: "tap_center", msg: "내심을 터치하세요!\n내접원이 그려집니다" },
      ];
    }
    return [];
  }, [triangle, guideGoal]);

  const currentGuide = guideSteps[guideStep] || null;
  const guideDataRef = useRef({}); // store intermediate data between steps

  // Guide tap handler
  // Undo history — must be before deleteArc/deleteRulerLine
  const [undoStack, setUndoStack] = useState([]);
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), {
      jedoLines: [...jedoLines], jedoCenter, jedoCircle, jedoType,
      jakdoArcs: [...jakdoArcs], jakdoRulerLines: [...jakdoRulerLines],
      guideStep, guideIntersections: [...guideIntersections],
      guideData: { ...guideDataRef.current },
    }]);
  }, [jedoLines, jedoCenter, jedoCircle, jedoType, jakdoArcs, jakdoRulerLines, guideStep, guideIntersections]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setJedoLines(last.jedoLines); setJedoCenter(last.jedoCenter);
    setJedoCircle(last.jedoCircle); setJedoType(last.jedoType);
    setJakdoArcs(last.jakdoArcs); setJakdoRulerLines(last.jakdoRulerLines);
    if (last.guideStep !== undefined) {
      setGuideStep(last.guideStep);
      setGuideIntersections(last.guideIntersections || []);
      guideDataRef.current = last.guideData || {};
    }
    // If we're in properties and circle is being removed, go back to jakdo/jedo
    if (buildPhase === "properties" && !last.jedoCircle) {
      setBuildPhase(guideGoal ? "jakdo" : "jedo");
      setShowProperties(false);
    }
    playSfx("pop");
  }, [undoStack, playSfx, buildPhase, guideGoal]);

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
  const guideHandleTap = useCallback((tapPt) => {
    if (!currentGuide || !triangle) return false;
    const { A, B, C } = triangle;

    // --- Circumcenter: tap vertex to draw arc ---
    if (currentGuide.type === "tap" && currentGuide.target) {
      if (dist(tapPt, currentGuide.target) > 30) return false;
      pushUndo();
      const [p1, p2] = currentGuide.edge;
      const r = dist(p1, p2) * 0.7;
      const center = currentGuide.target;
      const midPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const midAngle = Math.atan2(midPt.y - center.y, midPt.x - center.x);
      const newArc = { center: { ...center }, radius: r, startAngle: midAngle - Math.PI*0.35, endAngle: midAngle + Math.PI*0.35, intersections: [], id: Date.now(), sweepCW: true };
      setJakdoArcs(prev => [...prev, newArc]);
      playSfx("draw");
      if (currentGuide.role === "second" && jakdoArcs.length >= 1) {
        const prevArc = jakdoArcs[jakdoArcs.length - 1];
        const d = dist(prevArc.center, center);
        const r1 = prevArc.radius, r2 = r;
        if (d > 0 && d < r1 + r2 && d > Math.abs(r1 - r2)) {
          const a = (r1*r1 - r2*r2 + d*d) / (2*d);
          const h = Math.sqrt(Math.max(0, r1*r1 - a*a));
          const dx = (center.x - prevArc.center.x)/d, dy = (center.y - prevArc.center.y)/d;
          const mx = prevArc.center.x + a*dx, my = prevArc.center.y + a*dy;
          setGuideIntersections([{x:mx+h*(-dy),y:my+h*dx},{x:mx-h*(-dy),y:my-h*dx}]);
        }
      }
      setGuideStep(s => s + 1);
      return true;
    }

    // --- Circumcenter: tap intersection -> perpendicular bisector ---
    if (currentGuide.type === "tap_inter") {
      let nearest = null, minD = 35;
      for (const ip of guideIntersections) { const d = dist(tapPt, ip); if (d < minD) { minD = d; nearest = ip; } }
      if (!nearest) return false;
      pushUndo();
      if (guideIntersections.length >= 2) {
        const [ip1, ip2] = guideIntersections;
        const dx = ip2.x - ip1.x, dy = ip2.y - ip1.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        setJakdoRulerLines(prev => [...prev, {
          start: { x: ip1.x - (dx/len)*250, y: ip1.y - (dy/len)*250 },
          end: { x: ip2.x + (dx/len)*250, y: ip2.y + (dy/len)*250 },
        }]);
      }
      playSfx("draw"); setGuideIntersections([]); setGuideStep(s => s + 1);
      return true;
    }

    // --- Incenter: tap vertex -> draw arc1 only ---
    if (currentGuide.type === "tap_vertex" && currentGuide.target) {
      if (dist(tapPt, currentGuide.target) > 30) return false;
      pushUndo();
      const v = currentGuide.vertex, [arm1, arm2] = currentGuide.arms;
      const r1 = Math.min(dist(v, arm1), dist(v, arm2)) * 0.45;
      const a1 = Math.atan2(arm1.y - v.y, arm1.x - v.x);
      const a2 = Math.atan2(arm2.y - v.y, arm2.x - v.x);
      const eInt1 = { x: v.x + r1*Math.cos(a1), y: v.y + r1*Math.sin(a1) };
      const eInt2 = { x: v.x + r1*Math.cos(a2), y: v.y + r1*Math.sin(a2) };
      let sa = a1, ea = a2, sw = ea - sa;
      while (sw > Math.PI) sw -= 2*Math.PI;
      while (sw < -Math.PI) sw += 2*Math.PI;
      if (sw < 0) { sa = a2; ea = a1; }
      setJakdoArcs(prev => [...prev, { center: {...v}, radius: r1, startAngle: sa-0.1, endAngle: ea+0.1, intersections: [], id: Date.now(), sweepCW: true }]);
      guideDataRef.current = { eInt1, eInt2, vertex: v };
      setGuideIntersections([eInt1, eInt2]);
      playSfx("draw"); setGuideStep(s => s + 1);
      return true;
    }

    // --- Incenter: tap edge-arc intersection -> draw small arc ---
    if (currentGuide.type === "tap_edge_inter") {
      let nearest = null, minD = 35;
      for (const ip of guideIntersections) { const d = dist(tapPt, ip); if (d < minD) { minD = d; nearest = ip; } }
      if (!nearest) return false;
      pushUndo();
      const { eInt1, eInt2, vertex } = guideDataRef.current;
      const other = dist(nearest, eInt1) < 5 ? eInt2 : eInt1;
      const d23 = dist(eInt1, eInt2), r2 = d23 * 0.75;
      const angToOther = Math.atan2(other.y - nearest.y, other.x - nearest.x);
      setJakdoArcs(prev => [...prev, { center: {...nearest}, radius: r2, startAngle: angToOther-0.7, endAngle: angToOther+0.7, intersections: [], id: Date.now(), sweepCW: true }]);
      playSfx("draw");
      setGuideIntersections(prev => prev.filter(ip => dist(ip, nearest) > 5));
      if (currentGuide.role === "second_inter") {
        const h = Math.sqrt(Math.max(0, r2*r2 - (d23/2)*(d23/2)));
        const mx = (eInt1.x+eInt2.x)/2, my = (eInt1.y+eInt2.y)/2;
        const dx = (eInt2.x-eInt1.x)/d23, dy = (eInt2.y-eInt1.y)/d23;
        const ip1 = {x:mx+h*(-dy),y:my+h*dx}, ip2 = {x:mx-h*(-dy),y:my-h*dx};
        const bisDir = {x:mx-vertex.x, y:my-vertex.y};
        const dot1 = (ip1.x-vertex.x)*bisDir.x + (ip1.y-vertex.y)*bisDir.y;
        const dot2 = (ip2.x-vertex.x)*bisDir.x + (ip2.y-vertex.y)*bisDir.y;
        setGuideIntersections([dot1 > dot2 ? ip1 : ip2]);
      }
      setGuideStep(s => s + 1);
      return true;
    }

    // --- Incenter: tap inner intersection -> draw angle bisector ---
    if (currentGuide.type === "tap_inner") {
      let nearest = null, minD = 35;
      for (const ip of guideIntersections) { const d = dist(tapPt, ip); if (d < minD) { minD = d; nearest = ip; } }
      if (!nearest) return false;
      pushUndo();
      const v = currentGuide.bisectFrom;
      if (v) {
        const dx = nearest.x - v.x, dy = nearest.y - v.y, len = Math.sqrt(dx*dx+dy*dy) || 1;
        setJakdoRulerLines(prev => [...prev, { start: {...v}, end: {x:v.x+(dx/len)*350, y:v.y+(dy/len)*350} }]);
      }
      playSfx("draw"); setGuideIntersections([]); setGuideStep(s => s + 1);
      return true;
    }

    // --- Tap center -> calculate + draw circle with animation -> then properties ---
    if (currentGuide.type === "tap_center") {
      let cx, cy, r;
      if (guideGoal === "circumcenter") {
        const D = 2*(A.x*(B.y-C.y) + B.x*(C.y-A.y) + C.x*(A.y-B.y));
        if (Math.abs(D) > 0.01) {
          cx = ((A.x*A.x+A.y*A.y)*(B.y-C.y)+(B.x*B.x+B.y*B.y)*(C.y-A.y)+(C.x*C.x+C.y*C.y)*(A.y-B.y))/D;
          cy = ((A.x*A.x+A.y*A.y)*(C.x-B.x)+(B.x*B.x+B.y*B.y)*(A.x-C.x)+(C.x*C.x+C.y*C.y)*(B.x-A.x))/D;
        }
        if (cx === undefined || dist(tapPt, {x:cx,y:cy}) > 40) return false;
        r = dist({x:cx,y:cy}, A);
        setJedoType("circum");
      } else {
        const a=dist(B,C), b=dist(A,C), c=dist(A,B), sum=a+b+c;
        cx = (a*A.x+b*B.x+c*C.x)/sum; cy = (a*A.y+b*B.y+c*C.y)/sum;
        if (dist(tapPt, {x:cx,y:cy}) > 40) return false;
        const dToEdge = (p,e1,e2)=>{const dx=e2.x-e1.x,dy=e2.y-e1.y;return Math.abs((p.x-e1.x)*dy-(p.y-e1.y)*dx)/Math.sqrt(dx*dx+dy*dy);};
        r = Math.min(dToEdge({x:cx,y:cy},A,B), dToEdge({x:cx,y:cy},B,C), dToEdge({x:cx,y:cy},A,C));
        setJedoType("in");
      }
      pushUndo();
      setJedoCenter({x:cx, y:cy});
      setTimeout(() => setJedoCircle({cx, cy, r}), 300);
      setTimeout(() => { setShowProperties(true); setBuildPhase("properties"); }, 2500);
      playSfx("complete");
      setGuideStep(s => s + 1);
      return true;
    }

    return false;
  }, [currentGuide, triangle, guideGoal, guideStep, guideSteps, jakdoArcs, guideIntersections, playSfx, pushUndo]);




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
  const guideLastTapRef = useRef(0); // debounce guard

  const handleJakdoDown = useCallback((e) => {
    if (!triangle || buildPhase !== "jakdo") return;
    if (e.button === 1) return;
    const p = svgCoords(e);
    if (!p) return;

    // Guide mode: only accept point taps with debounce
    if (guideGoal && currentGuide) {
      const now = Date.now();
      if (now - guideLastTapRef.current < 400) return; // debounce 400ms
      guideLastTapRef.current = now;
      if (e.preventDefault) e.preventDefault(); // prevent mousedown after touchstart
      guideHandleTap(p);
      return;
    }

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
  }, [triangle, buildPhase, jakdoTool, compassPhase, jakdoSnaps, jakdoArcs, jakdoRulerLines, svgCoords, playSfx, showMsg, currentGuide, guideStep, guideSteps, guideGoal, guideHandleTap]);

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
  }, [triangle, buildPhase, jakdoTool, compassPhase, compassCenter, compassRadius, arcDrawPoints, crossedEdges, rulerStart, jakdoSnaps, jakdoArcs, svgCoords, playSfx, pushUndo, showMsg, activeTone, circleSegIntersect, currentGuide, guideStep, guideSteps]);

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

  // Utility: recognize an angle (V/<) via 2-line fitting
  // Works even with zigzag/wobbly strokes — finds the two best-fit lines
  const recognizeAngle = useCallback((pts) => {
    if (pts.length < 6) return null;

    // Fit points to a line (PCA-based), return direction + error
    const fitLine = (points) => {
      const n = points.length;
      if (n < 2) return null;
      let sx = 0, sy = 0;
      for (const p of points) { sx += p.x; sy += p.y; }
      const mx = sx / n, my = sy / n;
      let sxx = 0, sxy = 0, syy = 0;
      for (const p of points) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
      const trace = sxx + syy, det = sxx * syy - sxy * sxy;
      const lambda = (trace + Math.sqrt(Math.max(0, trace * trace - 4 * det))) / 2;
      let dx = sxy, dy = lambda - sxx;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
      let err = 0;
      for (const p of points) { const px = p.x - mx, py = p.y - my; const proj = px * dx + py * dy; err += (px - proj * dx) ** 2 + (py - proj * dy) ** 2; }
      return { dir: { x: dx, y: dy }, error: err / n };
    };

    // Try every split point: fit 2 lines, find best split
    const minArm = Math.max(2, Math.floor(pts.length * 0.15));
    let bestSplit = -1, bestErr = Infinity, bestL1 = null, bestL2 = null;
    for (let s = minArm; s <= pts.length - minArm; s++) {
      const l1 = fitLine(pts.slice(0, s)), l2 = fitLine(pts.slice(s));
      if (!l1 || !l2) continue;
      const total = l1.error + l2.error;
      if (total < bestErr) { bestErr = total; bestSplit = s; bestL1 = l1; bestL2 = l2; }
    }
    if (bestSplit < 0 || !bestL1 || !bestL2) return null;

    // Orient directions: point AWAY from vertex (toward arm tips)
    const vertex = pts[bestSplit];
    const A = pts[0], B = pts[pts.length - 1];
    let d1 = { ...bestL1.dir }, d2 = { ...bestL2.dir };
    if ((A.x - vertex.x) * d1.x + (A.y - vertex.y) * d1.y < 0) { d1.x *= -1; d1.y *= -1; }
    if ((B.x - vertex.x) * d2.x + (B.y - vertex.y) * d2.y < 0) { d2.x *= -1; d2.y *= -1; }

    // Angle between outward vectors = 180° - V opening
    const dot = d1.x * d2.x + d1.y * d2.y;
    const outerAngle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    let angle = outerAngle;
    if (angle < 3 || angle > 177) return null;
    return { vertex, angle, arm1: A, arm2: B };
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
    setCanvasHeight(null);
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
    setGuideGoal(null); setGuideStep(0); setGuideSubStep(0); setGuideIntersections([]);
  };

  // --- Properties Data with highlight info ---
  // Properties, Highlight, Animation — see rendering/TriangleRenderer.jsx
  const getProperties = () => getPropertiesFn({ triangle, jedoCenter, jedoCircle, jedoType });
  const renderHighlight = () => renderHighlightFn({ triangle, jedoCenter, jedoCircle, jedoType, selectedProp, zs, FixedG, jedoLines, jakdoArcs, jakdoRulerLines });
  const renderTriangleAnim = () => renderTriangleAnimFn({ triangle, animPhase, animProgress, buildPhase, jedoLines, jedoCenter, jedoCircle, jedoType, jakdoArcs, jakdoRulerLines, jakdoSnaps, svgSize, floatingMsg, showProperties, selectedProp, compassCenter, compassRadius, compassPhase, compassDragPt, arcDrawPoints, rulerStart, crossedEdges, currentStroke, zs, FixedG, theme, getActiveVB });


  // --- SVG Highlight Rendering ---

  // --- Render Triangle with Animation ---

  // ============ SCREENS ============

  // --- Login Screen ---

  // ============ SCREENS ============

  // --- Shared UI Helpers ---
  const ScreenWrap = ({ children, title, back, backTo }) => (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
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


  // Context object for extracted screen render functions
  const ctx = {
    theme, themeKey, setThemeKey, toneKey, setToneKey, PASTEL,
    user, userRole, isAdmin, setScreen, playSfx, showMsg, activeTone, isPC,
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
    collectedAngles, setCollectedAngles, angleCollectStroke, setAngleCollectStroke,
    angleOverlay, setAngleOverlay, angleCollectRef, recognizeAngle,
    editToneKey, setEditToneKey, customScripts, setCustomScripts,
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
    ScreenWrap, MenuGrid,
  };

  if (screen === "login") return renderLoginScreen(ctx);
  if (screen === "signup") return renderSignupScreen(ctx);


  // --- Signup Screen ---

  // --- Menu Screen ---
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
      { icon: "⬡", label: "삼각형의 외심과 내심", desc: "삼각형, 외심, 내심", action: () => setScreen("polygons") },
    ];
    return (
      <ScreenWrap title="복습하기" back="메뉴" backTo="menu">
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MenuGrid items={categories} cols={1} />
        </div>
      </ScreenWrap>
    );
  }


  // --- Plaza (광장) Screen ---
  if (screen === "plaza") return renderPlazaScreen(ctx);


  // --- Polygons & Circles Screen (삼각형의 외심과 내심) ---
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
      { icon: "📏", label: "거리", desc: "점과 직선 사이의 거리", compact: true, disabled: true },
      { icon: "△", label: "삼각형에서 원까지", desc: hasSavedWork ? "이전 작업 있음 ✦" : "SSS · SAS · ASA",
        action: () => { if (hasSavedWork) setShowLoadDialog(true); else enterDraw(false); } },
      { icon: "⊙⊙", label: "외접원 옆에 내접원", desc: "두 원의 관계", compact: true, disabled: true },
      { icon: "O · I", label: "외심 옆에 내심", desc: "두 중심의 비교", compact: true, disabled: true },
      { icon: "∟≅", label: "직각삼각형의 합동 조건", desc: "RHA · RHS", compact: true, disabled: true },
    ];
    return (
      <ScreenWrap title="삼각형의 외심과 내심" back="복습하기" backTo="study">
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
  if (screen === "admin") return renderAdminScreen(ctx);

  // --- Admin Member Management ---
  if (screen === "admin-students") return renderAdminStudentsScreen(ctx);

  // --- Admin Signup Management ---
  // --- Admin Permissions Screen ---
  if (screen === "admin-perms") return renderAdminPermsScreen(ctx);

  if (screen === "admin-signups") return renderAdminSignupsScreen(ctx);

  // --- Admin Angle Data Collection ---
  // --- Admin Angle Data Collection (touch via ref + useEffect) ---
  if (screen === "admin-angles") return renderAdminAnglesScreen(ctx);

  // --- Admin Script Editor ---
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
