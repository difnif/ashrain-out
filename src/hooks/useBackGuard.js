// ============================================================
// ashrain.out — useBackGuard
// ============================================================
// 모달/sub-view 마운트 시 브라우저 history에 가짜 entry를 push해서
// 안드로이드 ◁ 뒤로가기 / 브라우저 ← 버튼이 onBack 콜백으로 흘러가게 한다.
//
// 동작:
//   1) enabled=true 마운트 시 history.pushState(...)로 더미 entry 추가
//   2) popstate 이벤트 핸들러 등록 (capture phase): 발생 시 onBack() 호출
//      + stopImmediatePropagation으로 App.jsx/컨테이너의 listener 차단
//   3) 언마운트 / enabled=false 전환 시 — 리스너만 제거하고 history는 건드리지 않는다.
//      정상 종료 경로에서는 소비자가 finish()를 호출해 더미 entry를 회수해야 한다.
//
// 사용:
//   const finish = useBackGuard(onCancel, true);
//   const handleSave = () => { finish(); onSave?.(data); };
//
// === App.jsx 호환 ===
// App.jsx는 popstate에서 e.state.screen을 읽어 화면 전환한다.
// screen 프로퍼티가 없으면 "menu"로 fallback → 의도치 않은 화면 이탈.
// 따라서 더미 entry에도 현재 screen 값을 보존한다.
//
// === 글로벌 마커 ===
// finish()가 발생시킨 history.back()은 같은 stack의 popstate 리스너에서
// 외부 ◁로 오인될 수 있다. ASHRAIN_INTERNAL_BACK_FLAG 플래그로 구분.

import { useEffect, useRef, useCallback } from "react";

export const ASHRAIN_INTERNAL_BACK_FLAG = "__ashrainInternalBack";

export function useBackGuard(onBack, enabled = true) {
  const consumedRef = useRef(false);
  const finishedRef = useRef(false);

  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    consumedRef.current = false;
    finishedRef.current = false;

    // App.jsx popstate 핸들러가 screen 없는 state를 "menu"로 보내므로,
    // 현재 state의 screen 값을 보존해 history.back() 시 화면 이탈을 방지.
    const currentScreen = window.history.state?.screen;
    const marker = {
      __ashrainBackGuard: true,
      t: Date.now(),
      ...(currentScreen ? { screen: currentScreen } : {}),
    };
    try {
      window.history.pushState(marker, "");
    } catch (e) {
      console.warn("[useBackGuard] pushState failed:", e);
      return;
    }

    const onPop = (e) => {
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;
      // 외부 ◁ 트리거 → App.jsx/컨테이너 listener로 전파 차단 + onBack 호출
      e.stopImmediatePropagation();
      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    // capture phase 등록 — App.jsx(bubble)보다 먼저 받기 위함
    window.addEventListener("popstate", onPop, true);

    return () => {
      window.removeEventListener("popstate", onPop, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const finish = useCallback(() => {
    if (consumedRef.current || finishedRef.current) return;
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        // popstate 발화 후 flag reset을 위한 일회용 listener
        const resetFlag = () => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        };
        window.addEventListener("popstate", resetFlag);
        // 안전망: popstate 미발화 시 listener 누수 방지
        setTimeout(() => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        }, 200);
        window.history.back();
      } else {
        finishedRef.current = true;
      }
    } catch {
      /* noop */
    }
  }, []);

  return finish;
}
