// XPSystem.js — XP 엔진, 뱃지/업적 시스템
// Firestore 연동: fbGet/fbSet 사용

import { fbGet, fbSet } from "./firebase";
import { GAME_DEFAULTS, getLevelFromXP, xpForLevel } from "./GameConfig";

// ── 뱃지 정의 ──
export const BADGES = [
  // 학습
  { id: "first_quiz", label: "첫 퀴즈", icon: "🌱", desc: "퀴즈를 처음 풀었어요", condition: (s) => s.quizTotal >= 1 },
  { id: "quiz_10", label: "퀴즈 10문제", icon: "📝", desc: "퀴즈 10문제 도전", condition: (s) => s.quizTotal >= 10 },
  { id: "quiz_50", label: "퀴즈 50문제", icon: "📚", desc: "퀴즈 50문제 도전", condition: (s) => s.quizTotal >= 50 },
  { id: "quiz_100", label: "백문백답", icon: "🏅", desc: "퀴즈 100문제 도전", condition: (s) => s.quizTotal >= 100 },
  { id: "accuracy_80", label: "정답률 80%", icon: "🎯", desc: "퀴즈 정답률 80% 이상 (최소 10문제)", condition: (s) => s.quizTotal >= 10 && s.quizCorrectRate >= 0.8 },
  { id: "accuracy_95", label: "거의 완벽", icon: "💎", desc: "퀴즈 정답률 95% 이상 (최소 20문제)", condition: (s) => s.quizTotal >= 20 && s.quizCorrectRate >= 0.95 },
  { id: "streak_5", label: "5연속 정답", icon: "🔥", desc: "연속 5문제 정답", condition: (s) => s.maxStreak >= 5 },
  { id: "streak_10", label: "10연속 정답", icon: "🔥🔥", desc: "연속 10문제 정답", condition: (s) => s.maxStreak >= 10 },

  // 복습
  { id: "first_review", label: "첫 복습", icon: "🔄", desc: "복습을 처음 했어요", condition: (s) => s.reviewCount >= 1 },
  { id: "review_10", label: "복습 10회", icon: "📖", desc: "복습 10회 달성", condition: (s) => s.reviewCount >= 10 },
  { id: "review_master", label: "복습 마스터", icon: "🧠", desc: "같은 문제 3회 연속 정답", condition: (s) => s.reviewMastered >= 1 },

  // 작도
  { id: "first_construct", label: "첫 작도", icon: "✏️", desc: "작도를 처음 완성했어요", condition: (s) => s.constructCount >= 1 },
  { id: "circumcenter", label: "외심 마스터", icon: "⊙", desc: "외심 작도 5회 완성", condition: (s) => s.circumcenterCount >= 5 },
  { id: "incenter", label: "내심 마스터", icon: "⊚", desc: "내심 작도 5회 완성", condition: (s) => s.incenterCount >= 5 },

  // 증명
  { id: "first_proof", label: "첫 증명", icon: "📐", desc: "합동 증명을 처음 완성했어요", condition: (s) => s.proofCount >= 1 },
  { id: "proof_10", label: "증명 10회", icon: "🔺", desc: "합동 증명 10회 완성", condition: (s) => s.proofCount >= 10 },

  // 레벨
  { id: "level_5", label: "Lv.5 도달", icon: "⭐", desc: "레벨 5 달성", condition: (s) => s.level >= 5 },
  { id: "level_10", label: "Lv.10 도달", icon: "🌟", desc: "레벨 10 달성", condition: (s) => s.level >= 10 },
  { id: "level_20", label: "Lv.20 도달", icon: "✨", desc: "레벨 20 달성", condition: (s) => s.level >= 20 },

  // 소통
  { id: "communicator", label: "소통왕", icon: "💌", desc: "학부모 소통 보너스 XP 3회 획득", condition: (s) => s.parentBonusCount >= 3 },
  { id: "special_award", label: "특별상", icon: "🏆", desc: "선생님 특별 XP를 받았어요", condition: (s) => s.specialBonusCount >= 1 },
];

