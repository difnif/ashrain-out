// src/data/precipitationPresets.js
// 셋팅 모드: 교과서/문제집 빈출 시나리오
// 온도는 0/20/40/60/80℃ 고정, 물은 100g 또는 자주 쓰이는 양

import { getSolubility } from './solubilityData';

/**
 * 셋팅 모드에서 선택 가능한 포화용액 양 프리셋
 * 물 100g 기준 포화용액 질량 + 문제에서 자주 쓰이는 총량
 */
export const SOLUTION_MASS_PRESETS = [
  { label: '100g', value: 100 },
  { label: '200g', value: 200 },
  { label: '500g', value: 500 },
  { label: '포화용액(물100g 기준)', value: 'reference' }, // 동적 계산
];

/**
 * 교과서 빈출 시나리오 프리셋
 * 각 프리셋은 "고온에서 포화시킨 후 저온으로 냉각" 형태
 */
export const PRESET_SCENARIOS = [
  {
    id: 'kno3-60to20',
    title: 'KNO₃ 포화용액을 60℃ → 20℃ 냉각',
    description: '질산칼륨은 온도에 따른 용해도 변화가 커서 석출량도 큽니다.',
    substanceId: 'KNO3',
    hotTemp: 60,
    coldTemp: 20,
    solutionMassMode: 'reference', // 물 100g 기준 포화용액
    difficulty: 1,
  },
  {
    id: 'kno3-80to20',
    title: 'KNO₃ 포화용액을 80℃ → 20℃ 냉각',
    description: '온도 차가 클수록 더 많이 석출됩니다.',
    substanceId: 'KNO3',
    hotTemp: 80,
    coldTemp: 20,
    solutionMassMode: 'reference',
    difficulty: 1,
  },
  {
    id: 'nacl-80to0',
    title: 'NaCl 포화용액을 80℃ → 0℃ 냉각',
    description: '염화나트륨은 온도에 따른 용해도 변화가 매우 작습니다. 석출량을 확인해보세요.',
    substanceId: 'NaCl',
    hotTemp: 80,
    coldTemp: 0,
    solutionMassMode: 'reference',
    difficulty: 2,
  },
  {
    id: 'cuso4-60to20-200g',
    title: 'CuSO₄ 포화용액 200g을 60℃ → 20℃ 냉각',
    description: '포화용액 양이 100g이 아닐 때의 계산을 연습해봅니다.',
    substanceId: 'CuSO4',
    hotTemp: 60,
    coldTemp: 20,
    solutionMass: 200,
    difficulty: 2,
  },
  {
    id: 'h3bo3-80to20',
    title: 'H₃BO₃ 포화용액을 80℃ → 20℃ 냉각',
    description: '붕산은 용해도 자체가 작지만 온도 변화에 민감합니다.',
    substanceId: 'H3BO3',
    hotTemp: 80,
    coldTemp: 20,
    solutionMassMode: 'reference',
    difficulty: 1,
  },
  {
    id: 'nh4cl-60to0',
    title: 'NH₄Cl 포화용액을 60℃ → 0℃ 냉각',
    description: '염화암모늄의 석출량을 계산해봅니다.',
    substanceId: 'NH4Cl',
    hotTemp: 60,
    coldTemp: 0,
    solutionMassMode: 'reference',
    difficulty: 1,
  },
  {
    id: 'kno3-80to40-500g',
    title: 'KNO₃ 포화용액 500g을 80℃ → 40℃ 냉각',
    description: '대량 포화용액에서의 석출량 계산.',
    substanceId: 'KNO3',
    hotTemp: 80,
    coldTemp: 40,
    solutionMass: 500,
    difficulty: 3,
  },
  {
    id: 'compare-60to20',
    title: '60℃ → 20℃ 냉각: 물질별 비교',
    description: '같은 조건에서 물질에 따라 석출량이 어떻게 다른지 확인합니다.',
    substanceId: 'KNO3', // 기본값, UI에서 물질 선택 가능
    hotTemp: 60,
    coldTemp: 20,
    solutionMassMode: 'reference',
    difficulty: 2,
    compareMode: true, // 여러 물질 비교
  },
];

/**
 * 프리셋에서 실제 solutionMass 값 해결
 */
export function resolvePresetSolutionMass(preset) {
  if (preset.solutionMass !== undefined) return preset.solutionMass;
  if (preset.solutionMassMode === 'reference') {
    const hotS = getSolubility(preset.substanceId, preset.hotTemp);
    return +(100 + hotS).toFixed(2);
  }
  return 100;
}
