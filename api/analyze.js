export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const { text, imageBase64 } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "No input" });

  const systemPrompt = `너는 중학교 수학 문제 분석 전문가야. 학생이 문제를 보내면 다음을 JSON으로 분석해줘.

반드시 아래 JSON 형식만 출력해. 다른 텍스트 없이 JSON만.

{
  "type": "문제 유형 (예: 일차방정식, 이등변삼각형의 성질, 피타고라스 정리 활용, 일차함수 그래프 등)",
  "grade": "중1/중2/중3",
  "chapter": "해당 단원명",
  "conditions": [
    {"text": "문제에서 추출한 조건 문장", "label": "조건 설명", "color": "coral/sky/mint/lavender 중 하나"}
  ],
  "find": "구하려는 것",
  "reason": "왜 이 풀이 방법을 써야 하는지 논리적 설명 (2-3문장)",
  "method": "풀이에 사용할 핵심 개념/공식 이름",
  "equations": ["세워야 할 식1", "식2", ...],
  "direction": "풀이 방향 힌트 (식을 세운 후 어떻게 진행하면 되는지, 답은 절대 알려주지 마)",
  "tips": "실수하기 쉬운 포인트 (선택)"
}

주의:
- 답을 절대 알려주지 마. 식까지만 세워줘.
- conditions의 color는 조건 종류별로 다르게: 길이/크기=coral, 각도/관계=sky, 조건/가정=mint, 구하는것=lavender
- 중학교 1~3학년 수준으로 설명해
- equations에는 학생이 직접 풀어야 할 식만 넣어`;

  const messages = [];
  const content = [];

  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
    });
    content.push({ type: "text", text: text || "이 수학 문제를 분석해줘." });
  } else {
    content.push({ type: "text", text });
  }

  messages.push({ role: "user", content });

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.content?.[0]?.text || "";
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Failed to parse", raw });

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
