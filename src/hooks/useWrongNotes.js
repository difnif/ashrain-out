// ============================================================
// ashrain.out — useWrongNotes
// ============================================================
// 오답노트 CRUD 훅. IndexedDB(wrongNoteDB)에 영속화.
// 사진 파이프라인은 ProblemScreen.jsx와 동일 (max 1024px, JPEG 0.85).

import { useState, useEffect, useCallback } from "react";
import {
  dbPutNote,
  dbGetAllNotes,
  dbDeleteNote,
  dbBulkUpdate,
} from "../lib/wrongNoteDB";

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

  // 초기 로드: IndexedDB → state
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
        console.error("[useWrongNotes] load error:", e);
        if (!alive) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  // 새 노트 추가 (파일 업로드 / 카메라 촬영)
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
          rangeLabelId: null,    // 깃발(시험 범위) ID
          typeLabelId: null,     // 동그라미(오답 유형) ID
          annotations: [],       // SVG path 객체 배열 [{tool, color, width, d}]
          annotationsVisible: true, // 아래 스와이프로 토글
          studyCount: 0,         // 카운트/디스카운트 누적
          active: true,          // 활성(학습큐) vs 아카이브
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await dbPutNote(note);
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
  const updateNote = useCallback(async (id, patch) => {
    let updated = null;
    setNotes((prev) => {
      const next = prev.map((n) => {
        if (n.id !== id) return n;
        updated = { ...n, ...patch, updatedAt: Date.now() };
        return updated;
      });
      return next;
    });
    if (updated) {
      try {
        await dbPutNote(updated);
      } catch (e) {
        console.error("[useWrongNotes] updateNote write:", e);
      }
    }
  }, []);

  // 노트 삭제
  const deleteNote = useCallback(async (id) => {
    try {
      await dbDeleteNote(id);
    } catch (e) {
      console.error("[useWrongNotes] deleteNote:", e);
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 여러 노트 일괄 patch (분류 동기화용)
  const bulkUpdate = useCallback(async (ids, patch) => {
    if (!ids || ids.length === 0) return;
    try {
      await dbBulkUpdate(ids, patch);
    } catch (e) {
      console.error("[useWrongNotes] bulkUpdate:", e);
    }
    setNotes((prev) =>
      prev.map((n) =>
        ids.includes(n.id)
          ? { ...n, ...patch, updatedAt: Date.now() }
          : n
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
