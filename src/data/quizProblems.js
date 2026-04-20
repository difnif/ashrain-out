// quizProblems.js — 퀴즈 문제 풀
// 담당: 퀴즈 채팅방 전담 파일
// 범위: 중2 교과 + 중1 핵심 개념 (각·다각형·평행선·이등변)
//
// 스키마:
//   id         : 고유 ID (q1, q2, ...)
//   type       : "ox" | "choice" | "fill_blank"
//   difficulty : "fast" | "slow"
//      - fast : 암산 5초 이내 가능 (OX, 공식 값, 용어)
//      - slow : 계산 10~30초 필요 (주기·자릿수·역산)
//   question   : 문제 본문. 수식 태그 사용:
//      [seg]AB[/seg]       선분 AB (윗줄)
//      [exp]2|5[/exp]      2의 5제곱 (윗첨자)
//      [frac]a|b[/frac]    a/b (상하 분수)
//      [rep]34[/rep]       순환마디 34 (윗줄 + 색강조)
//   figure     : (선택) 도형 프리셋 이름
//      "circum-acute" | "circum-right" | "circum-obtuse"
//      "incircle" | "isosceles" | "right-triangle" | "exterior-angle"
//   choices?   : string[] (choice 전용)
//   answer     : boolean(ox) | number(choice, index) | string(fill_blank)
//   explain    : 해설 텍스트 (수식 태그 허용)

