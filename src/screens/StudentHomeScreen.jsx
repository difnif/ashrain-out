import { useState, useEffect, useRef } from "react";
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
function HomeTab({ theme, user, setScreen, playSfx, homework, notifications }) {
  const pending = homework.filter(h => h.status !== "completed").length;
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div style={{ padding: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
        안녕, {user?.name || "학생"}! 👋
      </div>
      <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 20 }}>오늘도 열심히 공부하자!</p>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { icon: "📝", label: "숙제", value: pending > 0 ? `${pending}개 남음` : "완료!", color: pending > 0 ? PASTEL.coral : PASTEL.mint },
          { icon: "🔔", label: "알림", value: unread > 0 ? `${unread}개 새 알림` : "없음", color: unread > 0 ? PASTEL.sky : theme.textSec },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: "14px 12px", borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: theme.textSec, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { icon: "📐", label: "문제 분석하기", desc: "수학 문제 사진 찍고 분석", action: () => setScreen("sentence") },
          { icon: "✦", label: "그려서 공부하기", desc: "삼각형·외심·내심 작도", action: () => setScreen("polygons") },
        ].map(item => (
          <button key={item.label} onClick={() => { playSfx("click"); item.action(); }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer", textAlign: "left", width: "100%" }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{item.label}</div>
              <div style={{ fontSize: 10, color: theme.textSec }}>{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Archive Tab =====
function ArchiveTab({ theme, archive, setArchive, playSfx }) {
  const [filter, setFilter] = useState("all"); // all|public|private
  const filtered = filter === "all" ? archive : archive.filter(a => filter === "public" ? a.isPublic : !a.isPublic);

  const togglePublic = (id) => {
    setArchive(prev => prev.map(a => a.id === id ? { ...a, isPublic: !a.isPublic } : a));
  };

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["all", "전체"], ["public", "공개"], ["private", "비공개"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer",
            border: filter === k ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: filter === k ? `${PASTEL.coral}10` : theme.card, color: theme.text,
          }}>{l} ({k === "all" ? archive.length : filtered.length})</button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: theme.textSec }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
          <p style={{ fontSize: 12 }}>아직 저장한 게 없어요</p>
          <p style={{ fontSize: 11 }}>복습하면서 저장해보세요!</p>
        </div>
      )}
      {filtered.map(item => (
        <div key={item.id} style={{
          padding: "12px 14px", marginBottom: 8, borderRadius: 14,
          background: theme.card, border: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{item.title}</div>
              <div style={{ fontSize: 10, color: theme.textSec }}>{dateStr(item.createdAt)} · {item.type}</div>
            </div>
            <button onClick={() => { togglePublic(item.id); playSfx("click"); }}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: item.isPublic ? `${PASTEL.mint}10` : theme.card, color: item.isPublic ? PASTEL.mint : theme.textSec, cursor: "pointer" }}>
              {item.isPublic ? "🌍 공개" : "🔒 비공개"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Diary Tab =====
function DiaryTab({ theme, diary, setDiary, playSfx }) {
  const today = todayKey();
  const sortedDates = [...new Set(diary.map(d => d.date))].sort().reverse();
  const [viewDate, setViewDate] = useState(today);
  const todayEntry = diary.find(d => d.date === viewDate);
  const [text, setText] = useState(todayEntry?.content || "");
  const [editing, setEditing] = useState(false);
  // Drawing state
  const [drawMode, setDrawMode] = useState(false);
  const [penColor, setPenColor] = useState("#333");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState(todayEntry?.strokes || []);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [undoHistory, setUndoHistory] = useState([]);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const entry = diary.find(d => d.date === viewDate);
    setText(entry?.content || "");
    setStrokes(entry?.strokes || []);
    setEditing(false); setDrawMode(false);
    setUndoHistory([]);
  }, [viewDate, diary]);

  // Redraw canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    allStrokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.eraser ? theme.card : stroke.color;
      ctx.lineWidth = stroke.eraser ? stroke.size * 3 : stroke.size;
      ctx.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = "source-over";
  }, [strokes, currentStroke, theme]);

  const getPos = (e) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const onDrawStart = (e) => {
    if (!drawMode) return;
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;
    drawingRef.current = true;
    setCurrentStroke({ color: penColor, size: penSize, eraser: isEraser, points: [pos] });
  };
  const onDrawMove = (e) => {
    if (!drawingRef.current || !drawMode) return;
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
  };
  const onDrawEnd = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentStroke && currentStroke.points.length > 1) {
      setUndoHistory(prev => [...prev, strokes]);
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
  };

  const undoDraw = () => {
    if (undoHistory.length > 0) {
      setStrokes(undoHistory[undoHistory.length - 1]);
      setUndoHistory(prev => prev.slice(0, -1));
      playSfx("click");
    }
  };

  const clearDraw = () => {
    if (strokes.length > 0) {
      setUndoHistory(prev => [...prev, strokes]);
      setStrokes([]);
      playSfx("click");
    }
  };

  const save = () => {
    setDiary(prev => {
      const exists = prev.find(d => d.date === viewDate);
      const entry = { content: text, strokes, updatedAt: Date.now() };
      if (exists) return prev.map(d => d.date === viewDate ? { ...d, ...entry } : d);
      return [...prev, { id: `diary-${viewDate}`, date: viewDate, ...entry, createdAt: Date.now() }];
    });
    setEditing(false); setDrawMode(false);
    playSfx("success");
  };

  const canEdit = viewDate === today;
  const COLORS = ["#333", "#D95F4B", "#3A8FC2", "#2E9E6B", "#9B7FBF", "#E8A040", "#E88DB5"];

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      {/* Date navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => {
          const d = new Date(viewDate); d.setDate(d.getDate() - 1);
          setViewDate(d.toISOString().slice(0, 10));
        }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: theme.text }}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
            {new Date(viewDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
          {viewDate === today && <span style={{ fontSize: 10, color: PASTEL.coral, fontWeight: 700 }}>오늘</span>}
        </div>
        <button onClick={() => {
          const d = new Date(viewDate); d.setDate(d.getDate() + 1);
          const next = d.toISOString().slice(0, 10);
          if (next <= today) setViewDate(next);
        }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: viewDate < today ? theme.text : theme.border }}>▶</button>
      </div>

      {/* Drawing toolbar */}
      {drawMode && canEdit && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, padding: "8px 10px", borderRadius: 12, background: theme.card, border: `1px solid ${theme.border}`, flexWrap: "wrap", alignItems: "center", animation: "fadeIn 0.2s ease" }}>
          {/* Colors */}
          {COLORS.map(col => (
            <button key={col} onClick={() => { setPenColor(col); setIsEraser(false); }}
              style={{ width: 24, height: 24, borderRadius: 12, background: col, border: penColor === col && !isEraser ? `3px solid ${PASTEL.coral}` : `2px solid ${theme.border}`, cursor: "pointer" }} />
          ))}
          <div style={{ width: 1, height: 20, background: theme.border, margin: "0 2px" }} />
          {/* Eraser */}
          <button onClick={() => setIsEraser(!isEraser)} style={{
            padding: "4px 8px", borderRadius: 8, fontSize: 14, cursor: "pointer",
            border: isEraser ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: isEraser ? `${PASTEL.coral}15` : theme.card,
          }}>🧽</button>
          {/* Size */}
          <input type="range" min={1} max={12} value={penSize} onChange={e => setPenSize(+e.target.value)}
            style={{ width: 60, accentColor: PASTEL.coral }} />
          <div style={{ width: 1, height: 20, background: theme.border, margin: "0 2px" }} />
          {/* Undo / Clear */}
          <button onClick={undoDraw} disabled={undoHistory.length === 0}
            style={{ padding: "4px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${theme.border}`, background: theme.card, color: undoHistory.length > 0 ? theme.text : theme.border }}>↩</button>
          <button onClick={clearDraw} disabled={strokes.length === 0}
            style={{ padding: "4px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${theme.border}`, background: theme.card, color: strokes.length > 0 ? PASTEL.coral : theme.border }}>🗑</button>
        </div>
      )}

      {/* Diary page */}
      <div style={{
        minHeight: 320, borderRadius: 16, position: "relative", overflow: "hidden",
        background: theme.card, border: `1px solid ${theme.border}`,
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${theme.border}40 31px, ${theme.border}40 32px)`,
        backgroundPosition: "0 20px",
      }}>
        {/* Text layer */}
        <div style={{ padding: 20, position: "relative", zIndex: 1, pointerEvents: drawMode ? "none" : "auto" }}>
          {editing && !drawMode ? (
            <textarea value={text} onChange={e => setText(e.target.value)}
              style={{ width: "100%", minHeight: 280, border: "none", background: "transparent", color: theme.text, fontSize: 14, lineHeight: "32px", fontFamily: "'Noto Serif KR', serif", resize: "none", outline: "none" }}
              placeholder="오늘 공부한 내용을 적어보세요..." autoFocus />
          ) : (
            <div onClick={() => canEdit && !drawMode && setEditing(true)}
              style={{ fontSize: 14, lineHeight: "32px", color: text ? theme.text : theme.textSec, whiteSpace: "pre-wrap", minHeight: 280, cursor: canEdit ? "text" : "default" }}>
              {text || (canEdit ? "터치해서 작성하기..." : "작성한 내용이 없어요")}
            </div>
          )}
        </div>

        {/* Drawing canvas overlay */}
        <canvas ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: drawMode ? 10 : 2, touchAction: "none", pointerEvents: drawMode ? "auto" : "none" }}
          onMouseDown={onDrawStart} onMouseMove={onDrawMove} onMouseUp={onDrawEnd} onMouseLeave={onDrawEnd}
          onTouchStart={onDrawStart} onTouchMove={onDrawMove} onTouchEnd={onDrawEnd} />
      </div>

      {/* Action buttons */}
      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {/* Toggle draw mode */}
          <button onClick={() => { setDrawMode(!drawMode); if (editing) setEditing(false); playSfx("click"); }}
            style={{ padding: "10px 14px", borderRadius: 12, border: drawMode ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`, background: drawMode ? `${PASTEL.coral}10` : theme.card, color: drawMode ? PASTEL.coral : theme.text, fontSize: 13, cursor: "pointer", fontWeight: drawMode ? 700 : 400 }}>
            ✏️ {drawMode ? "그리는 중" : "그리기"}
          </button>
          {!drawMode && !editing && (
            <button onClick={() => setEditing(true)} style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 13, cursor: "pointer" }}>📝 글쓰기</button>
          )}
          <button onClick={save} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: PASTEL.coral, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💾 저장</button>
        </div>
      )}

      {/* Recent entries */}
      {sortedDates.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 8 }}>최근 기록</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sortedDates.slice(0, 14).map(d => {
              const entry = diary.find(dd => dd.date === d);
              const hasDrawing = entry?.strokes?.length > 0;
              return (
                <button key={d} onClick={() => setViewDate(d)} style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 10, cursor: "pointer",
                  border: viewDate === d ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
                  background: viewDate === d ? `${PASTEL.coral}10` : theme.card,
                  color: d === today ? PASTEL.coral : theme.text,
                }}>{d.slice(5)} {hasDrawing ? "🎨" : ""}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Homework Tab =====
function HomeworkTab({ theme, homework, setHomework, playSfx, showMsg }) {
  const pending = homework.filter(h => h.status === "assigned" || h.status === "in_progress");
  const completed = homework.filter(h => h.status === "completed");

  const startHomework = (id) => {
    setHomework(prev => prev.map(h => h.id === id ? { ...h, status: "in_progress", startedAt: Date.now() } : h));
    playSfx("click");
  };
  const completeHomework = (id, answer) => {
    setHomework(prev => prev.map(h => h.id === id ? { ...h, status: "completed", completedAt: Date.now(), answer } : h));
    playSfx("success"); showMsg("숙제 완료!", 1500);
  };

  const [expandedId, setExpandedId] = useState(null);
  const [answerText, setAnswerText] = useState("");

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      {/* Pending homework - pinned at top */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PASTEL.coral, marginBottom: 8 }}>📌 해야 할 숙제 ({pending.length})</div>
          {pending.map(hw => {
            const isExpanded = expandedId === hw.id;
            return (
              <div key={hw.id} style={{
                marginBottom: 8, borderRadius: 14, overflow: "hidden",
                border: `2px solid ${PASTEL.coral}40`, background: `${PASTEL.coral}04`,
              }}>
                <button onClick={() => { setExpandedId(isExpanded ? null : hw.id); setAnswerText(""); }}
                  style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{hw.problemType || "수학 문제"}</div>
                    <div style={{ fontSize: 10, color: theme.textSec }}>
                      {dateStr(hw.assignedAt)} 출제 · {hw.status === "in_progress" ? "🔄 작성 중" : "⏳ 대기"}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: theme.textSec }}>{isExpanded ? "▲" : "▼"}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: "0 14px 14px", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ padding: 12, borderRadius: 10, background: theme.bg, marginBottom: 10, fontSize: 13, lineHeight: 2, color: theme.text }}>
                      {hw.problemText || "문제를 확인하세요"}
                    </div>
                    {hw.teacherResponse && (
                      <div style={{ padding: 10, borderRadius: 10, background: `${PASTEL.sky}08`, border: `1px solid ${PASTEL.sky}20`, marginBottom: 10, fontSize: 12, color: theme.text }}>
                        <div style={{ fontSize: 10, color: PASTEL.sky, fontWeight: 700, marginBottom: 4 }}>선생님 풀이</div>
                        {hw.teacherResponse}
                      </div>
                    )}
                    <textarea value={answerText} onChange={e => setAnswerText(e.target.value)}
                      placeholder="답을 적어주세요..."
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13, minHeight: 80, resize: "vertical", boxSizing: "border-box", fontFamily: "'Noto Serif KR', serif" }} />
                    <button onClick={() => { if (!answerText.trim()) { showMsg("답을 적어주세요!", 1500); return; } completeHomework(hw.id, answerText); setExpandedId(null); }}
                      style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 12, border: "none", background: PASTEL.coral, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      ✅ 숙제 제출
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 8 }}>✅ 완료한 숙제 ({completed.length})</div>
      {completed.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 20 }}>아직 없어요</p>}
      {completed.map(hw => (
        <div key={hw.id} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 12, background: theme.card, border: `1px solid ${PASTEL.mint}30` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{hw.problemType || "수학 문제"}</div>
          <div style={{ fontSize: 10, color: PASTEL.mint }}>✅ {dateStr(hw.completedAt)} 완료</div>
        </div>
      ))}

      {pending.length === 0 && completed.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: theme.textSec }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
          <p style={{ fontSize: 12 }}>숙제가 없어요!</p>
        </div>
      )}
    </div>
  );
}

