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
  "problemText": "사진에서 추출한 문제 전체 텍스트 (텍스트 입력이면 그대로 사용)",
  "type": "문제 유형 (예: 이등변삼각형의 성질, 일차방정식 활용)",
  "grade": "중1/중2/중3",
  "chapter": "단원명",
  "steps": [
    {
      "highlight": "형광펜 칠할 문제 원문 부분 (problemText에 있는 그대로)",
      "color": "coral/sky/mint/lavender",
      "title": "이 부분이 뭘 뜻하는지 한 줄 제목",
      "explain": "중학생 눈높이 설명 (2-3줄, 친근하게)",
      "category": "조건/관계/구하는것/공식힌트"
    }
  ],
  "equation": "세워야 할 식 (답은 절대 쓰지 마!)",
  "direction": "이 식을 어떻게 풀면 되는지 한 줄 힌트",
  "deepHelp": [
    {
      "stepIndex": 0,
      "prerequisite": "선행 개념명",
      "prerequisiteGrade": "중1",
      "simpleExplain": "선행 개념을 아주 쉽게 설명 (3-4줄)",
      "example": "숫자를 아주 작고 쉽게 바꾼 예시 문제와 풀이 (예: '삼각형 세 변이 3, 4, 5일 때...'처럼 계산하기 쉬운 숫자로)",
      "analogy": "일상생활 비유 (예: '피자를 똑같이 나누는 것처럼...')"
    }
  ]
}

핵심 규칙:
- steps는 문제를 위→아래로 읽으며 3~6단계로 분석
- highlight는 반드시 problemText 안의 원문 그대로
- color: 길이/크기=coral, 각도/관계=sky, 조건/가정=mint, 구하는것=lavender
- equation에 답을 절대 포함하지 마
- deepHelp의 example은 반드시 숫자가 작고 계산이 쉬운 예시 (한 자릿수)
- deepHelp의 analogy는 중학생이 공감할 일상 비유 (피자, 종이접기, 줄서기 등)
- 말투: "~이야", "~거든", "~해봐" 같은 친근한 반말`;

  const content = [];
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    content.push({ type: "text", text: text || "이 수학 문제를 직독직해 방식으로 분석해줘." });
  } else {
    content.push({ type: "text", text });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system: systemPrompt, messages: [{ role: "user", content }] }),
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Parse failed", raw: raw.slice(0, 200) });
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
