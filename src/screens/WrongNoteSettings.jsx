// ============================================================
// ashrain.out — WrongNoteSettings (sub-view)
// ============================================================
// 라벨 사전 설정 화면. WrongNoteScreen 컨테이너에서 sub-view로 마운트.
// 깃발(시험 범위) / 동그라미(오답 유형) 각각 최대 5개 활성.
// 비활성 항목은 보관함에 모이고 활성 슬롯으로 다시 꺼낼 수 있음.

import { useState } from "react";
import { PASTEL } from "../config";
import { useBackGuard } from "../hooks/useBackGuard";

const COLOR_PALETTE = [
  PASTEL.pink,
  PASTEL.coral,
  PASTEL.mint,
  PASTEL.lavender,
  PASTEL.yellow,
  PASTEL.sky,
  PASTEL.peach,
  PASTEL.sage,
  PASTEL.dustyRose,
  PASTEL.lilac,
];

// ===== 단일 라벨 카드 (편집 모드 토글 가능) =====
function LabelCard({
  item,
  shape, // "flag" | "circle"
  theme,
  onUpdate,
  onToggleActive,
  onRemove,
  maxLabelLen,
  maxMemoLen,
  isActiveSlot,
  activeOverflow,
}) {
  const [editing, setEditing] = useState(false);

  const ShapeIcon = () => {
    if (shape === "flag") {
      return (
        <div
          style={{
            width: 36,
            height: 44,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 36 44" width="36" height="44">
            <line x1="6" y1="2" x2="6" y2="44" stroke={theme.text} strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4 L34 6 L26 14 L34 22 L6 22 Z" fill={item.color} stroke={theme.text} strokeWidth="1.2" />
          </svg>
          <span
            style={{
              position: "absolute",
              left: 8,
              top: 6,
              fontSize: 9,
              fontWeight: 700,
              color: theme.text,
              fontFamily: "'Noto Serif KR', serif",
              pointerEvents: "none",
            }}
          >
            {item.label}
          </span>
        </div>
      );
    }
    // circle
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: item.color,
          border: `1.5px solid ${theme.text}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          fontFamily: "'Noto Serif KR', serif",
          flexShrink: 0,
        }}
      >
        {item.label}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        background: theme.card,
        border: `1px solid ${theme.border}`,
        marginBottom: 8,
      }}
    >
      <ShapeIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                type="text"
                value={item.label}
                maxLength={maxLabelLen}
                onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                placeholder={`라벨 (${maxLabelLen}자)`}
                style={{
                  flex: "0 0 70px",
                  padding: "6px 8px",
                  fontSize: 12,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.bg,
                  color: theme.text,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              />
              <input
                type="text"
                value={item.memo}
                maxLength={maxMemoLen}
                onChange={(e) => onUpdate(item.id, { memo: e.target.value })}
                placeholder={`설명 (${maxMemoLen}자)`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 8px",
                  fontSize: 11,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.bg,
                  color: theme.text,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              />
            </div>
            {/* Color palette */}
            <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
              {COLOR_PALETTE.map((col) => (
                <button
                  key={col}
                  onClick={() => onUpdate(item.id, { color: col })}
                  aria-label={`color ${col}`}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: col,
                    border:
                      item.color === col
                        ? `2px solid ${theme.text}`
                        : `1px solid ${theme.border}`,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: 11,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.bg,
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                완료
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`'${item.label}' 라벨을 삭제할까요?`)) {
                    onRemove(item.id);
                  }
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  border: `1px solid ${PASTEL.coral}`,
                  borderRadius: 8,
                  background: theme.bg,
                  color: PASTEL.coral,
                  cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                삭제
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 2,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: theme.textSec,
                marginBottom: 6,
                wordBreak: "keep-all",
              }}
            >
              {item.memo || <span style={{ opacity: 0.5 }}>설명 없음</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: "5px 10px",
                  fontSize: 10,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  background: theme.bg,
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                ✎ 편집
              </button>
              <button
                onClick={() => onToggleActive(item.id)}
                disabled={!isActiveSlot && activeOverflow}
                style={{
                  padding: "5px 10px",
                  fontSize: 10,
                  border: `1px solid ${
                    isActiveSlot ? PASTEL.mint : theme.border
                  }`,
                  borderRadius: 8,
                  background: isActiveSlot
                    ? `${PASTEL.mint}30`
                    : theme.bg,
                  color: theme.text,
                  cursor:
                    !isActiveSlot && activeOverflow
                      ? "not-allowed"
                      : "pointer",
                  opacity: !isActiveSlot && activeOverflow ? 0.4 : 1,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                {isActiveSlot ? "✓ 활성" : "보관함"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function WrongNoteSettings({
  theme,
  playSfx,
  showMsg,
  onBack,
  // settings hook results (from container)
  settings,
  activeFlags,
  activeCircles,
  inactiveFlags,
  inactiveCircles,
  MAX_ACTIVE,
  MAX_LABEL_LEN,
  MAX_MEMO_LEN,
  updateFlag,
  updateCircle,
  addFlag,
  addCircle,
  removeFlag,
  removeCircle,
  toggleFlagActive,
  toggleCircleActive,
  setLongPressMode,
  setAutoSaveToDevice,
}) {
  const [tab, setTab] = useState("flag"); // "flag" | "circle" | "options"

  // 안드로이드 ◁ / 브라우저 ← 가드
  useBackGuard(onBack, true);

  const flagActiveOverflow = activeFlags.length >= MAX_ACTIVE;
  const circleActiveOverflow = activeCircles.length >= MAX_ACTIVE;

  const handleToggleFlag = (id) => {
    const wasActive = activeFlags.some((f) => f.id === id);
    if (!wasActive && flagActiveOverflow) {
      showMsg?.(`활성 깃발은 최대 ${MAX_ACTIVE}개까지예요`, 1800);
      playSfx?.("error");
      return;
    }
    toggleFlagActive(id);
    playSfx?.("click");
  };
  const handleToggleCircle = (id) => {
    const wasActive = activeCircles.some((c) => c.id === id);
    if (!wasActive && circleActiveOverflow) {
      showMsg?.(`활성 유형은 최대 ${MAX_ACTIVE}개까지예요`, 1800);
      playSfx?.("error");
      return;
    }
    toggleCircleActive(id);
    playSfx?.("click");
  };

  const TabBtn = ({ k, label, count }) => (
    <button
      onClick={() => {
        setTab(k);
        playSfx?.("click");
      }}
      style={{
        flex: 1,
        padding: "10px 8px",
        fontSize: 12,
        fontWeight: tab === k ? 700 : 400,
        border: "none",
        borderBottom: `2px solid ${tab === k ? PASTEL.coral : "transparent"}`,
        background: "transparent",
        color: tab === k ? theme.text : theme.textSec,
        cursor: "pointer",
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      {label} {count !== undefined && <span style={{ fontSize: 10, opacity: 0.6 }}>({count})</span>}
    </button>
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
          }}
        >
          오답노트 설정
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.card,
        }}
      >
        <TabBtn
          k="flag"
          label="🚩 시험 범위"
          count={`${activeFlags.length}/${MAX_ACTIVE}`}
        />
        <TabBtn
          k="circle"
          label="● 오답 유형"
          count={`${activeCircles.length}/${MAX_ACTIVE}`}
        />
        <TabBtn k="options" label="⚙ 옵션" />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tab === "flag" && (
          <div>
            <p
              style={{
                fontSize: 11,
                color: theme.textSec,
                marginBottom: 12,
                wordBreak: "keep-all",
              }}
            >
              사진 좌측을 꾹 누르면 활성 깃발이 1열로 표시돼요. 라벨은
              최대 {MAX_LABEL_LEN}음절(예: 12M).
            </p>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 8,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              활성 슬롯 ({activeFlags.length}/{MAX_ACTIVE})
            </div>
            {activeFlags.length === 0 && (
              <p
                style={{
                  fontSize: 10,
                  color: theme.textSec,
                  textAlign: "center",
                  padding: 16,
                }}
              >
                보관함에서 깃발을 활성화해보세요
              </p>
            )}
            {activeFlags.map((f) => (
              <LabelCard
                key={f.id}
                item={f}
                shape="flag"
                theme={theme}
                onUpdate={updateFlag}
                onToggleActive={handleToggleFlag}
                onRemove={removeFlag}
                maxLabelLen={MAX_LABEL_LEN}
                maxMemoLen={MAX_MEMO_LEN}
                isActiveSlot={true}
                activeOverflow={false}
              />
            ))}

            {inactiveFlags.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.text,
                    marginTop: 16,
                    marginBottom: 8,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  보관함 ({inactiveFlags.length})
                </div>
                {inactiveFlags.map((f) => (
                  <LabelCard
                    key={f.id}
                    item={f}
                    shape="flag"
                    theme={theme}
                    onUpdate={updateFlag}
                    onToggleActive={handleToggleFlag}
                    onRemove={removeFlag}
                    maxLabelLen={MAX_LABEL_LEN}
                    maxMemoLen={MAX_MEMO_LEN}
                    isActiveSlot={false}
                    activeOverflow={flagActiveOverflow}
                  />
                ))}
              </>
            )}

            <button
              onClick={() => {
                addFlag();
                playSfx?.("click");
                showMsg?.("새 깃발을 보관함에 추가했어요", 1500);
              }}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: 12,
                fontSize: 12,
                border: `1.5px dashed ${theme.border}`,
                borderRadius: 12,
                background: "transparent",
                color: theme.textSec,
                cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              + 새 깃발 추가
            </button>
          </div>
        )}

        {tab === "circle" && (
          <div>
            <p
              style={{
                fontSize: 11,
                color: theme.textSec,
                marginBottom: 12,
                wordBreak: "keep-all",
              }}
            >
              사진 우측을 꾹 누르면 활성 동그라미가 표시돼요. 오답의 원인을
              빠르게 분류하세요.
            </p>

            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 8,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              활성 슬롯 ({activeCircles.length}/{MAX_ACTIVE})
            </div>
            {activeCircles.length === 0 && (
              <p
                style={{
                  fontSize: 10,
                  color: theme.textSec,
                  textAlign: "center",
                  padding: 16,
                }}
              >
                보관함에서 유형을 활성화해보세요
              </p>
            )}
            {activeCircles.map((c) => (
              <LabelCard
                key={c.id}
                item={c}
                shape="circle"
                theme={theme}
                onUpdate={updateCircle}
                onToggleActive={handleToggleCircle}
                onRemove={removeCircle}
                maxLabelLen={MAX_LABEL_LEN}
                maxMemoLen={MAX_MEMO_LEN}
                isActiveSlot={true}
                activeOverflow={false}
              />
            ))}

            {inactiveCircles.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.text,
                    marginTop: 16,
                    marginBottom: 8,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  보관함 ({inactiveCircles.length})
                </div>
                {inactiveCircles.map((c) => (
                  <LabelCard
                    key={c.id}
                    item={c}
                    shape="circle"
                    theme={theme}
                    onUpdate={updateCircle}
                    onToggleActive={handleToggleCircle}
                    onRemove={removeCircle}
                    maxLabelLen={MAX_LABEL_LEN}
                    maxMemoLen={MAX_MEMO_LEN}
                    isActiveSlot={false}
                    activeOverflow={circleActiveOverflow}
                  />
                ))}
              </>
            )}

            <button
              onClick={() => {
                addCircle();
                playSfx?.("click");
                showMsg?.("새 유형을 보관함에 추가했어요", 1500);
              }}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: 12,
                fontSize: 12,
                border: `1.5px dashed ${theme.border}`,
                borderRadius: 12,
                background: "transparent",
                color: theme.textSec,
                cursor: "pointer",
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              + 새 유형 추가
            </button>
          </div>
        )}

        {tab === "options" && (
          <div>
            {/* longPressMode */}
            <div
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 12,
                background: theme.card,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.text,
                  marginBottom: 4,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                꾹 누르기 동작
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: theme.textSec,
                  marginBottom: 10,
                  wordBreak: "keep-all",
                }}
              >
                꾹 누른 후 라벨을 어떻게 선택할지 정해요.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { k: "slide", label: "슬라이드", desc: "손가락 떼지 않고 이동" },
                  { k: "tap", label: "탭", desc: "떼고 나서 골라 탭" },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => {
                      setLongPressMode(opt.k);
                      playSfx?.("click");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      borderRadius: 10,
                      border: `2px solid ${
                        settings.longPressMode === opt.k
                          ? PASTEL.coral
                          : theme.border
                      }`,
                      background:
                        settings.longPressMode === opt.k
                          ? theme.accentSoft
                          : theme.bg,
                      color: theme.text,
                      cursor: "pointer",
                      fontFamily: "'Noto Serif KR', serif",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: theme.textSec,
                        marginTop: 2,
                      }}
                    >
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* autoSaveToDevice */}
            <div
              style={{
                marginBottom: 20,
                padding: 14,
                borderRadius: 12,
                background: theme.card,
                border: `1px solid ${theme.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.text,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  촬영 사진 기기 저장
                </div>
                <button
                  onClick={() => {
                    setAutoSaveToDevice(!settings.autoSaveToDevice);
                    playSfx?.("click");
                  }}
                  style={{
                    padding: "6px 14px",
                    fontSize: 11,
                    border: `1.5px solid ${
                      settings.autoSaveToDevice ? PASTEL.mint : theme.border
                    }`,
                    borderRadius: 12,
                    background: settings.autoSaveToDevice
                      ? `${PASTEL.mint}30`
                      : theme.bg,
                    color: theme.text,
                    cursor: "pointer",
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  {settings.autoSaveToDevice ? "ON" : "OFF"}
                </button>
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: theme.textSec,
                  wordBreak: "keep-all",
                }}
              >
                ON이면 사진을 추가할 때 기기 다운로드 폴더에도 사본이
                저장돼요. (문제 분석하기에도 동일하게 적용)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
