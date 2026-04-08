// RPM 비교 데이터. 학생이 셋팅한 RPM이 이 표 어디쯤인지 화살표로 짚어줌.
// 추가/수정은 이 파일에서만. ExplanationPanel은 이걸 import해서 사용.
export const RPM_EXAMPLES = [
  { label: "시계 초침",            rpm: 0.17,  hint: "한 바퀴 = 1분" },
  { label: "자전거 페달 (편안하게)", rpm: 75,    hint: "사람 다리의 한계권" },
  { label: "선풍기 (약풍)",         rpm: 300,   hint: "일상 가전의 체감 빠름" },
  { label: "자동차 엔진 (공회전)",   rpm: 800,   hint: "" },
  { label: "자동차 엔진 (시내 주행)", rpm: 1500,  hint: "" },
  { label: "자동차 엔진 (고속 주행)", rpm: 2500,  hint: "" },
  { label: "전동 드릴",             rpm: 2000,  hint: "" },
  { label: "HDD 하드디스크",        rpm: 7200,  hint: "데이터 읽기 표준" },
  { label: "제트 엔진 터빈",        rpm: 20000, hint: "초음속 영역" },
];

// 앱 RPM 상한
export const RPM_MAX = 1200;
export const RPM_MIN = 1;

// 학생 셋팅 RPM에 가장 가까운 비교 대상 찾기
export function findClosestExample(userRpm) {
  let best = RPM_EXAMPLES[0];
  let bestDiff = Math.abs(Math.log10(userRpm) - Math.log10(best.rpm));
  for (const ex of RPM_EXAMPLES) {
    const d = Math.abs(Math.log10(userRpm) - Math.log10(ex.rpm));
    if (d < bestDiff) { best = ex; bestDiff = d; }
  }
  return best;
}
