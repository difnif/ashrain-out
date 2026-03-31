export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { text, imageBase64 } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "No input" });

  const systemPrompt = `너는 중학교 수학 선생님이야. 학생이 수학 문제를 보내면, 문제를 "직독직해"하듯 한 문장씩 분석해.

반드시 아래 JSON 형식만 출력해. 다른 텍스트 없이 순수 JSON만.

{
  "problemText": "추출한 문제 전문. 보기/선택지는 줄바꿈으로 구분. 채점/필기/동그라미 무시, 원본만. 여러 문제 보이면 주요 1개만.",
  "mathNotation": "수학 기호 규칙: 선분은 [seg]AB[/seg], 직선은 [line]AB[/line], 반직선은 [ray]AB[/ray], 분수는 [frac]분자|분모[/frac] (예: [frac]18|2²×5²×a[/frac]). 나머지: ∠ABC, △ABC, ∥, ⊥, ≡, °, ², √. combining overline(̅) 절대 금지.",
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
      "category": "조건/관계/구하는것/공식힌트"
    }
  ],
  "equation": "세워야 할 식 (답 절대 금지!)",
  "direction": "풀이 방향 힌트 한 줄",
  "deepHelp": [
    {
      "stepIndex": 0,
      "prerequisite": "선행 개념",
      "prerequisiteGrade": "중1",
      "simpleExplain": "쉬운 설명 3-4줄",
      "example": "한 자릿수 쉬운 예시 (변이 3,4,5인 삼각형 등)",
      "analogy": "일상 비유 (피자, 종이접기 등)"
    }
  ]
}

핵심 규칙:
- problemText 안에서 선분은 [seg]AB[/seg], 분수는 [frac]분자|분모[/frac] 형태 사용
- 사진의 채점/필기/동그라미 무시, 원본 문제만
- figure.vertices: SVG좌표(y아래양수)
- figureHighlight: step에서 강조할 변/각
- steps 3~6단계
- equation에 답 절대 금지
- deepHelp.example: 한 자릿수 쉬운 숫자
- deepHelp.analogy: 중학생 일상 비유
- 보기/선택지는 각각 줄바꿈
- mathNotation 필드는 참고용이며 출력하지 마. problemText에 직접 적용해`;

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
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system: systemPrompt, messages: [{ role: "user", content }] }),
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Parse failed", raw: raw.slice(0, 300) });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
