// ============================================================
// ashrain.out — useBackGuard
// ============================================================
// 모달/sub-view 마운트 시 브라우저 history에 가짜 entry를 push해서
// 안드로이드 ◁ 뒤로가기 / 브라우저 ← 버튼이 onBack 콜백으로 흘러가게 한다.
//
// 동작:
//   1) 마운트 시 history.pushState(...)로 더미 state 추가
//   2) popstate 이벤트 핸들러 등록 (capture phase): 발생 시 onBack() 호출
//      + stopImmediatePropagation으로 다른 popstate listener(App.jsx 등) 차단
//   3) 언마운트 / enabled=false 시 — 리스너만 제거. history는 건드리지 않는다.
//      정상 종료 경로(저장/취소 버튼, "예" 확인 등)에서 소비자가 finish()를 호출해
//      더미 entry를 회수해야 한다.
//
// 사용:
//   const finish = useBackGuard(onCancel, true);
//   const handleSave = () => { finish(); onSave?.(data); };
//
// === App.jsx 호환 ===
// App.jsx popstate 핸들러가 screen 없는 state를 "menu"로 fallback 보냄.
// 따라서 더미 entry에도 현재 screen 값을 보존해서 history.back() 시 의도치 않은 화면 이동 방지.
//
// === 글로벌 마커 ===
// finish()가 발생시킨 history.back()은 같은 stack의 popstate 리스너에서
// 외부 ◁로 오인될 수 있음 → ASHRAIN_INTERNAL_BACK_FLAG 플래그로 구분.

import { useEffect, useRef, useCallback } from "react";

export const ASHRAIN_INTERNAL_BACK_FLAG = "__ashrainInternalBack";

// ============================================================
// 진단용 화면 오버레이 (임시)
// 박스 길게 누르면 클립보드 복사, 더블탭으로 clear
// ============================================================
function ensureDebugOverlay() {
  if (typeof document === "undefined") return null;
  let box = document.getElementById("__ashrain_debug_overlay__");
  if (box) return box;
  box = document.createElement("div");
  box.id = "__ashrain_debug_overlay__";
  Object.assign(box.style, {
    position: "fixed", top: "4px", right: "4px", width: "60vw", maxWidth: "320px",
    maxHeight: "40vh", overflow: "auto", background: "rgba(0,0,0,0.85)",
    color: "#0f0", fontFamily: "monospace", fontSize: "9px", lineHeight: "1.25",
    padding: "4px 6px", zIndex: "999999", borderRadius: "4px",
    pointerEvents: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
    border: "1px solid #0f0",
  });
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
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)", background: "#0f0",
              color: "#000", padding: "10px 20px", fontSize: "16px",
              fontWeight: "bold", zIndex: "9999999", borderRadius: "8px",
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
  let lastTap = 0;
  box.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 350) box.innerHTML = "<div style='color:#ff0'>[cleared]</div>";
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
    while (box.children.length > 200) box.removeChild(box.firstChild);
  } catch {}
  try { console.log(...args); } catch {}
}
if (typeof window !== "undefined") window.__ashrainDbg = dbgLog;

export function useBackGuard(onBack, enabled = true) {
  const consumedRef = useRef(false);  // popstate가 이미 발화되었는지
  const finishedRef = useRef(false);  // finish()가 이미 호출되었는지

  // onBack은 매 렌더마다 새 함수일 수 있으므로 ref로 항상 최신 보관 (stale closure 방지)
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    consumedRef.current = false;
    finishedRef.current = false;

    // 현재 state의 screen 값을 보존 (App.jsx popstate fallback 방지)
    const currentScreen = window.history.state?.screen;
    const marker = {
      __ashrainBackGuard: true,
      t: Date.now(),
      ...(currentScreen ? { screen: currentScreen } : {}),
    };
    try {
      window.history.pushState(marker, "");
      dbgLog("[BG] MOUNT pushState", { screen: currentScreen });
    } catch (e) {
      console.warn("[useBackGuard] pushState failed:", e);
      return;
    }

    const onPop = (e) => {
      dbgLog("[BG] popstate cap", { flag: window[ASHRAIN_INTERNAL_BACK_FLAG], state: window.history.state });
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) {
        dbgLog("[BG] ignored (internal flag)");
        return;
      }
      e.stopImmediatePropagation();
      dbgLog("[BG] external back -> onBack");
      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    window.addEventListener("popstate", onPop, true);

    return () => {
      dbgLog("[BG] CLEANUP", { consumed: consumedRef.current, finished: finishedRef.current });
      window.removeEventListener("popstate", onPop, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const finish = useCallback(() => {
    dbgLog("[BG] finish()", { consumed: consumedRef.current, finished: finishedRef.current, isMarker: window.history.state?.__ashrainBackGuard });
    if (consumedRef.current || finishedRef.current) {
      dbgLog("[BG] finish() -> no-op");
      return;
    }
    try {
      if (window.history.state && window.history.state.__ashrainBackGuard) {
        finishedRef.current = true;
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        const resetFlag = () => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
          dbgLog("[BG] flag reset");
        };
        window.addEventListener("popstate", resetFlag);
        setTimeout(() => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        }, 200);
        dbgLog("[BG] finish -> history.back()");
        window.history.back();
      } else {
        dbgLog("[BG] finish -> top NOT marker, mark finished only");
        finishedRef.current = true;
      }
    } catch {
      /* noop */
    }
  }, []);

  return finish;
}
