// DiaryScreen.jsx — ashrain.out v5
// State: desk-neat / desk-thrown / book-open | Two-page spread | Pressure | XP system
import React,{useState,useRef,useEffect,useCallback,memo} from "react";
import DeskScene3D from "./DiaryDeskScene";
import {DECO_CATALOG as _DECO_CATALOG, MYSTICAL_QUOTES} from "./DiaryConfig";
import{PASTEL}from"../config";

// ─── KaTeX ────────────────────────────────────────────────────────────────────
let _katex=null;
function loadKatex(){
  if(_katex)return Promise.resolve(_katex);
  return new Promise(r=>{
    if(!document.getElementById("katex-css")){const l=document.createElement("link");l.id="katex-css";l.rel="stylesheet";l.href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";document.head.appendChild(l);}
    const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";s.onload=()=>{_katex=window.katex;r(_katex);};s.onerror=()=>r(null);document.head.appendChild(s);
  });
}
function MathRender({tex,display=true}){
  const ref=useRef(null);
  useEffect(()=>{if(!ref.current)return;loadKatex().then(k=>{if(!k||!ref.current)return;try{k.render(tex||"\\square",ref.current,{throwOnError:false,displayMode:display});}catch{if(ref.current)ref.current.textContent=tex;}});},[tex,display]);
  return<span ref={ref}/>;
}
function MathDialog({theme,initial,onConfirm,onCancel}){
  const[tex,setTex]=useState(initial||"");const prev=useRef(null);
  useEffect(()=>{if(!prev.current)return;loadKatex().then(k=>{if(!k||!prev.current)return;try{k.render(tex||"\\square",prev.current,{throwOnError:false,displayMode:true});}catch{if(prev.current)prev.current.textContent=tex;}});},[tex]);
  return(<div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{width:"100%",maxWidth:400,background:theme.card,borderRadius:18,padding:20}}>
      <div style={{fontWeight:700,fontSize:14,color:theme.text,marginBottom:10}}>∑ 수식 (LaTeX)</div>
      <input value={tex} onChange={e=>setTex(e.target.value)} placeholder="\frac{a}{b}+\sqrt{c}" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:13,boxSizing:"border-box",fontFamily:"monospace"}}/>
      <div ref={prev} style={{minHeight:44,padding:"8px 4px",textAlign:"center",overflowX:"auto"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={{flex:1,padding:9,borderRadius:8,border:`1px solid ${theme.border}`,background:"none",color:theme.textSec,cursor:"pointer"}}>취소</button>
        <button onClick={()=>onConfirm(tex)} style={{flex:1,padding:9,borderRadius:8,border:"none",background:PASTEL.lavender,color:"#3d2d60",fontWeight:700,cursor:"pointer"}}>확인</button>
      </div>
    </div>
  </div>);
}

