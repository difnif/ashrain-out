// src/data/precipitationQuizBank.js
// 퀴즈 문제 자동 생성기 (교과서 스타일)
//
// ❗ 핵심 원칙: 실제 중2 과학 교과서 문제는 "물 양"을 기준으로 포화용액을 설정함.
//   ❌ "KNO₃ 60℃ 포화용액 150g을..." — 150g이 어디서 나왔는지 불명확
//   ✅ "60℃의 물 200g에 KNO₃를 포화시킨 후..." — 물 양이 명확
//
// 1단계 (빈칸 채우기 3문제):
//   유형 A: 용해도 조회 (용해도 곡선 읽기)
//   유형 B: 포화용액의 총 질량 (물 + 녹은 용질)
//   유형 C: 포화용액에 녹아있는 용질의 양
//
// 2단계 (석출량 2문제):
//   물 양 기반 석출량 = (S_hot - S_cold) × 물양 / 100
//
// 물 양은 [100, 200, 300, 500]g 중 선택.
// 용해도 차이가 작은 조합(NaCl 등)은 물 양을 많이, 차이가 큰 건 적게 배정하여
// 석출량이 의미있는 수치가 되도록 조정.

import { getSolubility, getSubstanceLabel } from './solubilityData';

const SUBSTANCE_IDS = ['KNO3', 'NaCl', 'CuSO4', 'H3BO3', 'NH4Cl'];
const TEMPERATURES = [0, 20, 40, 60, 80];
const WATER_MASSES = [100, 200, 300, 500];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTempPair() {
  let hot, cold;
  do {
    hot = randomPick(TEMPERATURES);
    cold = randomPick(TEMPERATURES);
  } while (hot <= cold);
  return { hot, cold };
}

/**
 * 문제 context 생성 — 물 양은 석출량이 의미있도록 조정
 */
function generateContext() {
  const substanceId = randomPick(SUBSTANCE_IDS);
  const { hot, cold } = randomTempPair();
  const hotS = getSolubility(substanceId, hot);
  const coldS = getSolubility(substanceId, cold);
  const diff = hotS - coldS;

  // 용해도 차에 따라 물 양 조정 (석출량이 너무 작거나 크지 않게)
  let waterMass;
  if (diff < 2) {
    // NaCl 같이 용해도 변화 작은 것 → 물 많이
    waterMass = randomPick([300, 500]);
  } else if (diff < 10) {
    waterMass = randomPick([200, 300]);
  } else if (diff < 50) {
    waterMass = randomPick([100, 200]);
  } else {
    // 큰 차이 (KNO₃ 고온 등) → 물 적게
    waterMass = randomPick([100, 200]);
  }

  return { substanceId, hot, cold, hotS, coldS, waterMass };
}

/**
 * 오답 선지 생성 — 근사 오답 3개
 */
