// ============================================================
// ashrain.out — useBackGuard
// ============================================================
// 모달/sub-view 마운트 시 브라우저 history에 가짜 entry를 push해서
// 안드로이드 ◁ 뒤로가기 / 브라우저 ← 버튼이 onBack 콜백으로 흘러가게 한다.
//
// 동작:
//   1) enabled=true 마운트 시 history.pushState(...)로 더미 entry 추가
//   2) popstate 이벤트 핸들러 등록: 발생 시 onBack() 호출
//   3) 언마운트 / enabled=false 전환 시 — 리스너만 제거하고 history는 건드리지 않는다.
//      ⚠️ 정상 종료 경로(저장/취소/외부 close 등)에서는 반드시 소비자가 finish()를 호출해
//         더미 entry를 회수해야 한다. 호출을 빠뜨리면 더미 entry가 history stack에 남는다.
//
// 사용:
//   const finish = useBackGuard(onCancel, true);
//   // ...
//   const handleSave = () => {
//     finish();        // 더미 entry 회수 (popstate로 이미 소비됐으면 no-op)
//     onSave?.(data);  // 부모에게 종료 통지
//   };
//
// === 리팩터링 노트 (이전 버전 대비) ===
// 이전 버전은 cleanup에서 자동으로 history.back()을 호출했지만, 이로 인해
// 두 가지 문제가 있었다:
//   (a) 컨테이너의 popstate 리스너가 이 back을 외부 ◁로 오인할 위험
//       → ASHRAIN_INTERNAL_BACK_FLAG로 우회 가능했지만 race가 미묘함
//   (b) 동적 enabled(예: modalOpen)가 false로 전환되는 시점이 정상 종료인지
//       비정상 종료인지 hook 안에서는 알 수 없어 항상 back을 발사 → 디버깅 어려움
// 새 패턴은 책임을 명시적으로 소비자 쪽으로 옮겨, hook은 단순한 도구가 된다.
//
// === 글로벌 마커 (유지) ===
// finish()가 발생시킨 history.back()은 같은 stack을 공유하는 다른 popstate
// 리스너(예: WrongNoteRouter의 컨테이너 popstate)에서 외부 ◁로 오인될 수 있다.
// → window.__ashrainInternalBack 플래그를 잠깐 세워서, 다른 리스너가 이 플래그를
//   보면 이번 popstate를 무시하도록 한다.

import { useEffect, useRef, useCallback } from "react";

export const ASHRAIN_INTERNAL_BACK_FLAG = "__ashrainInternalBack";

// ============================================================
// 진단용 화면 오버레이 (임시 — 디버깅 후 제거 예정)
// 휴대폰에서 console.log를 못 보기 때문에 화면 우상단에 작은 박스로 로그 표시.
// 박스 길게 누르면 전체 로그를 클립보드에 복사한다.
// ============================================================
function ensureDebugOverlay() {
  if (typeof document === "undefined") return null;
  let box = document.getElementById("__ashrain_debug_overlay__");
  if (box) return box;
  box = document.createElement("div");
  box.id = "__ashrain_debug_overlay__";
  Object.assign(box.style, {
    position: "fixed",
    top: "4px",
    right: "4px",
    width: "60vw",
    maxWidth: "320px",
    maxHeight: "40vh",
    overflow: "auto",
    background: "rgba(0,0,0,0.85)",
    color: "#0f0",
    fontFamily: "monospace",
    fontSize: "9px",
    lineHeight: "1.25",
    padding: "4px 6px",
    zIndex: "999999",
    borderRadius: "4px",
    pointerEvents: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    border: "1px solid #0f0",
  });
  // 길게 누르면 클립보드 복사
  let pressTimer = null;
  box.addEventListener("pointerdown", () => {
    pressTimer = setTimeout(() => {
      try {
        const text = box.innerText;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            const flash = document.createElement("div");
            flash.textContent = "✓ COPIED";
            Object.assign(flash.style, {
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              background: "#0f0",
              color: "#000",
              padding: "10px 20px",
              fontSize: "16px",
              fontWeight: "bold",
              zIndex: "9999999",
              borderRadius: "8px",
            });
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 800);
          });
        }
      } catch {}
    }, 600);
  });
  box.addEventListener("pointerup", () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  });
  box.addEventListener("pointercancel", () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  });
  // 더블탭으로 클리어
  let lastTap = 0;
  box.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 350) {
      box.innerHTML = "<div style='color:#ff0'>[cleared]</div>";
    }
    lastTap = now;
  });
  document.body.appendChild(box);
  return box;
}

