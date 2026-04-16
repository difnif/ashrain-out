// ============================================================
// ashrain.out — useWrongNoteSettings
// ============================================================
// 학생별 라벨 사전 설정 (깃발/동그라미 각 최대 5개 활성)
// Firestore sync via 기존 useFirestoreSync 패턴 (per-user 필드명)

import { useCallback } from "react";
import { useFirestoreSync } from "./useFirestoreSync";
import { useState } from "react";

const MAX_ACTIVE = 5;
const MAX_LABEL_LEN = 3;  // 라벨 텍스트 최대 3음절
const MAX_MEMO_LEN = 20;  // 설명 메모 최대 20자

// 기본 깃발 5개 (시험 범위 분류용)
const DEFAULT_FLAGS = [
  { id: "f-default-1", label: "11M", memo: "1학년 1학기 중간고사", color: "#F4B9B2", active: true },
  { id: "f-default-2", label: "11F", memo: "1학년 1학기 기말고사", color: "#A8D5BA", active: true },
  { id: "f-default-3", label: "12M", memo: "1학년 2학기 중간고사", color: "#B5D5E8", active: true },
  { id: "f-default-4", label: "12F", memo: "1학년 2학기 기말고사", color: "#C3B1E1", active: true },
  { id: "f-default-5", label: "21M", memo: "2학년 1학기 중간고사", color: "#F6E3BA", active: true },
];

// 기본 동그라미 5개 (오답 유형 분류용)
const DEFAULT_CIRCLES = [
  { id: "c-default-1", label: "계산", memo: "계산 실수", color: "#E8A598", active: true },
  { id: "c-default-2", label: "개념", memo: "개념 부족", color: "#A8D5BA", active: true },
  { id: "c-default-3", label: "유형", memo: "모르는 유형", color: "#B5D5E8", active: true },
  { id: "c-default-4", label: "조건", memo: "문제 조건 놓침", color: "#C3B1E1", active: true },
  { id: "c-default-5", label: "기타", memo: "기타 원인", color: "#F6E3BA", active: true },
];

const DEFAULT_SETTINGS = {
  flags: DEFAULT_FLAGS,
  circles: DEFAULT_CIRCLES,
  longPressMode: "slide",      // "slide" | "tap"
  autoSaveToDevice: false,     // 사진 촬영 시 기기 다운로드 트리거 (기본 OFF — Park 요청)
};

// 외부에서 import 가능하게 export
export const WRONG_NOTE_LIMITS = {
  MAX_ACTIVE,
  MAX_LABEL_LEN,
  MAX_MEMO_LEN,
};

