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
                <button onClick={() => {
                  // 이해도 데이터 기록
                  try {
                    const logs = JSON.parse(localStorage.getItem("ar_help_understood") || "[]");
                    logs.push({ title, time: Date.now(), understood: true });
                    localStorage.setItem("ar_help_understood", JSON.stringify(logs.slice(-100)));
                  } catch {}
                  onClose();
                }} style={{
                  flex: 1, padding: 12, borderRadius: 12,
                  border: `1px solid ${theme.border}`, background: theme.card,
                  color: theme.text, fontSize: 13, cursor: "pointer",
                }}>이해했어! 👍</button>
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
  // ===== 외심 관련 =====
  circumRadiiAll: {
    title: "외심은 왜 생길까?",
    explain: "1학년 때 컴퍼스로 수직이등분선을 작도한 거 기억나지? 수직이등분선 위의 모든 점은 양 끝점에서 같은 거리에 있어. 그러니까 세 변의 수직이등분선이 한 점에서 만나면, 그 점은 세 꼭짓점 모두에서 같은 거리에 있게 돼. 그게 바로 외심이야!",
    example: "변 AB의 수직이등분선 위에 있는 점 O는 OA = OB를 만족해. 변 BC의 수직이등분선도 O를 지나니까 OB = OC도 성립하고, 결국 OA = OB = OC!",
    analogy: "세 마을 사이에 소방서를 짓는데, 세 마을까지 거리가 똑같은 곳을 찾으면 그게 외심의 위치야.",
  },
  circumRadius: {
    title: "외접원의 반지름 R",
    explain: "외접원은 삼각형의 세 꼭짓점을 모두 지나는 원이야. 외심 O에서 아무 꼭짓점까지의 거리가 반지름 R이 돼. OA = OB = OC = R이니까 어떤 꼭짓점을 골라도 같아.",
    example: "세 변이 3, 4, 5인 직각삼각형이면 외심이 빗변의 중점에 있어서 R = 5÷2 = 2.5야!",
    analogy: "원래 원은 한 점에서 같은 거리에 있는 점들의 모임이잖아. 세 꼭짓점이 모두 같은 거리에 있으니 딱 하나의 원이 결정되는 거야.",
  },
  allAngles: {
    title: "삼각형의 세 각",
    explain: "삼각형의 세 내각의 합은 항상 180°야. 이걸 알면 두 각만 알아도 나머지 하나를 구할 수 있어.",
    example: "∠A = 60°, ∠B = 70°이면 ∠C = 180° - 60° - 70° = 50°야.",
  },
  centralAngle: {
    title: "∠BOC = 2∠A",
    explain: "이건 '원주각' 얘기가 아니야! 이등변삼각형의 밑각 + 삼각형 외각의 성질만으로 증명돼.\n\n△OAB에서 OA = OB = R이니까 이등변삼각형이지? 밑각을 각각 x라 하면, △OAB의 외각(∠BOD) = 2x야.\n마찬가지로 △OAC에서 밑각을 y라 하면, △OAC의 외각(∠COD) = 2y.\n\n∠A = x + y이고, ∠BOC = 2x + 2y = 2(x + y) = 2∠A!",
    example: "∠A = 40°이면 ∠BOC = 80°야. ∠A가 직각(90°)이면 ∠BOC = 180°(평각)이 돼서 B, O, C가 일직선!",
    analogy: "외심에서 바라본 각도는 꼭짓점에서 바라본 각도의 2배야. 더 가까이 있으니까 더 크게 보이는 거라고 생각해도 돼!",
  },
  isoOAB: {
    title: "외심이 만드는 이등변삼각형",
    explain: "OA = OB = R (외심의 성질)이니까 △OAB는 두 변이 같은 이등변삼각형이야. 이등변삼각형이면 밑각이 같다는 성질을 기억하지? 마찬가지로 △OBC, △OCA도 이등변삼각형이야.",
    example: "이등변삼각형에서 같은 두 변의 대각(밑각)은 같아. 그래서 △OAB에서 ∠OAB = ∠OBA가 돼.",
    analogy: "피자를 OAB 모양으로 자르면, 두 변(OA, OB)이 같으니까 밑(AB)의 양쪽 각이 똑같아!",
  },
  // ===== 내심 관련 =====
  inRadiiAll: {
    title: "내심은 왜 생길까?",
    explain: "1학년 때 '점과 직선 사이의 거리 = 수직 거리(최단 거리)'를 배웠지? 각의 이등분선 위의 점에서 두 변에 수선을 내리면, 두 수선의 길이가 같아 (RHS 합동으로 증명!). 그러니까 세 각의 이등분선이 한 점에서 만나면, 그 점에서 세 변까지의 수직 거리가 모두 같아. 그게 바로 내심이야!",
    example: "∠A의 이등분선 위의 점 I에서 변 AB, AC에 수선을 내리면, 직각삼각형 두 개가 RHS 합동이 돼서 수선의 길이가 같아!",
    analogy: "삼각형 모양 운동장에서, 세 변의 울타리까지 거리가 모두 같은 곳에 서면 그게 내심이야. 거기서 가장 큰 원을 그릴 수 있어!",
  },
  inRadius: {
    title: "내접원의 반지름 r",
    explain: "내접원은 삼각형의 세 변에 모두 접하는 원이야. 내심 I에서 세 변까지의 수직 거리가 모두 r이야. '접한다'는 건 원과 직선이 딱 한 점에서 만난다는 뜻이고, 그때 중심에서 직선까지의 거리가 반지름이야.",
    example: "원이 직선에 접할 때, 접점에서 중심으로 그은 선분은 직선에 수직이야. 이게 바로 r!",
    analogy: "삼각형 모양 그릇 안에 넣을 수 있는 가장 큰 공. 그 공의 크기가 내접원의 반지름 r이야.",
  },
  bicAngle: {
    title: "∠BIC = 90° + ½∠A",
    explain: "내심 I에서 B와 C를 바라본 각도야. 삼각형 BIC에서 세 각의 합 = 180°이고, ∠IBC = ½∠B, ∠ICB = ½∠C (각의 이등분선이니까)야. 그래서 ∠BIC = 180° - ½∠B - ½∠C = 180° - ½(∠B+∠C) = 180° - ½(180°-∠A) = 90° + ½∠A가 돼!",
    example: "∠A = 60°이면 ∠BIC = 90° + 30° = 120°야. ∠A가 커질수록 ∠BIC도 커져!",
  },
  bisectorRatio: {
    title: "각의 이등분선과 대변의 비",
    explain: "꼭짓점 A에서 각의 이등분선을 그어서 대변 BC와 만나는 점을 D라 하면, BD:DC = AB:AC야. 즉 양 옆 변의 길이 비와 같아!",
    example: "AB = 6, AC = 4이면 BD:DC = 6:4 = 3:2야. 긴 변 쪽에 D가 더 가까워!",
  },
  congA: {
    title: "내심이 만드는 합동 삼각형",
    explain: "내심 I에서 변 AB, AC에 수선을 내린 발을 각각 F, E라 하면 △AFI와 △AEI는 RHS 합동이야. 빗변 AI 공통, 한 변 IF = IE = r, 직각 ∠F = ∠E = 90°. 이게 각의 이등분선의 성질을 증명하는 핵심이야!",
    example: "RHS 합동 조건: 직각(R) + 빗변(H) + 한 변(S)이 같으면 합동이야. 여기서 직각 = ∠F = ∠E, 빗변 = AI(공통), 한 변 = IF = IE = r!",
  },
  // ===== 합동 관련 =====
  rha: {
    title: "RHA 합동 (빗변과 한 예각)",
    explain: "직각삼각형에서 빗변의 길이와 한 예각의 크기가 같으면 두 삼각형은 합동이야. 직각(90°) + 한 예각이 정해지면 세 번째 각도 자동으로 정해지거든 (세 각의 합 = 180°). 그래서 결국 ASA 합동이 되는 거야!",
    example: "빗변 = 5, ∠B = 30°인 두 직각삼각형 → ∠A = 60°도 자동 결정 → ASA 합동!",
    analogy: "사다리를 벽에 기대면, 사다리 길이(빗변)와 기울기(예각)가 같으면 항상 같은 모양이 돼.",
  },
  rhs: {
    title: "RHS 합동 (빗변과 다른 한 변)",
    explain: "직각삼각형에서 빗변과 다른 한 변의 길이가 같으면 합동이야. 같은 변끼리 붙여서 이등변삼각형을 만들고, 밑각의 성질로 끼인각을 구해서 결국 SAS 합동을 증명하는 거야!",
    example: "빗변 = 5, 한 변 = 3이면 직각삼각형의 세 변이 3, 4, 5로 정해져. 두 삼각형 모양이 완전히 같아!",
    analogy: "L자 모양 자를 생각해봐. 한쪽 팔 길이와 대각선이 같으면, 다른 쪽 팔 길이도 자동으로 정해지잖아.",
  },
};
