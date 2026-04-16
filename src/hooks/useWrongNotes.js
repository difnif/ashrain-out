// ============================================================
// ashrain.out — useWrongNotes
// ============================================================
// 오답노트 CRUD 훅.
// - Firestore(per-user doc `wrongNotes_${userId}`.notes): 서버 영속화 (source of truth)
// - IndexedDB(wrongNoteDB): 로컬 오프라인 캐시 (네트워크 없이도 빠른 초기 로드)
// 사진 파이프라인은 ProblemScreen.jsx와 동일 (max 1024px, JPEG 0.85).

import { useState, useEffect, useCallback, useRef } from "react";
import {
  dbPutNote,
  dbGetAllNotes,
  dbDeleteNote,
} from "../lib/wrongNoteDB";
import { useFirestoreSync } from "./useFirestoreSync";

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.85;

// File → resized base64 dataURL (ProblemScreen.jsx와 동일 로직)
function fileToResizedBase64(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const s = MAX_DIM / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL("image/jpeg", JPEG_QUALITY);
        URL.revokeObjectURL(url);
        resolve({ dataUrl, width: w, height: h });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = url;
  });
}

export function useWrongNotes(user) {
  const userId = user?.id || "anon";
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1단계: 초기 로드 — IndexedDB에서 빠르게 캐시 로드 (오프라인 대비)
  // 2단계: useFirestoreSync가 자동으로 Firestore에서 실제 데이터를 받아와 덮어씀
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    dbGetAllNotes(userId)
      .then((rows) => {
        if (!alive) return;
        setNotes(Array.isArray(rows) ? rows : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error("[useWrongNotes] IndexedDB load error:", e);
        if (!alive) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Firestore sync: per-user 문서 `wrongNotes_${userId}`의 notes 필드에 전체 배열 저장.
  // useFirestoreSync가 mount 시 원격 데이터를 로드해 local state를 덮어씀.
  // local state가 바뀌면 자동으로 Firestore에 write.
  useFirestoreSync(
    `wrongNotes_${userId}`,
    "notes",
    notes,
    setNotes,
    []
  );

  // IndexedDB 오프라인 캐시를 최신 상태로 유지.
  // Firestore에서 새 데이터가 올 때도, 로컬 mutation이 있을 때도 같이 호출된다.
  // (중복 호출이 있어도 dbPutNote는 idempotent해서 문제 없음)
  const prevIdsRef = useRef(null);
  useEffect(() => {
    if (loading) return;
    // 모든 현재 노트를 IDB에 put
    notes.forEach((n) => {
      dbPutNote(n).catch((e) =>
        console.warn("[useWrongNotes] IDB cache put failed:", e)
      );
    });
    // 이전에 있었으나 지금 없는 노트는 IDB에서 삭제
    const currentIds = new Set(notes.map((n) => n.id));
    if (prevIdsRef.current) {
      prevIdsRef.current.forEach((id) => {
        if (!currentIds.has(id)) {
          dbDeleteNote(id).catch((e) =>
            console.warn("[useWrongNotes] IDB cache delete failed:", e)
          );
        }
      });
    }
    prevIdsRef.current = currentIds;
  }, [notes, loading]);

  // 새 노트 추가 (파일 업로드 / 카메라 촬영)
  // state 업데이트만 하면 useFirestoreSync가 Firestore에 자동 동기화하고,
  // 위의 useEffect가 IDB 캐시도 갱신한다.
  const addNoteFromFile = useCallback(
    async (file) => {
      if (!file) return null;
      try {
        const { dataUrl, width, height } = await fileToResizedBase64(file);
        const note = {
          id: `wn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId,
          photoBase64: dataUrl,
          photoW: width,
          photoH: height,
          rangeLabelId: null,
          typeLabelId: null,
          annotations: [],
          annotationsVisible: true,
          studyCount: 0,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setNotes((prev) => [note, ...prev]);
        return note;
      } catch (e) {
        console.error("[useWrongNotes] addNoteFromFile error:", e);
        throw e;
      }
    },
    [userId]
  );

  // 단일 노트 patch
  const updateNote = useCallback((id, patch) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  }, []);

  // 노트 삭제
  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 여러 노트 일괄 patch (분류 동기화용)
  const bulkUpdate = useCallback((ids, patch) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setNotes((prev) =>
      prev.map((n) =>
        idSet.has(n.id) ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  }, []);

  // 카운트 +1 (깃발 → 동그라미 합치기 제스처)
  const incrementStudy = useCallback(
    (id) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      updateNote(id, { studyCount: (target.studyCount || 0) + 1 });
    },
    [notes, updateNote]
  );

  // 카운트 -1 (동그라미 → 깃발 합치기 제스처)
  const decrementStudy = useCallback(
    (id) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      updateNote(id, {
        studyCount: Math.max(0, (target.studyCount || 0) - 1),
      });
    },
    [notes, updateNote]
  );

  // 어노테이션 표시/숨김 토글 (아래 스와이프)
  const toggleAnnotationsVisible = useCallback(
    (id) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      updateNote(id, { annotationsVisible: !target.annotationsVisible });
    },
    [notes, updateNote]
  );

  // 어노테이션 추가/교체 (그리기 확인 시)
  const setAnnotations = useCallback(
    (id, annotations) => {
      updateNote(id, { annotations: Array.isArray(annotations) ? annotations : [] });
    },
    [updateNote]
  );

  // 활성/비활성 토글 (개별 노트를 학습큐에서 제외)
  const toggleActive = useCallback(
    (id) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      updateNote(id, { active: !target.active });
    },
    [notes, updateNote]
  );

  // ---- Selectors ----
  const activeNotes = notes.filter((n) => n.active !== false);
  const inactiveNotes = notes.filter((n) => n.active === false);

  return {
    notes,
    activeNotes,
    inactiveNotes,
    loading,
    error,
    addNoteFromFile,
    updateNote,
    deleteNote,
    bulkUpdate,
    incrementStudy,
    decrementStudy,
    toggleAnnotationsVisible,
    setAnnotations,
    toggleActive,
  };
}
