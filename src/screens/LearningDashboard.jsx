import { useState } from "react";
import { PASTEL } from "../config";

function dateStr(d) { return d ? new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; }
function todayKey() { return new Date().toISOString().slice(0, 10); }

export function LearningDashboardInner({ theme, setScreen, playSfx, showMsg,
  members, archive, homework, setHomework, notifications, setNotifications, helpRequests }) {

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewDate, setViewDate] = useState(todayKey());
  const [detailItem, setDetailItem] = useState(null);

  const students = (members || []).filter(m => m.role === "student" || m.role === "external");
  const today = todayKey();

  // Per-student stats
  const getStudentStats = (uid) => {
    const items = (archive || []).filter(a => a.userId === uid);
    const todayItems = items.filter(a => a.createdAt && new Date(a.createdAt).toISOString().slice(0, 10) === today);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekItems = items.filter(a => a.createdAt && a.createdAt > weekAgo);
    const questions = (helpRequests || []).filter(r => r.userId === uid);
    const pendingQ = questions.filter(r => r.status !== "answered").length;
    return { total: items.length, today: todayItems.length, week: weekItems.length, questions: questions.length, pendingQ };
  };

  // Student's archive filtered by date
  const getStudentArchiveByDate = (uid, date) => {
    return (archive || []).filter(a => a.userId === uid && a.createdAt && new Date(a.createdAt).toISOString().slice(0, 10) === date);
  };

  // Assign as homework
  const assignHomework = (item, studentId) => {
    setHomework(prev => [...prev, {
      id: `hw-${Date.now()}`, studentId,
      problemText: item.content?.problemText || item.preview || item.title,
      problemType: item.type || item.title,
      assignedAt: Date.now(), status: "assigned", reviewCount: 0,
      fromArchiveId: item.id,
    }]);
    setNotifications(prev => [...prev, {
      id: `notif-hw-${Date.now()}`, userId: studentId,
      title: "📝 새 숙제!", message: `"${item.type || item.title}" 복습 숙제`,
      time: Date.now(), read: false, type: "homework",
    }]);
    playSfx("success"); showMsg("숙제 출제 완료!", 1500);
  };

  // Detail view of single archive item
  if (detailItem) {
    const item = (archive || []).find(a => a.id === detailItem);
    if (!item) { setDetailItem(null); return null; }
    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => setDetailItem(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 목록</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text }}>{item.title}</span>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${PASTEL.coral}12`, color: PASTEL.coral }}>{item.type}</span>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${PASTEL.sky}12`, color: PASTEL.sky }}>{dateStr(item.createdAt)}</span>
            {item.isQuestion && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${PASTEL.lavender}12`, color: PASTEL.lavender }}>🙋 질문</span>}
          </div>

          {item.content?.problemText && (
            <div style={{ padding: 14, borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12, fontSize: 13, lineHeight: 2, whiteSpace: "pre-line", color: theme.text }}>
              {item.content.problemText}
            </div>
          )}
          {item.content?.steps?.map((step, i) => (
            <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 10, background: `${PASTEL[step.color] || PASTEL.coral}08`, fontSize: 12, color: theme.text }}>
              <b style={{ color: PASTEL[step.color] || PASTEL.coral }}>STEP {i + 1}</b> {step.title}: {step.explain}
            </div>
          ))}
          {item.content?.equation && (
            <div style={{ padding: 12, borderRadius: 12, background: `${PASTEL.mint}08`, border: `1px solid ${PASTEL.mint}25`, fontSize: 14, fontWeight: 700, textAlign: "center", color: theme.text, marginTop: 10 }}>
              {item.content.equation}
            </div>
          )}
          {item.preview && !item.content?.problemText && (
            <div style={{ padding: 14, borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, fontSize: 13, color: theme.text }}>{item.preview}</div>
          )}

          <button onClick={() => { assignHomework(item, item.userId); setDetailItem(null); }}
            style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 14, border: "none", background: PASTEL.coral, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            📝 이 문제를 숙제로 내기
          </button>
        </div>
      </div>
    );
  }

  // Student detail view
  if (selectedStudent) {
    const student = students.find(s => s.id === selectedStudent);
    if (!student) { setSelectedStudent(null); return null; }
    const dayArchive = getStudentArchiveByDate(selectedStudent, viewDate);
    const stats = getStudentStats(selectedStudent);

    // Get all dates this student has activity
    const allDates = [...new Set((archive || []).filter(a => a.userId === selectedStudent && a.createdAt)
      .map(a => new Date(a.createdAt).toISOString().slice(0, 10)))].sort().reverse();

    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => setSelectedStudent(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 전체</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text }}>{student.name}의 학습 현황</span>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { icon: "📚", label: "전체", value: stats.total, color: PASTEL.coral },
              { icon: "📅", label: "이번 주", value: stats.week, color: PASTEL.sky },
              { icon: "🙋", label: "질문", value: stats.questions, color: PASTEL.lavender },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, background: theme.card, border: `1px solid ${theme.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 9, color: theme.textSec }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Date nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()-1); setViewDate(d.toISOString().slice(0,10)); }}
              style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: theme.text }}>◀</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: viewDate === today ? PASTEL.coral : theme.text }}>
              {new Date(viewDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
              {viewDate === today && " (오늘)"}
            </span>
            <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate()+1); const n = d.toISOString().slice(0,10); if(n<=today) setViewDate(n); }}
              style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: viewDate < today ? theme.text : theme.border }}>▶</button>
          </div>

          {/* Date pills */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            {allDates.slice(0, 14).map(d => (
              <button key={d} onClick={() => setViewDate(d)} style={{
                padding: "4px 8px", borderRadius: 6, fontSize: 9, cursor: "pointer",
                border: viewDate === d ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
                background: viewDate === d ? `${PASTEL.coral}10` : theme.card, color: theme.text,
              }}>
                {d.slice(5)} ({getStudentArchiveByDate(selectedStudent, d).length})
              </button>
            ))}
          </div>

          {/* Day's archive */}
          <div style={{ fontSize: 11, color: theme.textSec, marginBottom: 8 }}>{viewDate} 학습 ({dayArchive.length}건)</div>
          {dayArchive.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 20 }}>이 날은 학습 기록이 없어요</p>}
          {dayArchive.map(item => (
            <button key={item.id} onClick={() => { setDetailItem(item.id); playSfx("click"); }}
              style={{ width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 14 }}>{item.type?.includes("문제") || item.type === "질문" ? "📝" : "📐"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{item.title}</span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>
                    {dateStr(item.createdAt)} · {item.type}
                    {item.isQuestion && " · 🙋 질문"}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: theme.textSec }}>▶</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Student list
  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => { playSfx("click"); setScreen("admin"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 관리자</button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text }}>📊 학습 현황</span>
        <span style={{ width: 40 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <p style={{ fontSize: 12, color: theme.textSec, marginBottom: 12 }}>학생을 선택하면 학습 기록을 열람하고 숙제를 낼 수 있어요.</p>

        {students.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 30 }}>등록된 학생이 없어요</p>}

        {students.map(student => {
          const stats = getStudentStats(student.id);
          return (
            <button key={student.id} onClick={() => { setSelectedStudent(student.id); setViewDate(today); playSfx("click"); }}
              style={{ width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 8, borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{student.name}</div>
                  <div style={{ fontSize: 10, color: theme.textSec }}>
                    @{student.id} · {student.role === "student" ? "수강생" : "외부생"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: stats.today > 0 ? PASTEL.coral : theme.textSec }}>{stats.today}</div>
                    <div style={{ fontSize: 8, color: theme.textSec }}>오늘</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: stats.week > 0 ? PASTEL.sky : theme.textSec }}>{stats.week}</div>
                    <div style={{ fontSize: 8, color: theme.textSec }}>이번 주</div>
                  </div>
                  {stats.pendingQ > 0 && (
                    <div style={{ padding: "2px 8px", borderRadius: 10, background: PASTEL.coral, color: "white", fontSize: 10, fontWeight: 700 }}>
                      🙋 {stats.pendingQ}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function renderLearningDashboard(ctx) {
  return <LearningDashboardInner {...ctx} />;
}
