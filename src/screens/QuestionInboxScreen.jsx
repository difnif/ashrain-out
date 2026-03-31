import { useState, useRef } from "react";
import { PASTEL } from "../config";

function dateStr(d) { return d ? new Date(typeof d === "object" && d.seconds ? d.seconds * 1000 : d).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; }

export function QuestionInboxScreenInner({ theme, setScreen, playSfx, showMsg,
  helpRequests, setHelpRequests, homework, setHomework, notifications, setNotifications, members }) {

  const [filter, setFilter] = useState("all"); // all|pending|answered
  const [studentFilter, setStudentFilter] = useState(null);
  const [chapterFilter, setChapterFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState(null);
  const fileRef = useRef(null);

  const filtered = helpRequests.filter(r => {
    if (filter === "pending" && r.status === "answered") return false;
    if (filter === "answered" && r.status !== "answered") return false;
    if (studentFilter && r.userId !== studentFilter) return false;
    if (chapterFilter && r.grade !== chapterFilter) return false;
    return true;
  }).sort((a, b) => {
    const ta = a.timestamp?.seconds || a.timestamp || 0;
    const tb = b.timestamp?.seconds || b.timestamp || 0;
    return tb - ta;
  });

  const selected = selectedId ? helpRequests.find(r => r.id === selectedId) : null;
  const uniqueStudents = [...new Set(helpRequests.map(r => r.userId))];
  const uniqueGrades = [...new Set(helpRequests.map(r => r.grade).filter(Boolean))];

  const handleReply = () => {
    if (!replyText.trim()) { showMsg("답변을 입력해주세요", 1500); return; }
    setHelpRequests(prev => prev.map(r => r.id === selectedId ? {
      ...r, status: "answered", response: replyText, responseImage: replyImage, respondedAt: Date.now()
    } : r));
    // Send notification to student
    setNotifications(prev => [...prev, {
      id: `notif-${Date.now()}`, userId: selected.userId,
      title: "📩 선생님 답변 도착!", message: `"${selected.type || "수학 문제"}" 풀이가 왔어요`,
      time: Date.now(), read: false, type: "response", linkedId: selectedId,
    }]);
    setReplyText(""); setReplyImage(null);
    playSfx("success"); showMsg("답변 전송 완료!", 1500);
  };

  const assignHomework = (req) => {
    const newHw = {
      id: `hw-${Date.now()}`, studentId: req.userId, fromRequestId: req.id,
      problemText: req.problemText, problemType: req.type,
      teacherResponse: req.response || "",
      assignedAt: Date.now(), status: "assigned",
    };
    setHomework(prev => [...prev, newHw]);
    setNotifications(prev => [...prev, {
      id: `notif-hw-${Date.now()}`, userId: req.userId,
      title: "📝 새 숙제!", message: `"${req.type || "수학 문제"}" 복습 숙제가 나왔어요`,
      time: Date.now(), read: false, type: "homework",
    }]);
    playSfx("success"); showMsg("숙제 출제 완료!", 1500);
  };

  const handleReplyImage = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setReplyImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Detail view
  if (selected) {
    const deepStep = selected.stuckAtStep != null ? selected.analysisResult?.steps?.[selected.stuckAtStep] : null;
    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 목록</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text }}>{selected.userName}의 질문</span>
          <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10, background: selected.status === "answered" ? `${PASTEL.mint}15` : `${PASTEL.coral}15`, color: selected.status === "answered" ? PASTEL.mint : PASTEL.coral }}>
            {selected.status === "answered" ? "답변완료" : "대기중"}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Problem info */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${PASTEL.coral}12`, color: PASTEL.coral }}>{selected.type || "미분류"}</span>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${PASTEL.sky}12`, color: PASTEL.sky }}>{selected.grade} · {dateStr(selected.timestamp)}</span>
          </div>
          {/* Problem text */}
          <div style={{ padding: 14, borderRadius: 14, background: theme.card, border: `1px solid ${theme.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13, lineHeight: 2, color: theme.text }}>{selected.problemText}</div>
          </div>
          {/* Where stuck */}
          {selected.stuckAtStep != null && (
            <div style={{ padding: 12, borderRadius: 12, background: `${PASTEL.coral}06`, border: `1.5px solid ${PASTEL.coral}30`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: PASTEL.coral, marginBottom: 4 }}>😕 여기서 막혔어요 (STEP {selected.stuckAtStep + 1})</div>
              <div style={{ fontSize: 13, color: theme.text }}>{selected.stuckStepTitle}</div>
              {selected.stuckStepExplain && <div style={{ fontSize: 11, color: theme.textSec, marginTop: 4 }}>{selected.stuckStepExplain}</div>}
            </div>
          )}
          {/* Response */}
          {selected.response && (
            <div style={{ padding: 12, borderRadius: 12, background: `${PASTEL.mint}06`, border: `1px solid ${PASTEL.mint}30`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: PASTEL.mint, marginBottom: 4 }}>✅ 내 답변</div>
              <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.8 }}>{selected.response}</div>
              {selected.responseImage && <img src={selected.responseImage} alt="" style={{ width: "100%", borderRadius: 10, marginTop: 8 }} />}
            </div>
          )}
          {/* Reply form */}
          {selected.status !== "answered" && (
            <div style={{ padding: 14, borderRadius: 14, background: theme.card, border: `1.5px solid ${PASTEL.sky}30` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: PASTEL.sky, marginBottom: 8 }}>💬 답변하기</div>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="풀이나 힌트를 적어주세요..."
                style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 13, minHeight: 100, resize: "vertical", boxSizing: "border-box", fontFamily: "'Noto Serif KR', serif" }} />
              <input ref={fileRef} type="file" accept="image/*" onChange={handleReplyImage} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.card, color: theme.textSec, fontSize: 11, cursor: "pointer" }}>📎 사진 첨부</button>
                {replyImage && <span style={{ fontSize: 10, color: PASTEL.mint }}>✓ 첨부됨</span>}
              </div>
              <button onClick={handleReply} style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 12, border: "none", background: PASTEL.sky, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📨 답변 보내기</button>
            </div>
          )}
          {/* Homework assign */}
          {selected.status === "answered" && (
            <button onClick={() => assignHomework(selected)} style={{
              width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${PASTEL.lavender}`,
              background: `${PASTEL.lavender}08`, color: PASTEL.lavender, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>📝 이 문제를 숙제로 내기</button>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => { playSfx("click"); setScreen("admin"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 관리자</button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text }}>📬 질문함</span>
        <span style={{ fontSize: 10, color: theme.textSec }}>{helpRequests.filter(r => r.status !== "answered").length}건 대기</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {[["all", "전체"], ["pending", "대기중"], ["answered", "답변완료"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 10, cursor: "pointer", border: filter === k ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`, background: filter === k ? `${PASTEL.coral}10` : theme.card, color: theme.text }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {uniqueStudents.map(uid => {
            const m = members?.find(mm => mm.id === uid);
            return (
              <button key={uid} onClick={() => setStudentFilter(studentFilter === uid ? null : uid)} style={{ padding: "4px 10px", borderRadius: 16, fontSize: 9, cursor: "pointer", border: studentFilter === uid ? `2px solid ${PASTEL.sky}` : `1px solid ${theme.border}`, background: studentFilter === uid ? `${PASTEL.sky}10` : theme.card, color: theme.text }}>
                {m?.name || uid}
              </button>
            );
          })}
        </div>

        {/* List */}
        {filtered.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 12, padding: 30 }}>질문이 없어요</p>}
        {filtered.map(req => (
          <button key={req.id} onClick={() => setSelectedId(req.id)} style={{
            width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 8, borderRadius: 14,
            background: theme.card, border: `1px solid ${req.status === "answered" ? PASTEL.mint + "30" : PASTEL.coral + "30"}`,
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>{req.userName || "익명"}</span>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: `${PASTEL.coral}10`, color: PASTEL.coral }}>{req.type || "미분류"}</span>
                </div>
                <div style={{ fontSize: 11, color: theme.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                  {req.problemText?.slice(0, 50) || "사진 문제"}
                </div>
                <div style={{ fontSize: 9, color: theme.textSec, marginTop: 4 }}>
                  {dateStr(req.timestamp)}
                  {req.stuckAtStep != null && <span style={{ color: PASTEL.coral }}> · STEP {req.stuckAtStep + 1}에서 막힘</span>}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: req.status === "answered" ? `${PASTEL.mint}12` : `${PASTEL.coral}12`, color: req.status === "answered" ? PASTEL.mint : PASTEL.coral, flexShrink: 0 }}>
                {req.status === "answered" ? "✅" : "⏳"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function renderQuestionInboxScreen(ctx) {
  return <QuestionInboxScreenInner {...ctx} />;
}
