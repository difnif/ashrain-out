// ============================================================
// ashrain.out — useBackGuard
// ============================================================
// 모달/sub-view 마운트 시 브라우저 history에 가짜 entry를 push해서
// 안드로이드 ◁ 뒤로가기 / 브라우저 ← 버튼이 onBack 콜백으로 흘러가게 한다.
//
// 동작:
//   1) enabled=true 마운트 시 history.pushState(...)로 더미 entry 추가
//      + 글로벌 activeGuards 카운터 +1
//   2) popstate 이벤트 핸들러 등록: 발생 시 onBack() 호출
//   3) 언마운트 / enabled=false 시 — 리스너 제거 + activeGuards -1.
//      history는 건드리지 않는다. 정상 종료 경로는 finish()를 호출해야 한다.
//
// 사용:
//   const finish = useBackGuard(onCancel, true);
//   const handleSave = () => { finish(); onSave?.(data); };
//
// === 컨테이너 협조 ===
// WrongNoteScreen 같은 상위 컨테이너의 popstate listener는 isGuardActive()를
// 체크해서 활성 guard가 있으면 자신의 처리를 skip해야 한다.
// (useBackGuard의 listener와 컨테이너 listener가 같은 popstate를 둘 다 처리하면
//  화면이 두 단계 빠지는 버그 발생)
//
// === App.jsx 호환 ===
// App.jsx popstate 핸들러가 screen 없는 state를 "menu"로 fallback 보냄.
// 따라서 더미 entry에도 현재 screen 값을 보존해 화면 이탈 방지.
//
// === 내부 back 마커 ===
// finish()가 발생시킨 history.back()은 activeGuards 체크만으로는 외부 ◁와 구분 불가
// (finish 호출 시점에 아직 마운트 상태라 activeGuards > 0).
// → ASHRAIN_INTERNAL_BACK_FLAG 플래그로 한 번의 popstate 동안 "이건 내부 back" 표시.

import { useEffect, useRef, useCallback } from "react";

export const ASHRAIN_INTERNAL_BACK_FLAG = "__ashrainInternalBack";

// 글로벌 활성 guard 카운터. 컨테이너가 isGuardActive()로 조회해서 popstate 처리를 양보한다.
let _activeGuards = 0;
export function isGuardActive() {
  return _activeGuards > 0;
}

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

    // 활성 guard 카운터 증가 — 컨테이너는 이 상태를 체크해 popstate 처리를 양보
    _activeGuards += 1;

    const onPop = (e) => {
      // finish()가 발생시킨 내부 back이면 무시
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;
      // 외부 ◁ 트리거 → onBack 호출. 컨테이너는 activeGuards > 0 보고 자신의 처리 skip함.
      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      _activeGuards = Math.max(0, _activeGuards - 1);
      // history는 건드리지 않는다. 정상 종료는 소비자가 finish()를 먼저 호출.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // 정상 종료 시 호출: 더미 history entry를 회수한다.
  const finish = useCallback(() => {
    if (consumedRef.current || finishedRef.current) return;
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        // popstate 발화 후 flag reset (setTimeout race 방지 위해 일회용 listener)
        const resetFlag = () => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        };
        window.addEventListener("popstate", resetFlag);
        // 안전망
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
