import { useState, useEffect, useRef, useCallback } from "react";
import { PASTEL, dist } from "../config";

const COL = { hyp: "#D95F4B", angle: "#3A8FC2", side: "#2E9E6B", right: "#9B7FBF", match: "#E8A040", proven: "#28A745", dim: "#AAA" };

function Tick({ p1, p2, n, color }) {
  const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
  const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy);
  if(len<1) return null;
  const nx=-dy/len*6, ny=dx/len*6;
  return <>{Array.from({length:n},(_,i)=>{
    const off=(i-(n-1)/2)*4;
    const bx=mx+(dx/len)*off, by=my+(dy/len)*off;
    return <line key={i} x1={bx-nx} y1={by-ny} x2={bx+nx} y2={by+ny} stroke={color} strokeWidth={2}/>;
  })}</>;
}

function RightMark({ x, y, d1, d2, size=8, color }) {
  return <path d={`M ${x+d1.x*size} ${y+d1.y*size} L ${x+d1.x*size+d2.x*size} ${y+d1.y*size+d2.y*size} L ${x+d2.x*size} ${y+d2.y*size}`} fill="none" stroke={color} strokeWidth={1.2}/>;
}

function AngleArc({ cx, cy, r, a1, a2, color, sw=2 }) {
  const sx=cx+r*Math.cos(a1), sy=cy-r*Math.sin(a1);
  const ex=cx+r*Math.cos(a2), ey=cy-r*Math.sin(a2);
  return <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 0 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={sw}/>;
}

const lerp = (a,b,t) => ({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t});
const lerpN = (a,b,t) => a+(b-a)*t;
const ease = t => t<0.5 ? 2*t*t : -1+(4-2*t)*t;

