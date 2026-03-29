import { PASTEL, THEMES, TONES } from "../config";

export function renderSettingsScreen(ctx) {
  const { theme, themeKey, setThemeKey, toneKey, setToneKey, setScreen, playSfx,
    bgmOn, setBgmOn, sfxOn, setSfxOn, bgmVol, setBgmVol, sfxVol, setSfxVol,
    userRole, user, handleLogout, ROLES, ScreenWrap } = ctx;
    const SliderRow = ({ label, value, onChange, icon }) => (
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:12, color:theme.text, width:50 }}>{label}</span>
        <input type="range" min="0" max="100" value={value*100}
          onChange={e => onChange(parseInt(e.target.value)/100)}
          style={{ flex:1, accentColor:PASTEL.coral }} />
        <span style={{ fontSize:11, color:theme.textSec, width:30 }}>{Math.round(value*100)}%</span>
      </div>
    );

    return (
      <ScreenWrap title="설정" back="메뉴" backTo="menu">
        <div style={{ flex:1, overflowY:"auto", padding:"20px", WebkitOverflowScrolling:"touch" }}>
          <div style={{ maxWidth:400, margin:"0 auto" }}>

            {/* Theme */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.5s ease" }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>테마</label>
              <div style={{ display:"flex", gap:10 }}>
                {[["light","라이트"],["dark","다크"]].map(([key,label]) => (
                  <button key={key} onClick={() => setThemeKey(key)} style={{
                    flex:1, padding:"12px", borderRadius:14,
                    border:`2px solid ${themeKey===key?PASTEL.coral:theme.border}`,
                    background:themeKey===key?theme.accentSoft:theme.card,
                    color:theme.text, fontSize:13, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif", fontWeight:themeKey===key?700:400,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.6s ease" }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>말투 모드</label>
              <div style={{ display:"flex", gap:10 }}>
                {[["default","기본"],["nagging","잔소리"],["cute","더러운"]].map(([key,label]) => (
                  <button key={key} onClick={() => setToneKey(key)} style={{
                    flex:1, padding:"12px", borderRadius:14,
                    border:`2px solid ${toneKey===key?PASTEL.coral:theme.border}`,
                    background:toneKey===key?theme.accentSoft:theme.card,
                    color:theme.text, fontSize:13, cursor:"pointer",
                    fontFamily:"'Noto Serif KR', serif", fontWeight:toneKey===key?700:400,
                  }}>{label}</button>
                ))}
              </div>
              <p style={{ fontSize:11, color:theme.textSec, marginTop:8 }}>
                {toneKey==="default"&&"일반 안내는 친절하게, 오류만 잔소리로!"}
                {toneKey==="nagging"&&"전부 다 잔소리 모드!! 각오하세요!!"}
                {toneKey==="cute"&&"앙~ 전부 애교 모드에요~♡"}
              </p>
            </div>

            {/* Audio */}
            <div style={{ marginBottom:28, animation:"fadeIn 0.7s ease", background:theme.card, borderRadius:16, border:`1px solid ${theme.border}`, padding:20 }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:16, display:"block" }}>오디오</label>
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                <button onClick={() => setBgmOn(!bgmOn)} style={{
                  flex:1, padding:"10px", borderRadius:12,
                  border:`1.5px solid ${bgmOn?PASTEL.mint:theme.border}`,
                  background:bgmOn?`${PASTEL.mint}20`:theme.card,
                  color:theme.text, fontSize:12, cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
                }}>🎵 배경음악 {bgmOn?"ON":"OFF"}</button>
                <button onClick={() => { setSfxOn(!sfxOn); if(!sfxOn) playSfx("pop"); }} style={{
                  flex:1, padding:"10px", borderRadius:12,
                  border:`1.5px solid ${sfxOn?PASTEL.sky:theme.border}`,
                  background:sfxOn?`${PASTEL.sky}20`:theme.card,
                  color:theme.text, fontSize:12, cursor:"pointer", fontFamily:"'Noto Serif KR', serif",
                }}>🔊 효과음 {sfxOn?"ON":"OFF"}</button>
              </div>
              {bgmOn && <SliderRow label="배경음악" value={bgmVol} onChange={setBgmVol} icon="🎵" />}
              {sfxOn && <SliderRow label="효과음" value={sfxVol} onChange={setSfxVol} icon="🔊" />}
            </div>

            {/* Nickname */}
            <div style={{ padding:20, borderRadius:16, background:theme.card, border:`1px solid ${theme.border}`, animation:"fadeIn 0.8s ease", marginBottom:28 }}>
              <label style={{ fontSize:13, fontWeight:700, color:theme.text, marginBottom:12, display:"block" }}>닉네임</label>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input defaultValue="학생" style={{
                  flex:1, padding:"10px 14px", borderRadius:10,
                  border:`1.5px solid ${theme.border}`, background:theme.bg,
                  color:theme.text, fontSize:14, fontFamily:"'Noto Serif KR', serif",
                }} />
                <span style={{ fontSize:11, color:theme.textSec, whiteSpace:"nowrap" }}>2주마다 변경 가능</span>
              </div>
            </div>

            {/* Account info */}
            <div style={{ textAlign:"center", marginBottom:60, padding: 16, borderRadius: 14, background: theme.bg, border: `1px solid ${theme.border}` }}>
              <p style={{ fontSize: 11, color: theme.textSec, marginBottom: 4 }}>내 계정</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{user?.name || "게스트"}</p>
              <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 8, background: `${PASTEL.coral}15`, color: PASTEL.coral, fontWeight: 700 }}>
                {ROLES[userRole] || userRole}
              </span>
            </div>
          </div>
        </div>
      </ScreenWrap>
    );

}
