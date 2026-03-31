import { useState } from "react";
import { PASTEL } from "../config";

/**
 * HelpPopup: 부가 설명 + 선생님께 질문하기 팝업
 * Props:
 *  - theme, playSfx, showMsg
 *  - title: 어떤 성질/공식에 대한 도움인지
 *  - explain: 부가 설명 텍스트
 *  - example: 쉬운 숫자 예시 (optional)
 *  - analogy: 일상 비유 (optional)
 *  - onClose: 닫기 콜백
 *  - onSendQuestion: (questionData) => void — 질문함으로 보내기
 *  - contextData: { type, figure, propertyId, screenName } — 질문에 포함할 맥락
 */
export function HelpPopup({ theme, playSfx, showMsg, title, explain, example, analogy, onClose, onSendQuestion, contextData }) {
  const [phase, setPhase] = useState("explain"); // explain | ask | sent

  const handleSend = () => {
    if (onSendQuestion) {
      onSendQuestion({
        ...contextData,
        helpTitle: title,
        helpExplain: explain,
        timestamp: Date.now(),
      });
    }
    setPhase("sent");
    playSfx("success");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 9999, animation: "fadeIn 0.2s ease",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 500, maxHeight: "80vh",
        background: theme.bg, borderRadius: "24px 24px 0 0",
        overflow: "hidden", display: "flex", flexDirection: "column",
        animation: "slideUp 0.3s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>💡 {title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {phase === "explain" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {/* 부가 설명 */}
              <div style={{ fontSize: 14, lineHeight: 2.2, color: theme.text, marginBottom: 16 }}>
                {explain}
              </div>

              {/* 쉬운 예시 */}
              {example && (
                <div style={{ padding: "12px 14px", borderRadius: 14, background: `${PASTEL.mint}08`, border: `1px solid ${PASTEL.mint}25`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: PASTEL.mint, fontWeight: 700, marginBottom: 6 }}>🔢 쉬운 숫자로 해보면</div>
                  <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{example}</div>
                </div>
              )}

              {/* 일상 비유 */}
              {analogy && (
                <div style={{ padding: "12px 14px", borderRadius: 14, background: `${PASTEL.sky}08`, border: `1px solid ${PASTEL.sky}25`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: PASTEL.sky, fontWeight: 700, marginBottom: 6 }}>🌍 이렇게 생각해봐</div>
                  <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{analogy}</div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  border: `1px solid ${theme.border}`, background: theme.card,
                  color: theme.text, fontSize: 13, cursor: "pointer",
                }}>이해했어!</button>
                <button onClick={() => setPhase("ask")} style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: `${PASTEL.coral}15`, color: PASTEL.coral,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>그래도 모르겠어 😢</button>
              </div>
            </div>
          )}

          {phase === "ask" && (
            <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🙋</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 4 }}>선생님께 질문할까요?</p>
              <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 16 }}>
                어떤 내용을 공부하다가 어디서 막혔는지<br/>선생님이 확인할 수 있어요
              </p>
              <button onClick={handleSend} style={{
                width: "100%", padding: 14, borderRadius: 14, border: "none",
                background: PASTEL.coral, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8,
              }}>📨 선생님께 질문하기</button>
              <button onClick={() => setPhase("explain")} style={{
                width: "100%", padding: 8, border: "none", background: "transparent",
                color: theme.textSec, fontSize: 11, cursor: "pointer",
              }}>아니야, 다시 읽어볼게</button>
            </div>
          )}

          {phase === "sent" && (
            <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: PASTEL.mint }}>선생님께 질문했어요!</p>
              <p style={{ fontSize: 11, color: theme.textSec, marginTop: 4 }}>확인하면 답변을 보내줄 거예요</p>
              <button onClick={onClose} style={{
                marginTop: 16, padding: "10px 24px", borderRadius: 12,
                border: `1px solid ${theme.border}`, background: theme.card,
                color: theme.text, fontSize: 12, cursor: "pointer",
              }}>확인</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 각 성질에 대한 부가 설명 데이터
