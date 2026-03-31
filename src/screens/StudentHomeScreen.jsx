import { useState, useEffect, useRef, useMemo } from "react";
import { PASTEL } from "../config";

const TABS = [
  { key: "home", icon: "🏠", label: "홈" },
  { key: "archive", icon: "📂", label: "아카이브" },
  { key: "diary", icon: "📓", label: "다이어리" },
  { key: "homework", icon: "📝", label: "숙제" },
  { key: "notif", icon: "🔔", label: "알림" },
];

function dateStr(d) { return d ? new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; }
function todayKey() { return new Date().toISOString().slice(0, 10); }

// ===== Home Tab =====
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
      count: archive.filter(a => a.userId === m.id).length + Math.floor(Math.random()*3), // TODO: real per-user data
    })).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [members, archive]);

  return (
    <div style={{ padding: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
        안녕, {user?.name || "학생"}! 👋
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

      {/* Ranking */}
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
    </div>
  );
}

// ===== Archive Tab =====
function ArchiveTab({ theme, archive, setArchive, playSfx, showMsg }) {
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
          </div>

          {/* Content */}
          {item.content?.problemText && (
            <div style={{ padding: 12, borderRadius: 12, background: theme.bg, marginBottom: 10, fontSize: 13, lineHeight: 2, color: theme.text, whiteSpace: "pre-line" }}>
              {item.content.problemText}
            </div>
          )}
          {item.content?.steps && (
            <div style={{ marginBottom: 10 }}>
              {item.content.steps.map((step, i) => (
                <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 10, background: `${PASTEL[step.color] || PASTEL.coral}08`, border: `1px solid ${PASTEL[step.color] || PASTEL.coral}20`, fontSize: 12, color: theme.text }}>
                  <b style={{ color: PASTEL[step.color] || PASTEL.coral }}>STEP {i+1}</b> {step.title}
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

// ===== Diary Tab =====
function DiaryTab({ theme, diary, setDiary, playSfx }) {
  const today = todayKey();
  const sortedDates = [...new Set(diary.map(d => d.date))].sort().reverse();
  const [viewDate, setViewDate] = useState(today);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => { setText(diary.find(d => d.date === viewDate)?.content || ""); setEditing(false); }, [viewDate, diary]);

  const save = () => {
    setDiary(prev => {
      const ex = prev.find(d => d.date === viewDate);
      if (ex) return prev.map(d => d.date === viewDate ? { ...d, content: text, updatedAt: Date.now() } : d);
      return [...prev, { id: `diary-${viewDate}`, date: viewDate, content: text, createdAt: Date.now(), updatedAt: Date.now() }];
    });
    setEditing(false); playSfx("success");
  };
  const canEdit = viewDate === today;

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()-1); setViewDate(d.toISOString().slice(0,10)); }}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: theme.text }}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
            {new Date(viewDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
          {viewDate === today && <span style={{ fontSize: 10, color: PASTEL.coral, fontWeight: 700 }}>오늘</span>}
        </div>
        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()+1); const n = d.toISOString().slice(0,10); if(n<=today) setViewDate(n); }}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: viewDate < today ? theme.text : theme.border }}>▶</button>
      </div>
      <div style={{
        minHeight: 300, padding: 20, borderRadius: 16, background: theme.card, border: `1px solid ${theme.border}`,
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${theme.border}40 31px, ${theme.border}40 32px)`,
        backgroundPosition: "0 20px",
      }}>
        {editing ? (
          <textarea value={text} onChange={e => setText(e.target.value)}
            style={{ width: "100%", minHeight: 260, border: "none", background: "transparent", color: theme.text, fontSize: 14, lineHeight: "32px", fontFamily: "'Noto Serif KR', serif", resize: "none", outline: "none" }}
            placeholder="오늘 공부한 내용을 적어보세요..." autoFocus />
        ) : (
          <div onClick={() => canEdit && setEditing(true)}
            style={{ fontSize: 14, lineHeight: "32px", color: text ? theme.text : theme.textSec, whiteSpace: "pre-wrap", minHeight: 260, cursor: canEdit ? "text" : "default" }}>
            {text || (canEdit ? "터치해서 작성하기..." : "작성한 내용이 없어요")}
          </div>
        )}
      </div>
      {canEdit && editing && (
        <button onClick={save} style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 12, border: "none", background: PASTEL.coral, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>저장</button>
      )}
      {sortedDates.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 8 }}>최근 기록</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sortedDates.slice(0, 14).map(d => (
              <button key={d} onClick={() => setViewDate(d)} style={{
                padding: "6px 10px", borderRadius: 8, fontSize: 10, cursor: "pointer",
                border: viewDate === d ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
                background: viewDate === d ? `${PASTEL.coral}10` : theme.card, color: d === today ? PASTEL.coral : theme.text,
              }}>{d.slice(5)}</button>
            ))}
          </div>
        </div>
      )}
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

// ===== Notification Tab =====
function NotifTab({ theme, notifications, setNotifications, dndStart, dndEnd, setDndStart, setDndEnd, playSfx }) {
  const markAllRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); playSfx("click"); };
  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ padding: "12px 14px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8 }}>🌙 방해금지 시간대</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="time" value={dndStart} onChange={e => setDndStart(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }} />
          <span style={{ color: theme.textSec, fontSize: 12 }}>~</span>
          <input type="time" value={dndEnd} onChange={e => setDndEnd(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }} />
        </div>
        <p style={{ fontSize: 10, color: theme.textSec, marginTop: 6 }}>이 시간에는 알림이 오지 않아요</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: theme.textSec }}>알림 ({notifications.length})</span>
        {notifications.some(n => !n.read) && <button onClick={markAllRead} style={{ fontSize: 10, color: PASTEL.sky, background: "none", border: "none", cursor: "pointer" }}>모두 읽음</button>}
      </div>
      {notifications.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 30 }}>알림이 없어요</p>}
      {notifications.map(n => (
        <button key={n.id} onClick={() => setNotifications(prev => prev.map(nn => nn.id === n.id ? { ...nn, read: true } : nn))}
          style={{ width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: 12, background: n.read ? theme.card : `${PASTEL.sky}06`, border: `1px solid ${n.read ? theme.border : PASTEL.sky + "30"}`, cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: PASTEL.coral, marginTop: 4, flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 700, color: theme.text }}>{n.title}</div>
              <div style={{ fontSize: 11, color: theme.textSec, marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 9, color: theme.textSec, marginTop: 4 }}>{dateStr(n.time)}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ===== Main =====
export function StudentHomeScreenInner(props) {
  const { theme, playSfx, isAdminPreview, exitPreview, notifications, homework } = props;
  const [tab, setTab] = useState("home");
  const unread = notifications.filter(n => !n.read).length;
  const pendingHw = homework.filter(h => h.status !== "completed").length;

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {isAdminPreview && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: `${PASTEL.coral}15`, borderBottom: `1px solid ${PASTEL.coral}30` }}>
          <span style={{ fontSize: 11, color: PASTEL.coral, fontWeight: 700 }}>👁️ 학생 모드 미리보기</span>
          <button onClick={exitPreview} style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>🚪 나가기</button>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {tab === "home" && <HomeTab {...props} />}
        {tab === "archive" && <ArchiveTab {...props} />}
        {tab === "diary" && <DiaryTab {...props} />}
        {tab === "homework" && <HomeworkTab {...props} />}
        {tab === "notif" && <NotifTab {...props} />}
      </div>
      <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${theme.border}`, background: theme.card, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {TABS.map(t => {
          const active = tab === t.key;
          const badge = t.key === "notif" ? unread : t.key === "homework" ? pendingHw : 0;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); playSfx("click"); }}
              style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
              <span style={{ fontSize: 18, opacity: active ? 1 : 0.5 }}>{t.icon}</span>
              <span style={{ fontSize: 9, color: active ? PASTEL.coral : theme.textSec, fontWeight: active ? 700 : 400 }}>{t.label}</span>
              {badge > 0 && <div style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", width: 16, height: 16, borderRadius: 8, background: PASTEL.coral, color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function renderStudentHomeScreen(ctx) { return <StudentHomeScreenInner {...ctx} />; }