export function CongruenceScreenInner({ theme, setScreen, playSfx, showMsg }) {
  const [mode, setMode] = useState(null); // "rha"|"rhs"
  const [inputMode, setInputMode] = useState("A");
  const [v1, setV1] = useState(""); const [v2, setV2] = useState("");
  const [error, setError] = useState("");
  // Phases: "input" → "build" → "split" → "proof"
  const [phase, setPhase] = useState("input");
  const [triData, setTriData] = useState(null); // {hyp,adj,opp,angDeg}
  const [anim, setAnim] = useState(0); // 0-1 animation progress
  const [proofStep, setProofStep] = useState(0);
  const [flipAnim, setFlipAnim] = useState(0);
  // Drawing
  const svgRef = useRef(null);
  const [drawPhase, setDrawPhase] = useState(0);
  const [drawStroke, setDrawStroke] = useState([]);
  const [drawnHyp, setDrawnHyp] = useState(null);

  const W = Math.min(typeof window!=="undefined"?window.innerWidth-16:380, 420);
  const H = 300;

  // Compute triangle data
  const compute = useCallback((hyp, v, m) => {
    const angRad = m==="rha" ? v*Math.PI/180 : Math.acos(Math.min(v/hyp,0.9999));
    const adj = hyp*Math.cos(angRad), opp = hyp*Math.sin(angRad);
    return { hyp, adj, opp, angDeg: angRad*180/Math.PI, side: m==="rhs"?v:adj };
  }, []);

  // Submit numeric input
  const submit = () => {
    const h=parseFloat(v1), x=parseFloat(v2);
    if(isNaN(h)||isNaN(x)||h<=0||x<=0){setError("양수를 입력해주세요");return;}
    if(mode==="rha"&&(x<=0||x>=90)){setError("예각(0°~90°)을 입력하세요");return;}
    if(mode==="rhs"&&x>=h){setError("변은 빗변보다 짧아야 해요");return;}
    setError("");
    setTriData(compute(h,x,mode));
    startBuild();
  };

  const startBuild = () => {
    setPhase("build"); setAnim(0);
    playSfx("click");
  };

  // Build animation
  useEffect(() => {
    if(phase!=="build") return;
    let start=null; const dur=1500;
    const tick=(ts)=>{
      if(!start)start=ts;
      const p=Math.min((ts-start)/dur,1);
      setAnim(p);
      if(p<1) requestAnimationFrame(tick);
      else setTimeout(()=>{setPhase("split");setAnim(0);},300);
    };
    requestAnimationFrame(tick);
  }, [phase]);

  // Split animation (shrink + move left + clone appears)
  useEffect(() => {
    if(phase!=="split") return;
    let start=null; const dur=1000;
    const tick=(ts)=>{
      if(!start)start=ts;
      const p=Math.min((ts-start)/dur,1);
      setAnim(ease(p));
      if(p<1) requestAnimationFrame(tick);
      else setTimeout(()=>{setPhase("proof");setProofStep(0);},200);
    };
    requestAnimationFrame(tick);
  }, [phase]);

  // RHS flip animation at proof step 3 (붙이기)
  useEffect(() => {
    if(mode!=="rhs"||phase!=="proof") return;
    const flipStep = 2; // "삼각형 붙이기" step
    if(proofStep!==flipStep){if(proofStep>flipStep)setFlipAnim(1);return;}
    setFlipAnim(0);
    let start=null; const dur=1500;
    const tick=(ts)=>{
      if(!start)start=ts;
      const p=Math.min((ts-start)/dur,1);
      setFlipAnim(ease(p));
      if(p<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [proofStep, phase, mode]);

  // Drawing handlers
  const getSvgPt = useCallback((e) => {
    const svg=svgRef.current; if(!svg) return null;
    const pt=svg.createSVGPoint();
    const src=e.touches?e.touches[0]:e;
    pt.x=src.clientX; pt.y=src.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const onDrawStart = useCallback((e) => {
    e.preventDefault();
    const pt=getSvgPt(e); if(!pt) return;
    if(drawPhase===0||drawPhase===2){
      setDrawStroke([{x:pt.x,y:pt.y}]);
      setDrawPhase(p=>p===0?1:3);
    }
  }, [drawPhase, getSvgPt]);

  const onDrawMove = useCallback((e) => {
    e.preventDefault();
    if(drawPhase!==1&&drawPhase!==3) return;
    const pt=getSvgPt(e); if(!pt) return;
    setDrawStroke(p=>[...p,{x:pt.x,y:pt.y}]);
  }, [drawPhase, getSvgPt]);

  const onDrawEnd = useCallback(() => {
    if(drawPhase===1&&drawStroke.length>=2){
      const s=drawStroke[0],e=drawStroke[drawStroke.length-1];
      const len=dist(s,e);
      if(len<30){setDrawStroke([]);setDrawPhase(0);showMsg("더 길게 그려주세요!",1500);return;}
      setDrawnHyp({start:s,end:e,length:len});
      setDrawStroke([]); setDrawPhase(2); playSfx("draw");
    } else if(drawPhase===3&&drawStroke.length>=2){
      const s=drawStroke[0],e=drawStroke[drawStroke.length-1];
      const len=dist(s,e);
      if(len<15){setDrawStroke([]);setDrawPhase(2);return;}
      const ratio=len/drawnHyp.length;
      if(mode==="rhs"){
        if(ratio>=1){showMsg("빗변보다 짧아야 해요!",1500);setDrawStroke([]);setDrawPhase(2);return;}
        setTriData(compute(10,10*ratio,mode));
      } else {
        const hDx=drawnHyp.end.x-drawnHyp.start.x, hDy=drawnHyp.end.y-drawnHyp.start.y;
        const sDx=e.x-s.x, sDy=e.y-s.y;
        let ang=Math.abs(Math.atan2(-hDy,hDx)-Math.atan2(-sDy,sDx))*180/Math.PI;
        if(ang>90)ang=180-ang;
        if(ang<5||ang>85){showMsg("5°~85° 사이의 각을 그려주세요!",1500);setDrawStroke([]);setDrawPhase(2);return;}
        setTriData(compute(10,ang,mode));
      }
      setDrawStroke([]); setDrawPhase(0);
      startBuild();
    }
  }, [drawPhase, drawStroke, drawnHyp, mode, compute, playSfx, showMsg]);

  // Triangle positions
  const getTris = () => {
    if(!triData) return null;
    const {hyp,adj,opp} = triData;
    const sc = Math.min(W*0.3, H*0.35)/hyp;

    if(phase==="build"){
      // Center, building
      const cx=W/2, cy=H*0.75;
      const B={x:cx-adj*sc/2,y:cy}, Cp={x:cx+adj*sc/2,y:cy}, A={x:Cp.x,y:cy-opp*sc};
      const buildP = anim;
      return { t1:{A,B,C:Cp}, t2:null, buildP, scale:1 };
    }

    if(phase==="split"){
      // Animate from center to left, clone appears right
      const sc2 = lerpN(1, 0.8, anim);
      const baseX = lerpN(W/2, W*0.28, anim);
      const B={x:baseX-adj*sc*sc2/2, y:H*0.75};
      const Cp={x:baseX+adj*sc*sc2/2, y:H*0.75};
      const A={x:Cp.x, y:H*0.75-opp*sc*sc2};

      const rx = lerpN(W*0.28, W*0.72, anim); // clone slides in
      const B2={x:rx+adj*sc*sc2/2, y:H*0.75};
      const C2={x:rx-adj*sc*sc2/2, y:H*0.75};
      const A2={x:C2.x, y:H*0.75-opp*sc*sc2};

      return { t1:{A,B,C:Cp}, t2:{A:A2,B:B2,C:C2}, scale:sc2, cloneOpacity:anim };
    }

    if(phase==="proof"){
      const sc2=0.8;
      const lx=W*0.28, rx=W*0.72;
      const B={x:lx-adj*sc*sc2/2, y:H*0.75};
      const Cp={x:lx+adj*sc*sc2/2, y:H*0.75};
      const A={x:Cp.x, y:H*0.75-opp*sc*sc2};

      const B2={x:rx+adj*sc*sc2/2, y:H*0.75};
      const C2={x:rx-adj*sc*sc2/2, y:H*0.75};
      const A2={x:C2.x, y:H*0.75-opp*sc*sc2};

      // RHS flip: move t2 to overlap with t1 along AC side
      if(mode==="rhs" && proofStep>=2){
        const p = proofStep===2 ? flipAnim : 1;
        // Target: A2→A, C2→C, B2→mirror of B across AC line
        const mirB = {x:Cp.x, y:H*0.75+(H*0.75-A.y)}; // mirror of A below C → actually B' below baseline
        const targetA2 = A;
        const targetC2 = Cp;
        const targetB2 = {x: Cp.x - (Cp.x - B.x), y: H*0.75 + (H*0.75 - A.y)}; // D' position
        // Actually: flip along AC. A stays, C stays, B goes to opposite side
        const targetD = {x: A.x, y: 2*Cp.y - A.y}; // mirror A across C baseline
        return {
          t1:{A,B,C:Cp},
          t2:{A:lerp(A2,targetD,p), B:lerp(B2,B,p), C:lerp(C2,Cp,p)},
          scale:sc2, cloneOpacity:1, flipping:true
        };
      }

      return { t1:{A,B,C:Cp}, t2:{A:A2,B:B2,C:C2}, scale:sc2, cloneOpacity:1 };
    }
    return null;
  };

  // Proof steps
  const rhaSteps = [
    {t:"RHA 합동 조건", d:"직각(R) + 빗변(H) + 한 예각(A)이 같다", hi:["right","hyp","angle"]},
    {t:"🤔 ASA가 아닌 것 같은데?", d:"ASA는 '끼인변'의 양 끝 각이 같아야 한다.\n빗변은 직각과 예각 사이에 끼인 변이 아니다!", hi:["notasa"]},
    {t:"💡 세 번째 각의 크기", d:`∠C = ∠F = 90° (직각)\n∠A = ∠D = ${triData?triData.angDeg.toFixed(1):"?"}°\n\n∴ ∠B = 180° - 90° - ${triData?triData.angDeg.toFixed(1):"?"}°\n   = ${triData?(90-triData.angDeg).toFixed(1):"?"}° = ∠E`, hi:["third"]},
    {t:"✅ ASA 합동!", d:`∠A = ∠D, AB = DE, ∠B = ∠E\n→ 빗변의 양 끝 각이 같다\n→ ASA 합동 성립!`, hi:["asa"]},
    {t:"∴ RHA = ASA 합동 ✓", d:"직각삼각형에서 빗변과 한 예각이 같으면\n나머지 각이 자동 결정 → ASA □", hi:["proven"]},
  ];

  const rhsSteps = [
    {t:"RHS 합동 조건", d:"직각(R) + 빗변(H) + 한 변(S)이 같다", hi:["right","hyp","side"]},
    {t:"🤔 SAS가 아닌 것 같은데?", d:"SAS는 두 변과 끼인각이 필요한데...\n직각(∠B)은 빗변(AC)과 다른 한 변(AB)의\n끼인각이 아니다!", hi:["question"]},
    {t:"🔄 삼각형을 뒤집어 붙이자!", d:"같은 변(S)인 AB와 DE를 맞대고\n△DEF를 뒤집어 붙이면...", hi:["flip"]},
    {t:"📐 C-B-F'은 일직선!", d:"∠ABC = ∠ABF' = 90°\n→ ∠CBF' = 90° + 90° = 180°\n→ C, B(E), F'은 한 직선 위에 있다!", hi:["collinear"]},
    {t:"📐 이등변삼각형!", d:`AC = AF' = ${triData?triData.hyp:""} (빗변이 같으므로)\n→ △ACF'은 이등변삼각형!`, hi:["isosceles"]},
    {t:"밑각의 성질", d:"이등변삼각형의 성질에 의해\n∠ACB = ∠AF'B\n즉, ∠C = ∠F!", hi:["baseangle"]},
    {t:"✅ SAS 합동!", d:`AB = DE (한 변 S)\n∠A = ∠D (∵ ∠B=∠E=90°, ∠C=∠F)\nAC = DF (빗변 H)\n\n→ 두 변과 끼인각이 같다 → SAS!`, hi:["sas"]},
    {t:"∴ RHS = SAS 합동 ✓", d:"직각삼각형을 붙여 이등변삼각형을 만들고\n밑각의 성질로 ∠C = ∠F를 증명\n→ 끼인각 ∠A = ∠D 결정 → SAS □", hi:["proven"]},
  ];

  const steps = mode==="rha"?rhaSteps:rhsSteps;
  const maxStep = steps.length-1;
  const curHi = phase==="proof"&&proofStep<=maxStep ? steps[proofStep].hi : [];

  const dir=(a,b)=>{const d=dist(a,b);return d<0.1?{x:0,y:0}:{x:(b.x-a.x)/d,y:(b.y-a.y)/d};};

  // Render canvas
  const renderCanvas = () => {
    const tris = getTris();
    if(!tris) return null;
    const {t1,t2,buildP,scale,cloneOpacity,flipping} = tris;
    const angDeg = triData?.angDeg||30;

    return (
      <svg width={W} height={H} style={{background:theme.svgBg, borderRadius:14, border:`1px solid ${theme.border}`}}>
        {/* Triangle 1 - build animation */}
        {phase==="build" ? (
          <g>
            {/* Right angle corner first, then sides extend */}
            {buildP>0 && <>
              {/* Side BC (bottom) */}
              <line x1={t1.C.x} y1={t1.C.y} x2={lerpN(t1.C.x,t1.B.x,Math.min(buildP*2,1))} y2={t1.C.y}
                stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>
              {/* Side AC (vertical) */}
              {buildP>0.2 && <line x1={t1.C.x} y1={t1.C.y}
                x2={t1.C.x} y2={lerpN(t1.C.y,t1.A.y,Math.min((buildP-0.2)*2.5,1))}
                stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>}
              {/* Hypotenuse AB */}
              {buildP>0.5 && <line
                x1={lerpN(t1.B.x,t1.B.x,1)} y1={t1.B.y}
                x2={lerpN(t1.B.x,t1.A.x,Math.min((buildP-0.5)*2,1))}
                y2={lerpN(t1.B.y,t1.A.y,Math.min((buildP-0.5)*2,1))}
                stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>}
              {/* Right angle mark appears */}
              {buildP>0.3 && <RightMark x={t1.C.x} y={t1.C.y} d1={dir(t1.C,t1.B)} d2={dir(t1.C,t1.A)} color={COL.right}/>}
              {/* Labels */}
              {buildP>0.8 && <>
                <text x={t1.A.x+6} y={t1.A.y-4} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
                <text x={t1.B.x-14} y={t1.B.y+14} fontSize={11} fill={theme.text} fontWeight={700}>B</text>
                <text x={t1.C.x+4} y={t1.C.y+14} fontSize={11} fill={theme.text} fontWeight={700}>C</text>
              </>}
            </>}
          </g>
        ) : (
          <g>
            {/* Triangle 1 */}
            <polygon points={`${t1.A.x},${t1.A.y} ${t1.B.x},${t1.B.y} ${t1.C.x},${t1.C.y}`}
              fill="none" stroke={theme.text} strokeWidth={2} strokeLinejoin="round"/>
            <RightMark x={t1.C.x} y={t1.C.y} d1={dir(t1.C,t1.B)} d2={dir(t1.C,t1.A)} color={COL.right}/>
            <text x={t1.C.x+(t1.B.x<t1.C.x?4:-16)} y={t1.C.y-10} fontSize={9} fill={COL.right} fontWeight={700}>90°</text>
            <text x={t1.A.x+(t1.A.x>W/2?4:-12)} y={t1.A.y-4} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
            <text x={t1.B.x-14} y={t1.B.y+14} fontSize={11} fill={theme.text} fontWeight={700}>B</text>
            <text x={t1.C.x+4} y={t1.C.y+14} fontSize={11} fill={theme.text} fontWeight={700}>C</text>

            {/* Triangle 2 */}
            {t2 && <g opacity={cloneOpacity||1}>
              <polygon points={`${t2.A.x},${t2.A.y} ${t2.B.x},${t2.B.y} ${t2.C.x},${t2.C.y}`}
                fill={flipping?`${COL.match}10`:"none"}
                stroke={flipping?COL.match:theme.text} strokeWidth={2} strokeLinejoin="round"
                strokeDasharray={flipping&&flipAnim<1?"6,4":"none"}/>
              {!flipping && <RightMark x={t2.C.x} y={t2.C.y} d1={dir(t2.C,t2.B)} d2={dir(t2.C,t2.A)} color={COL.right}/>}
              {!flipping && <text x={t2.C.x+(t2.B.x>t2.C.x?-16:4)} y={t2.C.y-10} fontSize={9} fill={COL.right} fontWeight={700}>90°</text>}
              {!flipping ? <>
                <text x={t2.A.x+(t2.A.x<W/2?-12:4)} y={t2.A.y-4} fontSize={11} fill={theme.text} fontWeight={700}>D</text>
                <text x={t2.B.x+4} y={t2.B.y+14} fontSize={11} fill={theme.text} fontWeight={700}>E</text>
                <text x={t2.C.x-14} y={t2.C.y+14} fontSize={11} fill={theme.text} fontWeight={700}>F</text>
              </> : <>
                <text x={t2.A.x+4} y={t2.A.y>t1.C.y?t2.A.y+14:t2.A.y-4}
                  fontSize={11} fill={COL.match} fontWeight={700}>E'</text>
              </>}
            </g>}

            {/* Highlights based on proof step */}
            {/* Hypotenuse */}
            {(curHi.includes("hyp")||curHi.includes("asa")||curHi.includes("sas")||curHi.includes("proven")) && <>
              <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={COL.hyp} strokeWidth={3.5} opacity={0.7}/>
              {t2&&!flipping && <line x1={t2.A.x} y1={t2.A.y} x2={t2.B.x} y2={t2.B.y} stroke={COL.hyp} strokeWidth={3.5} opacity={0.7}/>}
              <Tick p1={t1.A} p2={t1.B} n={1} color={COL.hyp}/>
              {t2&&!flipping && <Tick p1={t2.A} p2={t2.B} n={1} color={COL.hyp}/>}
            </>}
            {/* RHA: angle */}
            {mode==="rha"&&(curHi.includes("angle")||curHi.includes("asa")||curHi.includes("proven")) && <>
              <AngleArc cx={t1.B.x} cy={t1.B.y} r={16} a1={(90-angDeg)*Math.PI/180} a2={Math.PI/2} color={COL.angle}/>
              <text x={t1.B.x+18} y={t1.B.y-8} fontSize={9} fill={COL.angle} fontWeight={700}>{angDeg.toFixed(0)}°</text>
              {t2 && <>
                <AngleArc cx={t2.B.x} cy={t2.B.y} r={16} a1={Math.PI/2} a2={(90+angDeg)*Math.PI/180} color={COL.angle}/>
                <text x={t2.B.x-28} y={t2.B.y-8} fontSize={9} fill={COL.angle} fontWeight={700}>{angDeg.toFixed(0)}°</text>
              </>}
            </>}
            {/* RHA: third angle */}
            {mode==="rha"&&(curHi.includes("third")||curHi.includes("asa")||curHi.includes("proven")) && <>
              <AngleArc cx={t1.A.x} cy={t1.A.y} r={14} a1={3*Math.PI/2} a2={3*Math.PI/2+(90-angDeg)*Math.PI/180} color={COL.match}/>
              <text x={t1.A.x-24} y={t1.A.y+4} fontSize={8} fill={COL.match} fontWeight={700}>{(90-angDeg).toFixed(0)}°</text>
            </>}
            {/* RHS: side */}
            {mode==="rhs"&&(curHi.includes("side")||curHi.includes("sas")||curHi.includes("proven")) && <>
              <line x1={t1.A.x} y1={t1.A.y} x2={t1.C.x} y2={t1.C.y} stroke={COL.side} strokeWidth={3.5} opacity={0.7}/>
              {t2&&!flipping && <line x1={t2.A.x} y1={t2.A.y} x2={t2.C.x} y2={t2.C.y} stroke={COL.side} strokeWidth={3.5} opacity={0.7}/>}
              <Tick p1={t1.A} p2={t1.C} n={2} color={COL.side}/>
              {t2&&!flipping && <Tick p1={t2.A} p2={t2.C} n={2} color={COL.side}/>}
            </>}
            {/* RHS: isosceles highlight */}
            {flipping&&(curHi.includes("isosceles")||curHi.includes("baseangle")||curHi.includes("sas")||curHi.includes("proven")) && t2 && <>
              <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={COL.hyp} strokeWidth={2.5}/>
              <line x1={t2.A.x} y1={t2.A.y} x2={t1.B.x} y2={t1.B.y} stroke={COL.hyp} strokeWidth={2.5} strokeDasharray="6,3"/>
              <Tick p1={t1.A} p2={t1.B} n={1} color={COL.hyp}/>
              <Tick p1={t2.A} p2={t1.B} n={1} color={COL.hyp}/>
            </>}
            {/* RHS: collinear line */}
            {flipping&&(curHi.includes("collinear")||curHi.includes("baseangle")||curHi.includes("sas")||curHi.includes("proven")) && t2 && <>
              <line x1={t1.B.x-20} y1={t1.B.y} x2={t1.C.x+20} y2={t1.C.y}
                stroke={COL.match} strokeWidth={1.5} strokeDasharray="8,4" opacity={0.6}/>
              <line x1={t1.C.x} y1={t1.C.y} x2={t2.A.x>t1.C.x?t2.A.x+20:t2.A.x-20} y2={t1.C.y}
                stroke={COL.match} strokeWidth={1.5} strokeDasharray="8,4" opacity={0.6}/>
            </>}
            {/* RHS: ∠C = ∠F (baseangle), then ∠A=∠D for SAS */}
            {flipping&&(curHi.includes("baseangle")||curHi.includes("sas")||curHi.includes("proven")) && t2 && <>
              <AngleArc cx={t1.B.x} cy={t1.B.y} r={14} a1={Math.atan2(-(t1.A.y-t1.B.y),t1.A.x-t1.B.x)} a2={Math.atan2(-(t1.C.y-t1.B.y),t1.C.x-t1.B.x)} color={COL.match} sw={2.5}/>
              <AngleArc cx={t2.A.x} cy={t2.A.y} r={14} a1={Math.atan2(-(t1.A.y-t2.A.y),t1.A.x-t2.A.x)} a2={Math.atan2(-(t1.B.y-t2.A.y),t1.B.x-t2.A.x)} color={COL.match} sw={2.5}/>
            </>}
            {/* RHS: ∠A=∠D for SAS */}
            {flipping&&(curHi.includes("sas")||curHi.includes("proven")) && <>
              <AngleArc cx={t1.A.x} cy={t1.A.y} r={12} a1={Math.atan2(-(t1.B.y-t1.A.y),t1.B.x-t1.A.x)} a2={Math.atan2(-(t1.C.y-t1.A.y),t1.C.x-t1.A.x)} color={COL.angle} sw={2}/>
            </>}
            {/* Proven */}
            {curHi.includes("proven") && <text x={W/2} y={18} textAnchor="middle" fontSize={14} fill={COL.proven} fontWeight={700}>≅ 합동! ✓</text>}
            {/* "not ASA" mark */}
            {curHi.includes("notasa") && <text x={W/2} y={18} textAnchor="middle" fontSize={10} fill="#E55" fontWeight={700}>빗변은 끼인변이 아니다 ✕</text>}
          </g>
        )}
      </svg>
    );
  };

  const ist = {padding:"12px",borderRadius:10,border:`1.5px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:14,textAlign:"center",fontFamily:"'Noto Serif KR', serif",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{height:"100vh",maxHeight:"100dvh",display:"flex",flexDirection:"column",background:theme.bg,fontFamily:"'Noto Serif KR', serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{flexShrink:0,display:"flex",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${theme.border}`}}>
        <button onClick={()=>{
          if(phase!=="input"&&triData){setPhase("input");setTriData(null);setDrawPhase(0);setDrawnHyp(null);}
          else if(mode){setMode(null);}
          else{playSfx("click");setScreen("polygons");}
        }} style={{background:"none",border:"none",color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 뒤로</button>
        <span style={{flex:1,textAlign:"center",fontSize:14,fontWeight:700,color:theme.text,fontFamily:"'Playfair Display', serif"}}>
          {mode?`${mode.toUpperCase()} 합동`:"직각삼각형의 합동"}
        </span>
        <span style={{width:40}}/>
      </div>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"}}>
        {/* Mode select */}
        {!mode && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:20}}>
            <div style={{fontSize:36}}>∟≅</div>
            <p style={{fontSize:13,color:theme.text,fontWeight:700}}>직각(90°)은 항상 고정!</p>
            <div style={{display:"flex",gap:12,width:"min(340px,90vw)"}}>
              {[["rha","RHA","빗변 + 한 예각","→ ASA?",COL.angle],["rhs","RHS","빗변 + 한 변","→ SAS?",COL.side]].map(([m,t,s,q,col])=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"20px 14px",borderRadius:16,border:`2px solid ${col}`,background:theme.card,color:theme.text,fontSize:15,cursor:"pointer",fontWeight:700}}>
                  {t}<br/><span style={{fontSize:11,fontWeight:400,color:theme.textSec}}>{s}</span>
                  <br/><span style={{fontSize:10,fontWeight:700,color:col}}>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {mode && phase==="input" && (
          <div style={{padding:20,animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{display:"inline-block",padding:"4px 14px",borderRadius:8,background:`${COL.right}20`,color:COL.right,fontSize:12,fontWeight:700}}>∠C = 90° 고정</span>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["A","✏️ 수치 입력"],["B","👆 직접 그리기"]].map(([k,l])=>(
                <button key={k} onClick={()=>{setInputMode(k);setDrawPhase(0);setDrawnHyp(null);setDrawStroke([]);}} style={{
                  flex:1,padding:"8px",borderRadius:10,fontSize:12,
                  border:`2px solid ${inputMode===k?PASTEL.coral:theme.border}`,
                  background:inputMode===k?theme.accentSoft:theme.card,
                  color:theme.text,cursor:"pointer",fontWeight:inputMode===k?700:400,
                }}>{l}</button>
              ))}
            </div>
            {inputMode==="A" ? (
              <div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:10,color:COL.hyp,fontWeight:700}}>빗변 H</label>
                    <input value={v1} onChange={e=>setV1(e.target.value)} placeholder="예: 10" style={ist} inputMode="decimal" onKeyDown={e=>e.key==="Enter"&&submit()}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:10,color:mode==="rha"?COL.angle:COL.side,fontWeight:700}}>{mode==="rha"?"예각 A (°)":"한 변 S"}</label>
                    <input value={v2} onChange={e=>setV2(e.target.value)} placeholder={mode==="rha"?"예: 30":"예: 6"} style={ist} inputMode="decimal" onKeyDown={e=>e.key==="Enter"&&submit()}/>
                  </div>
                </div>
                <button onClick={submit} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>증명 시작</button>
                {error && <p style={{fontSize:11,color:PASTEL.coral,textAlign:"center",marginTop:8}}>{error}</p>}
              </div>
            ) : (
              <div>
                <p style={{fontSize:11,color:theme.textSec,textAlign:"center",marginBottom:8}}>
                  {drawPhase<2?"① 빗변을 그어주세요":mode==="rha"?"② 예각 방향 선을 그어주세요":"② 다른 한 변을 그어주세요"}
                </p>
                <svg ref={svgRef} width={W} height={260} style={{background:theme.svgBg,borderRadius:14,border:`1px solid ${theme.border}`,touchAction:"none"}}
                  onMouseDown={onDrawStart} onMouseMove={onDrawMove} onMouseUp={onDrawEnd}
                  onTouchStart={onDrawStart} onTouchMove={onDrawMove} onTouchEnd={onDrawEnd}>
                  {drawnHyp && <line x1={drawnHyp.start.x} y1={drawnHyp.start.y} x2={drawnHyp.end.x} y2={drawnHyp.end.y} stroke={COL.hyp} strokeWidth={3} strokeLinecap="round"/>}
                  {drawnHyp && <text x={(drawnHyp.start.x+drawnHyp.end.x)/2} y={(drawnHyp.start.y+drawnHyp.end.y)/2-10} textAnchor="middle" fontSize={11} fill={COL.hyp} fontWeight={700}>빗변 H</text>}
                  {drawStroke.length>1 && <polyline points={drawStroke.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={drawPhase===1?COL.hyp:mode==="rha"?COL.angle:COL.side} strokeWidth={2.5} strokeLinecap="round"/>}
                </svg>
                {drawnHyp && <button onClick={()=>{setDrawPhase(0);setDrawnHyp(null);setDrawStroke([]);}} style={{width:"100%",marginTop:8,padding:8,borderRadius:10,border:`1px solid ${theme.border}`,background:"transparent",color:theme.textSec,fontSize:11,cursor:"pointer"}}>다시 그리기</button>}
              </div>
            )}
          </div>
        )}

        {/* Build / Split / Proof - canvas + steps */}
        {phase!=="input" && triData && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{padding:"10px 8px 6px",textAlign:"center"}}>{renderCanvas()}</div>

            {phase==="proof" && <>
              <div style={{margin:"0 12px 10px",padding:"18px 16px",borderRadius:16,
                background:curHi.includes("proven")?`${COL.proven}08`:theme.card,
                border:`2px solid ${curHi.includes("proven")?COL.proven:curHi.includes("asa")||curHi.includes("sas")?COL.match:theme.border}`,
              }}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:10,color:curHi.includes("proven")?COL.proven:curHi.includes("asa")||curHi.includes("sas")?COL.match:theme.text}}>
                  {proofStep+1}/{steps.length} · {steps[proofStep].t}
                </div>
                <p style={{fontSize:13,color:theme.text,lineHeight:2,whiteSpace:"pre-line",margin:0}}>{steps[proofStep].d}</p>
              </div>
              <div style={{display:"flex",gap:8,padding:"0 12px 12px"}}>
                {proofStep>0 && <button onClick={()=>setProofStep(s=>s-1)} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 이전</button>}
                {proofStep<maxStep ? (
                  <button onClick={()=>setProofStep(s=>s+1)} style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>다음 →</button>
                ) : (
                  <button onClick={()=>{setPhase("input");setTriData(null);setMode(null);setDrawPhase(0);setDrawnHyp(null);playSfx("click");}} style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:COL.proven,color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>다시 하기</button>
                )}
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:4,paddingBottom:12}}>
                {steps.map((_,i)=><div key={i} style={{width:i===proofStep?16:6,height:6,borderRadius:3,background:i<=proofStep?(curHi.includes("proven")?COL.proven:PASTEL.coral):`${theme.textSec}30`,transition:"all 0.3s"}}/>)}
              </div>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}

export function renderCongruenceScreen(ctx) {
  const { theme, setScreen, playSfx, showMsg } = ctx;
  return <CongruenceScreenInner theme={theme} setScreen={setScreen} playSfx={playSfx} showMsg={showMsg}/>;
}
