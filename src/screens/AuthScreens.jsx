import { PASTEL } from "../config";

export function renderLoginScreen(ctx) {
  const { theme, loginId, setLoginId, loginPw, setLoginPw, loginError, setLoginError,
    handleLogin, setScreen, setScreenRaw, playSfx } = ctx;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${PASTEL.cream} 0%, ${PASTEL.blush} 30%, ${PASTEL.lilac} 60%, ${PASTEL.sky} 100%)`,
        fontFamily: "'Playfair Display', serif", position: "relative", overflow: "hidden",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes gentlePulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
          * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
          input, textarea { -webkit-user-select: text; user-select: text; }
          input:focus { outline: none; border-color: ${PASTEL.coral} !important; box-shadow: 0 0 0 3px rgba(232,165,152,0.2); }
        `}</style>

        {/* Decorative elements */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: [40, 60, 30, 50, 45, 35, 55, 25, 70, 40, 50, 35][i],
            height: [40, 60, 30, 50, 45, 35, 55, 25, 70, 40, 50, 35][i],
            borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "4px" : "50% 0 50% 0",
            background: [PASTEL.pink, PASTEL.mint, PASTEL.lavender, PASTEL.yellow, PASTEL.sky, PASTEL.peach, PASTEL.sage, PASTEL.coral, PASTEL.lilac, PASTEL.blush, PASTEL.dustyRose, PASTEL.cream][i],
            opacity: 0.25,
            top: `${[8, 15, 60, 75, 25, 85, 40, 10, 55, 70, 30, 90][i]}%`,
            left: `${[5, 80, 10, 85, 50, 30, 75, 40, 90, 15, 65, 55][i]}%`,
            animation: `float ${3 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}

        {/* Main card */}
        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          borderRadius: 28, padding: "48px 40px", width: "min(380px, 90vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)",
          animation: "fadeIn 0.8s ease", zIndex: 10, textAlign: "center",
        }}>
          <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: 6, color: PASTEL.dustyRose, textTransform: "uppercase" }}>
            welcome to
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 700, color: "#4A3F35", margin: "0 0 6px 0",
            fontFamily: "'Playfair Display', serif",
          }}>
            ashrain.out
          </h1>
          <p style={{ fontSize: 13, color: "#8B7E74", margin: "0 0 36px 0", fontFamily: "'Noto Serif KR', serif", fontStyle: "italic" }}>
            뭐, 왜. 생각 좀 해볼게.
          </p>

          <input
            type="text" placeholder="아이디" value={loginId}
            onChange={e => { setLoginId(e.target.value); setLoginError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${loginError ? PASTEL.coral : PASTEL.blush}`, fontSize: 14, marginBottom: 12,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />
          <input
            type="password" placeholder="비밀번호" value={loginPw}
            onChange={e => { setLoginPw(e.target.value); setLoginError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${loginError ? PASTEL.coral : PASTEL.blush}`, fontSize: 14, marginBottom: loginError ? 8 : 24,
              background: "rgba(255,248,240,0.6)", color: "#4A3F35",
              fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box",
              transition: "all 0.3s ease",
            }}
          />
          {loginError && (
            <p style={{ fontSize: 12, color: PASTEL.coral, marginBottom: 16, fontFamily: "'Noto Serif KR', serif" }}>
              {loginError}
            </p>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", letterSpacing: 1,
              transition: "all 0.3s ease", boxShadow: "0 4px 15px rgba(232,165,152,0.3)",
            }}
            onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={e => e.target.style.transform = "translateY(0)"}
          >
            로그인
          </button>

          <button
            onClick={() => setScreenRaw("signup")}
            style={{
              width: "100%", padding: "13px", borderRadius: 14, marginTop: 10,
              border: `1.5px solid ${PASTEL.blush}`,
              background: "rgba(255,248,240,0.6)",
              color: "#8B7E74", fontSize: 13, cursor: "pointer",
              fontFamily: "'Noto Serif KR', serif", letterSpacing: 0.5,
              transition: "all 0.3s ease",
            }}
          >
            회원가입
          </button>
        </div>

        <p style={{
          marginTop: 24, fontSize: 11, color: "rgba(74,63,53,0.5)", zIndex: 10,
          fontFamily: "'Playfair Display', serif", letterSpacing: 2,
        }}>
          © 2026 ashrain.out
        </p>
      </div>
    );

}

export function renderSignupScreen(ctx) {
  const { theme, signupName, setSignupName, signupId, setSignupId, signupPw, setSignupPw,
    signupPwConfirm, setSignupPwConfirm, signupMsg, setSignupMsg, signupDone, setSignupDone,
    handleSignupRequest, setScreen, setScreenRaw, playSfx, autoApprove, signupRole, setSignupRole } = ctx;

    const doSignup = () => {
      if (signupPw !== signupPwConfirm) { setSignupMsg("비밀번호가 일치하지 않아요."); return; }
      if (signupPw.length < 4) { setSignupMsg("비밀번호는 4자 이상으로 해주세요."); return; }
      if (signupId.length < 3) { setSignupMsg("아이디는 3자 이상으로 해주세요."); return; }
      const result = handleSignupRequest(signupName, signupId, signupPw, signupRole || "student");
      if (result === "auto") {
        setSignupMsg(""); setSignupDone(true);
      } else if (result === "pending") {
        setSignupMsg(""); setSignupDone(true);
      } else {
        setSignupMsg(result);
      }
    };

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg, ${PASTEL.cream} 0%, ${PASTEL.blush} 30%, ${PASTEL.lilac} 60%, ${PASTEL.sky} 100%)`,
        fontFamily: "'Noto Serif KR', serif", padding: 20,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          input:focus { outline: none; border-color: ${PASTEL.coral} !important; box-shadow: 0 0 0 3px rgba(232,165,152,0.2); }`}</style>

        <div style={{
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
          borderRadius: 28, padding: "40px 36px", width: "min(380px, 90vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: "1px solid rgba(255,255,255,0.6)",
          animation: "fadeIn 0.6s ease", textAlign: "center",
        }}>
          <h2 style={{ fontSize: 24, color: "#4A3F35", margin: "0 0 6px 0", fontFamily: "'Playfair Display', serif" }}>
            회원가입
          </h2>
          <p style={{ fontSize: 12, color: "#8B7E74", margin: "0 0 28px 0", fontStyle: "italic" }}>
            ashrain.out에 오신 것을 환영해요
          </p>

          {signupDone ? (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>{autoApprove ? "🎉" : "📨"}</p>
              <p style={{ fontSize: 15, color: "#4A3F35", fontWeight: 700, marginBottom: 8 }}>
                {autoApprove ? "가입이 완료되었어요!" : "가입 신청이 접수되었어요!"}
              </p>
              <p style={{ fontSize: 12, color: "#8B7E74", marginBottom: 24, lineHeight: 1.6 }}>
                {autoApprove 
                  ? "바로 로그인할 수 있어요." 
                  : "선생님이 승인하면 로그인할 수 있어요.\n조금만 기다려주세요!"}
              </p>
              <button onClick={() => setScreenRaw("login")} style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>로그인으로 돌아가기</button>
            </div>
          ) : (
            <>
              {/* 가입 유형 선택 */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { value: "student", label: "🎓 학생", desc: "공부하러 왔어요" },
                  { value: "parent", label: "👨‍👩‍👧 학부모", desc: "자녀 학습 관리" },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setSignupRole(opt.value)} style={{
                    flex: 1, padding: "12px 8px", borderRadius: 14, cursor: "pointer",
                    border: (signupRole || "student") === opt.value ? `2.5px solid ${PASTEL.coral}` : `1.5px solid ${PASTEL.blush}`,
                    background: (signupRole || "student") === opt.value ? `${PASTEL.coral}10` : "rgba(255,248,240,0.6)",
                    textAlign: "center", transition: "all 0.2s",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.label.split(" ")[0]}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: (signupRole || "student") === opt.value ? PASTEL.coral : "#4A3F35" }}>{opt.label.split(" ")[1]}</div>
                    <div style={{ fontSize: 9, color: "#8B7E74", marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              <input placeholder="이름 (실명)" value={signupName} onChange={e => setSignupName(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input placeholder="아이디 (3자 이상)" value={signupId} onChange={e => setSignupId(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input type="password" placeholder="비밀번호 (4자 이상)" value={signupPw} onChange={e => setSignupPw(e.target.value)}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: 10, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />
              <input type="password" placeholder="비밀번호 확인" value={signupPwConfirm} onChange={e => setSignupPwConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSignup()}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${PASTEL.blush}`,
                  fontSize: 14, marginBottom: signupMsg ? 8 : 20, background: "rgba(255,248,240,0.6)", color: "#4A3F35",
                  fontFamily: "'Noto Serif KR', serif", boxSizing: "border-box" }} />

              {signupMsg && <p style={{ fontSize: 12, color: PASTEL.coral, marginBottom: 12 }}>{signupMsg}</p>}

              <button onClick={doSignup} style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, ${PASTEL.mint}, ${PASTEL.sage})`,
                color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
                marginBottom: 10,
              }}>가입 신청하기</button>

              <button onClick={() => setScreenRaw("login")} style={{
                width: "100%", padding: "12px", borderRadius: 14,
                border: `1.5px solid ${PASTEL.blush}`, background: "transparent",
                color: "#8B7E74", fontSize: 13, cursor: "pointer",
              }}>← 로그인으로 돌아가기</button>

              <p style={{ fontSize: 11, color: "#B5A99A", marginTop: 16, lineHeight: 1.5 }}>
                가입 후 선생님의 승인이 필요합니다.
              </p>
            </>
          )}
        </div>
      </div>
    );

}
