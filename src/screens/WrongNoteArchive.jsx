// ============================================================
// ashrain.out — WrongNoteArchive (sub-view)
// ============================================================
// 비활성(완료/제외) 처리한 노트들의 보관함.
// 분류 상태는 그대로 유지. 활성으로 되돌리거나 영구 삭제 가능.

import { PASTEL } from "../config";

export default function WrongNoteArchive({
  theme,
  playSfx,
  showMsg,
  onBack,
  // notes
  inactiveNotes,
  toggleActive,
  deleteNote,
  // settings
  findFlag,
  findCircle,
}) {
  const handleRestore = async (id) => {
    await toggleActive(id);
    playSfx?.("success");
    showMsg?.("학습큐로 복귀시켰어요", 1500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 사진을 영구 삭제할까요? 되돌릴 수 없어요.")) return;
    await deleteNote(id);
    playSfx?.("click");
    showMsg?.("삭제됨", 1200);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: theme.bg,
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${theme.border}`,
          background: theme.card,
        }}
      >
        <button
          onClick={() => {
            playSfx?.("click");
            onBack?.();
          }}
          style={{
            background: "none",
            border: "none",
            color: theme.text,
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
          }}
          aria-label="뒤로"
        >
          ←
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.text,
            fontFamily: "'Noto Serif KR', serif",
            flex: 1,
          }}
        >
          📦 비활성 보관함 ({inactiveNotes.length})
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {inactiveNotes.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: theme.textSec,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p
              style={{
                fontSize: 12,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              비활성 처리한 사진이 없어요
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {inactiveNotes.map((n) => {
              const flag = n.rangeLabelId ? findFlag(n.rangeLabelId) : null;
              const circle = n.typeLabelId ? findCircle(n.typeLabelId) : null;
              return (
                <div
                  key={n.id}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "1 / 1",
                      filter: "grayscale(0.4) opacity(0.85)",
                    }}
                  >
                    <img
                      src={n.photoBase64}
                      alt=""
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                      }}
                    />
                    {flag && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          padding: "2px 6px",
                          fontSize: 8,
                          fontWeight: 700,
                          background: flag.color,
                          color: theme.text,
                          borderRadius: 6,
                          fontFamily: "'Noto Serif KR', serif",
                        }}
                      >
                        🚩 {flag.label}
                      </div>
                    )}
                    {circle && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          padding: "2px 6px",
                          fontSize: 8,
                          fontWeight: 700,
                          background: circle.color,
                          color: theme.text,
                          borderRadius: 6,
                          fontFamily: "'Noto Serif KR', serif",
                        }}
                      >
                        ● {circle.label}
                      </div>
                    )}
                    {(n.studyCount || 0) > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 4,
                          left: 4,
                          padding: "2px 6px",
                          fontSize: 9,
                          fontWeight: 700,
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          fontFamily: "'Noto Serif KR', serif",
                        }}
                      >
                        × {n.studyCount}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      padding: 6,
                    }}
                  >
                    <button
                      onClick={() => handleRestore(n.id)}
                      style={{
                        flex: 1,
                        padding: "6px",
                        fontSize: 10,
                        border: `1px solid ${PASTEL.mint}`,
                        borderRadius: 8,
                        background: `${PASTEL.mint}30`,
                        color: theme.text,
                        cursor: "pointer",
                        fontFamily: "'Noto Serif KR', serif",
                      }}
                    >
                      복귀
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      style={{
                        padding: "6px 10px",
                        fontSize: 10,
                        border: `1px solid ${PASTEL.coral}`,
                        borderRadius: 8,
                        background: theme.bg,
                        color: PASTEL.coral,
                        cursor: "pointer",
                        fontFamily: "'Noto Serif KR', serif",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
