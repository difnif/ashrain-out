// api/dissect.js
// 해부실(Dissect) — 한 문제를 5가지 축으로 깊이 검토
// 1. 숫자 변경 견고성  2. 결과 관계의 일반성  3. 성질 증명 시연
// 4. 편법의 일반성    5. 검산 팁
// 관리자 전용 기능 (학생 노출 X)

// 응답 스키마 검증 (silent failure 방지)
function sanitizeResult(data) {
  if (!data || typeof data !== "object") return null;
  if (!data.dissection || typeof data.dissection !== "object") {
    data.dissection = {};
  }
  const d = data.dissection;

  // 1. numberVariation
  if (!d.numberVariation || typeof d.numberVariation !== "object") {
    d.numberVariation = { summary: "", analysis: "", examples: [], verdict: "unknown" };
  }
  if (!Array.isArray(d.numberVariation.examples)) d.numberVariation.examples = [];

  // 2. generalRelation
  if (!d.generalRelation || typeof d.generalRelation !== "object") {
    d.generalRelation = { summary: "", claimedRelation: "", analysis: "", scope: "unknown", counterexamples: [] };
  }
  if (!Array.isArray(d.generalRelation.counterexamples)) d.generalRelation.counterexamples = [];

  // 3. proofDemo
  if (!d.proofDemo || typeof d.proofDemo !== "object") {
    d.proofDemo = { propertyName: "", givens: [], steps: [], conclusion: "" };
  }
  if (!Array.isArray(d.proofDemo.givens)) d.proofDemo.givens = [];
  if (!Array.isArray(d.proofDemo.steps)) d.proofDemo.steps = [];

  // 4. shortcut
  if (!d.shortcut || typeof d.shortcut !== "object") {
    d.shortcut = { method: "", summary: "", scope: "unknown", analysis: "", warning: "" };
  }

  // 5. verification
  if (!d.verification || typeof d.verification !== "object") {
    d.verification = { available: false, tips: [], note: "" };
  }
  if (!Array.isArray(d.verification.tips)) d.verification.tips = [];

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

  const { text, imageBase64, model } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: "No input" });

  const systemPrompt = `너는 중학교 수학 교사이자 수학 교육 연구자야.
학생이 푼 한 문제를 받으면, 단순히 "정답"을 검토하는 게 아니라 **그 문제의 수학적 본질**을 5가지 축으로 깊이 파헤친다.

[수학 기호 규칙 — 반드시 지킬 것]
- 선분: [seg]AB[/seg]
- 직선: [line]AB[/line]
- 반직선: [ray]AB[/ray]
- 분수: [frac]분자|분모[/frac] (예: [frac]1|2[/frac])
- 거듭제곱: [exp]밑|지수[/exp] (예: [exp]2|10[/exp]) — 한 자리 지수도 예외 없음
- 유니코드 윗첨자(² ³ ⁿ 등)와 ^ 기호 절대 금지
- combining overline(̅) 절대 금지
- 나머지: ∠ABC, △ABC, ∥, ⊥, ≡, °, √

반드시 아래 JSON 형식만 출력해. 다른 텍스트, 마크다운 코드블럭(\`\`\`) 없이 순수 JSON만.

{
  "problemText": "사진/텍스트에서 추출한 문제 전문. 채점이나 필기는 무시. 여러 문제면 주요 1개만. 수학 기호는 위 규칙 적용.",
  "type": "문제 유형 (예: '이등변삼각형의 성질 활용', '연립방정식의 해 구하기')",
  "grade": "중1/중2/중3",
  "chapter": "단원명",
  "dissection": {
    "numberVariation": {
      "summary": "한 줄 요약 (예: '숫자를 바꾸면 일부 경우 삼각부등식이 깨져서 성립 안 함')",
      "analysis": "이 문제의 숫자(변의 길이, 각도, 계수 등)를 다른 값으로 바꾸면 같은 풀이 흐름이 통하는지 분석. 어떤 조건(삼각부등식, 양수 제약, 정수 해 제약 등)이 깨질 수 있는지 구체적으로. 2~4 문단.",
      "examples": [
        {
          "change": "구체적으로 어떤 숫자를 어떻게 바꿨는지 (예: 'AB=5cm를 AB=2cm로')",
          "result": "그 결과 어떻게 되는지 (예: '삼각부등식 깨짐: 2+3<6')",
          "verdict": "ok"
        }
      ],
      "verdict": "robust"
    },
    "generalRelation": {
      "summary": "한 줄 요약 (예: '∠A=∠B+∠C는 직각삼각형이 아닐 때만 성립')",
      "claimedRelation": "이 문제에서 도출되는 핵심 관계식이나 결과 (예: '∠AOB = 2∠ACB')",
      "analysis": "이 관계가 모든 경우에 성립하는 일반 정리인지, 특정 유형(예: 예각삼각형)에서만 성립하는지, 아니면 이 문제의 우연한 수치 때문에 그런 건지 검토. 도형의 위치/크기/각도를 일반화해서 검증. 2~4 문단.",
      "scope": "always",
      "counterexamples": [
        "반례나 예외 상황 (해당 시. 없으면 빈 배열)"
      ]
    },
    "proofDemo": {
      "propertyName": "이 문제로 시연할 핵심 성질명 (예: '이등변삼각형의 두 밑각은 같다')",
      "givens": [
        "이 문제에서 주어진 조건들을 그대로 추출 (예: '△ABC에서 [seg]AB[/seg]=[seg]AC[/seg]')",
        "조건 2..."
      ],
      "steps": [
        {
          "claim": "한 단계에서 주장하는 것 (예: '△ABD ≡ △ACD')",
          "reason": "근거 (예: 'SAS 합동: [seg]AB[/seg]=[seg]AC[/seg], ∠BAD=∠CAD, [seg]AD[/seg]는 공통')",
          "curriculumTag": "중2-2 삼각형의 합동조건"
        }
      ],
      "conclusion": "결론 (예: '∴ ∠B = ∠C')"
    },
    "shortcut": {
      "method": "이 문제를 빠르게 푸는 편법/꼼수 (예: '두 식을 더하면 변수 하나가 소거됨')",
      "summary": "한 줄 요약",
      "scope": "always",
      "analysis": "이 편법이 이 문제에서 왜 통하는지 + 일반적으로 통하는 방법인지 / 이 문제의 특수한 조건 때문에만 통하는지 검토. 2~3 문단. 편법이 없거나 정공법이 곧 최선이면 method='없음', summary='편법 불필요/없음'으로.",
      "warning": "학생에게 가르칠 때 주의점 (예: '계수가 정확히 같지 않으면 안 통함')"
    },
    "verification": {
      "available": true,
      "tips": [
        {
          "method": "검산 방법 이름 (예: '대입 검산', '특수값 대입', '단위 확인', '극한 케이스 확인')",
          "detail": "구체적으로 어떻게 하는지"
        }
      ],
      "note": "검산이 어렵거나 의미 없는 경우 그 이유. 충분한 검산법이 있으면 빈 문자열."
    }
  }
}

[검토 기준 상세]

verdict 값:
- numberVariation.verdict: "robust"(어떤 숫자도 OK) / "fragile"(쉽게 조건 깨짐) / "conditional"(특정 범위에서만 OK)
- numberVariation.examples[].verdict: "ok"(잘 풀림) / "break"(조건 깨짐)
- generalRelation.scope: "always"(모든 경우 성립하는 정리) / "specific"(특정 유형에서만 성립) / "coincidence"(이 수치의 우연)
- shortcut.scope: "always"(모든 경우 통하는 일반법) / "specific"(특정 유형에만) / "coincidence"(이 문제의 우연) / "none"(편법 없음)
- verification.available: 검산 팁이 있으면 true, 의미있는 검산이 어려우면 false

[중요 원칙]
- 답을 직접 알려주지 마. 풀이 과정과 검토에 집중.
- 2022 개정 한국 중학교 수학 교육과정 범위 안에서 설명. 헤론의 공식, 원주각 정리(중심각=2×원주각의 직접 사용)는 범위 밖. 이등변삼각형의 외각 성질로 우회 가능.
- proofDemo는 이 문제의 조건만으로 시연 가능한 성질을 골라서 증명. 문제와 무관한 일반 증명 X.
- 모든 텍스트에서 수학 기호는 위 규칙 엄수.`;

  const content = [];
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    content.push({ type: "text", text: text || "이 수학 문제를 5가지 축으로 해부 분석해줘. 채점이나 필기는 무시하고 원본 문제만 추출해." });
  } else {
    content.push({ type: "text", text });
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || "";

    // 유니코드 윗첨자 사용 감지 → 경고 로그
    const SUPERSCRIPT_RE = /[\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u207F\u02E3\u02B8\u1D43\u1D47\u1D9C]/;
    if (SUPERSCRIPT_RE.test(raw)) {
      const match = raw.match(/.{0,20}[\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u207F\u02E3\u02B8\u1D43\u1D47\u1D9C].{0,20}/);
      console.warn("[dissect.js] AI가 유니코드 윗첨자 사용함 — 프롬프트 미준수. context:", match?.[0]);
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
