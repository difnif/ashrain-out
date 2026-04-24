// QuizScreen.jsx — 퀴즈 허브
// 담당: 이 채팅방 전담 파일
// 모드: 오늘의 문제, 스피드 퀴즈, OX 퀴즈, 복습 큐, 타임 퀴즈
//
// 스피드 퀴즈 설계:
//   - 초기 30초, 정답 시 +30초
//   - 답 제출 전에는 다음 문제로 넘어갈 수 없음
//   - 남은 시간 ≥ 120초 : 어려운 문제(slow) 출제
//   - 남은 시간 < 120초 : 빠른 문제(fast) 출제
//   - 시간 0 → 결과 (정답 수만 표시, XP 미적용)
//
// 수식 태그: [seg][exp][frac][rep] → QuizMathText로 렌더
// 도형: problem.figure 지정 시 QuizFigure로 렌더

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { GAME_DEFAULTS, getDueReviews } from "../GameConfig";
import {
  loadAllXPData, saveUserXP, grantXP, checkBadges,
  getActiveTimeQuiz, loadReviewQueue, saveReviewItem,
  loadQuizHistory, saveQuizResult, createDefaultXPData,
} from "../XPSystem";
import { fbGet, fbSet, fbListen } from "../firebase";
import { SAMPLE_PROBLEMS } from "../data/quizProblems";
import QuizMathText from "../components/QuizMathText";
import QuizFigure from "../components/QuizFigure";


// ── 퀴즈 모드 정의 ──
const QUIZ_MODES = [
  { id: "daily", label: "오늘의 문제", icon: "📅", desc: "매일 1문제, 도전하면 XP!", color: "#F59E0B" },
  { id: "speed", label: "스피드 퀴즈", icon: "⚡", desc: "정답 +30초 / 오답 −40초", color: "#8B5CF6" },
  { id: "review", label: "복습 큐", icon: "🔄", desc: "틀린 문제 다시 풀기", color: "#10B981" },
  { id: "ox", label: "OX 퀴즈", icon: "⭕", desc: "참/거짓 빠른 판단", color: "#3B82F6" },
  { id: "time", label: "타임 퀴즈", icon: "🔥", desc: "XP 폭탄! 한정 시간", color: "#EF4444" },
];

// 스피드 퀴즈 타이머 설정
const SPEED_INITIAL_SEC = 30;
const SPEED_BONUS_SEC = 30;
const SPEED_PENALTY_SEC = 40; // 오답 시 차감. 시간이 0 이하 도달 시 즉시 종료.
const CLEAR_THRESHOLD_SEC = 440; // 7분 20초 초과 시 자동 클리어
// 3단계 난이도 구간 (남은 시간 기준)
//   < SLOW_THRESHOLD         → fast 풀
//   SLOW_THRESHOLD ~ HARD_THRESHOLD → slow 풀
//   ≥ HARD_THRESHOLD         → hard 풀
const SLOW_THRESHOLD_SEC = 120;
const HARD_THRESHOLD_SEC = 240;

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

// fill_blank 정답 비교 (공백 제거, 대소문자 구분)
function matchesFillBlank(input, answer) {
  return String(input).trim().replace(/\s/g, "") === String(answer).replace(/\s/g, "");
}

