import { PASTEL, TONES } from "../config";

export function renderAdminScreen(ctx) {
  const { theme, setScreen, playSfx, signupRequests, ScreenWrap, MenuGrid } = ctx;
    const adminItems = [
      { icon: "💬", label: "대사 스크립트", desc: "말투별 대사 수정", action: () => setScreen("admin-scripts") },
      { icon: "🔊", label: "효과음 관리", desc: "모드별 효과음 설정", disabled: true },
      { icon: "👤", label: "회원 관리", desc: "권한 · 계정 · 비밀번호", action: () => setScreen("admin-students") },
      { icon: "🔐", label: "권한 설정", desc: "등급별 접근 권한 관리", action: () => setScreen("admin-perms") },
      { icon: signupRequests.length > 0 ? "🔔" : "📋", label: "가입 신청", desc: signupRequests.length > 0 ? `${signupRequests.length}건 대기 중` : "신청 관리 · 자동승인", action: () => setScreen("admin-signups") },
      { icon: "📊", label: "통계/랭킹", desc: "진행 현황 확인", disabled: true },
      { icon: "📐", label: "앵글 데이터", desc: "스트로크 수집 · 내보내기", action: () => setScreen("admin-angles") },
    ];
    return (
      <ScreenWrap title="관리자" back="메뉴" backTo="menu">
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <MenuGrid items={adminItems} />
        </div>
      </ScreenWrap>
    );

}

