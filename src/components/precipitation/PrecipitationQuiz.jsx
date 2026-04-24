// src/components/precipitation/PrecipitationQuiz.jsx
// 퀴즈 UI
//  - 1단계: 계산식 중간값 빈칸 3문제 (4지선다)
//  - 2단계: 최종 석출량 2문제 (4지선다)
//  - 단계 관문: 1단계 3문제 모두 정답 → 2단계 진입
//               2단계 2문제 모두 정답 → onComplete() 호출하여 해금
//  - 틀린 단계는 새 문제로 전부 재시도

import { useState } from 'react';
import { generateQuizSet, regenerateStage } from '../../data/precipitationQuizBank';
import SolubilityChart from './SolubilityChart';
import { getSolubility } from '../../data/solubilityData';

export default function PrecipitationQuiz({ onComplete, onCancel }) {
  const [quiz, setQuiz] = useState(() => generateQuizSet());
  const [currentStage, setCurrentStage] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // 현재 단계 답안들
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [stageResult, setStageResult] = useState(null); // 'pass' | 'fail' | null

  const currentProblems = currentStage === 1 ? quiz.stage1 : quiz.stage2;
  const current = currentProblems[currentIndex];
  const totalInStage = currentProblems.length;

  function handleSelect(option) {
    if (showFeedback) return;
    setSelected(option);
  }

  function handleSubmit() {
    if (selected == null) return;
    const isCorrect = selected === current.correctAnswer;
    const nextAnswers = [...answers, { selected, isCorrect }];
    setAnswers(nextAnswers);
    setShowFeedback(true);
  }

  function handleNext() {
    setShowFeedback(false);
    setSelected(null);

    if (currentIndex + 1 < totalInStage) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    // 단계 종료 — answers는 이미 handleSubmit에서 마지막 답까지 추가됨
    const passed = answers.every(a => a.isCorrect);

    if (passed) {
      if (currentStage === 1) {
        // 1단계 통과 → 2단계 진입
        setStageResult('pass');
      } else {
        // 2단계 통과 → 완료
        setStageResult('complete');
      }
    } else {
      setStageResult('fail');
    }
  }

  function handleStageAction() {
    if (stageResult === 'pass') {
      // 2단계 진입
      setCurrentStage(2);
      setCurrentIndex(0);
      setAnswers([]);
      setSelected(null);
      setShowFeedback(false);
      setStageResult(null);
    } else if (stageResult === 'fail') {
      // 현재 단계 새 문제로 재시도
      const newProblems = regenerateStage(currentStage);
      setQuiz(prev => ({
        ...prev,
        [currentStage === 1 ? 'stage1' : 'stage2']: newProblems,
      }));
      setCurrentIndex(0);
      setAnswers([]);
      setSelected(null);
      setShowFeedback(false);
      setStageResult(null);
    } else if (stageResult === 'complete') {
      onComplete?.();
    }
  }

  // 단계 결과 화면
  if (stageResult) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    return (
      <div style={styles.container}>
        <div style={styles.stageResultBox}>
          {stageResult === 'pass' && (
            <>
              <div style={styles.resultIcon}>🎯</div>
              <h3 style={styles.resultTitle}>1단계 통과!</h3>
              <p style={styles.resultDesc}>
                계산식의 중간값을 정확히 이해했어요.<br />
                이제 2단계: 최종 석출량을 구해봅시다.
              </p>
              <div style={styles.resultScore}>
                점수: <b>{correctCount} / {totalInStage}</b>
              </div>
              <button style={styles.primaryBtn} onClick={handleStageAction}>
                2단계 시작
              </button>
            </>
          )}
          {stageResult === 'fail' && (
            <>
              <div style={styles.resultIcon}>🔄</div>
              <h3 style={styles.resultTitle}>
                {currentStage}단계 재도전
              </h3>
              <p style={styles.resultDesc}>
                {totalInStage}문제 중 <b>{correctCount}문제</b>를 맞혔어요.<br />
                모든 문제를 맞혀야 통과할 수 있습니다.<br />
                새로운 문제로 다시 풀어봅시다.
              </p>
              <button style={styles.primaryBtn} onClick={handleStageAction}>
                다시 풀기
              </button>
            </>
          )}
          {stageResult === 'complete' && (
            <>
              <div style={styles.resultIcon}>🏆</div>
              <h3 style={styles.resultTitle}>완주!</h3>
              <p style={styles.resultDesc}>
                1단계 3문제 + 2단계 2문제 모두 정답!<br />
                <b>커스텀 모드</b>와 <b>심화 모드</b>가 해금되었습니다.
              </p>
              <button style={styles.primaryBtn} onClick={handleStageAction}>
                해금된 모드로 이동
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 상단 진행 표시 */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onCancel}>← 나가기</button>
        <div style={styles.stageIndicator}>
          <span style={styles.stageLabel}>
            {currentStage}단계 · {currentIndex + 1} / {totalInStage}
          </span>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${((currentIndex + (showFeedback ? 1 : 0)) / totalInStage) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 문제 */}
      <div style={styles.problemCard}>
        <div style={styles.problemNumber}>
          Q{currentIndex + 1}
          <span style={styles.problemType}>
            {currentStage === 1 ? '빈칸 채우기' : '석출량 구하기'}
          </span>
        </div>
        <div style={styles.problemText}>{current.question}</div>

        {/* 용해도 곡선 (문제 맥락) */}
        <div style={styles.chartBox}>
          <SolubilityChart
            highlightSubstanceId={current.substanceId}
            hotTemp={current.hot}
            coldTemp={current.cold}
            hotSolubility={getSolubility(current.substanceId, current.hot)}
            coldSolubility={getSolubility(current.substanceId, current.cold)}
          />
        </div>

        {/* 계산식 표시 */}
        <div style={styles.formulaBox}>
          <div style={styles.formulaLabel}>계산식</div>
          <div style={styles.formulaText}>{current.formula}</div>
          <div style={styles.hint}>{current.hint}</div>
        </div>

        {/* 선지 */}
        <div style={styles.options}>
          {current.options.map((opt, i) => {
            const isSel = selected === opt;
            const isCorrect = opt === current.correctAnswer;
            let bg = '#FFFFFF';
            let border = '#E5E8EC';
            let color = '#374151';

            if (showFeedback) {
              if (isCorrect) {
                bg = '#D1FAE5';
                border = '#10B981';
                color = '#065F46';
              } else if (isSel && !isCorrect) {
                bg = '#FEE2E2';
                border = '#EF4444';
                color = '#991B1B';
              }
            } else if (isSel) {
              bg = '#EEF2FF';
              border = '#6366F1';
              color = '#3730A3';
            }

            return (
              <button
                key={i}
                style={{
                  ...styles.optionBtn,
                  background: bg,
                  borderColor: border,
                  color,
                }}
                onClick={() => handleSelect(opt)}
                disabled={showFeedback}
              >
                <span style={styles.optionIndex}>{String.fromCharCode(65 + i)}</span>
                <span style={styles.optionValue}>
                  {opt}{current.unit && <span style={styles.optionUnit}> {current.unit}</span>}
                </span>
                {showFeedback && isCorrect && <span style={styles.checkMark}>✓</span>}
                {showFeedback && isSel && !isCorrect && <span style={styles.xMark}>✗</span>}
              </button>
            );
          })}
        </div>

        {/* 피드백 */}
        {showFeedback && (
          <div style={styles.feedbackBox}>
            {selected === current.correctAnswer ? (
              <span style={styles.feedbackCorrect}>정답입니다!</span>
            ) : (
              <span style={styles.feedbackWrong}>
                오답. 정답은 <b>{current.correctAnswer}{current.unit}</b>입니다.
              </span>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={styles.actionRow}>
          {!showFeedback ? (
            <button
              style={{
                ...styles.primaryBtn,
                opacity: selected == null ? 0.5 : 1,
              }}
              disabled={selected == null}
              onClick={handleSubmit}
            >
              정답 제출
            </button>
          ) : (
            <button style={styles.primaryBtn} onClick={handleNext}>
              {currentIndex + 1 < totalInStage ? '다음 문제' : '결과 보기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 12,
    paddingBottom: 80,
    maxWidth: 480,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    height: '100%',
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 2px',
  },
  backBtn: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid #D4D9E0',
    borderRadius: 6,
    fontSize: 12,
    color: '#4B5563',
    cursor: 'pointer',
  },
  stageIndicator: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  stageLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 600,
  },
  progressBar: {
    width: '100%',
    height: 4,
    background: '#E5E8EC',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366F1, #4A7ED9)',
    borderRadius: 2,
    transition: 'width 0.3s',
  },
  problemCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 14,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  problemNumber: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#4A7ED9',
  },
  problemType: {
    padding: '2px 6px',
    background: '#EEF2FF',
    color: '#4F46E5',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
  },
  problemText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 1.6,
    fontWeight: 500,
  },
  chartBox: {
    padding: 8,
    background: '#F9FAFB',
    borderRadius: 8,
  },
  formulaBox: {
    padding: 10,
    background: '#FFFBEB',
    borderRadius: 8,
    borderLeft: '3px solid #F59E0B',
  },
  formulaLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: 700,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 15,
    fontFamily: 'ui-monospace, monospace',
    color: '#78350F',
    fontWeight: 600,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: '#A16207',
    lineHeight: 1.5,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: '2px solid',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  optionIndex: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: '#4B5563',
  },
  optionValue: {
    flex: 1,
    fontFamily: 'ui-monospace, monospace',
  },
  optionUnit: { fontWeight: 500, fontSize: 12 },
  checkMark: { color: '#10B981', fontSize: 18, fontWeight: 900 },
  xMark: { color: '#EF4444', fontSize: 18, fontWeight: 900 },
  feedbackBox: {
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
    background: '#F3F4F6',
  },
  feedbackCorrect: { color: '#059669', fontWeight: 700 },
  feedbackWrong: { color: '#DC2626', fontWeight: 600 },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366F1, #4A7ED9)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
  },
  stageResultBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: 28,
    background: '#FFFFFF',
    borderRadius: 14,
    border: '1px solid #E5E8EC',
    marginTop: 40,
    textAlign: 'center',
  },
  resultIcon: { fontSize: 48 },
  resultTitle: { fontSize: 20, fontWeight: 800, color: '#1F2937', margin: 0 },
  resultDesc: { fontSize: 13, color: '#4B5563', lineHeight: 1.6, margin: 0 },
  resultScore: {
    padding: '8px 14px',
    background: '#F3F4F6',
    borderRadius: 8,
    fontSize: 13,
    color: '#374151',
  },
};
