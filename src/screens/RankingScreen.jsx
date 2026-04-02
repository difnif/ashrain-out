// RankingScreen.jsx — 순위표
// 담당: 이 채팅방 전담 파일
// 일간/주간/월간 탭 + 카테고리 필터 (정답률왕, 복습왕, XP총합)

import { useState, useEffect, useMemo } from "react";
import { GAME_DEFAULTS } from "../GameConfig";
import {
  loadAllXPData, calculateRankings, getLevelFromXP,
  BADGES, TITLES, RARITY_COLORS, getUnlockedTitles,
} from "../XPSystem";

const PERIODS = [
  { id: "daily", label: "일간" },
  { id: "weekly", label: "주간" },
  { id: "monthly", label: "월간" },
];

const CATEGORIES = GAME_DEFAULTS.ranking.categories;

// ── 레벨 색상 ──
function levelColor(lv) {
  if (lv >= 20) return "#F59E0B";
  if (lv >= 10) return "#8B5CF6";
  if (lv >= 5) return "#3B82F6";
  return "#94A3B8";
}

// ── 순위 메달 ──
function rankBadge(rank) {
  if (rank === 1) return { emoji: "🥇", bg: "linear-gradient(135deg, #FFD700, #FFA500)" };
  if (rank === 2) return { emoji: "🥈", bg: "linear-gradient(135deg, #C0C0C0, #A0A0A0)" };
  if (rank === 3) return { emoji: "🥉", bg: "linear-gradient(135deg, #CD7F32, #B87333)" };
  return null;
}

// ── 값 포맷 ──
function formatValue(value, category) {
  if (category === "quiz_accuracy") return `${Math.round(value * 100)}%`;
  if (category === "review_count") return `${value}회`;
  return `${value} XP`;
}

