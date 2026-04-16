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
//
// === 글로벌 마커 ===
// 여러 useBackGuard 인스턴스(컨테이너 + 모달)가 같은 history stack을 공유한다.
// 모달이 코드로 닫힐 때 cleanup이 history.back()을 호출하면, 컨테이너의
// popstate 리스너가 이를 외부 ◁ 트리거로 오인할 수 있다.
// → window.__ashrainInternalBack 플래그를 잠깐 세워서, 컨테이너의 popstate
//   리스너가 이를 보면 무시하도록 한다. 컨테이너 측에서도 동일한 플래그 검사 필요.

import { useEffect, useRef } from "react";

export const ASHRAIN_INTERNAL_BACK_FLAG = "__ashrainInternalBack";

export function useBackGuard(onBack, enabled = true) {
  const consumedRef = useRef(false); // popstate가 이미 발화되었는지
  // onBack은 매 렌더마다 새 함수일 수 있다.
  // 마운트 시 클로저로 캡처하면 stale closure 버그가 생기므로 ref로 항상 최신 보관.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

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
      // 우리(혹은 다른 useBackGuard)가 의도적으로 발생시킨 back 이벤트면 무시
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;
      // popstate 발생 = 사용자가 ◁ 또는 ← 누름 → 최신 onBack 호출
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
      // 정상 종료 시 (popstate 없이 컴포넌트가 사라진 경우) 더미 entry를 pop
      if (!consumedRef.current) {
        try {
          if (
            window.history.state &&
            window.history.state.__ashrainBackGuard
          ) {
            // 글로벌 플래그를 세워서, 다른 useBackGuard 인스턴스(예: 컨테이너의
            // popstate 리스너)가 이 back을 외부 ◁로 오인하지 않게 한다.
            window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
            window.history.back();
            // 다음 task에서 플래그 해제 (popstate는 비동기로 발화됨)
            setTimeout(() => {
              window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
            }, 0);
          }
        } catch (err) {
          /* noop */
        }
      }
    };
    // enabled 토글 시에만 재마운트. onBack 변경은 ref로 흡수.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
