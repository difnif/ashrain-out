// src/data/precipitationPresets.js
// 셋팅 모드: 카테고리 태그 옵션
//   ① 물질 선택
//   ② 용해 온도 (20/40/60/80℃)
//   ③ 냉각 온도 (0/20/40/60℃)  — 용해온도보다 작아야 함
//   ④ 용액양 (물 100g 기준 포화용액의 배수를 g 수치로 표시)

import { getSolubility } from './solubilityData';

// 용해(시작) 온도 옵션
export const HOT_TEMPERATURES = [20, 40, 60, 80];
// 냉각(끝) 온도 옵션
export const COLD_TEMPERATURES = [0, 20, 40, 60];

// 물 100g 기준 포화용액 질량의 배수
export const SOLUTION_MULTIPLIERS = [0.5, 1, 1.5, 2];

/**
 * 각 배수에 해당하는 용액 상세 정보
 */
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
