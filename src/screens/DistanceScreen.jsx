import { useState, useRef, useEffect, useCallback } from "react";
import { PASTEL, dist } from "../config";

// ============================================================
// DistanceScreen — "거리"에서 "각의 이등분선"까지
// Park님 흐름 1-15 + 수형도
// ============================================================

const STAGES = [
  { n:1,  title:"집에서 학교까지", sub:"어느 정도 거리야?" },
  { n:2,  title:"거리란?", sub:"가장 짧은 경로의 길이" },
  { n:3,  title:"두 점 사이의 거리", sub:"직선을 그어서 잰다" },
  { n:4,  title:"점과 직선 사이의 거리", sub:"수선이 가장 짧다" },
  { n:5,  title:"평행한 두 직선", sub:"거리가 같은 점 찾기" },
  { n:6,  title:"점들의 모임", sub:"또 하나의 평행한 직선" },
  { n:7,  title:"직선을 돌려보면", sub:"각(Angle)의 탄생" },
  { n:8,  title:"돌아간 정도", sub:"= 각도(degree)" },
  { n:9,  title:"되돌려보면", sub:"엇각이 보인다" },
  { n:10, title:"엇각의 크기", sub:"평행선에서는 같다" },
  { n:11, title:"절반만 돌리면", sub:"각의 이등분선" },
  { n:12, title:"잠깐 복습", sub:"지금까지의 흐름" },
  { n:13, title:"직선 N 위의 점들", sub:"수선의 발 거리 = 모두 같다" },
  { n:14, title:"회전 후에도", sub:"양쪽 거리가 같다" },
  { n:15, title:"이론적 증명", sub:"RHS 합동" },
  { n:16, title:"거리가 만든 수학", sub:"수형도" },
];

// Right-angle mark
function RA({ at, d1, d2, size=10, color="#888", sw=1.5 }) {
  const l1=Math.sqrt(d1.x**2+d1.y**2), l2=Math.sqrt(d2.x**2+d2.y**2);
  if(l1<.01||l2<.01) return null;
  const u1={x:d1.x/l1*size,y:d1.y/l1*size}, u2={x:d2.x/l2*size,y:d2.y/l2*size};
  return <path d={`M ${at.x+u1.x} ${at.y+u1.y} L ${at.x+u1.x+u2.x} ${at.y+u1.y+u2.y} L ${at.x+u2.x} ${at.y+u2.y}`}
    fill="none" stroke={color} strokeWidth={sw}/>;
}

function footOnLine(p, o, dir) {
  const len=Math.sqrt(dir.x**2+dir.y**2); if(len<.001) return o;
  const ux=dir.x/len, uy=dir.y/len;
  const t=(p.x-o.x)*ux+(p.y-o.y)*uy;
  return {x:o.x+ux*t, y:o.y+uy*t};
}

export function renderDistanceScreen(ctx) {
  const { theme, themeKey, setScreen, playSfx, showMsg, isPC } = ctx;
  return <DistInner theme={theme} themeKey={themeKey} setScreen={setScreen} playSfx={playSfx} showMsg={showMsg} isPC={isPC}/>;
}

