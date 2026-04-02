import { useState, useRef, useEffect, useCallback } from "react";
import { PASTEL, dist } from "../config";

const STAGES=[
  {n:1,title:"집에서 학교까지",sub:"어느 정도 거리야?",help:"일상에서 '거리'라고 말할 때, 무의식적으로 '가장 짧은 경로'를 떠올려요."},
  {n:2,title:"거리의 정의",sub:"가장 짧은 경로의 길이",help:"'거리 = 가장 짧은 경로의 길이'라는 정의를 세우면, 두 점 사이의 거리는 직선(선분)이 됩니다."},
  {n:3,title:"두 점 사이의 거리",sub:"직선을 그어서 잰다",help:"두 점을 잇는 경로 중 가장 짧은 건 직선이에요."},
  {n:4,title:"점과 직선 사이의 거리",sub:"수선이 가장 짧다",help:"점에서 직선까지의 거리도 수직으로 내린 선분(수선)이 가장 짧아요."},
  {n:5,title:"평행한 두 직선",sub:"거리가 같은 점 찾기",help:"두 직선에 수직인 선분의 중점은 두 직선까지 거리가 같은 점이에요."},
  {n:6,title:"점들의 모임",sub:"또 하나의 평행한 직선 N",help:"거리가 같은 점들을 모으면 평행한 새 직선이 만들어져요."},
  {n:7,title:"직선을 돌려보면",sub:"각(Angle)의 탄생",help:"평행하던 직선을 회전시키면 교점이 생기고, 벌어진 정도가 '각'이에요."},
  {n:8,title:"돌아간 정도",sub:"= 각도(degree)",help:"직선이 회전한 정도를 숫자로 나타낸 것이 각도예요."},
  {n:9,title:"되돌려보면",sub:"엇각이 보인다",help:"원래 직선으로 되돌리고 회전선을 그으면 같은 크기의 각이 생겨요."},
  {n:10,title:"엇각의 크기",sub:"평행선에서는 같다",help:"평행선을 가로지르는 직선이 만드는 엇각은 항상 크기가 같아요."},
  {n:11,title:"절반만 돌리면",sub:"각의 이등분선",help:"직선 N을 절반만 회전시키면 각의 이등분선이에요."},
  {n:12,title:"직선 N 위의 점들",sub:"수선의 발 거리 = 모두 같다",help:"직선 N 위의 점들은 두 직선까지 거리가 같아요."},
  {n:13,title:"회전 후에도",sub:"양쪽 거리가 같다",help:"회전시켜도 '거리가 같다'는 성질은 유지돼요."},
  {n:14,title:"이론적 증명",sub:"직각삼각형 합동",help:"각의 이등분선 위의 점에서 수선을 내리면 합동인 직각삼각형이 생겨요."},
  {n:15,title:"거리가 만든 수학",sub:"수형도",help:"'거리' 하나로 선분, 수선, 외심, 내심이 모두 태어났어요."},
  {n:16,title:"완료",sub:"정리 & 저장",help:""},
];

function footOnLine(p,o,dir){const l=Math.sqrt(dir.x**2+dir.y**2);if(l<.001)return o;const u={x:dir.x/l,y:dir.y/l};const t=(p.x-o.x)*u.x+(p.y-o.y)*u.y;return{x:o.x+u.x*t,y:o.y+u.y*t};}

export function renderDistanceScreen(ctx){
  const{theme,setScreen,playSfx,showMsg,isPC,helpRequests,setHelpRequests,archive,setArchive,archiveDefaultPublic,user}=ctx;
  return <DistInner {...{theme,setScreen,playSfx,showMsg,isPC,helpRequests,setHelpRequests,archive,setArchive,archiveDefaultPublic,user}}/>;
}

