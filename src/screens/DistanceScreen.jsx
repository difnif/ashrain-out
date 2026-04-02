import { useState, useRef, useEffect, useCallback } from "react";
import { PASTEL, dist } from "../config";

// ============================================================
// DistanceScreen — "거리"에서 "각의 이등분선"까지
// 16 stages, all with SVG + animation
// ============================================================

const STAGES = [
  { n:1,  title:"집에서 학교까지", sub:"어느 정도 거리야?", help:"우리가 일상에서 '거리'라고 말할 때, 무의식적으로 '가장 짧은 경로'를 떠올려요. 이게 수학적 거리의 출발점이에요." },
  { n:2,  title:"거리의 정의", sub:"가장 짧은 경로의 길이", help:"'거리 = 가장 짧은 경로의 길이'라는 정의를 세우면, 두 점 사이의 거리는 직선(선분)이 됩니다." },
  { n:3,  title:"두 점 사이의 거리", sub:"직선을 그어서 잰다", help:"두 점을 잇는 경로 중 가장 짧은 건 직선이에요. 곡선이나 꺾인선은 항상 더 길어요." },
  { n:4,  title:"점과 직선 사이의 거리", sub:"수선이 가장 짧다", help:"점에서 직선까지의 거리도 '가장 짧은 경로'예요. 수직으로 내린 선분(수선)이 가장 짧답니다." },
  { n:5,  title:"평행한 두 직선", sub:"거리가 같은 점 찾기", help:"두 직선에 수직인 선분을 긋고, 그 선분의 중점을 잡으면 두 직선까지 거리가 같은 점이에요." },
  { n:6,  title:"점들의 모임", sub:"또 하나의 평행한 직선 N", help:"두 평행선까지 거리가 같은 점들을 모두 모으면, 두 직선과 평행한 새 직선이 만들어져요." },
  { n:7,  title:"직선을 돌려보면", sub:"각(Angle)의 탄생", help:"평행하던 직선 하나를 회전시키면 교점이 생기고, 두 반직선이 벌어진 정도가 '각'이에요." },
  { n:8,  title:"돌아간 정도", sub:"= 각도(degree)", help:"직선이 회전한 정도를 숫자로 나타낸 것이 각도(degree)예요." },
  { n:9,  title:"되돌려보면", sub:"엇각이 보인다", help:"원래 직선으로 되돌리고 회전선을 그으면, 두 교점에서 같은 크기의 각이 생겨요. 이걸 엇각이라 해요." },
  { n:10, title:"엇각의 크기", sub:"평행선에서는 같다", help:"평행선을 가로지르는 직선이 만드는 엇각은 항상 크기가 같아요. 평행선의 중요한 성질이죠." },
  { n:11, title:"절반만 돌리면", sub:"각의 이등분선", help:"'두 직선까지 거리가 같은 점들의 직선 N'을 절반만 회전시키면, 그게 바로 각의 이등분선이에요." },
  { n:12, title:"직선 N 위의 점들", sub:"수선의 발 거리 = 모두 같다", help:"평행선에서 직선 N 위의 점들은 두 직선까지 거리가 같았어요. 수선을 내려서 확인해봐요." },
  { n:13, title:"회전 후에도", sub:"양쪽 거리가 같다", help:"직선을 회전시켜도 '거리가 같다'는 성질은 유지돼요. 각의 이등분선 위의 점은 두 반직선까지 거리가 같아요." },
  { n:14, title:"이론적 증명", sub:"직각삼각형 합동", help:"각의 이등분선 위의 점에서 수선을 내리면 직각삼각형 두 개가 생기고, 합동이 돼요." },
  { n:15, title:"거리가 만든 수학", sub:"수형도", help:"'거리'라는 하나의 개념에서 선분, 수선, 수직이등분선, 각의 이등분선, 외심, 내심이 모두 태어났어요." },
  { n:16, title:"완료", sub:"정리 & 저장", help:"" },
];

function RA({ at, d1, d2, size=10, color="#888", sw=1.5 }) {
  const l1=Math.sqrt(d1.x**2+d1.y**2), l2=Math.sqrt(d2.x**2+d2.y**2);
  if(l1<.01||l2<.01) return null;
  const u1={x:d1.x/l1*size,y:d1.y/l1*size}, u2={x:d2.x/l2*size,y:d2.y/l2*size};
  return <path d={`M ${at.x+u1.x} ${at.y+u1.y} L ${at.x+u1.x+u2.x} ${at.y+u1.y+u2.y} L ${at.x+u2.x} ${at.y+u2.y}`} fill="none" stroke={color} strokeWidth={sw}/>;
}

function footOnLine(p,o,dir){const len=Math.sqrt(dir.x**2+dir.y**2);if(len<.001)return o;const ux=dir.x/len,uy=dir.y/len;const t=(p.x-o.x)*ux+(p.y-o.y)*uy;return{x:o.x+ux*t,y:o.y+uy*t};}

export function renderDistanceScreen(ctx) {
  const { theme, themeKey, setScreen, playSfx, showMsg, isPC,
    helpRequests, setHelpRequests, archive, setArchive, archiveDefaultPublic, user } = ctx;
  return <DistInner {...{theme,themeKey,setScreen,playSfx,showMsg,isPC,helpRequests,setHelpRequests,archive,setArchive,archiveDefaultPublic,user}}/>;
}

