import { useState, useEffect } from "react";
import { PASTEL, dist } from "../config";

// Colors
const C = { hyp: "#D95F4B", angle: "#3A8FC2", side: "#2E9E6B", right: "#9B7FBF", match: "#E8A040", proven: "#28A745" };

function buildTri(hyp, adj, opp, ox, oy, sc, flipX) {
  const B = { x: ox, y: oy };
  const C = { x: ox + (flipX ? -adj * sc : adj * sc), y: oy };
  const A = { x: C.x, y: oy - opp * sc };
  return { A, B, C };
}

function RightMark({ x, y, d1, d2, size = 8, color }) {
  return <path d={`M ${x+d1.x*size} ${y+d1.y*size} L ${x+d1.x*size+d2.x*size} ${y+d1.y*size+d2.y*size} L ${x+d2.x*size} ${y+d2.y*size}`}
    fill="none" stroke={color} strokeWidth={1.2} />;
}

function Tick({ p1, p2, n, color }) {
  const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
  const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy);
  if (len<1) return null;
  const nx=-dy/len*6, ny=dx/len*6;
  return <>{Array.from({length:n},(_,i)=>{
    const off=(i-(n-1)/2)*4;
    const bx=mx+(dx/len)*off, by=my+(dy/len)*off;
    return <line key={i} x1={bx-nx} y1={by-ny} x2={bx+nx} y2={by+ny} stroke={color} strokeWidth={2} />;
  })}</>;
}

function AngleArc({ cx, cy, r, a1Deg, a2Deg, color, sw=1.5 }) {
  const a1=a1Deg*Math.PI/180, a2=a2Deg*Math.PI/180;
  const sx=cx+r*Math.cos(a1), sy=cy-r*Math.sin(a1);
  const ex=cx+r*Math.cos(a2), ey=cy-r*Math.sin(a2);
  const diff = a2-a1;
  const large = Math.abs(diff) > Math.PI ? 1 : 0;
  return <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 0 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={sw} />;
}

