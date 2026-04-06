import { CURRICULUM_2022, summarizeProgress } from "../data/curriculum";
import { PASTEL } from "../config";

export function renderAdminScreen(ctx) {
  const { theme, setScreen, playSfx, signupRequests, ScreenWrap, MenuGrid } = ctx;
  const menuItems = [
    { icon: "📋", label: "학습 관리", section: true },
    { icon: "📚", label: "진도 관리", desc: "학원 진도 단원 체크", action: () => setScreen("admin-progress") },
    { icon: "👁️", label: "학생 모드 입장", desc: "학생 화면 미리보기", action: () => setScreen("student-mode") },
    { icon: "📊", label: "학습 현황", desc: "학생별 학습 열람 · 숙제 출제", action: () => setScreen("learning-dashboard") },
    { icon: "📬", label: "질문함", desc: (ctx.helpRequests||[]).filter(r=>r.status!=="answered").length > 0 ? `🔔 ${(ctx.helpRequests||[]).filter(r=>r.status!=="answered").length}건 대기` : "학생 질문 · 답변", action: () => setScreen("question-inbox") },
    { icon: "👤", label: "회원 관리", desc: signupRequests.length > 0 ? `🔔 가입 신청 ${signupRequests.length}건` : "권한 · 계정 · 비밀번호", action: () => setScreen("admin-students") },
    { icon: "⚙️", label: "시스템 설정", section: true },
    { icon: "💬", label: "대사 스크립트", desc: "말투별 대사 수정", action: () => setScreen("admin-scripts") },
    { icon: "🤖", label: "분석 모델", desc: `현재: ${({"claude-opus-4-20250514":"Opus","claude-sonnet-4-20250514":"Sonnet","claude-haiku-4-5-20251001":"Haiku"})[ctx.analysisModel] || "Sonnet"}`, action: () => setScreen("admin-model") },
    { icon: "📖", label: "튜토리얼 초기화", desc: "모든 튜토리얼 다시 보기", action: () => { if(ctx.tutorial?.resetAll) ctx.tutorial.resetAll(); ctx.showMsg("튜토리얼이 초기화되었어요!", 1500); } },
    { icon: "🎨", label: "SVG 에디터", desc: "수학 콘텐츠 오브젝트 편집", action: () => setScreen("svg-editor") },
    { icon: "🔑", label: "권한 관리", desc: "역할별 기능 제한", action: () => setScreen("admin-perms") },
  ];
  return (
    <ScreenWrap title="관리자" back="메뉴" backTo="menu">
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MenuGrid items={menuItems} cols={1} />
      </div>
    </ScreenWrap>
  );
}


