// ============================================================
// ashrain.out — useBackGuard
// ============================================================
// 모달/sub-view 마운트 시 브라우저 history에 가짜 entry를 push해서
// 안드로이드 ◁ 뒤로가기 / 브라우저 ← 버튼이 onBack 콜백으로 흘러가게 한다.
//
// 동작:
//   1) 마운트 시 history.pushState(...)로 더미 state 추가
//   2) popstate 이벤트 핸들러 등록: 발생 시 onBack() 호출
//   3) 언마운트 시 — 아직 더미 state가 살아 있으면 history.back()으로 정리
//      (정상 종료(onBack 호출 후 언마운트) 시에는 popstate가 이미 처리됐으므로 skip)
//
// 사용:
//   useBackGuard(onCancel, true);  // 두 번째 인자: enabled (조건부 가드)

import { useEffect, useRef } from "react";

export function useBackGuard(onBack, enabled = true) {
  const consumedRef = useRef(false); // popstate가 이미 발화되었는지

  useEffect(() => {
    if (!enabled) return;
    consumedRef.current = false;

    // 더미 state push — 같은 URL로 새 history entry 추가
    const marker = { __ashrainBackGuard: true, t: Date.now() };
    try {
      window.history.pushState(marker, "");
    } catch (e) {
      console.warn("[useBackGuard] pushState failed:", e);
      return;
    }

    const onPop = (e) => {
      // popstate 발생 = 사용자가 ◁ 또는 ← 누름 → onBack 호출
      consumedRef.current = true;
      try {
        onBack?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // 정상 종료 시 (popstate 없이 컴포넌트가 사라진 경우) 더미 entry를 pop
      if (!consumedRef.current) {
        try {
          // 가드: 현재 history.state가 우리 더미인지 확인 후에만 back
          if (
            window.history.state &&
            window.history.state.__ashrainBackGuard
          ) {
            window.history.back();
          }
        } catch (err) {
          /* noop */
        }
      }
    };
    // onBack은 매 렌더마다 새 함수일 수 있으므로 ref로 감싸도 되지만
    // 실용상 enabled 변경에만 재실행되게 한다 (마운트/언마운트 1회만 의도)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