export function CongruenceScreenInner({ theme, setScreen, playSfx, showMsg, ScreenWrap }) {
  const [mode, setMode] = useState(null);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [flipProg, setFlipProg] = useState(0);

  const W = Math.min(window.innerWidth - 20, 400);
  const H = 240;

  const submit = () => {
    const h = parseFloat(v1), x = parseFloat(v2);
    if (isNaN(h)||isNaN(x)||h<=0||x<=0) { setError("양수를 입력해주세요"); return; }
    if (mode==="rha" && (x<=0||x>=90)) { setError("예각(0°~90°)을 입력하세요"); return; }
    if (mode==="rhs" && x>=h) { setError("변은 빗변보다 짧아야 해요"); return; }
    setError("");
    const angRad = mode==="rha" ? x*Math.PI/180 : Math.acos(x/h);
    const adj = h*Math.cos(angRad), opp = h*Math.sin(angRad);
    const angDeg = mode==="rha" ? x : angRad*180/Math.PI;
    const sc = Math.min(W*0.22, H*0.35) / h;
    setData({ h, adj, opp, angDeg, sc, side: mode==="rhs"?x:adj });
    setStep(0);
    playSfx("click");
  };

  // RHS flip animation
  useEffect(() => {
    if (mode!=="rhs"||!data) return;
    const triggerStep = 3; // "삼각형 붙이기" step
    if (step!==triggerStep) { if(step>triggerStep) setFlipProg(1); return; }
    setFlipProg(0);
    let start=null;
    const dur=1200;
    const anim=(ts)=>{
      if(!start)start=ts;
      const p=Math.min((ts-start)/dur,1);
      setFlipProg(p);
      if(p<1)requestAnimationFrame(anim);
    };
    const id=requestAnimationFrame(anim);
    return ()=>cancelAnimationFrame(id);
  }, [step, mode, data]);

  const rhaSteps = [
    { t: "RHA 합동 조건", d: "직각(R) + 빗변(H) + 한 예각(A)이\n각각 같은 두 직각삼각형", hi: ["right","hyp","angle"] },
    { t: "🤔 이건 ASA가 아닌 것 같은데?", d: "ASA 합동은 '끼인변'의 양 끝 각이 같아야 한다.\n\n그런데 RHA에서 빗변(AB)은\n직각(∠C)과 예각(∠A) 사이에 끼인 변이 아니다!", hi: ["notasa"] },
    { t: "💡 하지만 직각삼각형이니까!", d: `∠C = ∠F = 90° (직각, 고정)\n∠A = ∠D = ${data?data.angDeg.toFixed(1):"?"}° (주어진 예각)\n\n∴ ∠B = 180° - 90° - ${data?data.angDeg.toFixed(1):"?"}°\n   = ${data?(90-data.angDeg).toFixed(1):"?"}°\n   = ∠E`, hi: ["thirdangle"] },
    { t: "✅ ASA 합동 성립!", d: `빗변 AB = DE (H)\n∠A = ∠D (A)\n∠B = ∠E (자동 결정)\n\n→ 빗변의 양 끝 각이 같다\n→ ASA 합동!`, hi: ["asa"] },
    { t: "∴ RHA = ASA 합동 ✓", d: "직각삼각형에서 빗변과 한 예각이 같으면\n세 번째 각이 자동으로 결정되므로\nASA 합동 조건을 만족한다.\n\n∴ 두 삼각형은 합동이다. □", hi: ["proven"] },
  ];

  const rhsSteps = [
    { t: "RHS 합동 조건", d: "직각(R) + 빗변(H) + 한 변(S)이\n각각 같은 두 직각삼각형", hi: ["right","hyp","side"] },
    { t: "🤔 두 변만 아는데 합동?", d: "SSS는 세 변이 다 같아야 하고\nSAS는 끼인각을 알아야 한다.\n\nRHS는 둘 다 아닌 것 같은데...\n나머지 한 변(AC)의 길이를 모른다!", hi: ["question"] },
    { t: "💡 피타고라스의 정리!", d: `직각삼각형이므로:\nAC² = AB² - BC²\nAC² = ${data?data.h:"?"}² - ${data?data.side:"?"}²\nAC = ${data?data.opp.toFixed(2):"?"}\n\n→ 세 번째 변의 길이가 결정된다!`, hi: ["pythagoras"] },
    { t: "🔄 삼각형을 붙여보자", d: "같은 변(BC)을 맞대고\n두 번째 삼각형을 뒤집어 붙이면...", hi: ["flip"] },
    { t: "📐 이등변삼각형!", d: `AB = DB = ${data?data.h:"?"} (빗변이 같으므로)\n→ △ABD는 이등변삼각형!\n\n∠ACB = ∠DCB = 90°이므로\nBC는 이등변삼각형의 꼭짓각의 이등분선`, hi: ["isosceles"] },
    { t: "✅ SSS 합동 성립!", d: `AB = DE = ${data?data.h:"?"} (빗변)\nBC = EF = ${data?data.side:"?"} (한 변)\nAC = DF = ${data?data.opp.toFixed(2):"?"} (피타고라스)\n\n세 변이 모두 같다 → SSS 합동!`, hi: ["sss"] },
    { t: "∴ RHS = SSS 합동 ✓", d: "직각삼각형에서 빗변과 한 변이 같으면\n피타고라스 정리로 나머지 변이 결정되므로\nSSS 합동 조건을 만족한다.\n\n∴ 두 삼각형은 합동이다. □", hi: ["proven"] },
  ];

  const steps = mode==="rha"?rhaSteps:rhsSteps;
  const maxStep = steps.length-1;
  const curHi = step>=0&&step<=maxStep ? steps[step].hi : [];

  const renderCanvas = () => {
    if (!data) return null;
    const { h, adj, opp, angDeg, sc } = data;

    const t1 = buildTri(h, adj, opp, W*0.18, H*0.82, sc, false);
    const t2orig = buildTri(h, adj, opp, W*0.82, H*0.82, sc, true);

    // RHS flip: t2 moves to mirror position
    let t2 = t2orig;
    let showFlipped = mode==="rhs" && step>=3;
    if (showFlipped) {
      const p = step===3 ? flipProg : 1;
      const mirA = { x: t1.A.x, y: 2*t1.C.y - t1.A.y };
      const lerp = (a,b,t)=>({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t});
      t2 = { A: lerp(t2orig.A, mirA, p), B: lerp(t2orig.B, t1.B, p), C: lerp(t2orig.C, t1.C, p) };
    }

    const dir = (a,b) => { const d=dist(a,b); return d<0.1?{x:0,y:0}:{x:(b.x-a.x)/d,y:(b.y-a.y)/d}; };

    return (
      <svg width={W} height={H} style={{ background: theme.svgBg, borderRadius: 14, border: `1px solid ${theme.border}` }}>
        {/* Triangle 1 */}
        <polygon points={`${t1.A.x},${t1.A.y} ${t1.B.x},${t1.B.y} ${t1.C.x},${t1.C.y}`}
          fill="none" stroke={theme.text} strokeWidth={2} strokeLinejoin="round" />

        {/* Triangle 2 */}
        <polygon points={`${t2.A.x},${t2.A.y} ${t2.B.x},${t2.B.y} ${t2.C.x},${t2.C.y}`}
          fill={showFlipped?`${C.match}12`:"none"}
          stroke={showFlipped?C.match:theme.text} strokeWidth={2} strokeLinejoin="round"
          strokeDasharray={showFlipped&&flipProg<1?"6,4":"none"} />

        {/* Right angle marks - always shown (R is fixed) */}
        <RightMark x={t1.C.x} y={t1.C.y} d1={dir(t1.C,t1.B)} d2={dir(t1.C,t1.A)} color={C.right} />
        {!showFlipped && <RightMark x={t2.C.x} y={t2.C.y} d1={dir(t2.C,t2.B)} d2={dir(t2.C,t2.A)} color={C.right} />}

        {/* Hypotenuse highlight */}
        {curHi.includes("hyp") || curHi.includes("asa") || curHi.includes("sss") || curHi.includes("proven") ? <>
          <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={C.hyp} strokeWidth={3.5} opacity={0.7} />
          {!showFlipped && <line x1={t2.A.x} y1={t2.A.y} x2={t2.B.x} y2={t2.B.y} stroke={C.hyp} strokeWidth={3.5} opacity={0.7} />}
          <Tick p1={t1.A} p2={t1.B} n={1} color={C.hyp} />
          {!showFlipped && <Tick p1={t2.A} p2={t2.B} n={1} color={C.hyp} />}
        </> : null}

        {/* Angle highlight (RHA) */}
        {mode==="rha" && (curHi.includes("angle")||curHi.includes("asa")||curHi.includes("proven")) ? <>
          <AngleArc cx={t1.B.x} cy={t1.B.y} r={20} a1Deg={90-angDeg} a2Deg={90} color={C.angle} sw={2.5} />
          <text x={t1.B.x+24} y={t1.B.y-10} fontSize={10} fill={C.angle} fontWeight={700}>{angDeg.toFixed(0)}°</text>
          {!showFlipped && <>
            <AngleArc cx={t2.B.x} cy={t2.B.y} r={20} a1Deg={90} a2Deg={90+angDeg} color={C.angle} sw={2.5} />
            <text x={t2.B.x-34} y={t2.B.y-10} fontSize={10} fill={C.angle} fontWeight={700}>{angDeg.toFixed(0)}°</text>
          </>}
        </> : null}

        {/* Third angle highlight (RHA step 2+) */}
        {mode==="rha" && (curHi.includes("thirdangle")||curHi.includes("asa")||curHi.includes("proven")) ? <>
          <AngleArc cx={t1.A.x} cy={t1.A.y} r={16} a1Deg={270} a2Deg={270+(90-angDeg)} color={C.match} sw={2} />
          <text x={t1.A.x-28} y={t1.A.y+4} fontSize={9} fill={C.match} fontWeight={700}>{(90-angDeg).toFixed(0)}°</text>
        </> : null}

        {/* Side highlight (RHS) */}
        {mode==="rhs" && (curHi.includes("side")||curHi.includes("sss")||curHi.includes("proven")) ? <>
          <line x1={t1.B.x} y1={t1.B.y} x2={t1.C.x} y2={t1.C.y} stroke={C.side} strokeWidth={3.5} opacity={0.7} />
          {!showFlipped && <line x1={t2.B.x} y1={t2.B.y} x2={t2.C.x} y2={t2.C.y} stroke={C.side} strokeWidth={3.5} opacity={0.7} />}
          <Tick p1={t1.B} p2={t1.C} n={2} color={C.side} />
          {!showFlipped && <Tick p1={t2.B} p2={t2.C} n={2} color={C.side} />}
        </> : null}

        {/* Pythagoras: third side highlight */}
        {mode==="rhs" && (curHi.includes("pythagoras")||curHi.includes("sss")||curHi.includes("proven")) ? <>
          <line x1={t1.A.x} y1={t1.A.y} x2={t1.C.x} y2={t1.C.y} stroke={C.match} strokeWidth={3} opacity={0.7} />
          {!showFlipped && <line x1={t2.A.x} y1={t2.A.y} x2={t2.C.x} y2={t2.C.y} stroke={C.match} strokeWidth={3} opacity={0.7} />}
          <Tick p1={t1.A} p2={t1.C} n={3} color={C.match} />
          {!showFlipped && <Tick p1={t2.A} p2={t2.C} n={3} color={C.match} />}
        </> : null}

        {/* RHS isosceles highlight */}
        {showFlipped && curHi.includes("isosceles") ? <>
          <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={C.hyp} strokeWidth={2.5} />
          <line x1={t2.A.x} y1={t2.A.y} x2={t1.B.x} y2={t1.B.y} stroke={C.hyp} strokeWidth={2.5} strokeDasharray="6,3" />
          <Tick p1={t1.A} p2={t1.B} n={1} color={C.hyp} />
          <Tick p1={t2.A} p2={t1.B} n={1} color={C.hyp} />
        </> : null}

        {/* Labels */}
        <text x={t1.A.x-12} y={t1.A.y-6} fontSize={12} fill={theme.text} fontWeight={700}>A</text>
        <text x={t1.B.x-14} y={t1.B.y+15} fontSize={12} fill={theme.text} fontWeight={700}>B</text>
        <text x={t1.C.x+4} y={t1.C.y+15} fontSize={12} fill={theme.text} fontWeight={700}>C</text>
        {!showFlipped ? <>
          <text x={t2.A.x+4} y={t2.A.y-6} fontSize={12} fill={theme.text} fontWeight={700}>D</text>
          <text x={t2.B.x+4} y={t2.B.y+15} fontSize={12} fill={theme.text} fontWeight={700}>E</text>
          <text x={t2.C.x-14} y={t2.C.y+15} fontSize={12} fill={theme.text} fontWeight={700}>F</text>
        </> : <>
          <text x={t2.A.x+4} y={t2.A.y>t1.C.y?t2.A.y+15:t2.A.y-6}
            fontSize={12} fill={C.match} fontWeight={700}>D'</text>
        </>}

        {/* "90° 고정" badge */}
        <text x={t1.C.x+(t1.B.x>t1.C.x?-8:8)} y={t1.C.y-12} fontSize={9} fill={C.right} fontWeight={700}>90°</text>
        {!showFlipped && <text x={t2.C.x+(t2.B.x<t2.C.x?8:-8)} y={t2.C.y-12} fontSize={9} fill={C.right} fontWeight={700}>90°</text>}

        {/* "not ASA" X mark on RHA step 1 */}
        {mode==="rha" && curHi.includes("notasa") && <>
          <line x1={t1.B.x-5} y1={(t1.A.y+t1.B.y)/2-15} x2={t1.C.x+5} y2={(t1.A.y+t1.B.y)/2+5}
            stroke="#E55" strokeWidth={2.5} opacity={0.6} />
          <text x={(t1.B.x+t1.C.x)/2} y={(t1.A.y+t1.B.y)/2-20}
            textAnchor="middle" fontSize={9} fill="#E55" fontWeight={700}>끼인변 ✕</text>
        </>}

        {/* Proven checkmark */}
        {curHi.includes("proven") && <>
          <text x={W/2} y={20} textAnchor="middle" fontSize={14} fill={C.proven} fontWeight={700}>
            ≅ 합동! ✓
          </text>
        </>}
      </svg>
    );
  };

  const inputStyle = {
    width:"100%", padding:"10px", borderRadius:10,
    border:`1.5px solid ${theme.border}`, background:theme.bg,
    color:theme.text, fontSize:14, textAlign:"center",
    fontFamily:"'Noto Serif KR', serif",
  };

  return (
    <ScreenWrap title="직각삼각형의 합동 조건" back="그려서 공부하기" backTo="polygons">
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>

        {!mode ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:16, padding:20 }}>
            <div style={{ fontSize:36, marginBottom:4 }}>∟≅</div>
            <p style={{ fontSize:13, color:theme.text, fontWeight:700 }}>직각(90°)은 항상 고정!</p>
            <p style={{ fontSize:11, color:theme.textSec, textAlign:"center" }}>어떤 합동 조건을 살펴볼까요?</p>
            <div style={{ display:"flex", gap:12, width:"min(340px,90vw)" }}>
              {[["rha","RHA","빗변 + 한 예각","→ ASA인가?",C.angle],
                ["rhs","RHS","빗변 + 한 변","→ SSS인가?",C.side]].map(([m,title,sub,q,col])=>(
                <button key={m} onClick={()=>setMode(m)} style={{
                  flex:1, padding:"20px 14px", borderRadius:16,
                  border:`2px solid ${col}`, background:theme.card,
                  color:theme.text, fontSize:15, cursor:"pointer",
                  fontFamily:"'Noto Serif KR', serif", fontWeight:700,
                }}>
                  {title}
                  <br/><span style={{ fontSize:11, fontWeight:400, color:theme.textSec }}>{sub}</span>
                  <br/><span style={{ fontSize:10, fontWeight:700, color:col }}>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : !data ? (
          <div style={{ padding:20, animation:"fadeIn 0.4s ease" }}>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <span style={{ display:"inline-block", padding:"4px 14px", borderRadius:8, background:`${C.right}20`, color:C.right, fontSize:12, fontWeight:700, marginBottom:8 }}>
                ∠C = 90° 고정
              </span>
              <div style={{ fontSize:20, fontWeight:700, color:mode==="rha"?C.angle:C.side }}>
                {mode.toUpperCase()} 합동
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, color:C.hyp, fontWeight:700 }}>빗변 H</label>
                <input value={v1} onChange={e=>setV1(e.target.value)} placeholder="예: 10" style={inputStyle}
                  onKeyDown={e=>e.key==="Enter"&&submit()} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, color:mode==="rha"?C.angle:C.side, fontWeight:700 }}>
                  {mode==="rha"?"예각 A (°)":"한 변 S"}
                </label>
                <input value={v2} onChange={e=>setV2(e.target.value)}
                  placeholder={mode==="rha"?"예: 30":"예: 6"} style={inputStyle}
                  onKeyDown={e=>e.key==="Enter"&&submit()} />
              </div>
            </div>
            <button onClick={submit} style={{
              width:"100%", padding:"12px", borderRadius:12, border:"none",
              background:`linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
              color:"white", fontSize:14, fontWeight:700, cursor:"pointer",
            }}>증명 시작</button>
            {error && <p style={{ fontSize:11, color:PASTEL.coral, textAlign:"center", marginTop:8 }}>{error}</p>}
            <button onClick={()=>setMode(null)} style={{
              width:"100%", marginTop:8, padding:10, borderRadius:10,
              border:`1px solid ${theme.border}`, background:"transparent",
              color:theme.textSec, fontSize:12, cursor:"pointer",
            }}>← 돌아가기</button>
          </div>
        ) : (
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            {/* Canvas - compact, supporting role */}
            <div style={{ padding:"10px 10px 6px", textAlign:"center" }}>
              {renderCanvas()}
            </div>

            {/* Proof step - MAIN content */}
            <div style={{
              margin:"0 12px 10px", padding:"18px 16px", borderRadius:16,
              background: curHi.includes("proven") ? `${C.proven}08` : theme.card,
              border:`2px solid ${curHi.includes("proven")?C.proven:curHi.includes("asa")||curHi.includes("sss")?C.match:theme.border}`,
              transition:"all 0.3s",
            }}>
              <div style={{
                fontSize:15, fontWeight:700, marginBottom:10,
                color: curHi.includes("proven")?C.proven : curHi.includes("asa")||curHi.includes("sss")?C.match : theme.text,
              }}>
                {step+1}/{steps.length} · {steps[step].t}
              </div>
              <p style={{
                fontSize:13, color:theme.text, lineHeight:2, whiteSpace:"pre-line", margin:0,
                fontFamily:"'Noto Serif KR', serif",
              }}>
                {steps[step].d}
              </p>
            </div>

            {/* Step navigation */}
            <div style={{ display:"flex", gap:8, padding:"0 12px 16px" }}>
              {step>0 && (
                <button onClick={()=>setStep(s=>s-1)} style={{
                  flex:1, padding:"12px", borderRadius:12,
                  border:`1px solid ${theme.border}`, background:theme.card,
                  color:theme.textSec, fontSize:13, cursor:"pointer",
                }}>← 이전</button>
              )}
              {step<maxStep ? (
                <button onClick={()=>setStep(s=>s+1)} style={{
                  flex:2, padding:"12px", borderRadius:12, border:"none",
                  background:`linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
                  color:"white", fontSize:14, fontWeight:700, cursor:"pointer",
                }}>다음 →</button>
              ) : (
                <button onClick={()=>{setData(null);setStep(0);setMode(null);playSfx("click");}} style={{
                  flex:2, padding:"12px", borderRadius:12, border:"none",
                  background:C.proven, color:"white", fontSize:14, fontWeight:700, cursor:"pointer",
                }}>다시 하기</button>
              )}
            </div>

            {/* Step dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:4, paddingBottom:12 }}>
              {steps.map((_,i)=>(
                <div key={i} style={{
                  width:i===step?16:6, height:6, borderRadius:3,
                  background:i<=step?(curHi.includes("proven")?C.proven:PASTEL.coral):`${theme.textSec}30`,
                  transition:"all 0.3s",
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScreenWrap>
  );
}

export function renderCongruenceScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg, ScreenWrap } = ctx;
  return <CongruenceScreenInner theme={theme} setScreen={setScreen}
    playSfx={playSfx} showMsg={showMsg} ScreenWrap={ScreenWrap} />;
}
