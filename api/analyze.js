// api/analyze.js
// 2026-04: 교육과정 진도 인식 + 단원 태그 + 안전 응답 검증

import { CURRICULUM_2022, getUnitById, DEFAULT_PROGRESS } from "../src/data/curriculum.js";

// 진도 컨텍스트 → 시스템 프롬프트용 텍스트 생성
function buildCurriculumContext(allowedUnitIds, excludeUnits) {
  // allowedUnitIds: ["m1-1-1", ..., "m2-2-1"]
  // excludeUnits: ["피타고라스 정리"] (사용자가 "안 배운 단원이에요" 누른 단원명)

  const allowed = (Array.isArray(allowedUnitIds) && allowedUnitIds.length > 0)
    ? allowedUnitIds
    : DEFAULT_PROGRESS;

  // 학기별 그룹화
  const bySemester = {};
  for (const id of allowed) {
    const u = getUnitById(id);
    if (!u) continue;
    if (!bySemester[u.semester]) bySemester[u.semester] = [];
    bySemester[u.semester].push(u.name);
  }

  // 허용 단원 텍스트
  const allowedLines = [];
  for (const sem of Object.keys(CURRICULUM_2022)) {
    if (!bySemester[sem]) continue;
    allowedLines.push(`- ${sem}: ${bySemester[sem].join(", ")}`);
  }
  const allowedText = allowedLines.join("\n");

  // 금지 단원 (allowed에 없는 모든 단원)
  const allowedSet = new Set(allowed);
  const forbiddenUnits = [];
  for (const sem of Object.keys(CURRICULUM_2022)) {
    for (const u of CURRICULUM_2022[sem]) {
      if (!allowedSet.has(u.id)) forbiddenUnits.push(`${u.name}(${sem})`);
    }
  }
  const excludeList = Array.isArray(excludeUnits) ? excludeUnits : [];
  const explicitExclude = excludeList.length > 0
    ? `\n\n⛔ 추가로 사용 금지된 단원 (학생이 직접 제외 요청): ${excludeList.join(", ")}`
    : "";

  return `
[학생 진도 정보]
이 학생이 현재까지 배운 단원은 다음과 같다:
${allowedText}

[풀이 작성 규칙 — 반드시 지킬 것]
1. 위 진도 범위 안의 개념만으로 풀이를 작성한다.
2. 진도 범위 밖의 단원(예: ${forbiddenUnits.slice(0, 6).join(", ")}${forbiddenUnits.length > 6 ? " 등" : ""})은 사용하지 않는다.
3. 만약 진도 범위 안의 개념만으로는 절대 풀 수 없는 문제라면, 어쩔 수 없이 진도 밖 개념을 써도 되지만, 해당 step의 curriculumTag를 정확히 표시하고 unlearned: true로 명시한다.
4. 가능하면 진도 안의 개념으로 우회하는 풀이를 우선 시도한다.${explicitExclude}
`;
}