// ── 칭호 정의 ──
export const TITLES = [
  { id: "newcomer", label: "새내기", minLevel: 1, rarity: "common" },
  { id: "learner", label: "학습자", minLevel: 3, rarity: "common" },
  { id: "diligent", label: "성실한 학생", minLevel: 5, rarity: "common" },
  { id: "scholar", label: "수학도", minLevel: 10, rarity: "uncommon" },
  { id: "geometer", label: "기하학자", minLevel: 15, rarity: "uncommon" },
  { id: "proof_master", label: "증명 마스터", minLevel: 20, rarity: "rare", requireBadge: "proof_10" },
  { id: "construct_master", label: "작도의 신", minLevel: 20, rarity: "rare", requireBadge: "circumcenter" },
  { id: "review_sage", label: "복습의 현자", minLevel: 15, rarity: "rare", requireBadge: "review_master" },
  { id: "communicator_title", label: "소통 달인", minLevel: 10, rarity: "rare", requireBadge: "communicator" },
  { id: "legend", label: "전설", minLevel: 30, rarity: "epic" },
];

export const RARITY_COLORS = {
  common: "#94A3B8",
  uncommon: "#34D399",
  rare: "#8B5CF6",
  epic: "#F59E0B",
};

// ── Firestore 키 ──
const XP_DOC = "xp-data";       // 전체 유저 XP 데이터
const QUIZ_DOC = "quiz-data";   // 퀴즈 문제 풀이 기록
const REVIEW_DOC = "review-data"; // 복습 큐 데이터
const TIME_QUIZ_DOC = "time-quiz"; // 현재 활성 타임 퀴즈

// ── 유저 XP 데이터 초기값 ──
export function createDefaultXPData(userId) {
  return {
    userId,
    totalXP: 0,
    level: 1,
    badges: [],
    selectedTitle: "newcomer",
    stats: {
      quizTotal: 0,
      quizCorrect: 0,
      quizCorrectRate: 0,
      maxStreak: 0,
      currentStreak: 0,
      reviewCount: 0,
      reviewMastered: 0,
      constructCount: 0,
      circumcenterCount: 0,
      incenterCount: 0,
      proofCount: 0,
      parentBonusCount: 0,
      specialBonusCount: 0,
      level: 1,
    },
    xpLog: [],         // 최근 XP 변동 로그 [{amount, reason, timestamp}]
    updatedAt: Date.now(),
  };
}

// ── XP 부여 ──
export async function grantXP(userId, amount, reason, allXPData) {
  const data = allXPData?.[userId] || createDefaultXPData(userId);
  const oldLevel = getLevelFromXP(data.totalXP);
  
  data.totalXP = Math.max(0, data.totalXP + amount);
  const newLevel = getLevelFromXP(data.totalXP);
  data.level = newLevel;
  data.stats.level = newLevel;

  // XP 로그 (최근 50개만 유지)
  data.xpLog = [
    { amount, reason, timestamp: Date.now() },
    ...(data.xpLog || []),
  ].slice(0, 50);

  data.updatedAt = Date.now();

  // 레벨업 여부
  const leveledUp = newLevel > oldLevel;

  return { data, leveledUp, oldLevel, newLevel };
}

// ── 뱃지 체크 ──
export function checkBadges(xpData) {
  const stats = xpData.stats || {};
  const earned = xpData.badges || [];
  const newBadges = [];

  BADGES.forEach(badge => {
    if (!earned.includes(badge.id) && badge.condition(stats)) {
      newBadges.push(badge.id);
    }
  });

  return newBadges;
}

