// QuizScreen.jsx — 퀴즈 허브
// 담당: 이 채팅방 전담 파일
// 모드: 오늘의 문제, 스피드 퀴즈, OX 퀴즈, 복습 큐, 타임 퀴즈, 증명 빈칸 채우기

import { useState, useEffect, useMemo, useCallback } from "react";
import { GAME_DEFAULTS, getDueReviews } from "../GameConfig";
import {
  loadAllXPData, saveUserXP, grantXP, checkBadges,
  getActiveTimeQuiz, loadReviewQueue, saveReviewItem,
  loadQuizHistory, saveQuizResult, createDefaultXPData,
} from "../XPSystem";
import { SAMPLE_PROBLEMS } from "../data/quizProblems";


// ── 퀴즈 모드 정의 ──
const QUIZ_MODES = [
  { id: "daily", label: "오늘의 문제", icon: "📅", desc: "매일 1문제, 도전하면 XP!", color: "#F59E0B" },
  { id: "speed", label: "스피드 퀴즈", icon: "⚡", desc: `${GAME_DEFAULTS.quiz.speedQuizCount}문제 빠르게 풀기`, color: "#8B5CF6" },
  { id: "review", label: "복습 큐", icon: "🔄", desc: "틀린 문제 다시 풀기", color: "#10B981" },
  { id: "ox", label: "OX 퀴즈", icon: "⭕", desc: "참/거짓 빠른 판단", color: "#3B82F6" },
  { id: "time", label: "타임 퀴즈", icon: "🔥", desc: "XP 폭탄! 한정 시간", color: "#EF4444" },
];

// ── 유틸 ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

