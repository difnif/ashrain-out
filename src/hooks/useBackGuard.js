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
      // 우리(혹은 다른 useBackGuard)의 finish()가 발생시킨 back 이벤트면 무시.
      // (이 인스턴스가 살아 있는 동안 자기 자신의 finish()가 발화한 popstate가
      //  여기로 도달하는 케이스 — 보통은 finish() 직후 enabled=false로 cleanup이
      //  먼저 일어나 listener가 제거되지만, 동기 타이밍 차이로 도달할 수 있음)
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) return;

      // 외부 ◁ / 브라우저 ← 트리거.
      // 컨테이너(WrongNoteScreen)도 popstate를 듣고 있어서, 그대로 두면
      // 컨테이너가 같은 이벤트를 외부 ◁로 인식해 sub-view까지 빠져버린다.
      // → 같은 EventTarget(window)의 다른 popstate listener를 모두 차단.
      // (capture phase에서 호출되므로 bubble phase의 컨테이너 listener도 차단됨)
      e.stopImmediatePropagation();

      consumedRef.current = true;
      try {
        onBackRef.current?.();
      } catch (err) {
        console.error("[useBackGuard] onBack error:", err);
      }
    };
    // capture phase 등록 — 컨테이너의 bubble phase listener보다 먼저 받기 위함
    window.addEventListener("popstate", onPop, true);

    return () => {
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
    if (consumedRef.current || finishedRef.current) return;
    try {
      if (
        window.history.state &&
        window.history.state.__ashrainBackGuard
      ) {
        finishedRef.current = true;
        // 컨테이너의 popstate 리스너가 이 back을 외부 ◁로 오인하지 않게 플래그를 세움.
        // 플래그 reset은 popstate가 발화한 뒤에 일어나야 하는데, setTimeout(0)은
        // 일부 브라우저에서 popstate task보다 먼저 실행되는 race가 있어,
        // 대신 popstate 자체에 일회용 listener를 달아서 모든 다른 listener가
        // 처리된 직후(같은 task 내, bubble phase 마지막)에 reset한다.
        window[ASHRAIN_INTERNAL_BACK_FLAG] = true;
        const resetFlag = () => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        };
        // bubble phase(default), 가장 마지막에 등록 → 가장 마지막에 호출됨.
        // 같은 popstate task 내에서 컨테이너의 listener가 flag=true를 본 다음에 reset.
        window.addEventListener("popstate", resetFlag);
        // 안전망: 만약 어떤 이유로든 popstate가 발화하지 않으면 (브라우저 버그 등)
        // listener가 영영 남는 것을 방지. 충분히 긴 시간 후 강제 정리.
        setTimeout(() => {
          window.removeEventListener("popstate", resetFlag);
          window[ASHRAIN_INTERNAL_BACK_FLAG] = false;
        }, 200);
        window.history.back();
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