function DistInner({ theme, setScreen, playSfx, showMsg }) {
  const [stage, setStage] = useState(1);
  const [sub, setSub] = useState(0);
  const svgRef = useRef(null);
  const cRef = useRef(null);
  const [W, setW] = useState(380);
  const [H, setH] = useState(420);

  // stage 4 interactive
  const [s4Tries, setS4Tries] = useState([]);
  const [s4Done, setS4Done] = useState(false);
  // stage 7 rotation
  const [rotAng, setRotAng] = useState(0);
  const rotTarget = 38;

  useEffect(() => {
    const el = cRef.current; if(!el) return;
    const ro = new ResizeObserver(([e]) => { setW(e.contentRect.width||380); setH(Math.min(e.contentRect.height||420,520)); });
    ro.observe(el); return ()=>ro.disconnect();
  }, []);

  useEffect(() => { setSub(0); setS4Tries([]); setS4Done(false); setRotAng(0); }, [stage]);

  const cx=W/2, cy=H*0.55;
  const lineGap=120, Ly=cy+lineGap/2, My=cy-lineGap/2, Ny=cy;
  const pivot={x:W*0.72, y:Ly};

  const getSvgPt = useCallback((e) => {
    const svg=svgRef.current; if(!svg) return {x:0,y:0};
    const r=svg.getBoundingClientRect();
    const px=e.touches?e.touches[0].clientX:e.clientX;
    const py=e.touches?e.touches[0].clientY:e.clientY;
    return {x:px-r.left, y:py-r.top};
  }, []);

  // ===== Stage renderers =====

  const renderS1 = () => {
    const hx=W*.15,hy=H*.7, sx=W*.82,sy=H*.22;
    const walkPath=`M ${hx} ${hy} L ${hx} ${H*.45} L ${W*.4} ${H*.45} L ${W*.4} ${H*.28} L ${sx} ${H*.28} L ${sx} ${sy}`;
    const detour=`M ${hx} ${hy} Q ${W*.05} ${H*.2} ${W*.35} ${H*.15} Q ${W*.65} ${H*.08} ${sx} ${sy}`;
    return <g>
      {[.2,.35,.5,.65,.8].map(r=><line key={`h${r}`} x1={10} y1={H*r} x2={W-10} y2={H*r} stroke={`${theme.textSec}15`} strokeWidth={1}/>)}
      {[.15,.3,.45,.6,.75,.9].map(r=><line key={`v${r}`} x1={W*r} y1={10} x2={W*r} y2={H-10} stroke={`${theme.textSec}15`} strokeWidth={1}/>)}
      {sub>=1&&<path d={walkPath} fill="none" stroke={PASTEL.sky} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>}
      {sub>=2&&<path d={detour} fill="none" stroke={`${theme.textSec}40`} strokeWidth={2} strokeDasharray="6 4"/>}
      <text x={hx} y={hy+2} textAnchor="middle" fontSize={22}>🏠</text>
      <text x={hx} y={hy+20} textAnchor="middle" fontSize={10} fill={theme.text} fontWeight={600}>집</text>
      <text x={sx} y={sy+2} textAnchor="middle" fontSize={22}>🏫</text>
      <text x={sx} y={sy+20} textAnchor="middle" fontSize={10} fill={theme.text} fontWeight={600}>학교</text>
      {sub>=1&&<text x={W*.5} y={H*.5} textAnchor="middle" fontSize={11} fill={PASTEL.sky} fontWeight={700}>"대충 15분 정도 거리야~"</text>}
      {sub>=2&&<text x={W*.3} y={H*.12} textAnchor="middle" fontSize={10} fill={theme.textSec}>이렇게 멀리 돌아간 거리를 얘기하진 않죠</text>}
    </g>;
  };

  const renderS2 = () => <g>
    <text x={cx} y={H*.35} textAnchor="middle" fontSize={18} fill={theme.text} fontWeight={700} fontFamily="'Noto Serif KR',serif">거리</text>
    <text x={cx} y={H*.45} textAnchor="middle" fontSize={13} fill={theme.text}>= 가장 짧은 경로의 길이</text>
    {sub>=1&&<text x={cx} y={H*.58} textAnchor="middle" fontSize={11} fill={theme.textSec} style={{animation:"fadeIn .6s ease"}}>일상에서 우리도 이미 그렇게 쓰고 있었어요.</text>}
  </g>;

  const renderS3 = () => {
    const A={x:W*.18,y:H*.5}, B={x:W*.82,y:H*.5}; const d=dist(A,B);
    return <g>
      {sub>=1&&<g opacity={.4}><path d={`M ${A.x} ${A.y} Q ${cx} ${H*.2} ${B.x} ${B.y}`} fill="none" stroke={theme.textSec} strokeWidth={1.5} strokeDasharray="5 4"/>
      <path d={`M ${A.x} ${A.y} L ${A.x+40} ${A.y-50} L ${A.x+80} ${A.y+30} L ${A.x+130} ${A.y-40} L ${A.x+170} ${A.y+20} L ${B.x} ${B.y}`} fill="none" stroke={theme.textSec} strokeWidth={1.5} strokeDasharray="5 4"/>
      <text x={cx} y={H*.22} textAnchor="middle" fontSize={9} fill={theme.textSec}>✕</text></g>}
      {sub>=2&&<g><line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={PASTEL.coral} strokeWidth={3}/>
      <text x={cx} y={A.y+22} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>선분 AB = {d.toFixed(0)} ← 가장 짧다!</text></g>}
      <circle cx={A.x} cy={A.y} r={6} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <circle cx={B.x} cy={B.y} r={6} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <text x={A.x} y={A.y-12} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>A</text>
      <text x={B.x} y={B.y-12} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>B</text>
    </g>;
  };

  // Stage 4 — point-line distance (interactive)
  const s4LY=H*.7, s4P={x:W*.4,y:H*.25}, s4Foot={x:W*.4,y:H*.7};
  const handleS4Tap = (e) => {
    if(s4Done) return;
    const pt=getSvgPt(e);
    if(pt.y<s4LY-30) return;
    const onLine={x:Math.max(20,Math.min(W-20,pt.x)), y:s4LY};
    const d=dist(s4P, onLine);
    const isPerp=Math.abs(onLine.x-s4P.x)<15;
    setS4Tries(prev=>[...prev,{pt:onLine,d,isPerp}]);
    if(isPerp){setS4Done(true);playSfx("success");}else{playSfx("click");}
  };
  const renderS4 = () => <g>
    <line x1={10} y1={s4LY} x2={W-10} y2={s4LY} stroke={theme.line} strokeWidth={2}/>
    <text x={W-25} y={s4LY-10} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
    <circle cx={s4P.x} cy={s4P.y} r={6} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
    <text x={s4P.x+12} y={s4P.y+4} fontSize={12} fill={theme.text} fontWeight={700}>A</text>
    {s4Tries.map((t,i)=><g key={i}>
      <line x1={s4P.x} y1={s4P.y} x2={t.pt.x} y2={t.pt.y} stroke={t.isPerp?PASTEL.coral:`${theme.textSec}50`} strokeWidth={t.isPerp?3:1.5} strokeDasharray={t.isPerp?"none":"5 4"}/>
      <circle cx={t.pt.x} cy={t.pt.y} r={3} fill={t.isPerp?PASTEL.coral:theme.textSec}/>
      <text x={(s4P.x+t.pt.x)/2+(t.pt.x>s4P.x?12:-12)} y={(s4P.y+t.pt.y)/2} fontSize={10} fill={t.isPerp?PASTEL.coral:theme.textSec} fontWeight={t.isPerp?700:400}>{t.d.toFixed(0)}</text>
    </g>)}
    {s4Done&&<g>
      <RA at={s4Foot} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={12} color={PASTEL.coral} sw={2}/>
      <text x={s4Foot.x+20} y={s4Foot.y-8} fontSize={11} fill={PASTEL.coral} fontWeight={700}>⊥ 수직!</text>
    </g>}
    {!s4Done&&s4Tries.length===0&&<text x={cx} y={s4LY+28} textAnchor="middle" fontSize={11} fill={theme.textSec}>직선 L 위를 터치해서 점A까지의 거리를 재봐!</text>}
    {!s4Done&&s4Tries.length>=2&&<text x={cx} y={s4LY+28} textAnchor="middle" fontSize={11} fill={PASTEL.mint}>💡 가장 짧은 건 어디일까?</text>}
  </g>;

  // Stages 5-6: parallel lines
  const renderS5 = () => {
    const px=W*.45, midY=(Ly+My)/2;
    return <g>
      <line x1={10} y1={Ly} x2={W-10} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-20} y={Ly-8} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-20} y={My-8} fontSize={11} fill={theme.textSec} fontStyle="italic">M</text>
      {sub>=1&&<g>
        <line x1={px} y1={My} x2={px} y2={Ly} stroke={PASTEL.sky} strokeWidth={2} strokeDasharray="5 3"/>
        <RA at={{x:px,y:My}} d1={{x:0,y:1}} d2={{x:1,y:0}} size={10} color={PASTEL.sky}/>
        <RA at={{x:px,y:Ly}} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={10} color={PASTEL.sky}/>
        <circle cx={px} cy={My} r={4} fill={PASTEL.sky}/><text x={px+12} y={My+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>q</text>
        <circle cx={px} cy={Ly} r={4} fill={PASTEL.sky}/><text x={px+12} y={Ly+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>p</text>
      </g>}
      {sub>=2&&<g>
        <circle cx={px} cy={midY} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
        <text x={px+14} y={midY+4} fontSize={11} fill={PASTEL.coral} fontWeight={700}>O</text>
        <text x={px-8} y={midY-14} fontSize={9} fill={theme.textSec}>중점</text>
      </g>}
    </g>;
  };

  const renderS6 = () => {
    const pts=[.15,.3,.45,.6,.75,.88].map(r=>({x:W*r,y:Ny}));
    const shown=sub>=1?pts.length:3;
    return <g>
      <line x1={10} y1={Ly} x2={W-10} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-20} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-20} y={My-8} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      {pts.slice(0,shown).map((p,i)=><g key={i}>
        <line x1={p.x} y1={My} x2={p.x} y2={Ly} stroke={`${PASTEL.sky}30`} strokeWidth={1} strokeDasharray="3 3"/>
        <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
      </g>)}
      {sub>=1&&<g>
        <line x1={10} y1={Ny} x2={W-10} y2={Ny} stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 4"/>
        <text x={W-20} y={Ny-10} fontSize={11} fill={PASTEL.coral} fontWeight={700} fontStyle="italic">N</text>
        <text x={cx} y={Ny-22} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={600}>L, M과 평행한 직선 N!</text>
      </g>}
    </g>;
  };

  // Stage 7: rotate L → angle
  useEffect(() => {
    if(stage===7&&sub>=1&&rotAng<rotTarget) {
      const t=setTimeout(()=>setRotAng(a=>Math.min(a+1.5,rotTarget)),30);
      return ()=>clearTimeout(t);
    }
  }, [stage,sub,rotAng]);

  const renderS7 = () => {
    const pv=pivot; const rad=rotAng*Math.PI/180; const ext=W*1.5;
    const cosA=Math.cos(Math.PI+rad), sinA=Math.sin(Math.PI+rad);
    const lx=pv.x+cosA*ext, ly=pv.y+sinA*ext;
    return <g>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={20} y={My-8} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <line x1={10} y1={Ly} x2={W-10} y2={Ly} stroke={`${theme.textSec}25`} strokeWidth={1} strokeDasharray="4 4"/>
      <line x1={lx} y1={ly} x2={pv.x} y2={pv.y} stroke={PASTEL.sky} strokeWidth={2.5}/>
      <text x={lx+15} y={ly-5} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {rotAng>2&&(() => {
        const r=35, a1=Math.PI, a2=Math.PI+rad;
        return <g>
          <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`}
            fill="none" stroke={PASTEL.yellow} strokeWidth={2.5}/>
          <text x={pv.x-50} y={pv.y-10} fontSize={11} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
        </g>;
      })()}
      {sub>=2&&<g>
        <text x={pv.x-14} y={pv.y+16} fontSize={11} fill={PASTEL.coral} fontWeight={700}>A</text>
        <text x={cx-20} y={H*.18} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={600}>두 반직선 → 각(Angle)!</text>
      </g>}
    </g>;
  };

  const renderS8 = () => <g>
    <text x={cx} y={H*.3} textAnchor="middle" fontSize={14} fill={theme.text} fontWeight={700} fontFamily="'Noto Serif KR',serif">직선 L이 돌아간 정도</text>
    <text x={cx} y={H*.42} textAnchor="middle" fontSize={20} fill={PASTEL.coral} fontWeight={700}>= 각도 ({rotTarget}°)</text>
    {sub>=1&&<text x={cx} y={H*.56} textAnchor="middle" fontSize={12} fill={theme.textSec}>직선이 회전한 정도를 숫자로 나타낸 것이 각도예요</text>}
  </g>;

  // Stage 9: alternate angles
  const renderS9 = () => {
    const pv=pivot; const angRad=rotTarget*Math.PI/180; const ext=W;
    const cosT=Math.cos(Math.PI+angRad), sinT=Math.sin(Math.PI+angRad);
    const slope=sinT/cosT; const ix=cosT!==0?pv.x+(My-pv.y)/slope:pv.x;
    return <g>
      <line x1={10} y1={Ly} x2={W-10} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-20} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-20} y={My-8} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <line x1={pv.x+cosT*ext} y1={pv.y+sinT*ext} x2={pv.x-cosT*ext} y2={pv.y-sinT*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <text x={pv.x+cosT*80+10} y={pv.y+sinT*80-8} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L'</text>
      {(()=>{const r=30,a1=Math.PI,a2=Math.PI+angRad;return <g>
        <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`} fill={`${PASTEL.yellow}30`} stroke={PASTEL.yellow} strokeWidth={2}/>
        <text x={pv.x-42} y={pv.y-8} fontSize={10} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
      </g>;})()}
      {sub>=1&&(()=>{const r2=30;return <g>
        <circle cx={ix} cy={My} r={4} fill={PASTEL.mint}/>
        <path d={`M ${ix+r2} ${My} A ${r2} ${r2} 0 0 1 ${ix+r2*Math.cos(angRad)} ${My+r2*Math.sin(angRad)}`} fill={`${PASTEL.mint}30`} stroke={PASTEL.mint} strokeWidth={2}/>
        <text x={ix+38} y={My+16} fontSize={10} fill={PASTEL.mint} fontWeight={700}>∠A'</text>
      </g>;})()}
    </g>;
  };

  const renderS10 = () => <g>
    <text x={cx} y={H*.3} textAnchor="middle" fontSize={14} fill={theme.text} fontWeight={700} fontFamily="'Noto Serif KR',serif">∠A = ∠A'</text>
    <text x={cx} y={H*.42} textAnchor="middle" fontSize={12} fill={theme.text}>직선L이 돌아간 각도 = 두 반직선 사이의 각도</text>
    <text x={cx} y={H*.52} textAnchor="middle" fontSize={12} fill={PASTEL.mint} fontWeight={600}>이 관계를 엇각이라 부릅니다</text>
    {sub>=1&&<text x={cx} y={H*.65} textAnchor="middle" fontSize={11} fill={theme.textSec}>평행선 사이에서만 엇각의 크기는 같아요</text>}
  </g>;

  // Stage 11: bisector
  const renderS11 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180, halfRad=fullRad/2, ext=W*1.2;
    const cosL=Math.cos(Math.PI+fullRad),sinL=Math.sin(Math.PI+fullRad);
    const cosH=Math.cos(Math.PI+halfRad),sinH=Math.sin(Math.PI+halfRad);
    return <g>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={20} y={My-8} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosL*ext} y2={pv.y+sinL*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <text x={pv.x-60} y={pv.y+16} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {sub>=1&&<g>
        <line x1={pv.x} y1={pv.y} x2={pv.x+cosH*ext} y2={pv.y+sinH*ext} stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 5"/>
        <text x={pv.x+cosH*100+10} y={pv.y+sinH*100-10} fontSize={11} fill={PASTEL.coral} fontWeight={700} fontStyle="italic">N</text>
        <text x={cx-30} y={H*.18} textAnchor="middle" fontSize={13} fill={PASTEL.coral} fontWeight={700}>절반만 돌린 N = 각의 이등분선!</text>
        {(()=>{const r=40,a0=Math.PI+fullRad,aH=Math.PI+halfRad;return <g>
          <path d={`M ${pv.x+r*Math.cos(Math.PI)} ${pv.y+r*Math.sin(Math.PI)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(aH)} ${pv.y+r*Math.sin(aH)}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
          <path d={`M ${pv.x+r*Math.cos(aH)} ${pv.y+r*Math.sin(aH)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a0)} ${pv.y+r*Math.sin(a0)}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
        </g>;})()}
      </g>}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={pv.x-14} y={pv.y+16} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  const renderS12 = () => <g>
    <text x={cx} y={H*.12} textAnchor="middle" fontSize={14} fill={theme.text} fontWeight={700} fontFamily="'Noto Serif KR',serif">복습</text>
    {[{y:.24,t:"① 평행한 두 직선 L, M",c:theme.text},{y:.32,t:"② 두 직선과 거리가 같은 점들 → 직선 N",c:PASTEL.coral},
      {y:.40,t:"③ 직선 L을 돌림 → 각(Angle) 탄생",c:PASTEL.sky},{y:.48,t:"④ 직선 N을 절반만 돌림 → 각의 이등분선",c:PASTEL.coral},
      {y:.59,t:"⑤ 이제 이걸 확인해볼 거야:",c:theme.text},{y:.67,t:"\"직선 N 위의 점들은 정말 두 반직선까지 거리가 같을까?\"",c:PASTEL.mint}
    ].map((o,i)=><text key={i} x={cx} y={H*o.y} textAnchor="middle" fontSize={11} fill={o.c} fontWeight={o.c===PASTEL.mint||o.c===PASTEL.coral?700:400}>{o.t}</text>)}
  </g>;

  // Stage 13: points on N with equal perp distances
  const renderS13 = () => {
    const pts=[.18,.32,.46,.60,.74].map((r,i)=>({x:W*r,y:Ny,l:`O${i+1}`}));
    const dL=Math.abs(Ly-Ny), dM=Math.abs(Ny-My);
    return <g>
      <line x1={10} y1={Ly} x2={W-10} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={10} y1={My} x2={W-10} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={10} y1={Ny} x2={W-10} y2={Ny} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      <text x={W-20} y={Ly-6} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-20} y={My-6} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-20} y={Ny-6} fontSize={10} fill={PASTEL.coral} fontStyle="italic" fontWeight={700}>N</text>
      {pts.slice(0,sub>=1?5:3).map((p,i)=><g key={i}>
        <line x1={p.x} y1={My} x2={p.x} y2={Ly} stroke={`${PASTEL.sky}35`} strokeWidth={1}/>
        <RA at={{x:p.x,y:My}} d1={{x:0,y:1}} d2={{x:1,y:0}} size={8} color={PASTEL.sky}/>
        <RA at={{x:p.x,y:Ly}} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={8} color={PASTEL.sky}/>
        <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
        <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>{p.l}</text>
        <text x={p.x+8} y={(Ny+My)/2} fontSize={8} fill={PASTEL.mint}>{dM.toFixed(0)}</text>
        <text x={p.x+8} y={(Ny+Ly)/2} fontSize={8} fill={PASTEL.mint}>{dL.toFixed(0)}</text>
      </g>)}
      {sub>=1&&<text x={cx} y={H*.12} textAnchor="middle" fontSize={12} fill={PASTEL.mint} fontWeight={700}>모든 점에서 수선의 길이 같고, 교각 모두 직각!</text>}
    </g>;
  };

  // Stage 14: after rotation, still equal
  const renderS14 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180, halfRad=fullRad/2, ext=W*1.2;
    const cosL=Math.cos(Math.PI+fullRad),sinL=Math.sin(Math.PI+fullRad);
    const cosN=Math.cos(Math.PI+halfRad),sinN=Math.sin(Math.PI+halfRad);
    const cosM=Math.cos(Math.PI),sinM=Math.sin(Math.PI);
    const dirL={x:cosL,y:sinL}, dirM={x:cosM,y:sinM};
    const bPts=[60,100,140,180,225].map((t,i)=>({x:pv.x+cosN*t,y:pv.y+sinN*t,l:`O${i+1}`}));
    return <g>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosM*ext} y2={pv.y+sinM*ext} stroke={theme.line} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosL*ext} y2={pv.y+sinL*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosN*ext} y2={pv.y+sinN*ext} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      <text x={pv.x+cosM*80+5} y={pv.y+sinM*80-10} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={pv.x+cosL*80+5} y={pv.y+sinL*80-10} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {bPts.slice(0,sub>=1?5:3).map((p,i)=>{
        const fL=footOnLine(p,pv,dirL), fM=footOnLine(p,pv,dirM);
        return <g key={i}>
          <line x1={p.x} y1={p.y} x2={fL.x} y2={fL.y} stroke={`${PASTEL.sky}60`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <line x1={p.x} y1={p.y} x2={fM.x} y2={fM.y} stroke={`${PASTEL.mint}60`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
          <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>{p.l}</text>
          <text x={(p.x+fL.x)/2+6} y={(p.y+fL.y)/2-4} fontSize={8} fill={PASTEL.sky}>{dist(p,fL).toFixed(0)}</text>
          <text x={(p.x+fM.x)/2+6} y={(p.y+fM.y)/2-4} fontSize={8} fill={PASTEL.mint}>{dist(p,fM).toFixed(0)}</text>
        </g>;
      })}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {sub>=1&&<text x={cx-40} y={H*.12} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>회전 후에도 양쪽 수선의 길이가 같다!</text>}
    </g>;
  };

  // Stage 15: RHS proof
  const proof=[
    {t:"각의 이등분선 위의 점 P",d:"점 P에서 두 반직선 L, M에 수선을 내리면\n수선의 발 F₁, F₂가 생겨요."},
    {t:"직각삼각형 두 개!",d:"△AF₁P와 △AF₂P가 생기는데\n∠AF₁P = ∠AF₂P = 90° (수선이니까)"},
    {t:"RHS 합동 조건",d:"빗변 AP = AP (공통, H)\n∠AF₁P = ∠AF₂P = 90° (R)\n∠F₁AP = ∠F₂AP (이등분선이니까!)"},
    {t:"잠깐, RHA인데?",d:"빗변(H)과 한 예각(A)이 같으니까 RHA 합동이고,\nRHA = ASA 합동이에요.\n(RHS로도 증명 가능 — AF₁ = AF₂)"},
    {t:"∴ PF₁ = PF₂",d:"합동이니까 대응하는 변 PF₁ = PF₂\nd₁ = d₂ — 두 반직선까지 거리가 같다!\n\n→ 세 이등분선의 교점 = 세 변까지 거리 같은 점\n→ 그게 바로 내심!"},
  ];
  const renderS15 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180, halfRad=fullRad/2, ext=W*.9;
    const cosL=Math.cos(Math.PI+fullRad),sinL=Math.sin(Math.PI+fullRad);
    const cosN=Math.cos(Math.PI+halfRad),sinN=Math.sin(Math.PI+halfRad);
    const cosM=Math.cos(Math.PI),sinM=Math.sin(Math.PI);
    const dirL={x:cosL,y:sinL}, dirM={x:cosM,y:sinM};
    const P={x:pv.x+cosN*130,y:pv.y+sinN*130};
    const F1=footOnLine(P,pv,dirL), F2=footOnLine(P,pv,dirM);
    return <g>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosM*ext} y2={pv.y+sinM*ext} stroke={theme.line} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosL*ext} y2={pv.y+sinL*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosN*ext} y2={pv.y+sinN*ext} stroke={`${PASTEL.coral}40`} strokeWidth={1.5} strokeDasharray="6 4"/>
      <circle cx={P.x} cy={P.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={P.x+12} y={P.y-8} fontSize={11} fill={PASTEL.coral} fontWeight={700}>P</text>
      {sub>=1&&<g>
        <line x1={P.x} y1={P.y} x2={F1.x} y2={F1.y} stroke={PASTEL.sky} strokeWidth={2}/>
        <line x1={P.x} y1={P.y} x2={F2.x} y2={F2.y} stroke={PASTEL.mint} strokeWidth={2}/>
        <circle cx={F1.x} cy={F1.y} r={4} fill={PASTEL.sky}/><text x={F1.x-14} y={F1.y+14} fontSize={9} fill={PASTEL.sky} fontWeight={700}>F₁</text>
        <circle cx={F2.x} cy={F2.y} r={4} fill={PASTEL.mint}/><text x={F2.x+8} y={F2.y+14} fontSize={9} fill={PASTEL.mint} fontWeight={700}>F₂</text>
      </g>}
      {sub>=2&&<g>
        <polygon points={`${pv.x},${pv.y} ${F1.x},${F1.y} ${P.x},${P.y}`} fill={`${PASTEL.sky}15`} stroke={PASTEL.sky} strokeWidth={1.5}/>
        <polygon points={`${pv.x},${pv.y} ${F2.x},${F2.y} ${P.x},${P.y}`} fill={`${PASTEL.mint}15`} stroke={PASTEL.mint} strokeWidth={1.5}/>
        <line x1={pv.x} y1={pv.y} x2={P.x} y2={P.y} stroke={PASTEL.coral} strokeWidth={2.5}/>
        <text x={(pv.x+P.x)/2+12} y={(pv.y+P.y)/2} fontSize={9} fill={PASTEL.coral} fontWeight={700}>AP (공통)</text>
      </g>}
      {sub>=3&&<g>
        <text x={(P.x+F1.x)/2-16} y={(P.y+F1.y)/2-6} fontSize={10} fill={PASTEL.sky} fontWeight={700}>d₁</text>
        <text x={(P.x+F2.x)/2+8} y={(P.y+F2.y)/2-6} fontSize={10} fill={PASTEL.mint} fontWeight={700}>d₂</text>
        <text x={P.x} y={P.y-22} textAnchor="middle" fontSize={13} fill={PASTEL.coral} fontWeight={700}>d₁ = d₂ ✓</text>
      </g>}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={pv.x-14} y={pv.y+16} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  // Stage 16: tree diagram
  const renderS16 = () => {
    const tree=[
      {x:cx,y:50,l:"거리",s:"가장 짧은 경로의 길이",c:PASTEL.coral,r:24},
      {x:cx-100,y:150,l:"두 점 사이",s:"→ 선분",c:PASTEL.sky,r:18},
      {x:cx+100,y:150,l:"점과 직선",s:"→ 수선",c:PASTEL.mint,r:18},
      {x:cx-140,y:260,l:"수직이등분선",s:"→ 외심",c:"#F48FB1",r:16},
      {x:cx,y:260,l:"각의 이등분선",s:"→ 내심",c:PASTEL.lavender,r:16},
      {x:cx+140,y:260,l:"평행선 성질",s:"→ 엇각",c:PASTEL.yellow,r:16},
      {x:cx-70,y:350,l:"외접원",c:"#80CBC4",r:14},
      {x:cx+70,y:350,l:"내접원",c:"#AED581",r:14},
    ];
    const edges=[[0,1],[0,2],[1,3],[2,4],[2,5],[3,6],[4,7]];
    const n=Math.min(tree.length, sub+2);
    return <g>
      {edges.map(([a,b],i)=>(a<n&&b<n)?<line key={i} x1={tree[a].x} y1={tree[a].y} x2={tree[b].x} y2={tree[b].y} stroke={`${theme.textSec}30`} strokeWidth={2}/>:null)}
      {tree.slice(0,n).map((nd,i)=><g key={i} style={{animation:`fadeIn ${.3+i*.15}s ease`}}>
        <circle cx={nd.x} cy={nd.y} r={nd.r} fill={`${nd.c}20`} stroke={nd.c} strokeWidth={2}/>
        <text x={nd.x} y={nd.y+1} textAnchor="middle" dominantBaseline="central" fontSize={nd.r>20?12:10} fill={nd.c} fontWeight={700}>{nd.l}</text>
        {nd.s&&<text x={nd.x} y={nd.y+nd.r+14} textAnchor="middle" fontSize={8} fill={theme.textSec}>{nd.s}</text>}
      </g>)}
    </g>;
  };

  // ===== Dispatch =====
  const R={1:renderS1,2:renderS2,3:renderS3,4:renderS4,5:renderS5,6:renderS6,7:renderS7,8:renderS8,
    9:renderS9,10:renderS10,11:renderS11,12:renderS12,13:renderS13,14:renderS14,15:renderS15,16:renderS16};

  // Explanations
  const EX={
    1:["집에서 학교까지 얼마나 걸려?","\"대충 15분 정도 거리야~\" 이렇게 걸어서 가는 길로 얘기하죠.","이렇게 멀리 돌아간 거리를 얘기하진 않아요. 가장 짧으니까요."],
    2:["거리라는 건 즉, '가장 짧은 경로의 길이'입니다.","일상에서 우리도 이미 그렇게 쓰고 있었어요."],
    3:["점A와 점B 사이의 거리를 잴 때에도,","곡선이나 지그재그로 재지 않고,","가장 짧은 경로, 즉 '직선(선분)'을 그어서 길이를 재는 거죠."],
    4:["점A와 직선 L 사이의 거리를 재볼게요. 직선 위를 터치!"],
    5:["직선 L에 평행한 직선 M을 추가해볼게요.","두 직선에 모두 수직인 직선을 긋고,","수선의 발 p와 q를 잇는 선분의 중점 O!"],
    6:["같은 방식으로 거리가 같은 점을 여러 개 찍으면,","L, M과 평행한 직선 N이 그려집니다!"],
    7:["직선 N을 잠시 치워두고, 직선 L을 돌려볼게요.","직선 L이 돌아갑니다…","교점 A를 중심으로 왼쪽을 지우면 → 두 반직선 = 각!"],
    8:["평평하게 놓여있던 직선 L을 돌린 정도,","그걸 각도(degree)라고 부를 수도 있겠네요."],
    9:["직선 L을 원래로 되돌리고, 돌려서 L'을 그려보면,","∠A와 ∠A'가 보입니다."],
    10:["∠A는 두 반직선이 벌어진 정도, ∠A'는 직선L이 돌아간 정도.","이 관계를 엇각이라 부르고, 평행선에서는 크기가 같아요."],
    11:["다시 각A로 돌아올게요.","아까 치워뒀던 직선 N을 절반만 돌리면 → 각의 이등분선!"],
    12:[],
    13:["직선 N 위의 모든 점은 L과 M까지 거리가 같았죠.","점 O₁~O₅에서 수선을 내리면 길이가 모두 같고, 모두 직각!"],
    14:["직선 L을 돌리고, 직선 N을 절반만 돌려보면,","양쪽 수선의 길이가 모두 같아요!"],
    15:["이제 이론적으로 증명해볼게요."],
    16:["'거리'라는 일상적 단어를 수학 개념으로 정의한 순간,","이렇게 다양한 수학이 태어났어요!"],
  };

  const maxSub={1:2,2:1,3:2,4:0,5:2,6:1,7:2,8:1,9:1,10:1,11:1,12:0,13:1,14:1,15:3,16:6};
  const info=STAGES[stage-1];
  const canNext=(stage===4)?s4Done:(sub>=(maxSub[stage]||0));
  const isLast=stage>=STAGES.length;

  const handleNext = () => {
    if(sub<(maxSub[stage]||0)){setSub(sub+1);return;}
    if(!isLast){playSfx("click");setStage(stage+1);}
  };

  const curEx=EX[stage]||[];
  const exIdx=Math.min(sub, curEx.length-1);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:theme.bg,overflow:"hidden"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${theme.border}`,background:theme.card,flexShrink:0}}>
        <button onClick={()=>setScreen("polygons")} style={{background:"none",border:"none",color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 돌아가기</button>
        <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:theme.text}}>{info.title}</div><div style={{fontSize:10,color:theme.textSec}}>{info.sub}</div></div>
        <div style={{fontSize:10,color:theme.textSec}}>{stage}/{STAGES.length}</div>
      </div>
      <div style={{height:3,background:theme.border,flexShrink:0}}><div style={{height:"100%",width:`${(stage/STAGES.length)*100}%`,background:PASTEL.coral,transition:"width .5s ease"}}/></div>
      <div ref={cRef} style={{flex:1,position:"relative",overflow:"hidden"}}>
        <svg ref={svgRef} width={W} height={H} style={{width:"100%",height:"100%",touchAction:"none"}} onPointerDown={stage===4&&!s4Done?handleS4Tap:undefined}>
          <rect width={W} height={H} fill={theme.svgBg}/>
          {R[stage]?.()}
        </svg>
      </div>
      <div style={{padding:"12px 16px 20px",borderTop:`1px solid ${theme.border}`,background:theme.card,flexShrink:0}}>
        {stage===15&&<div style={{padding:"10px 14px",borderRadius:12,marginBottom:10,background:`${PASTEL.lavender}10`,border:`1px solid ${PASTEL.lavender}30`}}>
          <div style={{fontSize:12,fontWeight:700,color:PASTEL.lavender,marginBottom:4}}>{proof[Math.min(sub,proof.length-1)].t}</div>
          <div style={{fontSize:12,color:theme.text,lineHeight:2,whiteSpace:"pre-wrap"}}>{proof[Math.min(sub,proof.length-1)].d}</div>
        </div>}
        {stage!==15&&curEx.length>0&&<p style={{fontSize:12,color:canNext?PASTEL.coral:theme.text,lineHeight:2,marginBottom:8,fontWeight:canNext?700:400,animation:"fadeIn .4s ease"}}>{curEx[exIdx]||""}</p>}
        <div style={{display:"flex",gap:8}}>
          {stage>1&&<button onClick={()=>{playSfx("click");setStage(stage-1);}} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer",flexShrink:0}}>← 이전</button>}
          <button onClick={handleNext} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:canNext||stage===4?`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`:`${theme.textSec}20`,color:canNext||stage===4?"#fff":theme.textSec,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .3s"}}>
            {isLast&&canNext?"완료! 🎉":canNext?"다음 →":"진행해봐!"}
          </button>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:10}}>
          {STAGES.map((_,i)=><div key={i} style={{width:i===stage-1?14:5,height:5,borderRadius:3,background:i<stage?PASTEL.coral:`${theme.textSec}30`,transition:"all .3s"}}/>)}
        </div>
      </div>
    </div>
  );
}