export function dbgLog(...args) {
  try {
    const box = ensureDebugOverlay();
    if (!box) return;
    const t = new Date();
    const ts = `${String(t.getSeconds()).padStart(2, "0")}.${String(t.getMilliseconds()).padStart(3, "0")}`;
    const msg = args.map(a => {
      if (typeof a === "string") return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(" ");
    const line = document.createElement("div");
    line.textContent = `${ts} ${msg}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
    // 너무 많이 쌓이면 오래된 것 제거
    while (box.children.length > 200) box.removeChild(box.firstChild);
  } catch {}
  // console에도 같이
  try { console.log(...args); } catch {}
}
// 전역 노출 (다른 파일에서도 쉽게 쓰기 위함)
if (typeof window !== "undefined") {
  window.__ashrainDbg = dbgLog;
}

export function useBackGuard(onBack, enabled = true) {
  // popstate가 이미 발화되어 더미 entry가 자연 소진되었는지
  const consumedRef = useRef(false);
  // finish()가 이미 호출되어 더미 entry를 회수했는지 (idempotency 보장)
  const finishedRef = useRef(false);

  // onBack은 매 렌더마다 새 함수일 수 있다.
  // 마운트 시 클로저로 캡처하면 stale closure 버그가 생기므로 ref로 항상 최신 보관.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    consumedRef.current = false;
    finishedRef.current = false;

    // 더미 state push — 같은 URL로 새 history entry 추가
    const marker = { __ashrainBackGuard: true, t: Date.now() };
    try {
      window.history.pushState(marker, "");
    } catch (e) {
      console.warn("[useBackGuard] pushState failed:", e);
      return;
    }

    const onPop = (e) => {
      dbgLog("[BG] popstate (capture)", {
        flag: window[ASHRAIN_INTERNAL_BACK_FLAG],
        state: window.history.state,
      });
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) {
        dbgLog("[BG] -> ignored (internal flag)");
        return;
      }
      e.stopImmediatePropagation();
      dbgLog("[BG] -> external back, calling onBack, stopImmediatePropagation");
      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    window.addEventListener("popstate", onPop, true);
    dbgLog("[BG] mount: pushed dummy + capture listener attached");

    return () => {
      dbgLog("[BG] cleanup: removing capture listener", {
        consumed: consumedRef.current,
        finished: finishedRef.current,
      });
      window.removeEventListener("popstate", onPop, true);
      // ⚠️ history는 건드리지 않는다. 이전 버전의 auto-back은 제거됨.
      // 정상 종료 경로에서 소비자가 finish()를 호출했어야 한다.
      // (호출 누락 감지를 돕기 위한 dev 경고)
      if (
        !consumedRef.current &&
        !finishedRef.current &&
        typeof window !== "undefined" &&
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        console.warn(
          "[useBackGuard] unmounted (or disabled) without finish() — dummy history entry may be orphaned"
        );
      }
    };
    // enabled 토글 시에만 재마운트. onBack 변경은 ref로 흡수.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // 정상 종료 시 호출: 더미 history entry를 회수한다.
  // - popstate로 이미 소비됐거나(consumed) 이전에 finish() 호출됐으면 no-op (idempotent)
  // - 현재 history top이 우리 마커가 아니면 안전하게 no-op
  const finish = useCallback(() => {
    dbgLog("[BG] finish() called", {
      consumed: consumedRef.current,
      finished: finishedRef.current,
      state: window.history.state,
    });
    if (consumedRef.current || finishedRef.current) {
      dbgLog("[BG] finish() -> no-op");
      return;
    }
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        const resetFlag = () => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
          dbgLog("[BG] resetFlag fired -> flag cleared");
        };
        window.addEventListener("popstate", resetFlag);
        setTimeout(() => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        }, 200);
        dbgLog("[BG] finish() -> calling history.back(), flag set");
        window.history.back();
      } else {
        dbgLog("[BG] finish() -> top is NOT our marker, mark finished only");
        finishedRef.current = true;
      }
    } catch {
      /* noop */
    }
  }, []);

  return finish;
}