// ══════════════════════════════════════════
// ── 퀴즈 허브 (모드 선택) ──
// ══════════════════════════════════════════
function QuizHub({ theme, playSfx, setMode, activeTimeQuiz, reviewDueCount }) {
  return (
    <div style={{ padding: "0 16px 20px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {QUIZ_MODES.map(m => {
          const isTime = m.id === "time";
          const isReview = m.id === "review";
          const disabled = isTime && !activeTimeQuiz;

          return (
            <button key={m.id} disabled={disabled}
              onClick={() => { if (!disabled) { playSfx("click"); setMode(m.id); } }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 18px", borderRadius: 16,
                border: `1.5px solid ${disabled ? theme.border : m.color + "30"}`,
                background: isTime && activeTimeQuiz
                  ? `linear-gradient(135deg, ${m.color}15, ${m.color}08)`
                  : theme.card,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
                textAlign: "left", fontFamily: "'Noto Serif KR', serif",
                transition: "all .15s", position: "relative",
              }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${m.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{m.icon}</div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 2 }}>
                  {m.label}
                  {isTime && activeTimeQuiz && (
                    <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 800, marginLeft: 6 }}>
                      LIVE ×{activeTimeQuiz.multiplier}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.textSec }}>{m.desc}</div>
              </div>

              {/* Badge count for review */}
              {isReview && reviewDueCount > 0 && (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "#EF4444", color: "#fff",
                  fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>{reviewDueCount}</div>
              )}

              {/* Time quiz countdown */}
              {isTime && activeTimeQuiz && (
                <TimeCountdown expiresAt={activeTimeQuiz.expiresAt} theme={theme} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeCountdown({ expiresAt, theme }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div style={{ fontSize: 14, fontWeight: 800, color: "#EF4444", fontVariantNumeric: "tabular-nums" }}>
      {mins}:{String(secs).padStart(2, "0")}
    </div>
  );
}

// ══════════════════════════════════════════
// ── OX / 객관식 / 빈칸 공통 퀴즈 플레이어 ──
// ══════════════════════════════════════════
function QuizPlayer({ problems, theme, playSfx, onFinish, multiplier = 1, timeLimit = 0, modeName = "퀴즈" }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);    // OX: true/false, choice: index, fill: string
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [fillInput, setFillInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hintLevel, setHintLevel] = useState(0);      // 0: 없음, 1: 힌트1, 2: 힌트2, 3: 정답

  const problem = problems[idx];
  const isLast = idx >= problems.length - 1;
  const totalXPEarned = results.reduce((s, r) => s + r.xp, 0);

  // Timer
  useEffect(() => {
    if (timeLimit <= 0) return;
    setTimeLeft(timeLimit);
    const iv = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [timeLimit]);

  // Time's up
  useEffect(() => {
    if (timeLimit > 0 && timeLeft <= 0 && !revealed) {
      handleFinish(results);
    }
  }, [timeLeft]);

  const handleAnswer = (answer) => {
    if (revealed) return;
    setSelected(answer);
    setRevealed(true);

    let correct = false;
    if (problem.type === "ox") correct = answer === problem.answer;
    else if (problem.type === "choice") correct = answer === problem.answer;
    else if (problem.type === "fill_blank") {
      correct = answer.trim().replace(/\s/g, "") === problem.answer.replace(/\s/g, "");
    }

    const xpConfig = GAME_DEFAULTS.xp;
    let xp = correct ? xpConfig.quizCorrect : xpConfig.quizIncorrect;
    xp = Math.round(xp * multiplier);

    // Hint penalty
    if (hintLevel >= 1) xp += xpConfig.hintPenalty1;
    if (hintLevel >= 2) xp += xpConfig.hintPenalty2;
    if (hintLevel >= 3) xp += xpConfig.hintPenaltyAnswer;
    xp = Math.max(0, xp);

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);

    const result = {
      problemId: problem.id, correct, xp, hintUsed: hintLevel, timestamp: Date.now(),
    };
    setResults(prev => [...prev, result]);

    if (correct) playSfx("success");
    else playSfx("click");
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish([...results]);
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
    setFillInput("");
    setHintLevel(0);
  };

  const handleFinish = (finalResults) => {
    onFinish(finalResults || results);
  };

  // ── 결과 화면 ──
  if (results.length >= problems.length || (timeLimit > 0 && timeLeft <= 0)) {
    const correct = results.filter(r => r.correct).length;
    const total = problems.length;
    const answeredCount = results.length;
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {correct >= total * 0.8 ? "🎉" : correct >= total * 0.5 ? "👍" : "💪"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 8 }}>
          {modeName} 완료!
        </div>
        <div style={{ fontSize: 14, color: theme.textSec, marginBottom: 20, lineHeight: 1.6 }}>
          {answeredCount}문제 중 {correct}문제 정답
          {multiplier > 1 && <span style={{ color: "#EF4444", fontWeight: 700 }}> (×{multiplier} XP!)</span>}
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "12px 24px", borderRadius: 14,
          background: `${GAME_DEFAULTS.ranking.categories[0]?.color || "#F59E0B"}12`,
          fontSize: 18, fontWeight: 800, color: "#F59E0B",
        }}>
          +{totalXPEarned} XP
        </div>

        <div style={{ marginTop: 24 }}>
          <button onClick={() => onFinish(results)}
            style={{
              padding: "12px 32px", borderRadius: 12,
              background: theme.text, color: theme.bg,
              fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── 문제 풀기 화면 ──
  return (
    <div style={{ padding: "0 16px 20px" }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${theme.text}10` }}>
          <div style={{
            height: "100%", borderRadius: 2, transition: "width .3s",
            background: multiplier > 1 ? "#EF4444" : "#8B5CF6",
            width: `${((idx + 1) / problems.length) * 100}%`,
          }} />
        </div>
        <span style={{ fontSize: 12, color: theme.textSec, fontWeight: 600 }}>
          {idx + 1}/{problems.length}
        </span>
        {timeLimit > 0 && (
          <span style={{ fontSize: 13, fontWeight: 800, color: timeLeft < 30 ? "#EF4444" : theme.text, fontVariantNumeric: "tabular-nums" }}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Streak */}
      {streak >= 3 && (
        <div style={{
          textAlign: "center", fontSize: 12, color: "#F59E0B", fontWeight: 700,
          marginBottom: 10,
        }}>
          🔥 {streak}연속 정답!
        </div>
      )}

      {/* Question */}
      <div style={{
        padding: "20px 18px", borderRadius: 16,
        background: theme.card, border: `1px solid ${theme.border}`,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {problem.question}
        </div>
      </div>

      {/* Answer Area */}
      {problem.type === "ox" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[{ val: true, label: "⭕ O", color: "#3B82F6" }, { val: false, label: "✕ X", color: "#EF4444" }].map(opt => {
            const isSelected = selected === opt.val;
            const isCorrect = revealed && opt.val === problem.answer;
            const isWrong = revealed && isSelected && !isCorrect;

            return (
              <button key={String(opt.val)}
                onClick={() => handleAnswer(opt.val)}
                disabled={revealed}
                style={{
                  flex: 1, padding: "18px 0", borderRadius: 14, cursor: revealed ? "default" : "pointer",
                  fontSize: 20, fontWeight: 800,
                  border: `2px solid ${isCorrect ? "#10B981" : isWrong ? "#EF4444" : isSelected ? opt.color : theme.border}`,
                  background: isCorrect ? "#10B98115" : isWrong ? "#EF444415" : "transparent",
                  color: isCorrect ? "#10B981" : isWrong ? "#EF4444" : opt.color,
                  fontFamily: "'Noto Serif KR', serif", transition: "all .15s",
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {problem.type === "choice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {problem.choices.map((ch, i) => {
            const isSelected = selected === i;
            const isCorrect = revealed && i === problem.answer;
            const isWrong = revealed && isSelected && !isCorrect;

            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={revealed}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: `1.5px solid ${isCorrect ? "#10B981" : isWrong ? "#EF4444" : isSelected ? "#8B5CF6" : theme.border}`,
                  background: isCorrect ? "#10B98110" : isWrong ? "#EF444410" : theme.card,
                  color: isCorrect ? "#10B981" : isWrong ? "#EF4444" : theme.text,
                  fontSize: 13, fontWeight: 600, cursor: revealed ? "default" : "pointer",
                  fontFamily: "'Noto Serif KR', serif", transition: "all .15s",
                }}>
                {String.fromCharCode(9312 + i)} {ch}
              </button>
            );
          })}
        </div>
      )}

      {problem.type === "fill_blank" && !revealed && (
        <div style={{ marginBottom: 16 }}>
          <input
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && fillInput.trim()) handleAnswer(fillInput); }}
            placeholder="답을 입력하세요"
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, boxSizing: "border-box",
              border: `1.5px solid ${theme.border}`, background: theme.card,
              color: theme.text, fontSize: 15, fontWeight: 600,
              fontFamily: "'Noto Serif KR', serif", outline: "none",
            }}
          />
          <button onClick={() => { if (fillInput.trim()) handleAnswer(fillInput); }}
            style={{
              marginTop: 8, width: "100%", padding: "12px 0", borderRadius: 12,
              background: fillInput.trim() ? theme.text : `${theme.text}30`,
              color: theme.bg, fontSize: 14, fontWeight: 700,
              border: "none", cursor: fillInput.trim() ? "pointer" : "default",
              fontFamily: "'Noto Serif KR', serif",
            }}>
            제출
          </button>
        </div>
      )}

      {/* Explain (after answer) */}
      {revealed && (
        <div style={{
          padding: "14px 16px", borderRadius: 14, marginBottom: 16,
          background: selected === problem.answer || (problem.type === "fill_blank" && fillInput.trim().replace(/\s/g, "") === problem.answer.replace(/\s/g, ""))
            ? "#10B98110" : "#EF444410",
          border: `1px solid ${selected === problem.answer || (problem.type === "fill_blank" && fillInput.trim().replace(/\s/g, "") === problem.answer.replace(/\s/g, "")) ? "#10B98130" : "#EF444430"}`,
        }}>
          <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.7 }}>
            {problem.type === "fill_blank" && (
              <div style={{ fontWeight: 700, marginBottom: 4 }}>정답: {problem.answer}</div>
            )}
            {problem.explain}
          </div>
        </div>
      )}

      {/* AI Hint Button (before answer) */}
      {!revealed && GAME_DEFAULTS.features.aiHint && (
        <button onClick={() => setHintLevel(h => Math.min(h + 1, 3))}
          style={{
            padding: "8px 16px", borderRadius: 10,
            border: `1px solid ${theme.border}`, background: "transparent",
            color: theme.textSec, fontSize: 12, cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
          }}>
          💡 힌트 ({hintLevel}/3) {hintLevel > 0 && `(XP -${Math.abs(GAME_DEFAULTS.xp.hintPenalty1 * hintLevel)})`}
        </button>
      )}

      {/* Next button */}
      {revealed && (
        <button onClick={handleNext}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            background: theme.text, color: theme.bg,
            fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
          }}>
          {isLast ? "결과 보기" : "다음 문제 →"}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ── 메인 QuizScreen ──
// ══════════════════════════════════════════
function QuizScreenInner({ theme, user, setScreen, playSfx, showMsg, members }) {
  const [mode, setMode] = useState(null); // null = hub
  const [quizSession, setQuizSession] = useState(0);
  const [allXP, setAllXP] = useState(null);
  const [activeTimeQuiz, setActiveTimeQuiz] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAllXPData(),
      getActiveTimeQuiz(),
      user ? loadReviewQueue(user.id) : Promise.resolve([]),
    ]).then(([xp, tq, rq]) => {
      if (cancelled) return;
      setAllXP(xp);
      setActiveTimeQuiz(tq);
      setReviewQueue(rq);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const reviewDue = useMemo(() => getDueReviews(reviewQueue), [reviewQueue]);

  // 퀴즈 완료 처리
  const handleQuizFinish = useCallback(async (results) => {
    if (!user) { setMode(null); return; }

    const data = allXP || {};
    let userData = data[user.id] || createDefaultXPData(user.id);
    let totalEarned = 0;

    for (const r of results) {
      const { data: updated } = await grantXP(user.id, r.xp, r.correct ? "퀴즈 정답" : "퀴즈 시도", { [user.id]: userData });
      userData = updated;
      totalEarned += r.xp;

      // 통계 업데이트
      userData.stats.quizTotal = (userData.stats.quizTotal || 0) + 1;
      if (r.correct) userData.stats.quizCorrect = (userData.stats.quizCorrect || 0) + 1;
      userData.stats.quizCorrectRate = userData.stats.quizTotal > 0
        ? userData.stats.quizCorrect / userData.stats.quizTotal : 0;

      // 틀린 문제 → 복습 큐에 추가
      if (!r.correct) {
        await saveReviewItem(user.id, {
          problemId: r.problemId,
          lastReviewDate: null,
          reviewCount: 0,
          mastered: false,
        }, { [user.id]: reviewQueue });
      }
    }

    // 뱃지 체크
    const newBadges = checkBadges(userData);
    if (newBadges.length > 0) {
      userData.badges = [...(userData.badges || []), ...newBadges];
      showMsg(`🏅 새 뱃지 획득! (${newBadges.length}개)`, 2000);
    }

    // 저장
    await saveUserXP(user.id, userData, data);
    setAllXP({ ...data, [user.id]: userData });

    if (totalEarned > 0) {
      showMsg(`+${totalEarned} XP 획득!`, 1500);
    }

    setMode(null);
  }, [user, allXP, reviewQueue, showMsg]);

  // 퀴즈 문제 세트 생성
  const getProblems = (quizMode) => {
    switch (quizMode) {
      case "daily": {
        // 오늘의 문제: 날짜 기반 시드로 1문제 선택
        const dayIdx = new Date().getDate() % SAMPLE_PROBLEMS.length;
        return [SAMPLE_PROBLEMS[dayIdx]];
      }
      case "speed":
        return shuffle(SAMPLE_PROBLEMS).slice(0, GAME_DEFAULTS.quiz.speedQuizCount);
      case "ox":
        return shuffle(SAMPLE_PROBLEMS.filter(p => p.type === "ox")).slice(0, 8);
      case "time":
        return shuffle(SAMPLE_PROBLEMS).slice(0, 5);
      case "review":
        // 복습 큐에서 due인 문제들 매칭
        return reviewDue.length > 0
          ? reviewDue.slice(0, 5).map(r => SAMPLE_PROBLEMS.find(p => p.id === r.problemId)).filter(Boolean)
          : shuffle(SAMPLE_PROBLEMS).slice(0, 3); // fallback
      default:
        return shuffle(SAMPLE_PROBLEMS).slice(0, 5);
    }
  };

  return (
    <div style={{
      height: "100vh", maxHeight: "100dvh",
      display: "flex", flexDirection: "column",
      background: theme.bg, fontFamily: "'Noto Serif KR', serif",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        padding: "14px 20px", borderBottom: `1px solid ${theme.border}`,
      }}>
        <button onClick={() => {
          playSfx("click");
          if (mode) setMode(null);
          else setScreen("menu");
        }}
          style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer", fontFamily: "'Noto Serif KR', serif" }}>
          ← {mode ? "퀴즈 메뉴" : "메뉴"}
        </button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: theme.text }}>
          {mode ? QUIZ_MODES.find(m => m.id === mode)?.label || "퀴즈" : "⚡ 퀴즈"}
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: theme.textSec, fontSize: 13 }}>
            불러오는 중...
          </div>
        ) : !mode ? (
          <QuizHub
            theme={theme}
            playSfx={playSfx}
            setMode={(m) => { setMode(m); setQuizSession(Date.now()); }}
            activeTimeQuiz={activeTimeQuiz}
            reviewDueCount={reviewDue.length}
          />
        ) : (
          <QuizPlayer
            key={quizSession} // 모드 선택 시점에만 리셋 (Date.now()는 리렌더마다 바뀌어 위험)
            problems={getProblems(mode)}
            theme={theme}
            playSfx={playSfx}
            onFinish={handleQuizFinish}
            multiplier={mode === "time" && activeTimeQuiz ? activeTimeQuiz.multiplier : 1}
            timeLimit={mode === "speed" ? GAME_DEFAULTS.quiz.speedQuizTimeLimit : 0}
            modeName={QUIZ_MODES.find(m => m.id === mode)?.label || "퀴즈"}
          />
        )}
      </div>
    </div>
  );
}

export function renderQuizScreen(ctx) {
  return <QuizScreenInner {...ctx} />;
}
