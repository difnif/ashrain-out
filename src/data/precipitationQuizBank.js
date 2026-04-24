// src/data/precipitationQuizBank.js
// 퀴즈 문제 자동 생성기
// 1단계: 계산식 중간값 빈칸 3문제 (용해도 조회 + 공식 중간값)
// 2단계: 최종 석출량 값 구하기 2문제
//
// 통과 조건: 단계 관문
//   - 1단계 3문제 모두 정답 → 2단계 진입
//   - 2단계 2문제 모두 정답 → 커스텀/심화 모드 해금

import { SUBSTANCES, getSolubility } from './solubilityData';

const SUBSTANCE_IDS = ['KNO3', 'NaCl', 'CuSO4', 'H3BO3', 'NH4Cl'];
const TEMPERATURES = [0, 20, 40, 60, 80];
const SOLUTION_MASSES = [100, 150, 200, 300, 500];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTempPair() {
  // 고온 > 저온, 온도 차 충분히 확보
  let hot, cold;
  do {
    hot = randomPick(TEMPERATURES);
    cold = randomPick(TEMPERATURES);
  } while (hot <= cold);
  return { hot, cold };
}

/**
 * 석출량이 의미 있는 값이 되도록 물질-온도 조합 선정
 * (NaCl처럼 용해도 변화가 작은 물질은 큰 용액량으로 보정)
 */
function generateContext() {
  const substanceId = randomPick(SUBSTANCE_IDS);
  const { hot, cold } = randomTempPair();
  const hotS = getSolubility(substanceId, hot);
  const coldS = getSolubility(substanceId, cold);
  const diff = hotS - coldS;

  // 석출량이 너무 작으면 용액양을 크게
  let solutionMass;
  if (diff < 2) {
    solutionMass = randomPick([300, 500]);
  } else if (diff < 10) {
    solutionMass = randomPick([150, 200, 300]);
  } else {
    solutionMass = randomPick(SOLUTION_MASSES);
  }

  return { substanceId, hot, cold, hotS, coldS, solutionMass };
}

/**
 * 오답 선지 생성 (근사치 오답 3개)
 */
function generateDistractors(correctAnswer, count = 3) {
  const distractors = new Set();
  const correct = +(+correctAnswer).toFixed(2);

  const variations = [
    correct * 1.2, correct * 0.8,
    correct * 1.5, correct * 0.5,
    correct + 5, correct - 5,
    correct * 2, correct / 2,
  ];

  for (const v of variations) {
    const rounded = +v.toFixed(2);
    if (rounded > 0 && Math.abs(rounded - correct) > 0.1 && !distractors.has(rounded)) {
      distractors.add(rounded);
    }
    if (distractors.size >= count) break;
  }

  return Array.from(distractors).slice(0, count);
}

/**
 * 1단계 문제 생성: 계산식 중간값 빈칸
 * 3가지 유형을 섞음:
 *  - 유형 1: "물 100g 기준 석출량 = S_hot - S_cold = ? g"
 *  - 유형 2: "물 100g 기준 고온 포화용액 = 100 + S_hot = ? g"
 *  - 유형 3: "비율 = 주어진 용액량 / 기준 용액량 = ? / ? "
 */