// ===== Notification Tab =====
function NotifTab({ theme, notifications, setNotifications, dndStart, dndEnd, setDndStart, setDndEnd, playSfx }) {
  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); playSfx("click"); };

  return (
    <div style={{ padding: "12px 16px", animation: "fadeIn 0.3s ease" }}>
      {/* DND Settings */}
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

      {/* Notifications */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: theme.textSec }}>알림 ({notifications.length})</span>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} style={{ fontSize: 10, color: PASTEL.sky, background: "none", border: "none", cursor: "pointer" }}>모두 읽음</button>
        )}
      </div>
      {notifications.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 30 }}>알림이 없어요</p>}
      {notifications.map(n => (
        <button key={n.id} onClick={() => markRead(n.id)} style={{
          width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: 12,
          background: n.read ? theme.card : `${PASTEL.sky}06`, border: `1px solid ${n.read ? theme.border : PASTEL.sky + "30"}`,
          cursor: "pointer",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
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

// ===== Main Student Home Screen =====
export function StudentHomeScreenInner({ theme, setScreen, playSfx, showMsg, user, isAdminPreview, exitPreview,
  archive, setArchive, diary, setDiary, homework, setHomework, notifications, setNotifications,
  dndStart, dndEnd, setDndStart, setDndEnd }) {

  const [tab, setTab] = useState("home");
  const unreadNotif = notifications.filter(n => !n.read).length;
  const pendingHw = homework.filter(h => h.status !== "completed").length;

  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Admin preview bar */}
      {isAdminPreview && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: `${PASTEL.coral}15`, borderBottom: `1px solid ${PASTEL.coral}30` }}>
          <span style={{ fontSize: 11, color: PASTEL.coral, fontWeight: 700 }}>👁️ 학생 모드 미리보기</span>
          <button onClick={exitPreview} style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>🚪 나가기</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {tab === "home" && <HomeTab theme={theme} user={user} setScreen={setScreen} playSfx={playSfx} homework={homework} notifications={notifications} />}
        {tab === "archive" && <ArchiveTab theme={theme} archive={archive} setArchive={setArchive} playSfx={playSfx} />}
        {tab === "diary" && <DiaryTab theme={theme} diary={diary} setDiary={setDiary} playSfx={playSfx} />}
        {tab === "homework" && <HomeworkTab theme={theme} homework={homework} setHomework={setHomework} playSfx={playSfx} showMsg={showMsg} />}
        {tab === "notif" && <NotifTab theme={theme} notifications={notifications} setNotifications={setNotifications} dndStart={dndStart} dndEnd={dndEnd} setDndStart={setDndStart} setDndEnd={setDndEnd} playSfx={playSfx} />}
      </div>

      {/* Bottom tab bar */}
      <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${theme.border}`, background: theme.card, paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
        {TABS.map(t => {
          const isActive = tab === t.key;
          const badge = t.key === "notif" ? unreadNotif : t.key === "homework" ? pendingHw : 0;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); playSfx("click"); }}
              style={{ flex: 1, padding: "10px 0 8px", border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
              <span style={{ fontSize: 18, filter: isActive ? "none" : "grayscale(0.8)", opacity: isActive ? 1 : 0.5 }}>{t.icon}</span>
              <span style={{ fontSize: 9, color: isActive ? PASTEL.coral : theme.textSec, fontWeight: isActive ? 700 : 400 }}>{t.label}</span>
              {badge > 0 && <div style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", width: 16, height: 16, borderRadius: 8, background: PASTEL.coral, color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function renderStudentHomeScreen(ctx) {
  return <StudentHomeScreenInner {...ctx} />;
}