export function renderAdminStudentsScreen(ctx) {
  const { theme, user, userRole, members, setMembers, setScreen, playSfx, showMsg,
    ROLES, editingMemberId, setEditingMemberId, newMemberForm, setNewMemberForm, memberFilter, setMemberFilter,
    canEditMember, updateMember, deleteMember,
    ROLES: roles, signupRequests, approveSignup, rejectSignup, ScreenWrap } = ctx;

  const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };
  const filtered = memberFilter ? members.filter(m => m.role === memberFilter) : members;
  const inputStyle = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12, fontFamily: "'Noto Serif KR', serif" };
  const isSelf = (m) => m.id === user?.id;

  const changeId = (oldId, newId) => {
    if (!newId.trim()) return;
    if (newId !== oldId && members.find(m => m.id === newId)) { showMsg("이미 존재하는 아이디!", 2000); return; }
    setMembers(prev => prev.map(m => m.id === oldId ? { ...m, id: newId } : m));
    setEditingMemberId(newId);
    if (user?.id === oldId) {
      const u = { ...user, id: newId };
      localStorage.setItem("ar_user", JSON.stringify(u));
    }
  };

  const resetPassword = (targetId) => {
    const newPw = "1234";
    updateMember(targetId, { pw: newPw });
    showMsg(`비밀번호가 "${newPw}"로 초기화되었어요`, 2000);
    playSfx("success");
  };

  return (
    <ScreenWrap title="회원 관리" back="관리자" backTo="admin">
      <div style={{ padding: "16px", overflowY: "auto" }}>

        {/* Signup requests */}
        {signupRequests.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: PASTEL.coral, marginBottom: 8 }}>
              🔔 가입 신청 ({signupRequests.length}건)
            </div>
            {signupRequests.map((req, i) => (
              <div key={req.id || i} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                background: theme.card, borderRadius: 12, border: `1px solid ${PASTEL.coral}30`,
                marginBottom: 6, animation: "fadeIn 0.3s ease",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{req.name}</div>
                  <div style={{ fontSize: 10, color: theme.textSec }}>@{req.id} · {ROLES[req.role || "student"]}</div>
                </div>
                <button onClick={() => { approveSignup(req.id); playSfx("success"); showMsg(`${req.name} 승인!`, 1500); }} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: PASTEL.mint, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>승인</button>
                <button onClick={() => { rejectSignup(req.id); playSfx("pop"); }} style={{
                  padding: "6px 10px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`,
                  background: "transparent", color: PASTEL.coral, fontSize: 11, cursor: "pointer",
                }}>거절</button>
              </div>
            ))}
            <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />
          </div>
        )}

        {/* Add member */}
        {newMemberForm && (
          <div style={{ marginBottom: 12, padding: 12, background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PASTEL.coral, marginBottom: 8 }}>새 회원 추가</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input placeholder="아이디" value={newMemberForm.id} onChange={e => setNewMemberForm(p => ({ ...p, id: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="이름" value={newMemberForm.name} onChange={e => setNewMemberForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="비밀번호" value={newMemberForm.pw} onChange={e => setNewMemberForm(p => ({ ...p, pw: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              <select value={newMemberForm.role} onChange={e => setNewMemberForm(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle }}>
                <option value="admin">관리자</option>
                <option value="assistant">조교</option>
                <option value="student">수강생</option>
                <option value="external">외부생</option>
              </select>
              <button onClick={() => {
                if (!newMemberForm.id || !newMemberForm.name) { showMsg("아이디와 이름을 입력하세요", 1500); return; }
                if (members.find(m => m.id === newMemberForm.id)) { showMsg("이미 존재하는 아이디!", 1500); return; }
                setMembers(prev => [...prev, { ...newMemberForm, nickname: "" }]);
                setNewMemberForm({ id: "", name: "", pw: "1234", role: "student" });
                playSfx("success"); showMsg("회원 추가 완료!", 1500);
              }} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: PASTEL.coral, color: "white", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>추가</button>
            </div>
          </div>
        )}
        {!newMemberForm && (
          <button onClick={() => setNewMemberForm({ id: "", name: "", pw: "1234", role: "student" })} style={{
            width: "100%", padding: 10, borderRadius: 10, border: `1.5px dashed ${theme.border}`,
            background: "transparent", color: theme.textSec, fontSize: 12, cursor: "pointer", marginBottom: 12,
          }}>+ 새 회원 추가</button>
        )}

        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setMemberFilter(null)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 10, cursor: "pointer",
            border: !memberFilter ? `2px solid ${PASTEL.coral}` : `1px solid ${theme.border}`,
            background: !memberFilter ? theme.accentSoft : theme.card, color: theme.text,
          }}>전체 ({members.length})</button>
          {Object.entries(ROLES).map(([key, label]) => {
            const cnt = members.filter(m => m.role === key).length;
            return (
              <button key={key} onClick={() => setMemberFilter(memberFilter === key ? null : key)} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 10, cursor: "pointer",
                border: memberFilter === key ? `2px solid ${roleColors[key]}` : `1px solid ${theme.border}`,
                background: memberFilter === key ? `${roleColors[key]}15` : theme.card, color: theme.text,
              }}>{label} ({cnt})</button>
            );
          })}
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
                      <input value={m.id} onChange={e => changeId(m.id, e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: theme.textSec }}>닉네임</label>
                      <input value={m.nickname || ""} onChange={e => updateMember(m.id, { nickname: e.target.value })} style={{ ...inputStyle, width: "100%" }} placeholder="미설정" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: theme.textSec }}>비밀번호</label>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ ...inputStyle, flex: 1, display: "inline-block", color: theme.textSec, letterSpacing: 2 }}>••••••</span>
                        <button onClick={() => resetPassword(m.id)} style={{
                          padding: "8px 10px", borderRadius: 8, border: `1px solid ${PASTEL.coral}`,
                          background: "transparent", color: PASTEL.coral, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap",
                        }}>초기화</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {userRole === "admin" && !isSelf(m) && (
                      <select value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })} style={{ ...inputStyle, flex: "0 0 90px" }}>
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
      </div>
    </ScreenWrap>
  );
}


