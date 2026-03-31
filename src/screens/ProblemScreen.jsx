import { useState, useRef, useCallback } from "react";
import { PASTEL } from "../config";

const CMAP = { coral: PASTEL.coral, sky: PASTEL.sky, mint: PASTEL.mint, lavender: PASTEL.lavender };

// Clean up math symbols that don't render well on mobile
function cleanMathText(text) {
  if (!text) return text;
  return text.replace(/\u0305/g, "");
}

function FracSpan({ num, den, color }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 3px", lineHeight: 1.2 }}>
      <span style={{ fontSize: "0.85em", padding: "0 4px", color }}>{num}</span>
      <span style={{ width: "100%", height: 1.5, background: color || "currentColor", margin: "1px 0" }} />
      <span style={{ fontSize: "0.85em", padding: "0 4px", color }}>{den}</span>
    </span>
  );
}

function MathSpan({ children, highlightColor }) {
  if (!children) return null;
  const text = String(children);
  // First handle fractions
  const fracRegex = /\[frac\](.+?)\|(.+?)\[\/frac\]/g;
  const hasFrac = fracRegex.test(text);
  fracRegex.lastIndex = 0;
  
  if (hasFrac) {
    const parts = []; let last = 0; let fm;
    while ((fm = fracRegex.exec(text)) !== null) {
      if (fm.index > last) parts.push({ type: "text", val: text.slice(last, fm.index) });
      parts.push({ type: "frac", num: fm[1], den: fm[2] });
      last = fracRegex.lastIndex;
    }
    if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
    return <>{parts.map((p, i) =>
      p.type === "frac" ? <FracSpan key={i} num={p.num} den={p.den} color={highlightColor} /> :
      <MathInner key={i}>{p.val}</MathInner>
    )}</>;
  }
  return <MathInner>{text}</MathInner>;
}

