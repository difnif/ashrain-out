// src/data/precipitationPresets.js
// 셋팅 모드: 3단계 태그 카테고리 선택
//   ① 물질 선택 (SUBSTANCES에서)
//   ② 온도 조합 선택 (고온 → 저온)
//   ③ 용액양 선택 (물 100g 기준 포화용액의 배수; 50%/100%/150%/200%)

import { getSolubility } from './solubilityData';

// 온도 조합 옵션 (고온 > 저온)
export const TEMP_COMBINATIONS = [
  { hot: 80, cold: 0 },
  { hot: 80, cold: 20 },
  { hot: 80, cold: 40 },
  { hot: 80, cold: 60 },
  { hot: 60, cold: 0 },
  { hot: 60, cold: 20 },
  { hot: 60, cold: 40 },
  { hot: 40, cold: 0 },
  { hot: 40, cold: 20 },
  { hot: 20, cold: 0 },
];

// 물 100g 기준 포화용액의 배수 (50%/100%/150%/200%)
export const SOLUTION_MULTIPLIERS = [0.5, 1, 1.5, 2];

// 각 배수에 해당하는 용액양 계산
// 선택한 고온 기준으로 포화용액을 만들 때,
// 물 100g × 배수 + 용질 S × 배수 = 포화용액 (100 + S) × 배수
export function computeAmountOption(substanceId, hotTemp, multiplier) {
  const hotS = getSolubility(substanceId, hotTemp);
  const refSolution = 100 + hotS;
  return {
    multiplier,
    solutionMass: +(refSolution * multiplier).toFixed(1),
    waterMass: +(100 * multiplier).toFixed(1),
    soluteMass: +(hotS * multiplier).toFixed(1),
  };
}

export function formatTempCombo(combo) {
  return `${combo.hot}℃ → ${combo.cold}℃`;
}

export function tempComboId(combo) {
  return `${combo.hot}-${combo.cold}`;
}