function generateStage1Problem(ctx, variant) {
  const { substanceId, hot, cold, hotS, coldS, solutionMass } = ctx;
  const sub = SUBSTANCES[substanceId];

  const referenceSolution = +(100 + hotS).toFixed(2);
  const referencePrecipitation = +(hotS - coldS).toFixed(2);

  if (variant === 0) {
    // 유형 1: 물 100g 기준 석출량
    const correct = referencePrecipitation;
    return {
      type: 'stage1',
      variant: 1,
      substanceId,
      hot,
      cold,
      solutionMass,
      question: `${sub.formula} ${hot}℃ 포화용액을 ${cold}℃로 냉각할 때, 물 100g 기준 석출량은 몇 g인가요?`,
      formula: `${hotS} − ${coldS} = ?`,
      hint: `${hot}℃ 용해도: ${hotS}g,  ${cold}℃ 용해도: ${coldS}g`,
      correctAnswer: correct,
      unit: 'g',
      options: shuffle([correct, ...generateDistractors(correct, 3)]),
    };
  }

  if (variant === 1) {
    // 유형 2: 물 100g 기준 포화용액 질량
    const correct = referenceSolution;
    return {
      type: 'stage1',
      variant: 2,
      substanceId,
      hot,
      cold,
      solutionMass,
      question: `${sub.formula}의 ${hot}℃ 포화용액에서, 물 100g 기준 포화용액의 총질량은 몇 g인가요?`,
      formula: `100 + ${hotS} = ?`,
      hint: `${hot}℃ 용해도: ${hotS}g (물 100g에 ${hotS}g의 용질이 녹음)`,
      correctAnswer: correct,
      unit: 'g',
      options: shuffle([correct, ...generateDistractors(correct, 3)]),
    };
  }

  // 유형 3: 비율 계산 (결과를 소수 넷째 자리까지)
  const correct = +(solutionMass / referenceSolution).toFixed(4);
  return {
    type: 'stage1',
    variant: 3,
    substanceId,
    hot,
    cold,
    solutionMass,
    question: `${sub.formula} ${hot}℃ 포화용액 ${solutionMass}g이 있을 때, 물 100g 기준 포화용액(${referenceSolution}g)에 대한 비율은?`,
    formula: `${solutionMass} ÷ ${referenceSolution} = ?`,
    hint: `포화용액 양을 기준량으로 나눠 비율을 구합니다.`,
    correctAnswer: correct,
    unit: '',
    options: shuffle([correct, ...generateDistractors(correct, 3).map(v => +v.toFixed(4))]),
  };
}

/**
 * 2단계 문제 생성: 최종 석출량
 */
function generateStage2Problem(ctx) {
  const { substanceId, hot, cold, hotS, coldS, solutionMass } = ctx;
  const sub = SUBSTANCES[substanceId];

  const referenceSolution = +(100 + hotS).toFixed(2);
  const referencePrecipitation = +(hotS - coldS).toFixed(2);
  const correct = +((referencePrecipitation * solutionMass) / referenceSolution).toFixed(2);

  return {
    type: 'stage2',
    substanceId,
    hot,
    cold,
    solutionMass,
    question: `${sub.formula} ${hot}℃ 포화용액 ${solutionMass}g을 ${cold}℃로 냉각할 때, 석출되는 용질의 질량은 몇 g인가요?`,
    formula: `(${hotS} − ${coldS}) × ${solutionMass} ÷ ${referenceSolution} = ?`,
    hint: `① 물 100g 기준 석출량 × ② 포화용액 비율`,
    correctAnswer: correct,
    unit: 'g',
    options: shuffle([correct, ...generateDistractors(correct, 3)]),
    // 해설용 중간값
    breakdown: {
      hotS, coldS,
      referenceSolution,
      referencePrecipitation,
      ratio: +(solutionMass / referenceSolution).toFixed(4),
      final: correct,
    },
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 퀴즈 한 세트 생성 (1단계 3문제 + 2단계 2문제)
 * 각 문제의 context는 다르게 (다양한 물질/온도 출제)
 */
export function generateQuizSet() {
  const stage1 = [];
  const usedVariants = shuffle([0, 1, 2]); // 3가지 유형 모두 나오게
  for (let i = 0; i < 3; i++) {
    stage1.push(generateStage1Problem(generateContext(), usedVariants[i]));
  }

  const stage2 = [];
  for (let i = 0; i < 2; i++) {
    stage2.push(generateStage2Problem(generateContext()));
  }

  return { stage1, stage2 };
}

/**
 * 특정 단계만 재생성 (틀렸을 때 해당 단계만 새 문제로)
 */
export function regenerateStage(stage) {
  if (stage === 1) {
    const problems = [];
    const variants = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i++) {
      problems.push(generateStage1Problem(generateContext(), variants[i]));
    }
    return problems;
  }
  if (stage === 2) {
    const problems = [];
    for (let i = 0; i < 2; i++) {
      problems.push(generateStage2Problem(generateContext()));
    }
    return problems;
  }
  return [];
}
