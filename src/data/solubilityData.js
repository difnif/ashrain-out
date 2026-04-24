// src/data/solubilityData.js
// 중학교 2학년 과학 교과서 표준 용해도 데이터
// 물 100g 기준 녹는 용질의 g수
//
// 출처: 중학교 과학 교과서 표준 용해도 곡선 (2022 개정 교육과정 기준)
// 커스텀 모드를 위해 0~100℃ 전 구간 보간 지원

export const SUBSTANCES = {
  KNO3: {
    id: 'KNO3',
    name: '질산칼륨',
    formula: 'KNO₃',
    // 실제 색상: 무색/흰색 → 가시성을 위해 연한 파란색으로 표시
    realColor: '무색',
    displayColor: '#4A90D9',
    displayColorLight: '#A8CCEC',
    colorNote: true, // 실제 색과 다름 → UI에서 안내 표시
    density: 2.11, // g/cm³ (침전 속도에 영향)
    // 교과서 표준 용해도 (5점)
    solubility: {
      0: 13.3,
      20: 31.6,
      40: 63.9,
      60: 109.2,
      80: 168.8,
    },
    // 전 구간 보간용 (10℃ 간격, 과학적 근거 데이터)
    fineSolubility: {
      0: 13.3, 10: 20.9, 20: 31.6, 30: 45.8, 40: 63.9,
      50: 85.5, 60: 109.2, 70: 138.0, 80: 168.8, 90: 202.0, 100: 246.0,
    },
  },
  NaCl: {
    id: 'NaCl',
    name: '염화나트륨',
    formula: 'NaCl',
    realColor: '흰색',
    displayColor: '#B0B5C2', // 연한 회색
    displayColorLight: '#DDE0E7',
    colorNote: true,
    density: 2.16,
    solubility: {
      0: 35.7,
      20: 35.9,
      40: 36.4,
      60: 37.1,
      80: 38.0,
    },
    fineSolubility: {
      0: 35.7, 10: 35.8, 20: 35.9, 30: 36.1, 40: 36.4,
      50: 36.7, 60: 37.1, 70: 37.5, 80: 38.0, 90: 38.5, 100: 39.1,
    },
  },
  CuSO4: {
    id: 'CuSO4',
    name: '황산구리',
    formula: 'CuSO₄',
    // 황산구리 오수화물은 선명한 파란색 — 실제 색 유지
    realColor: '파란색',
    displayColor: '#1E6FA8',
    displayColorLight: '#6BAADB',
    colorNote: false, // 실제 색 그대로
    density: 2.28,
    solubility: {
      0: 14.3,
      20: 20.7,
      40: 28.5,
      60: 40.0,
      80: 55.0,
    },
    fineSolubility: {
      0: 14.3, 10: 17.4, 20: 20.7, 30: 24.4, 40: 28.5,
      50: 33.9, 60: 40.0, 70: 47.0, 80: 55.0, 90: 63.6, 100: 75.4,
    },
  },
  H3BO3: {
    id: 'H3BO3',
    name: '붕산',
    formula: 'H₃BO₃',
    realColor: '흰색',
    displayColor: '#B8A5D9', // 연한 보라
    displayColorLight: '#D9CCE8',
    colorNote: true,
    density: 1.44,
    solubility: {
      0: 2.7,
      20: 5.0,
      40: 8.7,
      60: 14.8,
      80: 23.5,
    },
    fineSolubility: {
      0: 2.7, 10: 3.6, 20: 5.0, 30: 6.7, 40: 8.7,
      50: 11.5, 60: 14.8, 70: 18.7, 80: 23.5, 90: 29.5, 100: 38.0,
    },
  },
  NH4Cl: {
    id: 'NH4Cl',
    name: '염화암모늄',
    formula: 'NH₄Cl',
    realColor: '흰색',
    displayColor: '#4DB6AC', // 연한 청록
    displayColorLight: '#9FD8D1',
    colorNote: true,
    density: 1.52,
    solubility: {
      0: 29.4,
      20: 37.2,
      40: 45.8,
      60: 55.2,
      80: 65.6,
    },
    fineSolubility: {
      0: 29.4, 10: 33.3, 20: 37.2, 30: 41.4, 40: 45.8,
      50: 50.4, 60: 55.2, 70: 60.2, 80: 65.6, 90: 71.3, 100: 77.3,
    },
  },
};

export const SUBSTANCE_LIST = Object.values(SUBSTANCES);

export const PRESET_TEMPERATURES = [0, 20, 40, 60, 80];

/**
 * 물질 표시명 조회 (한글 이름 vs 화학식)
 * @param {string} substanceId
 * @param {boolean} useFormula true면 화학식, false면 한글 이름 (기본값)
 */