function generateDistractors(correctAnswer, count = 3) {
  const distractors = new Set();
  const correct = +(+correctAnswer).toFixed(2);

  const variations = [
    correct * 1.25, correct * 0.75,
    correct * 1.5, correct * 0.5,
    correct + 10, correct - 10,
    correct * 2, correct / 2,
  ];

  for (const v of variations) {
    const rounded = +v.toFixed(1);
    if (rounded > 0 && Math.abs(rounded - correct) > 0.5 && !distractors.has(rounded)) {
      distractors.add(rounded);
    }
    if (distractors.size >= count) break;
  }

  return Array.from(distractors).slice(0, count);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── 1단계 문제 생성 ────────────────────────────────────

function generateStage1Problem(ctx, variant, useFormula) {
  const { substanceId, hot, cold, hotS, coldS, waterMass } = ctx;
  const label = getSubstanceLabel(substanceId, useFormula);

  if (variant === 0) {
    // 유형 A: 용해도 조회
    const correct = hotS;
    return {
      type: 'stage1',
      variant: 1,
      substanceId, hot, cold, waterMass,
      question: `${hot}℃에서 ${label}의 용해도는 몇 g인가요?`,
      formula: `용해도 = 물 100g에 최대로 녹을 수 있는 용질의 g수`,
      hint: `용해도 곡선에서 ${hot}℃의 ${label} 값을 읽어봅니다.`,
      correctAnswer: correct,
      unit: 'g',
      options: shuffle([correct, ...generateDistractors(correct, 3)]),
    };
  }

  if (variant === 1) {
    // 유형 B: 포화용액의 총 질량
    const solute = +(hotS * waterMass / 100).toFixed(1);
    const correct = +(waterMass + solute).toFixed(1);
    return {
      type: 'stage1',
      variant: 2,
      substanceId, hot, cold, waterMass,
      question: `${hot}℃의 물 ${waterMass}g에 ${label}을(를) 포화될 때까지 녹였습니다. 이때 포화용액의 총 질량은 몇 g인가요?`,
      formula: `물 ${waterMass}g + 녹은 용질 = ?`,
      hint: `${hot}℃ 용해도: ${hotS}g/물100g. 물 ${waterMass}g에서는 ${solute}g의 용질이 녹습니다.`,
      correctAnswer: correct,
      unit: 'g',
      options: shuffle([correct, ...generateDistractors(correct, 3)]),
    };
  }

  // 유형 C: 포화용액에 녹아있는 용질의 양
  const correct = +(hotS * waterMass / 100).toFixed(1);
  return {
    type: 'stage1',
    variant: 3,
    substanceId, hot, cold, waterMass,
    question: `${hot}℃의 물 ${waterMass}g에 ${label}을(를) 포화시켰을 때, 녹아있는 ${label}의 질량은 몇 g인가요?`,
    formula: `${hotS} × ${waterMass} ÷ 100 = ?`,
    hint: `물 100g에 ${hotS}g이 녹으므로, 물 ${waterMass}g에는 비례해서 녹습니다.`,
    correctAnswer: correct,
    unit: 'g',
    options: shuffle([correct, ...generateDistractors(correct, 3)]),
  };
}

// ─── 2단계 문제 생성 ────────────────────────────────────

function generateStage2Problem(ctx, useFormula) {
  const { substanceId, hot, cold, hotS, coldS, waterMass } = ctx;
  const label = getSubstanceLabel(substanceId, useFormula);

  const perHundred = +(hotS - coldS).toFixed(2);
  const correct = +(perHundred * waterMass / 100).toFixed(1);

  return {
    type: 'stage2',
    substanceId, hot, cold, waterMass,
    question: `${hot}℃의 물 ${waterMass}g에 ${label}을(를) 포화시킨 후 ${cold}℃로 냉각할 때, 석출되는 ${label}의 질량은 몇 g인가요?`,
    formula: `(${hotS} − ${coldS}) × ${waterMass} ÷ 100 = ?`,
    hint: `물 100g 기준 석출량 ${perHundred}g에 물 ${waterMass}g 비율을 곱합니다.`,
    correctAnswer: correct,
    unit: 'g',
    options: shuffle([correct, ...generateDistractors(correct, 3)]),
  };
}

// ─── 퀴즈 세트 생성 ────────────────────────────────────

/**
 * 퀴즈 한 세트 생성 (1단계 3문제 + 2단계 2문제)
 * @param {boolean} useFormula 화학식 사용 여부 (기본 false, 한글 이름)
 */
export function generateQuizSet(useFormula = false) {
  const stage1 = [];
  const usedVariants = shuffle([0, 1, 2]);
  for (let i = 0; i < 3; i++) {
    stage1.push(generateStage1Problem(generateContext(), usedVariants[i], useFormula));
  }

  const stage2 = [];
  // 2단계 2문제: 서로 다른 물질/온도 조합
  const usedSubstances = new Set();
  for (let i = 0; i < 2; i++) {
    let ctx;
    let tries = 0;
    do {
      ctx = generateContext();
      tries++;
    } while (usedSubstances.has(ctx.substanceId) && tries < 5);
    usedSubstances.add(ctx.substanceId);
    stage2.push(generateStage2Problem(ctx, useFormula));
  }

  return { stage1, stage2 };
}

/**
 * 특정 단계만 재생성 (틀렸을 때 해당 단계만 새 문제로)
 */
export function regenerateStage(stage, useFormula = false) {
  if (stage === 1) {
    const problems = [];
    const variants = shuffle([0, 1, 2]);
    for (let i = 0; i < 3; i++) {
      problems.push(generateStage1Problem(generateContext(), variants[i], useFormula));
    }
    return problems;
  }
  if (stage === 2) {
    const problems = [];
    const usedSubstances = new Set();
    for (let i = 0; i < 2; i++) {
      let ctx;
      let tries = 0;
      do {
        ctx = generateContext();
        tries++;
      } while (usedSubstances.has(ctx.substanceId) && tries < 5);
      usedSubstances.add(ctx.substanceId);
      problems.push(generateStage2Problem(ctx, useFormula));
    }
    return problems;
  }
  return [];
}