export const SAMPLE_PROBLEMS = [

  // ═══════════════════════════════════════════════════════════
  // [A] 외심 — 성질·공식·응용
  // ═══════════════════════════════════════════════════════════
  {
    id: "q1", type: "ox", difficulty: "fast",
    question: "삼각형의 외심은 항상 삼각형 내부에 있다.",
    answer: false,
    explain: "둔각삼각형의 외심은 외부, 직각삼각형의 외심은 빗변의 중점(변 위).",
    figure: "circum-obtuse",
  },
  {
    id: "q2", type: "ox", difficulty: "fast",
    question: "삼각형의 외심에서 세 꼭짓점까지의 거리는 모두 같다.",
    answer: true,
    explain: "외심은 외접원의 중심 → 세 꼭짓점까지 거리 = 외접원의 반지름 R.",
    figure: "circum-acute",
  },
  {
    id: "q3", type: "ox", difficulty: "fast",
    question: "직각삼각형의 외심은 빗변의 중점이다.",
    answer: true,
    explain: "직각삼각형의 외접원은 빗변이 지름. 따라서 외심 = 빗변의 중점.",
    figure: "circum-right",
  },
  {
    id: "q4", type: "fill_blank", difficulty: "fast",
    question: "삼각형의 외심은 세 변의 [___]의 교점이다.",
    answer: "수직이등분선",
    explain: "외심은 세 변의 수직이등분선이 만나는 점.",
  },
  {
    id: "q5", type: "fill_blank", difficulty: "fast",
    question: "직각삼각형의 빗변의 길이가 12일 때, 외접원의 반지름 R = [___]",
    answer: "6",
    explain: "R = 빗변 ÷ 2 = 12 ÷ 2 = 6.",
    figure: "circum-right",
  },
  {
    id: "q6", type: "fill_blank", difficulty: "fast",
    question: "외접원의 반지름이 7인 직각삼각형의 빗변의 길이는 [___]",
    answer: "14",
    explain: "빗변 = 2R = 2 × 7 = 14.",
    figure: "circum-right",
  },
  {
    id: "q7", type: "fill_blank", difficulty: "slow",
    question: "삼각형 ABC의 외심을 O라 하자. ∠A = 35° 일 때, ∠BOC = [___]°",
    answer: "70",
    explain: "외심 O에 대해 ∠BOC = 2∠A = 2 × 35° = 70°. (중심각은 원주각의 2배)",
    figure: "circum-acute",
  },
  {
    id: "q8", type: "fill_blank", difficulty: "slow",
    question: "삼각형 ABC의 외심 O에 대해 ∠BOC = 128° 일 때, ∠A = [___]°",
    answer: "64",
    explain: "∠A = ∠BOC ÷ 2 = 128° ÷ 2 = 64°.",
    figure: "circum-acute",
  },
  {
    id: "q9", type: "choice", difficulty: "fast",
    question: "둔각삼각형의 외심의 위치는?",
    choices: ["삼각형 내부", "삼각형 외부", "한 변의 중점", "꼭짓점 위"],
    answer: 1,
    explain: "예각 → 내부, 직각 → 빗변 중점, 둔각 → 외부.",
    figure: "circum-obtuse",
  },
  {
    id: "q10", type: "ox", difficulty: "fast",
    question: "정삼각형의 외심과 내심은 일치한다.",
    answer: true,
    explain: "정삼각형은 외심·내심·무게중심·수심이 모두 한 점에서 만난다.",
  },

  // ═══════════════════════════════════════════════════════════
  // [B] 내심 — 성질·공식·응용
  // ═══════════════════════════════════════════════════════════
  {
    id: "q11", type: "ox", difficulty: "fast",
    question: "삼각형의 내심은 세 내각의 이등분선의 교점이다.",
    answer: true,
    explain: "내심은 세 내각의 이등분선이 만나는 점.",
    figure: "incircle",
  },
  {
    id: "q12", type: "ox", difficulty: "fast",
    question: "내심에서 삼각형의 세 변까지의 거리는 모두 같다.",
    answer: true,
    explain: "내심은 내접원의 중심 → 세 변까지 거리 = 내접원의 반지름 r.",
    figure: "incircle",
  },
  {
    id: "q13", type: "ox", difficulty: "fast",
    question: "내접원은 삼각형의 세 변에 모두 접한다.",
    answer: true,
    explain: "내접원의 정의 그대로.",
    figure: "incircle",
  },
  {
    id: "q14", type: "fill_blank", difficulty: "slow",
    question: "넓이가 24, 둘레가 24인 삼각형의 내접원 반지름 r = [___]",
    answer: "2",
    explain: "공식: S = r · s (s는 반둘레). s = 24÷2 = 12. 24 = r × 12 → r = 2.",
    figure: "incircle",
  },
  {
    id: "q15", type: "fill_blank", difficulty: "slow",
    question: "내접원 반지름이 3, 둘레가 24인 삼각형의 넓이 S = [___]",
    answer: "36",
    explain: "S = r · s = 3 × 12 = 36. (s = 반둘레 = 12)",
    figure: "incircle",
  },
  {
    id: "q16", type: "fill_blank", difficulty: "slow",
    question: "넓이 30, 내접원 반지름 2인 삼각형의 둘레 = [___]",
    answer: "30",
    explain: "30 = 2 × s → s = 15. 둘레 = 2s = 30.",
    figure: "incircle",
  },
  {
    id: "q17", type: "fill_blank", difficulty: "slow",
    question: "삼각형 ABC의 내심을 I라 하자. ∠A = 40° 일 때, ∠BIC = [___]°",
    answer: "110",
    explain: "공식: ∠BIC = 90° + [frac]∠A|2[/frac] = 90° + 20° = 110°.",
    figure: "incircle",
  },
  {
    id: "q18", type: "fill_blank", difficulty: "slow",
    question: "∠A = 80° 일 때, 내심 I에 대한 ∠BIC = [___]°",
    answer: "130",
    explain: "∠BIC = 90° + [frac]80|2[/frac] = 90° + 40° = 130°.",
    figure: "incircle",
  },
  {
    id: "q19", type: "fill_blank", difficulty: "slow",
    question: "내심 I에 대해 ∠BIC = 115° 일 때, ∠A = [___]°",
    answer: "50",
    explain: "115° = 90° + [frac]∠A|2[/frac] → [frac]∠A|2[/frac] = 25° → ∠A = 50°.",
    figure: "incircle",
  },

  // ═══════════════════════════════════════════════════════════
  // [C] 삼각형의 합동조건
  // ═══════════════════════════════════════════════════════════
  {
    id: "q20", type: "choice", difficulty: "fast",
    question: "세 변의 길이가 각각 같을 때의 합동조건은?",
    choices: ["SSS", "SAS", "ASA", "RHS"],
    answer: 0,
    explain: "Side-Side-Side = SSS.",
  },
  {
    id: "q21", type: "choice", difficulty: "fast",
    question: "두 변과 그 끼인각이 같을 때의 합동조건은?",
    choices: ["SSS", "SAS", "ASA", "RHA"],
    answer: 1,
    explain: "Side-Angle-Side = SAS. '끼인각'이 핵심.",
  },
  {
    id: "q22", type: "choice", difficulty: "fast",
    question: "한 변과 그 양 끝각이 같을 때의 합동조건은?",
    choices: ["SSS", "SAS", "ASA", "RHS"],
    answer: 2,
    explain: "Angle-Side-Angle = ASA.",
  },
  {
    id: "q23", type: "choice", difficulty: "fast",
    question: "직각삼각형에서 빗변과 한 예각이 같을 때의 합동조건은?",
    choices: ["RHA", "RHS", "ASA", "SAS"],
    answer: 0,
    explain: "Right angle + Hypotenuse + Acute angle = RHA.",
    figure: "right-triangle",
  },
  {
    id: "q24", type: "choice", difficulty: "fast",
    question: "직각삼각형에서 빗변과 다른 한 변이 같을 때의 합동조건은?",
    choices: ["RHA", "RHS", "ASA", "SAS"],
    answer: 1,
    explain: "Right angle + Hypotenuse + Side = RHS.",
    figure: "right-triangle",
  },
  {
    id: "q25", type: "choice", difficulty: "fast",
    question: "합동조건으로 성립하지 않는 것은?",
    choices: ["SSS", "SAS", "ASA", "SSA"],
    answer: 3,
    explain: "SSA(두 변과 끼인각이 아닌 각)는 두 모양이 가능해 합동 아님.",
  },
  {
    id: "q26", type: "choice", difficulty: "fast",
    question: "다음 중 합동조건이 아닌 것은?",
    choices: ["SSS", "SAS", "ASA", "AAA"],
    answer: 3,
    explain: "AAA는 닮음 조건. 크기가 달라도 각은 같을 수 있음.",
  },
  {
    id: "q27", type: "choice", difficulty: "slow",
    question: "△ABC와 △DEF에서 [seg]AB[/seg]=[seg]DE[/seg], [seg]BC[/seg]=[seg]EF[/seg], ∠B=∠E 이면?",
    choices: ["SSS 합동", "SAS 합동", "ASA 합동", "합동 아님"],
    answer: 1,
    explain: "두 변과 끼인각(∠B=∠E)이 같으므로 SAS 합동.",
  },
  {
    id: "q28", type: "choice", difficulty: "slow",
    question: "△ABC와 △DEF에서 ∠B=∠E, [seg]BC[/seg]=[seg]EF[/seg], ∠C=∠F 이면?",
    choices: ["SSS 합동", "SAS 합동", "ASA 합동", "합동 아님"],
    answer: 2,
    explain: "한 변과 양 끝각이 같으므로 ASA 합동.",
  },

  // ═══════════════════════════════════════════════════════════
  // [D] 이등변삼각형
  // ═══════════════════════════════════════════════════════════
  {
    id: "q29", type: "ox", difficulty: "fast",
    question: "이등변삼각형의 두 밑각의 크기는 같다.",
    answer: true,
    explain: "이등변삼각형 성질: 두 밑각이 같다.",
    figure: "isosceles",
  },
  {
    id: "q30", type: "ox", difficulty: "fast",
    question: "이등변삼각형에서 꼭지각의 이등분선은 밑변을 수직이등분한다.",
    answer: true,
    explain: "꼭지각의 이등분선 = 밑변의 수직이등분선. 대칭축 역할.",
    figure: "isosceles",
  },
  {
    id: "q31", type: "fill_blank", difficulty: "fast",
    question: "이등변삼각형의 꼭지각이 80°일 때, 한 밑각의 크기는 [___]°",
    answer: "50",
    explain: "두 밑각 합 = 180° - 80° = 100°. 한 밑각 = 100° ÷ 2 = 50°.",
    figure: "isosceles",
  },
  {
    id: "q32", type: "fill_blank", difficulty: "fast",
    question: "이등변삼각형의 한 밑각이 70°일 때, 꼭지각 = [___]°",
    answer: "40",
    explain: "꼭지각 = 180° - 70° × 2 = 180° - 140° = 40°.",
    figure: "isosceles",
  },

  // ═══════════════════════════════════════════════════════════
  // [E] 순환소수 → 분수
  // 순환마디 표기: [rep]...[/rep]
  // ═══════════════════════════════════════════════════════════
  {
    id: "q33", type: "fill_blank", difficulty: "fast",
    question: "0.[rep]3[/rep] = 3/[___]",
    answer: "9",
    explain: "순수 순환소수, 순환마디 1자리 → 분모 9. 0.333... = [frac]3|9[/frac] = [frac]1|3[/frac].",
  },
  {
    id: "q34", type: "fill_blank", difficulty: "fast",
    question: "0.[rep]17[/rep] = 17/[___]",
    answer: "99",
    explain: "순환마디 2자리 → 분모는 9가 2개 = 99.",
  },
  {
    id: "q35", type: "choice", difficulty: "fast",
    question: "순환마디가 3자리인 순수 순환소수의 분모는? (약분 전)",
    choices: ["99", "999", "9999", "990"],
    answer: 1,
    explain: "순환마디 n자리 → 분모는 9가 n개. 3자리면 999.",
  },
  {
    id: "q36", type: "fill_blank", difficulty: "slow",
    question: "1.2[rep]34[/rep] 를 분수로: 분자 = 1234 - [___]",
    answer: "12",
    explain: "1.2343434... 에서 순환 안 하는 부분까지 = 1.2 → 숫자만 쓰면 12. 분자 = 1234 - 12 = 1222.",
  },
  {
    id: "q37", type: "fill_blank", difficulty: "slow",
    question: "1.2[rep]34[/rep] 를 분수로: 분모 = [___]",
    answer: "990",
    explain: "순환마디 2자리 + 순환 안 하는 소수점 아래 1자리 → 분모는 9가 2개, 0이 1개 = 990.",
  },
  {
    id: "q38", type: "fill_blank", difficulty: "slow",
    question: "0.1[rep]2[/rep] = (12 - [___])/90",
    answer: "1",
    explain: "0.12222... 에서 순환 안 하는 부분 = 0.1 → 숫자 1. 분자 = 12 - 1 = 11.",
  },
  {
    id: "q39", type: "ox", difficulty: "fast",
    question: "모든 순환소수는 분수로 나타낼 수 있다.",
    answer: true,
    explain: "순환소수는 유리수 → 모두 분수 표현 가능.",
  },
  {
    id: "q40", type: "ox", difficulty: "fast",
    question: "0.101001000100001... 은 순환소수이다.",
    answer: false,
    explain: "규칙은 있지만 고정된 숫자 배열이 반복되지 않으므로 순환소수가 아님 (무리수).",
  },
  {
    id: "q41", type: "choice", difficulty: "fast",
    question: "다음 중 유한소수로 나타낼 수 있는 분수는?",
    choices: ["[frac]1|3[/frac]", "[frac]1|6[/frac]", "[frac]1|7[/frac]", "[frac]3|20[/frac]"],
    answer: 3,
    explain: "분모의 소인수가 2, 5뿐이면 유한소수. 20 = [exp]2|2[/exp] × 5.",
  },

  // ═══════════════════════════════════════════════════════════
  // [F] 제곱수의 일의 자리 — 주기 규칙
  // ═══════════════════════════════════════════════════════════
  {
    id: "q42", type: "fill_blank", difficulty: "fast",
    question: "[exp]2|n[/exp] 의 일의 자리 수: 2, 4, 8, 6, 2, 4, [___], 6",
    answer: "8",
    explain: "2의 거듭제곱 일의 자리는 2, 4, 8, 6 주기 4로 반복.",
  },
  {
    id: "q43", type: "fill_blank", difficulty: "fast",
    question: "[exp]3|n[/exp] 의 일의 자리 수: 3, 9, 7, 1, 3, 9, 7, [___]",
    answer: "1",
    explain: "3의 거듭제곱 일의 자리는 3, 9, 7, 1 주기 4.",
  },
  {
    id: "q44", type: "fill_blank", difficulty: "fast",
    question: "[exp]7|n[/exp] 의 일의 자리 수: 7, 9, 3, 1, 7, [___], 3, 1",
    answer: "9",
    explain: "7의 거듭제곱 일의 자리는 7, 9, 3, 1 주기 4.",
  },
  {
    id: "q45", type: "fill_blank", difficulty: "fast",
    question: "[exp]5|n[/exp] 의 일의 자리 수는 항상 [___]",
    answer: "5",
    explain: "5 × 5 = 25, 25 × 5 = 125, ... 일의 자리 항상 5.",
  },
  {
    id: "q46", type: "fill_blank", difficulty: "fast",
    question: "[exp]6|n[/exp] 의 일의 자리 수는 항상 [___]",
    answer: "6",
    explain: "6 × 6 = 36, 36 × 6 = 216, ... 일의 자리 항상 6.",
  },
  {
    id: "q47", type: "fill_blank", difficulty: "slow",
    question: "[exp]2|100[/exp] 의 일의 자리 수는? [___]",
    answer: "6",
    explain: "주기 2,4,8,6 (4). 100 ÷ 4 = 25 나머지 0 → 주기 마지막 = 6.",
  },
  {
    id: "q48", type: "fill_blank", difficulty: "slow",
    question: "[exp]3|25[/exp] 의 일의 자리 수는? [___]",
    answer: "3",
    explain: "주기 3,9,7,1 (4). 25 ÷ 4 = 6 나머지 1 → 주기 1번째 = 3.",
  },
  {
    id: "q49", type: "fill_blank", difficulty: "slow",
    question: "[exp]7|50[/exp] 의 일의 자리 수는? [___]",
    answer: "9",
    explain: "주기 7,9,3,1 (4). 50 ÷ 4 = 12 나머지 2 → 주기 2번째 = 9.",
  },
  {
    id: "q50", type: "fill_blank", difficulty: "slow",
    question: "[exp]8|50[/exp] 의 일의 자리 수는? [___]",
    answer: "4",
    explain: "주기 8,4,2,6 (4). 50 ÷ 4 = 12 나머지 2 → 주기 2번째 = 4.",
  },
  {
    id: "q51", type: "choice", difficulty: "slow",
    question: "일의 자리 수가 6인 거듭제곱은?",
    choices: ["[exp]2|5[/exp]", "[exp]3|4[/exp]", "[exp]2|8[/exp]", "[exp]7|2[/exp]"],
    answer: 2,
    explain: "[exp]2|5[/exp]=32(2), [exp]3|4[/exp]=81(1), [exp]2|8[/exp]=256(6) ✓, [exp]7|2[/exp]=49(9).",
  },

  // ═══════════════════════════════════════════════════════════
  // [G] 자릿수 판정 — 10의 거듭제곱 변환
  // ═══════════════════════════════════════════════════════════
  {
    id: "q52", type: "fill_blank", difficulty: "slow",
    question: "3 × [exp]2|5[/exp] × [exp]5|5[/exp] 은 [___]자리 수",
    answer: "6",
    explain: "3 × [exp](2×5)|5[/exp] = 3 × [exp]10|5[/exp] = 300000 → 6자리.",
  },
  {
    id: "q53", type: "fill_blank", difficulty: "slow",
    question: "[exp]2|4[/exp] × [exp]5|6[/exp] 은 [___]자리 수",
    answer: "6",
    explain: "[exp]2|4[/exp] × [exp]5|4[/exp] × [exp]5|2[/exp] = [exp]10|4[/exp] × 25 = 250000 → 6자리.",
  },
  {
    id: "q54", type: "fill_blank", difficulty: "slow",
    question: "[exp]2|7[/exp] × [exp]5|4[/exp] 은 [___]자리 수",
    answer: "5",
    explain: "[exp]2|3[/exp] × ([exp]2|4[/exp] × [exp]5|4[/exp]) = 8 × [exp]10|4[/exp] = 80000 → 5자리.",
  },
  {
    id: "q54b", type: "fill_blank", difficulty: "slow",
    question: "7 × [exp]2|6[/exp] × [exp]5|6[/exp] 은 [___]자리 수",
    answer: "7",
    explain: "7 × [exp]10|6[/exp] = 7000000 → 7자리.",
  },
  {
    id: "q55", type: "choice", difficulty: "slow",
    question: "[exp]2|10[/exp] × [exp]5|8[/exp] 은 몇 자리 수?",
    choices: ["8자리", "9자리", "10자리", "11자리"],
    answer: 1,
    explain: "[exp]2|2[/exp] × ([exp]2|8[/exp] × [exp]5|8[/exp]) = 4 × [exp]10|8[/exp] = 400000000 → 9자리.",
  },

  // ═══════════════════════════════════════════════════════════
  // [H] 지수법칙
  // ═══════════════════════════════════════════════════════════
  {
    id: "q56", type: "fill_blank", difficulty: "fast",
    question: "[exp]2|3[/exp] × [exp]2|4[/exp] = [exp]2|n[/exp] 일 때, n = [___]",
    answer: "7",
    explain: "[exp]a|m[/exp] × [exp]a|n[/exp] = [exp]a|m+n[/exp] → 3 + 4 = 7.",
  },
  {
    id: "q57", type: "fill_blank", difficulty: "fast",
    question: "[exp]2|3[/exp] 을 네 제곱하면 [exp]2|n[/exp]. n = [___]",
    answer: "12",
    explain: "지수의 거듭제곱은 지수끼리 곱한다. 3 × 4 = 12.",
  },
  {
    id: "q58", type: "fill_blank", difficulty: "fast",
    question: "[exp]2|10[/exp] ÷ [exp]2|6[/exp] = [exp]2|n[/exp] 일 때, n = [___]",
    answer: "4",
    explain: "[exp]a|m[/exp] ÷ [exp]a|n[/exp] = [exp]a|m-n[/exp] → 10 - 6 = 4.",
  },
  {
    id: "q59", type: "choice", difficulty: "fast",
    question: "[exp]a|3[/exp] 을 네 제곱하면?",
    choices: ["[exp]a|7[/exp]", "[exp]a|12[/exp]", "[exp]a|34[/exp]", "[exp]a|81[/exp]"],
    answer: 1,
    explain: "지수의 거듭제곱은 지수끼리 곱: 3 × 4 = 12. (덧셈 아님!)",
  },
  {
    id: "q60", type: "ox", difficulty: "fast",
    question: "곱의 거듭제곱은 각각의 거듭제곱의 곱과 같다. 예) 2 × 3 을 4번 곱한 값 = [exp]2|4[/exp] × [exp]3|4[/exp]",
    answer: true,
    explain: "곱의 거듭제곱 법칙. 지수를 괄호 밖으로 분배.",
  },

  // ═══════════════════════════════════════════════════════════
  // [I] 중1 — 삼각형 내각·외각
  // ═══════════════════════════════════════════════════════════
  {
    id: "q61", type: "fill_blank", difficulty: "fast",
    question: "삼각형의 세 내각의 합 = [___]°",
    answer: "180",
    explain: "모든 삼각형에서 세 내각의 합은 180°.",
  },
  {
    id: "q62", type: "fill_blank", difficulty: "fast",
    question: "삼각형의 한 외각 = 이웃하지 않는 두 내각의 [___] (한 글자)",
    answer: "합",
    explain: "외각정리. 외심·내심 각도 문제의 기본 도구.",
    figure: "exterior-angle",
  },
  {
    id: "q63", type: "fill_blank", difficulty: "fast",
    question: "두 내각이 40°, 70° 인 삼각형에서 나머지 한 각의 외각 = [___]°",
    answer: "110",
    explain: "외각정리: 외각 = 이웃하지 않는 두 내각의 합 = 40° + 70° = 110°.",
    figure: "exterior-angle",
  },
  {
    id: "q64", type: "choice", difficulty: "fast",
    question: "내각이 30°, 80° 인 삼각형의 나머지 한 각은?",
    choices: ["60°", "70°", "80°", "90°"],
    answer: 1,
    explain: "180° - 30° - 80° = 70°.",
  },
  {
    id: "q65", type: "choice", difficulty: "slow",
    question: "∠A = 50°, ∠B = 60° 인 삼각형 ABC에서 ∠C 의 외각은?",
    choices: ["70°", "100°", "110°", "120°"],
    answer: 2,
    explain: "외각정리: ∠C의 외각 = ∠A + ∠B = 50° + 60° = 110°.",
    figure: "exterior-angle",
  },

  // ═══════════════════════════════════════════════════════════
  // [J] 다각형 — 내각합·외각합
  // ═══════════════════════════════════════════════════════════
  {
    id: "q66", type: "fill_blank", difficulty: "fast",
    question: "모든 다각형에서 한 꼭짓점마다 하나씩 잡은 외각의 합은 [___]°",
    answer: "360",
    explain: "n각형이든 항상 360°. (삼각형도 오각형도 백각형도!)",
  },
  {
    id: "q67", type: "fill_blank", difficulty: "fast",
    question: "n각형의 내각의 합 = 180° × (n − [___])",
    answer: "2",
    explain: "n각형은 (n-2)개 삼각형으로 쪼갤 수 있음 → 내각합 = 180°(n-2).",
  },
  {
    id: "q68", type: "fill_blank", difficulty: "fast",
    question: "오각형의 내각의 합 = [___]°",
    answer: "540",
    explain: "180° × (5 - 2) = 540°.",
  },
  {
    id: "q69", type: "fill_blank", difficulty: "fast",
    question: "육각형의 내각의 합 = [___]°",
    answer: "720",
    explain: "180° × (6 - 2) = 720°.",
  },
  {
    id: "q70", type: "fill_blank", difficulty: "slow",
    question: "십각형의 내각의 합 = [___]°",
    answer: "1440",
    explain: "180° × (10 - 2) = 1440°.",
  },
  {
    id: "q71", type: "fill_blank", difficulty: "fast",
    question: "정팔각형의 한 외각의 크기 = [___]°",
    answer: "45",
    explain: "정n각형의 한 외각 = 360° ÷ n = 360° ÷ 8 = 45°.",
  },
  {
    id: "q72", type: "fill_blank", difficulty: "fast",
    question: "정육각형의 한 내각의 크기 = [___]°",
    answer: "120",
    explain: "한 외각 = 360° ÷ 6 = 60° → 한 내각 = 180° - 60° = 120°.",
  },
  {
    id: "q73", type: "fill_blank", difficulty: "fast",
    question: "정삼각형의 한 내각 = [___]°",
    answer: "60",
    explain: "180° ÷ 3 = 60°.",
  },
  {
    id: "q74", type: "fill_blank", difficulty: "slow",
    question: "정십이각형의 한 외각 = [___]°",
    answer: "30",
    explain: "360° ÷ 12 = 30°.",
  },

  // ═══════════════════════════════════════════════════════════
  // [K] 평행선·각·대각선 (중1 기초)
  // ═══════════════════════════════════════════════════════════
  {
    id: "q75", type: "fill_blank", difficulty: "fast",
    question: "맞꼭지각의 크기는 서로 [___] (두 글자)",
    answer: "같다",
    explain: "두 직선이 만나 생기는 마주 보는 각은 크기가 같다.",
  },
  {
    id: "q76", type: "ox", difficulty: "fast",
    question: "평행한 두 직선에서 엇각의 크기는 같다.",
    answer: true,
    explain: "평행 ↔ 엇각 같음 (역도 성립).",
  },
  {
    id: "q77", type: "ox", difficulty: "fast",
    question: "평행한 두 직선에서 동위각의 크기는 같다.",
    answer: true,
    explain: "평행 ↔ 동위각 같음.",
  },
  {
    id: "q78", type: "ox", difficulty: "fast",
    question: "평행한 두 직선에서 동측내각(같은 쪽 내각)의 합은 180°이다.",
    answer: true,
    explain: "평행일 때 동측내각의 합 = 180°. 꺾은선 문제의 핵심 도구.",
  },
  {
    id: "q79", type: "fill_blank", difficulty: "fast",
    question: "평각의 크기 = [___]°",
    answer: "180",
    explain: "일직선을 이루는 각 = 180°.",
  },
  {
    id: "q80", type: "fill_blank", difficulty: "fast",
    question: "직각의 크기 = [___]°",
    answer: "90",
    explain: "수직을 이루는 각 = 90°.",
  },
  {
    id: "q81", type: "fill_blank", difficulty: "fast",
    question: "n각형의 대각선 개수 = [frac]n(n-3)|☐[/frac] 의 ☐ = [___]",
    answer: "2",
    explain: "각 꼭짓점에서 (n-3)개 → 총 n(n-3)개에서 중복 2번씩 세므로 ÷2.",
  },
  {
    id: "q82", type: "fill_blank", difficulty: "slow",
    question: "육각형의 대각선 개수 = [___]개",
    answer: "9",
    explain: "[frac]6×(6-3)|2[/frac] = [frac]18|2[/frac] = 9.",
  },
  {
    id: "q83", type: "fill_blank", difficulty: "slow",
    question: "칠각형의 대각선 개수 = [___]개",
    answer: "14",
    explain: "[frac]7×(7-3)|2[/frac] = [frac]28|2[/frac] = 14.",
  },
];
