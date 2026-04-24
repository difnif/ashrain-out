// EP1: 하겐다즈 바닐라 — 5가지 재료의 비밀
// 영양성분표 + 식품 과학 제약 조건으로 레시피 역산

export default {
  id: "haagendazs-vanilla",
  title: "하겐다즈 바닐라",
  subtitle: "5가지 재료의 비밀",
  emoji: "🍨",
  category: "아이스크림",
  difficulty: "★★☆",
  servingSize: 100,
  servingUnit: "ml",
  // 아이스크림 밀도 ~0.55g/ml → 100ml ≈ 55g 이지만
  // 영양성분표는 100ml 기준으로 나옴. 무게 환산 필요.
  // 하겐다즈는 오버런이 낮아서 밀도 ~0.9g/ml → 100ml ≈ 90g
  servingWeightG: 90,

  // 원재료명 (함량 순 — 법적 기재 순서)
  ingredients: [
    { key: "cream",   name: "크림(생크림)", icon: "🧈", color: "#F5E6C8" },
    { key: "milk",    name: "농축탈지우유", icon: "🥛", color: "#E8E0D4" },
    { key: "sugar",   name: "설탕",        icon: "🍬", color: "#FFF5E0" },
    { key: "yolk",    name: "난황",        icon: "🥚", color: "#FFD966" },
    { key: "vanilla", name: "바닐라향",    icon: "🌿", color: "#D4E8C0" },
  ],

  // 영양성분표 (100ml당)
  nutrition: {
    calories: 224,       // kcal
    fat: 15.2,           // g
    saturatedFat: 10.2,  // g
    transFat: 0.5,       // g
    protein: 3.8,        // g
    carbs: 17.9,         // g
    sugar: 17.9,         // g
    cholesterol: 86,     // mg
    sodium: 58,          // mg
  },

  // 각 원재료의 표준 영양소 조성 (100g당)
  // 출처: USDA FoodData Central + 식약처 DB
  refData: {
    cream:   { fat: 36.1, saturatedFat: 23.0, protein: 2.05, carbs: 2.79, sugar: 2.79,
               cholesterol: 137, sodium: 38, desc: "Heavy cream (유지방 36%)" },
    milk:    { fat: 0.18, saturatedFat: 0.12, protein: 10.1, carbs: 14.9, sugar: 14.9,
               cholesterol: 7, sodium: 160, desc: "농축탈지우유 (고형분 ~25%)" },
    sugar:   { fat: 0, saturatedFat: 0, protein: 0, carbs: 99.8, sugar: 99.8,
               cholesterol: 0, sodium: 0, desc: "백설탕" },
    yolk:    { fat: 26.5, saturatedFat: 9.55, protein: 15.9, carbs: 0.73, sugar: 0.56,
               cholesterol: 1085, sodium: 48, desc: "달걀 노른자 (액란)" },
    vanilla: { fat: 0, saturatedFat: 0, protein: 0, carbs: 0, sugar: 0,
               cholesterol: 0, sodium: 0, desc: "천연 바닐라향 (미량)" },
  },

  // 식품 과학 제약 조건 — "이 범위 밖이면 다른 음식이 된다"
  constraints: [
    {
      key: "sugar",
      min: 12, max: 18,
      title: "설탕의 물리학",
      reason: "설탕은 맛만 내는 게 아니에요. 빙점을 낮춰서 아이스크림이 부드럽게 얼게 해줘요.",
      tooLow: "12% 미만 → 빙점이 높아져 얼음 결정이 커짐. 까끌까끌한 셔벗처럼 됨.",
      tooHigh: "18% 초과 → 빙점이 너무 낮아져 가정용 냉동고(-18℃)에서 안 얼어요. 걸쭉한 시럽 상태.",
    },
    {
      key: "yolk",
      min: 4, max: 10,
      title: "난황의 역할",
      reason: "난황의 레시틴이 유화제 역할. 기름(크림)과 물(우유)이 분리되지 않게 잡아줘요.",
      tooLow: "4% 미만 → 유화 실패. 크림과 수분이 분리돼 얼음 + 기름 층이 됨.",
      tooHigh: "10% 초과 → 계란 비린내가 아이스크림을 지배. 커스터드 푸딩에 가까워짐.",
    },
    {
      key: "cream",
      min: 28, max: 50,
      title: "크림의 법칙",
      reason: "크림 비율이 곧 유지방 함량. 프리미엄 아이스크림의 정체성을 결정해요.",
      tooLow: "유지방 6% 미만 → 법적으로 '아이스크림' 아님. '아이스밀크'로 분류.",
      tooHigh: "50% 초과 → 너무 무겁고 버터에 가까움. 스쿱이 안 됨.",
    },
  ],

  // 풀이 과정에서 사용할 방정식 (display용)
  equations: [
    {
      label: "총량",
      latex: "x_1 + x_2 + x_3 + x_4 + x_5 = 90",
      note: "100ml ≈ 90g (하겐다즈는 공기가 적어서 무거워요)",
    },
    {
      label: "지방",
      latex: "0.361 x_1 + 0.002 x_2 + 0 \\cdot x_3 + 0.265 x_4 = 15.2",
      note: "크림과 난황이 지방의 거의 전부",
    },
    {
      label: "단백질",
      latex: "0.021 x_1 + 0.101 x_2 + 0 \\cdot x_3 + 0.159 x_4 = 3.8",
      note: "농축탈지우유와 난황이 단백질 기여",
    },
    {
      label: "탄수화물",
      latex: "0.028 x_1 + 0.149 x_2 + 0.998 x_3 + 0.007 x_4 = 17.9",
      note: "설탕이 압도적. 우유의 유당도 약간",
    },
  ],

  // 풀이 단계별 서술 (EpisodePlayer가 이 순서로 보여줌)
  solveSteps: [
    {
      title: "1단계: 가장 쉬운 것부터",
      body: "탄수화물 17.9g 중 대부분은 설탕이에요. 우유의 유당과 크림의 탄수화물을 빼면...",
      highlight: "sugar",
      formula: "x₃ ≈ 17.9 - (우유 유당 + 크림 탄수화물) ≈ 13~15g",
    },
    {
      title: "2단계: 난황을 좁힌다",
      body: "난황은 식품 과학적으로 4~10% 범위. 콜레스테롤 86mg이라는 추가 단서도 있어요.",
      highlight: "yolk",
      formula: "난황 콜레스테롤: 1085mg/100g → 86mg이면 약 7.9g",
    },
    {
      title: "3단계: 크림과 우유를 연립",
      body: "난황 ~8g을 대입하면, 지방/단백질 방정식 두 개에 미지수 두 개. 연립방정식이 풀려요!",
      highlight: "cream",
      formula: "0.361x₁ + 0.002x₂ = 15.2 - 2.12 = 13.08\n0.021x₁ + 0.101x₂ = 3.8 - 1.27 = 2.53",
    },
    {
      title: "4단계: 검증",
      body: "함량 순서 조건(크림 > 우유 > 설탕 > 난황)에 맞는지 확인!",
      highlight: null,
      formula: "x₁(~35) > x₂(~22) > x₃(~14) > x₄(~8) ✓",
    },
  ],

  // 정답 (계산 결과 — 범위 + 대표값)
  // 단위: g per 100ml serving (≈90g total)
  solution: {
    cream:   { best: 35, range: [32, 40], unit: "g" },
    milk:    { best: 22, range: [18, 26], unit: "g" },
    sugar:   { best: 14, range: [12, 16], unit: "g" },
    yolk:    { best: 8,  range: [6, 10],  unit: "g" },
    vanilla: { best: 0.5, range: [0.1, 1], unit: "g" },
    water:   { best: 10.5, range: [8, 14], unit: "g", note: "정제수 (잔여분)" },
  },

  // 서프라이즈 (결과 공개 후 보여줄 충격 포인트)
  surprises: [
    "크림이 전체의 약 39%! 거의 절반 가까이가 생크림이에요.",
    "설탕은 15% 정도. 의외로 적죠? 진짜 단맛은 크림의 유지방이 만들어요.",
    "난황이 8%나! 달걀 노른자 하나(약 18g)의 거의 절반이 들어가요.",
    "하겐다즈가 비싼 이유: 공기(오버런) 25%뿐. 저가 아이스크림은 100%까지 넣어요.",
  ],
};