function DistInner({ theme,setScreen,playSfx,showMsg,isPC,helpRequests,setHelpRequests,archive,setArchive,archiveDefaultPublic,user }) {
  const [stage, setStage] = useState(1);
  const [sub, setSub] = useState(0);
  const svgRef = useRef(null);
  const cRef = useRef(null);
  const [W, setW] = useState(380);
  const [H, setH] = useState(460);

  // Help popup
  const [showHelp, setShowHelp] = useState(false);
  // Final question stage selector
  const [showFinalQ, setShowFinalQ] = useState(false);
  const [selectedQStage, setSelectedQStage] = useState(null);

  // Zoom & pan
  const [vb, setVb] = useState({x:0,y:0,w:500,h:560});
  const panRef = useRef(null);

  // Easter egg
  const [petIcon, setPetIcon] = useState("🐶");

  // Stage 4 interactive
  const [s4Tries, setS4Tries] = useState([]);
  const [s4Done, setS4Done] = useState(false);

  // Stage 7+ rotation
  const [rotAng, setRotAng] = useState(0);
  const rotTarget = 38;

  // Stage 12: points appearing one by one
  const [s12Shown, setS12Shown] = useState(0);

  // Resize
  useEffect(() => {
    const el=cRef.current; if(!el) return;
    const ro=new ResizeObserver(([e])=>{
      const w=e.contentRect.width||380, h=Math.min(e.contentRect.height||460,560);
      setW(w); setH(h);
      setVb({x:0,y:0,w:w,h:h});
    });
    ro.observe(el); return ()=>ro.disconnect();
  }, []);

  // Reset on stage change
  useEffect(() => {
    setSub(0); setShowHelp(false);
    setS4Tries([]); setS4Done(false); setRotAng(0); setS12Shown(0);
    setVb(v=>({...v, x:0, y:0})); // reset pan
  }, [stage]);

  // Animation: stage 7 rotation
  useEffect(() => {
    if((stage===7||stage===8)&&sub>=1&&rotAng<rotTarget) {
      const t=setTimeout(()=>setRotAng(a=>Math.min(a+1.2,rotTarget)),25);
      return ()=>clearTimeout(t);
    }
  }, [stage,sub,rotAng]);

  // Animation: stage 12 points one by one
  useEffect(() => {
    if(stage===12&&sub>=1&&s12Shown<5) {
      const t=setTimeout(()=>setS12Shown(n=>n+1),500);
      return ()=>clearTimeout(t);
    }
  }, [stage,sub,s12Shown]);

  // ===== Geometry constants =====
  const cx=W/2, cy=H*0.5;
  const lineGap=130;
  const My=cy+lineGap/2, Ly=cy-lineGap/2, Ny=cy; // M on bottom, L on top!
  const pivot={x:W*0.75, y:My}; // rotation point on M (bottom)

  // ===== Zoom/Pan handlers =====
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setVb(v => {
      const ncx=v.x+v.w/2, ncy=v.y+v.h/2;
      const nw=v.w*scale, nh=v.h*scale;
      return {x:ncx-nw/2, y:ncy-nh/2, w:nw, h:nh};
    });
  }, []);

  const handlePanStart = useCallback((e) => {
    if(stage===4&&!s4Done) return; // don't interfere with stage 4
    const pt = e.touches ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : {x:e.clientX,y:e.clientY};
    panRef.current = {startPt:pt, startVb:{...vb}};
  }, [vb, stage, s4Done]);

  const handlePanMove = useCallback((e) => {
    if(!panRef.current) return;
    const pt = e.touches ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : {x:e.clientX,y:e.clientY};
    const dx = pt.x - panRef.current.startPt.x;
    const dy = pt.y - panRef.current.startPt.y;
    const scaleX = panRef.current.startVb.w / W;
    const scaleY = panRef.current.startVb.h / H;
    setVb({
      ...panRef.current.startVb,
      x: panRef.current.startVb.x - dx*scaleX,
      y: panRef.current.startVb.y - dy*scaleY,
    });
  }, [W,H]);

  const handlePanEnd = useCallback(() => { panRef.current = null; }, []);

  const getSvgPt = useCallback((e) => {
    const svg=svgRef.current; if(!svg) return {x:0,y:0};
    const r=svg.getBoundingClientRect();
    const px=e.touches?e.touches[0].clientX:e.clientX;
    const py=e.touches?e.touches[0].clientY:e.clientY;
    // Convert screen coords to viewBox coords
    const sx=(px-r.left)/r.width*vb.w+vb.x;
    const sy=(py-r.top)/r.height*vb.h+vb.y;
    return {x:sx, y:sy};
  }, [vb]);

  // ===== ROAD MAP for Stage 1 =====
  const renderMap = () => {
    // Irregular city blocks (hand-crafted to look like real streets)
    const rd = 18; // road width
    const ox = W * 0.06, oy = H * 0.06; // origin offset

    // Block definitions: {x, y, w, h} — gaps between them = roads
    const blocks = [
      // Row 1 (top)
      { x: ox, y: oy, w: 70, h: 55 },
      { x: ox + 70 + rd, y: oy, w: 110, h: 55 },
      { x: ox + 70 + rd + 110 + rd, y: oy, w: 60, h: 80 },
      // Row 2
      { x: ox, y: oy + 55 + rd, w: 70, h: 70 },
      { x: ox + 70 + rd, y: oy + 55 + rd, w: 50, h: 70 },
      { x: ox + 70 + rd + 50 + rd, y: oy + 55 + rd + 25, w: 78, h: 45 },
      { x: ox + 70 + rd + 110 + rd, y: oy + 80 + rd, w: 60, h: 55 },
      // Row 3
      { x: ox, y: oy + 55 + rd + 70 + rd, w: 90, h: 60 },
      { x: ox + 90 + rd, y: oy + 55 + rd + 70 + rd, w: 100, h: 85 },
      { x: ox + 90 + rd + 100 + rd, y: oy + 55 + rd + 70 + rd + 20, w: 55, h: 65 },
      // Row 4 (bottom)
      { x: ox, y: oy + 55 + rd + 70 + rd + 60 + rd, w: 65, h: 55 },
      { x: ox + 65 + rd, y: oy + 55 + rd + 70 + rd + 85 + rd, w: 120, h: 45 },
    ];

    // Home position: bottom-left, on the road
    const homePos = { x: ox + 30, y: oy + 55 + rd + 70 + rd + 60 + rd + 55 + 14 };
    // School position: top-right, on the road
    const schoolPos = { x: ox + 70 + rd + 110 + rd + 30, y: oy - 14 };

    // Road waypoints for SHORT path (yellow line in sketch)
    // home → up along left road → right along middle road → up along right road → school
    const r1x = ox + 70 + rd / 2; // vertical road between col 0 and col 1
    const r2x = ox + 70 + rd + 50 + rd / 2; // vertical road between col 1 and col 2
    const r3x = ox + 70 + rd + 110 + rd / 2; // vertical road between col 2 and col 3
    const r1y = oy + 55 + rd / 2; // horizontal road between row 0 and row 1
    const r2y = oy + 55 + rd + 70 + rd / 2; // horizontal road between row 1 and row 2
    const r3y = oy + 55 + rd + 70 + rd + 60 + rd / 2; // horizontal road below row 2

    const shortPath = `M ${homePos.x} ${homePos.y - 10}
      L ${homePos.x} ${r3y}
      L ${r1x} ${r3y}
      L ${r1x} ${r1y}
      L ${r3x} ${r1y}
      L ${r3x} ${schoolPos.y + 14}`;

    // DETOUR path (red line in sketch) — goes the long way around
    const detourPath = `M ${homePos.x} ${homePos.y - 10}
      L ${homePos.x} ${r3y}
      L ${r2x} ${r3y}
      L ${r2x} ${r2y}
      L ${W - ox - 10} ${r2y}
      L ${W - ox - 10} ${r1y}
      L ${r3x} ${r1y}
      L ${r3x} ${schoolPos.y + 14}`;

    // Pet waypoints along short path
    const petWaypoints = [
      homePos,
      { x: homePos.x, y: r3y },
      { x: r1x, y: r3y },
      { x: r1x, y: r1y },
      { x: r3x, y: r1y },
      { x: r3x, y: schoolPos.y + 14 },
    ];
    const petIdx = sub >= 1 ? Math.min(3, sub + 1) : 0;
    const petPos = petWaypoints[petIdx] || homePos;

    return <g>
      {/* Road background (light fill for whole area) */}
      <rect x={ox - 8} y={oy - 20} width={W - ox * 2 + 16} height={H * 0.82} rx={10} fill={`${theme.textSec}06`} />
      {/* Blocks */}
      {blocks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={7}
        fill={`${theme.textSec}10`} stroke={`${theme.textSec}18`} strokeWidth={1} />)}

      {/* Short walking path */}
      {sub >= 1 && <path d={shortPath} fill="none" stroke={PASTEL.sky} strokeWidth={4.5}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />}
      {/* Detour path */}
      {sub >= 2 && <path d={detourPath} fill="none" stroke={`${PASTEL.coral}50`} strokeWidth={3}
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 5" />}

      {/* Home */}
      <text x={homePos.x} y={homePos.y} textAnchor="middle" fontSize={20}>🏠</text>
      <text x={homePos.x} y={homePos.y + 16} textAnchor="middle" fontSize={9} fill={theme.text} fontWeight={600}>집</text>
      {/* School */}
      <text x={schoolPos.x} y={schoolPos.y} textAnchor="middle" fontSize={20}>🏫</text>
      <text x={schoolPos.x} y={schoolPos.y + 16} textAnchor="middle" fontSize={9} fill={theme.text} fontWeight={600}>학교</text>

      {/* Pet on the road */}
      {sub >= 1 && <text x={petPos.x} y={petPos.y} textAnchor="middle" fontSize={18}
        style={{ cursor: "pointer", transition: "all .6s ease" }}
        onClick={(e) => { e.stopPropagation(); setPetIcon(p => p === "🐶" ? "🐰" : "🐶"); playSfx("click"); }}>{petIcon}</text>}

      {/* Labels */}
      {sub >= 1 && <text x={cx} y={H * 0.88} textAnchor="middle" fontSize={11} fill={PASTEL.sky} fontWeight={700}>"대충 15분 정도 거리야~"</text>}
      {sub >= 2 && <g>
        <text x={W * 0.7} y={H * 0.52} fontSize={9} fill={PASTEL.coral} opacity={0.7}>돌아가는 길</text>
        <text x={W * 0.7} y={H * 0.55} fontSize={9} fill={theme.textSec}>이 거리를 얘기하진 않죠</text>
      </g>}
    </g>;
  };

  // ===== Stage 2: Map transforms into A, B =====
  const renderS2 = () => {
    const Ax={x:W*.2,y:H*.48}, Bx={x:W*.8,y:H*.48};
    const d=dist(Ax,Bx);
    return <g>
      {/* Ghost of previous map fading */}
      <rect x={W*.05} y={H*.1} width={W*.35} height={H*.3} rx={12} fill={`${theme.textSec}06`} stroke={`${theme.textSec}15`} strokeWidth={1}/>
      <text x={W*.22} y={H*.28} textAnchor="middle" fontSize={12} fill={`${theme.textSec}40`}>🏠 → 🏫</text>
      {/* Arrow */}
      <path d={`M ${W*.4} ${H*.27} Q ${W*.5} ${H*.35} ${W*.45} ${H*.42}`} fill="none" stroke={`${theme.textSec}30`} strokeWidth={1.5} markerEnd="none"/>
      <text x={W*.52} y={H*.38} fontSize={9} fill={theme.textSec}>추상화하면</text>
      {/* Points A, B */}
      <circle cx={Ax.x} cy={Ax.y} r={8} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <circle cx={Bx.x} cy={Bx.y} r={8} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <text x={Ax.x} y={Ax.y-14} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={700}>A</text>
      <text x={Bx.x} y={Bx.y-14} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={700}>B</text>
      {sub>=1&&<g>
        <line x1={Ax.x} y1={Ax.y} x2={Bx.x} y2={Bx.y} stroke={PASTEL.coral} strokeWidth={3}/>
        <text x={cx} y={Ax.y+28} textAnchor="middle" fontSize={14} fill={PASTEL.coral} fontWeight={700}>
          거리 = 가장 짧은 경로의 길이
        </text>
      </g>}
    </g>;
  };

  // ===== Stage 3: two-point distance =====
  const renderS3 = () => {
    const A={x:W*.18,y:H*.5}, B={x:W*.82,y:H*.5}; const d=dist(A,B);
    return <g>
      {sub>=1&&<g opacity={.35}>
        <path d={`M ${A.x} ${A.y} Q ${cx} ${H*.2} ${B.x} ${B.y}`} fill="none" stroke={theme.textSec} strokeWidth={1.5} strokeDasharray="5 4"/>
        <path d={`M ${A.x} ${A.y} L ${A.x+40} ${A.y-50} L ${A.x+80} ${A.y+30} L ${A.x+130} ${A.y-40} L ${B.x} ${B.y}`} fill="none" stroke={theme.textSec} strokeWidth={1.5} strokeDasharray="5 4"/>
        <text x={cx} y={H*.25} textAnchor="middle" fontSize={10} fill={theme.textSec}>✕ 곡선, 지그재그</text>
      </g>}
      {sub>=2&&<g>
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={PASTEL.coral} strokeWidth={3}/>
        <text x={cx} y={A.y+24} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>선분 AB = {d.toFixed(0)} ← 가장 짧다!</text>
      </g>}
      <circle cx={A.x} cy={A.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <circle cx={B.x} cy={B.y} r={7} fill={PASTEL.sky} stroke="#fff" strokeWidth={2}/>
      <text x={A.x} y={A.y-14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>A</text>
      <text x={B.x} y={B.y-14} textAnchor="middle" fontSize={12} fill={theme.text} fontWeight={700}>B</text>
    </g>;
  };

  // ===== Stage 4: point-line distance (interactive) =====
  const s4LY=H*.72, s4P={x:W*.4,y:H*.25}, s4Foot={x:W*.4,y:H*.72};
  const handleS4Tap = (e) => {
    if(s4Done) return;
    const pt=getSvgPt(e);
    if(pt.y<s4LY-40) return;
    const onLine={x:Math.max(30,Math.min(W-30,pt.x)), y:s4LY};
    const d=dist(s4P,onLine);
    const isPerp=Math.abs(onLine.x-s4P.x)<18;
    setS4Tries(prev=>[...prev,{pt:onLine,d,isPerp}]);
    if(isPerp){setS4Done(true);playSfx("success");showMsg("수직 거리가 가장 짧아! 🎉",2000);}else playSfx("click");
  };

  const renderS4 = () => <g>
    <line x1={15} y1={s4LY} x2={W-15} y2={s4LY} stroke={theme.line} strokeWidth={2}/>
    <text x={W-30} y={s4LY-10} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
    <circle cx={s4P.x} cy={s4P.y} r={7} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
    <text x={s4P.x+14} y={s4P.y+4} fontSize={12} fill={theme.text} fontWeight={700}>A</text>
    {s4Tries.map((t,i)=><g key={i}>
      <line x1={s4P.x} y1={s4P.y} x2={t.pt.x} y2={t.pt.y} stroke={t.isPerp?PASTEL.coral:`${theme.textSec}50`} strokeWidth={t.isPerp?3:1.5} strokeDasharray={t.isPerp?"none":"5 4"}/>
      <circle cx={t.pt.x} cy={t.pt.y} r={3} fill={t.isPerp?PASTEL.coral:theme.textSec}/>
      <text x={(s4P.x+t.pt.x)/2+(t.pt.x>s4P.x?14:-14)} y={(s4P.y+t.pt.y)/2} fontSize={10} fill={t.isPerp?PASTEL.coral:theme.textSec} fontWeight={t.isPerp?700:400}>{t.d.toFixed(0)}</text>
    </g>)}
    {s4Done&&<g>
      <RA at={s4Foot} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={12} color={PASTEL.coral} sw={2}/>
      <text x={s4Foot.x+24} y={s4Foot.y-6} fontSize={11} fill={PASTEL.coral} fontWeight={700}>⊥ 수직!</text>
    </g>}
    {!s4Done&&s4Tries.length===0&&<text x={cx} y={s4LY+30} textAnchor="middle" fontSize={11} fill={theme.textSec}>직선 L 위를 터치해서 점A까지의 거리를 재봐!</text>}
    {!s4Done&&s4Tries.length>=2&&<text x={cx} y={s4LY+30} textAnchor="middle" fontSize={11} fill={PASTEL.mint}>💡 가장 짧은 건 어디일까?</text>}
  </g>;

  // ===== Stages 5-6: parallel lines =====
  const renderS5 = () => {
    const px=W*.45, midY=Ny;
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={My-8} fontSize={11} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-22} y={Ly-8} fontSize={11} fill={theme.textSec} fontStyle="italic">L</text>
      {sub>=1&&<g>
        <line x1={px} y1={Ly} x2={px} y2={My} stroke={PASTEL.sky} strokeWidth={2} strokeDasharray="5 3"/>
        <RA at={{x:px,y:Ly}} d1={{x:0,y:1}} d2={{x:1,y:0}} size={10} color={PASTEL.sky}/>
        <RA at={{x:px,y:My}} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={10} color={PASTEL.sky}/>
        <circle cx={px} cy={Ly} r={4} fill={PASTEL.sky}/><text x={px+12} y={Ly+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>q</text>
        <circle cx={px} cy={My} r={4} fill={PASTEL.sky}/><text x={px+12} y={My+4} fontSize={9} fill={PASTEL.sky} fontWeight={600}>p</text>
      </g>}
      {sub>=2&&<g>
        <circle cx={px} cy={midY} r={8} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
        <text x={px+16} y={midY+4} fontSize={11} fill={PASTEL.coral} fontWeight={700}>O</text>
      </g>}
    </g>;
  };

  const renderS6 = () => {
    const pts=[.12,.26,.40,.54,.68,.84].map(r=>({x:W*r,y:Ny}));
    const n=sub>=1?pts.length:3;
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={My-8} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-22} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      {pts.slice(0,n).map((p,i)=><g key={i}>
        <line x1={p.x} y1={Ly} x2={p.x} y2={My} stroke={`${PASTEL.sky}30`} strokeWidth={1} strokeDasharray="3 3"/>
        <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
      </g>)}
      {sub>=1&&<g>
        <line x1={15} y1={Ny} x2={W-15} y2={Ny} stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 4"/>
        <text x={W-22} y={Ny-10} fontSize={11} fill={PASTEL.coral} fontWeight={700} fontStyle="italic">N</text>
        <text x={cx} y={Ny-24} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={600}>L, M과 평행한 직선 N!</text>
      </g>}
    </g>;
  };

  // ===== Stage 7: Rotate L → angle (M on bottom, L rotates from top) =====
  const renderS7 = () => {
    const pv=pivot; const rad=rotAng*Math.PI/180; const ext=W*1.5;
    // M stays at bottom
    // L rotates: original position is horizontal at Ly, rotates DOWN toward M around pivot
    // Actually, pivot is on M. L was on top. We rotate L around pivot.
    // Original L direction from pivot: leftward at y=Ly
    // After rotation: rotates clockwise by rotAng degrees
    const origAng = Math.atan2(Ly-pv.y, 0-pv.x); // angle from pivot to left end of L
    const cosR=Math.cos(origAng+rad), sinR=Math.sin(origAng+rad);
    const lx=pv.x+cosR*ext, ly=pv.y+sinR*ext;

    return <g>
      {/* M stays on bottom */}
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={20} y={My+16} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      {/* Ghost of original L */}
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={`${theme.textSec}20`} strokeWidth={1} strokeDasharray="4 4"/>
      {/* Rotated L (from pivot leftward) */}
      <line x1={lx} y1={ly} x2={pv.x} y2={pv.y} stroke={PASTEL.sky} strokeWidth={2.5}/>
      <text x={lx>15?lx+8:20} y={ly-8} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {/* Angle arc */}
      {rotAng>3&&(()=>{
        const r=40;
        const a1=Math.PI; // M direction (leftward from pivot)
        const a2=origAng+rad; // L direction
        // Ensure we draw the smaller arc
        return <g>
          <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`}
            fill={`${PASTEL.yellow}20`} stroke={PASTEL.yellow} strokeWidth={2.5}/>
          <text x={pv.x-48} y={pv.y-15} fontSize={12} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
        </g>;
      })()}
      {sub>=2&&<g>
        <text x={pv.x-16} y={pv.y+18} fontSize={11} fill={PASTEL.coral} fontWeight={700}>A</text>
        <text x={cx-30} y={H*.12} textAnchor="middle" fontSize={13} fill={theme.text} fontWeight={600}>두 반직선이 벌어진 정도 = 각!</text>
      </g>}
    </g>;
  };

  // ===== Stage 8: replay rotation + "각도" text =====
  const renderS8 = () => {
    // Reuse stage 7 visual with rotation replaying
    const pv=pivot; const rad=rotAng*Math.PI/180; const ext=W*1.5;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const cosR=Math.cos(origAng+rad), sinR=Math.sin(origAng+rad);
    const lx=pv.x+cosR*ext, ly=pv.y+sinR*ext;
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={lx} y1={ly} x2={pv.x} y2={pv.y} stroke={PASTEL.sky} strokeWidth={2.5}/>
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {rotAng>3&&(()=>{
        const r=45; const a1=Math.PI, a2=origAng+rad;
        return <g>
          <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`}
            fill={`${PASTEL.yellow}20`} stroke={PASTEL.yellow} strokeWidth={2.5}/>
        </g>;
      })()}
      {/* Big angle label */}
      <text x={cx} y={H*.2} textAnchor="middle" fontSize={16} fill={PASTEL.coral} fontWeight={700}>
        돌아간 정도 = {rotAng.toFixed(0)}°
      </text>
      {sub>=1&&<text x={cx} y={H*.28} textAnchor="middle" fontSize={12} fill={theme.text}>이것이 각도(degree)입니다</text>}
    </g>;
  };

  // ===== Stage 9-10: alternate angles =====
  const renderS9 = () => {
    const pv=pivot; const angRad=rotTarget*Math.PI/180; const ext=W*1.2;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const transAng=origAng+angRad;
    const cosT=Math.cos(transAng), sinT=Math.sin(transAng);
    // Transversal through both parallel lines
    const slope=sinT/cosT;
    const ix=cosT!==0?pv.x+(Ly-pv.y)/slope:pv.x;
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <text x={W-22} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-22} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      {/* Transversal L' */}
      <line x1={pv.x+cosT*ext} y1={pv.y+sinT*ext} x2={pv.x-cosT*ext} y2={pv.y-sinT*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <text x={pv.x+cosT*60+10} y={pv.y+sinT*60-10} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L'</text>
      {/* ∠A at pivot on M */}
      {(()=>{const r=30,a1=Math.PI,a2=transAng;return <g>
        <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`} fill={`${PASTEL.yellow}25`} stroke={PASTEL.yellow} strokeWidth={2}/>
        <text x={pv.x-40} y={pv.y-10} fontSize={10} fill={PASTEL.yellow} fontWeight={700}>∠A</text>
      </g>;})()}
      {/* ∠A' at L intersection */}
      {sub>=1&&(()=>{const r2=30;return <g>
        <circle cx={ix} cy={Ly} r={4} fill={PASTEL.mint}/>
        <path d={`M ${ix+r2} ${Ly} A ${r2} ${r2} 0 0 1 ${ix+r2*Math.cos(angRad)} ${Ly+r2*Math.sin(angRad)}`} fill={`${PASTEL.mint}25`} stroke={PASTEL.mint} strokeWidth={2}/>
        <text x={ix+36} y={Ly+18} fontSize={10} fill={PASTEL.mint} fontWeight={700}>∠A'</text>
      </g>;})()}
    </g>;
  };

  const renderS10 = () => {
    // Same visual as S9 but with "∠A = ∠A'" label
    const pv=pivot; const angRad=rotTarget*Math.PI/180; const ext=W*1.2;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const transAng=origAng+angRad;
    const cosT=Math.cos(transAng), sinT=Math.sin(transAng);
    const slope=sinT/cosT;
    const ix=cosT!==0?pv.x+(Ly-pv.y)/slope:pv.x;
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={pv.x+cosT*ext} y1={pv.y+sinT*ext} x2={pv.x-cosT*ext} y2={pv.y-sinT*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      {(()=>{const r=30,a1=Math.PI,a2=transAng;return <path d={`M ${pv.x+r*Math.cos(a1)} ${pv.y+r*Math.sin(a1)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(a2)} ${pv.y+r*Math.sin(a2)}`} fill={`${PASTEL.yellow}25`} stroke={PASTEL.yellow} strokeWidth={2}/>;})()}
      {(()=>{const r2=30;return <path d={`M ${ix+r2} ${Ly} A ${r2} ${r2} 0 0 1 ${ix+r2*Math.cos(angRad)} ${Ly+r2*Math.sin(angRad)}`} fill={`${PASTEL.mint}25`} stroke={PASTEL.mint} strokeWidth={2}/>;})()}
      <text x={cx} y={H*.12} textAnchor="middle" fontSize={16} fill={PASTEL.coral} fontWeight={700}>∠A = ∠A'</text>
      <text x={cx} y={H*.19} textAnchor="middle" fontSize={11} fill={theme.text}>이 관계를 엇각이라 부릅니다</text>
      {sub>=1&&<text x={cx} y={H*.25} textAnchor="middle" fontSize={10} fill={theme.textSec}>평행선 사이에서만 엇각의 크기는 같아요</text>}
    </g>;
  };

  // ===== Stage 11: bisector + recap note =====
  const renderS11 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const halfRad=fullRad/2; const ext=W*1.2;
    const cosL=Math.cos(origAng+fullRad),sinL=Math.sin(origAng+fullRad);
    const cosH=Math.cos(origAng+halfRad),sinH=Math.sin(origAng+halfRad);
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <text x={20} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosL*ext} y2={pv.y+sinL*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <text x={pv.x+cosL*70+8} y={pv.y+sinL*70-8} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {sub>=1&&<g>
        <line x1={pv.x} y1={pv.y} x2={pv.x+cosH*ext} y2={pv.y+sinH*ext} stroke={PASTEL.coral} strokeWidth={2.5} strokeDasharray="8 5"/>
        <text x={pv.x+cosH*90+10} y={pv.y+sinH*90-10} fontSize={11} fill={PASTEL.coral} fontWeight={700} fontStyle="italic">N</text>
        {/* Half arcs */}
        {(()=>{const r=45,aM=Math.PI,aH=origAng+halfRad,aL=origAng+fullRad;return <g>
          <path d={`M ${pv.x+r*Math.cos(aM)} ${pv.y+r*Math.sin(aM)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(aH)} ${pv.y+r*Math.sin(aH)}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
          <path d={`M ${pv.x+r*Math.cos(aH)} ${pv.y+r*Math.sin(aH)} A ${r} ${r} 0 0 0 ${pv.x+r*Math.cos(aL)} ${pv.y+r*Math.sin(aL)}`} fill="none" stroke={PASTEL.yellow} strokeWidth={2}/>
        </g>;})()}
        <text x={cx-40} y={H*.1} textAnchor="middle" fontSize={13} fill={PASTEL.coral} fontWeight={700}>절반만 돌린 N = 각의 이등분선!</text>
      </g>}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={pv.x-14} y={pv.y+18} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  // ===== Stage 12: Points on N, one by one =====
  const renderS12 = () => {
    const pts=[.15,.30,.45,.60,.75].map((r,i)=>({x:W*r,y:Ny,l:`O${i+1}`}));
    const dL=Math.abs(Ly-Ny), dM=Math.abs(My-Ny);
    return <g>
      <line x1={15} y1={My} x2={W-15} y2={My} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ly} x2={W-15} y2={Ly} stroke={theme.line} strokeWidth={2}/>
      <line x1={15} y1={Ny} x2={W-15} y2={Ny} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      <text x={W-22} y={My+14} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={W-22} y={Ly-8} fontSize={10} fill={theme.textSec} fontStyle="italic">L</text>
      <text x={W-22} y={Ny-8} fontSize={10} fill={PASTEL.coral} fontStyle="italic" fontWeight={700}>N</text>
      {pts.slice(0, s12Shown).map((p,i)=><g key={i} style={{animation:"fadeIn .4s ease"}}>
        <line x1={p.x} y1={Ly} x2={p.x} y2={My} stroke={`${PASTEL.sky}35`} strokeWidth={1}/>
        <RA at={{x:p.x,y:Ly}} d1={{x:0,y:1}} d2={{x:1,y:0}} size={8} color={PASTEL.sky}/>
        <RA at={{x:p.x,y:My}} d1={{x:0,y:-1}} d2={{x:1,y:0}} size={8} color={PASTEL.sky}/>
        <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
        <text x={p.x} y={p.y-12} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>{p.l}</text>
        <text x={p.x+10} y={(Ny+Ly)/2} fontSize={8} fill={PASTEL.mint}>{dL.toFixed(0)}</text>
        <text x={p.x+10} y={(Ny+My)/2} fontSize={8} fill={PASTEL.mint}>{dM.toFixed(0)}</text>
      </g>)}
      {s12Shown>=5&&<text x={cx} y={H*.08} textAnchor="middle" fontSize={12} fill={PASTEL.mint} fontWeight={700}>모든 점에서 수선의 길이 같고, 교각 모두 직각!</text>}
    </g>;
  };

  // ===== Stage 13: after rotation, still equal =====
  const renderS13 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180, halfRad=fullRad/2, ext=W*1.2;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const cosL=Math.cos(origAng+fullRad),sinL=Math.sin(origAng+fullRad);
    const cosN=Math.cos(origAng+halfRad),sinN=Math.sin(origAng+halfRad);
    const cosM=Math.cos(Math.PI),sinM=Math.sin(Math.PI);
    const dirL={x:cosL,y:sinL}, dirM={x:cosM,y:sinM};
    const bPts=[55,95,135,175,220].map((t,i)=>({x:pv.x+cosN*t,y:pv.y+sinN*t,l:`O${i+1}`}));
    const n=sub>=1?5:3;
    return <g>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosM*ext} y2={pv.y+sinM*ext} stroke={theme.line} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosL*ext} y2={pv.y+sinL*ext} stroke={PASTEL.sky} strokeWidth={2}/>
      <line x1={pv.x} y1={pv.y} x2={pv.x+cosN*ext} y2={pv.y+sinN*ext} stroke={PASTEL.coral} strokeWidth={2} strokeDasharray="6 4"/>
      <text x={pv.x+cosM*70+5} y={pv.y+sinM*70-10} fontSize={10} fill={theme.textSec} fontStyle="italic">M</text>
      <text x={pv.x+cosL*70+5} y={pv.y+sinL*70-10} fontSize={10} fill={PASTEL.sky} fontStyle="italic">L</text>
      {bPts.slice(0,n).map((p,i)=>{
        const fL=footOnLine(p,pv,dirL), fM=footOnLine(p,pv,dirM);
        return <g key={i}>
          <line x1={p.x} y1={p.y} x2={fL.x} y2={fL.y} stroke={`${PASTEL.sky}55`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <line x1={p.x} y1={p.y} x2={fM.x} y2={fM.y} stroke={`${PASTEL.mint}55`} strokeWidth={1.5} strokeDasharray="3 2"/>
          <circle cx={p.x} cy={p.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={1.5}/>
          <text x={p.x} y={p.y-10} textAnchor="middle" fontSize={8} fill={PASTEL.coral} fontWeight={600}>{p.l}</text>
          <text x={(p.x+fL.x)/2+7} y={(p.y+fL.y)/2-4} fontSize={8} fill={PASTEL.sky}>{dist(p,fL).toFixed(0)}</text>
          <text x={(p.x+fM.x)/2+7} y={(p.y+fM.y)/2-4} fontSize={8} fill={PASTEL.mint}>{dist(p,fM).toFixed(0)}</text>
        </g>;
      })}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      {sub>=1&&<text x={cx-50} y={H*.08} textAnchor="middle" fontSize={12} fill={PASTEL.coral} fontWeight={700}>회전 후에도 양쪽 거리가 같다!</text>}
    </g>;
  };

  // ===== Stage 14: RHS proof =====
  const proof=[
    {t:"점 P에서 수선 내리기",d:"각의 이등분선 위의 점 P에서\n두 반직선 L, M에 수선을 내리면\n수선의 발 F₁, F₂가 생겨요."},
    {t:"직각삼각형 두 개!",d:"△AF₁P와 △AF₂P가 생기는데\n∠AF₁P = ∠AF₂P = 90°"},
    {t:"합동 조건 확인",d:"빗변 AP = AP (공통)\n∠F₁AP = ∠F₂AP (이등분선!)\n∠AF₁P = ∠AF₂P = 90°\n→ RHA 합동 (= ASA 합동)"},
    {t:"∴ PF₁ = PF₂",d:"합동이니까 d₁ = d₂\n두 반직선까지 거리가 같다!\n\n→ 세 이등분선의 교점\n= 세 변까지 거리 같은 점 = 내심!"},
  ];
  const renderS14 = () => {
    const pv=pivot; const fullRad=rotTarget*Math.PI/180, halfRad=fullRad/2, ext=W*.9;
    const origAng=Math.atan2(Ly-pv.y, 0-pv.x);
    const cosL=Math.cos(origAng+fullRad),sinL=Math.sin(origAng+fullRad);
    const cosN=Math.cos(origAng+halfRad),sinN=Math.sin(origAng+halfRad);
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
      </g>}
      {sub>=3&&<text x={P.x} y={P.y-22} textAnchor="middle" fontSize={13} fill={PASTEL.coral} fontWeight={700}>d₁ = d₂ ✓</text>}
      <circle cx={pv.x} cy={pv.y} r={5} fill={PASTEL.coral} stroke="#fff" strokeWidth={2}/>
      <text x={pv.x-14} y={pv.y+18} fontSize={11} fill={theme.text} fontWeight={700}>A</text>
    </g>;
  };

  // ===== Stage 15: tree diagram =====
  const renderS15 = () => {
    const tree=[
      {x:cx,y:45,l:"거리",s:"가장 짧은 경로의 길이",c:PASTEL.coral,r:26},
      {x:cx-110,y:150,l:"두 점 사이",s:"→ 선분",c:PASTEL.sky,r:20},
      {x:cx+110,y:150,l:"점과 직선",s:"→ 수선",c:PASTEL.mint,r:20},
      {x:cx-150,y:270,l:"수직이등분선",s:"→ 외심",c:"#F48FB1",r:17},
      {x:cx,y:270,l:"각의 이등분선",s:"→ 내심",c:PASTEL.lavender,r:17},
      {x:cx+150,y:270,l:"평행선 성질",s:"→ 엇각",c:PASTEL.yellow,r:17},
      {x:cx-80,y:370,l:"외접원",c:"#80CBC4",r:15},
      {x:cx+80,y:370,l:"내접원",c:"#AED581",r:15},
    ];
    const edges=[[0,1],[0,2],[1,3],[2,4],[2,5],[3,6],[4,7]];
    const n=Math.min(tree.length, sub+2);
    return <g>
      {edges.map(([a,b],i)=>(a<n&&b<n)?<line key={i} x1={tree[a].x} y1={tree[a].y} x2={tree[b].x} y2={tree[b].y} stroke={`${theme.textSec}25`} strokeWidth={2}/>:null)}
      {tree.slice(0,n).map((nd,i)=><g key={i} style={{animation:`fadeIn ${.3+i*.12}s ease`}}>
        <circle cx={nd.x} cy={nd.y} r={nd.r} fill={`${nd.c}18`} stroke={nd.c} strokeWidth={2}/>
        <text x={nd.x} y={nd.y+1} textAnchor="middle" dominantBaseline="central" fontSize={nd.r>22?12:10} fill={nd.c} fontWeight={700}>{nd.l}</text>
        {nd.s&&<text x={nd.x} y={nd.y+nd.r+14} textAnchor="middle" fontSize={8} fill={theme.textSec}>{nd.s}</text>}
      </g>)}
      {n>=8&&<text x={cx} y={H-30} textAnchor="middle" fontSize={11} fill={PASTEL.coral} fontWeight={700}>
        '거리' 하나로 이 모든 수학이 태어났어요!
      </text>}
    </g>;
  };

  // ===== Stage 16: Completion =====
  const renderS16 = () => <g>
    <text x={cx} y={H*.3} textAnchor="middle" fontSize={20} fill={PASTEL.coral} fontWeight={700}>🎉</text>
    <text x={cx} y={H*.4} textAnchor="middle" fontSize={15} fill={theme.text} fontWeight={700} fontFamily="'Noto Serif KR',serif">학습 완료!</text>
    <text x={cx} y={H*.5} textAnchor="middle" fontSize={11} fill={theme.textSec}>"거리"에서 "각의 이등분선"까지</text>
  </g>;

  // ===== Dispatch =====
  const R={1:renderMap,2:renderS2,3:renderS3,4:renderS4,5:renderS5,6:renderS6,7:renderS7,8:renderS8,
    9:renderS9,10:renderS10,11:renderS11,12:renderS12,13:renderS13,14:renderS14,15:renderS15,16:renderS16};

  const EX={
    1:["집에서 학교까지 얼마나 걸려?","\"대충 15분 정도 거리야~\" 가장 짧은 길로 얘기하죠.","멀리 돌아가는 거리를 얘기하진 않아요."],
    2:["집과 학교가 점A, 점B로 바뀌었어요.","거리 = 가장 짧은 경로의 길이입니다."],
    3:["점A와 점B 사이의 거리를 잴 때에도,","곡선이나 지그재그로 재지 않고,","직선(선분)을 그어서 길이를 재는 거죠."],
    4:["직선 L 위를 터치해서 점A까지의 거리를 재봐!"],
    5:["직선 L에 평행한 직선 M을 추가해볼게요.","수직인 직선을 긋고,","수선의 발 p, q의 중점 O!"],
    6:["같은 방식으로 거리가 같은 점을 여러 개 찍으면,","L, M과 평행한 직선 N이 그려집니다!"],
    7:["직선 N을 잠시 치워두고, 직선 L을 돌려볼게요.","직선 L이 돌아갑니다…","교점 A를 중심으로 → 두 반직선 = 각!"],
    8:["회전 애니메이션을 다시 봐요.","돌아간 정도 = 각도(degree)"],
    9:["원래 자리로 되돌리고 L'을 그려보면,","∠A와 ∠A'가 보입니다."],
    10:["∠A = ∠A' — 이걸 엇각이라 합니다.","평행선에서는 엇각의 크기가 같아요."],
    11:["다시 각A로 돌아올게요.\n아까 치워뒀던 직선 N을 기억하시죠?","절반만 돌리면 → 각의 이등분선!\n\n[복습] 평행선 → 같은 거리 → 직선N → 돌리면 각 → 절반이면 이등분선"],
    12:["직선 N 위의 점들, 수선의 발 거리를 확인해봐요.","점들이 하나씩 나타납니다…"],
    13:["회전 후에도 양쪽 거리가 같을까?","양쪽 수선의 길이가 모두 같아요!"],
    14:["이제 이론적으로 증명해볼게요."],
    15:["'거리'라는 하나의 정의에서,","이렇게 다양한 수학이 태어났어요!"],
    16:[],
  };

  const maxSub={1:2,2:1,3:2,4:0,5:2,6:1,7:2,8:1,9:1,10:1,11:1,12:1,13:1,14:3,15:6,16:0};
  const info=STAGES[stage-1];
  const canNext=(stage===4)?s4Done:(stage===12)?(s12Shown>=5):(sub>=(maxSub[stage]||0));
  const isLast=stage>=STAGES.length;

  const handleNext = () => {
    if(sub<(maxSub[stage]||0)){setSub(sub+1);return;}
    if(!isLast){playSfx("click");setStage(stage+1);}
  };

  const handleSvgPointer = (e) => {
    if(stage===4&&!s4Done) { handleS4Tap(e); return; }
    handlePanStart(e);
  };

  const curEx=EX[stage]||[];
  const exIdx=Math.min(sub,curEx.length-1);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:theme.bg,overflow:"hidden",userSelect:"none",WebkitUserSelect:"none"}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${theme.border}`,background:theme.card,flexShrink:0}}>
        <button onClick={()=>setScreen("polygons")} style={{background:"none",border:"none",color:theme.textSec,fontSize:13,cursor:"pointer"}}>← 돌아가기</button>
        <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:theme.text}}>{info.title}</div><div style={{fontSize:10,color:theme.textSec}}>{info.sub}</div></div>
        <div style={{fontSize:10,color:theme.textSec}}>{stage}/{STAGES.length}</div>
      </div>
      <div style={{height:3,background:theme.border,flexShrink:0}}><div style={{height:"100%",width:`${(stage/STAGES.length)*100}%`,background:PASTEL.coral,transition:"width .5s ease"}}/></div>

      {/* Canvas */}
      <div ref={cRef} style={{flex:1,position:"relative",overflow:"hidden",touchAction:"none"}}>
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{width:"100%",height:"100%",touchAction:"none"}}
          onPointerDown={handleSvgPointer}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onWheel={handleWheel}>
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={theme.svgBg}/>
          {R[stage]?.()}
        </svg>
      </div>

      {/* Bottom panel */}
      <div style={{padding:"10px 16px 18px",borderTop:`1px solid ${theme.border}`,background:theme.card,flexShrink:0}}>
        {/* Proof panel for stage 14 */}
        {stage===14&&<div style={{padding:"10px 14px",borderRadius:12,marginBottom:8,background:`${PASTEL.lavender}10`,border:`1px solid ${PASTEL.lavender}30`}}>
          <div style={{fontSize:12,fontWeight:700,color:PASTEL.lavender,marginBottom:4}}>{proof[Math.min(sub,proof.length-1)].t}</div>
          <div style={{fontSize:11,color:theme.text,lineHeight:2,whiteSpace:"pre-wrap"}}>{proof[Math.min(sub,proof.length-1)].d}</div>
        </div>}

        {/* Explanation */}
        {stage!==14&&curEx.length>0&&<p style={{fontSize:12,color:canNext?PASTEL.coral:theme.text,lineHeight:2,marginBottom:6,fontWeight:canNext?700:400,whiteSpace:"pre-wrap"}}>{curEx[exIdx]||""}</p>}

        {/* Buttons row */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {stage>1&&<button onClick={()=>{playSfx("click");setStage(stage-1);}} style={{padding:"10px 14px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer",flexShrink:0}}>←</button>}

          {/* Help button */}
          {stage<16&&<button onClick={()=>{setShowHelp(true);playSfx("click");}} style={{padding:"10px 12px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:11,cursor:"pointer",flexShrink:0}}>❓</button>}

          <button onClick={handleNext} style={{flex:1,padding:"10px",borderRadius:12,border:"none",
            background:canNext?`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`:`${theme.textSec}20`,
            color:canNext?"#fff":theme.textSec,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .3s"}}>
            {isLast&&canNext?"완료":canNext?"다음 →":"진행해봐!"}
          </button>
        </div>

        {/* Completion buttons */}
        {stage===16&&<div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={()=>setScreen("polygons")} style={{flex:1,padding:"10px",borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.textSec,fontSize:12,cursor:"pointer"}}>닫기</button>
          {setArchive&&<button onClick={()=>{
            setArchive(prev=>[...prev,{id:`dist-${Date.now()}`,type:"거리 개념",title:"거리→각의 이등분선",preview:"16단계 학습 완료",createdAt:Date.now(),isPublic:archiveDefaultPublic||false,hidden:false,userId:user?.id}]);
            playSfx("success");showMsg("아카이브에 저장! 📂",1500);
          }} style={{flex:2,padding:"10px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PASTEL.coral},${PASTEL.dustyRose})`,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>📂 아카이브에 저장</button>}
          <button onClick={()=>setShowFinalQ(true)} style={{padding:"10px 14px",borderRadius:12,border:`1px solid ${PASTEL.coral}30`,background:`${PASTEL.coral}08`,color:PASTEL.coral,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>질문하기</button>
        </div>}

        {/* Stage dots */}
        <div style={{display:"flex",justifyContent:"center",gap:3,marginTop:8}}>
          {STAGES.map((_,i)=><div key={i} style={{width:i===stage-1?12:4,height:4,borderRadius:2,background:i<stage?PASTEL.coral:`${theme.textSec}25`,transition:"all .3s"}}/>)}
        </div>
      </div>

      {/* Help Popup */}
      {showHelp&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}} onClick={()=>setShowHelp(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:500,maxHeight:"70vh",background:theme.bg,borderRadius:"24px 24px 0 0",overflow:"auto",padding:"20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:theme.text,marginBottom:8}}>💡 {info.title}</div>
          <div style={{fontSize:13,lineHeight:2.2,color:theme.text,marginBottom:16}}>{info.help}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowHelp(false)} style={{flex:1,padding:12,borderRadius:12,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:13,cursor:"pointer"}}>이해했어!</button>
            <button onClick={()=>{
              if(setHelpRequests) setHelpRequests(prev=>[...prev,{screenName:"거리 개념",stage:stage,stageTitle:info.title,timestamp:Date.now()}]);
              playSfx("success"); showMsg("선생님께 질문했어요! ✅",1500); setShowHelp(false);
            }} style={{flex:1,padding:12,borderRadius:12,border:"none",background:`${PASTEL.coral}15`,color:PASTEL.coral,fontSize:13,fontWeight:700,cursor:"pointer"}}>선생님께 질문하기</button>
          </div>
        </div>
      </div>}

      {/* Final question popup with stage selector */}
      {showFinalQ&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}} onClick={()=>setShowFinalQ(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:500,maxHeight:"80vh",background:theme.bg,borderRadius:"24px 24px 0 0",overflow:"auto",padding:"20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:theme.text,marginBottom:4}}>🙋 어디서부터 이해가 안 됐나요?</div>
          <div style={{fontSize:11,color:theme.textSec,marginBottom:12}}>해당 단계를 선택하면 선생님이 확인할 수 있어요</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
            {STAGES.slice(0,15).map((s,i)=>(
              <button key={i} onClick={()=>setSelectedQStage(selectedQStage===i?null:i)} style={{
                textAlign:"left",padding:"10px 14px",borderRadius:12,
                background:selectedQStage===i?`${PASTEL.coral}12`:theme.card,
                border:`1.5px solid ${selectedQStage===i?PASTEL.coral:theme.border}`,
                cursor:"pointer",transition:"all .2s"
              }}>
                <span style={{fontSize:11,fontWeight:600,color:selectedQStage===i?PASTEL.coral:theme.text}}>{s.n}. {s.title}</span>
                <span style={{fontSize:10,color:theme.textSec,marginLeft:8}}>{s.sub}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>{
            if(selectedQStage==null){showMsg("단계를 선택해주세요!",1200);return;}
            if(setHelpRequests) setHelpRequests(prev=>[...prev,{screenName:"거리 개념",stage:selectedQStage+1,stageTitle:STAGES[selectedQStage].title,timestamp:Date.now(),type:"final-question"}]);
            playSfx("success"); showMsg("선생님께 질문했어요! ✅",1500); setShowFinalQ(false);
          }} disabled={selectedQStage==null} style={{
            width:"100%",padding:14,borderRadius:14,border:"none",
            background:selectedQStage!=null?PASTEL.coral:`${theme.textSec}20`,
            color:selectedQStage!=null?"#fff":theme.textSec,
            fontSize:14,fontWeight:700,cursor:"pointer"
          }}>📨 선생님께 질문하기</button>
        </div>
      </div>}
    </div>
  );
}