// 응답 스키마 검증 (배열 필드 보정)
function sanitizeResult(data) {
  if (!data || typeof data !== "object") return null;
  if (!Array.isArray(data.steps)) data.steps = [];
  if (!Array.isArray(data.deepHelp)) data.deepHelp = [];
  if (data.figure && typeof data.figure === "object") {
    if (!Array.isArray(data.figure.vertices)) data.figure.vertices = [];
    if (!Array.isArray(data.figure.edges)) data.figure.edges = [];
    if (!Array.isArray(data.figure.angles)) data.figure.angles = [];
    if (!Array.isArray(data.figure.marks)) data.figure.marks = [];
  }
  // step 각각 curriculumTag 보정 (없으면 null)
  data.steps = data.steps.map(s => {
    if (!s || typeof s !== "object") return { title: "", explain: "" };
    if (!s.curriculumTag || typeof s.curriculumTag !== "object") s.curriculumTag = null;
    return s;
  });
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { text, imageBase64, model, allowedUnits, excludeUnits } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "No input" });

  const curriculumContext = buildCurriculumContext(allowedUnits, excludeUnits);

  const systemPrompt = `너는 중학교 수학 선생님이야. 학생이 수학 문제를 보내면, 문제를 "직독직해"하듯 한 문장씩 분석해.
${curriculumContext}

반드시 아래 JSON 형식만 출력해. 다른 텍스트 없이 순수 JSON만.

{
  "problemText": "추출한 문제 전문. 보기/선택지는 줄바꿈으로 구분. 채점/필기/동그라미 무시, 원본만. 여러 문제 보이면 주요 1개만.",
  "mathNotation": "수학 기호 규칙: 선분은 [seg]AB[/seg], 직선은 [line]AB[/line], 반직선은 [ray]AB[/ray], 분수는 [frac]분자|분모[/frac] (예: [frac]18|5×a[/frac]). 거듭제곱(지수)은 반드시 [exp]밑|지수[/exp] 태그만 사용. 예: 2의 10제곱 → [exp]2|10[/exp], x의 n제곱 → [exp]x|n[/exp], 2의 (a+b)제곱 → [exp]2|a+b[/exp]. 유니코드 윗첨자(² ³ ¹ ⁰ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁿ ˣ)와 ^ 기호는 절대 사용 금지. 한 자리 지수도 예외 없이 태그 사용. 나머지: ∠ABC, △ABC, ∥, ⊥, ≡, °, √. combining overline(̅) 절대 금지.",
  "figure": {
    "type": "triangle/quadrilateral/circle/line/none",
    "vertices": [{"label":"A","x":0,"y":0},{"label":"B","x":100,"y":0},{"label":"C","x":50,"y":-80}],
    "edges": [{"from":"A","to":"B","label":"8cm","style":"solid"}],
    "angles": [{"vertex":"B","label":"90°","isRight":true}],
    "marks": [{"type":"equal","edges":["AB","AC"]}],
    "note": "그림 설명"
  },
  "type": "문제 유형",
  "grade": "중1/중2/중3",
  "chapter": "단원명",
  "steps": [
    {
      "highlight": "형광펜 원문 (problemText 그대로)",
      "figureHighlight": ["AB","∠B"],
      "color": "coral/sky/mint/lavender",
      "title": "한 줄 제목",
      "explain": "중학생 눈높이 설명 (반말, 2-3줄)",
      "category": "조건/관계/구하는것/공식힌트",
      "curriculumTag": {
        "semester": "중2-2",
        "unit": "삼각형의 성질",
        "subunit": "이등변삼각형의 성질",
        "unlearned": false
      }
    }
  ],
  "equation": "세워야 할 식 (답 절대 금지!)",
  "direction": "풀이 방향 힌트 한 줄",
  "deepHelp": [
    {
      "stepIndex": 0,
      "prerequisite": "선행 개념",
      "prerequisiteGrade": "중1",
      "prerequisiteSemester": "중1-2",
      "prerequisiteUnit": "기본도형",
      "simpleExplain": "쉬운 설명 3-4줄",
      "example": "한 자릿수 쉬운 예시 (변이 3,4,5인 삼각형 등)",
      "analogy": "일상 비유 (피자, 종이접기 등)"
    }
  ]
}

핵심 규칙:
- problemText 안에서 선분은 [seg]AB[/seg], 분수는 [frac]분자|분모[/frac] 형태 사용
- ⚠️ 거듭제곱(지수) 표기는 반드시 [exp]밑|지수[/exp] 태그만 사용할 것:
  · 한 자리 지수든 두 자리 이상이든 모두 [exp] 태그로 표기 (예외 없음)
  · 예: 2의 10제곱 → [exp]2|10[/exp]
  · 예: x의 2제곱 → [exp]x|2[/exp]
  · 예: 2의 (a+b)제곱 → [exp]2|a+b[/exp]
  · 예: [frac] 안의 지수도 동일: [frac]1|[exp]2|10[/exp][/frac]
  · 유니코드 윗첨자 문자(² ³ ¹ ⁰ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁿ ˣ ʸ ᵃ ᵇ ᶜ 등) 절대 사용 금지 — 모바일 폰트에서 깨짐
  · ^ 기호(예: 2^10) 절대 사용 금지
- 사진의 채점/필기/동그라미 무시, 원본 문제만
- figure.vertices: SVG좌표(y아래양수)
- figureHighlight: step에서 강조할 변/각
- steps 3~6단계
- equation에 답 절대 금지
- deepHelp.example: 한 자릿수 쉬운 숫자
- deepHelp.analogy: 중학생 일상 비유
- 보기/선택지는 각각 줄바꿈
- mathNotation 필드는 참고용이며 출력하지 마. problemText에 직접 적용해
- 각 step의 curriculumTag는 그 step에서 사용하는 핵심 개념의 학기/단원/소단원을 정확히 명시
- 진도 범위 밖 개념을 사용한 step은 반드시 unlearned: true로 표시
- 진도 범위 안의 개념만으로 풀 수 있다면 모든 step의 unlearned는 false`;

  const content = [];
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    content.push({ type: "text", text: text || "이 수학 문제를 직독직해 방식으로 분석해줘. 채점이나 필기는 무시하고 원본 문제만 추출해." });
  } else {
    content.push({ type: "text", text });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-sonnet-4-20250514", max_tokens: 4000, system: systemPrompt, messages: [{ role: "user", content }] }),
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || "";

    // 유니코드 윗첨자 사용 감지 → 경고 로그 (프롬프트 미준수 모니터링)
    const SUPERSCRIPT_RE = /[\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u207F\u02E3\u02B8\u1D43\u1D47\u1D9C]/;
    if (SUPERSCRIPT_RE.test(raw)) {
      const match = raw.match(/.{0,20}[\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u207F\u02E3\u02B8\u1D43\u1D47\u1D9C].{0,20}/);
      console.warn("[analyze.js] AI가 유니코드 윗첨자 사용함 — 프롬프트 미준수. context:", match?.[0]);
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Parse failed", raw: raw.slice(0, 300) });
    const parsed = JSON.parse(jsonMatch[0]);
    const sanitized = sanitizeResult(parsed);
    if (!sanitized) return res.status(500).json({ error: "Invalid response shape" });
    return res.status(200).json(sanitized);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
