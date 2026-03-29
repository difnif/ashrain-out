import { PASTEL } from "../config";
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
    renderTriangleAnim, renderHighlight, getProperties,
    handleJedoClick, handleJakdoDown, handleJakdoMove, handleJakdoUp, handleUndo,
    resetAll, generateTriangleWithBase, drawGoal,
    failAnim, idleMsg, retryDraw,
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
            {(buildPhase === "jedo" || buildPhase === "jakdo" || buildPhase === "modeSelect" || buildPhase === "properties" || buildPhase === "compare" || buildPhase === "combined") && (
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
            onTouchStart={(e) => { handleTouchStart(e); if(buildPhase==="jakdo") handleJakdoDown(e); handleDrawStart(e); }}
            onTouchMove={(e) => { handleTouchMove(e); if(buildPhase==="jakdo") handleJakdoMove(e); handleDrawMove(e); }}
            onTouchEnd={(e) => { handleTouchEnd(e); if(buildPhase==="jakdo") handleJakdoUp(e); handleDrawEnd(e); }}
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


        {/* Compare View — 외접원 옆에 내접원 / 외심 옆에 내심 */}
        {(buildPhase === "compare" || buildPhase === "combined") && triangle && (() => {
          const { A, B, C, sides, scale } = triangle;
          const [sa, sb, sc] = sides.map(v => v * (scale || 1));

          // Circumcenter & radius
          const circumO = (() => {
            const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
            if (Math.abs(D) < 0.001) return null;
            const ux = ((A.x*A.x + A.y*A.y) * (B.y - C.y) + (B.x*B.x + B.y*B.y) * (C.y - A.y) + (C.x*C.x + C.y*C.y) * (A.y - B.y)) / D;
            const uy = ((A.x*A.x + A.y*A.y) * (C.x - B.x) + (B.x*B.x + B.y*B.y) * (A.x - C.x) + (C.x*C.x + C.y*C.y) * (B.x - A.x)) / D;
            return { x: ux, y: uy };
          })();
          const R = circumO ? Math.sqrt((circumO.x - A.x) ** 2 + (circumO.y - A.y) ** 2) : 0;

          // Incenter & radius
          const da = Math.sqrt((B.x-C.x)**2 + (B.y-C.y)**2);
          const db = Math.sqrt((A.x-C.x)**2 + (A.y-C.y)**2);
          const dc = Math.sqrt((A.x-B.x)**2 + (A.y-B.y)**2);
          const perim = da + db + dc;
          const inI = { x: (da*A.x + db*B.x + dc*C.x) / perim, y: (da*A.y + db*B.y + dc*C.y) / perim };
          const sp = perim / 2;
          const areaVal = Math.sqrt(sp * (sp - da) * (sp - db) * (sp - dc));
          const rr = areaVal / sp;

          // Foot of perpendicular from I to each side
          const foot = (p, s1, s2) => {
            const dx = s2.x - s1.x, dy = s2.y - s1.y;
            const lenSq = dx*dx + dy*dy;
            if (lenSq === 0) return s1;
            const t = Math.max(0, Math.min(1, ((p.x-s1.x)*dx + (p.y-s1.y)*dy) / lenSq));
            return { x: s1.x + t * dx, y: s1.y + t * dy };
          };
          const fBC = foot(inI, B, C), fAC = foot(inI, A, C), fAB = foot(inI, A, B);

          // Equal length tick marks
          const ticks = (p1, p2, n, color) => {
            const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
            const dx = p2.x-p1.x, dy = p2.y-p1.y;
            const len = Math.sqrt(dx*dx+dy*dy);
            if (len < 1) return null;
            const nx = -dy/len*5, ny = dx/len*5;
            return Array.from({length: n}, (_, i) => {
              const off = (i - (n-1)/2) * 4;
              const bx = mx + (dx/len)*off, by = my + (dy/len)*off;
              return <line key={i} x1={bx-nx} y1={by-ny} x2={bx+nx} y2={by+ny} stroke={color} strokeWidth={1.5} />;
            });
          };

          // Right angle mark
          const rightAngle = (ft, center, color) => {
            const dx = center.x - ft.x, dy = center.y - ft.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len < 1) return null;
            const nx = -dy/len*5, ny = dx/len*5;
            const ux = dx/len*5, uy = dy/len*5;
            return <path d={`M ${ft.x+nx} ${ft.y+ny} L ${ft.x+nx+ux} ${ft.y+ny+uy} L ${ft.x+ux} ${ft.y+uy}`}
              fill="none" stroke={color} strokeWidth={1} />;
          };

          const vb = getActiveVB();
          const skyC = PASTEL.sky, mintC = PASTEL.mint, coralC = PASTEL.coral;

          if (buildPhase === "combined" && circumO) {
            // === Combined: both on one triangle ===
            return (
              <div style={{ padding: "16px", borderTop: `1px solid ${theme.border}`, background: theme.card, animation: "fadeIn 0.5s ease" }}>
                <svg width="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ maxHeight: 280 }}>
                  {/* Triangle */}
                  <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
                    fill="none" stroke={coralC} strokeWidth={2} strokeLinejoin="round" />
                  <text x={A.x} y={A.y-8} textAnchor="middle" fontSize={11*zs} fill={coralC} fontWeight={700}>A</text>
                  <text x={B.x} y={B.y+14*zs} textAnchor="middle" fontSize={11*zs} fill={coralC} fontWeight={700}>B</text>
                  <text x={C.x} y={C.y-8} textAnchor="middle" fontSize={11*zs} fill={coralC} fontWeight={700}>C</text>

                  {/* Circumscribed circle + O */}
                  <circle cx={circumO.x} cy={circumO.y} r={R} fill="none" stroke={skyC} strokeWidth={1.5} />
                  <circle cx={circumO.x} cy={circumO.y} r={3*zs} fill={skyC} />
                  <text x={circumO.x+8*zs} y={circumO.y-8*zs} fontSize={10*zs} fill={skyC} fontWeight={700}>O</text>

                  {/* Inscribed circle + I */}
                  <circle cx={inI.x} cy={inI.y} r={rr} fill="none" stroke={mintC} strokeWidth={1.5} />
                  <circle cx={inI.x} cy={inI.y} r={3*zs} fill={mintC} />
                  <text x={inI.x-12*zs} y={inI.y+14*zs} fontSize={10*zs} fill={mintC} fontWeight={700}>I</text>

                  {/* O → vertices (R) */}
                  <line x1={circumO.x} y1={circumO.y} x2={A.x} y2={A.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                  <line x1={circumO.x} y1={circumO.y} x2={B.x} y2={B.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                  <line x1={circumO.x} y1={circumO.y} x2={C.x} y2={C.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                  {ticks(circumO, A, 1, skyC)}
                  {ticks(circumO, B, 1, skyC)}
                  {ticks(circumO, C, 1, skyC)}

                  {/* I → feet (r) */}
                  <line x1={inI.x} y1={inI.y} x2={fBC.x} y2={fBC.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                  <line x1={inI.x} y1={inI.y} x2={fAC.x} y2={fAC.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                  <line x1={inI.x} y1={inI.y} x2={fAB.x} y2={fAB.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                  {rightAngle(fBC, inI, mintC)}
                  {rightAngle(fAC, inI, mintC)}
                  {rightAngle(fAB, inI, mintC)}
                  {ticks(inI, fBC, 2, mintC)}
                  {ticks(inI, fAC, 2, mintC)}
                  {ticks(inI, fAB, 2, mintC)}
                </svg>

                {/* Formulas */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <div style={{ flex: 1, background: `${skyC}08`, borderRadius: 12, padding: "12px", border: `1px solid ${skyC}30` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: skyC, marginBottom: 6 }}>외심 O</div>
                    <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.8 }}>
                      <div>OA = OB = OC = <b>R</b></div>
                      <div>R = abc / 4S</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: skyC, marginTop: 4 }}>R ≈ {(R / (scale || 1)).toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: `${mintC}08`, borderRadius: 12, padding: "12px", border: `1px solid ${mintC}30` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mintC, marginBottom: 6 }}>내심 I</div>
                    <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.8 }}>
                      <div>ID₁ = ID₂ = ID₃ = <b>r</b></div>
                      <div>r = S / s</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: mintC, marginTop: 4 }}>r ≈ {(rr / (scale || 1)).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <button onClick={() => { resetAll(); setBuildPhase("input"); setTriMode("sss"); }} style={{
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 12,
                  border: `1.5px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>다른 삼각형 그리기</button>
              </div>
            );
          }

          if (buildPhase === "compare" && circumO) {
            // === Side by side: left=circumscribed, right=inscribed ===
            return (
              <div style={{ padding: "16px", borderTop: `1px solid ${theme.border}`, background: theme.card, animation: "fadeIn 0.5s ease" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {/* Left: Circumscribed */}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: skyC, marginBottom: 4 }}>외접원</div>
                    <svg width="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ maxHeight: 200, background: `${skyC}05`, borderRadius: 10, border: `1px solid ${theme.border}` }}>
                      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={coralC} strokeWidth={2} strokeLinejoin="round" />
                      <circle cx={circumO.x} cy={circumO.y} r={R} fill="none" stroke={skyC} strokeWidth={1.5} />
                      <circle cx={circumO.x} cy={circumO.y} r={3*zs} fill={skyC} />
                      <text x={circumO.x+8*zs} y={circumO.y-6*zs} fontSize={10*zs} fill={skyC} fontWeight={700}>O</text>
                      <line x1={circumO.x} y1={circumO.y} x2={A.x} y2={A.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                      <line x1={circumO.x} y1={circumO.y} x2={B.x} y2={B.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                      <line x1={circumO.x} y1={circumO.y} x2={C.x} y2={C.y} stroke={skyC} strokeWidth={0.8} strokeDasharray="4,3" />
                      {ticks(circumO, A, 1, skyC)}
                      {ticks(circumO, B, 1, skyC)}
                      {ticks(circumO, C, 1, skyC)}
                      <text x={A.x} y={A.y-6*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>A</text>
                      <text x={B.x} y={B.y+12*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>B</text>
                      <text x={C.x} y={C.y-6*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>C</text>
                    </svg>
                  </div>
                  {/* Right: Inscribed */}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mintC, marginBottom: 4 }}>내접원</div>
                    <svg width="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ maxHeight: 200, background: `${mintC}05`, borderRadius: 10, border: `1px solid ${theme.border}` }}>
                      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={coralC} strokeWidth={2} strokeLinejoin="round" />
                      <circle cx={inI.x} cy={inI.y} r={rr} fill="none" stroke={mintC} strokeWidth={1.5} />
                      <circle cx={inI.x} cy={inI.y} r={3*zs} fill={mintC} />
                      <text x={inI.x+8*zs} y={inI.y-6*zs} fontSize={10*zs} fill={mintC} fontWeight={700}>I</text>
                      <line x1={inI.x} y1={inI.y} x2={fBC.x} y2={fBC.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                      <line x1={inI.x} y1={inI.y} x2={fAC.x} y2={fAC.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                      <line x1={inI.x} y1={inI.y} x2={fAB.x} y2={fAB.y} stroke={mintC} strokeWidth={0.8} strokeDasharray="4,3" />
                      {rightAngle(fBC, inI, mintC)}
                      {rightAngle(fAC, inI, mintC)}
                      {rightAngle(fAB, inI, mintC)}
                      {ticks(inI, fBC, 2, mintC)}
                      {ticks(inI, fAC, 2, mintC)}
                      {ticks(inI, fAB, 2, mintC)}
                      <text x={A.x} y={A.y-6*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>A</text>
                      <text x={B.x} y={B.y+12*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>B</text>
                      <text x={C.x} y={C.y-6*zs} textAnchor="middle" fontSize={9*zs} fill={coralC}>C</text>
                    </svg>
                  </div>
                </div>

                {/* Formulas side by side */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, background: `${skyC}08`, borderRadius: 12, padding: "12px", border: `1px solid ${skyC}30` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: skyC, marginBottom: 6 }}>외접원 공식</div>
                    <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.8 }}>
                      <div>OA = OB = OC = <b>R</b></div>
                      <div>R = abc / 4S</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: skyC, marginTop: 4 }}>R ≈ {(R / (scale || 1)).toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: `${mintC}08`, borderRadius: 12, padding: "12px", border: `1px solid ${mintC}30` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: mintC, marginBottom: 6 }}>내접원 공식</div>
                    <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.8 }}>
                      <div>ID₁ = ID₂ = ID₃ = <b>r</b></div>
                      <div>r = S / s</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: mintC, marginTop: 4 }}>r ≈ {(rr / (scale || 1)).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <button onClick={() => { resetAll(); setBuildPhase("input"); setTriMode("sss"); }} style={{
                  width: "100%", marginTop: 12, padding: "12px", borderRadius: 12,
                  border: `1.5px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>다른 삼각형 그리기</button>
              </div>
            );
          }

          return null;
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
