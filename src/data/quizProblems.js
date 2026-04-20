// quizProblems.js — 스피드 퀴즈용 문제 풀
// 담당: 퀴즈 채팅방 전담 파일
// 범위: 중2 교과 + 중2에서 자주 쓰이는 중1 개념 (각·다각형·평행선·이등변삼각형)
// 단원 구분 없이 랜덤 셔플로 섞여 출제됨
//
// 문제 스키마:
//   - id: 고유 ID
//   - type: "ox" | "choice" | "fill_blank"
//   - question: 문제 본문 (QuizPlayer는 평문 렌더 → ^, (), ... 표기 사용)
//   - choices?: string[] (choice 전용)
//   - answer: boolean (ox) | number (choice, index) | string (fill_blank)
//   - explain: 해설 (선택 후 노출)
//
// fill_blank 정답 비교: trim() + 공백 제거 후 === (대소문자 구분 有, 한글 정확히)

export const SAMPLE_PROBLEMS = [
  // ═══════════════════════════════════════════════
  // [1] 외심·내심·합동 기본 (기존 q1~q12, 유지)
  // ═══════════════════════════════════════════════
  {
    id: "q1", type: "ox",
    question: "삼각형의 외심은 항상 삼각형 내부에 있다.",
    answer: false,
    explain: "둔각삼각형에서는 외심이 삼각형 외부에 있습니다.",
  },
  {
    id: "q2", type: "ox",
    question: "삼각형의 내심은 세 내각의 이등분선의 교점이다.",
    answer: true,
    explain: "내심은 세 내각의 이등분선이 만나는 점입니다.",
  },
  {
    id: "q3", type: "ox",
    question: "SSS 합동 조건에서 세 변의 길이가 같으면 두 삼각형은 합동이다.",
    answer: true,
    explain: "세 변의 길이가 각각 같으면 SSS 합동입니다.",
  },
  {
    id: "q4", type: "ox",
    question: "SAS 합동에서 S는 변(Side), A는 각(Angle)을 의미한다.",
    answer: true,
    explain: "SAS는 두 변과 그 끼인각이 같을 때의 합동 조건입니다.",
  },
  {
    id: "q5", type: "ox",
    question: "이등변삼각형의 꼭지각의 이등분선은 밑변을 수직이등분한다.",
    answer: true,
    explain: "이등변삼각형에서 꼭지각의 이등분선은 밑변의 수직이등분선이 됩니다.",
  },
  {
    id: "q6", type: "ox",
    question: "삼각형의 외심에서 세 꼭짓점까지의 거리는 모두 같다.",
    answer: true,
    explain: "외심은 외접원의 중심이므로 세 꼭짓점까지의 거리(반지름)가 같습니다.",
  },
  {
    id: "q7", type: "ox",
    question: "내접원의 반지름이 클수록 삼각형의 넓이가 크다.",
    answer: false,
    explain: "넓이 = 내접원 반지름 × 둘레 ÷ 2이므로, 둘레도 함께 고려해야 합니다.",
  },
  {
    id: "q8", type: "ox",
    question: "직각삼각형에서 외심은 빗변의 중점이다.",
    answer: true,
    explain: "직각삼각형의 외심은 빗변의 중점에 위치합니다.",
  },
  {
    id: "q9", type: "choice",
    question: "삼각형의 내심에서 세 변까지의 거리가 모두 같은 이유는?",
    choices: ["외접원의 중심이므로", "내접원의 중심이므로", "무게중심이므로", "수심이므로"],
    answer: 1,
    explain: "내심은 내접원의 중심이고, 내접원은 세 변에 모두 접하므로 세 변까지의 거리가 같습니다.",
  },
  {
    id: "q10", type: "choice",
    question: "두 삼각형이 합동이 아닌 조건은?",
    choices: ["SSS", "SAS", "ASA", "SSA"],
    answer: 3,
    explain: "SSA(두 변과 끼인각이 아닌 각)는 합동 조건이 아닙니다.",
  },
  {
    id: "q11", type: "fill_blank",
    question: "삼각형 ABC에서 AB=DE, BC=EF, AC=DF이면\n△ABC ≅ △DEF ( [___] 합동)",
    answer: "SSS",
    explain: "세 변의 길이가 각각 같으므로 SSS 합동입니다.",
  },
  {
    id: "q12", type: "fill_blank",
    question: "삼각형의 외심은 세 변의 [___]의 교점이다.",
    answer: "수직이등분선",
    explain: "외심은 세 변의 수직이등분선이 만나는 점입니다.",
  },

  // ═══════════════════════════════════════════════
  // [2] 순환소수 → 분수 (중2 · 유리수와 순환소수)
  // 표기 규칙: 반복 숫자를 괄호로 표시. 예) 0.(34) = 0.343434...
  // ═══════════════════════════════════════════════
  {
    id: "q13", type: "fill_blank",
    question: "0.333... 을 기약분수로 나타내면 1/[___]",
    answer: "3",
    explain: "0.(3) = 3/9 = 1/3 (순환마디 3, 1자리이므로 분모 9)",
  },
  {
    id: "q14", type: "fill_blank",
    question: "0.171717... = [___]/99",
    answer: "17",
    explain: "순환마디가 2자리(17)이면 분모는 99. 0.(17) = 17/99",
  },
  {
    id: "q15", type: "choice",
    question: "순환마디가 3자리인 순수 순환소수의 분모는? (약분 전)",
    choices: ["9", "99", "999", "9999"],
    answer: 2,
    explain: "순환마디 n자리 → 분모는 9를 n번 쓴 수. 3자리면 999.",
  },
  {
    id: "q16", type: "fill_blank",
    question: "1.2343434... = (1234-[___])/990",
    answer: "12",
    explain: "혼합 순환소수 공식: (전체를 쓴 수 - 순환 안 하는 부분) / 990. 여기선 1234-12 = 1222 → 1222/990",
  },
  {
    id: "q17", type: "fill_blank",
    question: "0.555... = 5/[___]",
    answer: "9",
    explain: "순환마디 5, 1자리이므로 분모 9. 0.(5) = 5/9",
  },
  {
    id: "q18", type: "ox",
    question: "모든 순환소수는 분수로 나타낼 수 있다.",
    answer: true,
    explain: "순환소수는 무한소수 중에서도 규칙이 있어 분수로 변환이 가능합니다.",
  },
  {
    id: "q19", type: "ox",
    question: "0.101001000100001... 은 순환소수이다.",
    answer: false,
    explain: "규칙은 있지만 일정한 숫자 배열이 반복되지 않으므로 순환소수가 아닙니다 (비순환 무한소수).",
  },
  {
    id: "q20", type: "fill_blank",
    question: "0.272727... = 27/[___]",
    answer: "99",
    explain: "순환마디 27, 2자리이므로 분모 99. 기약하면 3/11.",
  },
  {
    id: "q21", type: "fill_blank",
    question: "0.1222... = (12-[___])/90",
    answer: "1",
    explain: "혼합 순환소수 0.1(2): (12-1)/90 = 11/90. 순환 안 하는 부분이 한 자리(1)라 분모는 90.",
  },
  {
    id: "q22", type: "choice",
    question: "다음 중 유한소수로 나타낼 수 있는 분수는?",
    choices: ["1/3", "1/6", "1/7", "3/20"],
    answer: 3,
    explain: "분모의 소인수가 2와 5뿐일 때만 유한소수. 20 = 2²×5 → 유한소수 OK.",
  },

  // ═══════════════════════════════════════════════
  // [3] 제곱수의 일의 자리 수 규칙 (지수·수의 성질)
  // ═══════════════════════════════════════════════
  {
    id: "q23", type: "fill_blank",
    question: "2의 거듭제곱 일의 자리 수: 2, 4, 8, 6, 2, 4, [___], 6",
    answer: "8",
    explain: "2^n의 일의 자리는 2,4,8,6 주기 4로 반복.",
  },
  {
    id: "q24", type: "fill_blank",
    question: "3의 거듭제곱 일의 자리 수: 3, 9, 7, 1, 3, 9, 7, [___]",
    answer: "1",
    explain: "3^n의 일의 자리는 3,9,7,1 주기 4로 반복.",
  },
  {
    id: "q25", type: "fill_blank",
    question: "7의 거듭제곱 일의 자리 수: 7, 9, 3, 1, 7, [___], 3, 1",
    answer: "9",
    explain: "7^n의 일의 자리는 7,9,3,1 주기 4로 반복.",
  },
  {
    id: "q26", type: "fill_blank",
    question: "2^100 의 일의 자리 수는? [___]",
    answer: "6",
    explain: "주기 4. 100÷4 = 25 나머지 0 → 주기의 마지막 값 6.",
  },
  {
    id: "q27", type: "fill_blank",
    question: "3^25 의 일의 자리 수는? [___]",
    answer: "3",
    explain: "주기 4. 25÷4 = 6 나머지 1 → 주기의 1번째 값 3.",
  },
  {
    id: "q28", type: "choice",
    question: "일의 자리 수가 6인 거듭제곱은?",
    choices: ["2^5", "3^4", "2^8", "7^2"],
    answer: 2,
    explain: "2^5=32(2), 3^4=81(1), 2^8=256(6) ✓, 7^2=49(9).",
  },
  {
    id: "q29", type: "fill_blank",
    question: "5^n 의 일의 자리 수는 항상 [___]",
    answer: "5",
    explain: "5를 몇 번 곱해도 일의 자리는 항상 5.",
  },
  {
    id: "q30", type: "fill_blank",
    question: "6^n 의 일의 자리 수는 항상 [___]",
    answer: "6",
    explain: "6을 몇 번 곱해도 일의 자리는 항상 6.",
  },
  {
    id: "q31", type: "fill_blank",
    question: "4^n 의 일의 자리 수: 4, 6, 4, [___], 4, 6",
    answer: "6",
    explain: "4^n의 일의 자리는 4,6 주기 2로 반복.",
  },
  {
    id: "q32", type: "fill_blank",
    question: "9^n 의 일의 자리 수: 9, 1, 9, [___], 9, 1",
    answer: "1",
    explain: "9^n의 일의 자리는 9,1 주기 2로 반복.",
  },
  {
    id: "q33", type: "fill_blank",
    question: "8^50 의 일의 자리 수는? [___]",
    answer: "4",
    explain: "8^n 주기: 8,4,2,6 (주기 4). 50÷4 = 12 나머지 2 → 2번째 값 4.",
  },

  // ═══════════════════════════════════════════════
  // [4] 자릿수 판정 (10의 거듭제곱 변환)
  // ═══════════════════════════════════════════════
  {
    id: "q34", type: "fill_blank",
    question: "3 × 2^5 × 5^5 는 [___]자리 수",
    answer: "6",
    explain: "3 × (2×5)^5 = 3 × 10^5 = 300000 → 6자리.",
  },
  {
    id: "q35", type: "fill_blank",
    question: "2^4 × 5^6 은 [___]자리 수",
    answer: "6",
    explain: "2^4 × 5^4 × 5^2 = 10^4 × 25 = 250000 → 6자리.",
  },
  {
    id: "q36", type: "fill_blank",
    question: "2^7 × 5^4 는 [___]자리 수",
    answer: "5",
    explain: "2^3 × (2^4 × 5^4) = 8 × 10^4 = 80000 → 5자리.",
  },
  {
    id: "q37", type: "fill_blank",
    question: "2^3 × 5^5 는 [___]자리 수",
    answer: "5",
    explain: "(2^3 × 5^3) × 5^2 = 10^3 × 25 = 25000 → 5자리.",
  },
  {
    id: "q38", type: "fill_blank",
    question: "7 × 2^6 × 5^6 은 [___]자리 수",
    answer: "7",
    explain: "7 × 10^6 = 7000000 → 7자리.",
  },
  {
    id: "q39", type: "choice",
    question: "2^10 × 5^8 은 몇 자리 수인가?",
    choices: ["8자리", "9자리", "10자리", "11자리"],
    answer: 1,
    explain: "2^2 × (2^8 × 5^8) = 4 × 10^8 = 400,000,000 → 9자리.",
  },
  {
    id: "q40", type: "fill_blank",
    question: "5 × 2^4 × 5^3 은 [___]자리 수",
    answer: "5",
    explain: "5 × 5^3 = 5^4 이므로 2^4 × 5^4 = 10^4 = 10000 → 5자리.",
  },

  // ═══════════════════════════════════════════════
  // [5] 외심 응용 (∠BOC = 2∠A, 빗변=지름 등)
  // ═══════════════════════════════════════════════
  {
    id: "q41", type: "fill_blank",
    question: "직각삼각형의 빗변이 12일 때, 외접원의 반지름은 [___]",
    answer: "6",
    explain: "직각삼각형의 외접원 반지름 = 빗변 ÷ 2 = 12 ÷ 2 = 6.",
  },
  {
    id: "q42", type: "fill_blank",
    question: "삼각형 ABC의 외심 O에 대해 ∠A=30° 이면 ∠BOC = [___]°",
    answer: "60",
    explain: "중심각은 원주각의 2배. ∠BOC = 2∠A = 60°.",
  },
  {
    id: "q43", type: "fill_blank",
    question: "외심에서 세 꼭짓점까지의 거리는 외접원의 [___]이다 (세 글자)",
    answer: "반지름",
    explain: "외심은 외접원의 중심, 꼭짓점까지의 거리가 곧 반지름.",
  },
  {
    id: "q44", type: "ox",
    question: "정삼각형의 외심과 무게중심은 일치한다.",
    answer: true,
    explain: "정삼각형은 외심·내심·무게중심·수심이 모두 한 점에서 만납니다.",
  },
  {
    id: "q45", type: "choice",
    question: "둔각삼각형의 외심은 어디에 있나?",
    choices: ["삼각형 내부", "삼각형 외부", "한 변 위", "꼭짓점"],
    answer: 1,
    explain: "예각삼각형: 내부 / 직각삼각형: 빗변 위 / 둔각삼각형: 외부.",
  },
  {
    id: "q46", type: "fill_blank",
    question: "외접원의 반지름이 7인 직각삼각형의 빗변의 길이는 [___]",
    answer: "14",
    explain: "직각삼각형의 빗변 = 2 × 외접원의 반지름 = 2 × 7 = 14.",
  },
  {
    id: "q47", type: "fill_blank",
    question: "∠A=50° 인 삼각형의 외심 O에 대해 ∠BOC = [___]°",
    answer: "100",
    explain: "∠BOC = 2∠A = 2 × 50° = 100°.",
  },

  // ═══════════════════════════════════════════════
  // [6] 내심 응용 (S = r·s, ∠BIC = 90° + ∠A/2)
  // ═══════════════════════════════════════════════
  {
    id: "q48", type: "fill_blank",
    question: "넓이 24, 둘레 24인 삼각형의 내접원 반지름은 [___]",
    answer: "2",
    explain: "S = r × (둘레÷2) → 24 = r × 12 → r = 2.",
  },
  {
    id: "q49", type: "fill_blank",
    question: "삼각형 ABC의 내심 I에 대해 ∠A=40° 이면 ∠BIC = [___]°",
    answer: "110",
    explain: "∠BIC = 90° + (1/2)∠A = 90° + 20° = 110°.",
  },
  {
    id: "q50", type: "fill_blank",
    question: "넓이 36, 내접원 반지름 3인 삼각형의 둘레는 [___]",
    answer: "24",
    explain: "36 = 3 × (둘레÷2) → 둘레÷2 = 12 → 둘레 = 24.",
  },
  {
    id: "q51", type: "ox",
    question: "내심에서 삼각형 세 변까지의 거리는 모두 같다.",
    answer: true,
    explain: "내심은 내접원의 중심이고, 내접원은 세 변에 접하므로 세 변까지 거리 = 내접원 반지름.",
  },
  {
    id: "q52", type: "choice",
    question: "∠A=80° 일 때 ∠BIC 의 크기는?",
    choices: ["120°", "130°", "140°", "160°"],
    answer: 1,
    explain: "∠BIC = 90° + ∠A/2 = 90° + 40° = 130°.",
  },
  {
    id: "q53", type: "ox",
    question: "내접원은 삼각형의 세 변에 모두 접한다.",
    answer: true,
    explain: "내접원은 세 변에 내접하는 원입니다.",
  },
  {
    id: "q54", type: "fill_blank",
    question: "∠A=60° 일 때 ∠BIC = [___]°",
    answer: "120",
    explain: "∠BIC = 90° + 30° = 120°.",
  },

  // ═══════════════════════════════════════════════
  // [7] 합동조건 (SSS/SAS/ASA/RHA/RHS)
  // ═══════════════════════════════════════════════
  {
    id: "q55", type: "choice",
    question: "직각삼각형에서 빗변과 한 예각이 같을 때의 합동조건은?",
    choices: ["RHA", "RHS", "ASA", "SAS"],
    answer: 0,
    explain: "Right angle + Hypotenuse + Acute angle = RHA.",
  },
  {
    id: "q56", type: "choice",
    question: "직각삼각형에서 빗변과 다른 한 변이 같을 때의 합동조건은?",
    choices: ["RHA", "RHS", "ASA", "SAS"],
    answer: 1,
    explain: "Right angle + Hypotenuse + Side = RHS.",
  },
  {
    id: "q57", type: "choice",
    question: "한 변과 그 양 끝각이 같을 때의 합동조건은?",
    choices: ["SSS", "SAS", "ASA", "RHS"],
    answer: 2,
    explain: "Angle-Side-Angle = ASA.",
  },
  {
    id: "q58", type: "choice",
    question: "두 변과 그 끼인각이 같을 때의 합동조건은?",
    choices: ["SSS", "SAS", "ASA", "RHA"],
    answer: 1,
    explain: "Side-Angle-Side = SAS. 끼인각이 핵심입니다.",
  },
  {
    id: "q59", type: "choice",
    question: "합동조건으로 성립하지 않는 것은?",
    choices: ["SSS", "SAS", "ASA", "AAA"],
    answer: 3,
    explain: "AAA는 닮음 조건일 뿐 합동 조건은 아닙니다 (크기가 달라도 각이 같을 수 있음).",
  },
  {
    id: "q60", type: "choice",
    question: "ASA 에서 A 는 각(Angle), S 는?",
    choices: ["변(Side)", "크기(Size)", "합(Sum)", "면(Surface)"],
    answer: 0,
    explain: "S = Side(변), A = Angle(각). R = Right angle, H = Hypotenuse(빗변).",
  },
  {
    id: "q61", type: "fill_blank",
    question: "△ABC와 △DEF에서 ∠B=∠E, BC=EF, ∠C=∠F 이면 [___] 합동",
    answer: "ASA",
    explain: "한 변(BC=EF)과 그 양 끝각(∠B=∠E, ∠C=∠F)이 같으므로 ASA.",
  },

  // ═══════════════════════════════════════════════
  // [8] 중1 개념 — 각의 성질 (삼각형 외각·내각합)
  // 중2 외심/내심 문제 풀 때 밑바탕으로 자주 씀
  // ═══════════════════════════════════════════════
  {
    id: "q62", type: "fill_blank",
    question: "삼각형의 세 내각의 합은 [___]°",
    answer: "180",
    explain: "모든 삼각형에서 세 내각의 합은 180°.",
  },
  {
    id: "q63", type: "fill_blank",
    question: "다각형의 한 외각들의 합은 항상 [___]°",
    answer: "360",
    explain: "삼각형이든 오각형이든 백각형이든, 한 꼭짓점마다 외각 하나씩 더하면 항상 360°.",
  },
  {
    id: "q64", type: "fill_blank",
    question: "삼각형에서 한 외각의 크기는 이웃하지 않는 두 내각의 크기의 [___] 과 같다",
    answer: "합",
    explain: "외각정리. 외심·내심 각도 계산에 자주 씁니다.",
  },
  {
    id: "q65", type: "fill_blank",
    question: "내각이 40°, 70° 인 삼각형에서, 나머지 한 각의 외각은 [___]°",
    answer: "110",
    explain: "나머지 내각의 외각 = 이웃하지 않는 두 내각의 합 = 40 + 70 = 110°.",
  },
  {
    id: "q66", type: "fill_blank",
    question: "n각형의 내각의 합은 180 × (n - [___])",
    answer: "2",
    explain: "n각형은 n-2개의 삼각형으로 쪼갤 수 있음 → 내각의 합 = 180°(n-2).",
  },
  {
    id: "q67", type: "fill_blank",
    question: "오각형의 내각의 합은 [___]°",
    answer: "540",
    explain: "180 × (5-2) = 540°.",
  },
  {
    id: "q68", type: "fill_blank",
    question: "육각형의 내각의 합은 [___]°",
    answer: "720",
    explain: "180 × (6-2) = 720°.",
  },
  {
    id: "q69", type: "fill_blank",
    question: "십각형(10각형)의 내각의 합은 [___]°",
    answer: "1440",
    explain: "180 × (10-2) = 1440°.",
  },
  {
    id: "q70", type: "fill_blank",
    question: "정팔각형의 한 외각의 크기는 [___]°",
    answer: "45",
    explain: "정n각형의 한 외각 = 360° ÷ n = 360 ÷ 8 = 45°.",
  },
  {
    id: "q71", type: "fill_blank",
    question: "정육각형의 한 내각의 크기는 [___]°",
    answer: "120",
    explain: "한 외각 = 360÷6 = 60° → 한 내각 = 180-60 = 120°.",
  },
  {
    id: "q72", type: "fill_blank",
    question: "정삼각형의 한 내각은 [___]°",
    answer: "60",
    explain: "180 ÷ 3 = 60°.",
  },
  {
    id: "q73", type: "choice",
    question: "내각이 30°, 80° 인 삼각형의 나머지 한 각은?",
    choices: ["60°", "70°", "80°", "90°"],
    answer: 1,
    explain: "180 - 30 - 80 = 70°.",
  },
  {
    id: "q74", type: "choice",
    question: "삼각형 ABC에서 ∠A=50°, ∠B=60° 일 때 ∠C의 외각은?",
    choices: ["70°", "100°", "110°", "120°"],
    answer: 2,
    explain: "외각정리: ∠C의 외각 = ∠A + ∠B = 50 + 60 = 110°.",
  },

  // ═══════════════════════════════════════════════
  // [9] 중1 개념 — 평행선·맞꼭지각·대각선·평각
  // ═══════════════════════════════════════════════
  {
    id: "q75", type: "fill_blank",
    question: "맞꼭지각의 크기는 서로 [___] (두 글자)",
    answer: "같다",
    explain: "두 직선이 만나 생기는 마주 보는 각(맞꼭지각)은 크기가 같습니다.",
  },
  {
    id: "q76", type: "ox",
    question: "평행한 두 직선이 한 직선과 만날 때 동위각의 크기는 같다.",
    answer: true,
    explain: "평행 → 동위각 같음. 역도 성립(동위각 같으면 평행).",
  },
  {
    id: "q77", type: "ox",
    question: "평행한 두 직선에서 엇각의 크기는 같다.",
    answer: true,
    explain: "평행 → 엇각 같음. 엇각이 같으면 평행.",
  },
  {
    id: "q78", type: "ox",
    question: "평행한 두 직선에서 동측내각의 합은 180°이다.",
    answer: true,
    explain: "동측내각은 같은 쪽에 있는 두 내각으로, 평행일 때 합이 180°.",
  },
  {
    id: "q79", type: "fill_blank",
    question: "평각의 크기는 [___]°",
    answer: "180",
    explain: "일직선을 이루는 각이 평각.",
  },
  {
    id: "q80", type: "fill_blank",
    question: "직각의 크기는 [___]°",
    answer: "90",
    explain: "수직을 이루는 각이 직각.",
  },
  {
    id: "q81", type: "fill_blank",
    question: "n각형의 대각선 개수: n(n-3)/[___]",
    answer: "2",
    explain: "각 꼭짓점에서 자기 자신과 양 이웃을 뺀 (n-3)개 대각선 가능. 중복 제거로 2로 나눔.",
  },
  {
    id: "q82", type: "fill_blank",
    question: "육각형의 대각선 개수는 [___]개",
    answer: "9",
    explain: "6 × (6-3) ÷ 2 = 6 × 3 ÷ 2 = 9.",
  },
  {
    id: "q83", type: "fill_blank",
    question: "칠각형의 대각선 개수는 [___]개",
    answer: "14",
    explain: "7 × (7-3) ÷ 2 = 7 × 4 ÷ 2 = 14.",
  },
  {
    id: "q84", type: "fill_blank",
    question: "이등변삼각형의 두 밑각의 크기는 서로 [___] (두 글자)",
    answer: "같다",
    explain: "이등변삼각형의 핵심 성질: 두 밑각이 같다.",
  },

  // ═══════════════════════════════════════════════
  // [10] 지수법칙 (중2 · 식의 계산)
  // ═══════════════════════════════════════════════
  {
    id: "q85", type: "fill_blank",
    question: "2^3 × 2^4 = 2^[___]",
    answer: "7",
    explain: "a^m × a^n = a^(m+n) → 3+4 = 7.",
  },
  {
    id: "q86", type: "fill_blank",
    question: "(2^3)^2 = 2^[___]",
    answer: "6",
    explain: "(a^m)^n = a^(m×n) → 3×2 = 6.",
  },
  {
    id: "q87", type: "fill_blank",
    question: "2^10 ÷ 2^6 = 2^[___]",
    answer: "4",
    explain: "a^m ÷ a^n = a^(m-n) → 10-6 = 4.",
  },
  {
    id: "q88", type: "ox",
    question: "a^m × a^n = a^(m+n) (단, m, n은 자연수)",
    answer: true,
    explain: "지수법칙 1번: 같은 밑끼리 곱하면 지수끼리 더함.",
  },
  {
    id: "q89", type: "choice",
    question: "(a^3)^4 와 같은 것은?",
    choices: ["a^7", "a^12", "a^34", "a^81"],
    answer: 1,
    explain: "(a^m)^n = a^(mn) → 3×4 = 12. 절대 m+n 아님!",
  },
  {
    id: "q90", type: "ox",
    question: "(ab)^n = a^n × b^n 이다.",
    answer: true,
    explain: "곱의 거듭제곱은 각각의 거듭제곱의 곱.",
  },
  {
    id: "q91", type: "fill_blank",
    question: "(2×3)^4 에서 3의 지수는 [___]",
    answer: "4",
    explain: "(ab)^n = a^n × b^n → (2×3)^4 = 2^4 × 3^4.",
  },
];
