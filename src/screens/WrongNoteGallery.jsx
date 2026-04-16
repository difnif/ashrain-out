// ============================================================
// ashrain.out — WrongNoteGallery (sub-view)
// ============================================================
// 썸네일 그리드 + 사진 추가 + 다중 선택 + 일괄 동기화
// 컨테이너(WrongNoteScreen)에서 props로 데이터/콜백을 받음.

import { useState, useRef, useCallback } from "react";
import { PASTEL } from "../config";
import { useBackGuard } from "../hooks/useBackGuard";

const LONG_PRESS_MS = 450;

// 작은 깃발 아이콘 (썸네일 코너용)
function MiniFlag({ color, label, theme }) {
  return (
    <div
      style={{
        position: "relative",
        width: 22,
        height: 26,
      }}
    >
      <svg viewBox="0 0 22 26" width="22" height="26">
        <line
          x1="3"
          y1="1"
          x2="3"
          y2="26"
          stroke={theme.text}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M3 2 L20 3 L15 8 L20 13 L3 13 Z"
          fill={color}
          stroke={theme.text}
          strokeWidth="0.8"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          left: 4,
          top: 3,
          fontSize: 6,
          fontWeight: 700,
          color: theme.text,
          fontFamily: "'Noto Serif KR', serif",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function MiniCircle({ color, label, theme }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: color,
        border: `1px solid ${theme.text}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 7,
        fontWeight: 700,
        color: theme.text,
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      {label}
    </div>
  );
}

export default function WrongNoteGallery({
  theme,
  playSfx,
  showMsg,
  onBack,
  onOpenSettings,
  onOpenArchive,
  onOpenDetail, // (noteId) => void
  // notes hook
  activeNotes,
  inactiveNotes,
  addNoteFromFile,
  bulkUpdate,
  // settings hook
  findFlag,
  findCircle,
  settings,
}) {
  const fileRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [syncDialog, setSyncDialog] = useState(false);
  const longPressTimer = useRef(null);

  const handleFile = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setAdding(true);
      try {
        for (const file of files) {
          await addNoteFromFile(file);
        }
        playSfx?.("success");
        showMsg?.(`사진 ${files.length}장 추가됨`, 1500);
      } catch (err) {
        console.error(err);
        showMsg?.("사진 추가 실패", 2000);
        playSfx?.("error");
      } finally {
        setAdding(false);
        // 같은 파일 다시 선택 가능하도록 input 초기화
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [addNoteFromFile, playSfx, showMsg]
  );

  // 썸네일 long-press → 선택 모드 진입
  const startLongPress = useCallback(
    (id) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        setSelectMode(true);
        setSelectedIds(new Set([id]));
        playSfx?.("click");
        if (navigator.vibrate) navigator.vibrate(20);
      }, LONG_PRESS_MS);
    },
    [playSfx]
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleThumbTap = useCallback(
    (id) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        playSfx?.("click");
      } else {
        playSfx?.("click");
        onOpenDetail?.(id);
      }
    },
    [selectMode, playSfx, onOpenDetail]
  );

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setSyncDialog(false);
  }, []);

  // 안드로이드 ◁ / 브라우저 ← 가드 — selectMode 또는 syncDialog가 열렸을 때 활성.
  // 외부 ◁를 한 단계씩 소모: syncDialog → selectMode → (가드 꺼지면 컨테이너가 홈으로)
  const onAndroidBack = useCallback(() => {
    if (syncDialog) {
      setSyncDialog(false);
      return;
    }
    if (selectMode) {
      exitSelectMode();
    }
  }, [syncDialog, selectMode, exitSelectMode]);
  const galleryModalOpen = selectMode || syncDialog;
  useBackGuard(onAndroidBack, galleryModalOpen);

  // 통합 뒤로가기 — syncDialog → selectMode → 갤러리 종료(홈) 우선순위
  // 헤더 ← 버튼에서 사용.
  const handleBack = useCallback(() => {
    if (syncDialog) {
      setSyncDialog(false);
      return;
    }
    if (selectMode) {
      exitSelectMode();
      return;
    }
    onBack?.();
  }, [syncDialog, selectMode, exitSelectMode, onBack]);

  // 일괄 동기화 적용 — 첫 번째 선택 노트가 템플릿
  const applySync = useCallback(
    async (kind) => {
      const ids = Array.from(selectedIds);
      if (ids.length < 2) {
        showMsg?.("2개 이상 선택해주세요", 1500);
        return;
      }
      const template = activeNotes.find((n) => n.id === ids[0]);
      if (!template) {
        showMsg?.("템플릿 사진을 찾을 수 없어요", 1800);
        return;
      }
      const patch = {};
      if (kind === "range" || kind === "both") {
        patch.rangeLabelId = template.rangeLabelId;
      }
      if (kind === "type" || kind === "both") {
        patch.typeLabelId = template.typeLabelId;
      }
      const targets = ids.slice(1); // 첫 번째 제외
      await bulkUpdate(targets, patch);
      playSfx?.("success");
      showMsg?.(`${targets.length}장 동기화 완료`, 1500);
      exitSelectMode();
    },
    [selectedIds, activeNotes, bulkUpdate, playSfx, showMsg, exitSelectMode]
  );

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
          gap: 8,
          borderBottom: `1px solid ${theme.border}`,
          background: theme.card,
        }}
      >
        <button
          onClick={() => {
            playSfx?.("click");
            if (selectMode) exitSelectMode();
            else onBack?.();
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
            flex: 1,
            fontSize: 14,
            fontWeight: 700,
            color: theme.text,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {selectMode
            ? `${selectedIds.size}장 선택됨`
            : `오답노트 (${activeNotes.length})`}
        </div>

        {selectMode ? (
          <button
            onClick={() => {
              if (selectedIds.size < 2) {
                showMsg?.("2개 이상 선택해주세요", 1500);
                return;
              }
              setSyncDialog(true);
              playSfx?.("click");
            }}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              border: `1px solid ${PASTEL.coral}`,
              borderRadius: 10,
              background: theme.accentSoft,
              color: theme.text,
              cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
              fontWeight: 700,
            }}
          >
            동기화
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                playSfx?.("click");
                onOpenArchive?.();
              }}
              title="비활성 보관함"
              style={{
                background: "none",
                border: "none",
                color: theme.text,
                fontSize: 16,
                cursor: "pointer",
                padding: 4,
              }}
            >
              📦
            </button>
            <button
              onClick={() => {
                playSfx?.("click");
                onOpenSettings?.();
              }}
              title="설정"
              style={{
                background: "none",
                border: "none",
                color: theme.text,
                fontSize: 16,
                cursor: "pointer",
                padding: 4,
              }}
            >
              ⚙
            </button>
          </>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {activeNotes.length === 0 && !adding && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: theme.textSec,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <p
              style={{
                fontSize: 12,
                marginBottom: 6,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              아직 오답 사진이 없어요
            </p>
            <p style={{ fontSize: 10, opacity: 0.7 }}>
              아래 + 버튼으로 사진을 추가해보세요
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {activeNotes.map((n) => {
            const flag = n.rangeLabelId ? findFlag(n.rangeLabelId) : null;
            const circle = n.typeLabelId ? findCircle(n.typeLabelId) : null;
            const isSelected = selectedIds.has(n.id);
            const isFirst = selectMode && Array.from(selectedIds)[0] === n.id;
            return (
              <div
                key={n.id}
                onClick={() => handleThumbTap(n.id)}
                onTouchStart={() => startLongPress(n.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={() => startLongPress(n.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: isSelected
                    ? `3px solid ${PASTEL.coral}`
                    : `1px solid ${theme.border}`,
                  background: theme.card,
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
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
                {/* 분류 배지 좌상단 (깃발) */}
                {flag && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                    }}
                  >
                    <MiniFlag
                      color={flag.color}
                      label={flag.label}
                      theme={theme}
                    />
                  </div>
                )}
                {/* 분류 배지 우상단 (동그라미) */}
                {circle && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                    }}
                  >
                    <MiniCircle
                      color={circle.color}
                      label={circle.label}
                      theme={theme}
                    />
                  </div>
                )}
                {/* 카운트 배지 좌하단 */}
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
                {/* 선택 모드 체크 배지 */}
                {selectMode && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isSelected
                        ? PASTEL.coral
                        : "rgba(255,255,255,0.7)",
                      border: `1.5px solid ${isSelected ? "#fff" : theme.text}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#fff" : theme.text,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isSelected ? (isFirst ? "1" : "✓") : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {adding && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              fontSize: 11,
              color: theme.textSec,
            }}
          >
            사진 처리 중...
          </div>
        )}
      </div>

      {/* FAB: 사진 추가 */}
      {!selectMode && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button
            onClick={() => {
              playSfx?.("click");
              fileRef.current?.click();
            }}
            disabled={adding}
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: PASTEL.coral,
              color: "#fff",
              fontSize: 28,
              fontWeight: 300,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              opacity: adding ? 0.5 : 1,
            }}
            aria-label="사진 추가"
          >
            +
          </button>
        </>
      )}

      {/* 동기화 다이얼로그 */}
      {syncDialog && (
        <div
          onClick={() => setSyncDialog(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 320,
              width: "100%",
              background: theme.card,
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 6,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              일괄 동기화
            </div>
            <p
              style={{
                fontSize: 11,
                color: theme.textSec,
                marginBottom: 16,
                wordBreak: "keep-all",
              }}
            >
              첫 번째 선택한 사진(1번)의 분류를 나머지 {selectedIds.size - 1}장에
              복사해요.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {[
                { k: "range", label: "🚩 시험 범위만" },
                { k: "type", label: "● 오답 유형만" },
                { k: "both", label: "🚩 + ● 둘 다" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => applySync(opt.k)}
                  style={{
                    padding: "12px",
                    fontSize: 12,
                    border: `1.5px solid ${theme.border}`,
                    borderRadius: 10,
                    background: theme.bg,
                    color: theme.text,
                    cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif",
                    fontWeight: 700,
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setSyncDialog(false)}
                style={{
                  padding: "10px",
                  fontSize: 11,
                  border: "none",
                  borderRadius: 10,
                  background: "transparent",
                  color: theme.textSec,
                  cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
