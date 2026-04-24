// EP3: 빙그레 바나나맛우유 — 바나나는 대체 얼마나 들었을까?
// 원유 86% 공개, 나머지 14%에 설탕·과즙·향·색소·정제수가 전부

export default {
  id: "banana-milk",
  title: "빙그레 바나나맛우유",
  subtitle: "바나나는 대체 몇 %?",
  emoji: "🍌",
  category: "음료",
  difficulty: "★★☆",
  servingSize: 240,
  servingUnit: "ml",
  servingWeightG: 240,   // 우유 밀도 ≈ 1.03g/ml → 거의 동일

  ingredients: [
    { key: "rawMilk", name: "원유(86%)",      icon: "🥛", color: "#FFF8E7" },
    { key: "water",   name: "정제수",          icon: "💧", color: "#D4E8F0" },
    { key: "sugar",   name: "설탕",            icon: "🍬", color: "#FFF5E0" },
    { key: "banana",  name: "바나나농축과즙",   icon: "🍌", color: "#FFE580" },
    { key: "color",   name: "카로틴(착색제)",   icon: "🟡", color: "#FFD966" },
    { key: "flavor",  name: "합성향료",         icon: "🌿", color: "#D4E8C0" },
  ],

  nutrition: {
    // 240ml당 영양성분
    calories: 195,
    fat: 7,
    saturatedFat: 4.5,
    transFat: 0,
    protein: 7,
    carbs: 26,
    sugar: 26,
    cholesterol: 25,
    sodium: 110,
  },

  refData: {
    rawMilk: { fat: 3.6, protein: 3.2, carbs: 4.8, sugar: 4.8,
               cholesterol: 14, sodium: 43, desc: "국산 원유 (전지유)" },
    water:   { fat: 0, protein: 0, carbs: 0, sugar: 0,
               cholesterol: 0, sodium: 0, desc: "정제수" },
    sugar:   { fat: 0, protein: 0, carbs: 100, sugar: 100,
               cholesterol: 0, sodium: 0, desc: "백설탕" },
    banana:  { fat: 0.1, protein: 0.4, carbs: 65, sugar: 50,
               cholesterol: 0, sodium: 2, desc: "바나나농축과즙 (6배 농축)" },
    color:   { fat: 0, protein: 0, carbs: 0, sugar: 0,
               cholesterol: 0, sodium: 0, desc: "카로틴 (미량, 노란색)" },
    flavor:  { fat: 0, protein: 0, carbs: 0, sugar: 0,
               cholesterol: 0, sodium: 0, desc: "바나나향+바닐라향 (미량)" },
  },

  constraints: [
    {
      key: "rawMilk",
      min: 85, max: 90,
      title: "원유 함량 — 법적 기준",
      reason: "빙그레 공식: 국내산 원유 85% 이상. '가공유' 분류를 유지하려면 원유가 핵심.",
      tooLow: "85% 미만 → '유음료'로 분류 변경. 소비자 신뢰 하락.",
      tooHigh: "90% 초과 → 단맛·바나나향 넣을 공간 부족. 일반 우유와 다를 게 없어짐.",
    },
    {
      key: "sugar",
      min: 5, max: 10,
      title: "설탕의 달콤함 설계",
      reason: "가공유의 단맛은 설탕 + 원유의 유당(4.8%) 조합. 너무 달면 느끼하고, 부족하면 밍밍해요.",
      tooLow: "5% 미만 → 바나나맛이 안 나고 밍밍한 우유. 유당만으로는 부족.",
      tooHigh: "10% 초과 → 너무 달아서 한 병 다 못 마심. 음료가 아닌 시럽.",
    },
    {
      key: "banana",
      min: 0.5, max: 3,
      title: "과즙의 비밀",
      reason: "바나나 '맛'이지 바나나 '주스'가 아니에요. 농축과즙이라 소량으로도 충분한 풍미.",
      tooLow: "0.5% 미만 → 법적으로 '바나나맛' 표기 못 함.",
      tooHigh: "3% 초과 → 갈변 반응으로 색이 갈색으로. 유통기한 단축.",
    },
  ],

  equations: [
    {
      label: "총량",
      latex: "x₁ + x₂ + x₃ + x₄ = 240 (착색제·향료 미량 제외)",
      note: "240ml ≈ 240g (우유 밀도 ~1)",
    },
    {
      label: "지방",
      latex: "0.036 · x₁ + 0 · x₂ + 0 · x₃ + 0.001 · x₄ = 7",
      note: "지방은 거의 전부 원유에서. 지방 7g → 원유 약 194g → 약 81%?",
    },
    {
      label: "단백질",
      latex: "0.032 · x₁ + 0 · x₂ + 0 · x₃ + 0.004 · x₄ = 7",
      note: "단백질도 거의 원유. 7g → 원유 약 219g → 약 91%? 지방과 불일치!",
    },
    {
      label: "탄수화물",
      latex: "0.048 · x₁ + 0 · x₂ + 1.0 · x₃ + 0.65 · x₄ = 26",
      note: "원유 유당 + 설탕 + 과즙 당분 = 26g",
    },
  ],

  solveSteps: [
    {
      title: "1단계: 공개된 숫자부터",
      body: "빙그레가 '원유 86%'라고 공개했어요. 240ml의 86% = 약 206g이 원유!",
      highlight: "rawMilk",
      formula: "x₁ = 240 × 0.86 = 206.4g",
    },
    {
      title: "2단계: 원유의 영양소 기여분 계산",
      body: "원유 206g이 가져오는 영양소를 계산하면:",
      highlight: "rawMilk",
      formula: "지방: 206 × 0.036 = 7.4g (표기 7g과 거의 일치!)\n단백질: 206 × 0.032 = 6.6g (표기 7g과 거의 일치!)\n탄수화물: 206 × 0.048 = 9.9g (유당)",
    },
    {
      title: "3단계: 설탕 역산",
      body: "총 탄수화물 26g에서 유당 9.9g을 빼면, 설탕+과즙의 당분이에요.",
      highlight: "sugar",
      formula: "26 - 9.9 = 16.1g (설탕 + 과즙 당분)\n과즙이 2g 정도라면 과즙 당분 ≈ 1.3g\n→ 설탕 ≈ 14.8g → 240ml 중 약 6.2%",
    },
    {
      title: "4단계: 바나나는 정말 얼마나?",
      body: "나머지 = 정제수 + 과즙. 원유 206g + 설탕 15g + 과즙 2g = 223g. 나머지 17g이 정제수!",
      highlight: "banana",
      formula: "240 - 206 - 15 - 2 = 17g (정제수)\n바나나농축과즙: 겨우 ~2g (약 0.8%)\n→ 바나나 원액 환산: ~12g (6배 농축이니까)",
    },
  ],

  solution: {
    rawMilk: { best: 206, range: [204, 210], unit: "g" },
    water:   { best: 17,  range: [14, 20],   unit: "g" },
    sugar:   { best: 15,  range: [13, 17],   unit: "g" },
    banana:  { best: 2,   range: [1, 3],     unit: "g" },
    color:   { best: 0.02, range: [0.01, 0.05], unit: "g" },
    flavor:  { best: 0.1, range: [0.05, 0.2], unit: "g" },
  },

  surprises: [
    "바나나 농축과즙은 겨우 2g! 240ml 중 0.8%... '바나나맛'이지 '바나나'가 아니에요.",
    "원유가 86%로 압도적. 사실상 '설탕 넣은 우유에 바나나향 한 방울' 수준.",
    "당류 26g = 각설탕 6.5개분. 하지만 그중 10g은 우유의 자연 유당이에요.",
    "1974년 출시 당시에는 진짜 바나나 과즙 0%! 합성향료만 썼어요. 2010년부터 과즙 1% 추가.",
  ],

  steps: [
    { type: "intro",      title: "오늘의 타겟" },
    { type: "clue",       title: "단서 공개 — 영양성분표" },
    { type: "guess",      title: "느낌으로 맞춰봐" },
    { type: "refdata",    title: "각 재료의 정체" },
    { type: "equation",   title: "방정식을 세운다" },
    { type: "constraint", title: "식품 과학의 제약" },
    { type: "solve",      title: "풀이 — 한 단계씩" },
    { type: "reveal",     title: "추정 레시피 공개" },
    { type: "compare",    title: "네 추측은 어땠을까?" },
  ],
};