export function useWrongNoteSettings(user) {
  const userId = user?.id || "anon";
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Firestore sync — per-user 필드명으로 분리
  // (다른 사용자 설정과 충돌 안 나게, 기존 useFirestoreSync 패턴 그대로 사용)
  useFirestoreSync(
    "data",
    `wrongNoteSettings_${userId}`,
    settings,
    setSettings,
    DEFAULT_SETTINGS
  );

  // ---- Selectors ----
  const flags = settings?.flags || [];
  const circles = settings?.circles || [];
  const activeFlags = flags.filter((f) => f.active).slice(0, MAX_ACTIVE);
  const activeCircles = circles.filter((c) => c.active).slice(0, MAX_ACTIVE);
  const inactiveFlags = flags.filter((f) => !f.active);
  const inactiveCircles = circles.filter((c) => !c.active);

  // ---- Mutators ----
  const updateFlag = useCallback((id, patch) => {
    setSettings((s) => ({
      ...s,
      flags: (s.flags || []).map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              ...(patch.label !== undefined
                ? { label: String(patch.label).slice(0, MAX_LABEL_LEN) }
                : {}),
              ...(patch.memo !== undefined
                ? { memo: String(patch.memo).slice(0, MAX_MEMO_LEN) }
                : {}),
            }
          : f
      ),
    }));
  }, []);

  const updateCircle = useCallback((id, patch) => {
    setSettings((s) => ({
      ...s,
      circles: (s.circles || []).map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              ...(patch.label !== undefined
                ? { label: String(patch.label).slice(0, MAX_LABEL_LEN) }
                : {}),
              ...(patch.memo !== undefined
                ? { memo: String(patch.memo).slice(0, MAX_MEMO_LEN) }
                : {}),
            }
          : c
      ),
    }));
  }, []);

  const addFlag = useCallback(() => {
    setSettings((s) => ({
      ...s,
      flags: [
        ...(s.flags || []),
        {
          id: `f-${Date.now()}`,
          label: "신규",
          memo: "",
          color: "#F4B9B2",
          active: false,
        },
      ],
    }));
  }, []);

  const addCircle = useCallback(() => {
    setSettings((s) => ({
      ...s,
      circles: [
        ...(s.circles || []),
        {
          id: `c-${Date.now()}`,
          label: "신규",
          memo: "",
          color: "#A8D5BA",
          active: false,
        },
      ],
    }));
  }, []);

  const removeFlag = useCallback((id) => {
    setSettings((s) => ({
      ...s,
      flags: (s.flags || []).filter((f) => f.id !== id),
    }));
  }, []);

  const removeCircle = useCallback((id) => {
    setSettings((s) => ({
      ...s,
      circles: (s.circles || []).filter((c) => c.id !== id),
    }));
  }, []);

  // 활성/비활성 토글 (활성화 시 5개 초과 방지)
  const toggleFlagActive = useCallback((id) => {
    setSettings((s) => {
      const list = s.flags || [];
      const target = list.find((f) => f.id === id);
      if (!target) return s;
      // 비활성 → 활성: 활성 카운트 5개 초과 금지
      if (!target.active) {
        const activeCount = list.filter((f) => f.active).length;
        if (activeCount >= MAX_ACTIVE) {
          return s; // 변경 없음 (호출부에서 토스트로 알릴 것)
        }
      }
      return {
        ...s,
        flags: list.map((f) =>
          f.id === id ? { ...f, active: !f.active } : f
        ),
      };
    });
  }, []);

  const toggleCircleActive = useCallback((id) => {
    setSettings((s) => {
      const list = s.circles || [];
      const target = list.find((c) => c.id === id);
      if (!target) return s;
      if (!target.active) {
        const activeCount = list.filter((c) => c.active).length;
        if (activeCount >= MAX_ACTIVE) {
          return s;
        }
      }
      return {
        ...s,
        circles: list.map((c) =>
          c.id === id ? { ...c, active: !c.active } : c
        ),
      };
    });
  }, []);

  const setLongPressMode = useCallback((mode) => {
    if (mode !== "slide" && mode !== "tap") return;
    setSettings((s) => ({ ...s, longPressMode: mode }));
  }, []);

  const setAutoSaveToDevice = useCallback((v) => {
    setSettings((s) => ({ ...s, autoSaveToDevice: !!v }));
  }, []);

  // 라벨 ID로 라벨 조회 (다른 화면에서 사용)
  const findFlag = useCallback(
    (id) => (settings?.flags || []).find((f) => f.id === id) || null,
    [settings]
  );
  const findCircle = useCallback(
    (id) => (settings?.circles || []).find((c) => c.id === id) || null,
    [settings]
  );

  return {
    settings,
    activeFlags,
    activeCircles,
    inactiveFlags,
    inactiveCircles,
    MAX_ACTIVE,
    MAX_LABEL_LEN,
    MAX_MEMO_LEN,
    updateFlag,
    updateCircle,
    addFlag,
    addCircle,
    removeFlag,
    removeCircle,
    toggleFlagActive,
    toggleCircleActive,
    setLongPressMode,
    setAutoSaveToDevice,
    findFlag,
    findCircle,
  };
}
