
import { useState, useEffect, useRef, useCallback } from "react";
import { PASTEL, dist } from "../config";

const C = {hyp:"#D95F4B",angle:"#3A8FC2",side:"#2E9E6B",right:"#9B7FBF",match:"#E8A040",proven:"#28A745",dim:"#999"};
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const lerpN=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<0.5?2*t*t:-1+(4-2*t)*t;

// Interior angle arc (always draws through triangle interior)
function IArc({v,p1,p2,r=16,color,sw=2.5,glow}) {
  const a1=Math.atan2(p1.y-v.y,p1.x-v.x), a2=Math.atan2(p2.y-v.y,p2.x-v.x);
  let diff=a2-a1; if(diff>Math.PI)diff-=2*Math.PI; if(diff<-Math.PI)diff+=2*Math.PI;
  const end=a1+diff;
  const sx=v.x+r*Math.cos(a1),sy=v.y+r*Math.sin(a1);
  const ex=v.x+r*Math.cos(end),ey=v.y+r*Math.sin(end);
  const sweep=diff>0?1:0, large=Math.abs(diff)>Math.PI?1:0;
  return <g className={glow?"blink":""}><path d={`M${sx} ${sy}A${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={sw}/>
    {glow&&<circle cx={v.x} cy={v.y} r={r+4} fill={color} opacity={0.1}/>}</g>;
}

function Tick({p1,p2,n,color,blink}) {
  const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2,dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.sqrt(dx*dx+dy*dy);
  if(len<1)return null;const nx=-dy/len*6,ny=dx/len*6;
  return <g className={blink?"blink":""}>{Array.from({length:n},(_,i)=>{
    const off=(i-(n-1)/2)*4,bx=mx+(dx/len)*off,by=my+(dy/len)*off;
    return <line key={i} x1={bx-nx} y1={by-ny} x2={bx+nx} y2={by+ny} stroke={color} strokeWidth={2}/>;
  })}</g>;
}

function RightMark({x,y,d1,d2,size=8,color,glow}) {
  return <g className={glow?"blink":""}><path d={`M${x+d1.x*size} ${y+d1.y*size}L${x+d1.x*size+d2.x*size} ${y+d1.y*size+d2.y*size}L${x+d2.x*size} ${y+d2.y*size}`} fill="none" stroke={color} strokeWidth={1.5}/>
    {glow&&<circle cx={x} cy={y} r={size+4} fill={color} opacity={0.12}/>}</g>;
}

// Rich text: {hl:text:color} → highlighted, {bk:text:color} → bold colored
function RT({children}) {
  if(!children)return null;
  const parts=(children+"").split(/(\{[^}]+\})/);
  return <>{parts.map((p,i)=>{
    const m=p.match(/\{(hl|bk):(.+?):(.+?)\}/);
    if(m) return m[1]==="hl"
      ? <span key={i} style={{background:m[3]+"30",padding:"1px 5px",borderRadius:4,color:m[3],fontWeight:700}}>{m[2]}</span>
      : <span key={i} className="blink" style={{color:m[3],fontWeight:700}}>{m[2]}</span>;
    return <span key={i}>{p}</span>;
  })}</>;
}

// SVG text with background halo for readability
function HText({x,y,children,fill,fontSize=11,anchor="middle",fw=700}) {
  return <g>
    <text x={x} y={y} textAnchor={anchor} fontSize={fontSize} fontWeight={fw}
      fill="none" stroke="white" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">{children}</text>
    <text x={x} y={y} textAnchor={anchor} fontSize={fontSize} fontWeight={fw}
      fill={fill}>{children}</text>
  </g>;
}

export function CongruenceScreenInner({theme,setScreen,playSfx,showMsg,isPC:isPCProp,user,archive,setArchive,archiveDefaultPublic,helpRequests,setHelpRequests}) {
  const [mode,setMode]=useState(null);
  const [inputMode,setInputMode]=useState("A");
  const [v1,setV1]=useState("");const [v2,setV2]=useState("");
  const [error,setError]=useState("");
  const [phase,setPhase]=useState("input");
  const [triData,setTriData]=useState(null);
  const [anim,setAnim]=useState(0);
  const [proofStep,setProofStep]=useState(0);
  const [flipAnim,setFlipAnim]=useState(0);
  // Pinch-to-zoom
  const [vb,setVb]=useState(null);
  const [helpPopupData,setHelpPopupData]=useState(null); // {x,y,w,h}
  const pinchRef=useRef(null);
  // Drawing
  const svgRef=useRef(null);
  const [drawPhase,setDrawPhase]=useState(0);
  const [drawStroke,setDrawStroke]=useState([]);
  const [drawnHyp,setDrawnHyp]=useState(null);

  // Landscape / PC detection
  const [landscape, setLandscape] = useState(() => typeof window !== "undefined" && window.innerWidth > window.innerHeight);
  useEffect(() => {
    const check = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 200));
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);
  const isPC = isPCProp || landscape;

  const baseW = Math.min(typeof window !== "undefined" ? window.innerWidth - 16 : 380, isPC ? 600 : 420);
  const [canvasW,setCanvasW]=useState(null);
  const [canvasH,setCanvasH]=useState(null);
  const W=canvasW||baseW;
  const H=canvasH||(isPC?Math.min(window.innerHeight-120,400):300);
  const dragRef=useRef(null);
  const defVb={x:0,y:0,w:W,h:H};
  const curVb=vb||defVb;

  const compute=useCallback((hyp,v,m)=>{
    const angRad=m==="rha"?v*Math.PI/180:Math.acos(Math.min(v/hyp,0.9999));
    const adj=hyp*Math.cos(angRad),opp=hyp*Math.sin(angRad);
    return{hyp,adj,opp,angDeg:angRad*180/Math.PI,side:m==="rhs"?v:adj};
  },[]);

  const submit=()=>{
    const h=parseFloat(v1),x=parseFloat(v2);
    if(isNaN(h)||isNaN(x)||h<=0||x<=0){setError("양수를 입력해주세요");return;}
    if(mode==="rha"&&(x<=0||x>=90)){setError("예각(0°~90°)을 입력하세요");return;}
    if(mode==="rhs"&&x>=h){setError("변은 빗변보다 짧아야 해요");return;}
    setError("");setTriData(compute(h,x,mode));startBuild();
  };
  const startBuild=()=>{setPhase("build");setAnim(0);setVb(null);playSfx("click");};

  // Build animation
  useEffect(()=>{
    if(phase!=="build")return;
    let s=null;const dur=1500;
    const t=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setAnim(p);
      if(p<1)requestAnimationFrame(t);else setTimeout(()=>{setPhase("split");setAnim(0);},300);};
    requestAnimationFrame(t);
  },[phase]);

  // Split animation
  useEffect(()=>{
    if(phase!=="split")return;
    let s=null;const dur=1000;
    const t=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setAnim(ease(p));
      if(p<1)requestAnimationFrame(t);else setTimeout(()=>{setPhase("proof");setProofStep(0);},200);};
    requestAnimationFrame(t);
  },[phase]);

  // RHS flip animation
  useEffect(()=>{
    if(mode!=="rhs"||phase!=="proof")return;
    const fs=3;if(proofStep!==fs){if(proofStep>fs)setFlipAnim(1);return;}
    setFlipAnim(0);let s=null;const dur=1500;
    const t=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/dur,1);setFlipAnim(ease(p));
      if(p<1)requestAnimationFrame(t);};
    requestAnimationFrame(t);
  },[proofStep,phase,mode]);

  // Pinch-to-zoom handlers
  const onTouchStart2=useCallback(e=>{
    if(e.touches.length===2){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const my=(e.touches[0].clientY+e.touches[1].clientY)/2;
      pinchRef.current={d,vb:{...curVb},mx,my};
    } else if(e.touches.length===1&&curVb!==defVb){
      pinchRef.current={pan:true,sx:e.touches[0].clientX,sy:e.touches[0].clientY,vb:{...curVb}};
    }
  },[curVb,defVb]);
  const onTouchMove2=useCallback(e=>{
    if(!pinchRef.current)return;
    e.preventDefault();
    if(e.touches.length===2&&!pinchRef.current.pan){
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const scale=pinchRef.current.d/d;
      const ov=pinchRef.current.vb;
      const cx=ov.x+ov.w/2,cy=ov.y+ov.h/2;
      const nw=Math.max(50,Math.min(W*4,ov.w*scale));
      const nh=Math.max(50,Math.min(H*4,ov.h*scale));
      setVb({x:cx-nw/2,y:cy-nh/2,w:nw,h:nh});
    } else if(e.touches.length===1&&pinchRef.current.pan){
      const dx=(e.touches[0].clientX-pinchRef.current.sx)*(pinchRef.current.vb.w/W);
      const dy=(e.touches[0].clientY-pinchRef.current.sy)*(pinchRef.current.vb.h/H);
      const ov=pinchRef.current.vb;
      setVb({...ov,x:ov.x-dx,y:ov.y-dy});
      pinchRef.current.sx=e.touches[0].clientX;pinchRef.current.sy=e.touches[0].clientY;
      pinchRef.current.vb={...ov,x:ov.x-dx,y:ov.y-dy};
    }
  },[W,H]);
  const onTouchEnd2=useCallback(()=>{pinchRef.current=null;},[]);

  // Drawing handlers
  const getSvgPt=useCallback(e=>{
    const svg=svgRef.current;if(!svg)return null;
    const pt=svg.createSVGPoint();const src=e.touches?e.touches[0]:e;
    pt.x=src.clientX;pt.y=src.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  },[]);
  const onDS=useCallback(e=>{e.preventDefault();const pt=getSvgPt(e);if(!pt)return;
    if(drawPhase===0||drawPhase===2){setDrawStroke([{x:pt.x,y:pt.y}]);setDrawPhase(p=>p===0?1:3);}
  },[drawPhase,getSvgPt]);
  const onDM=useCallback(e=>{e.preventDefault();if(drawPhase!==1&&drawPhase!==3)return;
    const pt=getSvgPt(e);if(!pt)return;setDrawStroke(p=>[...p,{x:pt.x,y:pt.y}]);
  },[drawPhase,getSvgPt]);
  const onDE=useCallback(()=>{
    if(drawPhase===1&&drawStroke.length>=2){
      const s=drawStroke[0],e=drawStroke[drawStroke.length-1],len=dist(s,e);
      if(len<30){setDrawStroke([]);setDrawPhase(0);showMsg("더 길게 그려주세요!",1500);return;}
      setDrawnHyp({start:s,end:e,length:len});setDrawStroke([]);setDrawPhase(2);playSfx("draw");
    }else if(drawPhase===3&&drawStroke.length>=2){
      const s=drawStroke[0],e=drawStroke[drawStroke.length-1],len=dist(s,e);
      if(len<15){setDrawStroke([]);setDrawPhase(2);return;}
      const ratio=len/drawnHyp.length;
      if(mode==="rhs"){
        if(ratio>=1){showMsg("빗변보다 짧아야 해요!",1500);setDrawStroke([]);setDrawPhase(2);return;}
        setTriData(compute(10,10*ratio,mode));
      }else{
        const hDx=drawnHyp.end.x-drawnHyp.start.x,hDy=drawnHyp.end.y-drawnHyp.start.y;
        const sDx=e.x-s.x,sDy=e.y-s.y;
        let ang=Math.abs(Math.atan2(-hDy,hDx)-Math.atan2(-sDy,sDx))*180/Math.PI;
        if(ang>90)ang=180-ang;
        if(ang<5||ang>85){showMsg("5°~85° 사이의 각을 그려주세요!",1500);setDrawStroke([]);setDrawPhase(2);return;}
        setTriData(compute(10,ang,mode));
      }
      setDrawStroke([]);setDrawPhase(0);startBuild();
    }
  },[drawPhase,drawStroke,drawnHyp,mode,compute,playSfx,showMsg]);

  // Triangle positions
  const getTris=()=>{
    if(!triData)return null;
    const {hyp,adj,opp}=triData;
    const sc=Math.min(W*0.3,H*0.35)/hyp;
    // B=bottom-left, C=bottom-right(직각), A=top-right
    if(phase==="build"){
      const cx=W/2,cy=H*0.78;
      const B={x:cx-adj*sc/2,y:cy},Cp={x:cx+adj*sc/2,y:cy},A={x:Cp.x,y:cy-opp*sc};
      return{t1:{A,B,C:Cp},t2:null,buildP:anim};
    }
    const sc2=phase==="split"?lerpN(1,0.78,anim):0.78;
    const bx=phase==="split"?lerpN(W/2,W*0.28,anim):W*0.28;
    const B={x:bx-adj*sc*sc2/2,y:H*0.78},Cp={x:bx+adj*sc*sc2/2,y:H*0.78},A={x:Cp.x,y:H*0.78-opp*sc*sc2};
    const rx=phase==="split"?lerpN(W*0.28,W*0.72,anim):W*0.72;
    const B2={x:rx+adj*sc*sc2/2,y:H*0.78},C2={x:rx-adj*sc*sc2/2,y:H*0.78},A2={x:C2.x,y:H*0.78-opp*sc*sc2};
    const opacity=phase==="split"?anim:1;

    // RHS flip: align along equal SIDE (AB=DE), not hypotenuse
    if(mode==="rhs"&&phase==="proof"&&proofStep>=3){
      const p=proofStep===3?flipAnim:1;
      // Flip DEF so DE aligns with AB: E→B, D→A, F'→mirror of C across AB baseline
      const mirC={x:Cp.x,y:2*Cp.y-A.y}; // C reflected below baseline = F'
      return{t1:{A,B,C:Cp},t2:{A:lerp(A2,mirC,p),B:lerp(B2,B,p),C:lerp(C2,Cp,p)},
        scale:sc2,cloneOpacity:1,flipping:true};
    }
    return{t1:{A,B,C:Cp},t2:{A:A2,B:B2,C:C2},scale:sc2,cloneOpacity:opacity};
  };

  const dir=(a,b)=>{const d=dist(a,b);return d<0.1?{x:0,y:0}:{x:(b.x-a.x)/d,y:(b.y-a.y)/d};};

  // ===== Proof steps =====
  const D=triData;
  const rhaSteps=[
    {t:"RHA 합동 조건",
     d:`두 직각삼각형에서\n{hl:∠C = ∠F = 90°:${C.right}} (직각 R)\n{hl:AB = DE:${C.hyp}} (빗변 H)\n{hl:∠B = ∠E = ${D?D.angDeg.toFixed(1):"?"}°:${C.angle}} (한 예각 A)`,
     hi:["right","hyp","angle"]},
    {t:"🤔 ASA가 바로 되나?",
     d:`ASA 합동은 {hl:한 변의 양 끝 각:${C.match}}이 같아야 한다.\n\n빗변 AB의 양 끝 각은 {bk:∠A와 ∠B:${C.angle}}인데\n우리가 아는 건 ∠B와 ∠C뿐...\n{hl:∠A를 모른다!:${C.hyp}}`,
     hi:["question"]},
    {t:"💡 세 번째 각 구하기",
     d:`삼각형 내각의 합 = 180°이므로\n\n{bk:∠A:${C.match}} = 180° - {hl:∠C(90°):${C.right}} - {hl:∠B(${D?D.angDeg.toFixed(1):"?"}°):${C.angle}}\n    = {bk:${D?(90-D.angDeg).toFixed(1):"?"}°:${C.match}}\n\n마찬가지로 {bk:∠D = ${D?(90-D.angDeg).toFixed(1):"?"}°:${C.match}}`,
     hi:["third"]},
    {t:"✅ ASA 합동!",
     d:`빗변 AB = DE의 {hl:양 끝 각:${C.match}}이 같다!\n\n{bk:∠A = ∠D = ${D?(90-D.angDeg).toFixed(1):"?"}°:${C.match}}\n{hl:AB = DE:${C.hyp}} (빗변)\n{bk:∠B = ∠E = ${D?D.angDeg.toFixed(1):"?"}°:${C.angle}}\n\n→ {hl:ASA 합동!:${C.proven}}`,
     hi:["asa"]},
    {t:"∴ RHA = ASA 합동 ✓",
     d:`직각삼각형에서 빗변과 한 예각이 같으면\n세 번째 각이 자동으로 결정되어\n빗변의 {hl:양 끝 각이 모두 같아지므로:${C.proven}}\nASA 합동 조건을 만족한다. □`,
     hi:["proven"]},
  ];

  const rhsSteps=[
    {t:"RHS 합동 조건",
     d:`두 직각삼각형에서\n{hl:∠C = ∠F = 90°:${C.right}} (직각 R)\n{hl:AB = DE:${C.hyp}} (빗변 H)\n{hl:BC = EF:${C.side}} (한 변 S)`,
     hi:["right","hyp","side"]},
    {t:"🤔 바로 SAS가 될까?",
     d:`SAS는 {hl:두 변과 끼인각:${C.match}}이 필요한데...\n\n빗변(AB)과 한 변(BC)의 끼인각은 {bk:∠B:${C.angle}}이고\n{hl:∠B = 90° (직각):${C.right}}인 건 알지만,\n이건 빗변과 {hl:다른 한 변(AC):${C.dim}}의 끼인각 ∠A를 모른다!`,
     hi:["question"]},
    {t:"💡 같은 변끼리 붙이자!",
     d:`{hl:BC = EF:${C.side}} (길이가 같은 변)\n이 변끼리 맞대면 {bk:같은 변을 공유:${C.side}}한다!\n\n△DEF를 뒤집어서\nE를 B 위에, D를 A 위에 놓으면\nF는 C의 반대편 F'으로 간다`,
     hi:["preflip"]},
    {t:"🔄 삼각형 붙이기!",
     d:`{hl:AB = DE:${C.side}}이므로 정확히 겹치고\nBC와 EF가 {bk:같은 직선 위:${C.match}}에 놓인다\n\n∵ {hl:∠ACB = 90°:${C.right}} + {hl:∠ACF' = 90°:${C.right}}\n  = {bk:180° (평각):${C.match}}\n→ {hl:C, B(E), F'은 일직선!:${C.match}}`,
     hi:["flip"]},
    {t:"📐 이등변삼각형 발견!",
     d:`빗변끼리 비교하면:\n{bk:AB = AF':${C.hyp}} (= DE = DF, 빗변이 같으므로)\n\n→ △ABF'에서 두 변이 같다\n→ {hl:△ABF'은 이등변삼각형!:${C.match}}`,
     hi:["isosceles"]},
    {t:"이등변삼각형의 밑각",
     d:`이등변삼각형의 성질:\n{hl:같은 두 변의 대각(밑각)은 같다:${C.match}}\n\n{bk:∠ABF' = ∠AF'B:${C.match}}\n즉, {bk:∠ABC에서의 각 = ∠AF'C에서의 각:${C.match}}\n\n∴ {hl:∠C = ∠F:${C.proven}} (원래 삼각형에서)`,
     hi:["baseangle"]},
    {t:"끼인각 ∠A 결정!",
     d:`이제 모든 각을 안다:\n{hl:∠B = ∠E = 90°:${C.right}} (주어진 직각)\n{hl:∠C = ∠F:${C.match}} (밑각으로 증명)\n\n∠A = 180° - ∠B - ∠C\n    = 180° - ∠E - ∠F = {bk:∠D:${C.angle}}\n\n→ {hl:끼인각 ∠A = ∠D 결정!:${C.proven}}`,
     hi:["anglefound"]},
    {t:"✅ SAS 합동!",
     d:`{bk:BC = EF:${C.side}} (한 변 S)\n{bk:∠A = ∠D:${C.angle}} (끼인각 — 방금 증명!)\n{bk:AB = DE:${C.hyp}} (빗변 H)\n\n→ 두 변과 그 {hl:끼인각이 같다:${C.match}}\n→ {hl:SAS 합동!:${C.proven}}`,
     hi:["sas"]},
    {t:"∴ RHS = SAS 합동 ✓",
     d:`{hl:같은 변(S)끼리 붙여서:${C.side}} 이등변삼각형을 만들고\n{hl:밑각의 성질:${C.match}}로 ∠C = ∠F를 증명한 뒤\n{hl:끼인각 ∠A = ∠D:${C.angle}}를 이끌어내어\n최종적으로 {hl:SAS 합동:${C.proven}}을 확인하였다. □`,
     hi:["proven"]},
  ];

  const steps=mode==="rha"?rhaSteps:rhsSteps;
  const maxStep=steps.length-1;
  const curHi=phase==="proof"&&proofStep<=maxStep?steps[proofStep].hi:[];

  const renderCanvas=()=>{
    const tris=getTris();if(!tris)return null;
    const {t1,t2,buildP,cloneOpacity,flipping}=tris;
    const angDeg=triData?.angDeg||30;

    return (
      <svg width={W} height={H} viewBox={`${curVb.x} ${curVb.y} ${curVb.w} ${curVb.h}`}
        style={{background:theme.svgBg,borderRadius:14,border:`1px solid ${theme.border}`,touchAction:"none"}}
        onTouchStart={onTouchStart2} onTouchMove={onTouchMove2} onTouchEnd={onTouchEnd2}>

        {phase==="build"?(
          <g>{buildP>0&&<>
            <line x1={t1.C.x} y1={t1.C.y} x2={lerpN(t1.C.x,t1.B.x,Math.min(buildP*2,1))} y2={t1.C.y} stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>
            {buildP>0.2&&<line x1={t1.C.x} y1={t1.C.y} x2={t1.C.x} y2={lerpN(t1.C.y,t1.A.y,Math.min((buildP-0.2)*2.5,1))} stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>}
            {buildP>0.5&&<line x1={t1.B.x} y1={t1.B.y} x2={lerpN(t1.B.x,t1.A.x,Math.min((buildP-0.5)*2,1))} y2={lerpN(t1.B.y,t1.A.y,Math.min((buildP-0.5)*2,1))} stroke={theme.text} strokeWidth={2} strokeLinecap="round"/>}
            {buildP>0.3&&<RightMark x={t1.C.x} y={t1.C.y} d1={dir(t1.C,t1.B)} d2={dir(t1.C,t1.A)} color={C.right}/>}
            {buildP>0.8&&<>
              <HText x={t1.A.x+6} y={t1.A.y-4} fontSize={11} fill={theme.text}>A</HText>
              <HText x={t1.B.x-14} y={t1.B.y+14} fontSize={11} fill={theme.text}>B</HText>
              <HText x={t1.C.x+4} y={t1.C.y+14} fontSize={11} fill={theme.text}>C</HText>
            </>}
          </>}</g>
        ):(
          <g>
            {/* T1 */}
            <polygon points={`${t1.A.x},${t1.A.y} ${t1.B.x},${t1.B.y} ${t1.C.x},${t1.C.y}`} fill="none" stroke={theme.text} strokeWidth={2} strokeLinejoin="round"/>
            <RightMark x={t1.C.x} y={t1.C.y} d1={dir(t1.C,t1.B)} d2={dir(t1.C,t1.A)} color={C.right}
              glow={curHi.includes("right")}/>
            <HText x={t1.A.x+(t1.A.x>W/2?4:-12)} y={t1.A.y-5} fontSize={11} fill={theme.text}>A</HText>
            <HText x={t1.B.x-14} y={t1.B.y+14} fontSize={11} fill={theme.text}>B</HText>
            <HText x={t1.C.x+4} y={t1.C.y+14} fontSize={11} fill={theme.text}>C</HText>
            <HText x={t1.C.x-2} y={t1.C.y-10} fontSize={8} fill={C.right}>90°</HText>

            {/* T2 */}
            {t2&&<g opacity={cloneOpacity||1}>
              <polygon points={`${t2.A.x},${t2.A.y} ${t2.B.x},${t2.B.y} ${t2.C.x},${t2.C.y}`}
                fill={flipping?`${C.match}10`:"none"} stroke={flipping?C.match:theme.text} strokeWidth={2} strokeLinejoin="round"
                strokeDasharray={flipping&&flipAnim<1?"6,4":"none"}/>
              {!flipping&&<RightMark x={t2.C.x} y={t2.C.y} d1={dir(t2.C,t2.B)} d2={dir(t2.C,t2.A)} color={C.right}
                glow={curHi.includes("right")}/>}
              {!flipping?<>
                <HText x={t2.A.x+(t2.A.x<W/2?-12:4)} y={t2.A.y-5} fontSize={11} fill={theme.text}>D</HText>
                <HText x={t2.B.x+4} y={t2.B.y+14} fontSize={11} fill={theme.text}>E</HText>
                <HText x={t2.C.x-14} y={t2.C.y+14} fontSize={11} fill={theme.text}>F</HText>
                <HText x={t2.C.x+2} y={t2.C.y-10} fontSize={8} fill={C.right}>90°</HText>
              </>:<HText x={t2.A.x+4} y={t2.A.y>t1.C.y?t2.A.y+14:t2.A.y-5} fontSize={11} fill={C.match}>F'</HText>}
            </g>}

            {/* Hypotenuse highlight */}
            {(curHi.includes("hyp")||curHi.includes("asa")||curHi.includes("sas")||curHi.includes("proven"))&&<>
              <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={C.hyp} strokeWidth={3.5} opacity={0.7} className={curHi.includes("hyp")?"blink":""}/>
              {t2&&!flipping&&<line x1={t2.A.x} y1={t2.A.y} x2={t2.B.x} y2={t2.B.y} stroke={C.hyp} strokeWidth={3.5} opacity={0.7}/>}
              <Tick p1={t1.A} p2={t1.B} n={1} color={C.hyp}/>
              {t2&&!flipping&&<Tick p1={t2.A} p2={t2.B} n={1} color={C.hyp}/>}
            </>}

            {/* RHA: angle at B — interior arc */}
            {mode==="rha"&&(curHi.includes("angle")||curHi.includes("asa")||curHi.includes("proven"))&&<>
              <IArc v={t1.B} p1={t1.C} p2={t1.A} r={18} color={C.angle} glow={curHi.includes("angle")}/>
              <HText x={t1.B.x+20} y={t1.B.y-6} fontSize={9} fill={C.angle}>{angDeg.toFixed(0)}°</HText>
              {t2&&!flipping&&<>
                <IArc v={t2.B} p1={t2.A} p2={t2.C} r={18} color={C.angle} glow={curHi.includes("angle")}/>
                <HText x={t2.B.x-30} y={t2.B.y-6} fontSize={9} fill={C.angle}>{angDeg.toFixed(0)}°</HText>
              </>}
            </>}

            {/* RHA: third angle at A — interior */}
            {mode==="rha"&&(curHi.includes("third")||curHi.includes("asa")||curHi.includes("proven"))&&<>
              <IArc v={t1.A} p1={t1.B} p2={t1.C} r={14} color={C.match} glow={curHi.includes("third")}/>
              <HText x={t1.A.x-24} y={t1.A.y+12} fontSize={8} fill={C.match}>{(90-angDeg).toFixed(0)}°</HText>
              {t2&&!flipping&&<>
                <IArc v={t2.A} p1={t2.C} p2={t2.B} r={14} color={C.match}/>
                <HText x={t2.A.x+10} y={t2.A.y+12} fontSize={8} fill={C.match}>{(90-angDeg).toFixed(0)}°</HText>
              </>}
            </>}

            {/* RHS: side BC highlight */}
            {mode==="rhs"&&(curHi.includes("side")||curHi.includes("preflip")||curHi.includes("sas")||curHi.includes("proven"))&&<>
              <line x1={t1.B.x} y1={t1.B.y} x2={t1.C.x} y2={t1.C.y} stroke={C.side} strokeWidth={3.5} opacity={0.7} className={curHi.includes("side")||curHi.includes("preflip")?"blink":""}/>
              {t2&&!flipping&&<line x1={t2.B.x} y1={t2.B.y} x2={t2.C.x} y2={t2.C.y} stroke={C.side} strokeWidth={3.5} opacity={0.7} className={curHi.includes("preflip")?"blink":""}/>}
              <Tick p1={t1.B} p2={t1.C} n={2} color={C.side}/>
              {t2&&!flipping&&<Tick p1={t2.B} p2={t2.C} n={2} color={C.side}/>}
            </>}

            {/* RHS flip: collinear line */}
            {flipping&&(curHi.includes("flip")||curHi.includes("isosceles")||curHi.includes("baseangle")||curHi.includes("anglefound")||curHi.includes("sas")||curHi.includes("proven"))&&t2&&<>
              <line x1={t1.B.x-30} y1={t1.B.y} x2={t2.A.x>t1.C.x?t2.A.x+30:t2.A.x-30} y2={t1.C.y}
                stroke={C.match} strokeWidth={1.2} strokeDasharray="8,4" opacity={0.5}/>
            </>}

            {/* RHS: isosceles (hypotenuses equal) */}
            {flipping&&(curHi.includes("isosceles")||curHi.includes("baseangle")||curHi.includes("anglefound")||curHi.includes("sas")||curHi.includes("proven"))&&t2&&<>
              <line x1={t1.A.x} y1={t1.A.y} x2={t1.B.x} y2={t1.B.y} stroke={C.hyp} strokeWidth={2.5} className={curHi.includes("isosceles")?"blink":""}/>
              <line x1={t1.A.x} y1={t1.A.y} x2={t2.A.x} y2={t2.A.y} stroke={C.hyp} strokeWidth={2.5} strokeDasharray="6,3" className={curHi.includes("isosceles")?"blink":""}/>
              <Tick p1={t1.A} p2={t1.B} n={1} color={C.hyp}/>
              <Tick p1={t1.A} p2={t2.A} n={1} color={C.hyp}/>
            </>}

            {/* RHS: base angles */}
            {flipping&&(curHi.includes("baseangle")||curHi.includes("anglefound")||curHi.includes("sas")||curHi.includes("proven"))&&t2&&<>
              <IArc v={t1.B} p1={t1.A} p2={t1.C} r={16} color={C.match} glow={curHi.includes("baseangle")}/>
              <IArc v={t2.A} p1={t1.A} p2={t2.C||t1.C} r={16} color={C.match} glow={curHi.includes("baseangle")}/>
            </>}

            {/* RHS: ∠A=∠D found */}
            {flipping&&(curHi.includes("anglefound")||curHi.includes("sas")||curHi.includes("proven"))&&<>
              <IArc v={t1.A} p1={t1.B} p2={t1.C} r={14} color={C.angle} glow={curHi.includes("anglefound")}/>
            </>}

            {/* Proven checkmark */}
            {curHi.includes("proven")&&<HText x={curVb.x+curVb.w/2} y={curVb.y+18} fontSize={14} fill={C.proven}>≅ 합동! ✓</HText>}
          </g>
        )}
      </svg>
    );
  };

  const ist={padding:"12px",borderRadius:10,border:`1.5px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:14,textAlign:"center",fontFamily:"'Noto Serif KR',serif",width:"100%",boxSizing:"border-box"};

  // Canvas resize drag
  useEffect(()=>{
    const onMove=e=>{
      if(!dragRef.current)return;
      const {axis,startY,startH,startX,startW}=dragRef.current;
      const clientY=e.touches?e.touches[0].clientY:e.clientY;
      if(axis==="h"){
        const dy=clientY-startY;
        setCanvasH(Math.max(150,Math.min(600,startH+dy)));
      }
    };
    const onUp=()=>{dragRef.current=null;};
    window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);
    window.addEventListener("touchmove",onMove,{passive:false});window.addEventListener("touchend",onUp);
    return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);
      window.removeEventListener("touchmove",onMove);window.removeEventListener("touchend",onUp);};
  },[]);

  return (
    <div style={{height:"100vh",maxHeight:"100dvh",display:"flex",flexDirection:"column",background:theme.bg,fontFamily:"'Noto Serif KR',serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .blink{animation:blink 1.2s ease-in-out infinite}
      `}</style>

      <div style={{flexShrink:0,display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${theme.border}`}}>
        <button onClick={()=>{
          if(phase!=="input"&&triData){setPhase("input");setTriData(null);setDrawPhase(0);setDrawnHyp(null);setVb(null);}
          else if(mode)setMode(null);
          else{playSfx("click");setScreen("polygons");}
        }} style={{background:"none",border:"none",color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 뒤로</button>
        <span style={{flex:1,textAlign:"center",fontSize:14,fontWeight:700,color:theme.text,fontFamily:"'Playfair Display',serif"}}>
          {mode?`${mode.toUpperCase()} 합동`:"직각삼각형의 합동"}
        </span>
        {vb&&<button onClick={()=>setVb(null)} style={{background:"none",border:`1px solid ${theme.border}`,borderRadius:6,padding:"2px 8px",fontSize:10,color:theme.textSec,cursor:"pointer"}}>원래 크기</button>}
        {!vb&&<span style={{width:40}}/>}
      </div>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"}}>
        {!mode&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:20}}>
            <div style={{fontSize:36}}>∟≅</div>
            <p style={{fontSize:13,color:theme.text,fontWeight:700}}>직각(90°)은 항상 고정!</p>
            <div style={{display:"flex",gap:12,width:"min(340px,90vw)"}}>
              {[["rha","RHA","빗변 + 한 예각","→ ASA?",C.angle],["rhs","RHS","빗변 + 한 변","→ SAS?",C.side]].map(([m,t,s,q,col])=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"20px 14px",borderRadius:16,border:`2px solid ${col}`,background:theme.card,color:theme.text,fontSize:15,cursor:"pointer",fontWeight:700}}>
                  {t}<br/><span style={{fontSize:11,fontWeight:400,color:theme.textSec}}>{s}</span>
                  <br/><span style={{fontSize:10,fontWeight:700,color:col}}>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode&&phase==="input"&&(
          <div style={{padding:20,animation:"fadeIn 0.4s ease"}}>
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{display:"inline-block",padding:"4px 14px",borderRadius:8,background:`${C.right}20`,color:C.right,fontSize:12,fontWeight:700}}>∠C = 90° 고정</span>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["A","✏️ 수치 입력"],["B","👆 직접 그리기"]].map(([k,l])=>(
                <button key={k} onClick={()=>{setInputMode(k);setDrawPhase(0);setDrawnHyp(null);setDrawStroke([]);}} style={{
                  flex:1,padding:"8px",borderRadius:10,fontSize:12,
                  border:`2px solid ${inputMode===k?PASTEL.coral:theme.border}`,
                  background:inputMode===k?theme.accentSoft:theme.card,
                  color:theme.text,cursor:"pointer",fontWeight:inputMode===k?700:400}}>{l}</button>
              ))}
            </div>
            {inputMode==="A"?(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1}}><label style={{fontSize:10,color:C.hyp,fontWeight:700}}>빗변 H</label>
                    <input value={v1} onChange={e=>setV1(e.target.value)} placeholder="예: 10" style={ist} inputMode="decimal" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
                  <div style={{flex:1}}><label style={{fontSize:10,color:mode==="rha"?C.angle:C.side,fontWeight:700}}>{mode==="rha"?"예각 A (°)":"한 변 S"}</label>
                    <input value={v2} onChange={e=>setV2(e.target.value)} placeholder={mode==="rha"?"예: 30":"예: 6"} style={ist} inputMode="decimal" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
                </div>
                <button onClick={submit} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>증명 시작</button>
                {error&&<p style={{fontSize:11,color:PASTEL.coral,textAlign:"center",marginTop:8}}>{error}</p>}
              </div>
            ):(
              <div>
                <p style={{fontSize:11,color:theme.textSec,textAlign:"center",marginBottom:8}}>
                  {drawPhase<2?"① 빗변을 그어주세요":mode==="rha"?"② 예각 방향 선을 그어주세요":"② 다른 한 변을 그어주세요"}
                </p>
                <svg ref={svgRef} width={W} height={260} style={{background:theme.svgBg,borderRadius:14,border:`1px solid ${theme.border}`,touchAction:"none"}}
                  onMouseDown={onDS} onMouseMove={onDM} onMouseUp={onDE} onTouchStart={onDS} onTouchMove={onDM} onTouchEnd={onDE}>
                  {drawnHyp&&<line x1={drawnHyp.start.x} y1={drawnHyp.start.y} x2={drawnHyp.end.x} y2={drawnHyp.end.y} stroke={C.hyp} strokeWidth={3} strokeLinecap="round"/>}
                  {drawnHyp&&<text x={(drawnHyp.start.x+drawnHyp.end.x)/2} y={(drawnHyp.start.y+drawnHyp.end.y)/2-10} textAnchor="middle" fontSize={11} fill={C.hyp} fontWeight={700}>빗변 H</text>}
                  {drawStroke.length>1&&<polyline points={drawStroke.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={drawPhase===1?C.hyp:mode==="rha"?C.angle:C.side} strokeWidth={2.5} strokeLinecap="round"/>}
                </svg>
                {drawnHyp&&<button onClick={()=>{setDrawPhase(0);setDrawnHyp(null);setDrawStroke([]);}} style={{width:"100%",marginTop:8,padding:8,borderRadius:10,border:`1px solid ${theme.border}`,background:"transparent",color:theme.textSec,fontSize:11,cursor:"pointer"}}>다시 그리기</button>}
              </div>
            )}
          </div>
        )}

        {phase!=="input"&&triData&&(
          <div style={{animation:"fadeIn 0.4s ease", display: isPC ? "flex" : "block", flexDirection: isPC ? "row" : undefined, flex: 1, overflow: isPC ? "hidden" : "visible"}}>
            {/* Canvas section */}
            <div style={{padding:"10px 8px 6px",textAlign:"center",position:"relative", flex: isPC ? 1 : "none", minWidth: isPC ? 0 : undefined, maxHeight: isPC ? undefined : "45vh"}}>
              {renderCanvas()}
              {/* Bottom resize handle */}
              {!isPC && <div onTouchStart={e=>{e.preventDefault();dragRef.current={axis:"h",startY:e.touches[0].clientY,startH:H};}}
                onMouseDown={e=>{dragRef.current={axis:"h",startY:e.clientY,startH:H};}}
                style={{height:12,cursor:"ns-resize",display:"flex",justifyContent:"center",alignItems:"center",marginTop:-2}}>
                <div style={{width:40,height:4,borderRadius:2,background:theme.border}}/>
              </div>}
            </div>
            {phase==="proof"&&<div style={{ flex: isPC ? 1 : undefined, overflowY: isPC ? "auto" : undefined, padding: isPC ? "10px 4px" : undefined }}>
              <div style={{margin:"0 12px 10px",padding:"18px 16px",borderRadius:16,
                background:curHi.includes("proven")?`${C.proven}08`:theme.card,
                border:`2px solid ${curHi.includes("proven")?C.proven:curHi.includes("asa")||curHi.includes("sas")?C.match:theme.border}`}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:10,color:curHi.includes("proven")?C.proven:curHi.includes("asa")||curHi.includes("sas")?C.match:theme.text}}>
                  {proofStep+1}/{steps.length} · {steps[proofStep].t}
                </div>
                <div style={{fontSize:13,color:theme.text,lineHeight:2.2,whiteSpace:"pre-line"}}>
                  <RT>{steps[proofStep].d}</RT>
                </div>
                <button onClick={(e)=>{e.stopPropagation();const help=PROPERTY_HELP[mode]||{title:mode==="rha"?"RHA 합동":"RHS 합동",explain:"직각삼각형의 합동 조건에 대해 선생님께 질문해보세요!"};setHelpPopupData({...help,contextData:{screenName:"합동 증명",type:mode}});playSfx("click");}}
                  style={{marginTop:6,padding:"5px 10px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:10,cursor:"pointer"}}>
                  ❓ 이해가 안 돼요
                </button>
              </div>
              <div style={{display:"flex",gap:8,padding:"0 12px 12px"}}>
                {proofStep>0&&<button onClick={()=>setProofStep(s=>s-1)} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 이전</button>}
                {proofStep<maxStep?(
                  <button onClick={()=>setProofStep(s=>s+1)} style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"white",fontSize:14,fontWeight:700,cursor:"pointer"}}>다음 →</button>
                ):(<>
                  <button onClick={()=>{setPhase("input");setTriData(null);setMode(null);setDrawPhase(0);setDrawnHyp(null);setVb(null);playSfx("click");}} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer"}}>닫기</button>
                  <button onClick={()=>{
                    if(setArchive){setArchive(prev=>[...prev,{
                      id:`cong-${Date.now()}`,type:`${mode.toUpperCase()} 합동 증명`,
                      title:`${mode==="rha"?"RHA→ASA":"RHS→SAS"} 증명`,
                      preview:`빗변=${triData?.hyp}`,
                      createdAt:Date.now(),isPublic:archiveDefaultPublic||false,hidden:false,userId:user?.id,
                    }]);playSfx("success");showMsg("아카이브에 저장! 📂",1500);}
                  }} style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"white",fontSize:13,fontWeight:700,cursor:"pointer"}}>📂 아카이브에 저장</button>
                </>)}
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:4,paddingBottom:12}}>
                {steps.map((_,i)=><div key={i} style={{width:i===proofStep?16:6,height:6,borderRadius:3,background:i<=proofStep?(curHi.includes("proven")?C.proven:PASTEL.coral):`${theme.textSec}30`,transition:"all 0.3s"}}/>)}
              </div>
            </div>}
          </div>
        )}
      </div>
    {helpPopupData&&<HelpPopup theme={theme} playSfx={playSfx} showMsg={showMsg}
        title={helpPopupData.title} explain={helpPopupData.explain}
        example={helpPopupData.example} analogy={helpPopupData.analogy}
        contextData={helpPopupData.contextData}
        onClose={()=>setHelpPopupData(null)}
        onSendQuestion={(qData)=>{
          if(setHelpRequests)setHelpRequests(prev=>[...prev,{id:`help-${Date.now()}`,userId:user?.id||"anon",userName:user?.name||"익명",timestamp:Date.now(),status:"pending",...qData}]);
          if(setArchive)setArchive(prev=>[...prev,{id:`q-${Date.now()}`,type:"질문",title:qData.helpTitle,preview:qData.helpExplain?.slice(0,60),createdAt:Date.now(),isPublic:false,hidden:false,userId:user?.id,isQuestion:true}]);
        }}/>}
    </div>
  );
}

export function renderCongruenceScreen(ctx) {
  const {theme,setScreen,playSfx,showMsg,isPC,user,archive,setArchive}=ctx;
  return <CongruenceScreenInner theme={theme} setScreen={setScreen} playSfx={playSfx} showMsg={showMsg} isPC={isPC} user={ctx.user} archive={ctx.archive} setArchive={ctx.setArchive} archiveDefaultPublic={ctx.archiveDefaultPublic} helpRequests={ctx.helpRequests} setHelpRequests={ctx.setHelpRequests}/>;
}