export const PROPERTY_HELP = {
  // 외접원 관련
  circumRadius: {
    title: "외접원의 반지름 R",
    explain: "외접원은 삼각형의 세 꼭짓점을 모두 지나는 원이야. 이 원의 중심을 외심(O)이라 하고, 반지름을 R이라고 해.",
    example: "세 변이 3, 4, 5인 직각삼각형이면 R = 5÷2 = 2.5야. 빗변의 절반이 반지름이 되거든!",
    analogy: "운동장에서 세 친구가 서 있을 때, 세 명이 모두 같은 원 위에 서려면 딱 하나의 원이 정해져. 그게 외접원이야.",
  },
  circumEqual: {
    title: "OA = OB = OC",
    explain: "외심 O에서 세 꼭짓점 A, B, C까지의 거리가 모두 같아. 왜냐하면 외심은 원의 중심이고, 세 꼭짓점은 모두 원 위에 있으니까!",
    example: "원의 중심에서 원 위의 아무 점까지 거리는 항상 반지름이잖아. A도 원 위, B도 원 위, C도 원 위니까 거리가 다 같아!",
    analogy: "놀이공원 회전목마 생각해봐. 중심 기둥에서 모든 말까지의 거리가 같잖아? 그게 외심의 원리야.",
  },
  centralAngle: {
    title: "중심각 = 2 × 원주각",
    explain: "원에서 같은 호에 대해, 중심에서 본 각(중심각)은 원 위에서 본 각(원주각)의 2배야. ∠BOC = 2∠A가 되는 이유지.",
    example: "∠A가 30°이면 ∠BOC = 60°야. ∠A가 45°면 ∠BOC = 90°!",
    analogy: "영화관에서 맨 앞자리(중심)에서 보면 화면이 크게 보이고, 뒷자리(원 위)에서 보면 작게 보이는 것처럼, 중심에서 본 각이 2배!",
  },
  // 내접원 관련
  inRadius: {
    title: "내접원의 반지름 r",
    explain: "내접원은 삼각형의 세 변에 모두 접하는 원이야. 이 원의 중심을 내심(I)이라 하고, 반지름을 r이라고 해.",
    example: "세 변이 3, 4, 5인 직각삼각형이면 r = (3+4-5)÷2 = 1이야.",
    analogy: "삼각형 모양 그릇 안에 넣을 수 있는 가장 큰 공. 그 공의 크기가 내접원의 반지름이야.",
  },
  inEqual: {
    title: "내심에서 세 변까지 거리 = r",
    explain: "내심 I에서 세 변 BC, CA, AB까지의 수직 거리가 모두 같아. 왜냐하면 내심은 원의 중심이고, 세 변은 원에 접하니까!",
    example: "원이 선에 접한다 = 원의 중심에서 그 선까지 거리가 반지름이라는 뜻이야.",
    analogy: "방 한가운데 서서 네 벽까지 손을 뻗으면, 가장 큰 원을 그릴 수 있는 위치가 내심이야.",
  },
  bicAngle: {
    title: "∠BIC = 90° + ½∠A",
    explain: "내심에서 B와 C를 바라본 각도는 항상 90° + ∠A의 절반이야. 이건 내심이 각의 이등분선의 교점이라서 생기는 성질이야.",
    example: "∠A = 60°이면 ∠BIC = 90° + 30° = 120°야.",
    analogy: "두 거울을 각도로 놓으면 반사되는 빛의 각도가 정해지듯이, 이등분선이 만나는 각도가 정해지는 거야.",
  },
  areaFill: {
    title: "넓이 = ½ × r × 둘레",
    explain: "삼각형 넓이를 내접원으로 구할 수 있어! 내심에서 세 변에 수선을 내리면 삼각형이 3개로 나뉘는데, 각각의 높이가 r이거든.",
    example: "세 변이 3, 4, 5이고 r = 1이면, 넓이 = ½ × 1 × (3+4+5) = 6이야. 맞지?",
    analogy: "피자 한 판을 3조각으로 자르면, 각 조각의 높이가 같으면 넓이를 쉽게 구할 수 있는 것처럼!",
  },
  // 합동 관련
  rha: {
    title: "RHA 합동 (빗변과 한 예각)",
    explain: "직각삼각형에서 빗변의 길이와 한 예각의 크기가 같으면 두 삼각형은 합동이야. 직각 + 한 예각이 정해지면 나머지 각도 자동으로 정해지거든 (세 각의 합 = 180°).",
    example: "빗변 = 5, ∠B = 30°인 두 직각삼각형 → 나머지 각은 60°로 같고, ASA 합동!",
    analogy: "사다리를 벽에 기대면, 사다리 길이(빗변)와 기울기(예각)가 같으면 항상 같은 모양이 돼.",
  },
  rhs: {
    title: "RHS 합동 (빗변과 다른 한 변)",
    explain: "직각삼각형에서 빗변과 다른 한 변의 길이가 같으면 합동이야. 피타고라스 정리로 나머지 변도 정해지거든.",
    example: "빗변 = 5, 한 변 = 3이면 나머지 변 = 4 (3² + 4² = 5²). 두 삼각형 모양이 완전히 같아!",
    analogy: "L자 모양 자를 생각해봐. 한쪽 팔 길이와 대각선이 같으면, 다른 쪽 팔 길이도 자동으로 정해지잖아.",
  },
  // 공식 관련
  formulaR: {
    title: "외접원 반지름 R 구하는 공식",
    explain: "R = (a × b × c) ÷ (4 × S)에서 a, b, c는 세 변, S는 넓이야. 넓이는 헤론의 공식으로 구해.",
    example: "세 변이 3, 4, 5이면 S = 6이고, R = (3×4×5) ÷ (4×6) = 60÷24 = 2.5야.",
    analogy: "큰 삼각형일수록 외접원도 커지고, 넓이가 크면 반지름은 작아져. 뚱뚱한 삼각형 = 작은 외접원!",
  },
  formulaR_r: {
    title: "내접원 반지름 r 구하는 공식",
    explain: "r = S ÷ s 에서 S는 넓이, s는 (a+b+c)÷2야.",
    example: "세 변이 3, 4, 5이면 s = 6, S = 6이니까 r = 6÷6 = 1이야.",
    analogy: "넓이(S)가 같아도 둘레가 길면 r이 작아져. 마른 삼각형 안에는 작은 공만 들어가!",
  },
};