function DistInner({theme,setScreen,playSfx,showMsg,helpRequests,setHelpRequests,archive,setArchive,archiveDefaultPublic,user}){
  const[stage,setStage]=useState(1);
  const[sub,setSub]=useState(0);
  const svgRef=useRef(null);
  const cRef=useRef(null);
  const[W,setW]=useState(380);
  const[H,setH]=useState(400);
  const[showHelp,setShowHelp]=useState(false);
  const[showFinalQ,setShowFinalQ]=useState(false);
  const[selQ,setSelQ]=useState(null);
  const[petIcon,setPetIcon]=useState("🐶");
  const[s4Tries,setS4Tries]=useState([]);
  const[s4Done,setS4Done]=useState(false);
  const[rotAng,setRotAng]=useState(0);
  const[s12n,setS12n]=useState(0);

  // --- Resize ---
  useEffect(()=>{
    const el=cRef.current;if(!el)return;
    const ro=new ResizeObserver(([e])=>{setW(e.contentRect.width||380);setH(Math.max(200,Math.min(e.contentRect.height||400,480)));});
    ro.observe(el);return()=>ro.disconnect();
  },[]);

  // --- Reset on stage ---
  useEffect(()=>{setSub(0);setShowHelp(false);setS4Tries([]);setS4Done(false);setRotAng(0);setS12n(0);},[stage]);

  // --- Geometry ---
  const cx=W/2;
  const lineGap=Math.min(120,H*0.25);
  const My=H*0.62, Ly=My-lineGap, Ny=(Ly+My)/2;
  // Rotation: L pivots at LEFT end, right end drops toward M
  const Lpx=W*0.08, Lpy=Ly; // L's left pivot
  const angDeg=35;
  const angRad=angDeg*Math.PI/180;
  // Vertex when fully rotated: where L meets M
  const vtxX=Lpx+lineGap/Math.tan(angRad);
  const vtxY=My;
  const vtx={x:vtxX,y:vtxY};

  // Current rotation for animation
  const curRad=rotAng*Math.PI/180;

  // L line endpoints during rotation
  const lDir={x:Math.cos(curRad),y:Math.sin(curRad)};
  const ext=W*2;
  const lRight={x:Lpx+ext*lDir.x,y:Lpy+ext*lDir.y};
  const lLeft={x:Lpx-ext*lDir.x,y:Lpy-ext*lDir.y};

  // Intersection of current L with M (y=My)
  const curVtxX=curRad>0.01?Lpx+lineGap/Math.tan(curRad):W*10;
  const curVtx={x:curVtxX,y:My};

  // --- Rotation animation ---
  useEffect(()=>{
    if((stage===7||stage===8)&&sub>=1&&rotAng<angDeg){
      const t=setTimeout(()=>setRotAng(a=>Math.min(a+0.7,angDeg)),25);
      return()=>clearTimeout(t);
    }
  },[stage,sub,rotAng]);

  // --- Stage 12: points one by one ---
  useEffect(()=>{
    if(stage===12&&sub>=1&&s12n<5){
      const t=setTimeout(()=>setS12n(n=>n+1),600);
      return()=>clearTimeout(t);
    }
  },[stage,sub,s12n]);

  // --- SVG point from event ---
  const getSvgPt=useCallback((e)=>{
    const svg=svgRef.current;if(!svg)return{x:0,y:0};
    const r=svg.getBoundingClientRect();
    const px=e.touches?e.touches[0].clientX:e.clientX;
    const py=e.touches?e.touches[0].clientY:e.clientY;
    return{x:(px-r.left)/r.width*W,y:(py-r.top)/r.height*H};
  },[W,H]);

  // --- Stage 4: tap handler ---
  const handleS4Tap=(e)=>{
    if(s4Done)return;
    const pt=getSvgPt(e);
    const lineY=H*0.72;
    if(pt.y<lineY-50)return;
    const onLine={x:Math.max(30,Math.min(W-30,pt.x)),y:lineY};
    const ptA={x:W*0.4,y:H*0.25};
    const d=dist(ptA,onLine);
    const isPerp=Math.abs(onLine.x-ptA.x)<20;
    setS4Tries(prev=>[...prev,{pt:onLine,d,isPerp}]);
    if(isPerp){setS4Done(true);playSfx("success");showMsg("수직 거리가 가장 짧아! 🎉",2000);}else playSfx("click");
  };

  // --- Draw-line animation helper: CSS class ---
  const drawAnim=(len,dur=1.5,delay=0)=>({
    strokeDasharray:len,strokeDashoffset:len,
    animation:`drawL ${dur}s ease ${delay}s forwards`,
  });

  // ============ STAGE RENDERERS ============

  // --- S1: Map ---
  const renderS1=()=>{
    const ox=W*.06,oy=H*.05;
    const bks=[
      {x:ox,y:oy,w:65,h:45,c:"#e8d5c4"},{x:ox+80,y:oy,w:100,h:45,c:"#d4e2d4"},
      {x:ox+195,y:oy,w:55,h:65,c:"#ddd5e8"},
      {x:ox,y:oy+60,w:65,h:60,c:"#d4e2d4"},{x:ox+80,y:oy+60,w:45,h:60,c:"#e8d5c4"},
      {x:ox+140,y:oy+75,w:70,h:40,c:"#fadadd"},{x:ox+225,y:oy+65,w:45,h:50,c:"#d4e2d4"},
      {x:ox,y:oy+135,w:80,h:50,c:"#fadadd"},{x:ox+95,y:oy+135,w:90,h:65,c:"#e8d5c4"},
      {x:ox+200,y:oy+150,w:50,h:50,c:"#d4e2d4"},
      {x:ox,y:oy+200,w:55,h:45,c:"#ddd5e8"},{x:ox+70,y:oy+215,w:110,h:35,c:"#e8e0d4"},
    ];
    const home={x:ox+25,y:oy+258};
    const school={x:ox+220,y:oy-18};
    // roads between blocks
    const r1x=ox+72,r2x=ox+132,r3x=ox+192;
    const r1y=oy+52,r2y=oy+128,r3y=oy+195;
    // short path (along roads)
    const sp=`M${home.x} ${home.y-8} L${home.x} ${r3y} L${r1x} ${r3y} L${r1x} ${r1y} L${r3x} ${r1y} L${r3x} ${school.y+14}`;
    // detour 1
    const dp1=`M${home.x} ${home.y-8} L${home.x} ${r3y} L${r2x} ${r3y} L${r2x} ${r2y} L${W-ox-5} ${r2y} L${W-ox-5} ${r1y} L${r3x} ${r1y} L${r3x} ${school.y+14}`;
    // detour 2
    const dp2=`M${home.x} ${home.y-8} L${home.x} ${r2y} L${ox-5} ${r2y} L${ox-5} ${r1y} L${r1x} ${r1y} L${r1x} ${oy-5} L${r3x} ${oy-5} L${r3x} ${school.y+14}`;

    const petPts=[home,{x:home.x,y:r3y},{x:r1x,y:r3y},{x:r1x,y:r2y},{x:r1x,y:r1y},{x:r3x,y:r1y}];
    const pi=sub>=1?Math.min(4,sub+1):0;
    const pet=petPts[pi]||home;

    return <g>
      <rect x={ox-12} y={oy-22} width={W-ox*2+24} height={H*0.72} rx={10} fill={`${theme.textSec}05`}/>
      {bks.map((b,i)=><rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={b.c} opacity={0.5} stroke={`${theme.textSec}15`} strokeWidth={0.5}/>)}
      {sub>=1&&<path d={sp} fill="none" stroke={PASTEL.sky} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} style={drawAnim(1200,2)}/>}
      {sub>=2&&<path d={dp1} fill="none" stroke={`${PASTEL.coral}60`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 5" style={{animation:"fadeIn .8s ease"}}/>}
      {sub>=3&&<path d={dp2} fill="none" stroke={`${PASTEL.lavender}60`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 5" style={{animation:"fadeIn .8s .3s ease both"}}/>}
      <text x={home.x} y={home.y} textAnchor="middle" fontSize={18}>🏠</text>
      <text x={home.x} y={home.y+14} textAnchor="middle" fontSize={8} fill={theme.text} fontWeight={600}>집</text>
      <text x={school.x} y={school.y} textAnchor="middle" fontSize={18}>🏫</text>
      <text x={school.x} y={school.y+14} textAnchor="middle" fontSize={8} fill={theme.text} fontWeight={600}>학교</text>
      {sub>=1&&<text x={pet.x} y={pet.y} textAnchor="middle" fontSize={16} style={{cursor:"pointer",transition:"all .6s ease"}}
        onClick={e=>{e.stopPropagation();setPetIcon(p=>p==="🐶"?"🐰":"🐶");playSfx("click");}}>{petIcon}</text>}
    </g>;
  };

  // --- S2: transition to points ---
  const renderS2=()=>{
    const A={x:W*.2,y:H*.48},B={x:W*.8,y:H*.48};
    return <g>
      <rect x={W*.03} y={H*.08} width={W*.32} height={H*.28} rx={10} fill={`${theme.textSec}05`} stroke={`${theme.textSec}12`} strokeWidth={0.5} style={{animation:"fadeIn .6s ease"}}/>
      <text x={W*.19} y={H*.24} textAnchor="middle" fontSize={11} fill={`${theme.textSec}40`}>🏠 → 🏫</text>
      <text x={W*.19} y={H*.3} textAnchor="middle" fontSize={9} fill={`${theme.textSec}30`}>추상화</text>
      <path d={`M${W*.38} ${H*.24} Q${W*.45} ${H*.34} ${W*.42} ${H*.42}`} fill="none" stroke={`${theme.textSec}25`} strokeWidth={1}/>
      <circle cx={A.x} cy={A.y} r={8} fill={PASTEL.sky} stroke="#fff" strokeWidth={2} style={{animation:"fadeIn .8s .3s ease both"}}/>
      <circle cx={B.x} cy={B.y} r={8} fill={PASTEL.sky} stroke="#fff" strokeWidth={2} style={{animation:"fadeIn .8s .5s ease both"}}/>
      <text x={A.x} y={A.y-14} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={700}>A</text>
      <text x={B.x} y={B.y-14} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={700}>B</text>
      {sub>=1&&<line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={PASTEL.coral} strokeWidth={3} style={drawAnim(300,1.2)}/>}
    </g>;
  };

  // --- S3: two-point distance ---
  const renderS3=()=>{
    const A={x:W*.18,y:H*.5},B={x:W*.82,y:H*.5};
    const d=dist(A,B);
    const curve=`M${A.x} ${A.y} Q${cx} ${H*.22} ${B.x} ${B.y}`;
    const zig=`M${A.x} ${A.y} L${A.x+40} ${A.y-45} L${A.x+85} ${A.y+25} L${A.x+135} ${A.y-35} L${B.x} ${B.y}`;
    return <g>
      <circle cx={A.x} cy={A.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <circle cx={B.x} cy={B.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <text x={A.x} y={A.y-14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>A</text>
      <text x={B.x} y={B.y-14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>B</text>
      {sub>=1&&<g><path d={curve} fill="none" stroke={`${theme.textSec}40`} strokeWidth={1.5} style={drawAnim(400,1.2)}/>
        <text x={cx} y={H*.24} textAnchor="middle" fontSize={10} fill={theme.textSec} style={{animation:"fadeIn .6s 1.2s ease both"}}>✕ 곡선</text></g>}
      {sub>=2&&<g><path d={zig} fill="none" stroke={`${theme.textSec}40`} strokeWidth={1.5} style={drawAnim(500,1.2)}/>
        <text x={cx+20} y={H*.36} textAnchor="middle" fontSize={10} fill={theme.textSec} style={{animation:"fadeIn .6s 1.2s ease both"}}>✕ 지그재그</text></g>}
      {sub>=3&&<g>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={PASTEL.coral} strokeWidth={3} style={drawAnim(d,1)}/>
      </g>}
    </g>;
  };

  // --- S4: point-line distance ---
  const ptA={x:W*.4,y:H*.25},lineY=H*.72,foot={x:W*.4,y:H*.72};
  const renderS4=()=><g>
    <line x1={15} y1={lineY} x2={W-15} y2={lineY} stroke={theme.line} strokeWidth={2}/>
    <text x={W-28} y={lineY-10} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
    <circle cx={ptA.x} cy={ptA.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
    <text x={ptA.x+14} y={ptA.y+4} fontSize={12} fill={theme.text} fontWeight={700}>A</text>
    {s4Tries.map((t,i)=><g key={i}>
      <line x1={ptA.x} y1={ptA.y} x2={t.pt.x} y2={t.pt.y} stroke={t.isPerp?PASTEL.coral:`${theme.textSec}50`} strokeWidth={t.isPerp?3:1.5} strokeDasharray={t.isPerp?"none":"5 4"}/>
      <circle cx={t.pt.x} cy={t.pt.y} r={3} fill={t.isPerp?PASTEL.coral:theme.textSec}/>
      <text x={(ptA.x+t.pt.x)/2+(t.pt.x>ptA.x?14:-14)} y={(ptA.y+t.pt.y)/2} fontSize={10} fill={t.isPerp?PASTEL.coral:theme.textSec} fontWeight={t.isPerp?700:400}>{t.d.toFixed(0)}</text>
    </g>)}
    {s4Done&&<g>
      <line x1={foot.x} y1={foot.y} x2={foot.x+10} y2={foot.y} stroke={PASTEL.coral} strokeWidth={2}/>
      <line x1={foot.x+10} y1={foot.y} x2={foot.x+10} y2={foot.y-10} stroke={PASTEL.coral} strokeWidth={2}/>
      <text x={foot.x+22} y={foot.y-4} fontSize={11} fill={PASTEL.coral} fontWeight={700}>⊥</text>
    </g>}
    {!s4Done&&s4Tries.length===0&&<text x={cx} y={lineY+28} textAnchor="middle" fontSize={11} fill={theme.textSec}>직선 L 위를 터치해서 점A까지의 거리를 재봐!</text>}
    {!s4Done&&s4Tries.length>=2&&<text x={cx} y={lineY+28} textAnchor="middle" fontSize={11} fill={PASTEL.mint}>💡 어디가 가장 짧을까?</text>}
  </g>;

  // --- S5: parallel lines ---
  const renderS5=()=>{
    const px=W*.45;
    return <g>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2} style={sub>=0?{animation:"fadeIn .8s ease"}:{}}/>
      <text x={W-22} y={Ly-8} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-22} y={My+14} fontSize={11} fill={theme.textSec} fontStyle="italic">M</text>
      {sub>=1&&<g>
        <line x1={px} y1={Ly} x2={px} y2={My} stroke={PASTEL.sky} strokeWidth={2} style={drawAnim(lineGap,0.8)}/>
        <circle cx={px} cy={Ly} r={4} fill={PASTEL.sky} style={{animation:"fadeIn .4s .8s ease both"}}/>
        <circle cx={px} cy={My} r={4} fill={PASTEL.sky} style={{animation:"fadeIn .4s .8s ease both"}}/>
        <text x={px+12} y={Ly+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>q</text>
        <text x={px+12} y={My+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>p</text>
      </g>}
      {sub>=2&&<g>
        <circle cx={px} cy={Ny} r={8} fill={PASTEL.coral} stroke="#fff" strokeWidth={2} style={{animation:"scaleIn .5s ease"}}/>
        <text x={px+16} y={Ny+4} fontSize={11} fill={PASTEL.coral} fontWeight={700}>O</text>
      </g>}
    </g>;
  };

  // --- S6: points → line N ---
  const renderS6=()=>{
    const xs=[.12,.28,.44,.60,.76].map(r=>W*r);
    const shown=sub>=0?Math.min(sub+1,5):1;
    return <g>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-22} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      {xs.slice(0,shown).map((x,i)=><g key={i} style={{animation:`fadeIn .5s ${i*.3}s ease both`}}>
        <line x1={x} y1={Ly} x2={x} y2={My} stroke={`${PASTEL.sky}30`} strokeWidth={1} strokeDasharray="3 3"/>
        <circle cx={x} cy={Ny} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
        <text x={x} y={Ny-10} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>O{i+1}</text>
      </g>)}
      {shown>=5&&<line x1={xs[0]} y1={Ny} x2={xs[4]} y2={Ny} stroke={PASTEL.coral} strokeWidth={2.5} style={drawAnim(xs[4]-xs[0],1.2,.5)}/>}
      {shown>=5&&<text x={W-22} y={Ny-8} fontSize={10} fill={PASTEL.coral} fontWeight={700} fontStyle="italic" style={{animation:"fadeIn .6s 1.5s ease both"}}>N</text>}
    </g>;
  };

  // --- S7: rotate L → angle ---
  const renderS7=()=>{
    return <g>
      {/* M at bottom */}
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      {/* Ghost of original L position */}
      {sub>=1&&<line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={`${theme.textSec}18`} strokeWidth={1} strokeDasharray="4 4"/>}
      {/* Rotating L: pivots at left end (Lpx, Lpy=Ly), right end drops */}
      <line x1={lLeft.x} y1={lLeft.y} x2={lRight.x} y2={lRight.y} stroke={PASTEL.sky} strokeWidth={2.5}/>
      <text x={Lpx+20} y={Lpy-10} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {/* Angle arc at vertex (convex!) */}
      {rotAng>3&&curVtxX<W&&(()=>{
        const r=30;
        // From vertex, M goes LEFT: angle=π, L goes upper-left: angle=π+curRad
        const pMx=curVtx.x-r, pMy=curVtx.y;
        const pLx=curVtx.x-r*Math.cos(curRad), pLy=curVtx.y-r*Math.sin(curRad);
        return <g>
          <path d={`M${pMx} ${pMy} A${r} ${r} 0 0 1 ${pLx} ${pLy}`}
            fill={`${PASTEL.yellow}20`} stroke={PASTEL.yellow} strokeWidth={2.5}/>
          <text x={curVtx.x-r-14} y={curVtx.y-10} fontSize={11} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
        </g>;
      })()}
      {/* Vertex dot */}
      {rotAng>3&&curVtxX<W&&<circle cx={curVtx.x} cy={curVtx.y} r={4} fill={PASTEL.coral}/>}
      {sub>=2&&<g>
        <text x={curVtx.x-8} y={curVtx.y+16} fontSize={11} fill={PASTEL.coral} fontWeight={700}>A</text>
        <text x={cx} y={H*.08} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={600} style={{animation:"fadeIn .6s ease"}}>두 반직선이 벌어진 정도 = 각!</text>
      </g>}
    </g>;
  };

  // --- S8: angle = rotation ---
  const renderS8=()=>{
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={lLeft.x} y1={lLeft.y} x2={lRight.x} y2={lRight.y} stroke={PASTEL.sky} strokeWidth={2.5}/>
      {rotAng>3&&curVtxX<W&&(()=>{
        const r=35;
        const pMx=curVtx.x-r,pMy=curVtx.y;
        const pLx=curVtx.x-r*Math.cos(curRad),pLy=curVtx.y-r*Math.sin(curRad);
        return <path d={`M${pMx} ${pMy} A${r} ${r} 0 0 1 ${pLx} ${pLy}`} fill={`${PASTEL.yellow}20`} stroke={PASTEL.yellow} strokeWidth={2.5}/>;
      })()}
      {curVtxX<W&&<circle cx={curVtx.x} cy={curVtx.y} r={4} fill={PASTEL.coral}/>}
      <text x={cx} y={H*.15} textAnchor="middle" fontSize={18} fill={PASTEL.coral} fontWeight={700} style={{animation:"fadeIn .6s ease"}}>
        돌아간 정도 = {Math.round(rotAng)}°
      </text>
      {sub>=1&&<text x={cx} y={H*.22} textAnchor="middle" fontSize={12} fill={theme.text} style={{animation:"fadeIn .6s .3s ease both"}}>이것이 각도(degree)입니다</text>}
    </g>;
  };

  // --- S9: alternate angles ---
  const renderS9=()=>{
    // Show L,M parallel + transversal L'
    const cosT=Math.cos(angRad),sinT=Math.sin(angRad);
    // Transversal from vtx going upper-left and lower-right
    const tEnd1={x:vtx.x-ext*cosT,y:vtx.y-ext*sinT};
    const tEnd2={x:vtx.x+ext*cosT,y:vtx.y+ext*sinT};
    // Intersection of transversal with L (y=Ly)
    const ixLy=sinT>0.01?vtx.x-(vtx.y-Ly)*cosT/sinT:vtx.x;
    const r=28;
    return <g>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-22} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      {/* L' (gray trace = original L that was rotated) */}
      <line x1={tEnd1.x} y1={tEnd1.y} x2={tEnd2.x} y2={tEnd2.y} stroke={`${theme.textSec}50`} strokeWidth={2}/>
      <text x={vtx.x+60*cosT+8} y={vtx.y+60*sinT-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L'</text>
      {/* ∠A at vtx on M */}
      {(()=>{
        const pMx=vtx.x-r,pMy=vtx.y;
        const pLx=vtx.x-r*Math.cos(angRad),pLy=vtx.y-r*Math.sin(angRad);
        return <path d={`M${pMx} ${pMy} A${r} ${r} 0 0 1 ${pLx} ${pLy}`} fill={`${PASTEL.yellow}25`} stroke={PASTEL.yellow} strokeWidth={2}/>;
      })()}
      <text x={vtx.x-r-16} y={vtx.y-8} fontSize={10} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
      {/* ∠A' at intersection with L */}
      {sub>=1&&(()=>{
        const pt={x:ixLy,y:Ly};
        // At this point, L goes RIGHT, L' goes lower-right at angRad below horizontal
        const pRx=pt.x+r,pRy=pt.y;
        const pDx=pt.x+r*Math.cos(angRad),pDy=pt.y+r*Math.sin(angRad);
        return <g style={{animation:"fadeIn .6s ease"}}>
          <circle cx={pt.x} cy={pt.y} r={4} fill={PASTEL.mint}/>
          <path d={`M${pRx} ${pRy} A${r} ${r} 0 0 1 ${pDx} ${pDy}`} fill={`${PASTEL.mint}25`} stroke={PASTEL.mint} strokeWidth={2}/>
          <text x={pt.x+r+8} y={pt.y+14} fontSize={10} fill={PASTEL.mint} fontWeight={700}>∠A'</text>
        </g>;
      })()}
    </g>;
  };

  // --- S10: ∠A = ∠A' ---
  const renderS10=()=>{
    const cosT=Math.cos(angRad),sinT=Math.sin(angRad);
    const tEnd1={x:vtx.x-ext*cosT,y:vtx.y-ext*sinT};
    const tEnd2={x:vtx.x+ext*cosT,y:vtx.y+ext*sinT};
    const ixLy=sinT>0.01?vtx.x-(vtx.y-Ly)*cosT/sinT:vtx.x;
    const r=28;
    return <g>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={tEnd1.x} y1={tEnd1.y} x2={tEnd2.x} y2={tEnd2.y} stroke={`${theme.textSec}50`} strokeWidth={2}/>
      {(()=>{const pMx=vtx.x-r,pLx=vtx.x-r*Math.cos(angRad),pLy=vtx.y-r*Math.sin(angRad);
        return <path d={`M${pMx} ${vtx.y} A${r} ${r} 0 0 1 ${pLx} ${pLy}`} fill={`${PASTEL.yellow}25`} stroke={PASTEL.yellow} strokeWidth={2}/>;})()}
      {(()=>{const pt={x:ixLy,y:Ly};return <path d={`M${pt.x+r} ${pt.y} A${r} ${r} 0 0 1 ${pt.x+r*Math.cos(angRad)} ${pt.y+r*Math.sin(angRad)}`} fill={`${PASTEL.mint}25`} stroke={PASTEL.mint} strokeWidth={2}/>;})()}
      <text x={cx} y={H*.08} textAnchor="middle" fontSize={18} fill={PASTEL.coral} fontWeight={700}>∠A = ∠A'</text>
      <text x={cx} y={H*.15} textAnchor="middle" fontSize={12} fill={theme.text}>이 관계를 엇각이라 부릅니다</text>
      {sub>=1&&<text x={cx} y={H*.21} textAnchor="middle" fontSize={11} fill={theme.textSec} style={{animation:"fadeIn .6s ease"}}>평행선 사이에서만 엇각의 크기는 같아요</text>}
    </g>;
  };

  // --- S11: bisector ---
  const renderS11=()=>{
    const halfRad=angRad/2;
    // Two rays from vertex
    const mEnd={x:vtx.x-ext,y:vtx.y};
    const lEnd={x:vtx.x-ext*Math.cos(angRad),y:vtx.y-ext*Math.sin(angRad)};
    const nEnd={x:vtx.x-ext*Math.cos(halfRad),y:vtx.y-ext*Math.sin(halfRad)};
    const r=40;
    return <g>
      <line x1={vtx.x} y1={vtx.y} x2={mEnd.x} y2={mEnd.y} stroke={theme.line} strokeWidth={2}/>
      <text x={vtx.x-70} y={vtx.y+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <line x1={vtx.x} y1={vtx.y} x2={lEnd.x} y2={lEnd.y} stroke={PASTEL.sky} strokeWidth={2}/>
      <text x={lEnd.x>15?lEnd.x+50:30} y={lEnd.y>10?lEnd.y-5:15} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {sub>=1&&<g>
        <line x1={vtx.x} y1={vtx.y} x2={nEnd.x} y2={nEnd.y} stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 5" style={drawAnim(ext,1.5)}/>
        <text x={nEnd.x+50} y={nEnd.y-5} fontSize={10} fill={PASTEL.coral} fontWeight={700} fontStyle="italic" style={{animation:"fadeIn .6s 1.5s ease both"}}>N</text>
        {/* Half arcs */}
        {(()=>{
          const pM={x:vtx.x-r,y:vtx.y};
          const pH={x:vtx.x-r*Math.cos(halfRad),y:vtx.y-r*Math.sin(halfRad)};
          const pL={x:vtx.x-r*Math.cos(angRad),y:vtx.y-r*Math.sin(angRad)};
          return <g style={{animation:"fadeIn .6s 1s ease both"}}>
            <path d={`M${pM.x} ${pM.y} A${r} ${r} 0 0 1 ${pH.x} ${pH.y}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
            <path d={`M${pH.x} ${pH.y} A${r} ${r} 0 0 1 ${pL.x} ${pL.y}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
          </g>;
        })()}
        <text x={cx} y={H*.08} textAnchor="middle" fontSize={13} fill={PASTEL.coral} fontWeight={700} style={{animation:"fadeIn .6s 1.5s ease both"}}>절반만 돌린 N = 각의 이등분선!</text>
      </g>}
      <circle cx={vtx.x} cy={vtx.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={vtx.x+8} y={vtx.y+14} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  // --- S12: points on N, one by one ---
  const renderS12=()=>{
    const dL=Math.abs(Ly-Ny),dM=Math.abs(My-Ny);
    const xs=[.15,.30,.45,.60,.75].map(r=>W*r);
    return <g>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ny} x2={W-15} y2={Ny} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      <text x={W-22} y={Ly-6} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-22} y={My+12} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-22} y={Ny-6} fontSize={10} fill={PASTEL.coral} fontWeight={700} fontStyle="italic">N</text>
      {xs.slice(0,s12n).map((x,i)=><g key={i} style={{animation:"fadeIn .5s ease"}}>
        <line x1={x} y1={Ly} x2={x} y2={My} stroke={`${PASTEL.sky}30`} strokeWidth={1}/>
        <circle cx={x} cy={Ny} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
        <text x={x} y={Ny-10} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>O{i+1}</text>
        <text x={x+10} y={(Ny+Ly)/2} fontSize={8} fill={PASTEL.mint}>{dL.toFixed(0)}</text>
        <text x={x+10} y={(Ny+My)/2} fontSize={8} fill={PASTEL.mint}>{dM.toFixed(0)}</text>
      </g>)}
      {s12n>=5&&<text x={cx} y={H*.06} textAnchor="middle" fontSize={12} fill={PASTEL.mint} fontWeight={700} style={{animation:"fadeIn .6s ease"}}>모든 점에서 수선의 길이 같고, 교각 모두 직각!</text>}
    </g>;
  };

  // --- S13: after rotation, still equal ---
  const renderS13=()=>{
    const halfRad=angRad/2;
    const cosL=Math.cos(angRad),sinL=Math.sin(angRad);
    const cosN=Math.cos(halfRad),sinN=Math.sin(halfRad);
    const dirL={x:-cosL,y:-sinL},dirM={x:-1,y:0};
    const bPts=[50,90,130,170,215].map((t,i)=>({x:vtx.x-cosN*t,y:vtx.y-sinN*t,l:`O${i+1}`}));
    const n=sub>=1?5:3;
    return <g>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-ext} y2={vtx.y} stroke={theme.line} strokeWidth={2}/>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-ext*cosL} y2={vtx.y-ext*sinL} stroke={PASTEL.sky} strokeWidth={2}/>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-ext*cosN} y2={vtx.y-ext*sinN} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      {bPts.slice(0,n).map((p,i)=>{
        const fL=footOnLine(p,vtx,dirL),fM=footOnLine(p,vtx,dirM);
        return <g key={i} style={{animation:`fadeIn .5s ${i*.2}s ease both`}}>
          <line x1={p.x} y1={p.y} x2={fL.x} y2={fL.y} stroke={`${PASTEL.sky}50`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <line x1={p.x} y1={p.y} x2={fM.x} y2={fM.y} stroke={`${PASTEL.mint}50`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
          <text x={(p.x+fL.x)/2+8} y={(p.y+fL.y)/2-4} fontSize={8} fill={PASTEL.sky}>{dist(p,fL).toFixed(0)}</text>
          <text x={(p.x+fM.x)/2+8} y={(p.y+fM.y)/2-4} fontSize={8} fill={PASTEL.mint}>{dist(p,fM).toFixed(0)}</text>
        </g>;
      })}
      <circle cx={vtx.x} cy={vtx.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {sub>=1&&<text x={cx-30} y={H*.06} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700} style={{animation:"fadeIn .6s ease"}}>회전 후에도 양쪽 거리가 같다!</text>}
    </g>;
  };

  // --- S14: RHS proof ---
  const proof=[
    {t:"점 P에서 수선 내리기",d:"각의 이등분선 위의 점 P에서\n두 반직선 L, M에 수선을 내리면\n수선의 발 F₁, F₂가 생겨요."},
    {t:"직각삼각형 두 개!",d:"△AF₁P와 △AF₂P\n∠AF₁P = ∠AF₂P = 90°"},
    {t:"합동 조건",d:"빗변 AP 공통\n∠F₁AP = ∠F₂AP (이등분선!)\n→ RHA 합동 (= ASA 합동)"},
    {t:"∴ PF₁ = PF₂",d:"d₁ = d₂ — 두 반직선까지 거리가 같다!\n→ 세 이등분선의 교점 = 내심!"},
  ];
  const renderS14=()=>{
    const halfRad=angRad/2;
    const cosL=Math.cos(angRad),sinL=Math.sin(angRad);
    const cosN=Math.cos(halfRad),sinN=Math.sin(halfRad);
    const dirL={x:-cosL,y:-sinL},dirM={x:-1,y:0};
    const P={x:vtx.x-cosN*120,y:vtx.y-sinN*120};
    const F1=footOnLine(P,vtx,dirL),F2=footOnLine(P,vtx,dirM);
    const e=W*.8;
    return <g>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-e} y2={vtx.y} stroke={theme.line} strokeWidth={2}/>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-e*cosL} y2={vtx.y-e*sinL} stroke={PASTEL.sky} strokeWidth={2}/>
      <line x1={vtx.x} y1={vtx.y} x2={vtx.x-e*cosN} y2={vtx.y-e*sinN} stroke={`${PASTEL.coral}40`} strokeWidth={1.5} strokeDasharray="6 4"/>
      <circle cx={P.x} cy={P.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={P.x-12} y={P.y-10} fontSize={11} fill={PASTEL.coral} fontWeight={700}>P</text>
      {sub>=1&&<g style={{animation:"fadeIn .6s ease"}}>
        <line x1={P.x} y1={P.y} x2={F1.x} y2={F1.y} stroke={PASTEL.sky} strokeWidth={2}/>
        <line x1={P.x} y1={P.y} x2={F2.x} y2={F2.y} stroke={PASTEL.mint} strokeWidth={2}/>
        <circle cx={F1.x} cy={F1.y} r={4} fill={PASTEL.sky}/><text x={F1.x-14} y={F1.y+14} fontSize={9} fill={PASTEL.sky} fontWeight={700}>F₁</text>
        <circle cx={F2.x} cy={F2.y} r={4} fill={PASTEL.mint}/><text x={F2.x+8} y={F2.y+14} fontSize={9} fill={PASTEL.mint} fontWeight={700}>F₂</text>
      </g>}
      {sub>=2&&<g style={{animation:"fadeIn .6s ease"}}>
        <polygon points={`${vtx.x},${vtx.y} ${F1.x},${F1.y} ${P.x},${P.y}`} fill={`${PASTEL.sky}12`} stroke={PASTEL.sky} strokeWidth={1.5}/>
        <polygon points={`${vtx.x},${vtx.y} ${F2.x},${F2.y} ${P.x},${P.y}`} fill={`${PASTEL.mint}12`} stroke={PASTEL.mint} strokeWidth={1.5}/>
        <line x1={vtx.x} y1={vtx.y} x2={P.x} y2={P.y} stroke={PASTEL.coral} strokeWidth={2.5}/>
      </g>}
      {sub>=3&&<text x={P.x} y={P.y-22} textAnchor="middle" fontSize={14} fill={PASTEL.coral} fontWeight={700} style={{animation:"fadeIn .6s ease"}}>d₁ = d₂ ✓</text>}
      <circle cx={vtx.x} cy={vtx.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={vtx.x+8} y={vtx.y+14} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  // --- S15: tree ---
  const renderS15=()=>{
    const t=[
      {x:cx,y:40,l:"거리",c:PASTEL.coral,r:26},
      {x:cx-100,y:140,l:"두 점 사이",c:PASTEL.sky,r:20},
      {x:cx+100,y:140,l:"점과 직선",c:PASTEL.mint,r:20},
      {x:cx-140,y:250,l:"수직이등분선",c:"#F48FB1",r:16},
      {x:cx,y:250,l:"각의 이등분선",c:PASTEL.lavender,r:16},
      {x:cx+140,y:250,l:"평행선 성질",c:PASTEL.yellow,r:16},
      {x:cx-70,y:340,l:"외접원",c:"#80CBC4",r:14},
      {x:cx+70,y:340,l:"내접원",c:"#AED581",r:14},
    ];
    const edges=[[0,1],[0,2],[1,3],[2,4],[2,5],[3,6],[4,7]];
    const n=Math.min(t.length,sub+2);
    return <g>
      {edges.map(([a,b],i)=>(a<n&&b<n)?<line key={i} x1={t[a].x} y1={t[a].y} x2={t[b].x} y2={t[b].y} stroke={`${theme.textSec}25`} strokeWidth={2}/>:null)}
      {t.slice(0,n).map((nd,i)=><g key={i} style={{animation:`fadeIn ${.4+i*.12}s ease`}}>
        <circle cx={nd.x} cy={nd.y} r={nd.r} fill={`${nd.c}18`} stroke={nd.c} strokeWidth={2}/>
        <text x={nd.x} y={nd.y+1} textAnchor="middle" dominantBaseline="central" fontSize={nd.r>22?12:9} fill={nd.c} fontWeight={700}>{nd.l}</text>
      </g>)}
    </g>;
  };

  // --- S16: done ---
  const renderS16=()=><g>
    <text x={cx} y={H*.35} textAnchor="middle" fontSize={24}>🎉</text>
    <text x={cx} y={H*.45} textAnchor="middle" fontSize={15} fill={theme.text} fontWeight={700}>학습 완료!</text>
  </g>;

  const R={1:renderS1,2:renderS2,3:renderS3,4:renderS4,5:renderS5,6:renderS6,7:renderS7,8:renderS8,9:renderS9,10:renderS10,11:renderS11,12:renderS12,13:renderS13,14:renderS14,15:renderS15,16:renderS16};

  const EX={
    1:["집에서 학교까지 얼마나 걸려?","\"대충 15분 정도 거리야~\" 가장 짧은 길로 얘기하죠.","이렇게 돌아가는 거리는 얘기하지 않아요.","더 먼 우회로도 마찬가지예요."],
    2:["집과 학교가 점A, 점B로 바뀌었어요.","두 점 사이의 가장 짧은 경로는 바로 직선으로 그어서 만들어지는 선분입니다."],
    3:["점A와 점B 사이의 거리를 잴 때에도,","이렇게 곡선으로 재지 않고,","지그재그로도 재지 않습니다.","직선을 그어서 만들어지는 선분의 길이가 바로 거리입니다."],
    4:["직선 L 위를 터치해서 점A까지의 거리를 재봐!"],
    5:["줌아웃하면 아래에 직선 M이 보입니다.","두 직선에 수직인 선분을 긋고, 교점을 p와 q로 잡아요.","선분 pq의 중점 O — 두 직선까지 거리가 같은 점!"],
    6:["같은 방식으로 O₁부터 O₅까지 하나씩 찍어볼게요.","O₂","O₃","O₄","O₅ — 이제 점들을 이으면 직선 N!"],
    7:["직선 N과 점들이 사라지고…","직선 L이 서서히 회전합니다.","교점 A를 중심으로 두 반직선 → 각!"],
    8:["회전하는 모습을 다시 볼게요.","돌아간 정도를 숫자로 나타낸 것이 각도(degree)입니다."],
    9:["원래 직선 L로 되돌리고, 회전 자취를 L'으로 남겨요.","M 위 교점에 ∠A, L 위 교점에 ∠A' — 엇각!"],
    10:["∠A = ∠A' — 엇각의 크기가 같습니다.","평행선 사이에서만 성립하는 성질이에요."],
    11:["다시 각A로 돌아올게요. 직선 N을 기억하시죠?","직선 N을 절반만 돌리면 → 각의 이등분선!\n\n[복습] 평행선 → 같은 거리 → 직선N → 회전하면 각 → 절반이면 이등분선"],
    12:["직선 N 위의 점들, 수선 거리를 확인해봐요.","점들이 하나씩 나타납니다…"],
    13:["회전 후에도 양쪽 거리가 같을까?","양쪽 수선의 길이가 모두 같아요!"],
    14:["이제 이론적으로 증명해볼게요."],
    15:["'거리'라는 하나의 정의에서,","이렇게 다양한 수학이 태어났어요!"],
    16:[],
  };

  const maxS={1:3,2:1,3:3,4:0,5:2,6:4,7:2,8:1,9:1,10:1,11:1,12:1,13:1,14:3,15:6,16:0};
  const info=STAGES[stage-1];
  const canN=(stage===4)?s4Done:(stage===12)?(s12n>=5):(sub>=(maxS[stage]||0));
  const isLast=stage>=STAGES.length;

  const handleNext=()=>{
    if(sub<(maxS[stage]||0)){setSub(sub+1);return;}
    if(!isLast){playSfx("click");setStage(stage+1);}
  };

  const curEx=EX[stage]||[];
  const exIdx=Math.min(sub,curEx.length-1);

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:theme.bg,overflow:"hidden",userSelect:"none",WebkitUserSelect:"none"}}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes drawL{to{stroke-dashoffset:0}}
      `}</style>

      {/* Header */}
      <div style={{padding:"10px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${theme.border}`,background:theme.card,flexShrink:0}}>
        <button onClick={()=>setScreen("polygons")} style={{background:"none",border:"none",color:theme.textSec,fontSize:13,cursor:"pointer"}}>←</button>
        <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:theme.text}}>{info.title}</div><div style={{fontSize:10,color:theme.textSec}}>{info.sub}</div></div>
        <div style={{fontSize:10,color:theme.textSec}}>{stage}/{STAGES.length}</div>
      </div>
      <div style={{height:3,background:theme.border,flexShrink:0}}><div style={{height:"100%",width:`${(stage/STAGES.length)*100}%`,background:PASTEL.coral,transition:"width .5s ease"}}/></div>

      {/* Canvas — takes remaining space */}
      <div ref={cRef} style={{flex:1,minHeight:0,overflow:"hidden"}}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",touchAction:"none",display:"block"}}
          onPointerDown={stage===4&&!s4Done?handleS4Tap:undefined}>
          <rect width={W} height={H} fill={theme.svgBg}/>
          {R[stage]?.()}
        </svg>
      </div>

      {/* Bottom — fixed height, never overflows */}
      <div style={{flexShrink:0,maxHeight:"38%",overflowY:"auto",padding:"8px 16px 14px",borderTop:`1px solid ${theme.border}`,background:theme.card}}>
        {stage===14&&<div style={{padding:"8px 12px",borderRadius:10,marginBottom:6,background:`${PASTEL.lavender}10`,border:`1px solid ${PASTEL.lavender}25`}}>
          <div style={{fontSize:11,fontWeight:700,color:PASTEL.lavender,marginBottom:2}}>{proof[Math.min(sub,proof.length-1)].t}</div>
          <div style={{fontSize:11,color:theme.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{proof[Math.min(sub,proof.length-1)].d}</div>
        </div>}
        {stage!==14&&curEx.length>0&&<p style={{fontSize:12,color:canN?PASTEL.coral:theme.text,lineHeight:1.9,marginBottom:4,fontWeight:canN?700:400,whiteSpace:"pre-wrap"}}>{curEx[exIdx]||""}</p>}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {stage>1&&<button onClick={()=>{playSfx("click");setStage(stage-1);}} style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer",flexShrink:0}}>←</button>}
          {stage<16&&<button onClick={()=>{setShowHelp(true);playSfx("click");}} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:11,cursor:"pointer",flexShrink:0}}>❓</button>}
          <button onClick={handleNext} style={{flex:1,padding:"8px",borderRadius:10,border:"none",background:canN?`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`:`${theme.textSec}20`,color:canN?"#fff":theme.textSec,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .3s"}}>{isLast?"완료":canN?"다음 →":"진행해봐!"}</button>
        </div>
        {stage===16&&<div style={{display:"flex",gap:6,marginTop:6}}>
          <button onClick={()=>setScreen("polygons")} style={{flex:1,padding:"8px",borderRadius:10,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer"}}>닫기</button>
          {setArchive&&<button onClick={()=>{setArchive(p=>[...p,{id:`dist-${Date.now()}`,type:"거리 개념",title:"거리→각의 이등분선",preview:"16단계 학습 완료",createdAt:Date.now(),isPublic:archiveDefaultPublic||false,hidden:false,userId:user?.id}]);playSfx("success");showMsg("아카이브에 저장! 📂",1500);}} style={{flex:2,padding:"8px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>📂 아카이브에 저장</button>}
          <button onClick={()=>setShowFinalQ(true)} style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${PASTEL.coral}30`,background:`${PASTEL.coral}08`,color:PASTEL.coral,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>질문</button>
        </div>}
        <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:6}}>
          {STAGES.map((_,i)=><div key={i} style={{width:i===stage-1?12:4,height:3,borderRadius:2,background:i<stage?PASTEL.coral:`${theme.textSec}20`,transition:"all .3s"}}/>)}
        </div>
      </div>

      {/* Help popup */}
      {showHelp&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}} onClick={()=>setShowHelp(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:500,maxHeight:"65vh",background:theme.bg,borderRadius:"20px 20px 0 0",overflow:"auto",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,color:theme.text,marginBottom:6}}>💡 {info.title}</div>
          <div style={{fontSize:12,lineHeight:2,color:theme.text,marginBottom:14}}>{info.help}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowHelp(false)} style={{flex:1,padding:10,borderRadius:10,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>이해했어!</button>
            <button onClick={()=>{if(setHelpRequests)setHelpRequests(p=>[...p,{screenName:"거리 개념",stage,stageTitle:info.title,timestamp:Date.now()}]);playSfx("success");showMsg("선생님께 질문했어요! ✅",1500);setShowHelp(false);}} style={{flex:1,padding:10,borderRadius:10,border:"none",background:`${PASTEL.coral}15`,color:PASTEL.coral,fontSize:12,fontWeight:700,cursor:"pointer"}}>선생님께 질문하기</button>
          </div>
        </div>
      </div>}

      {/* Final question selector */}
      {showFinalQ&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}} onClick={()=>setShowFinalQ(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:500,maxHeight:"75vh",background:theme.bg,borderRadius:"20px 20px 0 0",overflow:"auto",padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,color:theme.text,marginBottom:4}}>🙋 어디서부터 이해가 안 됐나요?</div>
          <div style={{fontSize:10,color:theme.textSec,marginBottom:10}}>단계를 선택하면 선생님이 확인할 수 있어요</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
            {STAGES.slice(0,15).map((s,i)=>(
              <button key={i} onClick={()=>setSelQ(selQ===i?null:i)} style={{textAlign:"left",padding:"8px 12px",borderRadius:10,background:selQ===i?`${PASTEL.coral}12`:theme.card,border:`1px solid ${selQ===i?PASTEL.coral:theme.border}`,cursor:"pointer"}}>
                <span style={{fontSize:11,fontWeight:600,color:selQ===i?PASTEL.coral:theme.text}}>{s.n}. {s.title}</span>
                <span style={{fontSize:9,color:theme.textSec,marginLeft:6}}>{s.sub}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>{if(selQ==null){showMsg("단계를 선택해주세요!",1200);return;}if(setHelpRequests)setHelpRequests(p=>[...p,{screenName:"거리 개념",stage:selQ+1,stageTitle:STAGES[selQ].title,timestamp:Date.now(),type:"final"}]);playSfx("success");showMsg("선생님께 질문했어요! ✅",1500);setShowFinalQ(false);}} style={{width:"100%",padding:12,borderRadius:12,border:"none",background:selQ!=null?PASTEL.coral:`${theme.textSec}20`,color:selQ!=null?"#fff":theme.textSec,fontSize:13,fontWeight:700,cursor:"pointer"}}>📨 선생님께 질문하기</button>
        </div>
      </div>}
    </div>
  );
}