export function renderAdminStudentsScreen(ctx) {
  const { theme, user, userRole, members, setMembers, setScreen, playSfx, showMsg,
    canEditMember, updateMember, deleteMember, editingMemberId, setEditingMemberId,
    newMemberForm, setNewMemberForm, memberFilter, setMemberFilter, students,
    ROLES } = ctx;

    const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };
    const inputStyle = { flex: "1 1 70px", padding: "9px", borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box", WebkitUserSelect: "text", userSelect: "text" };

    const addMember = () => {
      if (!newMemberForm.id || !newMemberForm.name) return;
      if (members.find(m => m.id === newMemberForm.id)) { showMsg("이미 존재하는 아이디!", 2000); return; }
      setMembers(prev => [...prev, { ...newMemberForm, nickname: "" }]);
      setNewMemberForm({ id: "", name: "", pw: "1234", role: "student" });
      playSfx("success");
    };

    const changeId = (oldId, newId) => {
      if (!newId.trim()) return;
      if (newId !== oldId && members.find(m => m.id === newId)) { showMsg("이미 존재하는 아이디!", 2000); return; }
      setMembers(prev => prev.map(m => m.id === oldId ? { ...m, id: newId } : m));
      setEditingMemberId(newId);
      // If changing own ID, update user too
      if (user?.id === oldId) {
        const u = { ...user, id: newId };
        localStorage.setItem("ar_user", JSON.stringify(u));
      }
    };

    const filtered = memberFilter === "all" ? members : members.filter(m => m.role === memberFilter);
    const isSelf = (m) => m.id === user?.id;

    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => { playSfx("click"); setScreen("admin"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 관리자</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>회원 관리</span>
          <span style={{ width: 40 }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
          {/* Add new member */}
          {userRole === "admin" && (
            <div style={{ background: theme.card, borderRadius: 16, border: `1.5px solid ${PASTEL.mint}`, padding: 14, marginBottom: 16, animation: "fadeIn 0.3s ease" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: PASTEL.mint, display: "block", marginBottom: 10 }}>+ 회원 추가</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input placeholder="이름" value={newMemberForm.name} onChange={e => setNewMemberForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                <input placeholder="아이디" value={newMemberForm.id} onChange={e => setNewMemberForm(p => ({ ...p, id: e.target.value }))} style={inputStyle} />
                <input placeholder="비밀번호" value={newMemberForm.pw} onChange={e => setNewMemberForm(p => ({ ...p, pw: e.target.value }))} style={inputStyle} />
                <select value={newMemberForm.role} onChange={e => setNewMemberForm(p => ({ ...p, role: e.target.value }))}
                  style={{ ...inputStyle, flex: "0 0 80px" }}>
                  <option value="student">수강생</option>
                  <option value="external">외부생</option>
                  <option value="assistant">조교</option>
                </select>
                <button onClick={addMember} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: PASTEL.mint, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>추가</button>
              </div>
            </div>
          )}

          {/* Role filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {[["all", "전체", null], ["admin", "관리자", PASTEL.coral], ["assistant", "조교", PASTEL.lavender], ["student", "수강생", PASTEL.sky], ["external", "외부생", PASTEL.sage]].map(([key, label, color]) => (
              <button key={key} onClick={() => setMemberFilter(key)} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 11,
                border: `1.5px solid ${memberFilter === key ? (color || theme.text) : theme.border}`,
                background: memberFilter === key ? `${color || theme.text}15` : theme.card,
                color: memberFilter === key ? (color || theme.text) : theme.textSec,
                cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
                fontWeight: memberFilter === key ? 700 : 400,
              }}>
                {label} ({key === "all" ? members.length : members.filter(m => m.role === key).length})
              </button>
            ))}
          </div>

          {/* Member list */}
          {filtered.map((m) => {
            const isEditing = editingMemberId === m.id;
            const editable = isSelf(m) || canEditMember(m.role);
            const rc = roleColors[m.role] || theme.textSec;
            return (
              <div key={m.id} style={{
                background: theme.card, borderRadius: 14, border: `1px solid ${isEditing ? rc : theme.border}`,
                padding: 12, marginBottom: 8, transition: "border-color 0.2s",
              }}>
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>이름</label>
                        <input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} style={{ ...inputStyle, width: "100%" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>아이디</label>
                        <input value={m.id}
                          onChange={e => changeId(m.id, e.target.value)}
                          style={{ ...inputStyle, width: "100%" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>닉네임</label>
                        <input value={m.nickname || ""} onChange={e => updateMember(m.id, { nickname: e.target.value })} style={{ ...inputStyle, width: "100%" }} placeholder="미설정" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: theme.textSec }}>비밀번호</label>
                        <input value={m.pw} onChange={e => updateMember(m.id, { pw: e.target.value })} style={{ ...inputStyle, width: "100%" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {userRole === "admin" && !isSelf(m) && (
                        <select value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })}
                          style={{ ...inputStyle, flex: "0 0 90px" }}>
                          <option value="admin">관리자</option>
                          <option value="assistant">조교</option>
                          <option value="student">수강생</option>
                          <option value="external">외부생</option>
                        </select>
                      )}
                      {isSelf(m) && <span style={{ fontSize: 10, color: PASTEL.coral }}>내 계정</span>}
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setEditingMemberId(null)} style={{
                        padding: "7px 14px", borderRadius: 8, border: "none", background: rc, color: "white", fontSize: 11, cursor: "pointer",
                      }}>저장</button>
                      {!isSelf(m) && userRole === "admin" && (
                        <button onClick={() => { deleteMember(m.id); setEditingMemberId(null); }} style={{
                          padding: "7px 14px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`, background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer",
                        }}>삭제</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div onClick={() => editable && setEditingMemberId(m.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: editable ? "pointer" : "default" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${rc}20`, color: rc, fontWeight: 700 }}>
                        {ROLES[m.role]}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: theme.textSec }}>@{m.id}</span>
                      {m.nickname && <span style={{ fontSize: 10, color: PASTEL.lavender }}>"{m.nickname}"</span>}
                      {isSelf(m) && <span style={{ fontSize: 9, color: PASTEL.coral, fontWeight: 700 }}>ME</span>}
                    </div>
                    {editable && <span style={{ fontSize: 11, color: theme.textSec }}>편집 ›</span>}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 40 }}>해당 회원이 없어요.</p>}
          <div style={{ height: 60 }} />
        </div>
      </div>
    );

}

export function renderAdminPermsScreen(ctx) {
  const { theme, setScreen, playSfx, rolePerms, setRolePerms, DEFAULT_PERMS,
    PERM_LABELS, PERM_GROUPS, ROLES } = ctx;
    const roleColors = { assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };
    const editRoles = ["assistant", "student", "external"];
    const getVal = (role, key) => {
      const custom = rolePerms[role];
      if (custom && custom[key] !== undefined) return custom[key];
      return DEFAULT_PERMS[role]?.[key] ?? false;
    };
    const togglePerm = (role, key) => {
      setRolePerms(prev => ({
        ...prev,
        [role]: { ...(prev[role] || {}), [key]: !getVal(role, key) },
      }));
    };
    const resetRole = (role) => {
      setRolePerms(prev => { const n = { ...prev }; delete n[role]; return n; });
      playSfx("pop");
    };

    return (
      <div style={{ height: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column", background: theme.bg, fontFamily: "'Noto Serif KR', serif" }}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => { playSfx("click"); setScreen("admin"); }} style={{ background: "none", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>← 관리자</button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Playfair Display', serif" }}>권한 설정</span>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
          <p style={{ fontSize: 11, color: theme.textSec, textAlign: "center", marginBottom: 16 }}>
            관리자는 항상 모든 권한을 가집니다
          </p>
          {editRoles.map(role => (
            <div key={role} style={{ background: theme.card, borderRadius: 16, border: `1.5px solid ${roleColors[role]}`, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: roleColors[role] }}>{ROLES[role]}</span>
                <button onClick={() => resetRole(role)} style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${theme.border}`,
                  background: "transparent", color: theme.textSec, fontSize: 10, cursor: "pointer",
                }}>기본값 복원</button>
              </div>
              {PERM_GROUPS.map(group => (
                <div key={group.label} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, marginBottom: 6 }}>{group.label}</p>
                  {group.keys.map(key => {
                    const on = getVal(role, key);
                    const isCustom = rolePerms[role]?.[key] !== undefined;
                    return (
                      <label key={key} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", marginBottom: 2,
                        borderRadius: 8, cursor: "pointer", background: on ? `${roleColors[role]}08` : "transparent",
                      }}>
                        <input type="checkbox" checked={on} onChange={() => togglePerm(role, key)}
                          style={{ width: 16, height: 16, accentColor: roleColors[role] }} />
                        <span style={{ fontSize: 12, color: theme.text, flex: 1 }}>{PERM_LABELS[key]}</span>
                        {isCustom && <span style={{ fontSize: 8, color: roleColors[role] }}>커스텀</span>}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
          <div style={{ height: 60 }} />
        </div>
      </div>
    );

}

export function renderAdminSignupsScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, signupRequests, autoApprove, setAutoApprove,
    approveSignup, rejectSignup, ROLES, ScreenWrap } = ctx;
    return (
      <ScreenWrap title="가입 신청 관리" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Auto-approve toggle */}
          <div style={{
            background: theme.card, borderRadius: 16, border: `1.5px solid ${autoApprove ? PASTEL.mint : theme.border}`,
            padding: 16, marginBottom: 20, animation: "fadeIn 0.3s ease",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: "'Noto Serif KR', serif" }}>
                자동 승인
              </span>
              <p style={{ fontSize: 11, color: theme.textSec, margin: "4px 0 0 0" }}>
                {autoApprove ? "신청 즉시 가입이 완료됩니다" : "관리자가 직접 승인해야 합니다"}
              </p>
            </div>
            <button onClick={() => setAutoApprove(!autoApprove)} style={{
              width: 52, height: 28, borderRadius: 14, border: "none",
              background: autoApprove ? PASTEL.mint : theme.lineLight,
              cursor: "pointer", position: "relative", transition: "background 0.3s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: "white",
                position: "absolute", top: 3,
                left: autoApprove ? 27 : 3, transition: "left 0.3s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>

          {/* Pending requests */}
          <label style={{ fontSize: 12, color: theme.textSec, marginBottom: 8, display: "block" }}>
            대기 중인 신청 ({signupRequests.length}건)
          </label>
          {signupRequests.length === 0 && (
            <div style={{
              textAlign: "center", padding: "40px 20px", color: theme.textSec,
              fontSize: 13, animation: "fadeIn 0.4s ease",
            }}>
              대기 중인 가입 신청이 없어요.
            </div>
          )}
          {signupRequests.map((req, i) => (
            <div key={req.id} style={{
              background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
              padding: 14, marginBottom: 10, animation: `fadeIn ${0.3 + i * 0.05}s ease`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{req.name}</span>
                  <span style={{ fontSize: 12, color: theme.textSec, marginLeft: 8 }}>@{req.id}</span>
                </div>
                <span style={{ fontSize: 10, color: theme.textSec }}>
                  {new Date(req.date).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveSignup(req.id)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  background: PASTEL.mint, color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Noto Serif KR', serif",
                }}>승인</button>
                <button onClick={() => rejectSignup(req.id)} style={{
                  padding: "10px 16px", borderRadius: 10,
                  border: `1px solid ${PASTEL.coral}`, background: "transparent",
                  color: PASTEL.coral, fontSize: 13, cursor: "pointer",
                  fontFamily: "'Noto Serif KR', serif",
                }}>거절</button>
              </div>
            </div>
          ))}

          {/* Approved students count */}
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 14,
            background: theme.bg, border: `1px solid ${theme.border}`,
            textAlign: "center", fontSize: 12, color: theme.textSec,
          }}>
            현재 등록된 학생: {students.length}명
          </div>
          <div style={{ height: 60 }} />
        </div>
      </ScreenWrap>
    );

}

export function renderAdminAnglesScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, collectedAngles, setCollectedAngles,
    angleCollectStroke, setAngleCollectStroke, angleOverlay, setAngleOverlay,
    angleCollectRef, recognizeAngle, ScreenWrap } = ctx;
    const svgW = 400, svgH = 400;
    const curResult = angleCollectStroke.length >= 6 ? recognizeAngle(angleCollectStroke) : null;

    const saveStroke = () => {
      if (angleCollectStroke.length < 6) return;
      const entry = {
        id: Date.now(),
        recognized: curResult?.angle || null,
        pointCount: angleCollectStroke.length,
        points: angleCollectStroke.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, t: p.t })),
        timestamp: new Date().toISOString(),
      };
      const updated = [...collectedAngles, entry];
      setCollectedAngles(updated);
      localStorage.setItem("ar_angle_data", JSON.stringify(updated));
      setAngleCollectStroke([]);
      playSfx("success");
    };

    const clearAll = () => {
      if (!window.confirm("전체 삭제하시겠어요?")) return;
      setCollectedAngles([]);
      localStorage.removeItem("ar_angle_data");
    };

    const exportData = () => {
      const json = JSON.stringify(collectedAngles, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `angle_data_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      playSfx("complete");
    };

    // Overlay drawing handlers — getBoundingClientRect for correct coords
    const overlayDown = (e) => {
      e.preventDefault();
      const svg = angleCollectRef.current;
      if (!svg) return;
      const src = e.touches ? e.touches[0] : e;
      const rect = svg.getBoundingClientRect();
      const x = ((src.clientX - rect.left) / rect.width) * svgW;
      const y = ((src.clientY - rect.top) / rect.height) * svgH;
      angleDrawingRef.current = true;
      setAngleCollectStroke([{ x, y, t: Date.now() }]);
    };
    const overlayMove = (e) => {
      if (!angleDrawingRef.current) return;
      e.preventDefault();
      const svg = angleCollectRef.current;
      if (!svg) return;
      const src = e.touches ? e.touches[0] : e;
      const rect = svg.getBoundingClientRect();
      const x = ((src.clientX - rect.left) / rect.width) * svgW;
      const y = ((src.clientY - rect.top) / rect.height) * svgH;
      setAngleCollectStroke(prev => [...prev, { x, y, t: Date.now() }]);
    };
    const overlayUp = () => { angleDrawingRef.current = false; };

    // Fullscreen overlay for drawing
    if (angleOverlay) {
      return (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: theme.bg, display: "flex", flexDirection: "column",
        }}>
          {/* Top bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, background: theme.card,
          }}>
            <button onClick={() => { setAngleOverlay(false); setAngleCollectStroke([]); angleDrawingRef.current = false; }} style={{
              background: "none", border: "none", color: theme.textSec, fontSize: 14, cursor: "pointer",
            }}>✕ 닫기</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: curResult ? PASTEL.mint : theme.text }}>
              {curResult ? `${curResult.angle.toFixed(1)}°` : "V자를 그려주세요"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setAngleCollectStroke([]); angleDrawingRef.current = false; }} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${theme.border}`,
                background: theme.card, color: theme.textSec, fontSize: 12, cursor: "pointer",
              }}>↻</button>
              <button onClick={() => { saveStroke(); }} disabled={angleCollectStroke.length < 6} style={{
                padding: "6px 16px", borderRadius: 8, border: "none",
                background: angleCollectStroke.length >= 6 ? PASTEL.mint : theme.lineLight,
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>저장</button>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, touchAction: "none" }}>
            <svg ref={angleCollectRef} width="100%" height="100%"
              viewBox={`0 0 ${svgW} ${svgH}`}
              style={{ touchAction: "none", cursor: "crosshair", display: "block" }}
              preserveAspectRatio="xMidYMid meet"
              onMouseDown={overlayDown} onMouseMove={overlayMove} onMouseUp={overlayUp}
              onTouchStart={overlayDown} onTouchMove={overlayMove} onTouchEnd={overlayUp}
            >
              {[...Array(10)].map((_, i) => [...Array(10)].map((_, j) => (
                <circle key={`${i}${j}`} cx={20+i*40} cy={20+j*40} r={0.8} fill={theme.lineLight} opacity={0.3} />
              )))}
              {angleCollectStroke.length > 1 && (
                <polyline points={angleCollectStroke.map(p => `${p.x},${p.y}`).join(" ")}
                  fill="none" stroke={PASTEL.coral} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              )}
              {curResult && (
                <>
                  <circle cx={curResult.vertex.x} cy={curResult.vertex.y} r={6}
                    fill="none" stroke={PASTEL.mint} strokeWidth={2} />
                  <text x={curResult.vertex.x} y={curResult.vertex.y - 16} textAnchor="middle"
                    fill={PASTEL.mint} fontSize={22} fontWeight={700}
                    fontFamily="'Playfair Display', serif">
                    {curResult.angle.toFixed(1)}°
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Bottom bar — count + export */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 16px", borderTop: `1px solid ${theme.border}`, background: theme.card,
          }}>
            <span style={{ fontSize: 13, color: theme.text }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{collectedAngles.length}</span> 건 수집됨
            </span>
            {collectedAngles.length > 0 && (
              <button onClick={exportData} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: PASTEL.sky, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>📥 내보내기</button>
            )}
          </div>
        </div>
      );
    }

    return (
      <ScreenWrap title="앵글 데이터 수집" back="관리자" backTo="admin">
        <div style={{
          display: "flex", gap: 8, padding: "10px 16px",
          background: theme.card, borderBottom: `1px solid ${theme.border}`,
          alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{collectedAngles.length}</span>
            <span style={{ fontSize: 11, color: theme.textSec }}> 건 수집</span>
            {collectedAngles.length > 0 && (
              <span style={{ fontSize: 10, color: theme.textSec, marginLeft: 6 }}>
                ({(JSON.stringify(collectedAngles).length / 1024).toFixed(1)}KB)
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {collectedAngles.length > 0 && (
              <>
                <button onClick={exportData} style={{
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: PASTEL.sky, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>📥 내보내기</button>
                <button onClick={clearAll} style={{
                  padding: "7px 10px", borderRadius: 8,
                  border: `1px solid ${PASTEL.coral}`, background: "transparent",
                  color: PASTEL.coral, fontSize: 11, cursor: "pointer",
                }}>🗑</button>
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
          <button onClick={() => setAngleOverlay(true)} style={{
            width: "100%", padding: "24px", borderRadius: 16, border: `2px dashed ${PASTEL.coral}`,
            background: `${PASTEL.coral}08`, color: PASTEL.coral, fontSize: 16,
            fontWeight: 700, cursor: "pointer", marginBottom: 16,
            fontFamily: "'Noto Serif KR', serif",
          }}>
            ✏️ 각 그리기
          </button>
          {collectedAngles.slice(-30).reverse().map((entry) => (
            <div key={entry.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", marginBottom: 6, borderRadius: 10,
              background: theme.card, border: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: entry.recognized ? PASTEL.mint : PASTEL.coral }}>
                  {entry.recognized ? `${entry.recognized.toFixed(1)}°` : "실패"}
                </span>
                <span style={{ fontSize: 10, color: theme.textSec }}>{entry.pointCount}pts</span>
                <span style={{ fontSize: 9, color: theme.textSec }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <button onClick={() => {
                const updated = collectedAngles.filter(e => e.id !== entry.id);
                setCollectedAngles(updated);
                localStorage.setItem("ar_angle_data", JSON.stringify(updated));
              }} style={{
                background: "none", border: "none", color: PASTEL.coral,
                fontSize: 12, cursor: "pointer", padding: "4px 8px",
              }}>✕</button>
            </div>
          ))}
          <div style={{ height: 60 }} />
        </div>
      </ScreenWrap>
    );

}

export function renderAdminScriptsScreen(ctx) {
  const { theme, setScreen, playSfx, editToneKey, setEditToneKey, customScripts,
    setCustomScripts, ScreenWrap } = ctx;
    const currentScript = customScripts[editToneKey]?.guide || {};
    const scriptKeys = Object.keys(TONES.default.guide);
    const scriptLabels = {
      compassStart: "컴퍼스 선택 시",
      rulerFirst: "자 먼저 선택 시",
      oneEdge: "1변 지나침",
      twoEdge: "2변 지나침",
      backToOne: "다시 1변",
      tooShort: "거리 너무 짧음",
      remainAuto: "나머지 자동 그리기 제안",
      earlyCenter: "3개 전 중심 클릭",
      circleDef: "원의 정의",
      triangleFail: "삼각형 성립 불가",
      selectEdge: "제도 모드 안내",
    };

    const updateScript = (key, value) => {
      setCustomScripts(prev => ({
        ...prev,
        [editToneKey]: {
          ...prev[editToneKey],
          guide: { ...prev[editToneKey].guide, [key]: value }
        }
      }));
    };

    const resetToDefault = () => {
      setCustomScripts(prev => ({
        ...prev,
        [editToneKey]: JSON.parse(JSON.stringify(TONES[editToneKey]))
      }));
    };

    return (
      <ScreenWrap title="대사 스크립트 편집" back="관리자" backTo="admin">
        <div style={{ flex:1, overflowY:"auto", padding:"16px", WebkitOverflowScrolling:"touch" }}>
          {/* Tone selector tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[["default","기본"],["nagging","잔소리"],["cute","더러운"]].map(([k,label]) => (
              <button key={k} onClick={() => setEditToneKey(k)} style={{
                flex:1, padding:"10px", borderRadius:12,
                border:`2px solid ${editToneKey===k?PASTEL.coral:theme.border}`,
                background:editToneKey===k?theme.accentSoft:theme.card,
                color:theme.text, fontSize:13, fontWeight:editToneKey===k?700:400,
                cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
              }}>{label}</button>
            ))}
          </div>

          {/* Script entries */}
          {scriptKeys.map((key, i) => (
            <div key={key} style={{
              marginBottom:14, background:theme.card, borderRadius:14,
              border:`1px solid ${theme.border}`, padding:"14px",
              animation:`fadeIn ${0.2+i*0.03}s ease`,
            }}>
              <label style={{ fontSize:11, color:PASTEL.coral, fontWeight:700, display:"block", marginBottom:6 }}>
                {scriptLabels[key] || key}
              </label>
              <textarea
                value={currentScript[key] || ""}
                onChange={e => updateScript(key, e.target.value)}
                rows={2}
                style={{
                  width:"100%", padding:"10px", borderRadius:10,
                  border:`1px solid ${theme.border}`, background:theme.bg,
                  color:theme.text, fontSize:13, fontFamily:"'Noto Serif KR', serif",
                  resize:"vertical", boxSizing:"border-box", lineHeight:1.5,
                }}
              />
            </div>
          ))}

          {/* Reset button */}
          <button onClick={resetToDefault} style={{
            width:"100%", padding:"14px", borderRadius:14,
            border:`1.5px solid ${theme.border}`, background:theme.card,
            color:theme.textSec, fontSize:13, cursor:"pointer",
            fontFamily:"'Noto Serif KR', serif", marginBottom:60,
          }}>
            이 모드 대사 초기화
          </button>
        </div>
      </ScreenWrap>
    );

}