function MathInner({ children }) {
  if (!children) return null;
  const text = String(children);
  const regex = /\[(seg|line|ray)\](.+?)\[\/\1\]/g;
  const parts = []; let last = 0; let mm;
  while ((mm = regex.exec(text)) !== null) {
    if (mm.index > last) parts.push({ type: "text", val: text.slice(last, mm.index) });
    parts.push({ type: mm[1], val: mm[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
  if (parts.length === 0) return <>{text}</>;
  return <>{parts.map((p, i) => {
    if (p.type === "seg") return <span key={i} style={{ textDecoration: "overline", textDecorationColor: "#D95F4B", textDecorationThickness: "2px", fontWeight: 600 }}>{p.val}</span>;
    if (p.type === "line") return <span key={i} style={{ textDecoration: "overline", textDecorationStyle: "double", fontWeight: 600 }}>{p.val}</span>;
    if (p.type === "ray") return <span key={i}><span style={{ textDecoration: "overline", textDecorationThickness: "2px", fontWeight: 600 }}>{p.val.charAt(0)}</span>{p.val.slice(1)}→</span>;
    return <span key={i}>{p.val}</span>;
  })}</>;
}

function FigureCanvas({ figure, theme, highlights = [] }) {
  if (!figure || figure.type === "none" || !figure.vertices?.length) return null;
  const verts = figure.vertices;
  const pad = 30;
  const xs = verts.map(v => v.x), ys = verts.map(v => v.y);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const w = maxX - minX, h = maxY - minY;
  return (
    <svg width="100%" viewBox={`${minX} ${minY} ${w} ${h}`}
      style={{ maxHeight: 180, borderRadius: 12, background: theme.svgBg || theme.bg, border: `1px solid ${theme.border}`, marginBottom: 8 }}>
      {(figure.edges || []).map((e, i) => {
        const from = verts.find(v => v.label === e.from), to = verts.find(v => v.label === e.to);
        if (!from || !to) return null;
        const isHl = highlights.includes(e.from + e.to) || highlights.includes(e.to + e.from);
        return <g key={i}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={isHl ? PASTEL.coral : theme.text} strokeWidth={isHl ? 3 : 2} />
          {e.label && <text x={(from.x+to.x)/2+5} y={(from.y+to.y)/2-5} fontSize={10} fill={isHl ? PASTEL.coral : theme.textSec}>{e.label}</text>}
        </g>;
      })}
      {(figure.angles || []).filter(a => a.isRight).map((a, i) => {
        const v = verts.find(vv => vv.label === a.vertex);
        return v ? <rect key={`r${i}`} x={v.x-6} y={v.y-6} width={10} height={10} fill="none" stroke={PASTEL.lavender} strokeWidth={1.2} /> : null;
      })}
      {verts.map((v, i) => {
        const isHl = highlights.some(h => h.includes(v.label));
        return <g key={i}>
          <circle cx={v.x} cy={v.y} r={isHl ? 4 : 3} fill={isHl ? PASTEL.coral : theme.text} />
          <text x={v.x+(v.x<(minX+w/2)?-14:8)} y={v.y+(v.y<(minY+h/2)?-8:14)} fontSize={12} fill={isHl ? PASTEL.coral : theme.text} fontWeight={700}>{v.label}</text>
        </g>;
      })}
    </svg>
  );
}

const CAT_ICON = { "조건": "📌", "관계": "🔗", "구하는것": "🎯", "공식힌트": "💡" };

export function ProblemScreenInner({ theme, setScreen, playSfx, showMsg, user, helpRequests, setHelpRequests, archive, setArchive, archiveDefaultPublic }) {
  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(-1); // -1=문제보기, 0~N=분석, N+1=식세우기
  const [helpMode, setHelpMode] = useState(null); // null|"select"|"deep"|"sent"
  const [helpStepIdx, setHelpStepIdx] = useState(null);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const handleImage = useCallback((e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const img = new Image();
    img.onload = () => {
      const mx = 1024; let w = img.width, h = img.height;
      if (w > mx || h > mx) { const s = mx / Math.max(w, h); w *= s; h *= s; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const full = c.toDataURL("image/jpeg", 0.85);
      setImagePreview(full); setImageData(full.split(",")[1]);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const analyze = async () => {
    if (!input.trim() && !imageData) { showMsg("문제를 입력하거나 사진을 올려주세요", 2000); return; }
    setLoading(true); setError(""); setResult(null); setCurrentStep(-1); setHelpMode(null);
    playSfx("click");
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() || undefined, imageBase64: imageData || undefined }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (data.problemText) setInput(data.problemText);
      setCurrentStep(-1);
      playSfx("success");
    } catch (e) { setError(e.message || "분석 실패"); playSfx("error"); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setInput(""); setImageData(null); setImagePreview(null);
    setResult(null); setError(""); setCurrentStep(-1);
    setHelpMode(null); setHelpStepIdx(null);
  };

  const saveToArchive = () => {
    if (!result || !setArchive) return;
    setArchive(prev => [...prev, {
      id: `prob-${Date.now()}`, type: "문제분석", title: result.type || "수학 문제",
      preview: (result.problemText || "").slice(0, 60),
      content: { problemText: result.problemText, steps: result.steps, equation: result.equation, figure: result.figure },
      createdAt: Date.now(), isPublic: archiveDefaultPublic || false, hidden: false, userId: user?.id,
    }]);
    playSfx("success"); showMsg("아카이브에 저장했어요! 📂", 2000);
  };

  const nextStep = () => {
    const maxS = (result?.steps?.length || 0);
    if (currentStep < maxS) {
      setCurrentStep(s => s + 1);
      setHelpMode(null); setHelpStepIdx(null);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
  };

  const prevStep = () => { if (currentStep >= 0) setCurrentStep(s => s - 1); setHelpMode(null); };

  // Send help request via Firestore
  const sendHelp = () => {
    // Save to archive too
    if (setArchive && result) {
      setArchive(prev => [...prev, {
        id: `q-${Date.now()}`, type: "질문", title: result.type || "수학 문제",
        preview: (result.problemText || input || "").slice(0, 60),
        content: { problemText: result.problemText, steps: result.steps, equation: result.equation },
        createdAt: Date.now(), isPublic: archiveDefaultPublic || false, hidden: false, userId: user?.id,
        isQuestion: true, helpStepIdx,
      }]);
    }
    try {
      const newReq = {
        id: `help-${Date.now()}`,
        userId: user?.id || "anonymous",
        userName: user?.name || "익명",
        timestamp: Date.now(),
        problemText: result?.problemText || input,
        type: result?.type || "",
        grade: result?.grade || "",
        stuckAtStep: helpStepIdx,
        stuckStepTitle: result?.steps?.[helpStepIdx]?.title || "",
        stuckStepExplain: result?.steps?.[helpStepIdx]?.explain || "",
        analysisResult: result,
        status: "pending",
      };
      setHelpRequests(prev => [...prev, newReq]);
      setHelpMode("sent"); playSfx("success");
    } catch (e) { showMsg("전달 실패: " + e.message, 2000); }
  };

  // Render highlighted problem text
  const renderProblemText = () => {
    const text = cleanMathText(result?.problemText || input);
    if (!text) return null;
    const steps = result?.steps || [];
    const activeSteps = steps.slice(0, Math.max(currentStep + 1, 0));

    let parts = [{ text, hl: false }];
    activeSteps.forEach((step, si) => {
      const next = [];
      parts.forEach(part => {
        if (part.hl) { next.push(part); return; }
        const idx = part.text.indexOf(step.highlight);
        if (idx >= 0) {
          if (idx > 0) next.push({ text: part.text.slice(0, idx), hl: false });
          next.push({ text: step.highlight, hl: true, color: CMAP[step.color] || PASTEL.coral, latest: si === activeSteps.length - 1 });
          const rest = part.text.slice(idx + step.highlight.length);
          if (rest) next.push({ text: rest, hl: false });
        } else next.push(part);
      });
      parts = next;
    });

    return (
      <div style={{ fontSize: 15, lineHeight: 2.4, color: theme.text, padding: "14px 18px", whiteSpace: "pre-line" }}>
        {parts.map((p, i) => p.hl ? (
          <span key={i} style={{
            background: `${p.color}${p.latest ? "35" : "18"}`,
            borderBottom: `2.5px solid ${p.color}`,
            padding: "2px 5px", borderRadius: 4,
            fontWeight: p.latest ? 700 : 500,
            transition: "all 0.3s",
          }}>{p.text}</span>
        ) : <span key={i}><MathSpan>{p.text}</MathSpan></span>)}
      </div>
    );
  };

  const maxStep = (result?.steps?.length || 0);
  const isLastStep = currentStep >= maxStep;
  const curStepData = currentStep >= 0 && currentStep < maxStep ? result.steps[currentStep] : null;
  const deepHelp = helpStepIdx !== null ? result?.deepHelp?.find(d => d.stepIndex === helpStepIdx) : null;

  const ist = { width: "100%", padding: "14px", borderRadius: 12, border: `1.5px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, fontFamily: "'Noto Serif KR', serif", resize: "vertical", boxSizing: "border-box" };
  const btnPrimary = { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}.pulse{animation:pulse 1.5s infinite}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => { playSfx("click"); result ? reset() : setScreen("study"); }}
          style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>
          ← {result ? "새 문제" : "복습하기"}
        </button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>
          문제의 문장 이해하기
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

        {/* ===== PHASE 1: Input ===== */}
        {!result && !loading && (
          <div style={{ padding: 20, animation: "fadeIn 0.4s ease" }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: "none" }} />

            {imagePreview ? (
              <div style={{ marginBottom: 12, position: "relative" }}>
                <img src={imagePreview} alt="" style={{ width: "100%", borderRadius: 14, border: `1px solid ${theme.border}` }} />
                <button onClick={() => { setImageData(null); setImagePreview(null); }}
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, background: "rgba(0,0,0,0.5)", border: "none", color: "white", fontSize: 14, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                width: "100%", padding: 24, borderRadius: 16, border: `2px dashed ${theme.border}`,
                background: theme.card, color: theme.text, fontSize: 14, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 12,
              }}>
                <span style={{ fontSize: 32 }}>📷</span>
                수학 문제 사진 촬영 / 업로드
                <span style={{ fontSize: 11, color: theme.textSec }}>사진을 찍으면 자동으로 문제를 읽어요</span>
              </button>
            )}

            <div style={{ position: "relative", marginBottom: 12 }}>
              <div style={{ textAlign: "center", fontSize: 11, color: theme.textSec, margin: "8px 0" }}>또는 직접 입력</div>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                placeholder="문제를 여기에 입력해도 돼요..."
                rows={3} style={ist} />
            </div>

            <button onClick={analyze} disabled={!input.trim() && !imageData}
              style={{ ...btnPrimary, opacity: (input.trim() || imageData) ? 1 : 0.4 }}>
              🔍 문제 분석하기
            </button>
            {error && <p style={{ fontSize: 12, color: PASTEL.coral, textAlign: "center", marginTop: 10 }}>{error}</p>}
          </div>
        )}

        {/* ===== Loading ===== */}
        {loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, padding: 40 }}>
            <div style={{ fontSize: 40 }} className="pulse">📖</div>
            <p style={{ fontSize: 14, color: theme.text, fontWeight: 700 }}>문제를 읽고 있어요...</p>
            <div style={{ width: 180, height: 4, borderRadius: 2, background: theme.border, overflow: "hidden" }}>
              <div className="pulse" style={{ width: "60%", height: "100%", borderRadius: 2, background: PASTEL.coral }} />
            </div>
          </div>
        )}

        {/* ===== PHASE 2: Analysis ===== */}
        {result && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Problem type badge */}
            <div style={{ padding: "12px 20px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: `${PASTEL.coral}12`, color: PASTEL.coral, fontWeight: 700 }}>{result.type}</span>
              <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: `${PASTEL.sky}12`, color: PASTEL.sky }}>{result.grade} · {result.chapter}</span>
            </div>

            {/* Problem text with highlights */}
            <div style={{ margin: "8px 12px", borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}` }}>
              {renderProblemText()}
              {result.figure && result.figure.type !== "none" && (
                <div style={{ padding: "0 14px 12px" }}>
                  <FigureCanvas figure={result.figure} theme={theme} highlights={curStepData?.figureHighlight || []} />
                </div>
              )}
            </div>

            {/* Step-by-step explanations */}
            {currentStep === -1 && (
              <div style={{ padding: "8px 20px 16px", textAlign: "center", animation: "fadeIn 0.3s ease" }}>
                <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 12 }}>문제를 한 문장씩 같이 읽어볼까요?</p>
                <button onClick={nextStep} style={btnPrimary}>시작하기 →</button>
              </div>
            )}

            {/* Current step explanation card */}
            {curStepData && (
              <div style={{ padding: "0 12px 8px", animation: "slideUp 0.4s ease" }}>
                <div style={{
                  borderRadius: 16, overflow: "hidden",
                  border: `2px solid ${CMAP[curStepData.color] || PASTEL.coral}`,
                  background: theme.card,
                }}>
                  <div style={{ padding: "12px 16px", background: `${CMAP[curStepData.color]}12`, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{CAT_ICON[curStepData.category] || "📌"}</span>
                    <div>
                      <div style={{ fontSize: 10, color: CMAP[curStepData.color], fontWeight: 700 }}>STEP {currentStep + 1}/{maxStep}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{curStepData.title}</div>
                    </div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{curStepData.explain}</div>
                    <button onClick={() => { setHelpStepIdx(currentStep); setHelpMode("deep"); }}
                      style={{ marginTop: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 11, cursor: "pointer" }}>
                      ❓ 이 부분이 이해 안 돼요
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Equation reveal (after all steps) */}
            {isLastStep && currentStep > 0 && (
              <div style={{ padding: "0 12px 8px", animation: "slideUp 0.4s ease" }}>
                <div style={{ borderRadius: 16, border: `2px solid ${PASTEL.mint}`, background: theme.card, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", background: `${PASTEL.mint}12` }}>
                    <div style={{ fontSize: 10, color: PASTEL.mint, fontWeight: 700 }}>✏️ 풀이 방향</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginTop: 4 }}>이제 식을 세워보자!</div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{
                      padding: "14px 18px", borderRadius: 12, background: theme.bg,
                      border: `1.5px solid ${PASTEL.coral}30`,
                      fontSize: 16, fontWeight: 700, color: theme.text, textAlign: "center",
                      fontFamily: "'Playfair Display', serif",
                    }}>{result.equation}</div>
                    <p style={{ fontSize: 12, color: theme.textSec, marginTop: 10, lineHeight: 1.8 }}>{result.direction}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            {currentStep >= 0 && (
              <div style={{ display: "flex", gap: 8, padding: "8px 12px" }}>
                <button onClick={prevStep} style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: `1px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 13, cursor: "pointer",
                }}>← 이전</button>
                {!isLastStep && (
                  <button onClick={nextStep} style={{
                    flex: 2, padding: "12px", borderRadius: 12, border: "none",
                    background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                    color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}>다음 →</button>
                )}
              </div>
            )}

            {/* Step progress dots */}
            {currentStep >= 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "6px 0" }}>
                {result.steps.map((_, i) => (
                  <div key={i} style={{
                    width: i === currentStep ? 16 : 6, height: 6, borderRadius: 3,
                    background: i <= currentStep ? PASTEL.coral : `${theme.textSec}30`,
                    transition: "all 0.3s",
                  }} />
                ))}
                <div style={{
                  width: isLastStep ? 16 : 6, height: 6, borderRadius: 3,
                  background: isLastStep ? PASTEL.mint : `${theme.textSec}30`,
                  transition: "all 0.3s",
                }} />
              </div>
            )}

            {/* Save/Close after final step */}
            {isLastStep && currentStep > 0 && !helpMode && (
              <div style={{ display: "flex", gap: 8, padding: "4px 12px 12px" }}>
                <button onClick={reset} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 12, cursor: "pointer" }}>닫기</button>
                <button onClick={saveToArchive} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📂 아카이브에 저장</button>
              </div>
            )}

            {/* ===== HELP FLOW ===== */}
            {currentStep >= 0 && !helpMode && (
              <div style={{ padding: "12px 20px 20px", textAlign: "center" }}>
                <button onClick={() => setHelpMode("select")} style={{
                  padding: "10px 20px", borderRadius: 12,
                  border: `1.5px solid ${theme.border}`, background: theme.card,
                  color: theme.textSec, fontSize: 12, cursor: "pointer",
                }}>😕 이해가 안 돼요</button>
              </div>
            )}

            {helpMode === "select" && (
              <div style={{ padding: "0 12px 16px", animation: "slideUp 0.3s ease" }}>
                <div style={{ borderRadius: 16, border: `1.5px solid ${PASTEL.sky}`, background: theme.card, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 10 }}>
                    어디서부터 이해가 안 됐어?
                  </p>
                  {result.steps.slice(0, currentStep + 1).map((step, i) => (
                    <button key={i} onClick={() => { setHelpStepIdx(i); setHelpMode("deep"); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "10px 14px", marginBottom: 6,
                        borderRadius: 12, border: `1.5px solid ${CMAP[step.color]}30`,
                        background: `${CMAP[step.color]}06`, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                      <span style={{ fontSize: 14 }}>{CAT_ICON[step.category] || "📌"}</span>
                      <div>
                        <div style={{ fontSize: 10, color: CMAP[step.color], fontWeight: 700 }}>STEP {i + 1}</div>
                        <div style={{ fontSize: 13, color: theme.text }}>{step.title}</div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setHelpMode(null)} style={{
                    width: "100%", padding: 8, marginTop: 4, borderRadius: 10,
                    border: "none", background: "transparent", color: theme.textSec, fontSize: 11, cursor: "pointer",
                  }}>괜찮아, 다시 읽어볼게</button>
                </div>
              </div>
            )}

            {helpMode === "deep" && deepHelp && (
              <div style={{ padding: "0 12px 16px", animation: "slideUp 0.3s ease" }}>
                <div style={{ borderRadius: 16, border: `2px solid ${PASTEL.lavender}`, background: theme.card, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", background: `${PASTEL.lavender}10` }}>
                    <div style={{ fontSize: 10, color: PASTEL.lavender, fontWeight: 700 }}>
                      💜 {deepHelp.prerequisiteGrade} · {deepHelp.prerequisite}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginTop: 4 }}>
                      먼저 이걸 알아야 해!
                    </div>
                  </div>
                  <div style={{ padding: "12px 16px", fontSize: 13, lineHeight: 2.2, color: theme.text }}>
                    {deepHelp.simpleExplain}
                  </div>

                  {/* 쉬운 예시 */}
                  {deepHelp.example && (
                    <div style={{ margin: "0 16px 12px", padding: "12px 14px", borderRadius: 12, background: `${PASTEL.mint}08`, border: `1px solid ${PASTEL.mint}25` }}>
                      <div style={{ fontSize: 11, color: PASTEL.mint, fontWeight: 700, marginBottom: 6 }}>🔢 쉬운 숫자로 해보면</div>
                      <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{deepHelp.example}</div>
                    </div>
                  )}

                  {/* 일상 비유 */}
                  {deepHelp.analogy && (
                    <div style={{ margin: "0 16px 12px", padding: "12px 14px", borderRadius: 12, background: `${PASTEL.sky}08`, border: `1px solid ${PASTEL.sky}25` }}>
                      <div style={{ fontSize: 11, color: PASTEL.sky, fontWeight: 700, marginBottom: 6 }}>🌍 이렇게 생각해봐</div>
                      <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{deepHelp.analogy}</div>
                    </div>
                  )}

                  <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
                    <button onClick={() => { setHelpMode(null); setHelpStepIdx(null); }}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 12, cursor: "pointer" }}>
                      이해했어!
                    </button>
                    <button onClick={() => setHelpMode("ask")}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: `${PASTEL.coral}15`, color: PASTEL.coral, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      그래도 모르겠어 😢
                    </button>
                  </div>
                </div>
              </div>
            )}

            {helpMode === "deep" && !deepHelp && (
              <div style={{ padding: "0 12px 16px", animation: "slideUp 0.3s ease" }}>
                <div style={{ padding: 16, borderRadius: 16, background: theme.card, border: `1.5px solid ${theme.border}`, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: theme.text }}>이 부분은 추가 설명이 준비되지 않았어요.</p>
                  <button onClick={() => setHelpMode("ask")} style={{
                    marginTop: 10, padding: "10px 20px", borderRadius: 10, border: "none",
                    background: `${PASTEL.coral}15`, color: PASTEL.coral, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>선생님께 물어볼래요</button>
                </div>
              </div>
            )}

            {helpMode === "ask" && (
              <div style={{ padding: "0 12px 20px", animation: "slideUp 0.3s ease" }}>
                <div style={{ padding: 20, borderRadius: 16, background: theme.card, border: `2px solid ${PASTEL.coral}`, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🙋</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 4 }}>선생님께 전달해둘까요?</p>
                  <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 14 }}>
                    어떤 문제를 풀다가, 어디서 막혔는지<br />선생님이 확인할 수 있어요
                  </p>
                  <button onClick={sendHelp} style={{
                    ...btnPrimary, background: PASTEL.coral, marginBottom: 8,
                  }}>📨 선생님께 전달하기</button>
                  <button onClick={() => { setHelpMode(null); setHelpStepIdx(null); }}
                    style={{ width: "100%", padding: 8, border: "none", background: "transparent", color: theme.textSec, fontSize: 11, cursor: "pointer" }}>
                    아니야, 다시 해볼게
                  </button>
                </div>
              </div>
            )}

            {helpMode === "sent" && (
              <div style={{ padding: "0 12px 20px", animation: "slideUp 0.3s ease" }}>
                <div style={{ padding: 20, borderRadius: 16, background: `${PASTEL.mint}08`, border: `1.5px solid ${PASTEL.mint}`, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: PASTEL.mint }}>선생님께 전달했어요!</p>
                  <p style={{ fontSize: 11, color: theme.textSec, marginTop: 4 }}>
                    선생님이 확인하면 풀이를 보내줄 거예요
                  </p>
                  <button onClick={reset} style={{
                    marginTop: 14, padding: "10px 24px", borderRadius: 12,
                    border: `1px solid ${theme.border}`, background: theme.card,
                    color: theme.text, fontSize: 12, cursor: "pointer",
                  }}>다른 문제 풀기</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function renderProblemScreen(ctx) {
  const { archive, setArchive, theme, setScreen, playSfx, showMsg, user, helpRequests, setHelpRequests } = ctx;
  return <ProblemScreenInner theme={theme} setScreen={setScreen} playSfx={playSfx} showMsg={showMsg} user={user} helpRequests={helpRequests} setHelpRequests={setHelpRequests} archive={archive} setArchive={setArchive} archiveDefaultPublic={ctx.archiveDefaultPublic} />;
}