export function getSubstanceLabel(substanceId, useFormula = false) {
  const sub = SUBSTANCES[substanceId];
  if (!sub) return substanceId;
  return useFormula ? sub.formula : sub.name;
}

/**
 * 특정 온도에서의 용해도 조회 (선형 보간)
 * @param {string} substanceId
 * @param {number} temperature 0~100
 * @returns {number} 물 100g당 용해도 (g)
 */
export function getSolubility(substanceId, temperature) {
  const sub = SUBSTANCES[substanceId];
  if (!sub) return 0;

  const t = Math.max(0, Math.min(100, temperature));
  const fine = sub.fineSolubility;

  // 정확히 매칭되는 값이 있으면 반환
  if (fine[t] !== undefined) return fine[t];

  // 선형 보간
  const tLow = Math.floor(t / 10) * 10;
  const tHigh = tLow + 10;
  const sLow = fine[tLow];
  const sHigh = fine[tHigh];

  const ratio = (t - tLow) / 10;
  return +(sLow + (sHigh - sLow) * ratio).toFixed(2);
}

/**
 * 포화 용액 양으로부터 물/용질 질량 역산
 * 포화용액 = 물 + 용질 (포화 상태)
 * S = 용질 / 물 × 100 (용해도 공식)
 * → 물 = 포화용액 × 100 / (100 + S)
 * → 용질 = 포화용액 × S / (100 + S)
 */
export function splitSaturatedSolution(solutionMass, solubility) {
  const water = (solutionMass * 100) / (100 + solubility);
  const solute = (solutionMass * solubility) / (100 + solubility);
  return {
    water: +water.toFixed(2),
    solute: +solute.toFixed(2),
  };
}

/**
 * 석출량 계산 (방법 A — 물 100g 기준 먼저 계산 후 스케일)
 *
 * 1) 물 100g 기준 고온 포화용액 질량: 100 + S_hot
 * 2) 물 100g 기준 저온 포화용액 질량: 100 + S_cold
 * 3) 물 100g 기준 석출량: S_hot - S_cold
 * 4) 주어진 포화용액 양 비율: solutionMass / (100 + S_hot)
 * 5) 실제 석출량: (S_hot - S_cold) × 비율
 *
 * @returns {object} 계산 단계별 값
 */
export function calculatePrecipitation({ substanceId, hotTemp, coldTemp, solutionMass }) {
  const hotS = getSolubility(substanceId, hotTemp);
  const coldS = getSolubility(substanceId, coldTemp);

  const referenceSolution = 100 + hotS; // 물 100g 기준 고온 포화용액 질량
  const referencePrecipitation = Math.max(0, hotS - coldS); // 물 100g 기준 석출량
  const ratio = solutionMass / referenceSolution;
  const actualPrecipitation = referencePrecipitation * ratio;

  return {
    hotS,
    coldS,
    referenceSolution: +referenceSolution.toFixed(2),
    referencePrecipitation: +referencePrecipitation.toFixed(2),
    ratio: +ratio.toFixed(4),
    actualPrecipitation: +actualPrecipitation.toFixed(2),
    willPrecipitate: hotS > coldS,
  };
}

/**
 * 심화 모드: 초기 포화도가 100% 미만일 때
 * @param {number} saturationPercent 초기 포화도 (0~100 단위로 입력됨, %)
 */
export function calculatePrecipitationAdvanced({
  substanceId,
  hotTemp,
  coldTemp,
  solutionMass,
  saturationPercent, // 예: 70 (%)
}) {
  const hotS = getSolubility(substanceId, hotTemp);
  const coldS = getSolubility(substanceId, coldTemp);

  // 1단계: 초기 포화도에 따른 실제 녹은 용질 양 (물 100g 기준)
  const actualSoluteIn100gWater = hotS * (saturationPercent / 100);

  // 2단계: 실제 물 양 계산
  // 초기 용액 질량 = 물 + (물 × actualSolute/100)
  // solutionMass = water × (1 + actualSoluteIn100gWater/100)
  // water = solutionMass × 100 / (100 + actualSoluteIn100gWater)
  const water = (solutionMass * 100) / (100 + actualSoluteIn100gWater);
  const solute = solutionMass - water;

  // 3단계: 냉각 후 용해 가능량
  const maxSoluteAtColdTemp = (coldS * water) / 100;

  // 석출량
  const precipitation = Math.max(0, solute - maxSoluteAtColdTemp);
  const willPrecipitate = solute > maxSoluteAtColdTemp;

  return {
    hotS,
    coldS,
    saturationPercent,
    actualSoluteIn100gWater: +actualSoluteIn100gWater.toFixed(2),
    water: +water.toFixed(2),
    solute: +solute.toFixed(2),
    maxSoluteAtColdTemp: +maxSoluteAtColdTemp.toFixed(2),
    precipitation: +precipitation.toFixed(2),
    willPrecipitate,
  };
}
