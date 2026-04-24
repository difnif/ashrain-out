import { useState } from "react";
import EpisodePlayer from "../recipedetective/EpisodePlayer";
import haagendazsVanilla from "../recipedetective/episodes/haagendazs-vanilla";
import nutella from "../recipedetective/episodes/nutella";
import bananaMilk from "../recipedetective/episodes/banana-milk";

// 에피소드 목록
const EPISODES = [
  haagendazsVanilla,
  nutella,
  bananaMilk,
];

export function renderRecipeDetectiveScreen(ctx) {
  const { theme, setScreen } = ctx;
  return <RecipeDetectiveInner theme={theme} setScreen={setScreen} />;
}

function RecipeDetectiveInner({ theme, setScreen }) {
  const [selectedEp, setSelectedEp] = useState(null);

  if (selectedEp) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: theme.bg,
        display: "flex", flexDirection: "column",
      }}>
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.border}33`,
        }}>
          <button
            onClick={() => setSelectedEp(null)}
            style={{
              background: "transparent", border: "none",
              fontSize: 20, cursor: "pointer", padding: "4px 8px",
              color: theme.text,
            }}
          >←</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.5, color: theme.text }}>
              🧮 쓸모있지만 어려운 수학
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
              성분표 탐정
            </div>
          </div>
          <button
            onClick={() => setScreen("studentHome")}
            style={{
              background: "transparent", border: `1px solid ${theme.border}`,
              borderRadius: 8, padding: "6px 12px",
              fontSize: 12, cursor: "pointer", color: theme.text,
            }}
          >✕ 닫기</button>
        </div>

        {/* 플레이어 */}
        <EpisodePlayer
          episode={selectedEp}
          theme={theme}
          onExit={() => setSelectedEp(null)}
        />
      </div>
    );
  }

  // 에피소드 선택 화면
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: theme.bg,
      display: "flex", flexDirection: "column",
    }}>
      {/* 헤더 */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.border}33`,
      }}>
        <button
          onClick={() => setScreen("studentHome")}
          style={{
            background: "transparent", border: "none",
            fontSize: 20, cursor: "pointer", padding: "4px 8px",
            color: theme.text,
          }}
        >←</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 11, opacity: 0.5, color: theme.text }}>
            🧮 쓸모있지만 어려운 수학
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
            성분표 탐정
          </div>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* 인트로 */}
      <div style={{
        padding: "24px 20px 16px",
        textAlign: "center",
        color: theme.text,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🕵️</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>성분표 탐정</div>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6, lineHeight: 1.6 }}>
          기업이 절대 공개하지 않는 레시피.<br />
          뒷면 성분표 숫자만으로 수학적으로 밝혀냅니다.
        </div>
      </div>

      {/* 에피소드 카드 */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 16px 24px",
      }}>
        {EPISODES.map(ep => (
          <button
            key={ep.id}
            onClick={() => setSelectedEp(ep)}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px",
              marginBottom: 12,
              background: theme.bg,
              border: `1.5px solid ${theme.border}`,
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "transform 0.1s",
            }}
          >
            <div style={{ fontSize: 36 }}>{ep.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>
                {ep.title}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, color: theme.text }}>
                {ep.subtitle}
              </div>
              <div style={{
                display: "flex", gap: 6, marginTop: 6,
              }}>
                <span style={{
                  fontSize: 10, padding: "2px 8px",
                  borderRadius: 10,
                  background: (theme.accent || "#D96B5A") + "18",
                  color: theme.accent || "#D96B5A",
                  fontWeight: 600,
                }}>
                  {ep.category}
                </span>
                <span style={{
                  fontSize: 10, padding: "2px 8px",
                  borderRadius: 10,
                  background: theme.border + "33",
                  color: theme.text,
                }}>
                  {ep.difficulty}
                </span>
                <span style={{
                  fontSize: 10, padding: "2px 8px",
                  borderRadius: 10,
                  background: theme.border + "33",
                  color: theme.text,
                }}>
                  ~5분
                </span>
              </div>
            </div>
            <div style={{ fontSize: 18, opacity: 0.3, color: theme.text }}>→</div>
          </button>
        ))}

        {/* 예고편 */}
        <div style={{
          padding: "16px",
          border: `1.5px dashed ${theme.border}`,
          borderRadius: 14,
          textAlign: "center",
          opacity: 0.5,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, color: theme.text }}>🔜 다음 에피소드</div>
          <div style={{ fontSize: 12, color: theme.text, marginTop: 4 }}>
            누텔라 · 바나나맛 우유 · ...
          </div>
        </div>
      </div>
    </div>
  );
}
