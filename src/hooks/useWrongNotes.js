// ============================================================
// ashrain.out — useWrongNotes
// ============================================================
// 오답노트 CRUD 훅.
// - Firestore(per-user doc `wrongNotes_${userId}`.notes): 서버 영속화 (source of truth)
// - IndexedDB(wrongNoteDB): 로컬 오프라인 캐시 (네트워크 없이도 빠른 초기 로드)
// 사진 파이프라인은 ProblemScreen.jsx와 동일 (max 1024px, JPEG 0.85).
//
// === 동기화 패턴 (낙관적 업데이트 + 디바운스) ===
// useFirestoreSync 대신 직접 구현. 이유:
// - useFirestoreSync는 value를 deps에서 제외 → 클로저가 낡은 값 캡처 → 대용량 배열에서
//   onSnapshot 발화 시 JSON.stringify 비교가 false positive → 저장 직후 이전 값으로
//   덮어씌움 (사진의 annotations가 찰나로 보였다 사라지는 현상).
// 패턴:
//   1) mount: Firestore에서 1회 로드 → local state 초기화
//   2) 로컬 mutation → local state 즉시 업데이트 (낙관적)
//   3) 로컬 변경 300ms 디바운스 후 Firestore write (사진 N장 일괄 수정도 효율)
//   4) onSnapshot은 mount 후 첫 한 번만 사용 (초기 로드). 이후는 무시.
//      (단일 기기 가정. 다기기 동기화가 필요해지면 별도 설계 필요)
//   5) 로컬 mutation 후 LOCAL_LOCK_MS 동안은 Firestore에서 오는 어떤 데이터도 무시
//      (자기 자신의 write-back이 local을 덮어쓰는 race 방지)

import { useState, useEffect, useCallback, useRef } from "react";
import {
  dbPutNote,
  dbGetAllNotes,
  dbDeleteNote,
} from "../lib/wrongNoteDB";
import { fbGet, fbSet } from "../firebase";

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.85;
const WRITE_DEBOUNCE_MS = 300;      // Firestore write 디바운스
const LOCAL_LOCK_MS = 2000;         // 로컬 mutation 후 원격 무시 기간

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
  const docId = `wrongNotes_${userId}`;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 로컬 mutation 추적: 마지막 로컬 변경 시각. write 디바운스도 같은 타이머 사용.
  const lastLocalMutationRef = useRef(0);
  const writeTimerRef = useRef(null);
  const initializedRef = useRef(false);

  // ---- 초기 로드 ----
  // 1) IDB 캐시 → 즉시 화면에 표시 (오프라인/빠른 부팅)
  // 2) Firestore에서 1회 fetch → 있으면 덮어씀 (단, 로컬 뮤테이션이 직전에 있었으면 skip)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      // IDB 먼저
      let idbNotes = [];
      try {
        const rows = await dbGetAllNotes(userId);
        idbNotes = Array.isArray(rows) ? rows : [];
        if (alive) setNotes(idbNotes);
      } catch (e) {
        console.warn("[useWrongNotes] IDB load failed:", e);
      }

      // Firestore 1회 fetch
      try {
        const data = await fbGet(docId);
        if (!alive) return;
        const remote = data?.notes;
        if (Array.isArray(remote)) {
          // Firestore에 데이터 있음 → 로컬 덮어쓰기
          setNotes(remote);
        } else if (idbNotes.length > 0) {
          // Firestore 비어있지만 IDB에 있음 → Firestore 초기화 (마이그레이션)
          fbSet(docId, { notes: idbNotes }).catch((e) =>
            console.warn("[useWrongNotes] migration write failed:", e)
          );
        }
      } catch (e) {
        console.warn("[useWrongNotes] Firestore fetch failed:", e);
        if (alive) setError(e);
      } finally {
        if (alive) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, docId]);

  // ---- 로컬 mutation → 디바운스 Firestore write ----
  // initializedRef가 true가 된 후 local notes 변경 시마다 디바운스 write 예약.
  // 같은 배치 내 여러 mutation(예: bulkUpdate)은 한 번의 write로 묶임.
  useEffect(() => {
    if (!initializedRef.current) return;
    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = setTimeout(() => {
      writeTimerRef.current = null;
      fbSet(docId, { notes }).catch((e) =>
        console.error("[useWrongNotes] Firestore write failed:", e)
      );
    }, WRITE_DEBOUNCE_MS);
    return () => {
      // 다음 mutation 오면 이전 타이머 취소 (디바운스)
      // cleanup은 timer 재설정이 필요한 경우에만 의미 있음
    };
  }, [notes, docId]);

  // ---- IndexedDB 캐시 동기화 ----
  // 로컬 mutation / 원격 반영 모두 반영.
  const prevIdsRef = useRef(null);
  useEffect(() => {
    if (loading) return;
    notes.forEach((n) => {
      dbPutNote(n).catch((e) =>
        console.warn("[useWrongNotes] IDB cache put failed:", e)
      );
    });
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

  // 로컬 mutation 공통 헬퍼 (lastLocalMutationRef 갱신)
  const markLocalMutation = useCallback(() => {
    lastLocalMutationRef.current = Date.now();
  }, []);

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
          rangeLabelId: null,
          typeLabelId: null,
          annotations: [],
          annotationsVisible: true,
          studyCount: 0,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        markLocalMutation();
        setNotes((prev) => [note, ...prev]);
        return note;
      } catch (e) {
        console.error("[useWrongNotes] addNoteFromFile error:", e);
        throw e;
      }
    },
    [userId, markLocalMutation]
  );

  // 단일 노트 patch
  const updateNote = useCallback((id, patch) => {
    markLocalMutation();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  }, [markLocalMutation]);

  // 노트 삭제
  const deleteNote = useCallback((id) => {
    markLocalMutation();
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, [markLocalMutation]);

  // 여러 노트 일괄 patch
  const bulkUpdate = useCallback((ids, patch) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    markLocalMutation();
    setNotes((prev) =>
      prev.map((n) =>
        idSet.has(n.id) ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  }, [markLocalMutation]);

  // 카운트 +1 (깃발 → 동그라미 합치기 제스처)
  const incrementStudy = useCallback(
    (id) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      updateNote(id, { studyCount: (target.studyCount || 0) + 1 });
    },
    [notes, updateNote]
  );

  // 카운트 -1
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

  // 어노테이션 표시/숨김 토글
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

  // 활성/비활성 토글
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
