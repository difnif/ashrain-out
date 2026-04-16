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
  deleteNote,
  // settings hook
  findFlag,
  findCircle,
  activeFlags,
  activeCircles,
  settings,
}) {
  const fileRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // actionDialog: null | "menu" | "flag" | "circle" | "sync" | "delete"
  // null = 닫힘, "menu" = 1단계 메뉴, 나머지는 2단계 세부 패널
  const [actionDialog, setActionDialog] = useState(null);
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
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [addNoteFromFile, playSfx, showMsg]
  );

  // 썸네일 long-press → 선택 모드 진입
  // 진입 후 손을 떼지 않고 바로 드래그 선택으로 이어갈 수 있도록 dragRef를 세팅해둔다.
  const startLongPress = useCallback(
    (id, clientX, clientY) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        setSelectMode(true);
        setSelectedIds(new Set([id]));
        playSfx?.("click");
        if (navigator.vibrate) navigator.vibrate(20);
        // long-press로 선택 모드 진입한 직후 그대로 드래그로 이어질 수 있도록
        // drag 상태를 "활성 + 시작 예정" 상태로 초기화. 첫 타겟은 이미 선택됨 → mode="add".
        dragRef.current = {
          active: true,
          started: false,
          startX: clientX ?? 0,
          startY: clientY ?? 0,
          mode: "add",
          visited: new Set([id]),  // 시작 썸네일은 이미 선택됐으니 스킵
          startId: id,
        };
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

  // ===== 드래그 선택 (선택 모드에서만) =====
  // 한 썸네일을 꾹 누른 후 드래그하면 지나는 썸네일들을 일괄 토글.
  // 첫 타겟의 선택 상태를 반전시키는 작업(add/remove)이 드래그 내내 유지됨.
  const DRAG_THRESHOLD = 8; // px — 이보다 많이 움직이면 드래그로 간주
  const dragRef = useRef({
    active: false,         // 드래그 중인지
    started: false,        // 시작 판정 완료 (임계값 넘김)
    startX: 0,
    startY: 0,
    mode: null,            // "add" | "remove" — 첫 타겟의 반전 방향
    visited: null,         // Set<noteId> — 이번 드래그에서 이미 토글된 id들 (중복 토글 방지)
    startId: null,         // 시작 시점에 포인터 아래 있던 노트 id
  });

  const noteIdFromPoint = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const target = el.closest?.("[data-note-id]");
    return target?.getAttribute?.("data-note-id") || null;
  }, []);

  const onGridPointerDown = useCallback(
    (e) => {
      if (!selectMode) return;
      // 드래그는 primary 버튼(touch 또는 좌클릭)만
      if (e.button !== undefined && e.button !== 0) return;
      const id = noteIdFromPoint(e.clientX, e.clientY);
      if (!id) return;
      dragRef.current = {
        active: true,
        started: false,
        startX: e.clientX,
        startY: e.clientY,
        mode: null,
        visited: new Set(),
        startId: id,
      };
    },
    [selectMode, noteIdFromPoint]
  );

  const onGridPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      if (!d.started) {
        const dx = Math.abs(e.clientX - d.startX);
        const dy = Math.abs(e.clientY - d.startY);
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
        // 드래그 시작 확정 — 시작 타겟의 현재 선택 상태 반전이 모드
        d.started = true;
        const startSelected = selectedIds.has(d.startId);
        d.mode = startSelected ? "remove" : "add";
        // 시작 타겟 자체도 토글 (드래그 첫 적용)
        d.visited.add(d.startId);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (d.mode === "add") next.add(d.startId);
          else next.delete(d.startId);
          return next;
        });
        if (navigator.vibrate) navigator.vibrate(10);
      }
      // 현재 포인터 아래 썸네일 찾기
      const id = noteIdFromPoint(e.clientX, e.clientY);
      if (!id || d.visited.has(id)) return;
      d.visited.add(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (d.mode === "add") next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [selectedIds, noteIdFromPoint]
  );

  const onGridPointerUp = useCallback(() => {
    const d = dragRef.current;
    const wasDrag = d.active && d.started;
    dragRef.current = {
      active: false,
      started: false,
      startX: 0,
      startY: 0,
      mode: null,
      visited: null,
      startId: null,
    };
    // 드래그가 있었다면 이어지는 click 이벤트(탭)를 한 번 무시
    if (wasDrag) {
      dragJustEndedRef.current = true;
      setTimeout(() => {
        dragJustEndedRef.current = false;
      }, 0);
    }
  }, []);

  const dragJustEndedRef = useRef(false);

  // 썸네일 클릭 — 드래그가 방금 끝난 경우 무시
  const onThumbClick = useCallback(
    (id) => {
      if (dragJustEndedRef.current) return;
      handleThumbTap(id);
    },
    [handleThumbTap]
  );

  // finishGalleryGuard ref — 프로그래매틱 close에서 finish 호출하기 위해
  const finishGalleryGuardRef = useRef(null);

  // 안드로이드 ◁ / 브라우저 ← 가드 — selectMode 또는 actionDialog가 열렸을 때 활성.
  // 외부 ◁ 경로에서는 popstate가 이미 entry 소비. 여기서 finish 호출 X.
  // 다이얼로그 2단계(flag/circle/sync/delete) → 1단계(menu) → selectMode → 해제.
  const onAndroidBack = useCallback(() => {
    if (actionDialog && actionDialog !== "menu") {
      // 2단계 세부 패널 → 1단계 메뉴로 돌아감
      setActionDialog("menu");
      return;
    }
    if (actionDialog === "menu") {
      setActionDialog(null);
      return;
    }
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [actionDialog, selectMode]);
  const galleryModalOpen = selectMode || !!actionDialog;
  const finishGalleryGuard = useBackGuard(onAndroidBack, galleryModalOpen);
  finishGalleryGuardRef.current = finishGalleryGuard;

  // 프로그래매틱 종료 — finish로 더미 entry 회수 후 state 정리
  const exitSelectMode = useCallback(() => {
    finishGalleryGuardRef.current?.();
    setSelectMode(false);
    setSelectedIds(new Set());
    setActionDialog(null);
  }, []);

  // 통합 뒤로가기 — actionDialog → selectMode → 갤러리 종료(홈) 우선순위
  // 헤더 ← 버튼에서 사용.
  const handleBack = useCallback(() => {
    if (actionDialog && actionDialog !== "menu") {
      setActionDialog("menu");
      return;
    }
    if (actionDialog === "menu") {
      setActionDialog(null);
      return;
    }
    if (selectMode) {
      exitSelectMode();
      return;
    }
    onBack?.();
  }, [actionDialog, selectMode, exitSelectMode, onBack]);

  // 일괄 동기화 적용 — 첫 번째 선택 노트가 템플릿
  // === 일괄 작업 핸들러들 ===

  // 분류 동기화 — 첫 번째 선택 노트가 템플릿이 되어 나머지에 복사
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
      const targets = ids.slice(1);
      await bulkUpdate(targets, patch);
      playSfx?.("success");
      showMsg?.(`${targets.length}장 동기화 완료`, 1500);
      exitSelectMode();
    },
    [selectedIds, activeNotes, bulkUpdate, playSfx, showMsg, exitSelectMode]
  );

  // 일괄 깃발(시험 범위) 변경 — flagId가 null이면 해제
  const applyBulkFlag = useCallback(
    async (flagId) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      await bulkUpdate(ids, { rangeLabelId: flagId });
      playSfx?.("success");
      const label = flagId ? findFlag?.(flagId)?.label || "" : "";
      showMsg?.(
        flagId ? `${ids.length}장 깃발 변경: ${label}` : `${ids.length}장 깃발 해제`,
        1500
      );
      exitSelectMode();
    },
    [selectedIds, bulkUpdate, playSfx, showMsg, findFlag, exitSelectMode]
  );

  // 일괄 동그라미(오답 유형) 변경
  const applyBulkCircle = useCallback(
    async (circleId) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      await bulkUpdate(ids, { typeLabelId: circleId });
      playSfx?.("success");
      const label = circleId ? findCircle?.(circleId)?.label || "" : "";
      showMsg?.(
        circleId
          ? `${ids.length}장 유형 변경: ${label}`
          : `${ids.length}장 유형 해제`,
        1500
      );
      exitSelectMode();
    },
    [selectedIds, bulkUpdate, playSfx, showMsg, findCircle, exitSelectMode]
  );

  // 일괄 삭제
  const applyBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await deleteNote?.(id);
    }
    playSfx?.("success");
    showMsg?.(`${ids.length}장 삭제됨`, 1500);
    exitSelectMode();
  }, [selectedIds, deleteNote, playSfx, showMsg, exitSelectMode]);

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
              if (selectedIds.size === 0) {
                showMsg?.("1개 이상 선택해주세요", 1500);
                return;
              }
              setActionDialog("menu");
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
            작업
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
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          onPointerCancel={onGridPointerUp}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            // 드래그 선택 중 브라우저 스크롤/제스처 간섭 방지
            touchAction: selectMode ? "none" : "auto",
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
                data-note-id={n.id}
                onClick={() => onThumbClick(n.id)}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  startLongPress(n.id, t?.clientX, t?.clientY);
                }}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={(e) => startLongPress(n.id, e.clientX, e.clientY)}
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

      {/* 일괄 작업 다이얼로그 — 다단계: menu / flag / circle / sync / delete */}
      {actionDialog && (
        <div
          onClick={() => setActionDialog(null)}
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
              maxHeight: "80vh",
              overflowY: "auto",
              background: theme.card,
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${theme.border}`,
            }}
          >
            {/* === 1단계: 작업 선택 메뉴 === */}
            {actionDialog === "menu" && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: 6,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  일괄 작업
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: theme.textSec,
                    marginBottom: 16,
                    wordBreak: "keep-all",
                  }}
                >
                  선택한 {selectedIds.size}장에 적용할 작업을 선택해주세요.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() => setActionDialog("flag")}
                    style={actionMenuBtnStyle(theme)}
                  >
                    🚩 시험 범위(깃발) 변경
                  </button>
                  <button
                    onClick={() => setActionDialog("circle")}
                    style={actionMenuBtnStyle(theme)}
                  >
                    ● 오답 유형(동그라미) 변경
                  </button>
                  <button
                    onClick={() => {
                      if (selectedIds.size < 2) {
                        showMsg?.("동기화는 2개 이상 필요해요", 1500);
                        return;
                      }
                      setActionDialog("sync");
                    }}
                    style={actionMenuBtnStyle(theme)}
                  >
                    🔄 분류 동기화 (1번 → 나머지)
                  </button>
                  <button
                    onClick={() => setActionDialog("delete")}
                    style={{
                      ...actionMenuBtnStyle(theme),
                      borderColor: PASTEL.coral,
                      color: PASTEL.coral,
                    }}
                  >
                    🗑 삭제
                  </button>
                  <button
                    onClick={() => setActionDialog(null)}
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
              </>
            )}

            {/* === 2단계: 깃발 선택 === */}
            {actionDialog === "flag" && (
              <BulkLabelPicker
                theme={theme}
                title="🚩 시험 범위 변경"
                subtitle={`선택한 ${selectedIds.size}장의 시험 범위를 변경해요.`}
                items={activeFlags || []}
                kind="flag"
                onPick={(id) => applyBulkFlag(id)}
                onClear={() => applyBulkFlag(null)}
                onBack={() => setActionDialog("menu")}
              />
            )}

            {/* === 2단계: 동그라미 선택 === */}
            {actionDialog === "circle" && (
              <BulkLabelPicker
                theme={theme}
                title="● 오답 유형 변경"
                subtitle={`선택한 ${selectedIds.size}장의 오답 유형을 변경해요.`}
                items={activeCircles || []}
                kind="circle"
                onPick={(id) => applyBulkCircle(id)}
                onClear={() => applyBulkCircle(null)}
                onBack={() => setActionDialog("menu")}
              />
            )}

            {/* === 2단계: 동기화 상세 === */}
            {actionDialog === "sync" && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: 6,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  🔄 분류 동기화
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: theme.textSec,
                    marginBottom: 16,
                    wordBreak: "keep-all",
                  }}
                >
                  첫 번째 선택한 사진(1번)의 분류를 나머지 {Math.max(0, selectedIds.size - 1)}장에 복사해요.
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
                      style={actionMenuBtnStyle(theme)}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setActionDialog("menu")}
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
                    ← 돌아가기
                  </button>
                </div>
              </>
            )}

            {/* === 2단계: 삭제 확인 === */}
            {actionDialog === "delete" && (
              <>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: 6,
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  🗑 일괄 삭제
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: theme.textSec,
                    marginBottom: 16,
                    wordBreak: "keep-all",
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  선택한 {selectedIds.size}장을 정말 삭제할까요? 되돌릴 수 없어요.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setActionDialog("menu")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      background: theme.bg,
                      color: theme.text,
                      cursor: "pointer",
                      fontFamily: "'Noto Serif KR', serif",
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => applyBulkDelete()}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: `1px solid ${PASTEL.coral}`,
                      borderRadius: 10,
                      background: PASTEL.coral,
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "'Noto Serif KR', serif",
                      fontWeight: 700,
                    }}
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 헬퍼: 액션 메뉴 버튼 공통 스타일
function actionMenuBtnStyle(theme) {
  return {
    padding: "12px",
    fontSize: 12,
    border: `1.5px solid ${theme.border}`,
    borderRadius: 10,
    background: theme.bg,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "'Noto Serif KR', serif",
    fontWeight: 700,
    textAlign: "left",
  };
}

// 헬퍼: 깃발/동그라미 일괄 선택 picker (2단계 UI에서 공통 사용)
function BulkLabelPicker({ theme, title, subtitle, items, kind, onPick, onClear, onBack }) {
  return (
    <>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 6,
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: 11,
          color: theme.textSec,
          marginBottom: 14,
          wordBreak: "keep-all",
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        {subtitle}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {items.length === 0 && (
          <div
            style={{
              padding: 12,
              fontSize: 11,
              color: theme.textSec,
              textAlign: "center",
              border: `1px dashed ${theme.border}`,
              borderRadius: 10,
              fontFamily: "'Noto Serif KR', serif",
            }}
          >
            활성 {kind === "flag" ? "깃발" : "유형"}이 없어요. 설정에서 먼저 활성화해주세요.
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onPick(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              fontSize: 12,
              border: `1.5px solid ${theme.border}`,
              borderRadius: 10,
              background: theme.bg,
              color: theme.text,
              cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: kind === "circle" ? "50%" : 3,
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 700 }}>{item.label}</span>
            {item.memo && (
              <span
                style={{
                  fontSize: 10,
                  color: theme.textSec,
                  marginLeft: "auto",
                  textAlign: "right",
                }}
              >
                {item.memo}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
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
          ← 돌아가기
        </button>
        <button
          onClick={onClear}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: 11,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            background: theme.bg,
            color: theme.textSec,
            cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          분류 해제
        </button>
      </div>
    </>
  );
}