export function renderAdminSignupsScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, signupRequests, autoApprove, setAutoApprove,
    approveSignup, rejectSignup, ROLES, ScreenWrap } = ctx;

  return (
    <ScreenWrap title="가입 신청 관리" back="관리자" backTo="admin">
      <div style={{ padding: "16px" }}>
        {/* Auto approve toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", background: theme.card, borderRadius: 14,
          border: `1px solid ${theme.border}`, marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>자동 승인</div>
            <div style={{ fontSize: 10, color: theme.textSec }}>가입 신청 시 즉시 승인</div>
          </div>
          <button onClick={() => { setAutoApprove(!autoApprove); playSfx("click"); }}
            style={{
              width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: autoApprove ? PASTEL.mint : theme.border, position: "relative",
              transition: "background 0.3s",
            }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: "white",
              position: "absolute", top: 3,
              left: autoApprove ? 25 : 3, transition: "left 0.3s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <div style={{ fontSize: 12, color: theme.textSec, marginBottom: 12 }}>
          대기 중인 신청 ({signupRequests.length}건)
        </div>
        {signupRequests.length === 0 && (
          <p style={{ textAlign: "center", color: theme.textSec, fontSize: 13, marginTop: 30 }}>
            대기 중인 가입 신청이 없어요
          </p>
        )}

        {signupRequests.map((req, i) => (
          <div key={req.id || i} style={{
            background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`,
            padding: 14, marginBottom: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{req.name}</span>
                <span style={{ fontSize: 11, color: theme.textSec, marginLeft: 6 }}>@{req.id}</span>
                <div style={{ fontSize: 10, color: theme.textSec, marginTop: 2 }}>
                  {req.role ? ROLES[req.role] : "수강생"} 신청
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => approveSignup(req.id)} style={{
                  padding: "8px 16px", borderRadius: 10, border: "none",
                  background: PASTEL.mint, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>승인</button>
                <button onClick={() => rejectSignup(req.id)} style={{
                  padding: "8px 12px", borderRadius: 10, border: `1px solid ${PASTEL.coral}`,
                  background: "transparent", color: PASTEL.coral, fontSize: 12, cursor: "pointer",
                }}>거절</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScreenWrap>
  );
}


export function renderAdminPermsScreen(ctx) {
  const { theme, setScreen, playSfx, ROLES, rolePerms, setRolePerms,
    DEFAULT_PERMS, PERM_LABELS, PERM_GROUPS, ScreenWrap } = ctx;

  const roleColors = { admin: PASTEL.coral, assistant: PASTEL.lavender, student: PASTEL.sky, external: PASTEL.sage };

  return (
    <ScreenWrap title="권한 관리" back="관리자" backTo="admin">
      <div style={{ padding: "16px", overflowY: "auto" }}>
        <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 14 }}>
          역할별로 허용되는 기능을 설정할 수 있어요.
        </p>
        {PERM_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 8, textTransform: "uppercase", letterSpacing: 2 }}>
              {group.label}
            </div>
            {group.keys.map(perm => (
              <div key={perm} style={{
                background: theme.card, borderRadius: 12, padding: "10px 14px",
                border: `1px solid ${theme.border}`, marginBottom: 6,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 6 }}>
                  {PERM_LABELS[perm] || perm}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["admin", "assistant", "student", "external"].map(role => {
                    const permsObj = rolePerms[role] || DEFAULT_PERMS[role] || {};
                    const isOn = !!permsObj[perm];
                    const defaultObj = DEFAULT_PERMS[role] || {};
                    const isDefault = !!defaultObj[perm];
                    return (
                      <button key={role} onClick={() => {
                        if (role === "admin") return;
                        const current = { ...(rolePerms[role] || DEFAULT_PERMS[role] || {}) };
                        current[perm] = !isOn;
                        setRolePerms(prev => ({ ...prev, [role]: current }));
                        playSfx("click");
                      }} style={{
                        flex: 1, padding: "5px 4px", borderRadius: 8, fontSize: 9,
                        border: `1.5px solid ${isOn ? roleColors[role] : theme.border}`,
                        background: isOn ? `${roleColors[role]}15` : theme.card,
                        color: isOn ? roleColors[role] : theme.textSec,
                        cursor: role === "admin" ? "default" : "pointer",
                        fontWeight: isOn ? 700 : 400, transition: "all 0.2s",
                      }}>
                        {isOn ? "✓ " : ""}{ROLES[role]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScreenWrap>
  );
}


export function renderAdminScriptsScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, ROLES, activeTone,
    editToneKey, setEditToneKey, customScripts, setCustomScripts, ScreenWrap } = ctx;

  const toneKeys = Object.keys(customScripts).length > 0
    ? [...new Set([...Object.keys(customScripts), "default", "nagging", "cute"])]
    : ["default", "nagging", "cute"];
  const currentTone = editToneKey || toneKeys[0];
  const scripts = customScripts[currentTone] || activeTone;

  const updateScript = (category, key, value) => {
    setCustomScripts(prev => ({
      ...prev,
      [currentTone]: {
        ...(prev[currentTone] || activeTone),
        [category]: {
          ...((prev[currentTone] || activeTone)[category] || {}),
          [key]: value,
        }
      }
    }));
  };

  return (
    <ScreenWrap title="대사 스크립트" back="관리자" backTo="admin">
      <div style={{ padding: "16px", overflowY: "auto" }}>
        {/* Tone selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {toneKeys.map(key => (
            <button key={key} onClick={() => setEditToneKey(key)} style={{
              padding: "6px 14px", borderRadius: 10, fontSize: 11,
              border: `1.5px solid ${currentTone === key ? PASTEL.coral : theme.border}`,
              background: currentTone === key ? theme.accentSoft : theme.card,
              color: theme.text, cursor: "pointer", fontWeight: currentTone === key ? 700 : 400,
            }}>{key}</button>
          ))}
        </div>

        {/* Script editor */}
        {scripts?.guide && Object.entries(scripts.guide).map(([key, val]) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 10, color: theme.textSec }}>{key}</label>
            <textarea value={val} onChange={e => updateScript("guide", key, e.target.value)}
              rows={2} style={{
                width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${theme.border}`,
                background: theme.bg, color: theme.text, fontSize: 11, fontFamily: "'Noto Serif KR', serif",
                resize: "vertical",
              }} />
          </div>
        ))}

        <button onClick={() => { playSfx("success"); showMsg("저장되었어요!", 1500); }} style={{
          width: "100%", padding: 12, borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8,
        }}>저장</button>
      </div>
    </ScreenWrap>
  );
}

export function renderAdminProgressScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, progress, setProgress, ScreenWrap } = ctx;

  const toggleUnit = (id) => {
    playSfx("click");
    setProgress(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSemester = (semester) => {
    playSfx("click");
    const semIds = CURRICULUM_2022[semester].map(u => u.id);
    const allChecked = semIds.every(id => progress.includes(id));
    setProgress(prev => {
      if (allChecked) return prev.filter(id => !semIds.includes(id));
      return [...new Set([...prev, ...semIds])];
    });
  };

  return (
    <ScreenWrap title="진도 관리" back="관리자" backTo="admin">
      <div style={{ padding: 16, overflowY: "auto" }}>
        <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 12 }}>
          체크된 단원만 학생들의 문제 분석에 사용됩니다.
        </p>
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: `${PASTEL.mint}10`, border: `1px solid ${PASTEL.mint}30`,
          marginBottom: 16, fontSize: 12, color: theme.text,
        }}>
          <b>현재 진도:</b> {summarizeProgress(progress)}
        </div>

        {Object.keys(CURRICULUM_2022).map(semester => {
          const units = CURRICULUM_2022[semester];
          const checkedCount = units.filter(u => progress.includes(u.id)).length;
          const allChecked = checkedCount === units.length;

          return (
            <div key={semester} style={{
              marginBottom: 14, padding: 12, borderRadius: 14,
              background: theme.card, border: `1px solid ${theme.border}`,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${theme.border}`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                  {semester} <span style={{ fontSize: 10, color: theme.textSec }}>
                    ({checkedCount}/{units.length})
                  </span>
                </span>
                <button onClick={() => toggleSemester(semester)} style={{
                  padding: "4px 10px", borderRadius: 8,
                  border: `1px solid ${theme.border}`, background: theme.bg,
                  color: theme.textSec, fontSize: 10, cursor: "pointer",
                }}>
                  {allChecked ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              {units.map(unit => {
                const isChecked = progress.includes(unit.id);
                return (
                  <label key={unit.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 4px", cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUnit(unit.id)}
                      style={{ width: 18, height: 18, accentColor: PASTEL.coral }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isChecked ? 700 : 400,
                        color: isChecked ? theme.text : theme.textSec,
                      }}>
                        {unit.name}
                      </div>
                      {unit.subunits && (
                        <div style={{ fontSize: 9, color: theme.textSec, marginTop: 2 }}>
                          {unit.subunits.join(" · ")}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </ScreenWrap>
  );
}
