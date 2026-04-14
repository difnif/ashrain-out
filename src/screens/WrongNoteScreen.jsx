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

import { useState } from "react";
import { useWrongNotes } from "../hooks/useWrongNotes";
import { useWrongNoteSettings } from "../hooks/useWrongNoteSettings";
import WrongNoteGallery from "./WrongNoteGallery";
import WrongNoteDetail from "./WrongNoteDetail";
import WrongNoteSettings from "./WrongNoteSettings";
import WrongNoteArchive from "./WrongNoteArchive";

// ===== Pure router (no hooks called inside) =====
// 두 hook 결과를 모두 props로 받는 순수 라우터.
function WrongNoteRouter({
  theme,
  playSfx,
  showMsg,
  setScreen,
  notesHook,
  settingsHook,
}) {
  const [view, setView] = useState("gallery"); // "gallery" | "detail" | "settings" | "archive"
  const [detailNoteId, setDetailNoteId] = useState(null);

  const goGallery = () => setView("gallery");
  const goDetail = (noteId) => {
    setDetailNoteId(noteId);
    setView("detail");
  };
  const goSettings = () => setView("settings");
  const goArchive = () => setView("archive");

  const exitToHome = () => {
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

  if (view === "settings") {
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

  if (view === "archive") {
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

  if (view === "detail") {
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
