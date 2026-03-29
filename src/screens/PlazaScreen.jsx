import { PASTEL } from "../config";

export function renderPlazaScreen(ctx) {
  const { theme, user, userRole, members, setScreen, showMsg, playSfx, hasPerm,
    chatMsg, setChatMsg, chatLog, setChatLog, chatEndRef, chatNotif, setChatNotif,
    plazaCalls, callUser, ROLES, themeKey } = ctx;

    const sendChat = () => {
      if (!chatMsg.trim()) return;
      const newMsg = { user: user?.nickname || user?.name || "익명", role: userRole, text: chatMsg.trim(), time: Date.now() };
      const updated = [...chatLog, newMsg].slice(-100);
      setChatLog(updated);
      localStorage.setItem("ar_chat", JSON.stringify(updated));
      setChatMsg("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    // Auto-delete messages older than 10 minutes
    const now = Date.now();
    const filteredLog = chatLog.filter(m => now - m.time < 10 * 60 * 1000);
    if (filteredLog.length !== chatLog.length) {
      setChatLog(filteredLog);
      localStorage.setItem("ar_chat", JSON.stringify(filteredLog));
    }

    // Online presence + delete
    const myName = user?.nickname || user?.name || "익명";

    const onlineUsers = (() => {
      try {
        const online = JSON.parse(localStorage.getItem("ar_online") || "{}");
        return Object.entries(online).filter(([, v]) => Date.now() - v.time < 30000).map(([name, v]) => ({ name, role: v.role }));
      } catch { return []; }
    })();

    const deleteChat = (time) => {
      const updated = chatLog.filter(m => m.time !== time);
      setChatLog(updated);
      localStorage.setItem("ar_chat", JSON.stringify(updated));
    };

    // Check if teacher is online
    const teacherMember = members.find(m => m.role === "admin");
    const teacherName = teacherMember ? (teacherMember.nickname || teacherMember.name) : "선생님";
    const teacherOnline = onlineUsers.some(u => u.role === "admin");

    // Recent calls (max 10, last 10 min)
    const recentCalls = plazaCalls.filter(c => now - c.time < 10 * 60 * 1000).slice(-10);

    const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };

    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => { playSfx("click"); setScreen("menu"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 메뉴</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>광장</span>
          <span style={{ fontSize: 11, color: PASTEL.mint }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: PASTEL.mint, marginRight: 4 }} />
            {onlineUsers.length}
          </span>
        </div>

        {/* Online users bar — clickable to call */}
        <div style={{ flexShrink: 0, padding: "8px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: recentCalls.length > 0 ? 6 : 0 }}>
            {/* Teacher status */}
            {teacherOnline ? (
              <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10, background: `${PASTEL.coral}15`, color: PASTEL.coral, fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: PASTEL.mint, marginRight: 3 }} />
                선생님
              </span>
            ) : (
              <button onClick={() => {
                if (!hasPerm("plaza_call")) { showMsg("호출 권한이 없어요", 1500); return; }
                callUser(teacherName);
                showMsg(`${teacherName}을(를) 호출했어요!`, 2000);
                // Request notification permission + trigger
                if ("Notification" in window && Notification.permission === "default") {
                  Notification.requestPermission();
                }
              }} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 10, border: `1px dashed ${PASTEL.coral}`,
                background: `${PASTEL.coral}08`, color: PASTEL.coral, fontWeight: 700, cursor: "pointer",
              }}>
                📢 선생님 호출
              </button>
            )}
            {/* Other online users */}
            {onlineUsers.filter(u => u.role !== "admin").map((u, i) => (
              <button key={i} onClick={() => {
                if (!hasPerm("plaza_call")) return;
                callUser(u.name);
                showMsg(`${u.name}님을 호출했어요!`, 1500);
              }} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 10, border: "none", cursor: hasPerm("plaza_call") ? "pointer" : "default",
                background: `${roleColors[u.role] || theme.textSec}15`,
                color: roleColors[u.role] || theme.textSec, fontWeight: 600,
              }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 3, background: PASTEL.mint, marginRight: 3 }} />
                {u.name}
              </button>
            ))}
          </div>
          {/* Call stack */}
          {recentCalls.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {recentCalls.map((c, i) => (
                <span key={i} style={{ fontSize: 9, color: PASTEL.coral, background: `${PASTEL.coral}08`, padding: "2px 6px", borderRadius: 6 }}>
                  {c.from} → {c.to}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <style>{`
          .plaza-content { position: relative; }
          @media print { .plaza-content { display: none !important; } }
        `}</style>

        {/* Chat area */}
        <div className="plaza-content" style={{ flex: 1, overflowY: "auto", padding: "12px 16px", WebkitOverflowScrolling: "touch" }}>
          {filteredLog.length === 0 && (
            <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 40 }}>
              아직 대화가 없어요. 첫 메시지를 보내보세요!
              <br /><span style={{ fontSize: 10 }}>메시지는 10분 후 자동 삭제됩니다</span>
            </p>
          )}
          {filteredLog.map((msg, i) => {
            const isMe = msg.user === myName;
            const remaining = Math.max(0, Math.ceil((10 * 60 * 1000 - (now - msg.time)) / 60000));
            return (
              <div key={`${msg.time}-${i}`} style={{
                display: "flex", flexDirection: isMe ? "row-reverse" : "row",
                marginBottom: 8, animation: "fadeIn 0.3s ease",
              }}>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
                  background: isMe ? `${PASTEL.coral}20` : theme.card,
                  border: `1px solid ${isMe ? PASTEL.coral : theme.border}`,
                }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4,
                      background: `${roleColors[msg.role] || theme.textSec}20`,
                      color: roleColors[msg.role] || theme.textSec,
                    }}>{ROLES[msg.role] || ""}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: theme.text }}>{msg.user}</span>
                    <span style={{ fontSize: 9, color: theme.textSec }}>
                      {new Date(msg.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {remaining <= 3 && <span style={{ fontSize: 8, color: PASTEL.coral }}>{remaining}분</span>}
                  </div>
                  <p style={{ fontSize: 13, color: theme.text, margin: 0, lineHeight: 1.5, fontFamily: "'Noto Serif KR', serif" }}>
                    {msg.text}
                  </p>
                  {isMe && (
                    <button onClick={() => deleteChat(msg.time)} style={{
                      background: "none", border: "none", color: theme.textSec, fontSize: 9,
                      cursor: "pointer", padding: "2px 0", marginTop: 2, textAlign: "right", display: "block",
                    }}>삭제</button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input — fixed at bottom, outside scroll */}
        <div style={{
          flexShrink: 0, display: "flex", gap: 8, padding: "12px 16px",
          borderTop: `1px solid ${theme.border}`, background: theme.card,
        }}>
          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
            placeholder="메시지를 입력하세요..."
            autoComplete="off" autoCorrect="off"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${theme.border}`, background: theme.bg,
              color: theme.text, fontSize: 13, fontFamily: "'Noto Serif KR', serif",
              WebkitUserSelect: "text", userSelect: "text",
            }} />
          <button onClick={sendChat} style={{
            padding: "10px 18px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
            color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>전송</button>
        </div>
      </div>
    );

}
