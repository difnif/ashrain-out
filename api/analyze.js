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
  "problemText": "추출한 문제 전문. 수학 기호 규칙: 선분은 'AB' (bar 기호 쓰지 마. 문맥에서 선분인지 알 수 있으면 그냥 AB), 직선 AB는 그냥 '직선 AB', 반직선은 '반직선 AB', 각=∠ABC, 삼각형=△ABC, 평행=∥, 수직=⊥, 합동=≡. 절대 combining overline(̅) 사용 금지 - 모바일에서 깨짐. 채점/필기 무시, 원본만. 여러 문제면 주요 1개만. 보기/선택지는 각각 줄바꿈(\n)으로 구분. 예: ①, ②, ③은 각각 새 줄. 문제 본문과 보기 사이도 줄바꿈.",
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

규칙:
- 사진의 채점/필기/동그라미 무시, 원본 문제만
- 수학 기호는 유니코드: ∠ △ ⊥ ∥ ≡ ° ² √
- figure.vertices: SVG좌표(y아래양수)
- figureHighlight: step에서 강조할 변/각
- steps 3~6단계
- equation에 답 절대 금지
- deepHelp.example: 한 자릿수 쉬운 숫자
- deepHelp.analogy: 중학생 일상 비유`;

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
