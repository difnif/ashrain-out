// ============================================================
// ashrain.out — WrongNoteDetail (sub-view)
// ============================================================
// 단일 사진 상세 뷰어. 라이트룸 클래식 P/U 분류 워크플로우 차용.
//
// 제스처:
//  - 좌우 스와이프: 이전/다음 사진
//  - 위 스와이프: Annotator 오버레이 호출
//  - 아래 스와이프: 어노테이션 visible 토글 (단어장 가림판)
//  - 좌측 long-press: 활성 깃발 1열 표시 (slide/tap 모드 지원)
//  - 우측 long-press: 활성 동그라미 표시
//  - 좌상단 깃발 배지 long-press → 동그라미 배지로 드래그: studyCount +1
//  - 좌상단 동그라미 배지 long-press → 깃발 배지로 드래그: studyCount -1
//
// Pointer Events 사용 (touchstart/mousedown 중복 방지)

import { useState, useRef, useCallback, useEffect } from "react";
import { PASTEL } from "../config";
import WrongNoteAnnotator from "./WrongNoteAnnotator";
import { useBackGuard } from "../hooks/useBackGuard";

const LONG_PRESS_MS = 450;
const SWIPE_MIN_DIST = 50;
const SWIPE_MAX_TIME = 400;
const TAP_MAX_MOVE = 10;
const COUNT_DRAG_MIN = 30;

