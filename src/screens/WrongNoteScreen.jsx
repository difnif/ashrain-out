// ============================================================
// ashrain.out — WrongNoteScreen (container)
// ============================================================
// 오답노트 컨테이너. 내부 sub-view (gallery / detail / settings / archive)를
// 자체 라우팅한다. App.jsx는 이 파일의 renderWrongNoteScreen(ctx)만 import.
//
// === Hook 호출 패턴 ===
// useWrongNotes(user)는 항상 컨테이너가 호출한다 (사진 데이터는 다른 화면과 공유 X)
// useWrongNoteSettings(user)는 두 가지 모드 지원:
//   1) 외부 모드 (권장): App.jsx에서 한 번만 호출 → ctx.wrongNoteSettingsHook으로 전달
//      → ProblemScreen 등 다른 화면과 settings를 공유 (Firestore listener 1개로 통일)
//   2) 자체 모드 (fallback): ctx에 wrongNoteSettingsHook이 없으면 컨테이너가 직접 호출
//      → 단독 사용 시 / 마이그레이션 중 호환용
//
// 두 모드는 Rules of Hooks를 지키기 위해 별도 컴포넌트로 분기한다.
// (조건부로 같은 컴포넌트 안에서 useXxx를 호출/생략하면 안 됨)

import { useState, useEffect, useCallback, useRef } from "react";
import { useWrongNotes } from "../hooks/useWrongNotes";
import { useWrongNoteSettings } from "../hooks/useWrongNoteSettings";
import { ASHRAIN_INTERNAL_BACK_FLAG } from "../hooks/useBackGuard";
import WrongNoteGallery from "./WrongNoteGallery";
import WrongNoteDetail from "./WrongNoteDetail";
import WrongNoteSettings from "./WrongNoteSettings";
import WrongNoteArchive from "./WrongNoteArchive";

