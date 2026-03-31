import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFirestoreSync } from "./useFirestoreSync";
import { fbSet } from "../firebase";
import { PASTEL, dist, perpBisector, angleBisector, lineIntersection, circumcenter, incenter, pointToSegDist, angleAtVertex } from "../config";

export function useUserSystem(deps) {
  const { user, setUser, screen, setScreen, setScreenRaw, setIsAdmin, playSfx, showMsg,
    triangle, buildPhase, setBuildPhase, jedoLines, setJedoLines, jedoCenter, setJedoCenter,
    jedoCircle, setJedoCircle, jedoType, setJedoType, selectedProp, setSelectedProp,
    svgSize, activeTone, theme,
    triMode, setTriMode, setTriangle, sssInput, setSssInput,
    showProperties, setShowProperties, viewBox } = deps;

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

  // === Firestore Sync (real-time, cross-device) ===
  useFirestoreSync("data", "members", members, setMembers, []);
  useFirestoreSync("data", "signups", signupRequests, setSignupRequests, []);
  useFirestoreSync("settings", "autoApprove", autoApprove, setAutoApprove, false);

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
    assistant: { study: true, draw: true, jedo: true, guide: true, plaza_read: true, plaza_write: true, plaza_call: true, archive_save: true, admin_members: true, admin_signups: true, admin_scripts: false, viewStudentMode: true, questionInbox: true, assignHomework: true, diary: true, notifications: true },
    student: { study: true, draw: true, jedo: true, guide: true, plaza_read: true, plaza_write: true, plaza_call: true, archive_save: true, diary: true, homework: true, notifications: true, askQuestion: true, admin_members: false, admin_signups: false, admin_scripts: false },
    external: { study: true, draw: true, jedo: false, guide: false, plaza_read: true, plaza_write: false, plaza_call: false, archive_save: false, diary: false, homework: false, notifications: true, askQuestion: false, admin_members: false, admin_signups: false, admin_scripts: false },
  };
  const PERM_LABELS = {
    study: "학습", draw: "그리기", jedo: "제도", guide: "가이드",
    plaza_read: "광장 읽기", plaza_write: "광장 글쓰기", plaza_call: "광장 호출",
    archive_save: "아카이브 저장",
    admin_members: "회원 관리", admin_signups: "가입 관리", admin_scripts: "대사 편집",
    viewStudentMode: "학생 모드 보기", questionInbox: "질문함", assignHomework: "숙제 출제",
    diary: "다이어리", homework: "숙제", notifications: "알림", askQuestion: "질문하기",
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
  useFirestoreSync("settings", "rolePerms", rolePerms, setRolePerms, {});

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
  useFirestoreSync("plaza", "calls", plazaCalls, setPlazaCalls, []);

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
    setMembers(prev => [...prev, { id: req.id, name: req.name, nickname: "", pw: req.pw, role: req.role || "external" }]);
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
    // If editing self, also update login session
    if (user && user.id === targetId) {
      setUser(prev => ({ ...prev, ...updates }));
    }
  }, [user, setUser]);

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


  return {
    DEFAULT_PERMS, MAX_ARCS, MAX_RULER_LINES, PERM_GROUPS, PERM_LABELS, ROLES, angleDrawingRef, angleOverlay, approveSignup, arcDrawPoints, autoApprove, callUser, canAdmin, canArchive, canEditMember, circleSegIntersect, compassCenter, compassCursors, compassDragPt, compassPhase, compassRadius, compassStep, crossedEdges, currentGuide, deleteArc, deleteMember, deleteRulerLine, getJakdoCursor, guideDataRef, guideGoal, guideHandleTap, guideIntersections, guideStep, guideSteps, guideSubStep, handleLogin, handleLogout, handleSignupRequest, handleUndo, hasPerm, jakdoArcs, jakdoRulerLines, jakdoSnaps, jakdoTool, loginError, loginId, loginPw, members, plazaCalls, pressedSnap, pushUndo, rejectSignup, rolePerms, rulerPhase, rulerStart, setAngleOverlay, setArcDrawPoints, setAutoApprove, setCompassCenter, setCompassDragPt, setCompassPhase, setCompassRadius, setCrossedEdges, setGuideGoal, setGuideIntersections, setGuideStep, setGuideSubStep, setJakdoArcs, setJakdoRulerLines, setJakdoTool, setLoginError, setLoginId, setLoginPw, setMembers, setPlazaCalls, setPressedSnap, setRolePerms, setRulerPhase, setRulerStart, setSignupRequests, setUndoStack, signupRequests, students, undoStack, updateMember, userRole,
  };
}
