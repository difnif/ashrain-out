import { useState, useEffect, useRef, useMemo } from "react";
import { PASTEL } from "../config";
import { fbListen } from "../firebase";
import DiaryTab from "./DiaryScreen";

const TABS = [
  { key: "home", icon: "🏠", label: "홈" },
  { key: "archive", icon: "📂", label: "아카이브" },
  // { key: "diary", icon: "📓", label: "다이어리" }, // 임시 비활성화 — 광장으로 교체. 되돌리려면 이 줄 활성화하고 아래 plaza 줄 제거
  { key: "plaza", icon: "🏛️", label: "광장", external: true }, // external: 탭 클릭 시 setScreen("plaza")로 외부 화면 진입
  { key: "homework", icon: "📝", label: "숙제" },
  { key: "settings", icon: "⚙️", label: "설정" },
];

function dateStr(d) { return d ? new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; }
function todayKey() { return new Date().toISOString().slice(0, 10); }

// ===== Home Tab =====
// ===== Speed Quiz Leaderboard (TOP 10, 가로 막대그래프) =====
function SpeedQuizLeaderboard({ theme, currentUser }) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = fbListen("quiz-clears", (data) => {
      const list = data
        ? Object.values(data).filter((e) => e && e.userId && e.clearCount > 0)
        : [];
      list.sort((a, b) => {
        if (b.clearCount !== a.clearCount) return b.clearCount - a.clearCount;
        return (b.bestCorrect || 0) - (a.bestCorrect || 0);
      });
      setEntries(list);
      setLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const top10 = entries.slice(0, 10);
  const maxCount = top10.length > 0 ? top10[0].clearCount : 1;

  if (!loaded) return null;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 16,
      background: "linear-gradient(135deg, #FEF3C712, #FDE68A08)",
      border: "1px solid #EAB30830",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>스피드 퀴즈 명예의 전당</span>
        <span style={{ fontSize: 10, color: theme.textSec, marginLeft: "auto", padding: "2px 6px", borderRadius: 6, background: `${theme.text}08` }}>
          7분 20초 돌파 TOP 10
        </span>
      </div>

      {top10.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: theme.textSec, lineHeight: 1.6 }}>
          아직 클리어한 학생이 없어요.<br />첫 클리어의 주인공이 되어 보세요!
        </div>
      )}

      {top10.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top10.map((e, i) => {
            const isMe = currentUser && e.userId === currentUser.id;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
            const barPct = Math.max(8, (e.clearCount / maxCount) * 100);
            const barColor = i === 0 ? "#EAB308" : i === 1 ? "#9CA3AF" : i === 2 ? "#D97706" : "#8B5CF6";
            return (
              <div key={e.userId} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 10,
                background: isMe ? "#EAB30815" : "transparent",
                border: isMe ? "1px solid #EAB30840" : "1px solid transparent",
              }}>
                <div style={{ width: 24, flexShrink: 0, textAlign: "center", fontSize: i < 3 ? 16 : 12, fontWeight: 800, color: i < 3 ? undefined : theme.textSec }}>{medal}</div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 12, fontWeight: isMe ? 800 : 600, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.name}{isMe && <span style={{ fontSize: 10, color: "#EAB308", marginLeft: 4 }}>· 나</span>}
                  </div>
                  <div style={{ height: 10, borderRadius: 6, background: `${theme.text}10`, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`, borderRadius: 6, transition: "width .5s ease-out" }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 48 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: barColor, fontVariantNumeric: "tabular-nums" }}>{e.clearCount}회</div>
                  <div style={{ fontSize: 9, color: "#10B981", fontWeight: 700 }}>✓{e.bestCorrect || 0}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HomeTab({ theme, user, setScreen, playSfx, homework, notifications, archive, members }) {
  const pending = homework.filter(h => h.status !== "completed").length;

  // Learning stats from archive (last 7 days)
  const weekStats = useMemo(() => {
    const now = Date.now();
    const days = Array.from({length:7},(_,i) => {
      const d = new Date(now - (6-i)*86400000);
      return d.toISOString().slice(0,10);
    });
    return days.map(day => ({
      day, label: new Date(day).toLocaleDateString("ko-KR",{weekday:"short"}),
      count: archive.filter(a => a.createdAt && new Date(a.createdAt).toISOString().slice(0,10) === day).length,
    }));
  }, [archive]);
  const maxCount = Math.max(...weekStats.map(s => s.count), 1);
  const totalThisWeek = weekStats.reduce((s,d) => s+d.count, 0);

  // Simple ranking by archive count
  const ranking = useMemo(() => {
    if (!members?.length) return [];
    return members.map(m => ({
      id: m.id, name: m.name,
      count: archive.filter(a => a.userId === m.id && !a.hidden).length, // TODO: real per-user data
    })).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [members, archive]);

  return (
    <div style={{ padding: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
          안녕, {user?.name || "학생"}! 👋
        </div>
        <a
          href="https://www.instagram.com/ashrain.out"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => playSfx && playSfx("click")}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 10px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.textSec,
            fontSize: 10,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            fontFamily: "'Noto Serif KR', serif",
          }}
        >
          🐞 앱 오류 제보
        </a>
      </div>
      <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 16 }}>오늘도 열심히 공부하자!</p>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { icon: "📝", label: "숙제", value: pending > 0 ? `${pending}개 남음` : "완료!", color: pending > 0 ? PASTEL.coral : PASTEL.mint },
          { icon: "📚", label: "이번 주", value: `${totalThisWeek}개 학습`, color: PASTEL.sky },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: "14px 12px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: theme.textSec, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick action - 복습하기 only */}
      <button onClick={() => { playSfx("click"); setScreen("study"); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer", textAlign: "left", marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>📖</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>복습하기</div>
          <div style={{ fontSize: 10, color: theme.textSec }}>그리기 · 문제 분석 · 개념 학습</div>
        </div>
      </button>

      {/* Quick action - 오답노트 */}
      <button onClick={() => { playSfx("click"); setScreen("wrongNote"); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer", textAlign: "left", marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>📒</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>오답노트</div>
          <div style={{ fontSize: 10, color: theme.textSec }}>사진 분류 · 표시 · 누적 학습</div>
        </div>
      </button>

      {/* Learning graph */}
      <div style={{ padding: "14px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 10 }}>📈 이번 주 학습량</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {weekStats.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, color: PASTEL.coral, fontWeight: 700 }}>{s.count || ""}</span>
              <div style={{
                width: "100%", borderRadius: 4,
                height: Math.max(4, (s.count / maxCount) * 60),
                background: s.day === todayKey() ? PASTEL.coral : `${PASTEL.coral}40`,
                transition: "height 0.3s",
              }} />
              <span style={{ fontSize: 9, color: s.day === todayKey() ? PASTEL.coral : theme.textSec }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Speed Quiz Leaderboard */}
      <SpeedQuizLeaderboard theme={theme} currentUser={user} />

      {/* Ranking — 임시 비활성 (복구하려면 false → true로 변경) */}
      {false && (
      <div style={{ padding: "14px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 10 }}>🏆 학습량 순위</div>
        {ranking.length === 0 && <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center" }}>아직 데이터가 없어요</p>}
        {ranking.map((r, i) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < ranking.length - 1 ? `1px solid ${theme.border}` : "none" }}>
            <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}`}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: r.id === user?.id ? 700 : 400, color: r.id === user?.id ? PASTEL.coral : theme.text }}>
              {r.name} {r.id === user?.id && <span style={{ fontSize: 9, color: PASTEL.coral }}>나</span>}
            </span>
            <span style={{ fontSize: 11, color: PASTEL.sky, fontWeight: 700 }}>{r.count}개</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ===== Archive Tab =====