// ─── Animation injection ─────────────────────────────────────────────────────
let _bookAnimInjected = false;
function injectBookAnims() {
  if (_bookAnimInjected) return; _bookAnimInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes bookOpen {
      0%   { transform: perspective(700px) rotateX(52deg) rotateY(-8deg) scale(0.82); opacity:0; }
      40%  { transform: perspective(700px) rotateX(28deg) rotateY(-3deg) scale(0.95); opacity:0.8; }
      100% { transform: perspective(700px) rotateX(0deg)  rotateY(0deg)  scale(1);    opacity:1; }
    }
    @keyframes bookClose {
      0%   { transform: perspective(700px) rotateX(0deg)  scale(1);    opacity:1; }
      100% { transform: perspective(700px) rotateX(52deg) scale(0.75); opacity:0; }
    }
    @keyframes pageFlipLeft {
      0%   { transform: perspective(900px) rotateY(0deg);   z-index:30; }
      50%  { transform: perspective(900px) rotateY(-90deg); z-index:30; box-shadow: -8px 0 24px rgba(0,0,0,0.4); }
      100% { transform: perspective(900px) rotateY(-180deg);z-index:1; }
    }
    @keyframes pageFlipRight {
      0%   { transform: perspective(900px) rotateY(0deg);  z-index:30; }
      50%  { transform: perspective(900px) rotateY(90deg); z-index:30; box-shadow: 8px 0 24px rgba(0,0,0,0.4); }
      100% { transform: perspective(900px) rotateY(180deg);z-index:1; }
    }
    @keyframes quoteIn {
      0%   { opacity:0; transform: translateY(8px); }
      100% { opacity:1; transform: translateY(0); }
    }
    @keyframes quoteFade {
      0%   { opacity:1; }
      100% { opacity:0; filter: blur(4px); }
    }
  `;
  document.head.appendChild(s);
}

// ─── GhostQuote — mystical quote overlay for empty pages ─────────────────────
function GhostQuote({ pageIdx, totalPages }) {
  // Seed: day-of-year × (pageIdx+1) for daily rotation
  const seed = Math.floor(Date.now() / 86400000) * 31 + pageIdx;
  const [qIdx, setQIdx] = useState(seed % MYSTICAL_QUOTES.length);
  const [visible, setVisible] = useState(true);
  const [anim, setAnim] = useState("quoteIn 0.8s ease forwards");

  const handleTap = (e) => {
    e.stopPropagation();
    // 50% chance: disappear, 50% chance: new quote
    const vanish = Math.random() > 0.5;
    setAnim("quoteFade 0.6s ease forwards");
    setTimeout(() => {
      if (vanish) { setVisible(false); }
      else {
        const next = (qIdx + 1 + Math.floor(Math.random() * 5)) % MYSTICAL_QUOTES.length;
        setQIdx(next); setVisible(true);
        setAnim("quoteIn 0.8s ease forwards");
      }
    }, 600);
  };

  if (!visible) return null;
  const q = MYSTICAL_QUOTES[qIdx];

  return (
    <div onClick={handleTap} style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px", gap: 20, cursor: "pointer",
      animation: anim,
      zIndex: 1, pointerEvents: "auto",
    }}>
      {/* Original text */}
      <div style={{
        fontFamily: "serif", fontSize: 13, color: "rgba(100,80,50,0.55)",
        textAlign: "center", lineHeight: 1.9, letterSpacing: "0.04em",
        maxWidth: 320, wordBreak: "break-word",
      }}>
        {q.original}
      </div>
      {/* Short line */}
      <div style={{
        fontFamily: "serif", fontSize: 12, color: "rgba(80,60,40,0.7)",
        textAlign: "center", lineHeight: 1.7, fontStyle: "italic",
      }}>
        {q.line}
      </div>
      {/* Source */}
      <div style={{
        fontSize: 10, color: "rgba(120,100,70,0.45)",
        fontFamily: "serif", letterSpacing: "0.06em",
      }}>
        — {q.source}
      </div>
      <div style={{
        fontSize: 9, color: "rgba(120,100,70,0.3)",
        marginTop: 8, fontFamily: "serif",
      }}>
        탭하면 사라지거나 바뀌어요
      </div>
    </div>
  );
}

// ─── First-page cover (registration date) ────────────────────────────────────
function FirstPageCover({ theme }) {
  const startDate = localStorage.getItem("ar_diary_start") || (() => {
    const d = new Date().toISOString().slice(0, 10);
    localStorage.setItem("ar_diary_start", d);
    return d;
  })();
  const d = new Date(startDate + "T00:00:00");
  const formatted = d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: "linear-gradient(160deg, #faf8f4 0%, #f0ece4 100%)",
      padding: 32,
    }}>
      <div style={{ fontSize: 32, opacity: 0.4 }}>✦</div>
      <div style={{ fontFamily: "serif", fontSize: 11, color: "rgba(100,80,50,0.5)", letterSpacing: "0.2em" }}>
        DIARY
      </div>
      <div style={{
        fontFamily: "serif", fontSize: 18, color: "rgba(80,60,40,0.75)",
        fontWeight: 700, textAlign: "center", letterSpacing: "0.04em",
        lineHeight: 1.6,
      }}>
        {formatted}
      </div>
      <div style={{
        width: 40, height: 1, background: "rgba(100,80,50,0.25)", margin: "4px 0",
      }} />
      <div style={{ fontSize: 10, color: "rgba(100,80,50,0.4)", fontFamily: "serif", letterSpacing: "0.1em" }}>
        나의 이야기가 시작되다
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_W=800,PAGE_H=1100,LINE_H=32,ERASER_R=22,MAX_ZOOM=8;
const BG={RULED:"ruled",GRID:"grid",DOT:"dot",PLAIN:"plain"};
const MOODS=["😊","😐","😔","😤","🥱","🤔","💪","🎉","🥳","😴"];
const SLASH_CMDS=[
  {cmd:"archive",icon:"📂",label:"아카이브"},
  {cmd:"math",icon:"∑",label:"수식 (LaTeX)"},
  {cmd:"todo",icon:"☐",label:"체크리스트"},
  {cmd:"callout",icon:"💡",label:"강조 박스"},
  {cmd:"toggle",icon:"▶",label:"접기/펼치기"},
  {cmd:"divider",icon:"─",label:"구분선"},
  {cmd:"date",icon:"📅",label:"날짜 삽입"},
  {cmd:"image",icon:"🖼",label:"이미지"},
];
const BRUSHES=[
  {id:"PEN",name:"펜",icon:"🖊",defSize:3},
  {id:"PENCIL",name:"연필",icon:"✏️",defSize:3},
  {id:"PASTEL",name:"파스텔",icon:"🖍",defSize:5},
  {id:"CHARCOAL",name:"목탄",icon:"⬛",defSize:5},
  {id:"WATERCOLOR",name:"수채",icon:"💧",defSize:8},
  {id:"OIL",name:"유채",icon:"🎨",defSize:5},
  {id:"INK",name:"수묵",icon:"🖌️",defSize:4},
  {id:"HIGHLIGHT",name:"형광펜",icon:"🌟",defSize:12},
  {id:"ERASER",name:"지우개",icon:"⌫",defSize:22},
];
const PEN_COLORS=["#1a1a1a","#2c3e50","#1a6fc4","#c0392b","#27ae60","#8e44ad","#d35400","#f39c12","#7f8c8d","#16a085","#ffffff"];
const XP_COVER=500,XP_DESK=400,XP_DECO=300;
const DESK_THEMES=[
  {id:"oak",label:"원목",bg:"linear-gradient(170deg,#c8934e 0%,#b5783a 45%,#ca9850 75%,#b07840 100%)",premium:false},
  {id:"linen",label:"리넨",bg:"linear-gradient(170deg,#e8dcc8 0%,#ddd0b8 50%,#e4d8c4 100%)",premium:false},
  {id:"white",label:"화이트",bg:"#f0ede8",premium:false},
  {id:"dark",label:"다크 오크",bg:"linear-gradient(170deg,#3d2a1e 0%,#4a3424 50%,#3a2818 100%)",premium:true},
  {id:"felt",label:"그린 펠트",bg:"linear-gradient(135deg,#2d5a3d 0%,#1e4a2e 50%,#2d5a3d 100%)",premium:true},
  {id:"marble",label:"핑크 마블",bg:"linear-gradient(120deg,#f5d0d0 0%,#fce8e8 35%,#f0cccc 65%,#ead0d0 100%)",premium:true},
  {id:"slate",label:"슬레이트",bg:"linear-gradient(135deg,#6a7888 0%,#58687a 50%,#6a7888 100%)",premium:true},
];
const COVER_STYLES=[
  {id:"none",label:"없음",border:"none",shadow:"0 8px 32px rgba(0,0,0,0.2)",premium:false},
  {id:"brown",label:"브라운",border:"6px solid #8B5E3C",shadow:"0 12px 44px rgba(0,0,0,0.45),inset 0 0 0 2px rgba(255,220,180,0.15)",premium:false},
  {id:"simple",label:"심플",border:"2px solid rgba(0,0,0,0.15)",shadow:"0 8px 32px rgba(0,0,0,0.22)",premium:false},
  {id:"navy",label:"네이비",border:"6px solid #1a2a4a",shadow:"0 12px 44px rgba(0,0,0,0.45)",premium:true},
  {id:"bordeaux",label:"보르도",border:"6px solid #6b1e2e",shadow:"0 12px 44px rgba(0,0,0,0.45)",premium:true},
  {id:"forest",label:"포레스트",border:"6px solid #2d4a28",shadow:"0 12px 44px rgba(0,0,0,0.45)",premium:true},
  {id:"gold",label:"골드",border:"4px solid #c8a84b",shadow:"0 10px 36px rgba(0,0,0,0.3),inset 0 0 0 1px #e8c870",premium:true},
];
const DECO_CATALOG=[
  {id:"vase",label:"화병",emoji:"🌸",baseSize:52,premium:false},
  {id:"coffee",label:"커피",emoji:"☕",baseSize:46,premium:false},
  {id:"plant",label:"식물",emoji:"🪴",baseSize:54,premium:false},
  {id:"pencils",label:"연필통",emoji:"✏️",baseSize:42,premium:false},
  {id:"cat",label:"고양이",emoji:"🐱",baseSize:58,premium:true},
  {id:"glasses",label:"안경",emoji:"👓",baseSize:40,premium:true},
  {id:"phone",label:"폰",emoji:"📱",baseSize:44,premium:true},
  {id:"headph",label:"이어폰",emoji:"🎧",baseSize:50,premium:true},
  {id:"ribbon",label:"리본",emoji:"🎀",baseSize:44,premium:true},
  {id:"teddy",label:"곰인형",emoji:"🧸",baseSize:56,premium:true},
  {id:"candle",label:"캔들",emoji:"🕯️",baseSize:44,premium:true},
  {id:"moon",label:"달",emoji:"🌙",baseSize:40,premium:true},
];

// ─── Brush utilities ──────────────────────────────────────────────────────────
function seededRng(seed){let s=((Math.abs(seed)*2654435761)>>>0)||1;return()=>{s=((s*1664525+1013904223)>>>0);return s/4294967296;};}
function interpPath(pts,spacing){
  if(!pts||pts.length<2)return pts||[];
  const out=[pts[0]];let rem=0;
  for(let i=1;i<pts.length;i++){const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,len=Math.hypot(dx,dy);if(len<0.01)continue;let pos=spacing-rem;while(pos<=len){out.push({x:pts[i-1].x+dx*(pos/len),y:pts[i-1].y+dy*(pos/len),p:((pts[i-1].p??0.5)+(pts[i].p??0.5))/2});pos+=spacing;}rem=pos-len;}
  return out;
}
function ctxBezier(ctx,pts){
  if(!pts||pts.length<2)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  if(pts.length===2){ctx.lineTo(pts[1].x,pts[1].y);return;}
  for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];ctx.bezierCurveTo(p1.x+(p2.x-p0.x)/6,p1.y+(p2.y-p0.y)/6,p2.x-(p3.x-p1.x)/6,p2.y-(p3.y-p1.y)/6,p2.x,p2.y);}
}
function lighten(hex,t){const h=hex.replace("#","");const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return`rgba(${Math.min(255,r+(255-r)*t)|0},${Math.min(255,g+(255-g)*t)|0},${Math.min(255,b+(255-b)*t)|0},1)`;}
function darken(hex,t){const h=hex.replace("#","");const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return`rgba(${(r*(1-t))|0},${(g*(1-t))|0},${(b*(1-t))|0},1)`;}

function drawPressurePoly(ctx,pts,size,color,alpha=1){
  if(!pts||pts.length<2)return;
  const left=[],right=[];
  for(let i=0;i<pts.length;i++){const w=size*Math.max(0.15,Math.min(2.0,0.3+(pts[i].p??0.5)*1.7))/2;const nx=pts[Math.min(i+1,pts.length-1)],pr=pts[Math.max(i-1,0)];const dx=nx.x-pr.x,dy=nx.y-pr.y,len=Math.hypot(dx,dy)||1;left.push({x:pts[i].x+(-dy/len)*w,y:pts[i].y+(dx/len)*w});right.push({x:pts[i].x+(dy/len)*w,y:pts[i].y+(-dx/len)*w});}
  ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);for(let i=1;i<left.length;i++)ctx.lineTo(left[i].x,left[i].y);
  const ep=pts[pts.length-1],ew=size*Math.max(0.15,Math.min(2.0,0.3+(ep.p??0.5)*1.7))/2;
  ctx.arc(ep.x,ep.y,ew,Math.atan2(right[right.length-1].y-ep.y,right[right.length-1].x-ep.x),Math.atan2(left[left.length-1].y-ep.y,left[left.length-1].x-ep.x),true);
  for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i].x,right[i].y);
  const sp=pts[0],sw=size*Math.max(0.15,Math.min(2.0,0.3+(sp.p??0.5)*1.7))/2;
  ctx.arc(sp.x,sp.y,sw,Math.atan2(left[0].y-sp.y,left[0].x-sp.x),Math.atan2(right[0].y-sp.y,right[0].x-sp.x),true);
  ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.fill();
}

function drawStroke(ctx,{pts,tool,color,size}){
  if(!pts||pts.length<2)return;
  const rng=seededRng(pts[0].x*997+pts[0].y*389+size*31);
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
  if(tool==="PEN"){drawPressurePoly(ctx,pts,size,color,0.96);}
  else if(tool==="PENCIL"){
    const s=interpPath(pts,Math.max(0.6,size*0.42));
    ctx.globalCompositeOperation=(color==="#ffffff")?"source-over":"multiply";
    for(let pass=0;pass<7;pass++){ctx.beginPath();for(let i=0;i<s.length;i++){const pr=s[i].p??0.5,spread=size*(0.8+pr*0.9),ox=(rng()-0.5)*spread,oy=(rng()-0.5)*spread*0.6;if(i===0)ctx.moveTo(s[i].x+ox,s[i].y+oy);else ctx.lineTo(s[i].x+ox,s[i].y+oy);}ctx.strokeStyle=color;ctx.lineWidth=rng()*size*0.38+0.18;ctx.globalAlpha=rng()*0.19+0.05;ctx.stroke();}
    for(const pt of s){const pr=pt.p??0.5,thresh=0.75-pr*0.35;if(rng()>thresh){ctx.beginPath();ctx.arc(pt.x+(rng()-0.5)*size*(0.8+pr),pt.y+(rng()-0.5)*size*(0.8+pr),rng()*size*0.22+0.08,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=rng()*0.15*(0.5+pr)+0.03;ctx.fill();}}
    for(let i=0;i<s.length-1;i++){const pr=(s[i].p??0.5+s[i+1].p??0.5)/2;ctx.beginPath();ctx.moveTo(s[i].x,s[i].y);ctx.lineTo(s[i+1].x,s[i+1].y);ctx.strokeStyle=color;ctx.lineWidth=size*(0.22+pr*0.5);ctx.globalAlpha=0.42+pr*0.3;ctx.stroke();}
    ctx.globalCompositeOperation="source-over";
  }
  else if(tool==="CHARCOAL"){
    const dark=(color==="#ffffff")?"#d8d8d8":"#111111";const s=interpPath(pts,0.9);const avgP=s.reduce((a,p)=>a+(p.p??0.5),0)/Math.max(1,s.length);
    ctx.filter=`blur(${Math.min(8,size*(1.0+avgP*0.8))}px)`;ctx.globalAlpha=0.06+avgP*0.07;ctx.strokeStyle=dark;ctx.lineWidth=size*(3+avgP*3);ctxBezier(ctx,pts);ctx.stroke();
    ctx.filter=`blur(${Math.min(4,size*0.55)}px)`;ctx.globalAlpha=0.12+avgP*0.1;ctx.lineWidth=size*(1.5+avgP*1.5);ctxBezier(ctx,pts);ctx.stroke();ctx.filter="none";
    for(const pt of s){const pr=pt.p??0.5,thresh=0.55-pr*0.4;if(rng()>thresh){const a=rng()*Math.PI*2,d=rng()*size*(0.7+pr*0.7);ctx.beginPath();ctx.arc(pt.x+Math.cos(a)*d,pt.y+Math.sin(a)*d,rng()*size*(0.3+pr*0.4)+0.1,0,Math.PI*2);ctx.fillStyle=dark;ctx.globalAlpha=rng()*(0.2+pr*0.2)+0.04;ctx.fill();}}
    for(let pass=0;pass<3;pass++){ctx.beginPath();for(let i=0;i<s.length;i++){const pr=s[i].p??0.5,ox=(rng()-0.5)*size*(0.8+pr*0.8),oy=(rng()-0.5)*size*0.4;if(i===0)ctx.moveTo(s[i].x+ox,s[i].y+oy);else ctx.lineTo(s[i].x+ox,s[i].y+oy);}ctx.strokeStyle=dark;ctx.lineWidth=rng()*size*0.5+0.2;ctx.globalAlpha=rng()*0.18+0.07;ctx.stroke();}
    for(let i=0;i<s.length-1;i++){const pr=(s[i].p??0.5+s[i+1].p??0.5)/2;ctx.beginPath();ctx.moveTo(s[i].x,s[i].y);ctx.lineTo(s[i+1].x,s[i+1].y);ctx.strokeStyle=dark;ctx.lineWidth=size*(0.3+pr*0.55);ctx.globalAlpha=0.5+pr*0.35;ctx.stroke();}
  }
  else if(tool==="PASTEL"){
    const s=interpPath(pts,Math.max(0.6,size*0.32));const avgP=s.reduce((a,p)=>a+(p.p??0.5),0)/Math.max(1,s.length);
    ctx.filter=`blur(${Math.min(9,size*(1.0+avgP*1.2))}px)`;ctx.globalAlpha=0.05+avgP*0.06;ctx.strokeStyle=color;ctx.lineWidth=size*(7+avgP*6);ctxBezier(ctx,pts);ctx.stroke();
    ctx.filter=`blur(${Math.min(4,size*0.45+avgP*1.5)}px)`;ctx.globalAlpha=0.08+avgP*0.06;ctx.lineWidth=size*(4+avgP*3);ctxBezier(ctx,pts);ctx.stroke();ctx.filter="none";
    for(const pt of s){const pr=pt.p??0.5,n=Math.floor(3+pr*7)+Math.floor(rng()*3);for(let j=0;j<n;j++){const a=rng()*Math.PI*2,d=rng()*size*(1.8+pr*1.6),r=rng()*size*(0.5+pr*0.4)+0.2;ctx.beginPath();ctx.arc(pt.x+Math.cos(a)*d,pt.y+Math.sin(a)*d,r,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=rng()*(0.04+pr*0.035)+0.01;ctx.fill();}}
    ctx.filter=`blur(${Math.max(0.3,size*0.2)}px)`;for(let i=0;i<s.length-1;i++){const pr=(s[i].p??0.5+s[i+1].p??0.5)/2;ctx.beginPath();ctx.moveTo(s[i].x,s[i].y);ctx.lineTo(s[i+1].x,s[i+1].y);ctx.strokeStyle=color;ctx.lineWidth=size*(1.2+pr*1.4);ctx.globalAlpha=0.15+pr*0.18;ctx.stroke();}ctx.filter="none";
  }
  else if(tool==="WATERCOLOR"){
    const layers=[{blur:size*1.2,lw:size*8,a:0.07},{blur:size*0.7,lw:size*5.5,a:0.09},{blur:size*0.35,lw:size*3.5,a:0.11},{blur:0,lw:size*2,a:0.14},{blur:0,lw:size*1,a:0.17}];
    for(const{blur,lw,a}of layers){ctx.filter=blur>0?`blur(${Math.min(9,blur)}px)`:"none";ctx.globalAlpha=a;ctx.strokeStyle=color;ctx.lineWidth=lw;ctxBezier(ctx,pts);ctx.stroke();}ctx.filter="none";
    const s=interpPath(pts,size*0.8);for(const pt of s){if(rng()>0.7){ctx.beginPath();ctx.arc(pt.x+(rng()-0.5)*size*2.5,pt.y+(rng()-0.5)*size*2.5,rng()*size*1.2+0.5,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=rng()*0.05+0.01;ctx.fill();}}
  }
  else if(tool==="OIL"){
    const lt=lighten(color,0.42),dk=darken(color,0.38);
    const so=interpPath(pts,1.5);ctx.beginPath();so.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x+1.8,p.y+1.8);else ctx.lineTo(p.x+1.8,p.y+1.8);});ctx.strokeStyle=dk;ctx.lineWidth=size*2.8;ctx.globalAlpha=0.48;ctx.stroke();
    ctx.globalAlpha=0.94;ctx.strokeStyle=color;ctx.lineWidth=size*2.3;ctxBezier(ctx,pts);ctx.stroke();
    const hi=interpPath(pts,1.5);ctx.beginPath();hi.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x-1,p.y-1);else ctx.lineTo(p.x-1,p.y-1);});ctx.strokeStyle=lt;ctx.lineWidth=size*0.85;ctx.globalAlpha=0.52;ctx.stroke();
    const sc=interpPath(pts,size*0.6);for(const pt of sc){ctx.beginPath();ctx.rect(pt.x+(rng()-0.5)*size*0.8,pt.y+(rng()-0.5)*size*0.8,rng()*size*0.5+0.3,rng()*size*0.5+0.3);ctx.fillStyle=rng()>0.5?lt:color;ctx.globalAlpha=rng()*0.15+0.04;ctx.fill();}
  }
  else if(tool==="INK"){
    const s=interpPath(pts,0.6);
    for(let i=0;i<s.length-1;i++){const p1=s[i],p2=s[i+1],spd=Math.hypot(p2.x-p1.x,p2.y-p1.y),pr=(p1.p??0.5+p2.p??0.5)/2,w=Math.max(0.4,size*Math.max(0.18,2.2-spd*0.06)*(0.3+pr*1.4));ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.globalAlpha=0.85+pr*0.1;ctx.stroke();}
    ctx.filter=`blur(0.8px)`;ctx.globalAlpha=0.12;ctx.strokeStyle=color;ctx.lineWidth=size*0.45;ctxBezier(ctx,pts);ctx.stroke();ctx.filter="none";
  }
  else if(tool==="HIGHLIGHT"){ctx.globalAlpha=0.33;ctx.strokeStyle=color;ctx.lineWidth=size*5.5;ctx.lineCap="square";ctxBezier(ctx,pts);ctx.stroke();}
  ctx.restore();
}

// ─── DrawCanvas ───────────────────────────────────────────────────────────────
const DrawCanvas=memo(function DrawCanvas({paths,curPts,brushId,penColor,penSize,eraserPos}){
  const baseRef=useRef(null),liveRef=useRef(null);
  useEffect(()=>{const ctx=baseRef.current?.getContext("2d");if(!ctx)return;ctx.clearRect(0,0,PAGE_W,PAGE_H);for(const p of(paths||[]))drawStroke(ctx,p);},[paths]);
  useEffect(()=>{
    const ctx=liveRef.current?.getContext("2d");if(!ctx)return;ctx.clearRect(0,0,PAGE_W,PAGE_H);
    if(curPts?.length>1)drawStroke(ctx,{pts:curPts,tool:brushId,color:penColor,size:penSize});
    if(eraserPos){ctx.save();ctx.beginPath();ctx.arc(eraserPos.x,eraserPos.y,ERASER_R,0,Math.PI*2);ctx.strokeStyle="#aaa";ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.restore();}
  });
  return<>
    <canvas ref={baseRef} width={PAGE_W} height={PAGE_H} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}/>
    <canvas ref={liveRef} width={PAGE_W} height={PAGE_H} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}/>
  </>;
});

// ─── Background renderer ──────────────────────────────────────────────────────
function PageBackground({bgType,theme}){
  const els=[];
  if(bgType===BG.RULED){for(let y=LINE_H;y<PAGE_H;y+=LINE_H)els.push(<line key={y} x1="20" y1={y} x2={PAGE_W-20} y2={y} stroke={theme.border} strokeWidth="0.7" opacity="0.35"/>);}
  else if(bgType===BG.GRID){for(let y=0;y<PAGE_H;y+=LINE_H)els.push(<line key={`h${y}`} x1="0" y1={y} x2={PAGE_W} y2={y} stroke={theme.border} strokeWidth="0.5" opacity="0.25"/>);for(let x=0;x<PAGE_W;x+=LINE_H)els.push(<line key={`v${x}`} x1={x} y1="0" x2={x} y2={PAGE_H} stroke={theme.border} strokeWidth="0.5" opacity="0.25"/>);}
  else if(bgType===BG.DOT){for(let y=LINE_H;y<PAGE_H;y+=LINE_H)for(let x=LINE_H;x<PAGE_W;x+=LINE_H)els.push(<circle key={`${x},${y}`} cx={x} cy={y} r="2" fill={theme.border} opacity="0.35"/>);}
  return<svg width={PAGE_W} height={PAGE_H} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}>{els}</svg>;
}

// ─── Fantasy Modal ────────────────────────────────────────────────────────────
function FantasyModal({title,subtitle,buttons,onCancel,theme}){
  return(<div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:340,background:"linear-gradient(160deg,#1a1408 0%,#2c2010 60%,#1a1408 100%)",border:"2px solid #8a6820",borderRadius:16,padding:"28px 24px",boxShadow:"0 0 60px rgba(200,160,40,0.25),inset 0 0 40px rgba(0,0,0,0.5)"}}>
      <div style={{textAlign:"center",marginBottom:8}}>
        <div style={{fontSize:28,marginBottom:6}}>📖</div>
        <div style={{fontFamily:"serif",fontSize:18,fontWeight:700,color:"#e8c84a",letterSpacing:"0.05em",textShadow:"0 0 20px rgba(232,200,74,0.5)"}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:"#c8a840",marginTop:4,opacity:0.8}}>{subtitle}</div>}
      </div>
      <div style={{height:1,background:"linear-gradient(90deg,transparent,#8a6820,transparent)",margin:"16px 0"}}/>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {buttons.map((b,i)=>(
          <button key={i} onClick={b.onClick} style={{padding:"13px 16px",borderRadius:10,border:`1px solid ${b.primary?"#c8a840":"#5a4820"}`,background:b.primary?"linear-gradient(135deg,#3d2c08,#6a4c10)":"rgba(255,255,255,0.04)",color:b.primary?"#f0d060":"#c8a840",fontSize:14,fontWeight:b.primary?700:400,cursor:"pointer",fontFamily:"serif",letterSpacing:"0.03em",transition:"all 0.15s",boxShadow:b.primary?"0 0 20px rgba(200,160,40,0.2)":"none"}}>
            {b.icon&&<span style={{marginRight:8}}>{b.icon}</span>}{b.label}
          </button>
        ))}
        <button onClick={onCancel} style={{padding:"10px",borderRadius:8,border:"none",background:"none",color:"#7a6030",fontSize:13,cursor:"pointer",marginTop:4}}>취소</button>
      </div>
    </div>
  </div>);
}

// ─── DeskScene ────────────────────────────────────────────────────────────────
function DeskScene({deskTheme,coverStyle,diaryState,thrownXfm,decos,onDiaryClick,onDecoDragEnd,userXP=0,theme}){
  const dragRef=useRef(null);
  const [decoPos,setDecoPos]=useState(()=>decos.reduce((a,d)=>({...a,[d.id]:d.pos||{x:50+Math.random()*200,y:40+Math.random()*80}}),{}));

  const onDecoPtrDown=(e,id)=>{
    e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current={id,startX:e.clientX,startY:e.clientY,origPos:{...(decoPos[id]||{x:0,y:0})}};
  };
  const onDecoPtrMove=(e)=>{
    if(!dragRef.current)return;
    const{id,startX,startY,origPos}=dragRef.current;
    setDecoPos(prev=>({...prev,[id]:{x:origPos.x+(e.clientX-startX),y:origPos.y+(e.clientY-startY)}}));
  };
  const onDecoPtrUp=(e)=>{
    if(!dragRef.current)return;
    onDecoDragEnd(dragRef.current.id,decoPos[dragRef.current.id]);
    dragRef.current=null;
  };

  const thrown=diaryState==="desk-thrown";
  const angle=thrownXfm?.angle||0,tx=thrownXfm?.tx||0,ty=thrownXfm?.ty||0;
  const coverBg=()=>{
    if(coverStyle.id==="brown")return"linear-gradient(135deg,#6b3e1c,#8B5E3C,#7a4a28)";
    if(coverStyle.id==="navy")return"linear-gradient(135deg,#0f1e38,#1a2a4a,#152038)";
    if(coverStyle.id==="bordeaux")return"linear-gradient(135deg,#4a1020,#6b1e2e,#5a1828)";
    if(coverStyle.id==="forest")return"linear-gradient(135deg,#1e3818,#2d4a28,#243d20)";
    if(coverStyle.id==="gold")return"linear-gradient(135deg,#8a6010,#c8a84b,#9a7020)";
    return"linear-gradient(135deg,#d0c8b8,#e8e0d0,#d8d0c0)";
  };

  return(
    <div style={{width:"100%",position:"relative",borderRadius:16,overflow:"hidden",
        background:deskTheme.bg,
        minHeight:320,
        boxShadow:"inset 0 -60px 120px rgba(0,0,0,0.25),inset 0 4px 12px rgba(255,255,255,0.08)"}}
      onPointerMove={onDecoPtrMove} onPointerUp={onDecoPtrUp}>

      {/* Perspective lines (3D table feel) */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.06}} preserveAspectRatio="none">
        {[20,35,50,65,80].map(p=><line key={p} x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="#000" strokeWidth="1"/>)}
        {[15,35,55,75,90].map(p=><line key={p} x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="#000" strokeWidth="0.5"/>)}
      </svg>

      {/* Draggable deco items */}
      {decos.map(d=>{
        const cat=DECO_CATALOG.find(c=>c.id===d.id);if(!cat)return null;
        const pos=decoPos[d.id]||{x:30,y:30};
        return(
          <div key={d.id} style={{position:"absolute",left:pos.x,top:pos.y,fontSize:cat.baseSize,lineHeight:1,cursor:"grab",touchAction:"none",userSelect:"none",filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.35))",zIndex:10}}
            onPointerDown={e=>onDecoPtrDown(e,d.id)}>
            {cat.emoji}
          </div>
        );
      })}

      {/* Diary book on desk */}
      <div style={{position:"absolute",left:"50%",top:"50%",
          transform:`translate(-50%,-50%) rotate(${angle}deg) translate(${tx}px,${ty}px)`,
          transition:thrown?"none":"transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          cursor:"pointer",zIndex:20}}
        onClick={onDiaryClick}>

        {/* Book cover (closed diary) */}
        <div style={{width:160,height:210,borderRadius:4,
            background:coverBg(),
            border:coverStyle.id!=="none"?coverStyle.border:"none",
            boxShadow:thrown?coverStyle.shadow.replace("0 12","0 4").replace("0 10","0 3"):coverStyle.shadow,
            position:"relative",overflow:"visible"}}>

          {/* Spine */}
          <div style={{position:"absolute",left:0,top:0,width:12,height:"100%",background:"rgba(0,0,0,0.25)",borderRadius:"4px 0 0 4px"}}/>

          {/* Cover lines */}
          <div style={{position:"absolute",left:16,right:8,top:20,bottom:20,border:"1px solid rgba(255,255,255,0.12)",borderRadius:2,pointerEvents:"none"}}/>
          <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",textAlign:"center",color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:"0.1em",fontFamily:"serif"}}>
            <div style={{fontSize:20,marginBottom:4}}>📔</div>
            <div>DIARY</div>
          </div>

          {/* Thrown hint */}
          {thrown&&<div style={{position:"absolute",bottom:-24,left:"50%",transform:"translateX(-50%)",fontSize:10,color:"rgba(255,255,255,0.5)",whiteSpace:"nowrap",fontFamily:"serif"}}>탭하여 옵션 보기</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Single Page View ─────────────────────────────────────────────────────────
// PagePane: renders one diary page with drawing + text + blocks
function PagePane({page,pageKey,canEdit,theme,bgType,
    brushId,penColor,penSize,drawMode,
    onStroke,onErase,
    slashMenuCb,mathDialogCb,archivePickerCb,
    blocks,updBlock,selectedId,setSelectedId,editingId,setEditingId,
    showMsg,isFirstPage,pageIdx}){
  const isEmpty=!(page?.paths?.length>0||page?.blocks?.length>0||(page?.pageText||"").trim());

  const ref=useRef(null);
  const [curPts,setCurPts]=useState([]);
  const [eraserPos,setEraserPos]=useState(null);
  const pinchRef=useRef(null);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const activePointers=useRef(new Map());
  const penEraserRef=useRef(false);
  const lpRef=useRef(null);
  const lpStart=useRef(null);
  const swipeStart=useRef(null);
  const isEraser=brushId==="ERASER"||penEraserRef.current;

  // Reset on page change
  useEffect(()=>{setCurPts([]);setEraserPos(null);setZoom(1);setPan({x:0,y:0});},[pageKey]);

  // Scale: DOM width / PAGE_W * zoom
  const s2c=useCallback((sx,sy)=>{
    const r=ref.current?.getBoundingClientRect();if(!r)return{x:0,y:0};
    const domScale=r.width/PAGE_W;
    return{x:(sx-r.left-pan.x)/(domScale*zoom),y:(sy-r.top-pan.y)/(domScale*zoom)};
  },[zoom,pan]);

  const clampPan=useCallback((px,py,z)=>{
    const r=ref.current?.getBoundingClientRect();if(!r)return{x:px,y:py};
    const domScale=r.width/PAGE_W;const dh=r.height;
    const contentW=PAGE_W*domScale*z,contentH=PAGE_H*domScale*z;
    return{x:Math.min(0,Math.max(px,-(contentW-r.width))),y:Math.min(0,Math.max(py,-(contentH-dh)))};
  },[]);

  const onDown=useCallback(e=>{
    e.preventDefault();e.stopPropagation();
    const{pointerId,pointerType,clientX,clientY,buttons}=e;
    if(pointerType==="pen"&&(buttons&32)){
      penEraserRef.current=true;
      const pos=s2c(clientX,clientY);setCurPts([{x:pos.x,y:pos.y,p:1}]);setEraserPos(pos);return;
    }
    penEraserRef.current=false;
    activePointers.current.set(pointerId,{x:clientX,y:clientY});
    if(activePointers.current.size>=2){
      const pts=[...activePointers.current.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const r=ref.current?.getBoundingClientRect();
      const mx=((pts[0].x+pts[1].x)/2)-(r?.left||0),my=((pts[0].y+pts[1].y)/2)-(r?.top||0);
      pinchRef.current={d0:d,z0:zoom,tx0:pan.x,ty0:pan.y,mx0:mx,my0:my};
      setCurPts([]);return;
    }
    if(drawMode){
      const pos=s2c(clientX,clientY);const p=pointerType==="pen"?(e.pressure||0.5):0.5;
      lpStart.current={sx:clientX,sy:clientY,cx:pos.x,cy:pos.y};
      lpRef.current=setTimeout(()=>{if(lpStart.current){archivePickerCb?.();setCurPts([]);lpStart.current=null;}},650);
      setCurPts([{x:pos.x,y:pos.y,p}]);
    } else {
      swipeStart.current={x:clientX,y:clientY,time:Date.now()};
    }
  },[drawMode,zoom,pan,s2c,archivePickerCb]);

  const onMove=useCallback(e=>{
    e.stopPropagation();
    const{pointerId,pointerType,clientX,clientY,buttons}=e;
    if(activePointers.current.has(pointerId))activePointers.current.set(pointerId,{x:clientX,y:clientY});

    if(pointerType==="pen"&&(buttons&32)){
      e.preventDefault();const pos=s2c(clientX,clientY);setEraserPos(pos);
      onErase?.(pos.x,pos.y);return;
    }
    if(activePointers.current.size>=2&&pinchRef.current){
      e.preventDefault();
      const pts=[...activePointers.current.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const r=ref.current?.getBoundingClientRect();
      const mx=((pts[0].x+pts[1].x)/2)-(r?.left||0),my=((pts[0].y+pts[1].y)/2)-(r?.top||0);
      const{d0,z0,tx0,ty0,mx0,my0}=pinchRef.current;
      const newZ=Math.max(0.3,Math.min(MAX_ZOOM,z0*(d/d0)));
      const domScale=(r?.width||PAGE_W)/PAGE_W;
      const cx=(mx0-tx0)/(domScale*z0),cy=(my0-ty0)/(domScale*z0);
      const np=clampPan(mx-cx*domScale*newZ+(mx-mx0),my-cy*domScale*newZ+(my-my0),newZ);
      setZoom(newZ);setPan(np);return;
    }
    if(lpStart.current&&Math.hypot(clientX-lpStart.current.sx,clientY-lpStart.current.sy)>8){clearTimeout(lpRef.current);lpStart.current=null;}
    if(drawMode&&isEraser&&curPts.length>0){e.preventDefault();const pos=s2c(clientX,clientY);setEraserPos(pos);onErase?.(pos.x,pos.y);return;}
    if(drawMode&&curPts.length>0){e.preventDefault();const pos=s2c(clientX,clientY);const p=pointerType==="pen"?(e.pressure||0.5):0.5;setCurPts(prev=>[...prev,{x:pos.x,y:pos.y,p}]);}
  },[drawMode,isEraser,curPts,zoom,pan,s2c,clampPan,onErase]);

  const onUp=useCallback(e=>{
    activePointers.current.delete(e.pointerId);pinchRef.current=null;clearTimeout(lpRef.current);lpStart.current=null;
    if(e.pointerType==="pen"&&penEraserRef.current){penEraserRef.current=false;setEraserPos(null);setCurPts([]);return;}
    if(brushId==="ERASER"){setEraserPos(null);setCurPts([]);return;}
    if(drawMode&&curPts.length>1){onStroke?.({pts:curPts,tool:brushId,color:penColor,size:penSize});}
    setCurPts([]);swipeStart.current=null;
  },[drawMode,brushId,curPts,penColor,penSize,onStroke]);

  const textRef=useRef(null);
  const handleText=val=>{
    updBlock?.("__text__",{pageText:val});
    const m=val.match(/\/([a-z]*)$/);if(m)slashMenuCb?.(m[1]);else slashMenuCb?.(null);
  };

  // Render blocks
  const renderBlock=block=>{
    const isSel=selectedId===block.id,isEd=editingId===block.id;
    const base={position:"absolute",left:block.x,top:block.y,width:block.w||280,zIndex:isSel?20:10};
    const ring={outline:isSel?`2px solid ${PASTEL.coral}`:"none",borderRadius:8};
    const onT=id=>setSelectedId(id);const onD=id=>{if(canEdit)setEditingId(id);};
    if(block.type==="math")return(
      <div key={block.id} style={{...base,...ring,background:theme.card+"ee",border:`1px solid ${theme.border}`,padding:"8px 12px",cursor:"pointer",overflowX:"auto"}}
        onPointerDown={e=>{e.stopPropagation();onT(block.id);}}
        onDoubleClick={e=>{e.stopPropagation();if(canEdit)mathDialogCb?.(block.id,block.tex);}}>
        <MathRender tex={block.tex||"\\square"}/>{canEdit&&<div style={{fontSize:9,color:theme.textSec,marginTop:2}}>더블탭→편집</div>}
      </div>);
    if(block.type==="todo")return(
      <div key={block.id} style={{...base,...ring,background:theme.card+"ee",border:`1px solid ${theme.border}`,padding:"8px 12px"}}
        onPointerDown={e=>{e.stopPropagation();onT(block.id);}} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
        {block.items.map((item,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <input type="checkbox" checked={item.done} style={{accentColor:PASTEL.mint}} onChange={e=>{const its=[...block.items];its[i]={...its[i],done:e.target.checked};updBlock(block.id,{items:its});}}/>
          {isEd?<input value={item.text} autoFocus={i===block.items.length-1} style={{flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,outline:"none"}} onChange={e=>{const its=[...block.items];its[i]={...its[i],text:e.target.value};updBlock(block.id,{items:its});}} onKeyDown={e=>{if(e.key==="Enter")updBlock(block.id,{items:[...block.items,{done:false,text:""}]});}}/>
          :<span style={{fontSize:13,color:theme.text,textDecoration:item.done?"line-through":"none",opacity:item.done?0.45:1}}>{item.text||"항목"}</span>}
        </div>))}
        {isEd&&<button onPointerDown={e=>{e.stopPropagation();updBlock(block.id,{items:[...block.items,{done:false,text:""}]});}} style={{fontSize:11,color:theme.textSec,background:"none",border:"none",cursor:"pointer"}}>+ 추가</button>}
      </div>);
    if(block.type==="callout")return(
      <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.yellow}`:undefined,borderRadius:10,background:block.color||"#fff9e0",border:`1px solid ${block.color||"#ffe58f"}`,padding:"10px 14px"}}
        onPointerDown={e=>{e.stopPropagation();onT(block.id);}} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
        <div style={{display:"flex",gap:8}}><span style={{fontSize:18}}>{block.emoji||"💡"}</span>
          {isEd?<textarea autoFocus value={block.text} onChange={e=>updBlock(block.id,{text:e.target.value})} onBlur={()=>setEditingId(null)} style={{flex:1,border:"none",background:"transparent",color:"#5a4000",fontSize:13,resize:"none",outline:"none",lineHeight:1.6}}/>
          :<span style={{fontSize:13,color:"#5a4000",whiteSpace:"pre-wrap",lineHeight:1.6}}>{block.text||"강조"}</span>}
        </div>
      </div>);
    if(block.type==="toggle")return(
      <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.lavender}`:undefined,border:`1px solid ${theme.border}`,background:theme.card+"ee",borderRadius:10,overflow:"hidden"}}
        onPointerDown={e=>{e.stopPropagation();onT(block.id);}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",cursor:"pointer"}} onClick={()=>updBlock(block.id,{open:!block.open})} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
          <span style={{fontSize:10,transition:"transform 0.2s",transform:block.open?"rotate(90deg)":"",display:"inline-block"}}>▶</span>
          {isEd?<input value={block.title} onChange={e=>updBlock(block.id,{title:e.target.value})} style={{flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,fontWeight:600,outline:"none"}}/>
          :<span style={{fontSize:13,fontWeight:600,color:theme.text}}>{block.title||"접기"}</span>}
        </div>
        {block.open&&<div style={{padding:"8px 12px"}} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
          {isEd?<textarea autoFocus value={block.content} onChange={e=>updBlock(block.id,{content:e.target.value})} onBlur={()=>setEditingId(null)} style={{width:"100%",border:"none",background:"transparent",color:theme.text,fontSize:12,resize:"none",outline:"none",lineHeight:1.6}}/>
          :<span style={{fontSize:12,color:theme.textSec,whiteSpace:"pre-wrap",lineHeight:1.6}}>{block.content||"내용"}</span>}
        </div>}
      </div>);
    if(block.type==="divider")return<div key={block.id} style={{...base,height:1,background:theme.border,pointerEvents:"none"}}/>;
    if(block.type==="image")return(
      <div key={block.id} style={{...base,...ring}} onPointerDown={e=>{e.stopPropagation();onT(block.id);}}>
        <img src={block.dataUrl} alt="" style={{width:"100%",borderRadius:8,display:"block"}}/>
      </div>);
    return null;
  };

  const domScale=zoom; // relative to CSS width:100%
  const contentTransform=`matrix(${zoom},0,0,${zoom},${pan.x},${pan.y})`;

  return(
    <div ref={ref} style={{width:"100%",height:"100%",overflow:"hidden",position:"relative",
        touchAction:"none",cursor:drawMode?(brushId==="ERASER"?"cell":"crosshair"):"text",
        background:theme.card}}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div style={{position:"absolute",width:PAGE_W,height:PAGE_H,transformOrigin:"0 0",transform:contentTransform}}>
        <PageBackground bgType={bgType} theme={theme}/>
        {/* First page cover (registration date) */}
        {isFirstPage&&<FirstPageCover theme={theme}/>}
        {/* Ghost quote on empty pages */}
        {!isFirstPage&&isEmpty&&<GhostQuote pageIdx={pageIdx||0} totalPages={1}/>}
        <DrawCanvas paths={page?.paths||[]} curPts={curPts} brushId={brushId} penColor={penColor} penSize={penSize} eraserPos={eraserPos}/>
        <textarea ref={textRef} value={page?.pageText||""} onChange={e=>handleText(e.target.value)} readOnly={!canEdit}
          placeholder={canEdit&&!drawMode?"/ 명령어로 블록 추가":""}
          style={{position:"absolute",top:0,left:0,width:PAGE_W,height:PAGE_H,border:"none",background:"transparent",color:theme.text,fontSize:14,lineHeight:`${LINE_H}px`,padding:`${LINE_H*0.15}px 20px`,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"'Noto Serif KR',serif",zIndex:2,pointerEvents:drawMode?"none":"auto",caretColor:theme.text}}/>
        <div style={{position:"absolute",top:0,left:0,width:PAGE_W,height:PAGE_H,zIndex:3,pointerEvents:drawMode?"none":"auto"}}>
          {(blocks||[]).map(renderBlock)}
        </div>
      </div>
      {/* Close zone hint (bottom-right) for gesture */}
      {zoom<=0.6&&<div style={{position:"absolute",bottom:8,right:8,fontSize:10,color:"rgba(150,120,80,0.6)",fontFamily:"serif",pointerEvents:"none"}}>↖ 빠르게 넘기면 닫힘</div>}
    </div>
  );
}

// ─── BookView (two-page spread) ───────────────────────────────────────────────
function BookView({diary,setDiary,viewDate,canEdit,theme,
    brushId,setBrushId,penColor,setPenColor,penSize,setPenSize,
    drawMode,setDrawMode,bgType,setBgType,
    coverStyle,onClose,showMsg,playSfx,archive,setTab}){

  const today=new Date().toISOString().slice(0,10);
  injectBookAnims();

  // Book open/close animation state
  const [bookAnim,setBookAnim]=useState("opening"); // opening | open | closing
  useEffect(()=>{
    setBookAnim("opening");
    const t=setTimeout(()=>setBookAnim("open"),900);
    return()=>clearTimeout(t);
  },[]);

  // Page flip animation: { dir, phase }
  const [flipAnim,setFlipAnim]=useState(null);

  // Zoom: used to flatten perspective when zoomed in
  const [globalZoom,setGlobalZoom]=useState(1);

  // Load pages for viewDate, with auto-delete of empty pages
  const cleanPages=useCallback(pgs=>{
    if(!pgs||pgs.length<=2)return pgs||[{id:"pg1",paths:[],blocks:[],pageText:""}];
    const now=Date.now(),minAge=5*60*1000;
    return pgs.filter(pg=>{
      const hasContent=(pg.paths?.length>0)||(pg.blocks?.length>0)||(pg.pageText?.trim());
      const isOld=pg.createdAt&&(now-pg.createdAt>minAge);
      return hasContent||!isOld;
    });
  },[]);

  const [pages,setPages]=useState(()=>{
    const e=diary.find(d=>d.date===viewDate);
    const raw=e?.pages||e?.paths?[{id:"pg1",paths:e.paths||[],blocks:e.blocks||[],pageText:e.pageText||""}]:[{id:"pg1",paths:[],blocks:[],pageText:""}];
    return cleanPages(raw);
  });
  const [spreadIdx,setSpreadIdx]=useState(0);
  const [mood,setMood]=useState(()=>diary.find(d=>d.date===viewDate)?.mood||null);
  const [selectedId,setSelectedId]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [showBrushPanel,setShowBrushPanel]=useState(false);
  const [showMeta,setShowMeta]=useState(false);
  const [slashMenu,setSlashMenu]=useState(null);
  const [mathDialog,setMathDialog]=useState(null);
  const [archivePicker,setArchivePicker]=useState(null);
  const [activePageSide,setActivePageSide]=useState("left");

  const undoStack=useRef([]);
  const redoStack=useRef([]);
  const closeGestureRef=useRef(null);
  const bookRef=useRef(null);

  const maxSpread=Math.ceil(pages.length/2)-1;
  const leftIdx=spreadIdx*2;
  const rightIdx=spreadIdx*2+1;
  const leftPage=pages[leftIdx];
  const rightPage=pages[rightIdx];

  const updPage=useCallback((idx,patch)=>setPages(prev=>prev.map((p,i)=>i===idx?{...p,...patch}:p)),[]);
  const updBlock=useCallback((pageIdx,id,patch)=>
    updPage(pageIdx,{blocks:pages[pageIdx]?.blocks?.map(b=>b.id===id?{...b,...patch}:b)||[]})
  ,[pages,updPage]);

  const snap=useCallback(()=>{
    undoStack.current.push(JSON.parse(JSON.stringify(pages)));
    if(undoStack.current.length>40)undoStack.current.shift();redoStack.current=[];
  },[pages]);
  const undo=()=>{if(!undoStack.current.length)return;redoStack.current.push(JSON.parse(JSON.stringify(pages)));setPages(undoStack.current.pop());};
  const redo=()=>{if(!redoStack.current.length)return;undoStack.current.push(JSON.parse(JSON.stringify(pages)));setPages(redoStack.current.pop());};

  const save=()=>{
    setDiary(prev=>{
      const entry={id:`diary-${viewDate}`,date:viewDate,pages,mood,bgType,updatedAt:Date.now()};
      const ex=prev.find(d=>d.date===viewDate);
      if(ex)return prev.map(d=>d.date===viewDate?{...d,...entry}:d);
      return[...prev,{...entry,createdAt:Date.now()}];
    });
    playSfx("success");showMsg("저장했어요! 📓",1500);
  };

  const addPage=()=>{
    snap();
    setPages(prev=>[...prev,{id:`pg${Date.now()}`,paths:[],blocks:[],pageText:"",createdAt:Date.now()}]);
    setTimeout(()=>setSpreadIdx(Math.floor(pages.length/2)),30);
    playSfx("click");showMsg(`쪽 추가!`,1000);
  };

  const goSpread=dir=>{
    const next=spreadIdx+(dir==="next"?1:-1);
    if(next<0||next>maxSpread)return;
    setFlipAnim({dir,phase:"out"});
    setTimeout(()=>{
      setSpreadIdx(next);setSelectedId(null);setEditingId(null);
      setFlipAnim({dir,phase:"in"});
    },320);
    setTimeout(()=>setFlipAnim(null),640);
  };

  // Swipe gesture for page turn (within book spread)
  const swipeRef=useRef(null);
  const onSpreadPtrDown=useCallback(e=>{
    // Only single-finger, non-drawing
    if(drawMode) return;
    swipeRef.current={x:e.clientX,y:e.clientY,time:Date.now()};
  },[drawMode]);
  const onSpreadPtrUp=useCallback(e=>{
    if(!swipeRef.current) return;
    const dx=e.clientX-swipeRef.current.x;
    const dy=e.clientY-swipeRef.current.y;
    const dt=Date.now()-swipeRef.current.time;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.2&&dt<500){
      goSpread(dx<0?"next":"prev");
    }
    swipeRef.current=null;
  },[goSpread]);

  // Close gesture detection on book element (zoom-out + swipe BR→TL)
  const onBookPtrDown=useCallback(e=>{
    if(e.pointerType==="touch"||e.pointerType==="mouse"){
      const r=bookRef.current?.getBoundingClientRect();if(!r)return;
      closeGestureRef.current={sx:e.clientX,sy:e.clientY,time:Date.now(),rw:r.width,rh:r.height,rl:r.left,rt:r.top};
    }
  },[]);
  const onBookPtrUp=useCallback(e=>{
    const g=closeGestureRef.current;if(!g)return;
    const dx=e.clientX-g.sx,dy=e.clientY-g.sy,dt=Date.now()-g.time;
    const startInBR=(g.sx-g.rl)>g.rw*0.55&&(g.sy-g.rt)>g.rh*0.55;
    const goingUL=dx<-80&&dy<-50;
    const fast=dt<400;
    if(startInBR&&goingUL&&fast){
      setBookAnim("closing");
      playSfx("click");
      setTimeout(()=>onClose(),380);
    }
    closeGestureRef.current=null;
  },[onClose,playSfx]);

  const execSlash=(cmd,pageIdx)=>{
    setSlashMenu(null);
    updPage(pageIdx,{pageText:(pages[pageIdx]?.pageText||"").replace(/\/[a-z]*$/,"")});
    const bx=40,by=Math.max(60,(pages[pageIdx]?.blocks?.length||0)*70+40);snap();
    if(cmd==="archive")setArchivePicker({pageIdx});
    else if(cmd==="math")setMathDialog({pageIdx,cx:bx,cy:by});
    else if(cmd==="todo"){const id=`b${Date.now()}`;updPage(pageIdx,{blocks:[...(pages[pageIdx]?.blocks||[]),{id,type:"todo",x:bx,y:by,w:280,items:[{done:false,text:""}]}]});setEditingId(id);}
    else if(cmd==="callout"){const id=`b${Date.now()}`;updPage(pageIdx,{blocks:[...(pages[pageIdx]?.blocks||[]),{id,type:"callout",x:bx,y:by,w:280,color:"#fff9e0",emoji:"💡",text:""}]});setEditingId(id);}
    else if(cmd==="toggle"){const id=`b${Date.now()}`;updPage(pageIdx,{blocks:[...(pages[pageIdx]?.blocks||[]),{id,type:"toggle",x:bx,y:by,w:280,title:"",content:"",open:true}]});setEditingId(id);}
    else if(cmd==="divider"){const id=`b${Date.now()}`;updPage(pageIdx,{blocks:[...(pages[pageIdx]?.blocks||[]),{id,type:"divider",x:bx,y:by,w:260}]});}
    else if(cmd==="date"){const ds=new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});updPage(pageIdx,{pageText:(pages[pageIdx]?.pageText||"")+ds});}
    else if(cmd==="image")document.getElementById("d-img-inp")?.click();
  };

  const filteredCmds=slashMenu?[{cmd:"archive",icon:"📂",label:"아카이브"},{cmd:"math",icon:"∑",label:"수식"},{cmd:"todo",icon:"☐",label:"체크"},{cmd:"callout",icon:"💡",label:"강조"},{cmd:"toggle",icon:"▶",label:"접기"},{cmd:"divider",icon:"─",label:"구분선"},{cmd:"date",icon:"📅",label:"날짜"},{cmd:"image",icon:"🖼",label:"이미지"}].filter(c=>c.cmd.startsWith(slashMenu.query)):[];
  const brushDef=BRUSHES.find(b=>b.id===brushId)||BRUSHES[0];

  // Page heights for the spread container
  const SPREAD_H=Math.max(340,window.innerHeight-260);
  const coverBorder=coverStyle?.border||"none";
  const coverShadow=coverStyle?.shadow||"0 8px 32px rgba(0,0,0,0.2)";

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>

      {/* Header bar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",flexShrink:0}}>
        <button onClick={save} style={{padding:"6px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#c8a840,#8a6820)",color:"#fff8e0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"serif",letterSpacing:"0.03em"}}>저장 📖</button>
        <div style={{flex:1,textAlign:"center",fontSize:12,color:theme.text,fontFamily:"serif"}}>
          {new Date(viewDate+"T00:00:00").toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
          {" — "}{spreadIdx*2+1}-{Math.min(spreadIdx*2+2,pages.length)}쪽 / {pages.length}쪽
        </div>
        <button onClick={()=>setShowMeta(!showMeta)} style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>⚙️</button>
      </div>

      {/* Meta panel (mood + bg) */}
      {showMeta&&<div style={{padding:"6px 12px",display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",flexShrink:0,borderBottom:`1px solid ${theme.border}`}}>
        {MOODS.map(m=><button key={m} onClick={()=>setMood(m===mood?null:m)} style={{background:m===mood?`${PASTEL.peach}60`:"none",border:"none",fontSize:12,cursor:"pointer",borderRadius:5,padding:"1px 3px",opacity:(!mood||m===mood)?1:0.35}}>{m}</button>)}
        <div style={{marginLeft:"auto",display:"flex",gap:3}}>
          {[BG.RULED,BG.GRID,BG.DOT,BG.PLAIN].map((b,i)=><button key={b} onClick={()=>setBgType(b)} style={{fontSize:10,padding:"3px 5px",borderRadius:6,border:`1px solid ${bgType===b?theme.text:theme.border}`,background:bgType===b?theme.border:"none",color:theme.text,cursor:"pointer"}}>{["줄","격자","점","빈"][i]}</button>)}
        </div>
      </div>}

      {/* Spread container — perspective flattens as zoom increases */}
      <div ref={bookRef} style={{
          flex:1,display:"flex",padding:"0 8px",gap:0,minHeight:0,
          position:"relative",touchAction:"none",
          perspective: globalZoom>1.5 ? "none" : `${Math.round(1200-globalZoom*300)}px`,
          perspectiveOrigin:"50% 40%",
          animation: bookAnim==="opening"
            ? "bookOpen 0.85s cubic-bezier(0.22,1,0.36,1) forwards"
            : bookAnim==="closing"
            ? "bookClose 0.4s ease forwards"
            : "none",
        }}
        onPointerDown={e=>{onBookPtrDown(e);onSpreadPtrDown(e);}}
        onPointerUp={e=>{onBookPtrUp(e);onSpreadPtrUp(e);}}>

        {/* Left page */}
        <div style={{flex:1,minWidth:0,height:SPREAD_H,position:"relative",
            border:coverBorder,boxShadow:coverShadow,
            borderRadius:"6px 0 0 6px",overflow:"hidden",
            transformStyle:"preserve-3d",transformOrigin:"right center",
            animation: flipAnim?.dir==="prev"&&flipAnim?.phase==="out" ? "pageFlipRight 0.32s ease forwards"
                     : flipAnim?.dir==="next"&&flipAnim?.phase==="in"  ? "pageFlipLeft  0.32s ease forwards"
                     : "none",
          }}>
          <PagePane page={leftPage} pageKey={`L${spreadIdx}`} canEdit={canEdit&&viewDate===today}
            isFirstPage={leftIdx===0} pageIdx={leftIdx}
            theme={theme} bgType={bgType} brushId={brushId} penColor={penColor} penSize={penSize} drawMode={drawMode}
            onStroke={s=>{snap();updPage(leftIdx,{paths:[...(leftPage?.paths||[]),{id:`p${Date.now()}`,...s}]});}}
            onErase={(x,y)=>updPage(leftIdx,{paths:(leftPage?.paths||[]).filter(p=>!p.pts?.some(pt=>Math.hypot(pt.x-x,pt.y-y)<ERASER_R))})}
            slashMenuCb={(q)=>q!==null?setSlashMenu({query:q,pageIdx:leftIdx}):setSlashMenu(null)}
            mathDialogCb={(bid,tex)=>setMathDialog({blockId:bid,initial:tex,pageIdx:leftIdx})}
            archivePickerCb={()=>setArchivePicker({pageIdx:leftIdx})}
            blocks={leftPage?.blocks||[]}
            updBlock={(id,patch)=>updBlock(leftIdx,id,patch)}
            selectedId={selectedId} setSelectedId={setSelectedId}
            editingId={editingId} setEditingId={setEditingId}
            showMsg={showMsg}/>
          <div style={{position:"absolute",top:4,left:4,fontSize:10,color:"rgba(150,120,80,0.45)",fontFamily:"serif",pointerEvents:"none"}}>{leftIdx+1}</div>
        </div>

        {/* Spine */}
        <div style={{width:10,flexShrink:0,height:SPREAD_H,background:"linear-gradient(90deg,rgba(0,0,0,0.18),rgba(0,0,0,0.06),rgba(0,0,0,0.18))",zIndex:5}}/>

        {/* Right page */}
        <div style={{flex:1,minWidth:0,height:SPREAD_H,position:"relative",
            border:coverBorder,boxShadow:coverShadow,
            borderRadius:"0 6px 6px 0",overflow:"hidden",
            transformStyle:"preserve-3d",transformOrigin:"left center",
            animation: flipAnim?.dir==="next"&&flipAnim?.phase==="out" ? "pageFlipLeft  0.32s ease forwards"
                     : flipAnim?.dir==="prev"&&flipAnim?.phase==="in"  ? "pageFlipRight 0.32s ease forwards"
                     : "none",
          }}>
          {rightPage?(
            <PagePane page={rightPage} pageKey={`R${spreadIdx}`} canEdit={canEdit&&viewDate===today}
              isFirstPage={false} pageIdx={rightIdx}
              theme={theme} bgType={bgType} brushId={brushId} penColor={penColor} penSize={penSize} drawMode={drawMode}
              onStroke={s=>{snap();updPage(rightIdx,{paths:[...(rightPage?.paths||[]),{id:`p${Date.now()}`,...s}]});}}
              onErase={(x,y)=>updPage(rightIdx,{paths:(rightPage?.paths||[]).filter(p=>!p.pts?.some(pt=>Math.hypot(pt.x-x,pt.y-y)<ERASER_R))})}
              slashMenuCb={(q)=>q!==null?setSlashMenu({query:q,pageIdx:rightIdx}):setSlashMenu(null)}
              mathDialogCb={(bid,tex)=>setMathDialog({blockId:bid,initial:tex,pageIdx:rightIdx})}
              archivePickerCb={()=>setArchivePicker({pageIdx:rightIdx})}
              blocks={rightPage?.blocks||[]}
              updBlock={(id,patch)=>updBlock(rightIdx,id,patch)}
              selectedId={selectedId} setSelectedId={setSelectedId}
              editingId={editingId} setEditingId={setEditingId}
              showMsg={showMsg}/>
          ):(
            <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:theme.card,color:theme.textSec}}>
              <div style={{fontSize:32,opacity:0.3}}>📄</div>
              {canEdit&&viewDate===today&&<button onClick={addPage} style={{padding:"10px 24px",borderRadius:12,border:`1px solid ${theme.border}`,background:"none",color:theme.text,fontSize:13,cursor:"pointer",fontFamily:"serif"}}>+ 쪽 추가</button>}
            </div>
          )}
          {rightPage&&<div style={{position:"absolute",top:4,right:4,fontSize:10,color:"rgba(150,120,80,0.45)",fontFamily:"serif",pointerEvents:"none"}}>{rightIdx+1}</div>}
        </div>
      </div>

      {/* Bottom toolbar */}
      {canEdit&&viewDate===today&&<div style={{padding:"6px 12px",flexShrink:0,borderTop:`1px solid ${theme.border}`}}>
        {/* Mode + brush row */}
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
          <button onClick={()=>{setDrawMode(true);setSelectedId(null);}} style={{padding:"6px 10px",borderRadius:10,border:drawMode?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:drawMode?`${PASTEL.coral}18`:theme.card,color:drawMode?PASTEL.coral:theme.text,fontSize:11,cursor:"pointer",fontWeight:drawMode?700:400}}>✏️ 그리기</button>
          <button onClick={()=>setDrawMode(false)} style={{padding:"6px 10px",borderRadius:10,border:!drawMode?`2px solid ${PASTEL.sky}`:`1px solid ${theme.border}`,background:!drawMode?`${PASTEL.sky}18`:theme.card,color:!drawMode?PASTEL.sky:theme.text,fontSize:11,cursor:"pointer",fontWeight:!drawMode?700:400}}>T 텍스트</button>
          {drawMode&&<button onClick={()=>setShowBrushPanel(!showBrushPanel)} style={{padding:"5px 9px",borderRadius:9,border:`1px solid ${theme.border}`,background:showBrushPanel?theme.border:theme.card,color:theme.text,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
            <span>{brushDef.icon}</span><span>{brushDef.name}</span><span style={{fontSize:9}}>▼</span>
          </button>}
          {drawMode&&<div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {PEN_COLORS.map(c=><button key={c} onClick={()=>setPenColor(c)} style={{width:18,height:18,borderRadius:9,background:c,border:penColor===c?"3px solid rgba(0,0,0,0.35)":"1px solid #ccc",boxShadow:penColor===c?`0 0 0 2px ${c}`:"none",cursor:"pointer",outline:c==="#ffffff"?`1px solid ${theme.border}`:"none"}}/>)}
          </div>}
          {drawMode&&<div style={{display:"flex",gap:2}}>
            {[1,3,6,10].map(s=><button key={s} onClick={()=>setPenSize(s)} style={{width:24,height:24,borderRadius:5,border:penSize===s?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:theme.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:Math.min(s*1.5+1,16),height:Math.min(s*1.5+1,16),borderRadius:"50%",background:penColor,border:penColor==="#ffffff"?`1px solid ${theme.border}`:"none"}}/>
            </button>)}
          </div>}
          <div style={{marginLeft:"auto",display:"flex",gap:3}}>
            <button onClick={undo} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>↩</button>
            <button onClick={redo} style={{padding:"5px 8px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>↪</button>
            {canEdit&&viewDate===today&&<button onClick={addPage} style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>+ 쪽</button>}
          </div>
        </div>

        {/* Brush panel */}
        {drawMode&&showBrushPanel&&<div style={{background:theme.bg,border:`1px solid ${theme.border}`,borderRadius:10,padding:"8px 10px",marginBottom:4}}>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {BRUSHES.map(b=><button key={b.id} onClick={()=>{setBrushId(b.id);if(b.id!=="ERASER")setPenSize(b.defSize);setShowBrushPanel(false);}} style={{padding:"6px 9px",borderRadius:9,border:brushId===b.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:brushId===b.id?`${PASTEL.coral}15`:theme.card,color:brushId===b.id?PASTEL.coral:theme.text,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontWeight:brushId===b.id?700:400}}>
              <span>{b.icon}</span><span>{b.name}</span>
            </button>)}
          </div>
        </div>}

        {/* Page nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <button onClick={()=>goSpread("prev")} disabled={spreadIdx===0} style={{fontSize:20,background:"none",border:"none",cursor:spreadIdx>0?"pointer":"default",color:spreadIdx>0?theme.text:theme.border,padding:"2px 8px"}}>‹</button>
          <span style={{fontSize:11,color:theme.textSec,fontFamily:"serif"}}>{spreadIdx+1} / {Math.ceil(pages.length/2)} 펼침</span>
          <button onClick={()=>goSpread("next")} disabled={spreadIdx>=maxSpread} style={{fontSize:20,background:"none",border:"none",cursor:spreadIdx<maxSpread?"pointer":"default",color:spreadIdx<maxSpread?theme.text:theme.border,padding:"2px 8px"}}>›</button>
        </div>
      </div>}

      {/* Slash menu */}
      {slashMenu&&filteredCmds.length>0&&<div style={{position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:140,zIndex:700,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",overflow:"hidden",minWidth:200}}>
        {filteredCmds.map(c=><button key={c.cmd} onPointerDown={e=>{e.preventDefault();execSlash(c.cmd,slashMenu.pageIdx);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer",textAlign:"left"}}><span style={{width:20,textAlign:"center"}}>{c.icon}</span>{c.label}</button>)}
      </div>}

      {/* Math dialog */}
      {mathDialog&&<MathDialog theme={theme} initial={mathDialog.initial||""}
        onConfirm={tex=>{snap();const pi=mathDialog.pageIdx;if(mathDialog.blockId)updBlock(pi,mathDialog.blockId,{tex});else{const id=`b${Date.now()}`;updPage(pi,{blocks:[...(pages[pi]?.blocks||[]),{id,type:"math",x:mathDialog.cx||40,y:mathDialog.cy||60,w:280,tex}]});}setMathDialog(null);}}
        onCancel={()=>setMathDialog(null)}/>}

      {/* Archive picker */}
      {archivePicker&&<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end"}} onClick={e=>e.target===e.currentTarget&&setArchivePicker(null)}>
        <div style={{width:"100%",background:theme.card,borderRadius:"20px 20px 0 0",padding:"18px 14px",maxHeight:"68vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontWeight:700,fontSize:14,color:theme.text}}>📂 아카이브 불러오기</span>
            <button onClick={()=>setArchivePicker(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.textSec}}>✕</button>
          </div>
          {(archive||[]).length===0?<p style={{color:theme.textSec,textAlign:"center",padding:16}}>저장된 아카이브가 없어요</p>
          :(archive||[]).slice(0,30).map(item=>(
            <div key={item.id} style={{border:`1px solid ${theme.border}`,borderRadius:9,padding:"9px 12px",marginBottom:7,background:theme.bg}}>
              <div style={{fontSize:13,fontWeight:600,color:theme.text,marginBottom:3}}>{item.title||"제목 없음"}</div>
              <div style={{fontSize:11,color:theme.textSec,marginBottom:6}}>{item.preview?.slice(0,60)}</div>
              <button onClick={()=>{const pi=archivePicker.pageIdx,id=`b${Date.now()}`;snap();updPage(pi,{blocks:[...(pages[pi]?.blocks||[]),{id,type:"callout",x:40,y:40,w:280,color:"#f0f8ff",emoji:"📂",text:item.title||""}]});setArchivePicker(null);playSfx("click");}} style={{padding:"6px 16px",borderRadius:7,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>불러오기</button>
            </div>))}
        </div>
      </div>}

      {/* Image upload */}
      <input id="d-img-inp" type="file" accept="image/*" style={{display:"none"}}
        onChange={async e=>{
          const file=e.target.files?.[0];if(!file)return;
          if(file.size>3e6){showMsg("이미지가 너무 커요",2000);return;}
          const url=URL.createObjectURL(file),img=new Image();img.src=url;
          img.onload=()=>{const MAX=900,sc=Math.min(MAX/img.width,MAX/img.height,1),c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
            const dataUrl=c.toDataURL("image/jpeg",0.72);snap();const pi=archivePicker?.pageIdx??leftIdx,id=`b${Date.now()}`;updPage(pi,{blocks:[...(pages[pi]?.blocks||[]),{id,type:"image",x:30,y:30,w:260,dataUrl}]});};
          e.target.value="";}}/>
    </div>
  );
}

// ─── StylePanel ───────────────────────────────────────────────────────────────
function StylePanel({theme,deskId,setDeskId,coverId,setCoverId,activeDecos,setActiveDecos,decoPositions,setDecoPositions,userXP=0,onClose}){
  return(<div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{width:"100%",background:theme.card,borderRadius:"20px 20px 0 0",padding:"18px 14px",maxHeight:"80vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:700,fontSize:16,color:theme.text}}>🪴 꾸미기</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#c8a840",fontWeight:700}}>XP {userXP.toLocaleString()}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.textSec}}>✕</button>
        </div>
      </div>

      {/* Desk */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:theme.textSec,fontWeight:600,marginBottom:8}}>🪵 책상 배경</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {DESK_THEMES.map(d=>{const locked=d.premium&&userXP<XP_DESK;return(
            <button key={d.id} onClick={()=>!locked&&setDeskId(d.id)} style={{padding:"5px 9px",borderRadius:8,border:deskId===d.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,cursor:locked?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,background:theme.bg,opacity:locked?0.6:1}}>
              <div style={{width:18,height:18,borderRadius:3,background:d.bg,border:"1px solid rgba(0,0,0,0.1)"}}/>
              <span style={{fontSize:11,color:deskId===d.id?PASTEL.coral:theme.text}}>{d.label}</span>
              {locked&&<span style={{fontSize:9,color:"#c8a840"}}>🔒{XP_DESK}XP</span>}
            </button>);})}
        </div>
      </div>

      {/* Cover */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:theme.textSec,fontWeight:600,marginBottom:8}}>📔 다이어리 표지</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {COVER_STYLES.map(c=>{const locked=c.premium&&userXP<XP_COVER;return(
            <button key={c.id} onClick={()=>!locked&&setCoverId(c.id)} style={{padding:"5px 9px",borderRadius:8,border:coverId===c.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,cursor:locked?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5,background:theme.bg,opacity:locked?0.6:1}}>
              <div style={{width:12,height:18,borderRadius:2,background:theme.card,border:c.border==="none"?"1px dashed "+theme.border:c.border}}/>
              <span style={{fontSize:11,color:coverId===c.id?PASTEL.coral:theme.text}}>{c.label}</span>
              {locked&&<span style={{fontSize:9,color:"#c8a840"}}>🔒{XP_COVER}XP</span>}
            </button>);})}
        </div>
      </div>

      {/* Decos */}
      <div>
        <div style={{fontSize:12,color:theme.textSec,fontWeight:600,marginBottom:8}}>🌸 책상 소품 <span style={{fontWeight:400}}>(탭하여 추가·제거, 드래그로 위치 이동)</span></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {DECO_CATALOG.map(d=>{const on=activeDecos.some(a=>a.id===d.id);const locked=d.premium&&userXP<XP_DECO;return(
            <button key={d.id} onClick={()=>{if(locked)return;setActiveDecos(prev=>on?prev.filter(a=>a.id!==d.id):[...prev,{id:d.id,pos:{x:40+Math.random()*120,y:30+Math.random()*60}}]);}} style={{padding:"6px 10px",borderRadius:9,border:on?`2px solid ${PASTEL.mint}`:`1px solid ${theme.border}`,background:on?`${PASTEL.mint}12`:theme.bg,cursor:locked?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:4,opacity:locked?0.55:1}}>
              <span style={{fontSize:22}}>{d.emoji}</span>
              <div>
                <div style={{fontSize:10,color:on?PASTEL.mint:theme.text}}>{d.label}</div>
                {locked&&<div style={{fontSize:8,color:"#c8a840"}}>🔒{XP_DECO}XP</div>}
              </div>
            </button>);})}
        </div>
      </div>
    </div>
  </div>);
}

// ─── Main DiaryTab ────────────────────────────────────────────────────────────
export default function DiaryTab({theme,diary,setDiary,playSfx,showMsg,archive,setTab}){
  const today=new Date().toISOString().slice(0,10);

  // Persisted desk state
  const [diaryState,setDiaryState]=useState(()=>localStorage.getItem("ashrain-diary-state")||"desk-neat");
  const [thrownXfm,setThrownXfm]=useState(()=>{try{return JSON.parse(localStorage.getItem("ashrain-diary-thrown")||"null");}catch{return null;}});

  // Desk config (persisted)
  const [deskId,setDeskId]=useState(()=>localStorage.getItem("ashrain-desk-id")||"oak");
  const [coverId,setCoverId]=useState(()=>localStorage.getItem("ashrain-cover-id")||"brown");
  const [activeDecos,setActiveDecos]=useState(()=>{try{return JSON.parse(localStorage.getItem("ashrain-decos")||"[]");}catch{return[];}});

  // Set registration date on first ever diary open
  useEffect(()=>{if(!localStorage.getItem("ar_diary_start"))localStorage.setItem("ar_diary_start",new Date().toISOString().slice(0,10));},[]);

  // Persist desk config changes
  useEffect(()=>{localStorage.setItem("ashrain-desk-id",deskId);},[deskId]);
  useEffect(()=>{localStorage.setItem("ashrain-cover-id",coverId);},[coverId]);
  useEffect(()=>{localStorage.setItem("ashrain-decos",JSON.stringify(activeDecos));},[activeDecos]);
  useEffect(()=>{localStorage.setItem("ashrain-diary-state",diaryState);},[diaryState]);
  useEffect(()=>{if(thrownXfm)localStorage.setItem("ashrain-diary-thrown",JSON.stringify(thrownXfm));},[thrownXfm]);

  // Book state
  const [viewDate,setViewDate]=useState(today);
  const [showModal,setShowModal]=useState(false);
  const [showStylePanel,setShowStylePanel]=useState(false);
  const [drawMode,setDrawMode]=useState(true);
  const [brushId,setBrushId]=useState("PEN");
  const [penColor,setPenColor]=useState("#1a1a1a");
  const [penSize,setPenSize]=useState(3);
  const [bgType,setBgType]=useState(BG.RULED);

  const userXP=0; // TODO: connect to real XP system
  const deskTheme=DESK_THEMES.find(d=>d.id===deskId)||DESK_THEMES[0];
  const coverStyle=COVER_STYLES.find(c=>c.id===coverId)||COVER_STYLES[0];

  const isInBook=diaryState==="book";
  const isThrown=diaryState==="desk-thrown";
  const isNeat=diaryState==="desk-neat";

  const onDiaryClick=()=>setShowModal(true);
  const onDecoDragEnd=(id,pos)=>{
    setActiveDecos(prev=>prev.map(d=>d.id===id?{...d,pos}:d));
  };

  const openBook=(mode)=>{
    setShowModal(false);
    if(mode==="today")setViewDate(today);
    setDiaryState("book");
    playSfx("click");
  };
  const closeBook=()=>{
    const angle=(Math.random()-0.5)*30;
    const tx=(Math.random()-0.5)*40;
    const ty=(Math.random()-0.5)*20;
    setThrownXfm({angle,tx,ty});
    setDiaryState("desk-thrown");
    playSfx("click");
    showMsg("다이어리가 덮혔어요 📚",1500);
  };
  const tidyBook=()=>{setShowModal(false);setThrownXfm(null);setDiaryState("desk-neat");};

  const modalButtons=isThrown?[
    {icon:"✨",label:"정리하시겠습니까?",onClick:tidyBook,primary:false},
    {icon:"📖",label:"다시 여시겠습니까?",onClick:()=>{setShowModal(false);setDiaryState("book");},primary:true},
    {icon:"🔖",label:"오늘 날짜로 펼치겠습니까?",onClick:()=>openBook("today"),primary:true},
  ]:[
    {icon:"📖",label:"여시겠습니까?",onClick:()=>openBook("browse"),primary:true},
    {icon:"🔖",label:"오늘 날짜로 펼치겠습니까?",onClick:()=>openBook("today"),primary:true},
  ];

  if(isInBook){
    return(
      <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
        {/* Book header with date nav */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderBottom:`1px solid ${theme.border}`,flexShrink:0}}>
          <button onClick={()=>setShowStylePanel(true)} style={{padding:"5px 8px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>🪴</button>
          <button onClick={()=>{const d=new Date(viewDate+"T00:00:00");d.setDate(d.getDate()-1);setViewDate(d.toISOString().slice(0,10));}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:theme.text,padding:"2px 4px"}}>◀</button>
          <span style={{fontSize:12,color:theme.text,fontFamily:"serif",flex:1,textAlign:"center"}}>
            {new Date(viewDate+"T00:00:00").toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}
          </span>
          <button onClick={()=>{const d=new Date(viewDate+"T00:00:00");d.setDate(d.getDate()+1);const n=d.toISOString().slice(0,10);if(n<=today)setViewDate(n);}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:viewDate<today?theme.text:theme.border,padding:"2px 4px"}}>▶</button>
          <button onClick={closeBook} style={{padding:"5px 10px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#c8a840,#8a6820)",color:"#fff8e0",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"serif"}}>닫기 ✕</button>
        </div>

        <BookView diary={diary} setDiary={setDiary} viewDate={viewDate} canEdit={true}
          theme={theme} brushId={brushId} setBrushId={setBrushId}
          penColor={penColor} setPenColor={setPenColor}
          penSize={penSize} setPenSize={setPenSize}
          drawMode={drawMode} setDrawMode={setDrawMode}
          bgType={bgType} setBgType={setBgType}
          coverStyle={coverStyle}
          onClose={closeBook}
          showMsg={showMsg} playSfx={playSfx}
          archive={archive} setTab={setTab}/>

        {showStylePanel&&<StylePanel theme={theme} deskId={deskId} setDeskId={setDeskId} coverId={coverId} setCoverId={setCoverId} activeDecos={activeDecos} setActiveDecos={setActiveDecos} userXP={userXP} onClose={()=>setShowStylePanel(false)}/>}
      </div>
    );
  }

  // Desk view (neat or thrown)
  return(
    <div style={{padding:"10px 12px",userSelect:"none"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:13,color:theme.textSec,fontFamily:"serif"}}>
          {isThrown?"📚 다이어리가 여기 있어요":"📚 나의 다이어리"}
        </span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowStylePanel(true)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>🪴 꾸미기</button>
        </div>
      </div>

      <DeskScene3D
        deskTheme={deskTheme}
        coverStyle={coverStyle}
        diaryState={diaryState}
        thrownXfm={thrownXfm}
        decos={activeDecos}
        onDiaryClick={onDiaryClick}
        onDecoDragEnd={onDecoDragEnd}
        userXP={userXP}
        theme={theme}/>

      <div style={{marginTop:10,textAlign:"center",fontSize:11,color:theme.textSec,fontFamily:"serif",opacity:0.7}}>
        {isThrown?"다이어리를 탭하면 옵션이 나와요":"다이어리를 탭하여 시작하세요"}
      </div>

      {showModal&&<FantasyModal
        title={isThrown?"이 다이어리를 어떻게 할까요?":"이 다이어리를..."}
        subtitle={isThrown?"내팽개쳐진 다이어리":"📜 선택하세요"}
        buttons={modalButtons}
        onCancel={()=>setShowModal(false)}
        theme={theme}/>}

      {showStylePanel&&<StylePanel theme={theme} deskId={deskId} setDeskId={setDeskId} coverId={coverId} setCoverId={setCoverId} activeDecos={activeDecos} setActiveDecos={setActiveDecos} userXP={userXP} onClose={()=>setShowStylePanel(false)}/>}
    </div>
  );
}
