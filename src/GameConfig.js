// GameConfig.js — ashrain.out 게임화 마스터 설정
// 관리자가 on/off 및 수치를 조정할 수 있는 설정 파일
// XP 철학: 속도·횟수·출석 강요 X → 학습의 질(복습 등)에 보상

export const GAME_DEFAULTS = {

  // ── 기능 토글 (on/off) ──
  features: {
    xpSystem: true,           // XP & 레벨 시스템
    ranking: true,            // 순위표
    dailyChallenge: true,     // 오늘의 한 문제
    speedQuiz: true,          // 스피드 퀴즈
    timeQuiz: true,           // 타임 퀴즈 (XP 폭탄)
    proofFillBlank: true,     // 증명 빈칸 채우기
    oxQuiz: true,             // OX 퀴즈
    angleQuiz: true,          // 각도 추정 퀴즈
    constructChallenge: true, // 작도 챌린지
    reviewQueue: true,        // 복습 큐 (오답 노트)
    aiHint: true,             // AI 힌트 (모든 퀴즈 공통)
    badges: true,             // 업적 / 뱃지
    titles: true,             // 칭호 시스템
    profileCard: true,        // 학생 프로필 카드
    liveFeed: false,          // 수업 라이브 피드 (관리자 전용 대시보드)
    parentBonusXP: true,      // 학부모 소통 보너스 XP
    classChallenge: false,    // 반 대항전 (월간)
    hallOfFame: false,        // 명예의 전당 (순위표 내 역대탭)
    liveRanking: false,       // 실시간 라이브 순위 (TV모드)
    growthCard: true,         // 주간 리포트 카드 (성장 그래프 간소화)
    battle: false,            // 1:1 대결 (비동기 도전장)
    cheer: false,             // 응원 / 좋아요
    teamSystem: false,        // 팀 / 모둠
    pointShop: false,         // 포인트 상점
    gacha: false,             // 랜덤 보상 뽑기
    missions: false,          // 일일/주간 미션 (Daily Challenge에 통합)
    seasonChapter: false,     // 시즌/챕터 (단원 진도율로 축소)
  },

  // ── XP 수치 설정 ──
  xp: {
    // 퀴즈
    quizCorrect: 10,            // 퀴즈 정답 1문제
    quizIncorrect: 2,           // 퀴즈 오답이어도 시도 보상 (약간)
    speedQuizBonus: 5,          // 스피드 퀴즈 시간 보너스 (남은 시간 비례)
    dailyChallengeCorrect: 20,  // 오늘의 한 문제 정답
    dailyChallengeAttempt: 5,   // 오늘의 한 문제 시도만 해도

    // 타임 퀴즈
    timeQuizMultiplierMin: 2,   // 타임 퀴즈 최소 배수
    timeQuizMultiplierMax: 5,   // 타임 퀴즈 최대 배수

    // 복습 (핵심!)
    reviewAttempt: 15,          // 복습 1회 시도
    reviewCorrect: 25,          // 복습 문제 정답
    reviewStreak3: 30,          // 같은 문제 3회 연속 정답 보너스

    // 작도
    constructComplete: 15,      // 작도 완성
    proofComplete: 20,          // 증명 완성

    // 소통 보너스
    parentBonusMin: 50,         // 학부모 소통 보너스 최소
    parentBonusMax: 200,        // 학부모 소통 보너스 최대
    specialBonus: 100,          // 선생님 재량 특별 XP

    // AI 힌트 페널티
    hintPenalty1: -3,           // 1단계 힌트 사용
    hintPenalty2: -5,           // 2단계 힌트 사용
    hintPenaltyAnswer: -8,      // 정답 공개 사용
  },

  // ── 레벨 시스템 ──
  levels: {
    formula: "quadratic",       // "linear" | "quadratic"
    baseXP: 100,                // 레벨 1→2 필요 XP
    growthRate: 1.3,            // 레벨당 필요 XP 증가율
    maxLevel: 50,
  },

  // ── 순위표 설정 ──
  ranking: {
    periods: ["daily", "weekly", "monthly"],
    categories: [
      { id: "quiz_accuracy", label: "퀴즈 정답률왕", icon: "🎯", description: "퀴즈 정답률 기준" },
      { id: "review_count", label: "복습왕", icon: "📖", description: "복습 횟수 기준" },
      { id: "xp_total", label: "XP 총합", icon: "⭐", description: "획득 XP 총합 기준" },
    ],
    topHighlight: 3,             // 상위 N명 카드형 강조
  },

  // ── 퀴즈 설정 ──
  quiz: {
    speedQuizCount: 10,          // 스피드 퀴즈 문제 수
    speedQuizTimeLimit: 120,     // 초
    dailyChallengeTime: "08:00", // 매일 출제 시간
    reviewIntervalDays: [1, 3, 7, 14, 30], // 에빙하우스 복습 간격
    oxSwipeEnabled: true,        // OX 스와이프 모드
  },

  // ── 타임 퀴즈 (관리자 발동) ──
  timeQuiz: {
    defaultDurationMinutes: 10,
    defaultMultiplier: 3,
    maxMultiplier: 5,
  },
};

// 레벨 필요 XP 계산
export function xpForLevel(level, config = GAME_DEFAULTS.levels) {
  if (level <= 1) return 0;
  if (config.formula === "linear") return config.baseXP * (level - 1);
  // quadratic
  return Math.floor(config.baseXP * Math.pow(level - 1, config.growthRate));
}

// 현재 레벨 계산
export function getLevelFromXP(totalXP, config = GAME_DEFAULTS.levels) {
  let level = 1;
  while (level < config.maxLevel && totalXP >= xpForLevel(level + 1, config)) {
    level++;
  }
  return level;
}

// 다음 레벨까지 남은 XP
export function xpToNextLevel(totalXP, config = GAME_DEFAULTS.levels) {
  const level = getLevelFromXP(totalXP, config);
  if (level >= config.maxLevel) return 0;
  return xpForLevel(level + 1, config) - totalXP;
}

// 레벨 진행률 (0~1)
export function levelProgress(totalXP, config = GAME_DEFAULTS.levels) {
  const level = getLevelFromXP(totalXP, config);
  if (level >= config.maxLevel) return 1;
  const currentLevelXP = xpForLevel(level, config);
  const nextLevelXP = xpForLevel(level + 1, config);
  return (totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
}

// 에빙하우스 복습 간격에 따른 다음 복습일 계산
export function getNextReviewDate(lastReviewDate, reviewCount, intervals = GAME_DEFAULTS.quiz.reviewIntervalDays) {
  const idx = Math.min(reviewCount, intervals.length - 1);
  const days = intervals[idx];
  const next = new Date(lastReviewDate);
  next.setDate(next.getDate() + days);
  return next;
}

// 오늘 복습해야 할 문제 필터
export function getDueReviews(reviewItems, now = new Date()) {
  return reviewItems.filter(item => {
    if (!item.lastReviewDate) return true; // 한 번도 복습 안 한 것
    const nextDate = getNextReviewDate(item.lastReviewDate, item.reviewCount || 0);
    return now >= nextDate;
  });
}
