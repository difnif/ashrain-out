import { useState, useEffect, useRef, useCallback } from "react";
import { PASTEL } from "../config";

/**
 * TutorialOverlay — 오버레이 튜토리얼 엔진
 * 
 * 사용법:
 * 1. TUTORIALS 객체에 튜토리얼 정의
 * 2. <TutorialOverlay tutorialId="draw-first" ... /> 렌더
 * 3. 완료 시 localStorage에 기록 → 다시 안 뜸
 * 
 * step 형식:
 * {
 *   target: "#element-id" 또는 "[data-tut='name']",  // 강조할 요소 (없으면 화면 중앙)
 *   text: "설명 텍스트",
 *   title: "제목" (optional),
 *   position: "top" | "bottom" | "left" | "right" | "center",
 *   highlight: true | false,   // 요소 주변 spotlight
 *   action: "click" | "swipe" | null,  // 사용자가 해야 할 액션 힌트
 *   delay: 500,  // 표시 전 딜레이 ms (optional)
 * }
 */

// ===== 튜토리얼 정의 (나중에 내용 채우기) =====
export const TUTORIALS = {
  "welcome": {
    name: "처음 방문",
    steps: [
      { text: "ashrain.out에 오신 걸 환영해요! 👋\n간단히 사용법을 알려드릴게요.", position: "center", title: "환영합니다!" },
      { text: "여기서 다양한 학습 도구를\n이용할 수 있어요.", position: "center", title: "메인 메뉴" },
    ],
  },
  "draw-first": {
    name: "그려서 공부하기",
    steps: [
      // 나중에 채울 것
      { text: "세 변의 길이를 입력하면\n삼각형이 그려져요!", position: "center", title: "삼각형 그리기" },
    ],
  },
  "problem-first": {
    name: "문제 분석",
    steps: [
      { text: "수학 문제 사진을 찍거나\n직접 입력할 수 있어요.", position: "center", title: "문제 분석" },
    ],
  },
  "student-home": {
    name: "학생 홈",
    steps: [
      { text: "아래 탭으로 아카이브, 다이어리,\n숙제, 설정을 이용할 수 있어요.", position: "center", title: "학생 홈 화면" },
    ],
  },
};

// ===== Spotlight + Arrow + Tooltip 렌더러 =====
function Spotlight({ rect, padding = 8 }) {
  if (!rect) return null;
  const p = padding;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10000 }}>
      {/* Dark overlay with cutout */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={rect.left - p} y={rect.top - p} width={rect.width + p * 2} height={rect.height + p * 2} rx={12} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#spotlight-mask)" />
      </svg>
      {/* Highlight border */}
      <div style={{
        position: "absolute", left: rect.left - p, top: rect.top - p,
        width: rect.width + p * 2, height: rect.height + p * 2,
        borderRadius: 12, border: `2px solid ${PASTEL.coral}`,
        boxShadow: `0 0 20px ${PASTEL.coral}40, 0 0 40px ${PASTEL.coral}20`,
        pointerEvents: "none", animation: "tutPulse 2s infinite",
      }} />
    </div>
  );
}

function Arrow({ from, to, color = PASTEL.coral }) {
  if (!from || !to) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const len = Math.sqrt(dx * dx + dy * dy);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10001 }}>
      <defs>
        <marker id="tut-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={color} strokeWidth={2} strokeDasharray="6,4" markerEnd="url(#tut-arrow)" />
    </svg>
  );
}

