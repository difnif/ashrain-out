import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PASTEL, dist, midpoint, perpBisector, angleBisector, lineIntersection,
  circumcenter, incenter, pointToSegDist, closestPointOnLine, triangleType, angleAtVertex, detectTriangleFromStroke } from "../config";

export function useJakdoCanvas(deps) {
  const { triangle, setTriangle, buildPhase, setBuildPhase, triMode, setTriMode,
    inputMode, setInputMode, sssInput, setSssInput, drawStep, setDrawStep,
    drawStrokes, setDrawStrokes, drawAngles, setDrawAngles,
    currentStroke, setCurrentStroke, isDrawing, setIsDrawing, drawPreview, setDrawPreview,
    animPhase, setAnimPhase, animProgress, setAnimProgress, animRef,
    jedoLines, setJedoLines, jedoCenter, setJedoCenter, jedoCircle, setJedoCircle,
    jedoType, setJedoType, svgSize, svgRef, screen, setScreen,
    playSfx, showMsg, activeTone, theme, user, canvasHeight, setCanvasHeight,
    // From useUserSystem
    jakdoTool, setJakdoTool, jakdoArcs, setJakdoArcs,
    jakdoRulerLines, setJakdoRulerLines, jakdoSnaps,
    compassPhase, setCompassPhase, compassCenter, setCompassCenter,
    compassRadius, setCompassRadius, compassDragPt, setCompassDragPt,
    arcDrawPoints, setArcDrawPoints, crossedEdges,
    rulerStart, rulerPhase, setRulerPhase,
    guideGoal, setGuideGoal, guideStep, setGuideStep, guideSteps,
    currentGuide, guideHandleTap, guideDataRef,
    circleSegIntersect, pushUndo, deleteArc, deleteRulerLine,
    compassStep, MAX_ARCS, MAX_RULER_LINES } = deps;

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


  return {
    archivePublic, archives, failAnim, failAnimRef, generateTriangle, generateTriangleWithBase, guideLastTapRef, handleDrawEnd, handleDrawMove, handleDrawStart, handleJakdoDown, handleJakdoMove, handleJakdoUp, handleJedoClick, handleSSSSubmit, idleMsg, recognizeAngle, recognizeLine, resetAll, retryDraw, saveToArchive, setArchivePublic, setArchives, setFailAnim, setIdleMsg, setShowArchiveSave, showArchiveSave, svgCoords,
  };
}
