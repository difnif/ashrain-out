// ============================================================
// ashrain.out — WrongNoteScreen (container)
// ============================================================
// 오답노트 컨테이너. 훅(useWrongNotes, useWrongNoteSettings)을 한 번만 호출하고
// 내부 sub-view (gallery / detail / settings / archive)를 자체 라우팅한다.
//
// App.jsx는 이 파일의 renderWrongNoteScreen(ctx)만 import하면 됨.
// 다른 sub-view 파일들은 App.jsx에 import할 필요 없음.

import { useState } from "react";
import { useWrongNotes } from "../hooks/useWrongNotes";
import { useWrongNoteSettings } from "../hooks/useWrongNoteSettings";
import WrongNoteGallery from "./WrongNoteGallery";
import WrongNoteDetail from "./WrongNoteDetail";
import WrongNoteSettings from "./WrongNoteSettings";
import WrongNoteArchive from "./WrongNoteArchive";

export function WrongNoteScreenInner(props) {
  const { theme, playSfx, showMsg, setScreen, user } = props;

  // 두 훅을 한 번만 호출 (state 일관성 유지)
  const notesHook = useWrongNotes(user);
  const settingsHook = useWrongNoteSettings(user);

  // 내부 라우팅
  const [view, setView] = useState("gallery"); // "gallery" | "detail" | "settings" | "archive"
  const [detailNoteId, setDetailNoteId] = useState(null);

  const goGallery = () => setView("gallery");
  const goDetail = (noteId) => {
    setDetailNoteId(noteId);
    setView("detail");
  };
  const goSettings = () => setView("settings");
  const goArchive = () => setView("archive");

  // 메인 메뉴로 복귀
  const exitToHome = () => {
    setScreen?.("student-home");
  };

  // 로딩 표시
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

// App.jsx 라우터에서 사용할 render 함수 (기존 renderXxxScreen 컨벤션 일치)
export function renderWrongNoteScreen(ctx) {
  return <WrongNoteScreenInner {...ctx} />;
}