function Tooltip({ text, title, position, targetRect, onNext, onSkip, stepNum, totalSteps, theme, actionHint }) {
  const style = { position: "absolute", zIndex: 10002, maxWidth: 300, width: "85vw" };

  if (!targetRect || position === "center") {
    style.top = "50%"; style.left = "50%";
    style.transform = "translate(-50%, -50%)";
  } else if (position === "bottom") {
    style.top = targetRect.bottom + 16; style.left = targetRect.left + targetRect.width / 2;
    style.transform = "translateX(-50%)";
  } else if (position === "top") {
    style.bottom = window.innerHeight - targetRect.top + 16;
    style.left = targetRect.left + targetRect.width / 2;
    style.transform = "translateX(-50%)";
  } else if (position === "left") {
    style.top = targetRect.top + targetRect.height / 2;
    style.right = window.innerWidth - targetRect.left + 16;
    style.transform = "translateY(-50%)";
  } else if (position === "right") {
    style.top = targetRect.top + targetRect.height / 2;
    style.left = targetRect.right + 16;
    style.transform = "translateY(-50%)";
  }

  return (
    <div style={style}>
      <div style={{
        background: theme.card, borderRadius: 20, padding: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)", border: `1px solid ${theme.border}`,
        animation: "tutFadeIn 0.3s ease",
      }}>
        {title && <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{title}</div>}
        <div style={{ fontSize: 13, lineHeight: 2, color: theme.text, whiteSpace: "pre-line" }}>{text}</div>

        {actionHint && (
          <div style={{ marginTop: 8, fontSize: 11, color: PASTEL.sky, display: "flex", alignItems: "center", gap: 4 }}>
            {actionHint === "click" && "👆 터치해보세요"}
            {actionHint === "swipe" && "👈 스와이프해보세요"}
            {actionHint === "type" && "⌨️ 입력해보세요"}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 11, cursor: "pointer" }}>건너뛰기</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i} style={{
                  width: i === stepNum ? 12 : 6, height: 6, borderRadius: 3,
                  background: i <= stepNum ? PASTEL.coral : `${theme.textSec}30`,
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button onClick={onNext} style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: stepNum === totalSteps - 1 ? PASTEL.mint : PASTEL.coral,
              color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              {stepNum === totalSteps - 1 ? "완료!" : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 메인 TutorialOverlay 컴포넌트 =====
export function TutorialOverlay({ tutorialId, theme, onComplete }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const tutorial = TUTORIALS[tutorialId];

  useEffect(() => {
    if (!tutorial) return;
    // Check if already completed
    const done = localStorage.getItem(`tut_done_${tutorialId}`);
    if (done) { onComplete?.(); return; }
    // Delay first show
    const timer = setTimeout(() => setVisible(true), tutorial.steps[0]?.delay || 500);
    return () => clearTimeout(timer);
  }, [tutorialId]);

  useEffect(() => {
    if (!visible || !tutorial) return;
    const s = tutorial.steps[step];
    if (!s?.target) { setTargetRect(null); return; }
    const el = document.querySelector(s.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step, visible]);

  const next = useCallback(() => {
    if (step < tutorial.steps.length - 1) {
      const nextDelay = tutorial.steps[step + 1]?.delay || 0;
      if (nextDelay) {
        setVisible(false);
        setTimeout(() => { setStep(s => s + 1); setVisible(true); }, nextDelay);
      } else {
        setStep(s => s + 1);
      }
    } else {
      // Complete
      localStorage.setItem(`tut_done_${tutorialId}`, Date.now().toString());
      setVisible(false);
      onComplete?.();
    }
  }, [step, tutorial, tutorialId, onComplete]);

  const skip = useCallback(() => {
    localStorage.setItem(`tut_done_${tutorialId}`, Date.now().toString());
    setVisible(false);
    onComplete?.();
  }, [tutorialId, onComplete]);

  if (!visible || !tutorial || step >= tutorial.steps.length) return null;

  const s = tutorial.steps[step];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
      <style>{`
        @keyframes tutPulse { 0%,100% { box-shadow: 0 0 20px ${PASTEL.coral}40; } 50% { box-shadow: 0 0 30px ${PASTEL.coral}60, 0 0 60px ${PASTEL.coral}30; } }
        @keyframes tutFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Dark overlay / Spotlight */}
      {s.highlight && targetRect ? (
        <Spotlight rect={targetRect} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000 }} onClick={next} />
      )}

      {/* Arrow from tooltip to target */}
      {targetRect && s.position !== "center" && (
        <Arrow from={{
          x: window.innerWidth / 2,
          y: s.position === "bottom" ? targetRect.bottom + 8 : s.position === "top" ? targetRect.top - 8 : targetRect.top + targetRect.height / 2
        }} to={{
          x: targetRect.left + targetRect.width / 2,
          y: s.position === "bottom" ? targetRect.bottom : s.position === "top" ? targetRect.top : targetRect.top + targetRect.height / 2
        }} />
      )}

      {/* Tooltip */}
      <Tooltip
        text={s.text} title={s.title}
        position={s.position || "center"}
        targetRect={targetRect}
        onNext={next} onSkip={skip}
        stepNum={step} totalSteps={tutorial.steps.length}
        theme={theme}
        actionHint={s.action}
      />
    </div>
  );
}

// ===== Hook: 튜토리얼 트리거 =====
export function useTutorial() {
  const [activeTutorial, setActiveTutorial] = useState(null);

  const trigger = useCallback((tutorialId) => {
    const done = localStorage.getItem(`tut_done_${tutorialId}`);
    if (!done && TUTORIALS[tutorialId]) {
      setActiveTutorial(tutorialId);
    }
  }, []);

  const reset = useCallback((tutorialId) => {
    localStorage.removeItem(`tut_done_${tutorialId}`);
  }, []);

  const resetAll = useCallback(() => {
    Object.keys(TUTORIALS).forEach(id => localStorage.removeItem(`tut_done_${id}`));
  }, []);

  return { activeTutorial, setActiveTutorial, trigger, reset, resetAll };
}