// ===== Pure router (no hooks called inside) =====
// 두 hook 결과를 모두 props로 받는 순수 라우터.
// View stack을 명시적으로 관리하고 브라우저 history와 동기화한다.
function WrongNoteRouter({
  theme,
  playSfx,
  showMsg,
  setScreen,
  notesHook,
  settingsHook,
}) {
  // View stack: 항상 "gallery"가 base. push될 때마다 history entry 추가.
  // 예: ["gallery"] → ["gallery", "detail"] → ["gallery", "detail", "settings"]
  const [stack, setStack] = useState(["gallery"]);
  const [detailNoteId, setDetailNoteId] = useState(null);
  const currentView = stack[stack.length - 1];

  // popstate 이벤트를 우리가 발화시킨 건지 외부(◁) 건지 구분
  const internalPopRef = useRef(false);

  // sub-view push: stack에 새 view 추가 + history.pushState
  const pushView = useCallback((view) => {
    setStack((s) => [...s, view]);
    try {
      window.history.pushState(
        { __ashrainWN: true, screen: "wrongNote", depth: Date.now() },
        ""
      );
    } catch (e) {
      console.warn("[WrongNoteRouter] pushState failed:", e);
    }
  }, []);

  // sub-view pop: stack에서 마지막 제거 + history.back (단, 외부 ◁가 트리거한 pop이면 history.back 생략)
  const popView = useCallback((triggeredByPopState) => {
    setStack((s) => {
      if (s.length <= 1) {
        // stack에 gallery만 남음 → 컨테이너 종료(홈으로)
        // 외부 popstate가 트리거한 경우는 history가 이미 한 단계 뒤로 갔으므로
        // 추가로 setScreen만 하면 됨
        setScreen?.("student-home");
        return s;
      }
      return s.slice(0, -1);
    });
    if (!triggeredByPopState) {
      // UI에서 호출된 경우(헤더 ←, 갤러리 ← 등) → history도 동기화
      try {
        if (
          window.history.state &&
          window.history.state.__ashrainWN
        ) {
          internalPopRef.current = true;
          window.history.back();
        }
      } catch (e) {
        /* noop */
      }
    }
  }, [setScreen]);

  // popstate 핸들러: 안드로이드 ◁ / 브라우저 ←
  useEffect(() => {
    const onPop = (e) => {
      // useBackGuard 인스턴스가 cleanup으로 발화시킨 back이면 무시
      // (예: Detail의 picker 모달이 코드로 닫힐 때)
      if (window[ASHRAIN_INTERNAL_BACK_FLAG]) {
        return;
      }
      if (internalPopRef.current) {
        // 우리가 history.back()을 호출해서 발생한 popstate → 무시 (이미 stack pop 됨)
        internalPopRef.current = false;
        return;
      }
      // 외부 ◁ 트리거 → stack pop
      popView(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [popView]);

  // 갤러리 외 sub-view들은 마운트 시 stack에 push되어 있으므로
  // 종료 시(언마운트) 더미 history entry가 남아 있을 수 있음 → 정리
  useEffect(() => {
    return () => {
      // 컨테이너 자체가 언마운트될 때 (sub-view 전환과는 무관)
      // stack에 쌓인 만큼의 history entry를 정리
      const extra = stack.length - 1;
      for (let i = 0; i < extra; i++) {
        try {
          if (
            window.history.state &&
            window.history.state.__ashrainWN
          ) {
            internalPopRef.current = true;
            window.history.back();
          }
        } catch {/* noop */}
      }
    };
    // 의도적으로 mount 시 빈 deps. 언마운트 시점의 stack을 캡처하려면
    // ref가 필요하지만, 컨테이너 언마운트는 보통 stack=["gallery"]에서만 일어남.
    // 그 외 케이스는 popstate가 미리 처리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goGallery = () => popView(false);  // 한 단계 뒤로
  const goDetail = (noteId) => {
    setDetailNoteId(noteId);
    pushView("detail");
  };
  const goSettings = () => pushView("settings");
  const goArchive = () => pushView("archive");

  const exitToHome = () => {
    // 갤러리에서 ← 누르면 컨테이너 종료
    setScreen?.("student-home");
  };

  if (notesHook.loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: theme.bg,
          color: theme.textSec,
          fontSize: 12,
          fontFamily: "'Noto Serif KR', serif",
        }}
      >
        오답노트를 불러오는 중...
      </div>
    );
  }

  if (currentView === "settings") {
    return (
      <WrongNoteSettings
        theme={theme}
        playSfx={playSfx}
        showMsg={showMsg}
        onBack={goGallery}
        {...settingsHook}
      />
    );
  }

  if (currentView === "archive") {
    return (
      <WrongNoteArchive
        theme={theme}
        playSfx={playSfx}
        showMsg={showMsg}
        onBack={goGallery}
        inactiveNotes={notesHook.inactiveNotes}
        toggleActive={notesHook.toggleActive}
        deleteNote={notesHook.deleteNote}
        findFlag={settingsHook.findFlag}
        findCircle={settingsHook.findCircle}
      />
    );
  }

  if (currentView === "detail") {
    return (
      <WrongNoteDetail
        theme={theme}
        playSfx={playSfx}
        showMsg={showMsg}
        onBack={goGallery}
        activeNotes={notesHook.activeNotes}
        initialNoteId={detailNoteId}
        updateNote={notesHook.updateNote}
        deleteNote={notesHook.deleteNote}
        setAnnotations={notesHook.setAnnotations}
        incrementStudy={notesHook.incrementStudy}
        decrementStudy={notesHook.decrementStudy}
        activeFlags={settingsHook.activeFlags}
        activeCircles={settingsHook.activeCircles}
        findFlag={settingsHook.findFlag}
        findCircle={settingsHook.findCircle}
        settings={settingsHook.settings}
      />
    );
  }

  // default: gallery
  return (
    <WrongNoteGallery
      theme={theme}
      playSfx={playSfx}
      showMsg={showMsg}
      onBack={exitToHome}
      onOpenSettings={goSettings}
      onOpenArchive={goArchive}
      onOpenDetail={goDetail}
      activeNotes={notesHook.activeNotes}
      inactiveNotes={notesHook.inactiveNotes}
      addNoteFromFile={notesHook.addNoteFromFile}
      bulkUpdate={notesHook.bulkUpdate}
      findFlag={settingsHook.findFlag}
      findCircle={settingsHook.findCircle}
      settings={settingsHook.settings}
    />
  );
}

// ===== Variant 1: 외부에서 settings hook을 주입받음 (권장 경로) =====
// App.jsx가 useWrongNoteSettings를 한 번만 호출하고 결과를
// ctx.wrongNoteSettingsHook으로 내려줄 때 사용.
// notes hook만 컨테이너가 호출.
function WrongNoteScreenWithExternalSettings(props) {
  const notesHook = useWrongNotes(props.user);
  return (
    <WrongNoteRouter
      theme={props.theme}
      playSfx={props.playSfx}
      showMsg={props.showMsg}
      setScreen={props.setScreen}
      notesHook={notesHook}
      settingsHook={props.wrongNoteSettingsHook}
    />
  );
}

// ===== Variant 2: 컨테이너가 두 hook을 직접 호출 (fallback) =====
// ctx에 wrongNoteSettingsHook이 없을 때 사용. 단독 사용 / 마이그레이션 호환.
function WrongNoteScreenWithLocalHooks(props) {
  const notesHook = useWrongNotes(props.user);
  const settingsHook = useWrongNoteSettings(props.user);
  return (
    <WrongNoteRouter
      theme={props.theme}
      playSfx={props.playSfx}
      showMsg={props.showMsg}
      setScreen={props.setScreen}
      notesHook={notesHook}
      settingsHook={settingsHook}
    />
  );
}

// 하위 호환용 export — 기존 import 경로 유지
export function WrongNoteScreenInner(props) {
  return <WrongNoteScreenWithLocalHooks {...props} />;
}

// App.jsx 라우터에서 사용. ctx에 wrongNoteSettingsHook이 있으면
// 외부 주입 경로로, 없으면 자체 hook 호출 경로로 분기.
// 분기는 hook 호출 전에 일어나므로 Rules of Hooks 위반 없음.
export function renderWrongNoteScreen(ctx) {
  if (ctx && ctx.wrongNoteSettingsHook) {
    return <WrongNoteScreenWithExternalSettings {...ctx} />;
  }
  return <WrongNoteScreenWithLocalHooks {...ctx} />;
}