export default function WrongNoteDetail({
  theme,
  playSfx,
  showMsg,
  onBack,
  // notes
  activeNotes,
  initialNoteId,
  updateNote,
  deleteNote,
  setAnnotations,
  incrementStudy,
  decrementStudy,
  // settings
  activeFlags,
  activeCircles,
  findFlag,
  findCircle,
  settings,
}) {
  // 현재 인덱스
  const [idx, setIdx] = useState(() => {
    const i = activeNotes.findIndex((n) => n.id === initialNoteId);
    return i >= 0 ? i : 0;
  });
  const note = activeNotes[idx] || null;

  const [annotatorOpen, setAnnotatorOpen] = useState(false);
  const [picker, setPicker] = useState(null); // null | "flag" | "circle"
  const [hoverPickerId, setHoverPickerId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // pointer 상태
  const ptrRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startT: 0,
    longPressTimer: null,
    longPressFired: false,
    countDragFrom: null, // "flag" | "circle" | null
    countDragMoved: false,
    lastClientX: 0,
    lastClientY: 0,
    side: null, // "left" | "right"
  });
  const containerRef = useRef(null);
  const pickerRef = useRef(null);

  // ===== 모달 가드 (선언 순서 주의) =====
  // ESC useEffect와 handleBack이 closePicker/closeConfirmDelete를 참조하므로
  // 이 블록은 반드시 그것들보다 먼저 선언되어야 한다 (TDZ 회피).

  // 모달용 가드: picker 또는 confirmDelete가 열렸을 때만 활성.
  // (Annotator는 자체 가드를 가지고, sub-view 전환은 컨테이너가 처리하므로
  //  여기서는 "Detail 화면 안에서 열린 모달"만 책임짐.)
  const closeTopModal = useCallback(() => {
    if (picker) {
      setPicker(null);
      setHoverPickerId(null);
    } else if (confirmDelete) {
      setConfirmDelete(false);
    }
  }, [picker, confirmDelete]);
  const modalOpen = (!!picker || confirmDelete) && !annotatorOpen;
  const finishModalGuard = useBackGuard(closeTopModal, modalOpen);

  // 정상 종료 헬퍼: 프로그래매틱하게 모달을 닫을 때는 반드시 이 헬퍼를 통해 닫는다.
  // finishModalGuard()가 더미 history entry를 회수한 뒤 state를 비운다.
  // (외부 ◁로 닫히는 경로는 useBackGuard가 자체적으로 closeTopModal을 호출하므로
  //  여기를 거치지 않는다 — finish는 hook 내부에서 consumed 처리됨.)
  const closePicker = useCallback(() => {
    finishModalGuard();
    setPicker(null);
    setHoverPickerId(null);
  }, [finishModalGuard]);
  const closeConfirmDelete = useCallback(() => {
    finishModalGuard();
    setConfirmDelete(false);
  }, [finishModalGuard]);

  // ESC 키
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (annotatorOpen) setAnnotatorOpen(false);
        else if (picker) closePicker();
        else if (confirmDelete) closeConfirmDelete();
        else onBack?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [annotatorOpen, picker, confirmDelete, onBack, closePicker, closeConfirmDelete]);

  // 통합 뒤로가기 — picker/confirmDelete가 열려 있으면 그것부터 닫고, 아니면 갤러리로
  // 헤더 ← 버튼에서 사용.
  const handleBack = useCallback(() => {
    if (picker) {
      closePicker();
      return;
    }
    if (confirmDelete) {
      closeConfirmDelete();
      return;
    }
    onBack?.();
  }, [picker, confirmDelete, onBack, closePicker, closeConfirmDelete]);

  const goPrev = useCallback(() => {
    if (idx > 0) {
      setIdx((i) => i - 1);
      playSfx?.("click");
    }
  }, [idx, playSfx]);
  const goNext = useCallback(() => {
    if (idx < activeNotes.length - 1) {
      setIdx((i) => i + 1);
      playSfx?.("click");
    }
  }, [idx, activeNotes.length, playSfx]);

  // 어노테이션 visible 토글 (아래 스와이프)
  const toggleAnnVisible = useCallback(() => {
    if (!note) return;
    updateNote(note.id, { annotationsVisible: !note.annotationsVisible });
    playSfx?.("click");
  }, [note, updateNote, playSfx]);

  // 분류 적용
  const assignFlag = useCallback(
    (flagId) => {
      if (!note) return;
      updateNote(note.id, { rangeLabelId: flagId });
      playSfx?.("success");
      const f = findFlag(flagId);
      showMsg?.(`범위: ${f?.label || ""}`, 1200);
    },
    [note, updateNote, playSfx, showMsg, findFlag]
  );
  const assignCircle = useCallback(
    (circleId) => {
      if (!note) return;
      updateNote(note.id, { typeLabelId: circleId });
      playSfx?.("success");
      const c = findCircle(circleId);
      showMsg?.(`유형: ${c?.label || ""}`, 1200);
    },
    [note, updateNote, playSfx, showMsg, findCircle]
  );

  // ----- Pointer 핸들러 -----
  const onPointerDown = (e) => {
    if (annotatorOpen) return;
    const target = e.target;
    const datasetType = target?.dataset?.zone;

    // 카운트 배지 위에서 시작?
    if (datasetType === "badge-flag" || datasetType === "badge-circle") {
      ptrRef.current = {
        ...ptrRef.current,
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startT: Date.now(),
        countDragFrom: datasetType === "badge-flag" ? "flag" : "circle",
        countDragMoved: false,
        longPressTimer: setTimeout(() => {
          ptrRef.current.longPressFired = true;
          if (navigator.vibrate) navigator.vibrate(20);
        }, LONG_PRESS_MS),
        longPressFired: false,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        side: null,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {/* noop */}
      e.preventDefault();
      return;
    }

    // picker가 열려 있을 때 picker 항목 위인지 검사
    if (datasetType === "pick-flag" || datasetType === "pick-circle") {
      // tap 모드에서 항목 탭 처리는 onClick에서 따로
      return;
    }

    // 일반 사진 영역
    const rect = containerRef.current?.getBoundingClientRect();
    const side =
      rect && e.clientX - rect.left < rect.width / 2 ? "left" : "right";

    ptrRef.current = {
      ...ptrRef.current,
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startT: Date.now(),
      countDragFrom: null,
      countDragMoved: false,
      longPressFired: false,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      side,
      longPressTimer: setTimeout(() => {
        ptrRef.current.longPressFired = true;
        // 좌/우 picker 띄우기
        setPicker(side === "left" ? "flag" : "circle");
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx?.("click");
      }, LONG_PRESS_MS),
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {/* noop */}
  };

  const onPointerMove = (e) => {
    if (!ptrRef.current.active) return;
    const dx = e.clientX - ptrRef.current.startX;
    const dy = e.clientY - ptrRef.current.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    ptrRef.current.lastClientX = e.clientX;
    ptrRef.current.lastClientY = e.clientY;

    // 움직임이 임계 이상이면 long-press 취소 (단, picker가 이미 떴으면 유지)
    if (adx + ady > TAP_MAX_MOVE && !ptrRef.current.longPressFired) {
      if (ptrRef.current.longPressTimer) {
        clearTimeout(ptrRef.current.longPressTimer);
        ptrRef.current.longPressTimer = null;
      }
    }

    // 카운트 드래그 추적
    if (ptrRef.current.countDragFrom && adx + ady > COUNT_DRAG_MIN) {
      ptrRef.current.countDragMoved = true;
    }

    // picker가 열려 있고 slide 모드면, 손가락 아래 항목 추적
    if (picker && settings?.longPressMode === "slide") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const z = el?.dataset?.zone;
      if (z === "pick-flag" || z === "pick-circle") {
        setHoverPickerId(el.dataset.id || null);
      } else {
        setHoverPickerId(null);
      }
    }
  };

  const onPointerUp = (e) => {
    const st = ptrRef.current;
    if (!st.active) return;
    if (st.longPressTimer) {
      clearTimeout(st.longPressTimer);
      st.longPressTimer = null;
    }
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - st.startT;
    const wasLong = st.longPressFired;
    const wasFromBadge = !!st.countDragFrom;

    st.active = false;

    // === 카운트 드래그 처리 ===
    if (wasFromBadge && st.countDragMoved) {
      // pointerup 위치의 element 검사
      const dropEl = document.elementFromPoint(e.clientX, e.clientY);
      const dropZone = dropEl?.dataset?.zone;
      if (st.countDragFrom === "flag" && dropZone === "badge-circle") {
        // +1
        if (note) {
          incrementStudy(note.id);
          playSfx?.("success");
          showMsg?.(`✓ ${(note.studyCount || 0) + 1}회 학습`, 1200);
          if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
        }
      } else if (st.countDragFrom === "circle" && dropZone === "badge-flag") {
        // -1
        if (note && (note.studyCount || 0) > 0) {
          decrementStudy(note.id);
          playSfx?.("click");
          showMsg?.(`↺ ${(note.studyCount || 0) - 1}회로 차감`, 1200);
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }
      st.countDragFrom = null;
      st.countDragMoved = false;
      return;
    }
    st.countDragFrom = null;

    // === picker 있으면 ===
    if (picker) {
      // slide 모드: 손가락 위에 항목이 있으면 선택, 아니면 닫기
      if (settings?.longPressMode === "slide" && wasLong) {
        const dropEl = document.elementFromPoint(e.clientX, e.clientY);
        const z = dropEl?.dataset?.zone;
        const id = dropEl?.dataset?.id;
        if (z === "pick-flag" && id) {
          assignFlag(id);
        } else if (z === "pick-circle" && id) {
          assignCircle(id);
        }
        closePicker();
        return;
      }
      // tap 모드: long-press 후 release만 한 상태 → picker 유지
      if (settings?.longPressMode === "tap" && wasLong) {
        // picker 그대로 유지, 다음 탭에서 항목 선택
        return;
      }
      // 그 외(swipe 등)에는 picker를 닫음
    }

    // === 스와이프 판정 ===
    if (dt < SWIPE_MAX_TIME) {
      if (adx > SWIPE_MIN_DIST && adx > ady * 1.2) {
        // 좌우 스와이프
        if (dx < 0) goNext();
        else goPrev();
        if (picker) {
          closePicker();
        }
        return;
      }
      if (ady > SWIPE_MIN_DIST && ady > adx * 1.2) {
        if (dy < 0) {
          // 위 스와이프: Annotator
          setAnnotatorOpen(true);
          playSfx?.("click");
        } else {
          // 아래 스와이프: 어노테이션 visible 토글
          toggleAnnVisible();
        }
        if (picker) {
          closePicker();
        }
        return;
      }
    }

    // === 일반 탭 (picker 없으면 무시) ===
    if (picker && adx < TAP_MAX_MOVE && ady < TAP_MAX_MOVE && !wasLong) {
      // picker 바깥 탭으로 닫기
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const z = el?.dataset?.zone;
      if (z !== "pick-flag" && z !== "pick-circle") {
        closePicker();
      }
    }
  };

  const onPointerCancel = () => {
    if (ptrRef.current.longPressTimer) {
      clearTimeout(ptrRef.current.longPressTimer);
      ptrRef.current.longPressTimer = null;
    }
    ptrRef.current.active = false;
    ptrRef.current.countDragFrom = null;
    ptrRef.current.countDragMoved = false;
  };

  // tap 모드에서 picker 항목 클릭
  const onPickItemClick = (kind, id) => {
    if (kind === "flag") assignFlag(id);
    else assignCircle(id);
    closePicker();
  };

  // 어노테이션 path → SVG d
  const pointsToD = (points) => {
    if (!points || points.length === 0) return "";
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  if (!note) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: theme.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: theme.textSec,
            marginBottom: 16,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          사진을 찾을 수 없어요
        </p>
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  const assignedFlag = note.rangeLabelId ? findFlag(note.rangeLabelId) : null;
  const assignedCircle = note.typeLabelId ? findCircle(note.typeLabelId) : null;

  if (annotatorOpen) {
    return (
      <WrongNoteAnnotator
        theme={theme}
        playSfx={playSfx}
        showMsg={showMsg}
        photoBase64={note.photoBase64}
        photoW={note.photoW || 1024}
        photoH={note.photoH || 1024}
        initialAnnotations={note.annotations || []}
        onSave={(anns) => {
          setAnnotations(note.id, anns);
          setAnnotatorOpen(false);
          showMsg?.("표시 저장됨", 1200);
        }}
        onCancel={() => setAnnotatorOpen(false)}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#000",
        position: "relative",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          zIndex: 10,
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
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ←
        </button>
        <div
          style={{
            flex: 1,
            fontSize: 11,
            opacity: 0.85,
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          {idx + 1} / {activeNotes.length}
          {(note.studyCount || 0) > 0 && (
            <span style={{ marginLeft: 8, color: PASTEL.mint, fontWeight: 700 }}>
              × {note.studyCount}회
            </span>
          )}
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            padding: 4,
          }}
          title="삭제"
        >
          🗑
        </button>
      </div>

      {/* Photo + gestures */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%" }}>
          <img
            src={note.photoBase64}
            alt=""
            draggable={false}
            style={{
              display: "block",
              maxWidth: "100vw",
              maxHeight: "calc(100vh - 200px)",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
          {/* 어노테이션 오버레이 */}
          {note.annotationsVisible !== false &&
            (note.annotations || []).length > 0 && (
              <svg
                viewBox={`0 0 ${note.photoW || 1024} ${note.photoH || 1024}`}
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {(note.annotations || []).map((p) => {
                  const isHighlighter = p.tool === "highlighter";
                  return (
                    <path
                      key={p.id}
                      d={pointsToD(p.points)}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={isHighlighter ? 18 : 2.5}
                      strokeOpacity={isHighlighter ? 0.45 : 1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
              </svg>
            )}
        </div>

        {/* 좌상단 분류 배지 (카운트 드래그 타겟) */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {assignedFlag ? (
            <div
              data-zone="badge-flag"
              style={{
                position: "relative",
                width: 44,
                height: 50,
                pointerEvents: "auto",
                cursor: "grab",
              }}
            >
              <svg
                viewBox="0 0 44 50"
                width="44"
                height="50"
                data-zone="badge-flag"
                style={{ pointerEvents: "none" }}
              >
                <line
                  x1="7"
                  y1="2"
                  x2="7"
                  y2="50"
                  stroke="#fff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d="M7 4 L40 6 L31 16 L40 26 L7 26 Z"
                  fill={assignedFlag.color}
                  stroke="#fff"
                  strokeWidth="1.2"
                />
              </svg>
              <span
                data-zone="badge-flag"
                style={{
                  position: "absolute",
                  left: 10,
                  top: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: "'Noto Serif KR', serif",
                  pointerEvents: "none",
                }}
              >
                {assignedFlag.label}
              </span>
            </div>
          ) : (
            <div
              style={{
                width: 44,
                height: 50,
                borderRadius: 8,
                border: "1.5px dashed rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              범위
            </div>
          )}

          {assignedCircle ? (
            <div
              data-zone="badge-circle"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: assignedCircle.color,
                border: "2px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: theme.text,
                fontFamily: "'Noto Serif KR', serif",
                pointerEvents: "auto",
                cursor: "grab",
              }}
            >
              <span data-zone="badge-circle" style={{ pointerEvents: "none" }}>
                {assignedCircle.label}
              </span>
            </div>
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1.5px dashed rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.4)",
                fontSize: 9,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              유형
            </div>
          )}
        </div>

        {/* === Picker: flag (left edge column) === */}
        {picker === "flag" && (
          <div
            ref={pickerRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 90,
              background: "rgba(20,18,16,0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: 12,
              zIndex: 8,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 4,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              범위 선택
            </div>
            {activeFlags.length === 0 && (
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                  padding: 8,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                활성 깃발이 없어요. 설정에서 추가하세요.
              </div>
            )}
            {activeFlags.map((f) => {
              const isHover = hoverPickerId === f.id;
              return (
                <div
                  key={f.id}
                  data-zone="pick-flag"
                  data-id={f.id}
                  onClick={() => {
                    if (settings?.longPressMode === "tap") {
                      onPickItemClick("flag", f.id);
                    }
                  }}
                  style={{
                    position: "relative",
                    width: 56,
                    height: 64,
                    transform: isHover ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.12s ease",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    viewBox="0 0 56 64"
                    width="56"
                    height="64"
                    data-zone="pick-flag"
                    data-id={f.id}
                    style={{ pointerEvents: "none" }}
                  >
                    <line
                      x1="9"
                      y1="3"
                      x2="9"
                      y2="64"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 5 L52 7 L40 18 L52 30 L9 30 Z"
                      fill={f.color}
                      stroke="#fff"
                      strokeWidth="1.4"
                    />
                  </svg>
                  <span
                    data-zone="pick-flag"
                    data-id={f.id}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      color: theme.text,
                      fontFamily: "'Noto Serif KR', serif",
                      pointerEvents: "none",
                    }}
                  >
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* === Picker: circle (right edge column) === */}
        {picker === "circle" && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 90,
              background: "rgba(20,18,16,0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: 12,
              zIndex: 8,
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 4,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              유형 선택
            </div>
            {activeCircles.length === 0 && (
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                  padding: 8,
                  fontFamily: "'Noto Serif KR', serif",
                }}
              >
                활성 유형이 없어요. 설정에서 추가하세요.
              </div>
            )}
            {activeCircles.map((c) => {
              const isHover = hoverPickerId === c.id;
              return (
                <div
                  key={c.id}
                  data-zone="pick-circle"
                  data-id={c.id}
                  onClick={() => {
                    if (settings?.longPressMode === "tap") {
                      onPickItemClick("circle", c.id);
                    }
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: c.color,
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.text,
                    fontFamily: "'Noto Serif KR', serif",
                    transform: isHover ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.12s ease",
                    cursor: "pointer",
                  }}
                >
                  <span
                    data-zone="pick-circle"
                    data-id={c.id}
                    style={{ pointerEvents: "none" }}
                  >
                    {c.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 힌트 바 */}
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(0,0,0,0.6)",
          color: "rgba(255,255,255,0.7)",
          fontSize: 9,
          textAlign: "center",
          fontFamily: "'Noto Serif KR', serif",
          lineHeight: 1.5,
        }}
      >
        ← → 이동 · ↑ 표시 · ↓ {note.annotationsVisible !== false ? "가리기" : "보이기"} · 좌/우 꾹눌러 분류
      </div>

      {/* 삭제 확인 */}
      {confirmDelete && (
        <div
          onClick={() => closeConfirmDelete()}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
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
              maxWidth: 280,
              background: theme.card,
              borderRadius: 14,
              padding: 20,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 6,
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              사진을 삭제할까요?
            </div>
            <p
              style={{
                fontSize: 11,
                color: theme.textSec,
                marginBottom: 14,
                wordBreak: "keep-all",
              }}
            >
              삭제 후에는 되돌릴 수 없어요.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => closeConfirmDelete()}
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
                onClick={async () => {
                  const id = note.id;
                  closeConfirmDelete();
                  await deleteNote(id);
                  playSfx?.("click");
                  showMsg?.("사진이 삭제됐어요", 1500);
                  // 인덱스 보정
                  if (idx >= activeNotes.length - 1 && idx > 0) {
                    setIdx((i) => i - 1);
                  }
                  // 마지막 한 장 삭제 시 갤러리로
                  if (activeNotes.length <= 1) {
                    onBack?.();
                  }
                }}
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
          </div>
        </div>
      )}
    </div>
  );
}
