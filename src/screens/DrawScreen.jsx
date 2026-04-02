import { HelpPopup, PROPERTY_HELP } from "../components/HelpPopup";
import { PASTEL, dist } from "../config";
import FloatingMsg from "../components/FloatingMsg";
import InfoPanel from "../components/InfoPanel";

export function renderDrawScreen(ctx) {

  const {
    theme, themeKey, setScreen, playSfx, showMsg, activeTone, isPC,
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
    compareSelected, setCompareSelected,
    renderTriangleAnim, renderHighlight, getProperties,
    archive, setArchive, archiveDefaultPublic,
    helpRequests, setHelpRequests,
    helpPopupData, setHelpPopupData, canvasWidth, setCanvasWidth, svgPanRef,
    handleJedoClick, handleJakdoDown, handleJakdoMove, handleJakdoUp, handleUndo,
    resetAll, generateTriangleWithBase, drawGoal,
    failAnim, idleMsg, retryDraw, generateTriangle,
    proofStep, setProofStep,
    undoStack, pressedSnap, guideIntersections, guideSubStep, user,
    ScreenWrap, MenuGrid,
  } = ctx;
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
            {(buildPhase === "jedo" || buildPhase === "jakdo" || buildPhase === "modeSelect" || buildPhase === "properties" || buildPhase === "compare" || buildPhase === "combined" || buildPhase === "congruence-proof") && (
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
        <div style={{ flex: isPC ? 1 : (showProperties ? 1 : "0 0 auto"), display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mode tabs - A/B toggle + sub-modes */}
        {buildPhase === "input" && !triangle && (
          <div style={{ padding: "10px 20px", animation: "fadeIn 0.4s ease" }}>
            {/* A/B toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[["A", "수치 입력"], ["B", "직접 그리기"]].map(([key, label]) => (
                <button key={key} onClick={() => {
                  setInputMode(key);
                  if (!triMode) setTriMode("sss");
                  setDrawStrokes([]); setDrawAngles([]); setCurrentStroke([]);
                  setDrawStep(key === "B" && triMode ? 1 : 0);
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
            {/* Mode sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {(drawGoal === "congruence" ? [["rha", "RHA"], ["rhs", "RHS"]] : [["sss", "SSS"], ["sas", "SAS"], ["asa", "ASA"]]).map(([key, label]) => (
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

            {/* RHA/RHS input (congruence mode) */}
            {drawGoal === "congruence" && inputMode === "A" && triMode === "rha" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, animation: "fadeIn 0.3s ease" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textSec }}>빗변</label>
                  <input type="number" placeholder="c" value={sssInput.c || ""} 
                    onChange={e => setSssInput(p => ({ ...p, c: e.target.value }))}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, textAlign: "center", fontFamily: "'Noto Serif KR', serif" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textSec }}>예각 (°)</label>
                  <input type="number" placeholder="α" value={sssInput.a || ""}
                    onChange={e => setSssInput(p => ({ ...p, a: e.target.value }))}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, textAlign: "center", fontFamily: "'Noto Serif KR', serif" }} />
                </div>
                <button onClick={() => {
                  const hyp = parseFloat(sssInput.c), ang = parseFloat(sssInput.a);
                  if (!hyp || !ang || ang <= 0 || ang >= 90) { showMsg("빗변과 예각(0°~90°)을 입력하세요", 2000); return; }
                  const rad = ang * Math.PI / 180;
                  const adj = hyp * Math.cos(rad), opp = hyp * Math.sin(rad);
                  const tri = generateTriangle(opp, adj, hyp);
                  if (tri) { setTriangle({ ...tri, mode: "rha", rhAngle: ang }); setBuildPhase("animating"); setProofStep(0); }
                  else showMsg("삼각형을 만들 수 없어요!", 2000);
                }} style={{
                  alignSelf: "flex-end", padding: "10px 16px", borderRadius: 10, border: "none",
                  background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                  color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>그리기</button>
              </div>
            )}
            {drawGoal === "congruence" && inputMode === "A" && triMode === "rhs" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, animation: "fadeIn 0.3s ease" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textSec }}>빗변</label>
                  <input type="number" placeholder="c" value={sssInput.c || ""}
                    onChange={e => setSssInput(p => ({ ...p, c: e.target.value }))}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, textAlign: "center", fontFamily: "'Noto Serif KR', serif" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textSec }}>한 변</label>
                  <input type="number" placeholder="a" value={sssInput.a || ""}
                    onChange={e => setSssInput(p => ({ ...p, a: e.target.value }))}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, textAlign: "center", fontFamily: "'Noto Serif KR', serif" }} />
                </div>
                <button onClick={() => {
                  const hyp = parseFloat(sssInput.c), leg = parseFloat(sssInput.a);
                  if (!hyp || !leg || leg >= hyp) { showMsg("빗변이 다른 한 변보다 길어야 해요!", 2000); return; }
                  const other = Math.sqrt(hyp * hyp - leg * leg);
                  const tri = generateTriangle(leg, other, hyp);
                  if (tri) { setTriangle({ ...tri, mode: "rhs", rhLeg: leg }); setBuildPhase("animating"); setProofStep(0); }
                  else showMsg("삼각형을 만들 수 없어요!", 2000);
                }} style={{
                  alignSelf: "flex-end", padding: "10px 16px", borderRadius: 10, border: "none",
                  background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                  color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>그리기</button>
              </div>
            )}

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

        {/* Resizable SVG Canvas Container */}
        <div ref={svgContainerRef} style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 16px 0", position: "relative",
          flexShrink: 0,
          background: theme.bg,
        }}>
          <FloatingMsg msg={floatingMsg} theme={theme} />

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
            height={canvasHeight || svgSize.h}
            viewBox={`${getActiveVB().x} ${getActiveVB().y} ${getActiveVB().w} ${getActiveVB().h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              background: theme.svgBg, borderRadius: 16,
              border: `1.5px solid ${showProperties && selectedProp ? getProperties().find(p=>p.id===selectedProp)?.color || theme.border : theme.border}`,
              boxShadow: `0 4px 20px rgba(0,0,0,${themeKey === "dark" ? "0.2" : "0.05"})`,
              cursor: buildPhase === "jedo" ? "crosshair" : buildPhase === "jakdo" ? getJakdoCursor() : inputMode === "B" && buildPhase === "input" && !triangle ? "crosshair" : "default",
              transition: "border-color 0.3s ease",
              width: "100%", maxWidth: svgSize.w,
              touchAction: "none",
            }}
            onClick={buildPhase === "jedo" ? handleJedoClick : undefined}
            onWheel={handleWheel}
            onMouseDown={(e) => { handleMouseDown(e); if(buildPhase==="jakdo") handleJakdoDown(e); handleDrawStart(e); }}
            onMouseMove={(e) => { handleMouseMove(e); if(buildPhase==="jakdo") handleJakdoMove(e); handleDrawMove(e); }}
            onMouseUp={(e) => { handleMouseUp(e); if(buildPhase==="jakdo") handleJakdoUp(e); handleDrawEnd(e); }}
            onTouchStart={(e) => {
              if ((buildPhase==="properties"||buildPhase==="compare"||buildPhase==="combined") && e.touches.length===1) {
                const t=e.touches[0], svg=e.currentTarget, vb=svg.getAttribute("viewBox")?.split(" ").map(Number);
                if(vb){svgPanRef.current={sx:t.clientX,sy:t.clientY,vx:vb[0],vy:vb[1],vw:vb[2],vh:vb[3]};return;}
              }
              handleTouchStart(e); if(buildPhase==="jakdo") handleJakdoDown(e); handleDrawStart(e);
            }}
            onTouchMove={(e) => {
              if(svgPanRef.current&&e.touches.length===1){e.preventDefault();const t=e.touches[0],p=svgPanRef.current,svg=e.currentTarget,rect=svg.getBoundingClientRect();
                svg.setAttribute("viewBox",`${p.vx-(t.clientX-p.sx)*p.vw/rect.width} ${p.vy-(t.clientY-p.sy)*p.vh/rect.height} ${p.vw} ${p.vh}`);return;}
              handleTouchMove(e); if(buildPhase==="jakdo") handleJakdoMove(e); handleDrawMove(e);
            }}
            onTouchEnd={(e) => { if(svgPanRef.current){svgPanRef.current=null;return;} handleTouchEnd(e); if(buildPhase==="jakdo") handleJakdoUp(e); handleDrawEnd(e); }}
          >
            {/* Global SVG styles — keep stroke width constant on zoom */}
            <defs>
              <style>{`
                line, path, polyline, polygon, circle { vector-effect: non-scaling-stroke; }
                text { pointer-events: none; -webkit-user-select: none; user-select: none; }
                text { -webkit-user-select: none; user-select: none; pointer-events: none; }
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

            {/* Guide highlight — highlight active edge or vertex */}
            {currentGuide?.highlight && triangle && (() => {
              const { A, B, C } = triangle;
              const hl = currentGuide.highlight;
              const edgeMap = { AB: [A, B], BC: [B, C], AC: [A, C] };
              if (edgeMap[hl]) {
                const [p1, p2] = edgeMap[hl];
                return (
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={PASTEL.coral} strokeWidth={6} opacity={0.35}
                    strokeLinecap="round">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                  </line>
                );
              }
              const vertexMap = { vertex_A: A, vertex_B: B, vertex_C: C };
              if (vertexMap[hl]) {
                const p = vertexMap[hl];
                return (
                  <circle cx={p.x} cy={p.y} r={16} fill="none"
                    stroke={PASTEL.coral} strokeWidth={3} opacity={0.4}>
                    <animate attributeName="r" values="12;20;12" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                );
              }
              return null;
            })()}

            {/* Guide: target point indicator */}
            {currentGuide?.target && buildPhase === "jakdo" && (
              <FixedG x={currentGuide.target.x} y={currentGuide.target.y}>
                <circle cx={currentGuide.target.x} cy={currentGuide.target.y} r={14}
                  fill="none" stroke={PASTEL.mint} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}>
                  <animate attributeName="r" values="10;18;10" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </FixedG>
            )}

            {/* Property highlight overlay */}
            {showProperties && renderHighlight()}
            {/* Side labels when properties panel is open */}
            {showProperties && triangle && (() => {
              const {A,B,C} = triangle;
              const midBC = {x:(B.x+C.x)/2, y:(B.y+C.y)/2};
              const midAC = {x:(A.x+C.x)/2, y:(A.y+C.y)/2};
              const midAB = {x:(A.x+B.x)/2, y:(A.y+B.y)/2};
              const cx3 = (A.x+B.x+C.x)/3, cy3 = (A.y+B.y+C.y)/3;
              const off = 14*zs;
              const sideLabel = (mid, label, color) => {
                const dx = mid.x-cx3, dy = mid.y-cy3;
                const len = Math.sqrt(dx*dx+dy*dy) || 1;
                return <g key={label}><text x={mid.x+dx/len*off} y={mid.y+dy/len*off}
                  textAnchor="middle" dominantBaseline="middle" fontSize={12*zs} fill="none" stroke="white" strokeWidth={3*zs} paintOrder="stroke"
                  fontWeight={700} fontFamily="'Playfair Display', serif">{label}</text>
                  <text x={mid.x+dx/len*off} y={mid.y+dy/len*off}
                  textAnchor="middle" dominantBaseline="middle" fontSize={12*zs} fill={color}
                  fontWeight={700} fontFamily="'Playfair Display', serif">{label}</text></g>;
              };
              return <g>{sideLabel(midBC, "a", PASTEL.coral)}{sideLabel(midAC, "b", PASTEL.sky)}{sideLabel(midAB, "c", PASTEL.mint)}</g>;
            })()}

            {/* Jakdo drawn arcs (proper arc paths) */}
            {jakdoArcs.map((arc, i) => {
              const sx = arc.center.x + arc.radius * Math.cos(arc.startAngle);
              const sy = arc.center.y + arc.radius * Math.sin(arc.startAngle);
              const ex = arc.center.x + arc.radius * Math.cos(arc.endAngle);
              const ey = arc.center.y + arc.radius * Math.sin(arc.endAngle);
              let swept = arc.endAngle - arc.startAngle;
              if (arc.sweepCW !== undefined) {
                if (arc.sweepCW) { while (swept < 0) swept += 2*Math.PI; }
                else { while (swept > 0) swept -= 2*Math.PI; }
              } else {
                if (swept < -Math.PI) swept += 2*Math.PI;
                if (swept > Math.PI) swept -= 2*Math.PI;
              }
              const largeArc = Math.abs(swept) > Math.PI ? 1 : 0;
              const sweep = swept > 0 ? 1 : 0;
              // Guide mode: color by group
              let arcColor = PASTEL.lavender;
              if (guideGoal === "circumcenter") {
                arcColor = i < 2 ? PASTEL.coral : PASTEL.sky; // first edge pink, second edge blue
              } else if (guideGoal === "incenter") {
                arcColor = i < 3 ? PASTEL.coral : PASTEL.sky; // first vertex pink, second vertex blue
              }
              return (
                <g key={`arc${i}`}>
                  <path d={`M ${sx} ${sy} A ${arc.radius} ${arc.radius} 0 ${largeArc} ${sweep} ${ex} ${ey}`}
                    fill="none" stroke={arcColor} strokeWidth={2} opacity={0.7} />
                  {/* Intersection dots — only in free mode */}
                  {buildPhase === "jakdo" && !guideGoal && arc.intersections?.map((ip, j) => (
                    <FixedG key={j} x={ip.x} y={ip.y}>
                      <circle cx={ip.x} cy={ip.y} r={5}
                        fill={PASTEL.coral} stroke="white" strokeWidth={1.5} opacity={0.9}>
                        <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    </FixedG>
                  ))}
                </g>
              );
            })}
            {/* Jakdo ruler lines — green for bisectors */}
            {jakdoRulerLines.map((line, i) => {
              let lineColor = guideGoal ? PASTEL.mint : PASTEL.sky;
              if (guideGoal === "circumcenter") lineColor = i === 0 ? PASTEL.coral : PASTEL.sky;
              if (guideGoal === "incenter") lineColor = i === 0 ? PASTEL.coral : PASTEL.sky;
              return (
                <line key={`rl${i}`} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
                  stroke={lineColor} strokeWidth={2} opacity={0.7}
                  strokeDasharray="8 4" />
              );
            })}
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
            {buildPhase === "jakdo" && (compassPhase === "idle" || jakdoTool === "ruler") && !guideGoal && jakdoSnaps.map((sp, i) => {
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

            {/* Guide mode: show only guide intersection points */}
            {buildPhase === "jakdo" && guideGoal && guideIntersections.map((ip, i) => (
              <FixedG key={`gip${i}`} x={ip.x} y={ip.y}>
                <circle cx={ip.x} cy={ip.y} r={10}
                  fill={`${PASTEL.mint}30`} stroke={PASTEL.mint} strokeWidth={2.5}>
                  <animate attributeName="r" values="8;14;8" dur="1.2s" repeatCount="indefinite" />
                </circle>
              </FixedG>
            ))}



            {/* Congruence proof overlay */}
            {buildPhase === "congruence-proof" && triangle && (() => {
              const { A, B, C } = triangle;
              // Clone triangle shifted right
              const dx = (Math.max(A.x,B.x,C.x) - Math.min(A.x,B.x,C.x)) * 0.15;
              const dy = (Math.max(A.y,B.y,C.y) - Math.min(A.y,B.y,C.y)) * 0.3;
              const A2 = { x: A.x + dx, y: A.y + dy };
              const B2 = { x: B.x + dx, y: B.y + dy };
              const C2 = { x: C.x + dx, y: C.y + dy };

              // Find right angle vertex (closest to 90°)
              const angA = Math.acos(((B.x-A.x)*(C.x-A.x)+(B.y-A.y)*(C.y-A.y)) / (Math.sqrt((B.x-A.x)**2+(B.y-A.y)**2)*Math.sqrt((C.x-A.x)**2+(C.y-A.y)**2))) * 180/Math.PI;
              const angB = Math.acos(((A.x-B.x)*(C.x-B.x)+(A.y-B.y)*(C.y-B.y)) / (Math.sqrt((A.x-B.x)**2+(A.y-B.y)**2)*Math.sqrt((C.x-B.x)**2+(C.y-B.y)**2))) * 180/Math.PI;
              const angC = 180 - angA - angB;

              const hiColor = "#F59E0B"; // amber for highlight
              const isRHA = triMode === "rha";

              return (
                <g>
                  {/* Clone triangle */}
                  <polygon points={`${A2.x},${A2.y} ${B2.x},${B2.y} ${C2.x},${C2.y}`}
                    fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" strokeDasharray="6,3" opacity={0.7} />
                  <text x={A2.x} y={A2.y-6*zs} textAnchor="middle" fontSize={10*zs} fill="#3B82F6" fontWeight={700}>A'</text>
                  <text x={B2.x} y={B2.y+14*zs} textAnchor="middle" fontSize={10*zs} fill="#3B82F6" fontWeight={700}>B'</text>
                  <text x={C2.x} y={C2.y-6*zs} textAnchor="middle" fontSize={10*zs} fill="#3B82F6" fontWeight={700}>C'</text>

                  {/* Right angle mark on original */}
                  {(() => {
                    // Mark right angle at vertex closest to 90°
                    let rv, p1, p2;
                    if (Math.abs(angA-90) < Math.abs(angB-90) && Math.abs(angA-90) < Math.abs(angC-90)) { rv=A; p1=B; p2=C; }
                    else if (Math.abs(angB-90) < Math.abs(angC-90)) { rv=B; p1=A; p2=C; }
                    else { rv=C; p1=A; p2=B; }
                    const d1 = Math.sqrt((p1.x-rv.x)**2+(p1.y-rv.y)**2);
                    const d2 = Math.sqrt((p2.x-rv.x)**2+(p2.y-rv.y)**2);
                    const s = 10*zs;
                    const u1x=(p1.x-rv.x)/d1*s, u1y=(p1.y-rv.y)/d1*s;
                    const u2x=(p2.x-rv.x)/d2*s, u2y=(p2.y-rv.y)/d2*s;
                    return <path d={`M ${rv.x+u1x} ${rv.y+u1y} L ${rv.x+u1x+u2x} ${rv.y+u1y+u2y} L ${rv.x+u2x} ${rv.y+u2y}`}
                      fill="none" stroke={hiColor} strokeWidth={2} />;
                  })()}

                  {/* Proof step highlights */}
                  {proofStep >= 2 && isRHA && (
                    <g>
                      {/* Highlight hypotenuse */}
                      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={hiColor} strokeWidth={3.5} opacity={0.5} />
                      <line x1={B2.x} y1={B2.y} x2={C2.x} y2={C2.y} stroke={hiColor} strokeWidth={3.5} opacity={0.5} />
                    </g>
                  )}
                  {proofStep >= 2 && !isRHA && (
                    <g>
                      {/* Highlight hypotenuse + known leg */}
                      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={hiColor} strokeWidth={3.5} opacity={0.5} />
                      <line x1={B2.x} y1={B2.y} x2={C2.x} y2={C2.y} stroke={hiColor} strokeWidth={3.5} opacity={0.5} />
                    </g>
                  )}
                </g>
              );
            })()}

                        {/* Compare/Combined circle overlays on canvas */}
            {/* Compare/Combined overlays */}
            {(buildPhase === "compare" || buildPhase === "combined") && triangle && (() => {
              const { A, B, C } = triangle;
              const skyC = "#3B82F6", mintC = "#10B981";
              const cs = compareSelected;
              const circumHi = cs === "circum";
              const inHi = cs === "in";
              const noneSelected = !cs;

              // Circumcenter & R
              const D2 = 2*(A.x*(B.y-C.y)+B.x*(C.y-A.y)+C.x*(A.y-B.y));
              const circumO = Math.abs(D2)<0.001 ? null : {
                x:((A.x*A.x+A.y*A.y)*(B.y-C.y)+(B.x*B.x+B.y*B.y)*(C.y-A.y)+(C.x*C.x+C.y*C.y)*(A.y-B.y))/D2,
                y:((A.x*A.x+A.y*A.y)*(C.x-B.x)+(B.x*B.x+B.y*B.y)*(A.x-C.x)+(C.x*C.x+C.y*C.y)*(B.x-A.x))/D2,
              };
              const R = circumO ? Math.sqrt((circumO.x-A.x)**2+(circumO.y-A.y)**2) : 0;

              // Incenter & r
              const da=Math.sqrt((B.x-C.x)**2+(B.y-C.y)**2), db=Math.sqrt((A.x-C.x)**2+(A.y-C.y)**2), dc=Math.sqrt((A.x-B.x)**2+(A.y-B.y)**2);
              const perim=da+db+dc;
              const inI={x:(da*A.x+db*B.x+dc*C.x)/perim, y:(da*A.y+db*B.y+dc*C.y)/perim};
              const sp=perim/2, areaVal=Math.sqrt(sp*(sp-da)*(sp-db)*(sp-dc)), rr=areaVal/sp;
              const foot=(p,s1,s2)=>{const ddx=s2.x-s1.x,ddy=s2.y-s1.y,l=ddx*ddx+ddy*ddy;if(!l)return s1;const t=Math.max(0,Math.min(1,((p.x-s1.x)*ddx+(p.y-s1.y)*ddy)/l));return{x:s1.x+t*ddx,y:s1.y+t*ddy};};
              const fBC=foot(inI,B,C), fAC=foot(inI,A,C), fAB=foot(inI,A,B);
              const ticks=(p1,p2,n,color)=>{const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,ddx=p2.x-p1.x,ddy=p2.y-p1.y,len=Math.sqrt(ddx*ddx+ddy*ddy);if(len<1)return null;const nx=-ddy/len*5*zs,ny=ddx/len*5*zs;return Array.from({length:n},(_,i)=>{const off=(i-(n-1)/2)*4*zs,bx=mx+(ddx/len)*off,by=my+(ddy/len)*off;return <line key={i} x1={bx-nx} y1={by-ny} x2={bx+nx} y2={by+ny} stroke={color} strokeWidth={1.5}/>;});};
              const rightAngle=(ft,ctr,color)=>{const ddx=ctr.x-ft.x,ddy=ctr.y-ft.y,len=Math.sqrt(ddx*ddx+ddy*ddy);if(len<1)return null;const ss=5*zs,nx=-ddy/len*ss,ny=ddx/len*ss,ux=ddx/len*ss,uy=ddy/len*ss;return <path d={`M${ft.x+nx} ${ft.y+ny}L${ft.x+nx+ux} ${ft.y+ny+uy}L${ft.x+ux} ${ft.y+uy}`} fill="none" stroke={color} strokeWidth={1}/>;};

              if (!circumO) return null;

              if (buildPhase === "combined") {
                // Combined: both on ONE triangle
                return (
                  <g style={{animation:"fadeIn 0.5s ease"}}>
                    <circle cx={circumO.x} cy={circumO.y} r={R} fill="none" stroke={skyC} strokeWidth={2.5} opacity={noneSelected||circumHi?0.9:0.15}/>
                    {(noneSelected||circumHi)&&<><circle cx={circumO.x} cy={circumO.y} r={4*zs} fill={skyC}/>
                    <text x={circumO.x+8*zs} y={circumO.y-8*zs} fontSize={11*zs} fill={skyC} fontWeight={700}>O</text>
                    <line x1={circumO.x} y1={circumO.y} x2={A.x} y2={A.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    <line x1={circumO.x} y1={circumO.y} x2={B.x} y2={B.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    <line x1={circumO.x} y1={circumO.y} x2={C.x} y2={C.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    {ticks(circumO,A,1,skyC)}{ticks(circumO,B,1,skyC)}{ticks(circumO,C,1,skyC)}</>}

                    <circle cx={inI.x} cy={inI.y} r={rr} fill="none" stroke={mintC} strokeWidth={2.5} opacity={noneSelected||inHi?0.9:0.15}/>
                    {(noneSelected||inHi)&&<><circle cx={inI.x} cy={inI.y} r={4*zs} fill={mintC}/>
                    <text x={inI.x-12*zs} y={inI.y+14*zs} fontSize={11*zs} fill={mintC} fontWeight={700}>I</text>
                    <line x1={inI.x} y1={inI.y} x2={fBC.x} y2={fBC.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    <line x1={inI.x} y1={inI.y} x2={fAC.x} y2={fAC.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    <line x1={inI.x} y1={inI.y} x2={fAB.x} y2={fAB.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                    {rightAngle(fBC,inI,mintC)}{rightAngle(fAC,inI,mintC)}{rightAngle(fAB,inI,mintC)}
                    {ticks(inI,fBC,2,mintC)}{ticks(inI,fAC,2,mintC)}{ticks(inI,fAB,2,mintC)}</>}
                  </g>
                );
              }

              // Compare: LEFT=원본+외접원, RIGHT=클론+내접원
              const triW=Math.max(A.x,B.x,C.x)-Math.min(A.x,B.x,C.x);
              const gap=Math.max(triW,R*0.5)*0.5;
              const s2=triW+gap;
              const A2={x:A.x+s2,y:A.y}, B2={x:B.x+s2,y:B.y}, C2={x:C.x+s2,y:C.y};
              const inI2={x:inI.x+s2,y:inI.y};
              const fBC2={x:fBC.x+s2,y:fBC.y}, fAC2={x:fAC.x+s2,y:fAC.y}, fAB2={x:fAB.x+s2,y:fAB.y};

              const co = noneSelected||circumHi ? 1 : 0.15;
              const io = noneSelected||inHi ? 1 : 0.15;

              return (
                <g style={{animation:"fadeIn 0.5s ease"}}>
                  {/* LEFT: 외접원 on original */}
                  <circle cx={circumO.x} cy={circumO.y} r={R} fill="none" stroke={skyC} strokeWidth={2.5} opacity={co*0.9} className={circumHi?"blink":""}/>
                  {co>0.5&&<><circle cx={circumO.x} cy={circumO.y} r={4*zs} fill={skyC}/>
                  <text x={circumO.x+8*zs} y={circumO.y-8*zs} fontSize={11*zs} fill={skyC} fontWeight={700}>O</text>
                  <line x1={circumO.x} y1={circumO.y} x2={A.x} y2={A.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7} className={circumHi?"blink":""}/>
                  <line x1={circumO.x} y1={circumO.y} x2={B.x} y2={B.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                  <line x1={circumO.x} y1={circumO.y} x2={C.x} y2={C.y} stroke={skyC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                  {ticks(circumO,A,1,skyC)}{ticks(circumO,B,1,skyC)}{ticks(circumO,C,1,skyC)}
                  {circumHi&&<><text x={circumO.x} y={circumO.y+16*zs} textAnchor="middle" fontSize={9*zs} fill={skyC} fontWeight={700}>R = {R.toFixed(1)}</text></>}
                  </>}
                  <text x={(A.x+B.x+C.x)/3} y={Math.min(A.y,B.y,C.y)-14*zs} textAnchor="middle" fontSize={10*zs} fill={skyC} fontWeight={700} opacity={co}>외접원</text>

                  {/* Side labels a, b, c */}
                  {(() => {
                    const midBC = {x:(B.x+C.x)/2, y:(B.y+C.y)/2};
                    const midAC = {x:(A.x+C.x)/2, y:(A.y+C.y)/2};
                    const midAB = {x:(A.x+B.x)/2, y:(A.y+B.y)/2};
                    const cx3 = (A.x+B.x+C.x)/3, cy3 = (A.y+B.y+C.y)/3;
                    const off = 12*zs;
                    const sideLabel = (mid, label, color) => {
                      const dx = mid.x-cx3, dy = mid.y-cy3;
                      const len = Math.sqrt(dx*dx+dy*dy) || 1;
                      return <text x={mid.x+dx/len*off} y={mid.y+dy/len*off} textAnchor="middle" dominantBaseline="middle" fontSize={11*zs} fill={color} fontWeight={700} fontFamily="'Playfair Display', serif">{label}</text>;
                    };
                    return <>{sideLabel(midBC, "a", PASTEL.coral)}{sideLabel(midAC, "b", PASTEL.sky)}{sideLabel(midAB, "c", PASTEL.mint)}</>;
                  })()}

                  {/* RIGHT: 클론+내접원 */}
                  <polygon points={`${A2.x},${A2.y} ${B2.x},${B2.y} ${C2.x},${C2.y}`} fill="none" stroke={theme.text} strokeWidth={2} strokeLinejoin="round" opacity={io}/>
                  <circle cx={inI2.x} cy={inI2.y} r={rr} fill="none" stroke={mintC} strokeWidth={2.5} opacity={io*0.9} className={inHi?"blink":""}/>
                  {io>0.5&&<><circle cx={inI2.x} cy={inI2.y} r={4*zs} fill={mintC}/>
                  <text x={inI2.x-12*zs} y={inI2.y+14*zs} fontSize={11*zs} fill={mintC} fontWeight={700}>I</text>
                  <line x1={inI2.x} y1={inI2.y} x2={fBC2.x} y2={fBC2.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7} className={inHi?"blink":""}/>
                  <line x1={inI2.x} y1={inI2.y} x2={fAC2.x} y2={fAC2.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                  <line x1={inI2.x} y1={inI2.y} x2={fAB2.x} y2={fAB2.y} stroke={mintC} strokeWidth={1.2} strokeDasharray="5,3" opacity={0.7}/>
                  {rightAngle(fBC2,inI2,mintC)}{rightAngle(fAC2,inI2,mintC)}{rightAngle(fAB2,inI2,mintC)}
                  {ticks(inI2,fBC2,2,mintC)}{ticks(inI2,fAC2,2,mintC)}{ticks(inI2,fAB2,2,mintC)}
                  {inHi&&<text x={inI2.x} y={inI2.y-rr-8*zs} textAnchor="middle" fontSize={9*zs} fill={mintC} fontWeight={700}>r = {rr.toFixed(1)}</text>}
                  </>}
                  <text x={(A2.x+B2.x+C2.x)/3} y={Math.min(A2.y,B2.y,C2.y)-14*zs} textAnchor="middle" fontSize={10*zs} fill={mintC} fontWeight={700} opacity={io}>내접원</text>
                </g>
              );
            })()}

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

          {/* Help Popup */}
          {helpPopupData && (
            <HelpPopup
              theme={theme} playSfx={playSfx} showMsg={showMsg}
              title={helpPopupData.title} explain={helpPopupData.explain}
              example={helpPopupData.example} analogy={helpPopupData.analogy}
              contextData={helpPopupData.contextData}
              onClose={() => setHelpPopupData(null)}
              onSendQuestion={(qData) => {
                if (setHelpRequests) {
                  setHelpRequests(prev => [...prev, {
                    id: `help-${Date.now()}`, userId: user?.id || "anon", userName: user?.name || "익명",
                    timestamp: Date.now(), status: "pending",
                    ...qData,
                  }]);
                }
                if (setArchive) {
                  setArchive(prev => [...prev, {
                    id: `q-${Date.now()}`, type: "질문", title: qData.helpTitle,
                    preview: qData.helpExplain?.slice(0, 60),
                    createdAt: Date.now(), isPublic: false, hidden: false, userId: user?.id,
                    isQuestion: true, contextData: qData,
                  }]);
                }
              }}
            />
          )}

          {/* Drag handle to resize canvas */}
          {triangle && buildPhase !== "animating" && buildPhase !== "input" && (
            <div
              onTouchStart={(e) => {
                e.preventDefault();
                const startY = e.touches[0].clientY;
                const startH = canvasHeight || svgSize.h;
                canvasDragRef.current = { startY, startH };
              }}
              onTouchMove={(e) => {
                if (!canvasDragRef.current) return;
                e.preventDefault();
                const dy = e.touches[0].clientY - canvasDragRef.current.startY;
                const newH = Math.max(120, Math.min(svgSize.h, canvasDragRef.current.startH + dy));
                setCanvasHeight(newH);
              }}
              onTouchEnd={() => { canvasDragRef.current = null; }}
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startH = canvasHeight || svgSize.h;
                const onMove = (ev) => {
                  const dy = ev.clientY - startY;
                  setCanvasHeight(Math.max(120, Math.min(svgSize.h, startH + dy)));
                };
                const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
              style={{
                width: "100%", display: "flex", justifyContent: "center", alignItems: "center",
                padding: "6px 0", cursor: "ns-resize", touchAction: "none",
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.border }} />
            </div>
          )}
          {/* Horizontal resize */}
          {triangle && buildPhase !== "animating" && buildPhase !== "input" && (
            <div onTouchStart={(e)=>{e.preventDefault();canvasDragRef.current={startX:e.touches[0].clientX,startW:canvasWidth||e.currentTarget.parentElement?.offsetWidth||300,hz:true};}}
              onTouchMove={(e)=>{if(!canvasDragRef.current?.hz)return;e.preventDefault();setCanvasWidth(Math.max(200,canvasDragRef.current.startW+(e.touches[0].clientX-canvasDragRef.current.startX)));}}
              onTouchEnd={()=>{if(canvasDragRef.current?.hz)canvasDragRef.current=null;}}
              style={{position:"absolute",right:-6,top:"30%",height:"40%",width:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"ew-resize",touchAction:"none"}}>
              <div style={{width:4,height:30,borderRadius:2,background:theme.border}} />
            </div>
          )}
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
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 11, color: theme.textSec, fontFamily: "'Noto Serif KR', serif", marginBottom: 6 }}>
                            ↑ 위 도형에서 확인하세요
                          </div>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const help = PROPERTY_HELP[item.highlight] || { title: item.text?.slice(0, 20), explain: item.text + "\n\n이 성질이 이해가 안 되면 선생님께 질문해보세요!" };
                            setHelpPopupData({ ...help, contextData: { screenName: "그려서 기억하기", propertyId: item.id, type: jedoType === "circum" ? "외접원" : "내접원" } });
                            playSfx("click");
                          }} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>
                            ❓ 이해가 안 돼요
                          </button>
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
          } : {
            flex: 1, minHeight: 0,
            overflowY: "auto", WebkitOverflowScrolling: "touch",
          }),
          display: (!isPC && showProperties && !showArchiveSave) ? "none" : undefined,
        }}>

        {/* PC sidebar header */}
        {isPC && (
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
            <div style={{ fontSize: 11, color: theme.textSec, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>
              {buildPhase === "input" ? "입력 패널" :
               buildPhase === "modeSelect" ? "모드 선택" :
               buildPhase === "compare" ? "외접원 ↔ 내접원" :
               buildPhase === "combined" ? "외심 ↔ 내심" :
               buildPhase === "congruence-proof" ? (triMode === "rha" ? "RHA 합동 증명" : "RHS 합동 증명") :
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
        {buildPhase === "input" && inputMode === "B" && drawStep > 0 && !triangle && drawGoal !== "congruence" && (
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
        {buildPhase === "input" && inputMode === "B" && drawStep === 0 && !triangle && drawGoal !== "congruence" && (
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
        {buildPhase === "input" && !triangle && triMode === "sss" && drawGoal !== "congruence" && (
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

        {buildPhase === "input" && !triangle && triMode === "sas" && drawGoal !== "congruence" && (
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

        {buildPhase === "input" && !triangle && triMode === "asa" && drawGoal !== "congruence" && (
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
            {!guideGoal ? (
              <>
                <p style={{ fontSize: 13, color: theme.textSec, textAlign: "center", marginBottom: 14 }}>
                  삼각형이 완성되었어요! 모드를 선택하세요.
                </p>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <button onClick={() => {
                    setBuildPhase("jedo");
                    showMsg(activeTone.guide.selectEdge, 3000);
                  }} style={{
                    flex: 1, padding: "16px", borderRadius: 16,
                    border: `2px solid ${PASTEL.sky}`, background: theme.card,
                    color: theme.text, fontSize: 15, cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                  }}>
                    📐 제도
                    <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>터치로 자동 작도</span>
                  </button>
                  <button onClick={() => setGuideGoal("select")} style={{
                    flex: 1, padding: "16px", borderRadius: 16,
                    border: `2px solid ${PASTEL.lavender}`, background: theme.card,
                    color: theme.text, fontSize: 15, cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                  }}>
                    ✏️ 가이드 작도
                    <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>단계별 안내</span>
                  </button>
                </div>
              </>
            ) : guideGoal === "select" ? (
              <>
                <p style={{ fontSize: 13, color: theme.textSec, textAlign: "center", marginBottom: 14 }}>
                  무엇을 찾아볼까요?
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => {
                    setGuideGoal("circumcenter"); setGuideStep(0);
                    setBuildPhase("jakdo"); setJakdoTool(null);
                    setJakdoArcs([]); setJakdoRulerLines([]);
                  }} style={{
                    flex: 1, padding: "16px", borderRadius: 16,
                    border: `2px solid ${PASTEL.coral}`, background: theme.card,
                    color: theme.text, fontSize: 15, cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                  }}>
                    ⊙ 외심
                    <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>수직이등분선의 교점</span>
                  </button>
                  <button onClick={() => {
                    setGuideGoal("incenter"); setGuideStep(0);
                    setBuildPhase("jakdo"); setJakdoTool(null);
                    setJakdoArcs([]); setJakdoRulerLines([]);
                  }} style={{
                    flex: 1, padding: "16px", borderRadius: 16,
                    border: `2px solid ${PASTEL.mint}`, background: theme.card,
                    color: theme.text, fontSize: 15, cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif", fontWeight: 700,
                  }}>
                    ⊙ 내심
                    <br /><span style={{ fontSize: 11, fontWeight: 400, color: theme.textSec }}>각의 이등분선의 교점</span>
                  </button>
                </div>
                <button onClick={() => setGuideGoal(null)} style={{
                  width: "100%", marginTop: 10, padding: "10px", borderRadius: 10,
                  border: `1px solid ${theme.border}`, background: "transparent",
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>← 돌아가기</button>
              </>
            ) : null}
          </div>
        )}



        {/* Congruence proof panel */}
        {buildPhase === "congruence-proof" && triangle && (() => {
          const { A, B, C, sides, scale } = triangle;
          const isRHA = triMode === "rha";
          const sc = scale || 1;
          
          // Calculate angles
          const ab = Math.sqrt((A.x-B.x)**2+(A.y-B.y)**2)/sc;
          const bc = Math.sqrt((B.x-C.x)**2+(B.y-C.y)**2)/sc;
          const ac = Math.sqrt((A.x-C.x)**2+(A.y-C.y)**2)/sc;
          const angA = Math.acos(((B.x-A.x)*(C.x-A.x)+(B.y-A.y)*(C.y-A.y)) / (Math.sqrt((B.x-A.x)**2+(B.y-A.y)**2)*Math.sqrt((C.x-A.x)**2+(C.y-A.y)**2))) * 180/Math.PI;
          const angB = Math.acos(((A.x-B.x)*(C.x-B.x)+(A.y-B.y)*(C.y-B.y)) / (Math.sqrt((A.x-B.x)**2+(A.y-B.y)**2)*Math.sqrt((C.x-B.x)**2+(C.y-B.y)**2))) * 180/Math.PI;
          const angC = 180 - angA - angB;
          const hyp = Math.max(ab,bc,ac);

          const rhaSteps = [
            { title: "RHA 조건 확인", text: "두 직각삼각형의 빗변과 한 예각이 같아요.", color: PASTEL.coral },
            { title: "\u{1F914} 이건 ASA 합동?", text: "ASA 합동은 \'각-변-각\'이에요.\n빗변 양 끝의 두 각을 알아야 하는데,\n지금은 직각과 한 예각만 알고 있어요.", color: "#3B82F6" },
            { title: "\u{1F4A1} 핵심: 삼각형 내각의 합", text: "삼각형 내각의 합은 180\u00B0이므로:\n세 번째 각 = 180\u00B0 - 90\u00B0 - \u03B1\n= (90\u00B0 - \u03B1)", color: "#F59E0B" },
            { title: "\u2705 결론: ASA 합동!", text: "\u2220B = \u03B1, BC(빗변), \u2220C = 90\u00B0 - \u03B1\n\u2192 각-변-각을 모두 알게 됐어요!\n\n\u2234 RHA 합동 = ASA 합동 \u2713", color: "#10B981" },
          ];
          
          const rhsSteps = [
            { title: "RHS 조건 확인", text: "두 직각삼각형의 빗변과 한 변이 같아요.", color: PASTEL.coral },
            { title: "\u{1F914} 이건 SSS 합동?", text: "SSS 합동은 세 변이 모두 같아야 해요.\n지금은 두 변만 알고 있어요.\n나머지 한 변을 구할 수 있을까요?", color: "#3B82F6" },
            { title: "\u{1F4A1} 핵심: 피타고라스 정리", text: "직각삼각형이니까:\nc\u00B2 = a\u00B2 + b\u00B2\n\u2234 나머지 변 = \u221A(빗변\u00B2 - 알려진 변\u00B2)", color: "#F59E0B" },
            { title: "\u{1F4D0} 계산", text: "두 삼각형 모두 같은 계산:\n나머지 변의 길이가 동일!", color: "#F59E0B" },
            { title: "\u2705 결론: SSS 합동!", text: "세 변이 모두 같으므로:\nSSS 합동 조건 성립!\n\n\u2234 RHS 합동 = SSS 합동 \u2713", color: "#10B981" },
          ];

          const steps = isRHA ? rhaSteps : rhsSteps;
          const step = steps[Math.min(proofStep, steps.length - 1)];

          return (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}`, background: theme.card, animation: "fadeIn 0.3s ease" }}>
              {/* Step indicator */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, justifyContent: "center" }}>
                {steps.map((s, i) => (
                  <div key={i} style={{
                    width: proofStep === i ? 20 : 8, height: 8, borderRadius: 4,
                    background: proofStep >= i ? s.color : theme.border,
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>

              {/* Step content */}
              <div style={{
                padding: "16px", borderRadius: 14,
                background: `${step.color}10`, border: `1.5px solid ${step.color}40`,
                animation: "fadeIn 0.3s ease",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: step.color, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.8, whiteSpace: "pre-line" }}>{step.text}</div>
              </div>

              {/* Navigation */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => setProofStep(Math.max(0, proofStep - 1))}
                  disabled={proofStep === 0}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10,
                    border: `1px solid ${proofStep > 0 ? theme.border : "transparent"}`,
                    background: theme.card, color: proofStep > 0 ? theme.text : theme.lineLight,
                    fontSize: 12, cursor: proofStep > 0 ? "pointer" : "default",
                  }}>← 이전</button>
                {proofStep < steps.length - 1 ? (
                  <button onClick={() => setProofStep(proofStep + 1)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                      color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>다음 →</button>
                ) : (
                  <button onClick={() => { resetAll(); setBuildPhase("input"); setTriMode(triMode); setProofStep(0); }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg, ${PASTEL.mint}, #10B981)`,
                      color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>다른 삼각형으로 →</button>
                )}
              </div>
            </div>
          );
        })()}

                {/* Compare/Combined interactive formulas */}
        {(buildPhase === "compare" || buildPhase === "combined") && triangle && (() => {
          const { A, B, C, sides } = triangle;
          const [a, b, cc2] = sides;
          // R and r are measured from the actual construction, not calculated by formula
          const R_val = jedoCircle && jedoType === "circum" ? jedoCircle.r / (triangle.scale || 1) : 0;
          const r_val = jedoCircle && jedoType !== "circum" ? jedoCircle.r / (triangle.scale || 1) : 0;
          // For archive preview, compute both
          const da = Math.sqrt((B.x-C.x)**2+(B.y-C.y)**2);
          const db = Math.sqrt((A.x-C.x)**2+(A.y-C.y)**2);
          const dc = Math.sqrt((A.x-B.x)**2+(A.y-B.y)**2);
          const sp = (da+db+dc)/2;
          const areaVal = Math.sqrt(Math.max(0, sp*(sp-da)*(sp-db)*(sp-dc)));
          const R_archive = areaVal > 0 ? (da*db*dc) / (4*areaVal) : 0;
          const r_archive = sp > 0 ? areaVal / sp : 0;
          const skyC = "#3B82F6", mintC = "#10B981";
          const sel = compareSelected;

          return (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}`, background: theme.card, animation: "fadeIn 0.5s ease" }}>
              {/* Selector cards */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[["circum", skyC, buildPhase === "combined" ? "⊙ 외심 O" : "⊙ 외접원", "OA = OB = OC = R"],
                  ["in", mintC, buildPhase === "combined" ? "⊙ 내심 I" : "⊙ 내접원", "ID₁ = ID₂ = ID₃ = r"]
                ].map(([type, color, title, desc]) => (
                  <button key={type} onClick={() => setCompareSelected(sel === type ? null : type)} style={{
                    flex: 1, textAlign: "left", padding: "14px", borderRadius: 14,
                    background: sel === type ? `${color}12` : theme.card,
                    border: `2px solid ${sel === type ? color : theme.border}`,
                    cursor: "pointer", transition: "all 0.3s",
                    boxShadow: sel === type ? `0 2px 12px ${color}25` : "none",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{title}</div>
                    <div style={{ fontSize: 11, color: theme.textSec, lineHeight: 1.6 }}>{desc}</div>
                  </button>
                ))}
              </div>

              {/* Circumscribed detail — 교과과정 범위 설명 */}
              {sel === "circum" && (
                <div style={{ padding: "14px", borderRadius: 14, background: `${skyC}06`, border: `1px solid ${skyC}25`, marginBottom: 10, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: skyC, marginBottom: 8 }}>
                    {buildPhase === "combined" ? "외심 O의 성질" : "외접원이란?"}
                  </div>
                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 2.2 }}>
                    <div style={{ background: `${skyC}10`, padding: "6px 10px", borderRadius: 8, marginBottom: 8 }}>
                      <b style={{color: skyC}}>핵심:</b> 외심 = 세 변의 <b>수직이등분선</b>이 만나는 점
                    </div>

                    <div style={{ padding: "8px 10px", background: theme.bg, borderRadius: 8, fontSize: 12, lineHeight: 2.2 }}>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>① 수직이등분선의 성질 (1학년 때 작도했지?)</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          수직이등분선 위의 점은 <b>양 끝점에서 같은 거리</b>에 있어
                        </div>
                      </div>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>② 세 수직이등분선의 교점 → 외심 O</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          변 AB의 수직이등분선 위 → OA = OB<br/>
                          변 BC의 수직이등분선 위 → OB = OC<br/>
                          ∴ <b style={{color: skyC}}>OA = OB = OC = R</b>
                        </div>
                      </div>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>③ 이등변삼각형 3개 탄생!</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          △OAB, △OBC, △OCA 모두 OA=OB=OC=R이니까 이등변삼각형
                        </div>
                      </div>
                      <div style={{padding:"8px 0"}}>
                        <div><b>④ 외접원 = 세 꼭짓점을 지나는 원</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          외심에 컴퍼스를 대고 아무 꼭짓점까지 벌려서 원을 그리면 → 외접원!
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, color: skyC, marginTop: 10, textAlign: "center" }}>
                      R = {R_archive.toFixed(2)}
                      <div style={{ fontSize: 10, fontWeight: 400, color: theme.textSec, marginTop: 2 }}>
                        (외심에서 꼭짓점까지 거리)
                      </div>
                    </div>
                    <button onClick={() => {
                      setHelpPopupData({ ...(PROPERTY_HELP.circumRadiiAll || {}), title: "외심은 왜 생길까?", contextData: { screenName: "외접원 설명", type: "외접원" } });
                      playSfx("click");
                    }} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>
                      ❓ 이해가 안 돼요
                    </button>
                  </div>
                </div>
              )}

              {/* Inscribed detail — 교과과정 범위 설명 */}
              {sel === "in" && (
                <div style={{ padding: "14px", borderRadius: 14, background: `${mintC}06`, border: `1px solid ${mintC}25`, marginBottom: 10, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: mintC, marginBottom: 8 }}>
                    {buildPhase === "combined" ? "내심 I의 성질" : "내접원이란?"}
                  </div>
                  <div style={{ fontSize: 12, color: theme.text, lineHeight: 2.2 }}>
                    <div style={{ background: `${mintC}10`, padding: "6px 10px", borderRadius: 8, marginBottom: 8 }}>
                      <b style={{color: mintC}}>핵심:</b> 내심 = 세 각의 <b>이등분선</b>이 만나는 점
                    </div>

                    <div style={{ padding: "8px 10px", background: theme.bg, borderRadius: 8, fontSize: 12, lineHeight: 2.2 }}>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>① 점과 직선 사이의 거리 (1학년 때 배웠지?)</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          점에서 직선까지의 <b>최단 거리 = 수직 거리</b>야
                        </div>
                      </div>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>② 각의 이등분선의 성질 (RHS 합동으로 증명!)</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          각의 이등분선 위의 점에서 두 변에 수선을 내리면<br/>
                          직각삼각형 2개가 RHS 합동 → <b>두 수선의 길이가 같다!</b>
                        </div>
                      </div>
                      <div style={{padding:"8px 0",borderBottom:`1px solid ${theme.border}20`}}>
                        <div><b>③ 세 이등분선의 교점 → 내심 I</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          ∠A의 이등분선 위 → AB, AC까지 거리 같다<br/>
                          ∠B의 이등분선 위 → BA, BC까지 거리 같다<br/>
                          ∴ <b style={{color: mintC}}>세 변까지의 수직 거리가 모두 같다 = r</b>
                        </div>
                      </div>
                      <div style={{padding:"8px 0"}}>
                        <div><b>④ 내접원 = 세 변에 접하는 원</b></div>
                        <div style={{marginLeft: 8, marginTop: 4, fontSize: 11}}>
                          내심에 컴퍼스를 대고 아무 변까지 벌려서 원을 그리면 → 내접원!
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 700, color: mintC, marginTop: 10, textAlign: "center" }}>
                      r = {r_archive.toFixed(2)}
                      <div style={{ fontSize: 10, fontWeight: 400, color: theme.textSec, marginTop: 2 }}>
                        (내심에서 변까지 수직 거리)
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <button onClick={() => {
                        setHelpPopupData({ ...(PROPERTY_HELP.inRadiiAll || {}), title: "내심은 왜 생길까?", contextData: { screenName: "내접원 설명", type: "내접원" } });
                        playSfx("click");
                      }} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>
                        ❓ 이해가 안 돼요
                      </button>
                      <button onClick={() => { playSfx("click"); setScreen("distance"); }}
                        style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${PASTEL.sky}30`, background: `${PASTEL.sky}08`, color: PASTEL.sky, fontSize: 10, cursor: "pointer" }}>
                        📏 거리 개념부터 →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!sel && (() => {
                // Auto-select circum on first render
                setTimeout(() => setCompareSelected("circum"), 300);
                return (
                  <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center", margin: "8px 0" }}>
                    외접원을 먼저 살펴볼게요...
                  </p>
                );
              })()}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCompareSelected(null); resetAll(); setBuildPhase("input"); setTriMode("sss"); }} style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  border: `1px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>닫기</button>
                <button onClick={() => {
                  if (setArchive) {
                    setArchive(prev => [...prev, {
                      id: `draw-${Date.now()}`, type: buildPhase === "compare" ? "외접원↔내접원" : "외심↔내심",
                      title: `${jedoType === "circum" ? "외접원" : "내접원"} 비교`,
                      preview: `R≈${R_archive.toFixed(1)}, r≈${r_archive.toFixed(1)}`,
                      createdAt: Date.now(), isPublic: archiveDefaultPublic || false, hidden: false, userId: user?.id,
                    }]);
                    playSfx("success"); showMsg("아카이브에 저장! 학생 홈 > 아카이브에서 확인 📂", 2000);
                  }
                }} style={{
                  flex: 2, padding: "10px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                  color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>📂 아카이브에 저장</button>
              </div>
            </div>
          );
        })()}

        {/* Jakdo panel */}
        {buildPhase === "jakdo" && (
          <div style={{
            padding: "14px 16px", borderTop: `1px solid ${theme.border}`,
            background: theme.card, animation: "fadeIn 0.5s ease",
          }}>
            {/* Guide instruction banner */}
            {currentGuide && (
              <div style={{
                padding: "14px 16px", marginBottom: 12, borderRadius: 14,
                background: `linear-gradient(135deg, ${PASTEL.lavender}15, ${PASTEL.mint}15)`,
                border: `1.5px solid ${PASTEL.lavender}40`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: PASTEL.lavender, fontWeight: 700 }}>
                    단계 {guideStep + 1}/{guideSteps.length}
                  </span>
                  {guideGoal === "circumcenter" && <span style={{ fontSize: 10, color: PASTEL.coral }}>⊙ 외심 찾기</span>}
                  {guideGoal === "incenter" && <span style={{ fontSize: 10, color: PASTEL.mint }}>⊙ 내심 찾기</span>}
                </div>
                <p style={{ fontSize: 15, color: theme.text, fontWeight: 700, margin: 0, fontFamily: "'Noto Serif KR', serif", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                  {currentGuide.msg}
                </p>
                {/* Progress dots */}
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                  {guideSteps.map((_, i) => (
                    <div key={i} style={{
                      width: i === guideStep ? 16 : 6, height: 6, borderRadius: 3,
                      background: i < guideStep ? PASTEL.mint : i === guideStep ? PASTEL.coral : theme.lineLight,
                      transition: "all 0.3s ease",
                    }} />
                  ))}
                </div>
                {/* Done/Next buttons */}
                {currentGuide.type === "done_line" && (
                  <button onClick={() => { pushUndo(); setGuideStep(s => s + 1); playSfx("click"); }} style={{
                    marginTop: 10, padding: "10px 24px", borderRadius: 10, border: "none",
                    background: PASTEL.lavender, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%",
                  }}>다음 →</button>
                )}
                {currentGuide.type === "complete" && (
                  <button onClick={() => {
                    const { A, B, C } = triangle;
                    let cx, cy, r;

                    if (guideGoal === "circumcenter") {
                      // Try ruler line intersection first
                      if (jakdoRulerLines.length >= 2) {
                        const l1 = jakdoRulerLines[0], l2 = jakdoRulerLines[1];
                        const dx1=l1.end.x-l1.start.x, dy1=l1.end.y-l1.start.y;
                        const dx2=l2.end.x-l2.start.x, dy2=l2.end.y-l2.start.y;
                        const det = dx1*dy2 - dy1*dx2;
                        if (Math.abs(det) > 0.01) {
                          const t = ((l2.start.x-l1.start.x)*dy2 - (l2.start.y-l1.start.y)*dx2) / det;
                          cx = l1.start.x + t*dx1; cy = l1.start.y + t*dy1;
                        }
                      }
                      // Fallback: calculate circumcenter mathematically
                      if (cx === undefined) {
                        const D = 2 * (A.x*(B.y-C.y) + B.x*(C.y-A.y) + C.x*(A.y-B.y));
                        if (Math.abs(D) > 0.01) {
                          cx = ((A.x*A.x+A.y*A.y)*(B.y-C.y) + (B.x*B.x+B.y*B.y)*(C.y-A.y) + (C.x*C.x+C.y*C.y)*(A.y-B.y)) / D;
                          cy = ((A.x*A.x+A.y*A.y)*(C.x-B.x) + (B.x*B.x+B.y*B.y)*(A.x-C.x) + (C.x*C.x+C.y*C.y)*(B.x-A.x)) / D;
                        }
                      }
                      if (cx !== undefined) {
                        r = dist({x:cx,y:cy}, A);
                        setJedoCenter({x:cx, y:cy});
                        setJedoCircle({cx, cy, r});
                        setJedoType("circum");
                      }
                    } else if (guideGoal === "incenter") {
                      // Try ruler line intersection first
                      if (jakdoRulerLines.length >= 2) {
                        const l1 = jakdoRulerLines[0], l2 = jakdoRulerLines[1];
                        const dx1=l1.end.x-l1.start.x, dy1=l1.end.y-l1.start.y;
                        const dx2=l2.end.x-l2.start.x, dy2=l2.end.y-l2.start.y;
                        const det = dx1*dy2 - dy1*dx2;
                        if (Math.abs(det) > 0.01) {
                          const t = ((l2.start.x-l1.start.x)*dy2 - (l2.start.y-l1.start.y)*dx2) / det;
                          cx = l1.start.x + t*dx1; cy = l1.start.y + t*dy1;
                        }
                      }
                      // Fallback: calculate incenter mathematically
                      if (cx === undefined) {
                        const a = dist(B, C), b = dist(A, C), c = dist(A, B);
                        const sum = a + b + c;
                        cx = (a*A.x + b*B.x + c*C.x) / sum;
                        cy = (a*A.y + b*B.y + c*C.y) / sum;
                      }
                      if (cx !== undefined) {
                        const dToEdge = (p,e1,e2) => { const dx=e2.x-e1.x,dy=e2.y-e1.y; return Math.abs((p.x-e1.x)*dy-(p.y-e1.y)*dx)/Math.sqrt(dx*dx+dy*dy); };
                        r = Math.min(dToEdge({x:cx,y:cy},A,B), dToEdge({x:cx,y:cy},B,C), dToEdge({x:cx,y:cy},A,C));
                        setJedoCenter({x:cx, y:cy});
                        setJedoCircle({cx, cy, r});
                        setJedoType("in");
                      }
                    }

                    setShowProperties(true);
                    setBuildPhase("properties");
                    playSfx("complete");
                  }} style={{
                    marginTop: 10, padding: "12px 24px", borderRadius: 12, border: "none",
                    background: `linear-gradient(135deg, ${PASTEL.mint}, ${PASTEL.sage})`,
                    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
                  }}>✨ 결과 확인!</button>
                )}
              </div>
            )}
            <style>{`
              @keyframes compassSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes compassPoke { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
              @keyframes compassStretch { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(1.15); } }
              @keyframes rulerSlide { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
              @keyframes rulerDraw { 0% { width: 0; } 100% { width: 100%; } }
            `}</style>

            {/* Tool selector row — only in free mode */}
            {!guideGoal && (<>
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

            {/* end free-mode tools */}
            </>)}

            {/* Guide text */}
            <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center", margin: 0 }}>
              {guideGoal && currentGuide ? currentGuide.msg : (
                <>
                  {jakdoTool === "compass" && compassStep === 0 && "꼭지점이나 교점을 터치하세요"}
                  {jakdoTool === "compass" && compassStep === 1 && compassDragPt && "드래그해서 반지름을 정해주세요"}
                  {jakdoTool === "compass" && compassStep === 1 && !compassDragPt && compassRadius > 0 && "'호 돌리기' 버튼을 눌러주세요"}
                  {jakdoTool === "compass" && compassStep === 1 && !compassDragPt && compassRadius === 0 && "드래그해서 반지름을 정해주세요"}
                  {jakdoTool === "compass" && compassStep === 2 && "손가락으로 호를 그려주세요"}
                  {jakdoTool === "ruler" && !rulerStart && "시작점을 터치하세요"}
                  {jakdoTool === "ruler" && rulerStart && "끝점을 터치하세요"}
                  {!jakdoTool && "도구를 선택해주세요"}
                </>
              )}
            </p>
          </div>
        )}
        </div>{/* end right section */}
        </div>{/* end content area */}
      </div>
    );

}