// ── 해금된 칭호 목록 ──
export function getUnlockedTitles(xpData) {
  const level = xpData.level || 1;
  const badges = xpData.badges || [];

  return TITLES.filter(t => {
    if (level < t.minLevel) return false;
    if (t.requireBadge && !badges.includes(t.requireBadge)) return false;
    return true;
  });
}

// ── 순위 계산 ──
export function calculateRankings(allXPData, category = "xp_total", period = "weekly") {
  const now = Date.now();
  const periodMs = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - (periodMs[period] || periodMs.weekly);

  const entries = Object.values(allXPData || {}).map(d => {
    const periodXP = (d.xpLog || [])
      .filter(log => log.timestamp >= cutoff)
      .reduce((sum, log) => sum + log.amount, 0);

    const stats = d.stats || {};
    let value = 0;

    switch (category) {
      case "xp_total":
        value = periodXP;
        break;
      case "quiz_accuracy":
        value = stats.quizCorrectRate || 0;
        break;
      case "review_count": {
        // 해당 기간 내 복습 횟수는 xpLog에서 복습 관련 로그 카운트
        value = (d.xpLog || [])
          .filter(log => log.timestamp >= cutoff && (log.reason || "").includes("복습"))
          .length;
        break;
      }
      default:
        value = periodXP;
    }

    return {
      userId: d.userId,
      totalXP: d.totalXP,
      level: d.level || 1,
      badges: d.badges || [],
      selectedTitle: d.selectedTitle || "newcomer",
      value,
      periodXP,
    };
  });

  // 정렬 (높은 순)
  entries.sort((a, b) => b.value - a.value);

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

// ── Firestore 읽기/쓰기 헬퍼 ──
export async function loadAllXPData() {
  const data = await fbGet(XP_DOC);
  return data || {};
}

export async function saveAllXPData(allData) {
  await fbSet(XP_DOC, allData);
}

export async function saveUserXP(userId, userData, allData) {
  const updated = { ...allData, [userId]: userData };
  await fbSet(XP_DOC, updated);
  return updated;
}

// ── 타임 퀴즈 (관리자 발동) ──
export async function createTimeQuiz(adminId, quizData) {
  const tq = {
    id: `tq-${Date.now()}`,
    createdBy: adminId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (quizData.durationMinutes || 10) * 60 * 1000,
    multiplier: quizData.multiplier || 3,
    problems: quizData.problems || [],
    active: true,
  };
  await fbSet(TIME_QUIZ_DOC, tq);
  return tq;
}

export async function getActiveTimeQuiz() {
  const data = await fbGet(TIME_QUIZ_DOC);
  if (!data || !data.active) return null;
  if (Date.now() > data.expiresAt) {
    // 만료 처리
    await fbSet(TIME_QUIZ_DOC, { ...data, active: false });
    return null;
  }
  return data;
}

// ── 복습 큐 ──
export async function loadReviewQueue(userId) {
  const data = await fbGet(REVIEW_DOC);
  const all = data?.[userId] || [];
  return all;
}

export async function saveReviewItem(userId, item, allReviewData) {
  const userData = allReviewData?.[userId] || [];
  const idx = userData.findIndex(r => r.problemId === item.problemId);
  if (idx >= 0) {
    userData[idx] = { ...userData[idx], ...item, updatedAt: Date.now() };
  } else {
    userData.push({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
  }
  const updated = { ...allReviewData, [userId]: userData };
  await fbSet(REVIEW_DOC, updated);
  return updated;
}

// ── 퀴즈 기록 ──
export async function loadQuizHistory(userId) {
  const data = await fbGet(QUIZ_DOC);
  return data?.[userId] || [];
}

export async function saveQuizResult(userId, result, allQuizData) {
  const userData = allQuizData?.[userId] || [];
  userData.push({ ...result, timestamp: Date.now() });
  // 최근 200개만 유지
  const trimmed = userData.slice(-200);
  const updated = { ...allQuizData, [userId]: trimmed };
  await fbSet(QUIZ_DOC, updated);
  return updated;
}