// ══════════════════════════════════════════
// ── 퀴즈 허브 (모드 선택) ──
// ══════════════════════════════════════════
function QuizHub({ theme, playSfx, setMode, activeTimeQuiz, reviewDueCount, currentUser }) {
  return (
    <div style={{ padding: "0 16px 20px" }}>
      {/* 스피드 퀴즈 명예의 전당 */}
      <ClearLeaderboard theme={theme} currentUser={currentUser} />

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
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${m.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{m.icon}</div>

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

              {isReview && reviewDueCount > 0 && (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "#EF4444", color: "#fff",
                  fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>{reviewDueCount}</div>
              )}

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

// ══════════════════════════════════════════
// ── 스피드 퀴즈 명예의 전당 (클리어 랭킹) ──
// Firestore "quiz-clears" 문서 실시간 구독
// 정렬: clearCount 내림차순 → bestCorrect 내림차순
// ══════════════════════════════════════════
function ClearLeaderboard({ theme, currentUser }) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = fbListen("quiz-clears", (data) => {
      const list = data
        ? Object.values(data).filter(e => e && e.userId)
        : [];
      list.sort((a, b) => {
        if (b.clearCount !== a.clearCount) return b.clearCount - a.clearCount;
        return b.bestCorrect - a.bestCorrect;
      });
      setEntries(list);
      setLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  // 클리어 0인 사람은 랭킹에서 제외, 전체 0이면 초대 문구
  const ranked = entries.filter(e => e.clearCount > 0);
  const topN = ranked.slice(0, 5);

  if (!loaded) return null;
  if (ranked.length === 0) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: 14, marginBottom: 14,
        background: "linear-gradient(135deg, #FEF3C712, #FDE68A10)",
        border: `1px dashed #EAB30840`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>🏆</div>
        <div style={{ fontSize: 12, color: theme.textSec, lineHeight: 1.6 }}>
          스피드 퀴즈 7분 20초 돌파!
          <br />
          첫 클리어의 주인공이 되어 보세요
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 14, marginBottom: 14,
      background: "linear-gradient(135deg, #FEF3C715, #FDE68A08)",
      border: `1px solid #EAB30830`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      }}>
        <span style={{ fontSize: 14 }}>🏆</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>
          스피드 퀴즈 명예의 전당
        </span>
        <span style={{ fontSize: 10, color: theme.textSec, marginLeft: "auto" }}>
          TOP {topN.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {topN.map((e, i) => {
          const isMe = currentUser && e.userId === currentUser.id;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
          return (
            <div key={e.userId}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 8,
                background: isMe ? "#EAB30818" : "transparent",
                border: isMe ? "1px solid #EAB30840" : "1px solid transparent",
              }}>
              <div style={{
                width: 22, textAlign: "center",
                fontSize: i < 3 ? 14 : 11,
                fontWeight: 700,
                color: i < 3 ? undefined : theme.textSec,
              }}>{medal}</div>
              <div style={{
                flex: 1, fontSize: 12, fontWeight: isMe ? 800 : 600,
                color: theme.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {e.name}{isMe && <span style={{ fontSize: 10, color: "#EAB308", marginLeft: 4 }}>· 나</span>}
              </div>
              <div style={{ fontSize: 11, color: theme.textSec, fontVariantNumeric: "tabular-nums" }}>
                {e.clearCount}회
              </div>
              <div style={{
                fontSize: 10, color: "#10B981", fontWeight: 700,
                minWidth: 42, textAlign: "right",
              }}>
                ✓{e.bestCorrect}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeCountdown({ expiresAt, theme }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000);
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
// ── 공통: 문제 본문 렌더 (수식 + 도형) ──
// ══════════════════════════════════════════
function ProblemBody({ problem, theme }) {
  return (
    <div style={{
      padding: "20px 18px", borderRadius: 16,
      background: theme.card, border: `1px solid ${theme.border}`,
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 15, fontWeight: 600, color: theme.text,
        lineHeight: 1.9, whiteSpace: "pre-wrap",
      }}>
        <QuizMathText highlightColor="#D95F4B">{problem.question}</QuizMathText>
      </div>
      {problem.figure && <QuizFigure name={problem.figure} theme={theme} />}
    </div>
  );
}

// ══════════════════════════════════════════
// ── OX / 객관식 / 빈칸 응답 UI ──
// ══════════════════════════════════════════
function AnswerArea({ problem, revealed, selected, fillInput, setFillInput, onAnswer, theme }) {
  if (problem.type === "ox") {
    return (
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ val: true, label: "⭕ O", color: "#3B82F6" }, { val: false, label: "✕ X", color: "#EF4444" }].map(opt => {
          const isSelected = selected === opt.val;
          const isCorrect = revealed && opt.val === problem.answer;
          const isWrong = revealed && isSelected && !isCorrect;
          return (
            <button key={String(opt.val)}
              onClick={() => onAnswer(opt.val)}
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
    );
  }

  if (problem.type === "choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {problem.choices.map((ch, i) => {
          const isSelected = selected === i;
          const isCorrect = revealed && i === problem.answer;
          const isWrong = revealed && isSelected && !isCorrect;
          return (
            <button key={i} onClick={() => onAnswer(i)} disabled={revealed}
              style={{
                padding: "14px 16px", borderRadius: 12, textAlign: "left",
                border: `1.5px solid ${isCorrect ? "#10B981" : isWrong ? "#EF4444" : isSelected ? "#8B5CF6" : theme.border}`,
                background: isCorrect ? "#10B98110" : isWrong ? "#EF444410" : theme.card,
                color: isCorrect ? "#10B981" : isWrong ? "#EF4444" : theme.text,
                fontSize: 14, fontWeight: 600, cursor: revealed ? "default" : "pointer",
                fontFamily: "'Noto Serif KR', serif", transition: "all .15s",
                lineHeight: 1.6,
              }}>
              <span style={{ marginRight: 6 }}>{String.fromCharCode(9312 + i)}</span>
              <QuizMathText>{ch}</QuizMathText>
            </button>
          );
        })}
      </div>
    );
  }

  // fill_blank
  if (!revealed) {
    return (
      <div style={{ marginBottom: 16 }}>
        <input
          value={fillInput}
          onChange={(e) => setFillInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && fillInput.trim()) onAnswer(fillInput); }}
          placeholder="답을 입력하세요"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, boxSizing: "border-box",
            border: `1.5px solid ${theme.border}`, background: theme.card,
            color: theme.text, fontSize: 15, fontWeight: 600,
            fontFamily: "'Noto Serif KR', serif", outline: "none",
          }}
        />
        <button onClick={() => { if (fillInput.trim()) onAnswer(fillInput); }}
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
    );
  }
  return null;
}

// ══════════════════════════════════════════
// ── 해설 표시 ──
// ══════════════════════════════════════════
function Explanation({ problem, selected, fillInput, theme }) {
  const isCorrect = problem.type === "fill_blank"
    ? matchesFillBlank(fillInput, problem.answer)
    : selected === problem.answer;
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14, marginBottom: 16,
      background: isCorrect ? "#10B98110" : "#EF444410",
      border: `1px solid ${isCorrect ? "#10B98130" : "#EF444430"}`,
    }}>
      <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.8 }}>
        {problem.type === "fill_blank" && (
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            정답: <QuizMathText>{problem.answer}</QuizMathText>
          </div>
        )}
        <QuizMathText>{problem.explain}</QuizMathText>
      </div>
    </div>
  );
}

