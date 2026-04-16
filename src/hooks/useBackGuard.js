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
    } catch (e) {
      console.warn("[useBackGuard] pushState failed:", e);
      return;
    }

    const onPop = (e) => {
      // 우리(혹은 다른 useBackGuard)의 finish()가 발생시킨 back 이벤트면 무시
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;
      // 외부 ◁ 트리거 → 다른 popstate listener(App.jsx 등) 전파 차단 + onBack 호출
      e.stopImmediatePropagation();
      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    // capture phase 등록 — App.jsx의 bubble phase listener보다 먼저 받기 위함
    window.addEventListener("popstate", onPop, true);

    return () => {
      window.removeEventListener("popstate", onPop, true);
      // ⚠️ history는 건드리지 않는다. 이전 auto-back은 컨테이너 popstate 리스너가
      // 외부 ◁로 오인하는 문제가 있었고, enabled=false 전환이 정상 종료인지
      // 비정상인지 hook 내부에서 알 수 없어서 잘못된 back을 발사함.
      // 정상 종료 경로는 소비자가 finish()를 호출해야 한다.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // 정상 종료 시 호출: 더미 history entry를 회수한다.
  // - popstate로 이미 소비됐거나(consumed) 이전에 finish() 호출됐으면 no-op (idempotent)
  const finish = useCallback(() => {
    if (consumedRef.current || finishedRef.current) return;
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        // popstate 발화 후 flag reset — setTimeout(0) race 방지를 위해 일회용 listener로 처리
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