function ArchiveTab({ theme, archive, setArchive, playSfx, showMsg, diary, setDiary }) {
  const [filter, setFilter] = useState("visible"); // visible|hidden|all
  const [selectedItem, setSelectedItem] = useState(null);
  const filtered = filter === "all" ? archive : filter === "hidden" ? archive.filter(a => a.hidden) : archive.filter(a => !a.hidden);

  const togglePublic = (id) => setArchive(prev => prev.map(a => a.id === id ? { ...a, isPublic: !a.isPublic } : a));
  const toggleHidden = (id) => { setArchive(prev => prev.map(a => a.id === id ? { ...a, hidden: !a.hidden } : a)); setSelectedItem(null); };
  const deleteItem = (id) => { setArchive(prev => prev.filter(a => a.id !== id)); setSelectedItem(null); };

  // Detail view
  if (selectedItem) {
    const item = archive.find(a => a.id === selectedItem);
    if (!item) { setSelectedItem(null); return null; }
    return (
      <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
        <button onClick={() => setSelectedItem(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← 목록</button>
        <div style={{ padding: "16px", borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{item.title}</div>
              <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>
                {new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {item.type}
              </div>
            </div>
            <button onClick={() => { togglePublic(item.id); playSfx("click"); }}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: item.isPublic ? `${PASTEL.mint}10` : theme.card, color: item.isPublic ? PASTEL.mint : theme.textSec, cursor: "pointer", height: "fit-content" }}>
              {item.isPublic ? "🌍 공개" : "🔒 비공개"}
            </button>
            {item.isPublic && <span style={{ fontSize: 8, color: theme.textSec }}>학부모·광장에서 익명으로 보입니다</span>}
          </div>

          {/* Content */}
          {item.content?.problemText && (
            <div style={{ padding: 12, borderRadius: 12, background: theme.bg, marginBottom: 10, fontSize: 13, lineHeight: 2, color: theme.text, whiteSpace: "pre-line" }}>
              {item.content.problemText}
            </div>
          )}
          {Array.isArray(item.content?.steps) && item.content.steps.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {item.content.steps.map((step, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 10, background: `${PASTEL[step?.color] || PASTEL.coral}08`, border: `1px solid ${PASTEL[step?.color] || PASTEL.coral}20`, fontSize: 12, color: theme.text }}>
                  <b style={{ color: PASTEL[step?.color] || PASTEL.coral }}>STEP {i+1}</b> {step?.title || ""}
                  {step?.curriculumTag && (
                    <span style={{
                      fontSize: 9, marginLeft: 8, padding: "1px 6px", borderRadius: 6,
                      background: step.curriculumTag.unlearned ? `${PASTEL.coral}20` : `${PASTEL.mint}15`,
                      color: step.curriculumTag.unlearned ? PASTEL.coral : PASTEL.mint,
                    }}>
                      {step.curriculumTag.unlearned && "⚠️ "}
                      {step.curriculumTag.semester} · {step.curriculumTag.unit}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {item.content?.equation && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: `${PASTEL.mint}08`, border: `1px solid ${PASTEL.mint}25`, fontSize: 14, fontWeight: 700, textAlign: "center", color: theme.text, marginBottom: 10 }}>
              {item.content.equation}
            </div>
          )}
          {item.preview && !item.content?.problemText && (
            <div style={{ padding: 12, borderRadius: 12, background: theme.bg, fontSize: 13, color: theme.text, marginBottom: 10 }}>
              {item.preview}
            </div>
          )}
          {item.isQuestion && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: `${PASTEL.lavender}08`, border: `1px solid ${PASTEL.lavender}25`, fontSize: 11, color: PASTEL.lavender, marginBottom: 10 }}>
              🙋 선생님께 질문한 항목
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              const importText = item.content?.problemText || item.preview || item.title || "";
              setDiary(prev => {
                const ex = prev.find(d => d.date === today);
                const addText = `\n\n[${item.type || "아카이브"}] ${importText}`;
                if (ex) return prev.map(d => d.date === today ? { ...d, content: (d.content || "") + addText, updatedAt: Date.now() } : d);
                return [...prev, { id: `diary-${today}`, date: today, content: addText.trim(), paths: [], createdAt: Date.now(), updatedAt: Date.now() }];
              });
              playSfx("success"); showMsg("오늘 다이어리에 추가했어요! 📓", 2000);
            }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${PASTEL.lavender}30`, background: `${PASTEL.lavender}08`, color: PASTEL.lavender, fontSize: 11, cursor: "pointer" }}>
              📓 다이어리로 보내기
            </button>
            <button onClick={() => { toggleHidden(item.id); playSfx("click"); }}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 11, cursor: "pointer" }}>
              {item.hidden ? "📂 피드로 복원" : "👁️‍🗨️ 숨기기"}
            </button>
            <button onClick={() => { if(confirm("삭제하면 학습량에서도 제외돼요.")) deleteItem(item.id); }}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${PASTEL.coral}30`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer" }}>
              🗑️ 삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (Instagram style)
  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["visible", "📂 피드"], ["hidden", "👁️‍🗨️ 숨긴 항목"], ["all", "전체"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            border: filter === k ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: filter === k ? `${PASTEL.coral}10` : theme.card, color: theme.text,
          }}>{l} ({(k === "all" ? archive : k === "hidden" ? archive.filter(a=>a.hidden) : archive.filter(a=>!a.hidden)).length})</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: theme.textSec }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 12 }}>{filter === "hidden" ? "숨긴 항목이 없어요" : "아직 저장한 게 없어요"}</p>
        </div>
      )}

      {/* Instagram-style grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
        {filtered.map(item => {
          const isDrawing = item.type?.includes("외접") || item.type?.includes("내접") || item.type?.includes("외심") || item.type?.includes("합동") || item.type?.includes("삼각형");
          const isProblem = item.type === "문제분석" || item.type === "질문";
          const bgColor = isDrawing ? `${PASTEL.sky}12` : isProblem ? `${PASTEL.coral}08` : `${PASTEL.mint}08`;
          
          return (
            <button key={item.id} onClick={() => { setSelectedItem(item.id); playSfx("click"); }}
              style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                borderRadius: 8, border: `1px solid ${theme.border}`,
                background: bgColor, cursor: "pointer", padding: 8, overflow: "hidden",
                opacity: item.hidden ? 0.5 : 1,
                position: "relative",
              }}>
              {/* Type icon */}
              <span style={{ fontSize: 22 }}>
                {isDrawing ? "📐" : isProblem ? "📝" : item.isQuestion ? "🙋" : "📄"}
              </span>
              {/* Preview text */}
              <span style={{ fontSize: 9, color: theme.text, textAlign: "center", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", maxWidth: "100%", wordBreak: "break-all" }}>
                {item.content?.problemText?.slice(0, 30) || item.title || item.preview?.slice(0, 20)}
              </span>
              {/* Badges */}
              {item.isQuestion && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10 }}>🙋</span>}
              {item.hidden && <span style={{ position: "absolute", top: 4, left: 4, fontSize: 10 }}>👁️‍🗨️</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Homework Tab =====
function HomeworkTab({ theme, homework, setHomework, playSfx, showMsg }) {
  const now = Date.now();
  const DAY = 86400000;

  // Sort: pinned assignments first (24hr), then by last review
  const sorted = [...homework].sort((a, b) => {
    const aPin = a.assignedAt && (now - a.assignedAt < DAY) ? 1 : 0;
    const bPin = b.assignedAt && (now - b.assignedAt < DAY) ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return (b.completedAt || 0) - (a.completedAt || 0);
  });

  const [expandedId, setExpandedId] = useState(null);
  const [reviewMode, setReviewMode] = useState(null); // hw id being reviewed

  const completeReview = (id) => {
    setHomework(prev => prev.map(h => h.id === id ? {
      ...h, status: "completed", completedAt: Date.now(),
      reviewCount: (h.reviewCount || 0) + 1,
    } : h));
    setReviewMode(null);
    playSfx("success"); showMsg("복습 완료! 👏", 1500);
  };

  // Review mode: show problem/figure then explanation
  if (reviewMode) {
    const hw = homework.find(h => h.id === reviewMode);
    if (!hw) { setReviewMode(null); return null; }
    return (
      <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
        <button onClick={() => setReviewMode(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>← 목록</button>
        <div style={{ padding: 16, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{hw.problemType || hw.type || "수학 문제"}</div>
          <div style={{ fontSize: 13, lineHeight: 2, color: theme.text, whiteSpace: "pre-line" }}>
            {hw.problemText || hw.preview || "문제를 확인하세요"}
          </div>
        </div>
        {hw.teacherResponse && (
          <div style={{ padding: 14, borderRadius: 14, background: `${PASTEL.sky}08`, border: `1px solid ${PASTEL.sky}25`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: PASTEL.sky, fontWeight: 700, marginBottom: 4 }}>선생님 풀이</div>
            <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{hw.teacherResponse}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setReviewMode(null)} style={{
            flex: 1, padding: 12, borderRadius: 12,
            border: `1px solid ${theme.border}`, background: theme.card,
            color: theme.textSec, fontSize: 12, cursor: "pointer",
          }}>닫기</button>
          <button onClick={() => completeReview(hw.id)} style={{
            flex: 2, padding: 12, borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
            color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>✅ 복습 완료</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "12px 0 16px", fontSize: 13, color: theme.textSec, fontStyle: "italic" }}>
        "숙제는 늘 복습이다."
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: theme.textSec }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
          <p style={{ fontSize: 12 }}>숙제가 없어요!</p>
        </div>
      )}

      {sorted.map(hw => {
        const isPinned = hw.assignedAt && (now - hw.assignedAt < DAY);
        const isAssignment = hw.status === "assigned" || hw.status === "in_progress";
        const bgColor = isPinned && isAssignment ? `${PASTEL.coral}08` : hw.status === "completed" ? `${PASTEL.sky}06` : theme.card;
        const borderColor = isPinned && isAssignment ? `${PASTEL.coral}40` : hw.status === "completed" ? `${PASTEL.sky}30` : theme.border;

        return (
          <div key={hw.id} style={{
            marginBottom: 8, borderRadius: 14, overflow: "hidden",
            border: `1.5px solid ${borderColor}`, background: bgColor,
          }}>
            <button onClick={() => { setReviewMode(hw.id); playSfx("click"); }}
              style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  {isPinned && isAssignment && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: PASTEL.coral, color: "white", fontWeight: 700 }}>NEW</span>}
                  {hw.status === "completed" && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: PASTEL.sky, color: "white" }}>완료</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{hw.problemType || hw.type || "수학 문제"}</span>
                </div>
                <div style={{ fontSize: 10, color: theme.textSec }}>
                  {hw.assignedAt && `출제: ${new Date(hw.assignedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`}
                  {hw.completedAt && ` · 최근 복습: ${new Date(hw.completedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`}
                </div>
              </div>
              {/* Review count */}
              <div style={{ textAlign: "center", minWidth: 40 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: (hw.reviewCount || 0) > 0 ? PASTEL.mint : theme.textSec }}>{hw.reviewCount || 0}</div>
                <div style={{ fontSize: 8, color: theme.textSec }}>복습</div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ===== Settings Tab =====
function SettingsTab({ theme, playSfx, showMsg, user, updateMember, handleLogout,
  notifications, setNotifications, dndStart, dndEnd, setDndStart, setDndEnd,
  themeKey, setThemeKey, toneKey, setToneKey,
  bgmOn, setBgmOn, sfxOn, setSfxOn, bgmVol, setBgmVol, sfxVol, setSfxVol,
  archiveDefaultPublic, setArchiveDefaultPublic }) {

  const [section, setSection] = useState(null);
  const [showAllNotifs, setShowAllNotifs] = useState(false); // null|account|notif|display|audio|archive
  const [editField, setEditField] = useState(null); // id|pw|nickname
  const [editVal, setEditVal] = useState("");
  const [editPwOld, setEditPwOld] = useState("");

  // 광장 핀 공지 → "닉네임 설정하러 가기" 진입 시 자동으로 닉네임 편집 모달 오픈
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ar_open_settings_nickname") === "1") {
        sessionStorage.removeItem("ar_open_settings_nickname");
        setEditField("nickname");
        setEditVal("");
        setEditPwOld("");
      }
    } catch {}
  }, []);

  const member = user || {};
  const idChangeCount = member.idChangeCount || 0;
  const lastNicknameChange = member.lastNicknameChange || 0;
  const canChangeId = idChangeCount < 2;
  const daysSinceNickChange = (Date.now() - lastNicknameChange) / 86400000;
  const canChangeNickname = daysSinceNickChange >= 7;

  const saveEdit = () => {
    if (!editField || !editVal.trim()) { showMsg("값을 입력해주세요", 1500); return; }
    if (editField === "id") {
      if (!canChangeId) { showMsg("아이디는 최대 2회까지만 변경 가능해요", 2000); return; }
      if (editVal.length < 3) { showMsg("3글자 이상 입력해주세요", 1500); return; }
      updateMember(member.id, { id: editVal, idChangeCount: idChangeCount + 1 });
      showMsg("아이디가 변경되었어요!", 2000);
    } else if (editField === "pw") {
      if (editPwOld !== member.pw) { showMsg("현재 비밀번호가 틀려요", 1500); return; }
      if (editVal.length < 4) { showMsg("4글자 이상 입력해주세요", 1500); return; }
      updateMember(member.id, { pw: editVal });
      showMsg("비밀번호가 변경되었어요!", 2000);
    } else if (editField === "nickname") {
      if (!canChangeNickname) { showMsg(`${Math.ceil(7 - daysSinceNickChange)}일 후에 변경 가능해요`, 2000); return; }
      if (editVal.length < 1 || editVal.length > 10) { showMsg("1~10글자로 입력해주세요", 1500); return; }
      updateMember(member.id, { nickname: editVal, lastNicknameChange: Date.now() });
      showMsg("닉네임이 변경되었어요!", 2000);
    }
    setEditField(null); setEditVal(""); setEditPwOld("");
    playSfx("success");
  };

  const unread = notifications.filter(n => !n.read).length;

  // Edit modal
  if (editField) {
    const titles = { id: "아이디 변경", pw: "비밀번호 변경", nickname: "닉네임 변경" };
    return (
      <div style={{ padding: "16px", animation: "fadeIn 0.3s ease" }}>
        <button onClick={() => setEditField(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← 돌아가기</button>
        <div style={{ padding: 20, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 16 }}>{titles[editField]}</div>
          {editField === "id" && (
            <div style={{ fontSize: 10, color: PASTEL.coral, marginBottom: 10 }}>
              ⚠️ 아이디 변경은 총 2회까지 가능 (현재 {idChangeCount}/2회 사용)
            </div>
          )}
          {editField === "nickname" && !canChangeNickname && (
            <div style={{ fontSize: 10, color: PASTEL.coral, marginBottom: 10 }}>
              ⏳ {Math.ceil(7 - daysSinceNickChange)}일 후에 변경 가능해요
            </div>
          )}
          {editField === "pw" && (
            <input type="password" placeholder="현재 비밀번호" value={editPwOld}
              onChange={e => setEditPwOld(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
          )}
          <input type={editField === "pw" ? "password" : "text"}
            placeholder={editField === "id" ? "새 아이디" : editField === "pw" ? "새 비밀번호" : "새 닉네임"}
            value={editVal} onChange={e => setEditVal(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 14, boxSizing: "border-box" }} />
          <button onClick={saveEdit} disabled={editField === "id" && !canChangeId || editField === "nickname" && !canChangeNickname}
            style={{ width: "100%", marginTop: 12, padding: 14, borderRadius: 14, border: "none",
              background: PASTEL.coral, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: (editField === "id" && !canChangeId) || (editField === "nickname" && !canChangeNickname) ? 0.4 : 1 }}>
            변경하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", animation: "fadeIn 0.3s ease" }}>
      {/* Account */}
      <div style={{ padding: 16, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 10 }}>👤 내 계정</div>
        <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 4 }}>이름: <b style={{ color: theme.text }}>{member.name || "미설정"}</b> <span style={{ fontSize: 9, color: theme.textSec }}>(변경불가)</span></div>
        {[
          { key: "id", label: "아이디", value: member.id, sub: canChangeId ? `변경 ${idChangeCount}/2회` : "변경 불가 (2/2)" },
          { key: "nickname", label: "닉네임", value: member.nickname || "미설정", sub: canChangeNickname ? "변경 가능" : `${Math.ceil(7 - daysSinceNickChange)}일 후 변경 가능` },
          { key: "pw", label: "비밀번호", value: "••••••", sub: "" },
        ].map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${theme.border}20` }}>
            <div>
              <span style={{ fontSize: 12, color: theme.text }}>{item.label}: <b>{item.value}</b></span>
              {item.sub && <div style={{ fontSize: 9, color: theme.textSec }}>{item.sub}</div>}
            </div>
            <button onClick={() => { setEditField(item.key); setEditVal(""); setEditPwOld(""); playSfx("click"); }}
              style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.textSec, fontSize: 10, cursor: "pointer" }}>
              변경
            </button>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ padding: 14, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>🔔 알림 {unread > 0 && <span style={{ fontSize: 10, color: PASTEL.coral }}>({unread})</span>}</div>
          {unread > 0 && <button onClick={() => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); playSfx("click"); }}
            style={{ fontSize: 10, color: PASTEL.sky, background: "none", border: "none", cursor: "pointer" }}>모두 읽음</button>}
        </div>
        {(showAllNotifs ? notifications : notifications.slice(0, 3)).map(n => (
          <div key={n.id} style={{ padding: "6px 0", borderTop: `1px solid ${theme.border}20`, display: "flex", gap: 6, alignItems: "flex-start" }}>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: 3, background: PASTEL.coral, marginTop: 5, flexShrink: 0 }} />}
            <div style={{ fontSize: 11, color: n.read ? theme.textSec : theme.text }}>{n.title}</div>
          </div>
        ))}
        {notifications.length === 0 && <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center" }}>알림 없음</p>}
        {notifications.length > 3 && !showAllNotifs && (
          <button onClick={() => setShowAllNotifs(true)} style={{ width: "100%", padding: 6, border: "none", background: "transparent", color: PASTEL.sky, fontSize: 10, cursor: "pointer" }}>전체 {notifications.length}개 보기 →</button>
        )}
      </div>

      {/* DND */}
      <div style={{ padding: 14, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>🌙 방해금지</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="time" value={dndStart} onChange={e => setDndStart(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, color: theme.text }} />
          <span style={{ color: theme.textSec }}>~</span>
          <input type="time" value={dndEnd} onChange={e => setDndEnd(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, color: theme.text }} />
        </div>
      </div>

      {/* Display */}
      <div style={{ padding: 14, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>🎨 화면</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[["light", "라이트"], ["dark", "다크"]].map(([k, l]) => (
            <button key={k} onClick={() => { setThemeKey(k); playSfx("click"); }}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${themeKey === k ? PASTEL.coral : theme.border}`, background: themeKey === k ? `${PASTEL.coral}10` : theme.card, color: theme.text, fontSize: 12, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 6 }}>말투</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["default", "기본"], ["nagging", "잔소리"], ["cute", "더러운"]].map(([k, l]) => (
            <button key={k} onClick={() => { setToneKey(k); playSfx("click"); }}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: `1.5px solid ${toneKey === k ? PASTEL.sky : theme.border}`, background: toneKey === k ? `${PASTEL.sky}10` : theme.card, color: theme.text, fontSize: 11, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Audio */}
      <div style={{ padding: 14, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>🔊 오디오</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => setBgmOn(!bgmOn)} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1.5px solid ${bgmOn ? PASTEL.mint : theme.border}`, background: bgmOn ? `${PASTEL.mint}10` : theme.card, color: theme.text, fontSize: 11, cursor: "pointer" }}>🎵 BGM {bgmOn ? "ON" : "OFF"}</button>
          <button onClick={() => setSfxOn(!sfxOn)} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1.5px solid ${sfxOn ? PASTEL.sky : theme.border}`, background: sfxOn ? `${PASTEL.sky}10` : theme.card, color: theme.text, fontSize: 11, cursor: "pointer" }}>🔊 효과음 {sfxOn ? "ON" : "OFF"}</button>
        </div>
      </div>

      {/* Archive default */}
      <div style={{ padding: 14, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>📂 아카이브 기본 공개</div>
            <div style={{ fontSize: 10, color: theme.textSec }}>{archiveDefaultPublic ? "🌍 공개" : "🔒 비공개"}</div>
          </div>
          <button onClick={() => { setArchiveDefaultPublic(!archiveDefaultPublic); playSfx("click"); }}
            style={{ width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: archiveDefaultPublic ? PASTEL.mint : theme.border, position: "relative", transition: "background 0.3s" }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: "white", position: "absolute", top: 3, left: archiveDefaultPublic ? 25 : 3, transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} style={{ width: "100%", padding: 14, borderRadius: 14, border: `1px solid ${PASTEL.coral}30`, background: `${PASTEL.coral}08`, color: PASTEL.coral, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        로그아웃
      </button>
    </div>
  );
}

// ===== Main =====
export function StudentHomeScreenInner(props) {
  const { theme, playSfx, isAdminPreview, exitPreview, notifications, homework, setScreen } = props;
  const [tab, setTab] = useState(() => {
    // 광장 핀 메시지의 "닉네임 설정하러 가기" 버튼에서 진입 시 → 설정 탭 자동 활성화
    // 플래그는 SettingsTab이 닉네임 편집 모달을 연 후 제거함 (여기서 제거하면 모달이 안 열림)
    try {
      if (sessionStorage.getItem("ar_open_settings_nickname") === "1") return "settings";
    } catch {}
    return "home";
  });
  const contentRef = useRef(null);
  const unread = 0; // notifications badge removed
  const pendingHw = homework.filter(h => h.status !== "completed").length;

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pageFlipLeft{0%{transform:translateX(0);opacity:1}30%{transform:translateX(-30px) rotateY(15deg);opacity:0.7}100%{transform:translateX(0);opacity:1}}
        @keyframes pageFlipRight{0%{transform:translateX(0);opacity:1}30%{transform:translateX(30px) rotateY(-15deg);opacity:0.7}100%{transform:translateX(0);opacity:1}}`}</style>
      <div style={{ paddingTop: "env(safe-area-inset-top, 0)" }} />
      {isAdminPreview && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: `${PASTEL.coral}15`, borderBottom: `1px solid ${PASTEL.coral}30` }}>
          <span style={{ fontSize: 11, color: PASTEL.coral, fontWeight: 700 }}>👁️ 학생 모드 미리보기</span>
          <button onClick={exitPreview} style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>🚪 나가기</button>
        </div>
      )}
      <div ref={contentRef} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {tab === "home" && <HomeTab {...props} />}
        {tab === "archive" && <ArchiveTab {...props} />}
        {tab === "diary" && <DiaryTab {...props} setTab={setTab} />}
        {tab === "homework" && <HomeworkTab {...props} />}
        {tab === "settings" && <SettingsTab {...props} />}
      </div>
      <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${theme.border}`, background: theme.card, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {TABS.map(t => {
          const active = tab === t.key;
          const badge = t.key === "homework" ? pendingHw : 0;
          return (
            <button key={t.key} onClick={() => {
                playSfx("click");
                if (t.external) { setScreen(t.key); return; }
                setTab(t.key);
                contentRef.current?.scrollTo(0, 0);
              }}
              style={{ flex: 1, padding: "12px 0 10px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", minHeight: 50 }}>
              <span style={{ fontSize: 20, opacity: active ? 1 : 0.5 }}>{t.icon}</span>
              <span style={{ fontSize: 10, color: active ? PASTEL.coral : theme.textSec, fontWeight: active ? 700 : 400 }}>{t.label}</span>
              {badge > 0 && <div style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", width: 16, height: 16, borderRadius: 8, background: PASTEL.coral, color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function renderStudentHomeScreen(ctx) { return <StudentHomeScreenInner {...ctx} />; }
