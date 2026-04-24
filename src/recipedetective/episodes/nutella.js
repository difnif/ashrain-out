// EP2: 누텔라 — 초콜릿잼의 충격적 정체
// 공식 사이트에서 헤이즐넛 13%, 탈지분유 8.7%, 코코아 7.4%를 공개 → 역산 결과 검증 가능

export default {
  id: "nutella",
  title: "누텔라",
  subtitle: "초콜릿잼의 충격적 정체",
  emoji: "🍫",
  category: "스프레드",
  difficulty: "★☆☆",
  servingSize: 100,
  servingUnit: "g",
  servingWeightG: 100,

  ingredients: [
    { key: "sugar",   name: "설탕",              icon: "🍬", color: "#FFF5E0" },
    { key: "palmOil", name: "식물성지방(팜유)",    icon: "🫒", color: "#E8D5A0" },
    { key: "hazel",   name: "헤이즐넛(13%)",      icon: "🌰", color: "#C4956A" },
    { key: "milk",    name: "탈지분유(8.7%)",     icon: "🥛", color: "#E8E0D4" },
    { key: "cocoa",   name: "저지방코코아(7.4%)", icon: "🍫", color: "#6B3A2A" },
    { key: "lecithin",name: "레시틴",             icon: "🧪", color: "#D4C8A0" },
    { key: "vanilla", name: "바닐린향",           icon: "🌿", color: "#D4E8C0" },
  ],

  nutrition: {
    calories: 545,
    fat: 30.9,
    saturatedFat: 10.6,
    transFat: 0,
    protein: 6.3,
    carbs: 60.5,
    sugar: 56.3,
    cholesterol: 4,
    sodium: 42,
  },

  refData: {
    sugar:    { fat: 0, protein: 0, carbs: 99.8, sugar: 99.8, desc: "백설탕" },
    palmOil:  { fat: 100, protein: 0, carbs: 0, sugar: 0, desc: "팜유 (식물성 유지)" },
    hazel:    { fat: 60.8, protein: 15.0, carbs: 16.7, sugar: 4.3, desc: "헤이즐넛 (볶은 것)" },
    milk:     { fat: 0.8, protein: 36.2, carbs: 51.5, sugar: 51.5, desc: "탈지분유" },
    cocoa:    { fat: 8.0, protein: 19.6, carbs: 57.9, sugar: 1.8, desc: "저지방 코코아파우더" },
    lecithin: { fat: 97, protein: 0, carbs: 0, sugar: 0, desc: "대두 레시틴 (유화제, 미량)" },
    vanilla:  { fat: 0, protein: 0, carbs: 0, sugar: 0, desc: "합성향료 (미량)" },
  },

  constraints: [
    {
      key: "sugar",
      min: 45, max: 60,
      title: "설탕의 보존과학",
      reason: "설탕 농도가 높으면 수분 활성도(Aw)가 낮아져 미생물이 자라지 못해요. 누텔라가 상온 보관 가능한 이유!",
      tooLow: "45% 미만 → 수분 활성도 높아져 곰팡이 발생 위험. 냉장 필수.",
      tooHigh: "60% 초과 → 너무 달아서 다른 맛이 묻힘. 까슬까슬한 설탕 결정 생김.",
    },
    {
      key: "palmOil",
      min: 15, max: 35,
      title: "팜유의 질감 물리학",
      reason: "팜유는 실온에서 반고체. 누텔라의 '발리는 질감(spreadability)'을 만드는 핵심.",
      tooLow: "15% 미만 → 너무 뻑뻑해서 빵에 안 발림. 반죽 같은 식감.",
      tooHigh: "35% 초과 → 너무 기름져서 흘러내림. 유지 분리 발생.",
    },
    {
      key: "hazel",
      min: 13, max: 13,
      title: "헤이즐넛 — EU 규정",
      reason: "EU 규정상 '헤이즐넛 스프레드'로 분류되려면 헤이즐넛 최소 13% 필수. 누텔라 공식 표기도 정확히 13%.",
      tooLow: "13% 미만 → EU에서 '초콜릿 스프레드'로 분류 변경. 브랜드 정체성 상실.",
      tooHigh: "이 이상 넣으면 원가 상승. 이미 최소치로 맞춤.",
    },
  ],

  equations: [
    {
      label: "총량",
      latex: "x₁ + x₂ + x₃ + x₄ + x₅ = 100 (레시틴·향 미량 제외)",
      note: "5가지 주 재료의 합 = 거의 100g",
    },
    {
      label: "지방",
      latex: "0 · x₁ + 1.0 · x₂ + 0.608 · x₃ + 0.008 · x₄ + 0.08 · x₅ = 30.9",
      note: "팜유(100% 지방)와 헤이즐넛(60.8%)이 지방의 대부분",
    },
    {
      label: "단백질",
      latex: "0 · x₁ + 0 · x₂ + 0.15 · x₃ + 0.362 · x₄ + 0.196 · x₅ = 6.3",
      note: "탈지분유(36.2%)와 코코아(19.6%)가 단백질 기여",
    },
    {
      label: "탄수화물",
      latex: "0.998 · x₁ + 0 · x₂ + 0.167 · x₃ + 0.515 · x₄ + 0.579 · x₅ = 60.5",
      note: "설탕(99.8%)이 압도적. 탈지분유(51.5%)와 코코아(57.9%)도 기여",
    },
  ],

  solveSteps: [
    {
      title: "1단계: 공개된 숫자부터",
      body: "누텔라 공식 사이트가 이미 3가지를 알려줬어요! 헤이즐넛 13%, 탈지분유 8.7%, 코코아 7.4%.",
      highlight: "hazel",
      formula: "x₃ = 13g, x₄ = 8.7g, x₅ = 7.4g — 여기서 시작!",
    },
    {
      title: "2단계: 지방으로 팜유 역산",
      body: "이미 아는 3가지의 지방 기여분을 빼면, 나머지 지방 = 팜유가 담당한 양이에요.",
      highlight: "palmOil",
      formula: "30.9 - (13×0.608 + 8.7×0.008 + 7.4×0.08)\n= 30.9 - (7.9 + 0.07 + 0.59) = 22.3g\n팜유 지방 100% → x₂ ≈ 22.3g",
    },
    {
      title: "3단계: 나머지 = 설탕",
      body: "총 100g에서 팜유·헤이즐넛·탈지분유·코코아를 빼면?",
      highlight: "sugar",
      formula: "100 - 22.3 - 13 - 8.7 - 7.4 - (레시틴~0.5)\n≈ 48.1g → 설탕이 거의 절반!",
    },
    {
      title: "4단계: 검증 — 탄수화물 맞는지?",
      body: "설탕 48g × 0.998 + 기타 탄수화물 = 47.9 + 2.2 + 4.5 + 4.3 ≈ 58.9g. 표기 60.5g과 약간 차이 → 설탕이 좀 더 많을 수도 (50~55g 범위).",
      highlight: null,
      formula: "당류 56.3g 중 설탕 외 기여분(우유 유당 등) ≈ 5g\n→ 설탕 ≈ 51~55g (최종 추정)",
    },
  ],

  solution: {
    sugar:    { best: 52,  range: [48, 56], unit: "g" },
    palmOil:  { best: 22,  range: [20, 25], unit: "g" },
    hazel:    { best: 13,  range: [13, 13], unit: "g" },
    milk:     { best: 8.7, range: [8.7, 8.7], unit: "g" },
    cocoa:    { best: 7.4, range: [7.4, 7.4], unit: "g" },
    lecithin: { best: 0.5, range: [0.3, 0.7], unit: "g" },
    vanilla:  { best: 0.1, range: [0.05, 0.2], unit: "g" },
  },

  surprises: [
    "설탕이 52%! 누텔라의 절반 이상이 설탕이에요. '초콜릿잼'이 아니라 '설탕잼'에 가까워요.",
    "코코아는 고작 7.4%. 초콜릿색은 진하지만 실제 코코아 함량은 생각보다 훨씬 적어요.",
    "헤이즐넛도 딱 13% — EU 규정 최소치 정확히 맞춤. 1g이라도 줄이면 '헤이즐넛 스프레드' 못 써요.",
    "팜유 22%가 누텔라의 부드러움 비결. 빵에 잘 발리는 건 팜유 덕분이에요.",
  ],
};
