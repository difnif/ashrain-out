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
      // 우리(혹은 다른 useBackGuard)가 의도적으로 발생시킨 back 이벤트면 무시
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;
      // popstate 발생 = 사용자가 ◁ 또는 ← 누름 → 최신 onBack 호출
      // 이 경로에서는 더미 entry가 이미 자연 소진되었으므로 finish() 호출 불필요.
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
    if (consumedRef.current || finishedRef.current) return;
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        // 컨테이너의 popstate 리스너가 이 back을 외부 ◁로 오인하지 않게 플래그를 세움
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        window.history.back();
        // 다음 task에서 플래그 해제 (popstate는 비동기로 발화됨)
        setTimeout(() => {
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        }, 0);
      } else {
        // history top이 우리 마커가 아니면(예: 더 위에 다른 guard가 push함)
        // 회수를 시도하지 않고 그냥 finished로만 표시한다. 이 경우 더미는
        // 다른 guard의 finish() 또는 외부 ◁로 자연 정리될 때까지 기다린다.
        finishedRef.current = true;
      }
    } catch {
      /* noop */
    }
  }, []);

  return finish;
}