// ── 상위 3 카드 ──
function TopThreeCard({ entry, members, theme, category }) {
  const medal = rankBadge(entry.rank);
  const member = (members || []).find(m => m.id === entry.userId);
  const name = member?.name || entry.userId?.slice(0, 6) || "???";
  const title = TITLES.find(t => t.id === entry.selectedTitle);
  const lc = levelColor(entry.level);

  return (
    <div style={{
      flex: entry.rank === 1 ? "1.2" : "1",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: entry.rank === 1 ? "20px 8px 16px" : "12px 8px",
      borderRadius: 16,
      background: theme.card,
      border: `1.5px solid ${entry.rank === 1 ? "#FFD70044" : theme.border}`,
      position: "relative",
      order: entry.rank === 1 ? 0 : entry.rank === 2 ? -1 : 1,
    }}>
      {/* Rank badge */}
      <div style={{
        position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
        width: 28, height: 28, borderRadius: "50%",
        background: medal?.bg || theme.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>{medal?.emoji || entry.rank}</div>

      {/* Avatar placeholder */}
      <div style={{
        width: entry.rank === 1 ? 52 : 42, height: entry.rank === 1 ? 52 : 42,
        borderRadius: "50%", background: `${lc}20`,
        border: `2.5px solid ${lc}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: entry.rank === 1 ? 22 : 18, marginTop: 8, marginBottom: 6,
      }}>
        {name.charAt(0)}
      </div>

      {/* Name */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textAlign: "center" }}>{name}</div>

      {/* Title */}
      {title && (
        <div style={{ fontSize: 10, color: RARITY_COLORS[title.rarity] || "#94A3B8", marginTop: 2 }}>
          {title.label}
        </div>
      )}

      {/* Level */}
      <div style={{ fontSize: 10, color: lc, fontWeight: 700, marginTop: 3 }}>Lv.{entry.level}</div>

      {/* Value */}
      <div style={{
        fontSize: entry.rank === 1 ? 16 : 14, fontWeight: 800,
        color: entry.rank === 1 ? "#FFD700" : theme.text,
        marginTop: 6,
      }}>
        {formatValue(entry.value, category)}
      </div>
    </div>
  );
}

// ── 리스트 행 ──
function RankRow({ entry, members, theme, category }) {
  const member = (members || []).find(m => m.id === entry.userId);
  const name = member?.name || entry.userId?.slice(0, 6) || "???";
  const lc = levelColor(entry.level);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderBottom: `1px solid ${theme.border}`,
    }}>
      {/* Rank number */}
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${theme.text}08`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: theme.textSec, flexShrink: 0,
      }}>{entry.rank}</div>

      {/* Avatar + Name */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `${lc}15`, border: `2px solid ${lc}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: lc, fontWeight: 700, flexShrink: 0,
      }}>{name.charAt(0)}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: theme.textSec }}>Lv.{entry.level}</div>
      </div>

      {/* Value */}
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, flexShrink: 0 }}>
        {formatValue(entry.value, category)}
      </div>
    </div>
  );
}

// ── 내 순위 바 ──
function MyRankBar({ myEntry, theme, category }) {
  if (!myEntry) return null;
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 12,
      background: `${theme.text}06`, border: `1.5px solid ${theme.text}15`,
      display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, color: theme.textSec }}>내 순위</div>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: levelColor(myEntry.level) + "20",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color: levelColor(myEntry.level),
      }}>{myEntry.rank}</div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
        {formatValue(myEntry.value, category)}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──
function RankingScreenInner({ theme, user, members, setScreen, playSfx }) {
  const [period, setPeriod] = useState("weekly");
  const [category, setCategory] = useState("xp_total");
  const [allXP, setAllXP] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firestore에서 XP 데이터 로드
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAllXPData().then(data => {
      if (!cancelled) {
        setAllXP(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // 순위 계산
  const rankings = useMemo(() => {
    if (!allXP) return [];
    return calculateRankings(allXP, category, period);
  }, [allXP, category, period]);

  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const myEntry = user ? rankings.find(r => r.userId === user.id) : null;

  const catInfo = CATEGORIES.find(c => c.id === category);

  return (
    <div style={{
      height: "100vh", maxHeight: "100dvh",
      display: "flex", flexDirection: "column",
      background: theme.bg, fontFamily: "'Noto Serif KR', serif",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        padding: "14px 20px", borderBottom: `1px solid ${theme.border}`,
      }}>
        <button onClick={() => { playSfx("click"); setScreen("menu"); }}
          style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer", fontFamily: "'Noto Serif KR', serif" }}>
          ← 메뉴
        </button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, color: theme.text }}>
          🏆 순위표
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* Period Tabs */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4,
        padding: "10px 16px 0",
      }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => { setPeriod(p.id); playSfx("click"); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "'Noto Serif KR', serif",
              background: period === p.id ? `${theme.text}12` : "transparent",
              color: period === p.id ? theme.text : theme.textSec,
              transition: "all .15s",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 6,
        padding: "10px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => { setCategory(c.id); playSfx("click"); }}
            style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 20,
              border: `1.5px solid ${category === c.id ? theme.text + "30" : theme.border}`,
              background: category === c.id ? `${theme.text}08` : "transparent",
              color: category === c.id ? theme.text : theme.textSec,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif",
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: theme.textSec, fontSize: 13 }}>
            순위 불러오는 중...
          </div>
        ) : rankings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 14, color: theme.textSec, lineHeight: 1.6 }}>
              아직 순위 데이터가 없어요.<br />
              퀴즈를 풀고 복습을 시작해보세요!
            </div>
          </div>
        ) : (
          <>
            {/* My Rank */}
            <MyRankBar myEntry={myEntry} theme={theme} category={category} />

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-end",
                marginBottom: 20, paddingTop: 16,
              }}>
                {topThree.map(entry => (
                  <TopThreeCard
                    key={entry.userId}
                    entry={entry}
                    members={members}
                    theme={theme}
                    category={category}
                  />
                ))}
              </div>
            )}

            {/* Category Description */}
            {catInfo && (
              <div style={{
                fontSize: 11, color: theme.textSec, textAlign: "center",
                marginBottom: 12, padding: "6px 12px",
                background: `${theme.text}04`, borderRadius: 8,
              }}>
                {catInfo.icon} {catInfo.description}
              </div>
            )}

            {/* Rest of list */}
            <div style={{
              borderRadius: 14, overflow: "hidden",
              border: `1px solid ${theme.border}`,
              background: theme.card,
            }}>
              {rest.map(entry => (
                <RankRow
                  key={entry.userId}
                  entry={entry}
                  members={members}
                  theme={theme}
                  category={category}
                />
              ))}
              {rest.length === 0 && topThree.length > 0 && (
                <div style={{ textAlign: "center", padding: 20, color: theme.textSec, fontSize: 12 }}>
                  참가자가 더 많아지면 여기에 순위가 표시돼요
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function renderRankingScreen(ctx) {
  return <RankingScreenInner {...ctx} />;
}