// 결과 화면용 통계 카드
function StatCard({ label, value, color, bg }) {
  return (
    <div style={{
      flex: 1, padding: "14px 8px", borderRadius: 12,
      background: bg,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    }}>
      <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// ══════════════════════════════════════════
// ── [1] SpeedQuizPlayer — 스피드 퀴즈 전용 ──
// ══════════════════════════════════════════
function SpeedQuizPlayer({ theme, playSfx, onFinish }) {
  // 풀 분리
  const pools = useMemo(() => {
    const fast = SAMPLE_PROBLEMS.filter(p => p.difficulty === "fast");
    const slow = SAMPLE_PROBLEMS.filter(p => p.difficulty === "slow");
    const hard = SAMPLE_PROBLEMS.filter(p => p.difficulty === "hard");
    return { fast: shuffle(fast), slow: shuffle(slow), hard: shuffle(hard) };
  }, []);

  // 풀 인덱스는 ref로 관리 (리렌더 영향 없이 소모)
  const fastIdxRef = useRef(0);
  const slowIdxRef = useRef(0);
  const hardIdxRef = useRef(0);
  const timeLeftRef = useRef(SPEED_INITIAL_SEC);

  // 상태
  const [currentProblem, setCurrentProblem] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [fillInput, setFillInput] = useState("");
  const [results, setResults] = useState([]); // {problemId, correct}[]
  const [timeLeft, setTimeLeft] = useState(SPEED_INITIAL_SEC);
  const [finished, setFinished] = useState(false);
  const [cleared, setCleared] = useState(false); // 440초 초과 달성
  const [pendingFinish, setPendingFinish] = useState(false); // 오답 페널티로 시간 소진, 해설 본 뒤 종료 예정
  const [streak, setStreak] = useState(0);
  // 시각 이펙트용 펄스 상태
  const [pulse, setPulse] = useState(null); // { kind: "correct" | "wrong", ts }

  // timeLeft 동기화 → ref
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // 다음 문제 pull (남은 시간 기준)
  // 1순위: 현재 구간에 맞는 풀
  // 2순위: 한 단계 낮은 풀 (예: hard 소진 시 slow)
  // 3순위: 그 아래 풀 (fast)
  const pullNextProblem = useCallback(() => {
    const t = timeLeftRef.current;

    // 구간별 우선순위 배열 [풀 이름 순서]
    let priority;
    if (t >= HARD_THRESHOLD_SEC) {
      priority = ["hard", "slow", "fast"];
    } else if (t >= SLOW_THRESHOLD_SEC) {
      priority = ["slow", "fast", "hard"];
    } else {
      priority = ["fast", "slow", "hard"];
    }

    const refMap = { fast: fastIdxRef, slow: slowIdxRef, hard: hardIdxRef };
    for (const kind of priority) {
      const ref = refMap[kind];
      const pool = pools[kind];
      if (ref.current < pool.length) {
        return pool[ref.current++];
      }
    }
    return null; // 모든 풀 소진
  }, [pools]);

  // 초기 문제 로드
  useEffect(() => {
    if (!currentProblem && !finished) {
      const first = pullNextProblem();
      if (first) setCurrentProblem(first);
      else setFinished(true);
    }
  }, [currentProblem, finished, pullNextProblem]);

  // 타이머: 제출 전(!revealed)이고 종료 안 됐을 때만 카운트다운.
  // 해설 읽는 동안엔 시간 멈춤 (공정한 학습 시간).
  useEffect(() => {
    if (finished || revealed) return;
    const iv = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(iv);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [finished, revealed]);

  // 시간 0 → 종료
  // 시간 0 → 자동 종료 (단, 해설 보는 중이면 대기 — '다음' 버튼 누를 때 종료)
  useEffect(() => {
    if (timeLeft <= 0 && !finished && !revealed) {
      setFinished(true);
    }
    // revealed=true 이면 pendingFinish가 이미 설정되어 있거나 (오답 페널티 케이스)
    // 자연 카운트다운으로 0 도달 시엔 해설이 표시되어 있지 않을 것이므로
    // !revealed 조건만으로 충분
  }, [timeLeft, finished, revealed]);

  // 답 제출
  const handleAnswer = (answer) => {
    if (revealed || !currentProblem) return;
    setSelected(answer);
    setRevealed(true);

    let correct = false;
    if (currentProblem.type === "ox") correct = answer === currentProblem.answer;
    else if (currentProblem.type === "choice") correct = answer === currentProblem.answer;
    else if (currentProblem.type === "fill_blank") correct = matchesFillBlank(answer, currentProblem.answer);

    setResults(prev => [...prev, { problemId: currentProblem.id, correct }]);
    setStreak(s => correct ? s + 1 : 0);

    if (correct) {
      // 정답 보너스: +30초. 440초 초과 시 자동 클리어.
      setTimeLeft(t => {
        const next = t + SPEED_BONUS_SEC;
        if (next > CLEAR_THRESHOLD_SEC) {
          // 해설 보고 '클리어!' 버튼 누르면 종료
          setCleared(true);
          setPendingFinish(true);
        }
        return next;
      });
      setPulse({ kind: "correct", ts: Date.now() });
      playSfx("success");
    } else {
      // 오답 페널티: -40초. 결과 0 이하면 해설 본 후 종료 예정으로 표시.
      playSfx("click");
      setPulse({ kind: "wrong", ts: Date.now() });
      setTimeLeft(t => {
        const next = t - SPEED_PENALTY_SEC;
        if (next <= 0) {
          setPendingFinish(true); // 다음 버튼이 '종료'로 변경됨
          return 0;
        }
        return next;
      });
    }
  };

  // 다음 문제로 (또는 페널티로 종료 예정이면 종료)
  const handleNext = () => {
    if (pendingFinish) {
      setFinished(true);
      return;
    }
    const next = pullNextProblem();
    if (!next) {
      setFinished(true);
      return;
    }
    setCurrentProblem(next);
    setSelected(null);
    setRevealed(false);
    setFillInput("");
  };

  // ── 결과 화면 ──
  if (finished) {
    const correct = results.filter(r => r.correct).length;
    const total = results.length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // cleared: 440초 돌파한 클리어 케이스
    // !cleared: 시간 소진 (0초 도달)

    return (
      <div style={{
        padding: "40px 20px", textAlign: "center",
        background: cleared
          ? "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 50%, #F59E0B 100%)"
          : "transparent",
        borderRadius: cleared ? 24 : 0,
        margin: cleared ? "20px 12px" : 0,
        animation: cleared ? "clearFlash 0.6s ease-out" : undefined,
      }}>
        {/* 아이콘 & 제목 */}
        <div style={{ fontSize: cleared ? 72 : 48, marginBottom: 16 }}>
          {cleared ? "🏆" : rate >= 80 ? "🎉" : rate >= 50 ? "👍" : "💪"}
        </div>
        <div style={{
          fontSize: cleared ? 26 : 20,
          fontWeight: 900,
          color: cleared ? "#7C2D12" : theme.text,
          marginBottom: 8,
          letterSpacing: cleared ? "0.05em" : 0,
        }}>
          {cleared ? "CLEAR!" : "스피드 퀴즈 종료"}
        </div>
        {cleared && (
          <div style={{ fontSize: 13, color: "#92400E", fontWeight: 700, marginBottom: 20 }}>
            7분 20초 돌파 · 명예의 전당 등록
          </div>
        )}

        {/* 통계 카드 3개 */}
        <div style={{
          display: "flex", gap: 8, margin: "16px auto 24px", maxWidth: 360,
          justifyContent: "center",
        }}>
          <StatCard label="풀이 수" value={total}
            color={cleared ? "#7C2D12" : theme.text}
            bg={cleared ? "#FFFFFF80" : `${theme.text}08`} />
          <StatCard label="정답 수" value={correct}
            color="#10B981"
            bg={cleared ? "#FFFFFFB0" : "#10B98110"} />
          <StatCard label="정답률" value={`${rate}%`}
            color={rate >= 80 ? "#10B981" : rate >= 50 ? "#F59E0B" : "#EF4444"}
            bg={cleared ? "#FFFFFFB0" : `${theme.text}08`} />
        </div>

        <button onClick={() => onFinish({ results, cleared })}
          style={{
            padding: "12px 32px", borderRadius: 12,
            background: cleared ? "#7C2D12" : theme.text,
            color: cleared ? "#FDE68A" : theme.bg,
            fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
            boxShadow: cleared ? "0 4px 12px rgba(124,45,18,0.3)" : undefined,
          }}>
          돌아가기
        </button>

        {/* 클리어 애니메이션용 CSS */}
        <style>{`
          @keyframes clearFlash {
            0% { transform: scale(0.9); opacity: 0; }
            50% { transform: scale(1.03); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: theme.textSec, fontSize: 13 }}>
        문제 불러오는 중...
      </div>
    );
  }

  const correctCount = results.filter(r => r.correct).length;
  const isUrgent = timeLeft < 10;
  const isHardZone = timeLeft >= HARD_THRESHOLD_SEC;
  const isSlowZone = !isHardZone && timeLeft >= SLOW_THRESHOLD_SEC;
  // 클리어 근접: 400초(클리어 40초 전)부터 반짝임
  const isNearClear = timeLeft >= CLEAR_THRESHOLD_SEC - 40;

  // 구간별 색상 & 라벨
  const zoneColor = isNearClear ? "#EAB308" : isHardZone ? "#F97316" : isSlowZone ? "#8B5CF6" : "#3B82F6";
  const zoneLabel = isNearClear ? "👑 클리어 임박!" : isHardZone ? "🔥 극한 구간" : isSlowZone ? "🧠 계산 구간" : "⚡ 스피드 구간";

  // 펄스 이펙트: 최근 답변에 따라 잠시 배경 점멸 (0.8초)
  const pulseActive = pulse && (Date.now() - pulse.ts < 800);
  const pulseBg = pulseActive
    ? (pulse.kind === "correct" ? "#10B98118" : "#EF444418")
    : null;

  return (
    <div style={{
      padding: "0 16px 20px",
      background: pulseBg || undefined,
      transition: "background 0.3s ease",
    }}>
      {/* 상단: 타이머 + 정답 수 */}
      <div
        key={pulse?.ts /* 펄스마다 재마운트로 애니메이션 재실행 */}
        style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          padding: "10px 14px", borderRadius: 12,
          background: isUrgent
            ? "#EF444418"
            : pulseActive
              ? (pulse.kind === "correct" ? "#10B98122" : "#EF444422")
              : `${zoneColor}12`,
          border: `1.5px solid ${
            isUrgent ? "#EF444460"
              : pulseActive
                ? (pulse.kind === "correct" ? "#10B981" : "#EF4444")
                : `${zoneColor}30`
          }`,
          transition: "background .3s, border-color .3s",
          animation: pulseActive
            ? (pulse.kind === "correct" ? "quizBounce 0.5s ease-out" : "quizShake 0.4s ease-out")
            : (isNearClear ? "quizGlow 1.2s ease-in-out infinite" : undefined),
          position: "relative", overflow: "visible",
        }}>
        {/* 정답/오답 플로팅 텍스트 */}
        {pulseActive && (
          <div style={{
            position: "absolute",
            top: -12, right: 20,
            fontSize: 14, fontWeight: 900,
            color: pulse.kind === "correct" ? "#10B981" : "#EF4444",
            animation: "quizFloat 0.8s ease-out forwards",
            pointerEvents: "none",
          }}>
            {pulse.kind === "correct" ? `+${SPEED_BONUS_SEC}초` : `−${SPEED_PENALTY_SEC}초`}
          </div>
        )}
        <div style={{
          fontSize: 22, fontWeight: 900,
          color: isUrgent ? "#EF4444" : theme.text,
          fontVariantNumeric: "tabular-nums",
          minWidth: 52,
          animation: isUrgent ? "quizHeartbeat 1s ease-in-out infinite" : undefined,
        }}>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, fontSize: 11, color: theme.textSec, lineHeight: 1.4 }}>
          <span style={{ color: zoneColor, fontWeight: 700 }}>{zoneLabel}</span>
          <br />
          <span style={{ fontSize: 10 }}>
            정답 <span style={{ color: "#10B981", fontWeight: 700 }}>+{SPEED_BONUS_SEC}초</span>
            {"  "}
            오답 <span style={{ color: "#EF4444", fontWeight: 700 }}>−{SPEED_PENALTY_SEC}초</span>
          </span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#10B981",
          padding: "4px 10px", borderRadius: 8, background: "#10B98115",
        }}>
          ✓ {correctCount}
        </div>
      </div>

      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes quizBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.03) translateY(-2px); }
          100% { transform: scale(1); }
        }
        @keyframes quizShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes quizGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(234,179,8,0); }
          50% { box-shadow: 0 0 16px rgba(234,179,8,0.5); }
        }
        @keyframes quizHeartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes quizFloat {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>

      {/* 연속 정답 표시 */}
      {streak >= 3 && (
        <div style={{
          textAlign: "center", fontSize: 12, color: "#F59E0B", fontWeight: 700,
          marginBottom: 10,
        }}>
          🔥 {streak}연속 정답!
        </div>
      )}

      {/* 문제 */}
      <ProblemBody problem={currentProblem} theme={theme} />

      {/* 답변 영역 */}
      <AnswerArea
        problem={currentProblem}
        revealed={revealed}
        selected={selected}
        fillInput={fillInput}
        setFillInput={setFillInput}
        onAnswer={handleAnswer}
        theme={theme}
      />

      {/* 해설 */}
      {revealed && (
        <Explanation
          problem={currentProblem}
          selected={selected}
          fillInput={fillInput}
          theme={theme}
        />
      )}

      {/* 다음 버튼 (제출 후에만 노출) — 3가지 상태
          · cleared: 클리어 달성! 골드 버튼
          · pendingFinish (not cleared): 시간 소진 → 결과
          · normal: 다음 문제
      */}
      {revealed && (
        <button onClick={handleNext}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            background: cleared ? "#EAB308"
              : pendingFinish ? "#EF4444"
              : theme.text,
            color: cleared ? "#422006"
              : pendingFinish ? "#fff"
              : theme.bg,
            fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
            boxShadow: cleared ? "0 4px 12px rgba(234,179,8,0.4)" : undefined,
            animation: cleared ? "quizGlow 1.2s ease-in-out infinite" : undefined,
          }}>
          {cleared ? "👑 클리어! 결과 보기"
            : pendingFinish ? "시간 소진 — 결과 보기"
            : "다음 문제 →"}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ── [2] QuizPlayer — 그 외 모드(daily, ox, review, time) ──
// ══════════════════════════════════════════
function QuizPlayer({ problems, theme, playSfx, onFinish, multiplier = 1, timeLimit = 0, modeName = "퀴즈" }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [fillInput, setFillInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hintLevel, setHintLevel] = useState(0);

  const problem = problems[idx];
  const isLast = idx >= problems.length - 1;
  const totalXPEarned = results.reduce((s, r) => s + r.xp, 0);

  // Timer (time 모드 등)
  useEffect(() => {
    if (timeLimit <= 0) return;
    setTimeLeft(timeLimit);
    const iv = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? (clearInterval(iv), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [timeLimit]);

  useEffect(() => {
    if (timeLimit > 0 && timeLeft <= 0 && !revealed) {
      onFinish(results);
    }
  }, [timeLeft]);

  const handleAnswer = (answer) => {
    if (revealed) return;
    setSelected(answer);
    setRevealed(true);

    let correct = false;
    if (problem.type === "ox") correct = answer === problem.answer;
    else if (problem.type === "choice") correct = answer === problem.answer;
    else if (problem.type === "fill_blank") correct = matchesFillBlank(answer, problem.answer);

    const xpConfig = GAME_DEFAULTS.xp;
    let xp = correct ? xpConfig.quizCorrect : xpConfig.quizIncorrect;
    xp = Math.round(xp * multiplier);
    if (hintLevel >= 1) xp += xpConfig.hintPenalty1;
    if (hintLevel >= 2) xp += xpConfig.hintPenalty2;
    if (hintLevel >= 3) xp += xpConfig.hintPenaltyAnswer;
    xp = Math.max(0, xp);

    setStreak(correct ? streak + 1 : 0);
    setResults(prev => [...prev, {
      problemId: problem.id, correct, xp, hintUsed: hintLevel, timestamp: Date.now(),
    }]);
    if (correct) playSfx("success"); else playSfx("click");
  };

  const handleNext = () => {
    if (isLast) { onFinish([...results]); return; }
    setIdx(i => i + 1);
    setSelected(null);
    setRevealed(false);
    setFillInput("");
    setHintLevel(0);
  };

  // 결과 화면
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

      {streak >= 3 && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#F59E0B", fontWeight: 700, marginBottom: 10 }}>
          🔥 {streak}연속 정답!
        </div>
      )}

      <ProblemBody problem={problem} theme={theme} />

      <AnswerArea
        problem={problem}
        revealed={revealed}
        selected={selected}
        fillInput={fillInput}
        setFillInput={setFillInput}
        onAnswer={handleAnswer}
        theme={theme}
      />

      {revealed && (
        <Explanation
          problem={problem}
          selected={selected}
          fillInput={fillInput}
          theme={theme}
        />
      )}

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
  const [mode, setMode] = useState(null);
  const [quizSession, setQuizSession] = useState(0);
  const [allXP, setAllXP] = useState(null);
  const [activeTimeQuiz, setActiveTimeQuiz] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // 스피드 퀴즈 종료 — XP 미적용, 클리어 시 Firestore 기록
  // payload: { results: [{problemId, correct}], cleared: boolean }
  const handleSpeedFinish = useCallback(async (payload) => {
    const { results, cleared } = payload || {};
    const correct = (results || []).filter(r => r.correct).length;
    const total = (results || []).length;
    const rate = total > 0 ? correct / total : 0;

    // 사용자에게 결과 토스트
    if (cleared) {
      showMsg(`🏆 클리어! ${correct}/${total} 정답`, 2500);
    } else if (total > 0) {
      showMsg(`${total}문제 중 ${correct}문제 정답!`, 1500);
    }

    // Firestore 기록 — 로그인한 사용자에 한해
    if (user && total > 0) {
      try {
        const doc = await fbGet("quiz-clears") || {};
        const prev = doc[user.id] || {
          userId: user.id,
          name: user.name || user.nickname || "익명",
          clearCount: 0,
          bestCorrect: 0,
          bestRate: 0,
          totalAttempts: 0,
          lastClearAt: null,
        };
        const updated = {
          ...prev,
          name: user.name || user.nickname || prev.name,
          clearCount: prev.clearCount + (cleared ? 1 : 0),
          bestCorrect: Math.max(prev.bestCorrect, correct),
          bestRate: Math.max(prev.bestRate, rate),
          totalAttempts: prev.totalAttempts + 1,
          lastClearAt: cleared ? Date.now() : prev.lastClearAt,
        };
        await fbSet("quiz-clears", { [user.id]: updated });
      } catch (e) {
        console.warn("quiz-clears save failed:", e);
      }
    }

    setMode(null);
  }, [user, showMsg]);

  // 그 외 모드 — 기존 XP 처리 유지
  const handleQuizFinish = useCallback(async (results) => {
    if (!user) { setMode(null); return; }

    const data = allXP || {};
    let userData = data[user.id] || createDefaultXPData(user.id);
    let totalEarned = 0;

    for (const r of results) {
      const { data: updated } = await grantXP(
        user.id, r.xp, r.correct ? "퀴즈 정답" : "퀴즈 시도",
        { [user.id]: userData }
      );
      userData = updated;
      totalEarned += r.xp;

      userData.stats.quizTotal = (userData.stats.quizTotal || 0) + 1;
      if (r.correct) userData.stats.quizCorrect = (userData.stats.quizCorrect || 0) + 1;
      userData.stats.quizCorrectRate = userData.stats.quizTotal > 0
        ? userData.stats.quizCorrect / userData.stats.quizTotal : 0;

      if (!r.correct) {
        await saveReviewItem(user.id, {
          problemId: r.problemId,
          lastReviewDate: null,
          reviewCount: 0,
          mastered: false,
        }, { [user.id]: reviewQueue });
      }
    }

    const newBadges = checkBadges(userData);
    if (newBadges.length > 0) {
      userData.badges = [...(userData.badges || []), ...newBadges];
      showMsg(`🏅 새 뱃지 획득! (${newBadges.length}개)`, 2000);
    }

    await saveUserXP(user.id, userData, data);
    setAllXP({ ...data, [user.id]: userData });

    if (totalEarned > 0) {
      showMsg(`+${totalEarned} XP 획득!`, 1500);
    }
    setMode(null);
  }, [user, allXP, reviewQueue, showMsg]);

  const getProblems = (quizMode) => {
    switch (quizMode) {
      case "daily": {
        const dayIdx = new Date().getDate() % SAMPLE_PROBLEMS.length;
        return [SAMPLE_PROBLEMS[dayIdx]];
      }
      case "ox":
        return shuffle(SAMPLE_PROBLEMS.filter(p => p.type === "ox")).slice(0, 8);
      case "time":
        return shuffle(SAMPLE_PROBLEMS).slice(0, 5);
      case "review":
        return reviewDue.length > 0
          ? reviewDue.slice(0, 5).map(r => SAMPLE_PROBLEMS.find(p => p.id === r.problemId)).filter(Boolean)
          : shuffle(SAMPLE_PROBLEMS).slice(0, 3);
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
            currentUser={user}
          />
        ) : mode === "speed" ? (
          <SpeedQuizPlayer
            key={quizSession}
            theme={theme}
            playSfx={playSfx}
            onFinish={handleSpeedFinish}
          />
        ) : (
          <QuizPlayer
            key={quizSession}
            problems={getProblems(mode)}
            theme={theme}
            playSfx={playSfx}
            onFinish={handleQuizFinish}
            multiplier={mode === "time" && activeTimeQuiz ? activeTimeQuiz.multiplier : 1}
            timeLimit={0}
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
