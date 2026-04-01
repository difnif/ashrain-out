// DiaryScreen.jsx — ashrain.out v4
// Canvas 2D brushes, desk+cover layout, decorations
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { PASTEL } from "../config";

// ─── KaTeX CDN ────────────────────────────────────────────────────────────────
let _katex = null;
function loadKatex() {
  if (_katex) return Promise.resolve(_katex);
  return new Promise(resolve => {
    if (!document.getElementById("katex-css")) {
      const l = document.createElement("link");
      l.id="katex-css"; l.rel="stylesheet";
      l.href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
      document.head.appendChild(l);
    }
    const s = document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";
    s.onload=()=>{ _katex=window.katex; resolve(_katex); };
    s.onerror=()=>resolve(null);
    document.head.appendChild(s);
  });
}
function MathRender({ tex, display=true }) {
  const ref = useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    loadKatex().then(k=>{ if(!k||!ref.current) return;
      try { k.render(tex||"\\square",ref.current,{throwOnError:false,displayMode:display}); }
      catch { if(ref.current) ref.current.textContent=tex; }
    });
  },[tex,display]);
  return <span ref={ref}/>;
}
function MathDialog({ theme, initial, onConfirm, onCancel }) {
  const [tex,setTex]=useState(initial||"");
  const prev=useRef(null);
  useEffect(()=>{ if(!prev.current) return;
    loadKatex().then(k=>{ if(!k||!prev.current) return;
      try { k.render(tex||"\\square",prev.current,{throwOnError:false,displayMode:true}); }
      catch { if(prev.current) prev.current.textContent=tex; }
    });
  },[tex]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:420,background:theme.card,borderRadius:18,padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:theme.text,marginBottom:12}}>∑ 수식 입력 (LaTeX)</div>
        <input value={tex} onChange={e=>setTex(e.target.value)} placeholder="\frac{a}{b} + \sqrt{c}"
          style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:13,boxSizing:"border-box",fontFamily:"monospace"}}/>
        <div ref={prev} style={{minHeight:50,padding:"10px 4px",textAlign:"center",overflowX:"auto"}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={onCancel} style={{flex:1,padding:10,borderRadius:8,border:`1px solid ${theme.border}`,background:"none",color:theme.textSec,cursor:"pointer"}}>취소</button>
          <button onClick={()=>onConfirm(tex)} style={{flex:1,padding:10,borderRadius:8,border:"none",background:PASTEL.lavender,color:"#3d2d60",fontWeight:700,cursor:"pointer"}}>확인</button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ZOOM=8, ERASER_R=22, LINE_H=32;
const BG={RULED:"ruled",GRID:"grid",DOT:"dot",PLAIN:"plain"};
const MOODS=["😊","😐","😔","😤","🥱","🤔","💪","🎉","🥳","😴"];
const SLASH_CMDS=[
  {cmd:"archive",icon:"📂",label:"아카이브 불러오기"},
  {cmd:"math",icon:"∑",label:"수식 (LaTeX)"},
  {cmd:"todo",icon:"☐",label:"체크리스트"},
  {cmd:"callout",icon:"💡",label:"강조 박스"},
  {cmd:"toggle",icon:"▶",label:"접기/펼치기"},
  {cmd:"divider",icon:"─",label:"구분선"},
  {cmd:"date",icon:"📅",label:"날짜 삽입"},
  {cmd:"image",icon:"🖼",label:"이미지 업로드"},
];
const BRUSHES=[
  {id:"PEN",    name:"펜",    icon:"🖊", defSize:3},
  {id:"PENCIL", name:"연필",  icon:"✏️", defSize:3},
  {id:"PASTEL", name:"파스텔",icon:"🖍", defSize:5},
  {id:"CHARCOAL",name:"목탄",icon:"⬛", defSize:5},
  {id:"WATERCOLOR",name:"수채",icon:"💧",defSize:8},
  {id:"OIL",    name:"유채",  icon:"🎨", defSize:5},
  {id:"INK",    name:"수묵",  icon:"🖌️",defSize:4},
  {id:"HIGHLIGHT",name:"형광펜",icon:"🌟",defSize:12},
  {id:"EMBOSS", name:"엠보싱",icon:"🔲", defSize:5},
  {id:"TEXTURE",name:"텍스쳐",icon:"🟫", defSize:5},
  {id:"ERASER", name:"지우개",icon:"⌫", defSize:22},
];
const PEN_COLORS=["#1a1a1a","#2c3e50","#1a6fc4","#c0392b","#27ae60","#8e44ad","#d35400","#f39c12","#7f8c8d","#16a085","#ffffff"];

// ─── Desk / Cover / Deco configs ─────────────────────────────────────────────
const DESK_THEMES=[
  {id:"oak",     label:"원목",     bg:"linear-gradient(168deg,#c8934e 0%,#b5783a 40%,#ca9850 70%,#b07840 100%)"},
  {id:"dark",    label:"다크 오크",bg:"linear-gradient(168deg,#3d2a1e 0%,#4a3424 50%,#3a2818 100%)"},
  {id:"white",   label:"화이트",   bg:"#f0ede8"},
  {id:"felt",    label:"그린 펠트",bg:"linear-gradient(135deg,#2d5a3d 0%,#1e4a2e 50%,#2d5a3d 100%)"},
  {id:"marble",  label:"핑크 마블",bg:"linear-gradient(120deg,#f5d0d0 0%,#fce8e8 35%,#f0cccc 65%,#ead0d0 100%)"},
  {id:"slate",   label:"슬레이트", bg:"linear-gradient(135deg,#6a7888 0%,#58687a 50%,#6a7888 100%)"},
  {id:"linen",   label:"리넨",     bg:"linear-gradient(168deg,#e8dcc8 0%,#ddd0b8 50%,#e4d8c4 100%)"},
];
const COVER_STYLES=[
  {id:"none",    label:"없음",   border:"none",                  shadow:"0 6px 28px rgba(0,0,0,0.18)"},
  {id:"simple",  label:"심플",   border:"2px solid rgba(0,0,0,0.12)", shadow:"0 6px 28px rgba(0,0,0,0.2)"},
  {id:"brown",   label:"브라운 가죽", border:"6px solid #8B5E3C", shadow:"0 8px 32px rgba(0,0,0,0.38), inset 0 0 0 2px rgba(255,220,180,0.2)"},
  {id:"navy",    label:"네이비",  border:"6px solid #1a2a4a",    shadow:"0 8px 32px rgba(0,0,0,0.38)"},
  {id:"bordeaux",label:"보르도",  border:"6px solid #6b1e2e",    shadow:"0 8px 32px rgba(0,0,0,0.38)"},
  {id:"forest",  label:"포레스트",border:"6px solid #2d4a28",    shadow:"0 8px 32px rgba(0,0,0,0.38)"},
  {id:"gold",    label:"골드",    border:"4px solid #c8a84b",    shadow:"0 6px 28px rgba(0,0,0,0.3),inset 0 0 0 1px #e8c870"},
  {id:"floral",  label:"플로럴",  border:"3px solid #d4845a",    shadow:"0 6px 24px rgba(0,0,0,0.22)",floral:true},
  {id:"vintage", label:"빈티지",  border:"2px double #b8860b",   shadow:"0 6px 24px rgba(0,0,0,0.22)",vintage:true},
];
const DECO_CATALOG=[
  {id:"vase",   label:"화병",   emoji:"🌸", fs:32},
  {id:"cat",    label:"고양이", emoji:"🐱", fs:30},
  {id:"coffee", label:"커피",   emoji:"☕", fs:28},
  {id:"plant",  label:"식물",   emoji:"🪴", fs:32},
  {id:"pencils",label:"연필통", emoji:"✏️", fs:26},
  {id:"glasses",label:"안경",   emoji:"👓", fs:26},
  {id:"phone",  label:"폰",     emoji:"📱", fs:26},
  {id:"headph", label:"이어폰", emoji:"🎧", fs:30},
  {id:"ribbon", label:"리본",   emoji:"🎀", fs:26},
  {id:"teddy",  label:"곰인형", emoji:"🧸", fs:30},
  {id:"star",   label:"별",     emoji:"⭐", fs:24},
  {id:"moon",   label:"달",     emoji:"🌙", fs:24},
  {id:"leaf",   label:"나뭇잎", emoji:"🍃", fs:26},
  {id:"candle", label:"캔들",   emoji:"🕯️", fs:26},
];

// ─── Canvas brush utilities ───────────────────────────────────────────────────
function seededRng(seed) {
  let s = ((Math.abs(seed) * 2654435761) >>> 0) || 1;
  return () => { s = ((s * 1664525 + 1013904223) >>> 0); return s / 4294967296; };
}
function interpPath(pts, spacing) {
  if (!pts || pts.length < 2) return pts||[];
  const out=[pts[0]]; let rem=0;
  for (let i=1; i<pts.length; i++) {
    const dx=pts[i].x-pts[i-1].x, dy=pts[i].y-pts[i-1].y;
    const len=Math.hypot(dx,dy); if(len<0.01) continue;
    let pos=spacing-rem;
    while (pos<=len) { out.push({x:pts[i-1].x+dx*(pos/len),y:pts[i-1].y+dy*(pos/len)}); pos+=spacing; }
    rem=pos-len;
  }
  return out;
}
function ctxBezier(ctx, pts) {
  if (!pts||pts.length<2) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  if (pts.length===2) { ctx.lineTo(pts[1].x,pts[1].y); return; }
  for (let i=0;i<pts.length-1;i++) {
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    ctx.bezierCurveTo(p1.x+(p2.x-p0.x)/6,p1.y+(p2.y-p0.y)/6,p2.x-(p3.x-p1.x)/6,p2.y-(p3.y-p1.y)/6,p2.x,p2.y);
  }
}
function hexRgb(hex) {
  const h=hex.replace("#","");
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function lighten(hex,t) {
  const [r,g,b]=hexRgb(hex);
  return `rgba(${Math.min(255,r+(255-r)*t)|0},${Math.min(255,g+(255-g)*t)|0},${Math.min(255,b+(255-b)*t)|0},1)`;
}
function darken(hex,t) {
  const [r,g,b]=hexRgb(hex);
  return `rgba(${(r*(1-t))|0},${(g*(1-t))|0},${(b*(1-t))|0},1)`;
}

function drawStroke(ctx, {pts, tool, color, size}) {
  if (!pts||pts.length<2) return;
  const rng=seededRng(pts[0].x*997+pts[0].y*389+size*31);
  ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";

  if (tool==="PEN") {
    ctxBezier(ctx,pts); ctx.strokeStyle=color; ctx.lineWidth=size; ctx.globalAlpha=1; ctx.stroke();
  }

  else if (tool==="PENCIL") {
    // Graphite feel: grain + multiple scratchy strands + dark core
    const s=interpPath(pts, Math.max(0.6,size*0.45));
    ctx.globalCompositeOperation = (color==="#ffffff")?"source-over":"multiply";
    // 6 rough passes — each offset, thin, translucent
    for (let pass=0; pass<6; pass++) {
      ctx.beginPath();
      for (let i=0;i<s.length;i++) {
        const ox=(rng()-0.5)*size*1.6, oy=(rng()-0.5)*size*1.6;
        if (i===0) ctx.moveTo(s[i].x+ox,s[i].y+oy); else ctx.lineTo(s[i].x+ox,s[i].y+oy);
      }
      ctx.strokeStyle=color; ctx.lineWidth=rng()*size*0.45+0.25; ctx.globalAlpha=rng()*0.22+0.06; ctx.stroke();
    }
    // Fine grain particles
    for (const pt of s) {
      if (rng()>0.6) {
        ctx.beginPath(); ctx.arc(pt.x+(rng()-0.5)*size,pt.y+(rng()-0.5)*size,rng()*size*0.28+0.1,0,Math.PI*2);
        ctx.fillStyle=color; ctx.globalAlpha=rng()*0.18+0.04; ctx.fill();
      }
    }
    // Core line — darker, thinner
    ctx.globalAlpha=0.58; ctx.lineWidth=size*0.35; ctx.strokeStyle=color;
    ctxBezier(ctx,pts); ctx.stroke();
    ctx.globalCompositeOperation="source-over";
  }

  else if (tool==="CHARCOAL") {
    const dark=(color==="#ffffff")?"#d8d8d8":"#111111";
    const s=interpPath(pts,1.0);
    // Outer blur haze
    ctx.filter=`blur(${Math.min(8,size*1.6)}px)`;
    ctx.globalAlpha=0.08; ctx.strokeStyle=dark; ctx.lineWidth=size*5;
    ctxBezier(ctx,pts); ctx.stroke();
    // Mid smear
    ctx.filter=`blur(${Math.min(5,size*0.75)}px)`;
    ctx.globalAlpha=0.16; ctx.lineWidth=size*2.5; ctxBezier(ctx,pts); ctx.stroke();
    ctx.filter="none";
    // Gritty scatter
    for (const pt of s) {
      if (rng()>0.42) {
        const a=rng()*Math.PI*2, d=rng()*size*1.0;
        ctx.beginPath(); ctx.arc(pt.x+Math.cos(a)*d,pt.y+Math.sin(a)*d,rng()*size*0.55+0.15,0,Math.PI*2);
        ctx.fillStyle=dark; ctx.globalAlpha=rng()*0.32+0.06; ctx.fill();
      }
    }
    // Side-stroke texture strands
    for (let pass=0; pass<3; pass++) {
      ctx.beginPath();
      for (let i=0;i<s.length;i++) {
        const ox=(rng()-0.5)*size*1.2, oy=(rng()-0.5)*size*0.5;
        if (i===0) ctx.moveTo(s[i].x+ox,s[i].y+oy); else ctx.lineTo(s[i].x+ox,s[i].y+oy);
      }
      ctx.strokeStyle=dark; ctx.lineWidth=rng()*size*0.5+0.3; ctx.globalAlpha=rng()*0.2+0.08; ctx.stroke();
    }
    // Core
    ctx.globalAlpha=0.62; ctx.lineWidth=size*0.55; ctx.strokeStyle=dark;
    ctxBezier(ctx,pts); ctx.stroke();
  }

  else if (tool==="PASTEL") {
    // Chalky bloom + powder dust
    const s=interpPath(pts, Math.max(0.7,size*0.35));
    // Bloom
    ctx.filter=`blur(${Math.min(7,size*1.4)}px)`;
    ctx.globalAlpha=0.07; ctx.strokeStyle=color; ctx.lineWidth=size*10;
    ctxBezier(ctx,pts); ctx.stroke();
    ctx.filter=`blur(${Math.min(4,size*0.6)}px)`;
    ctx.globalAlpha=0.1; ctx.lineWidth=size*6; ctxBezier(ctx,pts); ctx.stroke();
    ctx.filter="none";
    // Powdery chalk particles — key to pastel feel
    for (const pt of s) {
      const n=Math.floor(rng()*5)+4;
      for (let j=0;j<n;j++) {
        const a=rng()*Math.PI*2, d=rng()*size*2.2;
        const r=rng()*size*0.7+0.3;
        ctx.beginPath(); ctx.arc(pt.x+Math.cos(a)*d,pt.y+Math.sin(a)*d,r,0,Math.PI*2);
        ctx.fillStyle=color; ctx.globalAlpha=rng()*0.06+0.015; ctx.fill();
      }
    }
    // Soft core
    ctx.filter=`blur(${Math.max(0.5,size*0.25)}px)`;
    ctx.globalAlpha=0.22; ctx.lineWidth=size*2.2; ctx.strokeStyle=color;
    ctxBezier(ctx,pts); ctx.stroke();
    ctx.filter="none";
  }

  else if (tool==="WATERCOLOR") {
    // Wet spread — 5 translucent blur layers
    const layers=[
      {blur:size*1.2,lw:size*8, a:0.07},{blur:size*0.7,lw:size*5.5,a:0.09},
      {blur:size*0.35,lw:size*3.5,a:0.11},{blur:0,lw:size*2,a:0.14},{blur:0,lw:size*1,a:0.17},
    ];
    for (const {blur,lw,a} of layers) {
      ctx.filter=blur>0?`blur(${Math.min(9,blur)}px)`:"none";
      ctx.globalAlpha=a; ctx.strokeStyle=color; ctx.lineWidth=lw;
      ctxBezier(ctx,pts); ctx.stroke();
    }
    ctx.filter="none";
    // Edge bleeding
    const s=interpPath(pts,size*0.8);
    for (const pt of s) {
      if (rng()>0.7) {
        ctx.beginPath(); ctx.arc(pt.x+(rng()-0.5)*size*2.5,pt.y+(rng()-0.5)*size*2.5,rng()*size*1.2+0.5,0,Math.PI*2);
        ctx.fillStyle=color; ctx.globalAlpha=rng()*0.05+0.01; ctx.fill();
      }
    }
  }

  else if (tool==="OIL") {
    // Impasto — thick, textured, with painted highlight/shadow edges
    const lt=lighten(color,0.42), dk=darken(color,0.38);
    // Undercolor shadow offset
    const so=interpPath(pts,1.5);
    ctx.beginPath();
    so.forEach((p,i)=>{ if(i===0)ctx.moveTo(p.x+1.8,p.y+1.8);else ctx.lineTo(p.x+1.8,p.y+1.8); });
    ctx.strokeStyle=dk; ctx.lineWidth=size*2.8; ctx.globalAlpha=0.48; ctx.stroke();
    // Main body
    ctx.globalAlpha=0.94; ctx.strokeStyle=color; ctx.lineWidth=size*2.3;
    ctxBezier(ctx,pts); ctx.stroke();
    // Highlight edge
    const hi=interpPath(pts,1.5);
    ctx.beginPath();
    hi.forEach((p,i)=>{ if(i===0)ctx.moveTo(p.x-1,p.y-1);else ctx.lineTo(p.x-1,p.y-1); });
    ctx.strokeStyle=lt; ctx.lineWidth=size*0.85; ctx.globalAlpha=0.52; ctx.stroke();
    // Texture scumble
    const s=interpPath(pts,size*0.6);
    for (const pt of s) {
      ctx.beginPath(); ctx.rect(pt.x+(rng()-0.5)*size*0.8,pt.y+(rng()-0.5)*size*0.8,rng()*size*0.5+0.3,rng()*size*0.5+0.3);
      ctx.fillStyle=rng()>0.5?lt:color; ctx.globalAlpha=rng()*0.15+0.04; ctx.fill();
    }
  }

  else if (tool==="INK") {
    // 수묵 — speed-sensitive variable width, bleed edge
    const s=interpPath(pts,0.7);
    for (let i=0;i<s.length-1;i++) {
      const spd=Math.hypot(s[i+1].x-s[i].x,s[i+1].y-s[i].y);
      const w=Math.max(0.4, size*Math.max(0.18,2.4-spd*0.055));
      ctx.beginPath(); ctx.moveTo(s[i].x,s[i].y); ctx.lineTo(s[i+1].x,s[i+1].y);
      ctx.strokeStyle=color; ctx.lineWidth=w; ctx.globalAlpha=0.9; ctx.stroke();
    }
    // Bleed halo
    ctx.filter=`blur(1px)`;
    ctx.globalAlpha=0.13; ctx.strokeStyle=color; ctx.lineWidth=size*0.5;
    ctxBezier(ctx,pts); ctx.stroke(); ctx.filter="none";
  }

  else if (tool==="HIGHLIGHT") {
    ctx.globalAlpha=0.33; ctx.strokeStyle=color; ctx.lineWidth=size*5.5;
    ctx.lineCap="square"; ctxBezier(ctx,pts); ctx.stroke();
  }

  else if (tool==="EMBOSS") {
    // Light-source relief effect
    ctxBezier(ctx,pts);
    ctx.strokeStyle="#2a2a2a"; ctx.lineWidth=size*2.8; ctx.globalAlpha=0.55; ctx.stroke();
    const hi=interpPath(pts,1.2);
    ctx.beginPath(); hi.forEach((p,i)=>{ if(i===0)ctx.moveTo(p.x+size*0.5,p.y+size*0.5);else ctx.lineTo(p.x+size*0.5,p.y+size*0.5); });
    ctx.strokeStyle="#e0e0e0"; ctx.lineWidth=size*1.8; ctx.globalAlpha=0.5; ctx.stroke();
    ctxBezier(ctx,pts);
    ctx.strokeStyle="#999"; ctx.lineWidth=size*0.8; ctx.globalAlpha=0.4; ctx.stroke();
  }

  else if (tool==="TEXTURE") {
    const s=interpPath(pts,size*0.45);
    for (const pt of s) {
      for (let j=0;j<5;j++) {
        const a=rng()*Math.PI*2,d=rng()*size*0.85;
        ctx.beginPath(); ctx.rect(pt.x+Math.cos(a)*d-size*0.35,pt.y+Math.sin(a)*d-size*0.2,rng()*size*0.7+0.5,rng()*size*0.35+0.3);
        ctx.fillStyle=color; ctx.globalAlpha=rng()*0.16+0.04; ctx.fill();
      }
    }
    ctx.globalAlpha=0.72; ctx.strokeStyle=color; ctx.lineWidth=size*0.8;
    ctxBezier(ctx,pts); ctx.stroke();
  }

  ctx.restore();
}

// ─── DrawCanvas ───────────────────────────────────────────────────────────────
const DrawCanvas = memo(function DrawCanvas({paths, curPts, brushId, penColor, penSize, cw, ch, eraserPos}) {
  const baseRef=useRef(null), liveRef=useRef(null);
  useEffect(()=>{
    const ctx=baseRef.current?.getContext("2d"); if(!ctx) return;
    ctx.clearRect(0,0,cw,ch);
    for (const p of (paths||[])) drawStroke(ctx,p);
  },[paths,cw,ch]);
  useEffect(()=>{
    const ctx=liveRef.current?.getContext("2d"); if(!ctx) return;
    ctx.clearRect(0,0,cw,ch);
    if (curPts?.length>1) drawStroke(ctx,{pts:curPts,tool:brushId,color:penColor,size:penSize});
    if (eraserPos) {
      ctx.save(); ctx.beginPath(); ctx.arc(eraserPos.x,eraserPos.y,ERASER_R,0,Math.PI*2);
      ctx.strokeStyle="#aaa"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.restore();
    }
  });
  return <>
    <canvas ref={baseRef} width={cw} height={ch} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}/>
    <canvas ref={liveRef} width={cw} height={ch} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}/>
  </>;
});

// ─── Cover frame overlay ──────────────────────────────────────────────────────
function CoverFrame({style, cw, ch}) {
  if (!style||style==="none"||style==="simple"||style==="minimal") return null;
  if (style==="floral") return (
    <svg width={cw} height={ch} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:5}} overflow="visible">
      {[[14,14,0],[cw-14,14,90],[cw-14,ch-14,180],[14,ch-14,270]].map(([x,y,r],i)=>(
        <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
          <path d="M0,0 Q6,-14 0,-26" fill="none" stroke="#c8745a" strokeWidth="1.5"/>
          <circle cx="0" cy="-26" r="4" fill="#e8a070"/><circle cx="-2" cy="-22" r="3" fill="#f0c090"/>
          <path d="M0,0 Q-14,-6 -26,0" fill="none" stroke="#c8745a" strokeWidth="1.5"/>
          <circle cx="-26" cy="0" r="4" fill="#e8a070"/><circle cx="-22" cy="-2" r="3" fill="#f0c090"/>
          <path d="M0,0 Q-10,-10 -18,-18" fill="none" stroke="#c87850" strokeWidth="1.2" opacity="0.7"/>
          <circle cx="0" cy="0" r="5.5" fill="#d4845a"/>
          <circle cx="0" cy="0" r="3" fill="#f0a878"/>
        </g>
      ))}
      <rect x="8" y="8" width={cw-16} height={ch-16} fill="none" stroke="#d4845a" strokeWidth="1" opacity="0.4" rx="2"/>
    </svg>
  );
  if (style==="vintage") return (
    <svg width={cw} height={ch} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:5}} overflow="visible">
      {[[14,14,0],[cw-14,14,90],[cw-14,ch-14,180],[14,ch-14,270]].map(([x,y,r],i)=>(
        <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
          <path d="M0,24 L0,8 Q0,0 8,0 L24,0" fill="none" stroke="#b8860b" strokeWidth="2"/>
          <path d="M4,20 L4,10 Q4,4 10,4 L20,4" fill="none" stroke="#d4a020" strokeWidth="1" opacity="0.6"/>
          <circle cx="0" cy="0" r="3.5" fill="#c8980c"/>
          <circle cx="0" cy="0" r="2" fill="#e8c040"/>
        </g>
      ))}
    </svg>
  );
  return null;
}

// ─── Bezier smooth for BG rendering ──────────────────────────────────────────
function renderBgSvg(bgType, cw, ch, border) {
  const el=[];
  if (bgType===BG.RULED) {
    for (let y=LINE_H;y<ch;y+=LINE_H) el.push(<line key={y} x1={12} y1={y} x2={cw-12} y2={y} stroke={border} strokeWidth={0.6} opacity={0.4}/>);
  } else if (bgType===BG.GRID) {
    for (let y=0;y<ch;y+=LINE_H) el.push(<line key={`h${y}`} x1={0} y1={y} x2={cw} y2={y} stroke={border} strokeWidth={0.5} opacity={0.3}/>);
    for (let x=0;x<cw;x+=LINE_H) el.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={ch} stroke={border} strokeWidth={0.5} opacity={0.3}/>);
  } else if (bgType===BG.DOT) {
    for (let y=LINE_H;y<ch;y+=LINE_H) for (let x=LINE_H;x<cw;x+=LINE_H) el.push(<circle key={`${x},${y}`} cx={x} cy={y} r={1.5} fill={border} opacity={0.4}/>);
  }
  return el;
}

// ─── ArchiveImageBlock ────────────────────────────────────────────────────────
function ArchiveImageBlock({block,theme,isSel,onTap,onGo}) {
  const [hint,setHint]=useState(false); const tr=useRef(null);
  return(
    <div style={{position:"absolute",left:block.x,top:block.y,width:block.w||260,zIndex:isSel?20:10,
        outline:isSel?`2px solid ${PASTEL.lavender}`:"none",borderRadius:12,overflow:"hidden",background:theme.card,border:`1px solid ${theme.border}`}}
      onTouchStart={e=>{e.stopPropagation();tr.current=setTimeout(()=>setHint(true),600);}}
      onTouchEnd={e=>{e.stopPropagation();clearTimeout(tr.current);}}
      onTouchMove={()=>clearTimeout(tr.current)}
      onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
      onDoubleClick={e=>{e.stopPropagation();onGo?.();}}>
      <div style={{padding:"10px 12px",minHeight:50}}>
        {block.imageContent?.kind==="text"
          ?<p style={{fontSize:12,color:theme.text,margin:0,lineHeight:1.65,whiteSpace:"pre-wrap",maxHeight:100,overflow:"hidden"}}>{block.imageContent.text}</p>
          :<svg width="100%" viewBox="0 0 300 80" style={{display:"block"}}>
            {(block.imageContent?.paths||[]).map((p,i)=>{
              if(!p.pts||p.pts.length<2) return null;
              const smooth=(pts)=>{
                let d=`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for(let j=0;j<pts.length-1;j++){const p0=pts[Math.max(0,j-1)],p1=pts[j],p2=pts[j+1],p3=pts[Math.min(pts.length-1,j+2)];d+=`C${(p1.x+(p2.x-p0.x)/6).toFixed(1)},${(p1.y+(p2.y-p0.y)/6).toFixed(1)},${(p2.x-(p3.x-p1.x)/6).toFixed(1)},${(p2.y-(p3.y-p1.y)/6).toFixed(1)},${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;}
                return d;
              };
              return <path key={i} d={smooth(p.pts)} fill="none" stroke={p.color||"#333"} strokeWidth={Math.max(0.8,p.size*0.35)} strokeLinecap="round"/>;
            })}
          </svg>
        }
        <div style={{fontSize:10,color:theme.textSec,marginTop:4}}>📎 {block.title}</div>
      </div>
      {hint&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}} onTouchEnd={()=>setHint(false)}>
        <button onClick={()=>{setHint(false);onGo?.();}} style={{padding:"10px 22px",borderRadius:20,background:"white",border:"none",fontWeight:700,fontSize:13,cursor:"pointer"}}>📂 이동</button>
      </div>}
    </div>
  );
}

// ─── Main DiaryTab ────────────────────────────────────────────────────────────
export default function DiaryTab({theme,diary,setDiary,playSfx,showMsg,archive,setTab}) {
  const today=new Date().toISOString().slice(0,10);
  const [viewDate,setViewDate]=useState(today);
  const canEdit=viewDate===today;

  // Canvas size (1:1 pixel)
  const [cw,setCw]=useState(360);
  const [ch,setCh]=useState(500);

  // Zoom (min=1, max=8)
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});

  // Pages
  const [pages,setPages]=useState([{id:"pg1",paths:[],blocks:[],pageText:""}]);
  const [pageIdx,setPageIdx]=useState(0);
  const [pageAnim,setPageAnim]=useState(null);
  const curPage=pages[pageIdx]||pages[0];
  const updPage=useCallback(patch=>setPages(prev=>prev.map((p,i)=>i===pageIdx?{...p,...patch}:p)),[pageIdx]);

  // Drawing
  const [brushId,setBrushId]=useState("PEN");
  const [penColor,setPenColor]=useState("#1a1a1a");
  const [penSize,setPenSize]=useState(3);
  const [curPts,setCurPts]=useState([]);
  const [eraserPos,setEraserPos]=useState(null);
  const [showBrushPanel,setShowBrushPanel]=useState(false);
  const [drawMode,setDrawMode]=useState(true);

  // Blocks
  const [selectedId,setSelectedId]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const textRef=useRef(null);

  // Page meta
  const [mood,setMood]=useState(null);
  const [bgType,setBgType]=useState(BG.RULED);

  // Desk / cover / deco
  const [deskId,setDeskId]=useState("oak");
  const [coverId,setCoverId]=useState("brown");
  const [activeDecos,setActiveDecos]=useState(["vase","cat"]);
  const [showStylePanel,setShowStylePanel]=useState(false);
  const [showDecoPanel,setShowDecoPanel]=useState(false);

  // Overlays
  const [slashMenu,setSlashMenu]=useState(null);
  const [archivePicker,setArchivePicker]=useState(null);
  const [mathDialog,setMathDialog]=useState(null);
  const [ctxMenu,setCtxMenu]=useState(null);

  // Refs
  const containerRef=useRef(null);
  const pageCardRef=useRef(null);
  const pinchRef=useRef(null);
  const lpRef=useRef(null);
  const lpStart=useRef(null);
  const swipeRef=useRef(null);
  const undoStack=useRef([]);
  const redoStack=useRef([]);

  const isEraser=brushId==="ERASER";
  const deskTheme=DESK_THEMES.find(d=>d.id===deskId)||DESK_THEMES[0];
  const coverStyle=COVER_STYLES.find(c=>c.id===coverId)||COVER_STYLES[0];

  // Measure
  useEffect(()=>{
    if(!pageCardRef.current) return;
    const {width}=pageCardRef.current.getBoundingClientRect();
    const h=Math.max(350,window.innerHeight-370);
    setCw(Math.round(width)); setCh(Math.round(h));
  },[]);

  // Load entry (migration: old format has paths/blocks directly)
  useEffect(()=>{
    const e=diary.find(d=>d.date===viewDate);
    let pg;
    if (!e) pg=[{id:"pg1",paths:[],blocks:[],pageText:""}];
    else if (e.paths&&!e.pages) pg=[{id:"pg1",paths:e.paths||[],blocks:e.blocks||[],pageText:e.pageText||""}];
    else pg=e.pages||[{id:"pg1",paths:[],blocks:[],pageText:""}];
    setPages(pg); setPageIdx(0);
    setMood(e?.mood||null); setBgType(e?.bgType||BG.RULED);
    if (e?.deskId) setDeskId(e.deskId);
    if (e?.coverId) setCoverId(e.coverId);
    if (e?.decos) setActiveDecos(e.decos);
    setZoom(1); setPan({x:0,y:0}); setSelectedId(null); setEditingId(null); setCurPts([]);
  },[viewDate]);

  const save=()=>{
    setDiary(prev=>{
      const entry={id:`diary-${viewDate}`,date:viewDate,pages,mood,bgType,deskId,coverId,decos:activeDecos,updatedAt:Date.now()};
      const ex=prev.find(d=>d.date===viewDate);
      if(ex) return prev.map(d=>d.date===viewDate?{...d,...entry}:d);
      return [...prev,{...entry,createdAt:Date.now()}];
    });
    playSfx("success"); showMsg("저장했어요! 📓",1500);
  };

  // Page nav
  const goPage=useCallback(dir=>{
    const next=pageIdx+(dir==="left"?1:-1);
    if(next<0||next>=pages.length) return;
    setPageAnim(dir); setTimeout(()=>{setPageIdx(next);setPageAnim(null);setZoom(1);setPan({x:0,y:0});},260);
  },[pageIdx,pages.length]);

  const addPage=()=>{
    setPages(prev=>[...prev,{id:`pg${Date.now()}`,paths:[],blocks:[],pageText:""}]);
    setTimeout(()=>{setPageIdx(pages.length);setZoom(1);setPan({x:0,y:0});},20);
    playSfx("click"); showMsg(`${pages.length+1}쪽 추가!`,1200);
  };

  // Coords
  const s2c=useCallback((sx,sy)=>{
    const r=pageCardRef.current?.getBoundingClientRect(); if(!r) return {x:0,y:0};
    return {x:(sx-r.left-pan.x)/zoom, y:(sy-r.top-pan.y)/zoom};
  },[zoom,pan]);
  const clampPan=useCallback((px,py,z)=>({x:Math.min(0,Math.max(px,-(z-1)*cw)),y:Math.min(0,Math.max(py,-(z-1)*ch))}),[cw,ch]);

  // Undo/redo
  const snap=useCallback(()=>{
    undoStack.current.push(JSON.parse(JSON.stringify(curPage)));
    if(undoStack.current.length>60) undoStack.current.shift(); redoStack.current=[];
  },[curPage]);
  const undo=()=>{ if(!undoStack.current.length) return; redoStack.current.push(JSON.parse(JSON.stringify(curPage))); updPage(undoStack.current.pop()); };
  const redo=()=>{ if(!redoStack.current.length) return; undoStack.current.push(JSON.parse(JSON.stringify(curPage))); updPage(redoStack.current.pop()); };

  const updBlock=useCallback((id,patch)=>updPage({blocks:curPage.blocks.map(b=>b.id===id?{...b,...patch}:b)}),[curPage.blocks,updPage]);

  // Pointer
  const onDown=useCallback(e=>{
    if(!canEdit) return;
    if(e.touches?.length>=2){
      clearTimeout(lpRef.current);
      const r=pageCardRef.current?.getBoundingClientRect();
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const mx=((e.touches[0].clientX+e.touches[1].clientX)/2)-(r?.left||0);
      const my=((e.touches[0].clientY+e.touches[1].clientY)/2)-(r?.top||0);
      pinchRef.current={d0:d,z0:zoom,tx0:pan.x,ty0:pan.y,mx0:mx,my0:my};
      setCurPts([]); swipeRef.current=null; return;
    }
    if(drawMode){
      e.preventDefault();
      const t=e.touches?.[0]||e;
      const pos=s2c(t.clientX,t.clientY);
      lpStart.current={sx:t.clientX,sy:t.clientY,cx:pos.x,cy:pos.y};
      lpRef.current=setTimeout(()=>{
        setCtxMenu({sx:lpStart.current.sx,sy:lpStart.current.sy,cx:lpStart.current.cx,cy:lpStart.current.cy});
        setCurPts([]); lpStart.current=null;
      },650);
      setCurPts([{x:pos.x,y:pos.y}]); return;
    }
    const t=e.touches?.[0]||e;
    swipeRef.current={x:t.clientX,y:t.clientY,time:Date.now()};
  },[canEdit,drawMode,zoom,pan,s2c]);

  const onMove=useCallback(e=>{
    if(!canEdit) return;
    if(e.touches?.length>=2&&pinchRef.current){
      e.preventDefault();
      const r=pageCardRef.current?.getBoundingClientRect();
      const mx=((e.touches[0].clientX+e.touches[1].clientX)/2)-(r?.left||0);
      const my=((e.touches[0].clientY+e.touches[1].clientY)/2)-(r?.top||0);
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const {d0,z0,tx0,ty0,mx0,my0}=pinchRef.current;
      const newZ=Math.max(1,Math.min(MAX_ZOOM,z0*(d/d0)));
      const cx=(mx0-tx0)/z0,cy=(my0-ty0)/z0;
      const np=clampPan(mx-cx*newZ+(mx-mx0),my-cy*newZ+(my-my0),newZ);
      setZoom(newZ); setPan(np); return;
    }
    const t=e.touches?.[0]||e;
    const pos=s2c(t.clientX,t.clientY);
    if(lpStart.current&&Math.hypot(t.clientX-lpStart.current.sx,t.clientY-lpStart.current.sy)>8){ clearTimeout(lpRef.current); lpStart.current=null; }
    if(drawMode&&isEraser&&curPts.length>0){
      e.preventDefault(); setEraserPos(pos);
      updPage({paths:curPage.paths.filter(p=>!p.pts.some(pt=>Math.hypot(pt.x-pos.x,pt.y-pos.y)<ERASER_R))}); return;
    }
    if(drawMode&&curPts.length>0){ e.preventDefault(); setCurPts(prev=>[...prev,{x:pos.x,y:pos.y}]); }
  },[canEdit,drawMode,isEraser,curPts,zoom,pan,s2c,clampPan,curPage.paths,updPage]);

  const onUp=useCallback(e=>{
    pinchRef.current=null; clearTimeout(lpRef.current); lpStart.current=null;
    if(!drawMode&&swipeRef.current){
      const t=e.changedTouches?.[0]||e;
      const dx=t.clientX-swipeRef.current.x,dy=t.clientY-swipeRef.current.y;
      if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4&&Date.now()-swipeRef.current.time<500) goPage(dx<0?"left":"right");
      swipeRef.current=null;
    }
    if(isEraser){ setEraserPos(null); setCurPts([]); return; }
    if(drawMode&&curPts.length>1){
      snap(); updPage({paths:[...curPage.paths,{id:`p${Date.now()}`,pts:curPts,tool:brushId,color:penColor,size:penSize}]});
    }
    setCurPts([]);
  },[drawMode,isEraser,curPts,brushId,penColor,penSize,snap,curPage.paths,updPage,goPage]);

  // Slash / blocks
  const handleText=val=>{ updPage({pageText:val}); const m=val.match(/\/([a-z]*)$/); if(m)setSlashMenu({query:m[1]});else setSlashMenu(null); };
  const execSlash=cmd=>{
    setSlashMenu(null); updPage({pageText:(curPage.pageText||"").replace(/\/[a-z]*$/,"")});
    const bx=40,by=Math.max(60,curPage.blocks.length*70+40); snap();
    if(cmd==="archive")setArchivePicker({cx:bx,cy:by});
    else if(cmd==="math")setMathDialog({cx:bx,cy:by});
    else if(cmd==="todo"){const id=`b${Date.now()}`;updPage({blocks:[...curPage.blocks,{id,type:"todo",x:bx,y:by,w:280,items:[{done:false,text:""}]}]});setEditingId(id);}
    else if(cmd==="callout"){const id=`b${Date.now()}`;updPage({blocks:[...curPage.blocks,{id,type:"callout",x:bx,y:by,w:280,color:"#fff9e0",emoji:"💡",text:""}]});setEditingId(id);}
    else if(cmd==="toggle"){const id=`b${Date.now()}`;updPage({blocks:[...curPage.blocks,{id,type:"toggle",x:bx,y:by,w:280,title:"",content:"",open:true}]});setEditingId(id);}
    else if(cmd==="divider"){const id=`b${Date.now()}`;updPage({blocks:[...curPage.blocks,{id,type:"divider",x:bx,y:by,w:260}]});}
    else if(cmd==="date"){const ds=new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});updPage({pageText:(curPage.pageText||"")+ds});}
    else if(cmd==="image")document.getElementById("d-img-inp")?.click();
  };
  const importArchive=(item,mode)=>{
    setArchivePicker(null); const id=`b${Date.now()}`,{cx=40,cy=40}=archivePicker||{}; snap();
    if(mode==="widget"){updPage({blocks:[...curPage.blocks,{id,type:"archive-widget",x:cx,y:cy,w:280,archiveId:item.id,title:item.title,preview:item.preview?.slice(0,80)}]});}
    else{const isDraw=["외심","내심","합동","삼각형"].some(t=>item.type?.includes(t));
      const ic=isDraw?{kind:"svg",paths:item.paths||[]}:{kind:"text",text:item.content?.problemText||item.preview||item.title||""};
      updPage({blocks:[...curPage.blocks,{id,type:"archive-image",x:cx,y:cy,w:270,archiveId:item.id,imageContent:ic,title:item.title}]});}
    playSfx("click"); showMsg("불러왔어요!",1200);
  };

  const renderBlock=block=>{
    const isSel=selectedId===block.id,isEd=editingId===block.id;
    const onT=id=>setSelectedId(id),onD=id=>{ if(canEdit)setEditingId(id); };
    const base={position:"absolute",left:block.x,top:block.y,width:block.w||280,zIndex:isSel?20:10};
    const ring={outline:isSel?`2px solid ${PASTEL.coral}`:"none",borderRadius:8};
    if(block.type==="archive-image") return <ArchiveImageBlock key={block.id} block={block} theme={theme} isSel={isSel} onTap={onT} onGo={()=>setTab?.("archive")}/>;
    if(block.type==="archive-widget") return(
      <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.sky}`:"none",background:theme.card,border:`1.5px solid ${theme.border}`,borderRadius:12,padding:"10px 14px",cursor:"pointer"}}
        onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}
        onDoubleClick={e=>{e.stopPropagation();setTab?.("archive");}}>
        <div style={{fontSize:12,fontWeight:700,color:theme.text,marginBottom:4}}>{block.title}</div>
        {block.preview&&<p style={{fontSize:11,color:theme.textSec,margin:0}}>{block.preview}</p>}
        <div style={{fontSize:10,color:PASTEL.sky,marginTop:6}}>탭 두 번 → 이동 ↗</div>
      </div>);
    if(block.type==="todo") return(
      <div key={block.id} style={{...base,...ring,background:theme.card+"cc",border:`1px solid ${theme.border}`,padding:"8px 12px"}}
        onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}
        onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
        {block.items.map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <input type="checkbox" checked={item.done} style={{accentColor:PASTEL.mint}}
              onChange={e=>{const its=[...block.items];its[i]={...its[i],done:e.target.checked};updBlock(block.id,{items:its});}}/>
            {isEd?<input value={item.text} autoFocus={i===block.items.length-1} style={{flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,outline:"none"}}
              onChange={e=>{const its=[...block.items];its[i]={...its[i],text:e.target.value};updBlock(block.id,{items:its});}}
              onKeyDown={e=>{if(e.key==="Enter")updBlock(block.id,{items:[...block.items,{done:false,text:""}]});}}/>
            :<span style={{fontSize:13,color:theme.text,textDecoration:item.done?"line-through":"none",opacity:item.done?0.45:1}}>{item.text||"항목"}</span>}
          </div>))}
        {isEd&&<button onClick={e=>{e.stopPropagation();updBlock(block.id,{items:[...block.items,{done:false,text:""}]});}} style={{fontSize:11,color:theme.textSec,background:"none",border:"none",cursor:"pointer"}}>+ 추가</button>}
      </div>);
    if(block.type==="callout") return(
      <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.yellow}`:undefined,borderRadius:10,background:block.color||"#fff9e0",border:`1px solid ${block.color||"#ffe58f"}`,padding:"10px 14px"}}
        onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}
        onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:18}}>{block.emoji||"💡"}</span>
          {isEd?<textarea autoFocus value={block.text} onChange={e=>updBlock(block.id,{text:e.target.value})} onBlur={()=>setEditingId(null)}
            style={{flex:1,border:"none",background:"transparent",color:"#5a4000",fontSize:13,resize:"none",outline:"none",lineHeight:1.6}}/>
          :<span style={{fontSize:13,color:"#5a4000",whiteSpace:"pre-wrap",lineHeight:1.6}}>{block.text||"강조 내용"}</span>}
        </div>
      </div>);
    if(block.type==="toggle") return(
      <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.lavender}`:undefined,border:`1px solid ${theme.border}`,background:theme.card+"cc",borderRadius:10,overflow:"hidden"}}
        onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",cursor:"pointer",borderBottom:block.open?`1px solid ${theme.border}`:"none"}}
          onClick={()=>updBlock(block.id,{open:!block.open})} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
          <span style={{fontSize:10,transition:"transform 0.2s",transform:block.open?"rotate(90deg)":"",display:"inline-block"}}>▶</span>
          {isEd?<input value={block.title} onChange={e=>updBlock(block.id,{title:e.target.value})} style={{flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,fontWeight:600,outline:"none"}}/>
          :<span style={{fontSize:13,fontWeight:600,color:theme.text}}>{block.title||"접기 블록"}</span>}
        </div>
        {block.open&&<div style={{padding:"8px 12px"}} onDoubleClick={e=>{e.stopPropagation();onD(block.id);}}>
          {isEd?<textarea autoFocus value={block.content} onChange={e=>updBlock(block.id,{content:e.target.value})} onBlur={()=>setEditingId(null)}
            style={{width:"100%",border:"none",background:"transparent",color:theme.text,fontSize:12,resize:"none",outline:"none",lineHeight:1.6}}/>
          :<span style={{fontSize:12,color:theme.textSec,whiteSpace:"pre-wrap",lineHeight:1.6}}>{block.content||"내용"}</span>}
        </div>}
      </div>);
    if(block.type==="math") return(
      <div key={block.id} style={{...base,...ring,background:theme.card,border:`1px solid ${theme.border}`,padding:"8px 12px",cursor:"pointer",overflowX:"auto"}}
        onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}
        onDoubleClick={e=>{e.stopPropagation();if(canEdit)setMathDialog({blockId:block.id,initial:block.tex});}}>
        <MathRender tex={block.tex||"\\square"}/>
        {canEdit&&<div style={{fontSize:9,color:theme.textSec,marginTop:2}}>더블탭 → 편집</div>}
      </div>);
    if(block.type==="divider") return <div key={block.id} style={{...base,height:1,background:theme.border,pointerEvents:"none"}}/>;
    if(block.type==="image") return(
      <div key={block.id} style={{...base,...ring}} onMouseDown={e=>{e.stopPropagation();onT(block.id);}} onTouchStart={e=>{e.stopPropagation();onT(block.id);}}>
        <img src={block.dataUrl} alt="" style={{width:"100%",borderRadius:8,display:"block"}}/>
      </div>);
    return null;
  };

  const filteredCmds=slashMenu?SLASH_CMDS.filter(c=>c.cmd.startsWith(slashMenu.query)):[];
  const brushDef=BRUSHES.find(b=>b.id===brushId)||BRUSHES[0];

  // Desk deco items
  const leftDecos=activeDecos.slice(0,2);
  const rightDecos=activeDecos.slice(2,4);

  return(
    <div style={{padding:"8px 12px",userSelect:"none"}}>
      {/* Date nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
        <button onClick={()=>{const d=new Date(viewDate+"T00:00:00");d.setDate(d.getDate()-1);setViewDate(d.toISOString().slice(0,10));}}
          style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.text,padding:"4px 8px"}}>◀</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:theme.text}}>
            {new Date(viewDate+"T00:00:00").toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
          </div>
          <div style={{display:"flex",gap:4,justifyContent:"center",marginTop:1}}>
            {viewDate===today&&<span style={{fontSize:10,color:PASTEL.coral,fontWeight:700}}>오늘</span>}
            {mood&&<span style={{fontSize:13}}>{mood}</span>}
          </div>
        </div>
        <button onClick={()=>{const d=new Date(viewDate+"T00:00:00");d.setDate(d.getDate()+1);const n=d.toISOString().slice(0,10);if(n<=today)setViewDate(n);}}
          style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:viewDate<today?theme.text:theme.border,padding:"4px 8px"}}>▶</button>
      </div>

      {/* Mood + bg row */}
      {canEdit&&<div style={{display:"flex",gap:3,marginBottom:5,alignItems:"center",flexWrap:"wrap"}}>
        {MOODS.map(m=>(
          <button key={m} onClick={()=>setMood(m===mood?null:m)}
            style={{background:m===mood?`${PASTEL.peach}60`:"none",border:"none",fontSize:12,cursor:"pointer",borderRadius:5,padding:"1px 2px",opacity:(!mood||m===mood)?1:0.35}}>{m}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:2}}>
          {[BG.RULED,BG.GRID,BG.DOT,BG.PLAIN].map((b,i)=>(
            <button key={b} onClick={()=>setBgType(b)} style={{fontSize:10,padding:"3px 5px",borderRadius:6,border:`1px solid ${bgType===b?theme.text:theme.border}`,background:bgType===b?theme.border:"none",color:theme.text,cursor:"pointer"}}>
              {["줄","격자","점","빈"][i]}
            </button>))}
        </div>
      </div>}

      {/* Page nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
        <button onClick={()=>goPage("right")} disabled={pageIdx===0} style={{background:"none",border:"none",fontSize:15,cursor:pageIdx>0?"pointer":"default",color:pageIdx>0?theme.text:theme.border,padding:"2px 6px"}}>‹</button>
        <span style={{fontSize:11,color:theme.textSec}}>{pageIdx+1} / {pages.length}쪽</span>
        <button onClick={()=>goPage("left")} disabled={pageIdx>=pages.length-1} style={{background:"none",border:"none",fontSize:15,cursor:pageIdx<pages.length-1?"pointer":"default",color:pageIdx<pages.length-1?theme.text:theme.border,padding:"2px 6px"}}>›</button>
        {canEdit&&<button onClick={addPage} style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,cursor:"pointer",marginLeft:4}}>+ 쪽 추가</button>}
      </div>

      {/* ── DESK AREA ── */}
      <div style={{width:"100%",borderRadius:16,background:deskTheme.bg,padding:"12px 10px 10px",boxSizing:"border-box",position:"relative"}}>

        {/* Desk decorations strip */}
        {activeDecos.length>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:6,paddingLeft:4,paddingRight:4}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            {leftDecos.map(id=>{ const d=DECO_CATALOG.find(x=>x.id===id); return d?<span key={id} style={{fontSize:d.fs,lineHeight:1,filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.25))"}}>{d.emoji}</span>:null; })}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            {rightDecos.map(id=>{ const d=DECO_CATALOG.find(x=>x.id===id); return d?<span key={id} style={{fontSize:d.fs,lineHeight:1,filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.25))"}}>{d.emoji}</span>:null; })}
          </div>
        </div>}

        {/* ── PAGE CARD ── */}
        <div ref={pageCardRef} style={{
          width:"100%",height:ch,position:"relative",borderRadius:8,
          background:theme.card,
          border:coverStyle.border,
          boxShadow:coverStyle.shadow||"0 6px 28px rgba(0,0,0,0.22)",
          overflow:"hidden",
          transform:pageAnim?`translateX(${pageAnim==="left"?"-30px":"30px"})`:"none",
          opacity:pageAnim?0:1,
          transition:pageAnim?"transform 0.26s ease,opacity 0.26s ease":"none",
          touchAction:drawMode?"none":"pan-y",
          cursor:drawMode?(isEraser?"cell":"crosshair"):"text"}}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>

          {/* Zoomed content */}
          <div style={{position:"absolute",width:cw,height:ch,transform:`matrix(${zoom},0,0,${zoom},${pan.x},${pan.y})`,transformOrigin:"0 0"}}>
            {/* BG lines */}
            <svg width={cw} height={ch} style={{position:"absolute",top:0,left:0,pointerEvents:"none"}}>
              {renderBgSvg(bgType,cw,ch,theme.border)}
            </svg>
            {/* Canvas 2D drawing */}
            <DrawCanvas paths={curPage.paths} curPts={curPts} brushId={brushId} penColor={penColor} penSize={penSize} cw={cw} ch={ch} eraserPos={eraserPos}/>
            {/* Textarea */}
            <textarea ref={textRef} value={curPage.pageText} onChange={e=>handleText(e.target.value)} readOnly={!canEdit}
              placeholder={canEdit&&!drawMode?"여기에 필기... (/ 명령어)":""}
              style={{position:"absolute",top:0,left:0,width:cw,height:ch,border:"none",background:"transparent",color:theme.text,fontSize:14,lineHeight:`${LINE_H}px`,padding:`${LINE_H*0.15}px 18px`,boxSizing:"border-box",resize:"none",outline:"none",fontFamily:"'Noto Serif KR',serif",zIndex:2,pointerEvents:drawMode?"none":"auto",caretColor:theme.text}}/>
            {/* Blocks */}
            <div style={{position:"absolute",top:0,left:0,width:cw,height:ch,zIndex:3,pointerEvents:drawMode?"none":"auto"}}>
              {curPage.blocks.map(renderBlock)}
            </div>
          </div>
          {/* Cover frame overlay */}
          <CoverFrame style={coverId} cw={cw} ch={ch}/>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      {canEdit&&<div style={{marginTop:7}}>
        <div style={{display:"flex",gap:5,marginBottom:5,alignItems:"center",flexWrap:"wrap"}}>
          {/* Mode */}
          <button onClick={()=>{setDrawMode(true);setSelectedId(null);setEditingId(null);}}
            style={{padding:"7px 11px",borderRadius:10,border:drawMode?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:drawMode?`${PASTEL.coral}18`:theme.card,color:drawMode?PASTEL.coral:theme.text,fontSize:11,cursor:"pointer",fontWeight:drawMode?700:400}}>
            ✏️ 그리기
          </button>
          <button onClick={()=>{setDrawMode(false);setTimeout(()=>textRef.current?.focus(),50);}}
            style={{padding:"7px 11px",borderRadius:10,border:!drawMode?`2px solid ${PASTEL.sky}`:`1px solid ${theme.border}`,background:!drawMode?`${PASTEL.sky}18`:theme.card,color:!drawMode?PASTEL.sky:theme.text,fontSize:11,cursor:"pointer",fontWeight:!drawMode?700:400}}>
            T 텍스트
          </button>
          {drawMode&&<button onClick={()=>{setShowBrushPanel(!showBrushPanel);setShowStylePanel(false);setShowDecoPanel(false);}}
            style={{padding:"6px 10px",borderRadius:10,border:`1px solid ${theme.border}`,background:showBrushPanel?theme.border:theme.card,color:theme.text,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            <span>{brushDef.icon}</span><span>{brushDef.name}</span><span style={{fontSize:9}}>▼</span>
          </button>}
          {drawMode&&<div style={{display:"flex",gap:3,flex:1,flexWrap:"wrap"}}>
            {PEN_COLORS.map(c=>(
              <button key={c} onClick={()=>setPenColor(c)} style={{width:20,height:20,borderRadius:10,background:c,border:penColor===c?"3px solid rgba(0,0,0,0.3)":"1px solid #ccc",boxShadow:penColor===c?`0 0 0 2px ${c}`:"none",cursor:"pointer",outline:c==="#ffffff"?`1px solid ${theme.border}`:"none"}}/>
            ))}
          </div>}
          {drawMode&&<div style={{display:"flex",gap:3}}>
            {[1,3,6,10].map(s=>(
              <button key={s} onClick={()=>setPenSize(s)} style={{width:26,height:26,borderRadius:6,border:penSize===s?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:theme.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:Math.min(s*1.5+1,18),height:Math.min(s*1.5+1,18),borderRadius:"50%",background:penColor,border:penColor==="#ffffff"?`1px solid ${theme.border}`:"none"}}/>
              </button>))}
          </div>}
          <button onClick={undo} style={{marginLeft:"auto",padding:"6px 8px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>↩</button>
          <button onClick={redo} style={{padding:"6px 8px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>↪</button>
          <button onClick={()=>{setShowStylePanel(!showStylePanel);setShowBrushPanel(false);setShowDecoPanel(false);}} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${theme.border}`,background:showStylePanel?theme.border:theme.card,color:theme.text,fontSize:11,cursor:"pointer"}}>🪴</button>
          <button onClick={save} style={{padding:"7px 13px",borderRadius:10,border:"none",background:PASTEL.coral,color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>💾</button>
        </div>

        {/* Brush panel */}
        {drawMode&&showBrushPanel&&<div style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,padding:"10px 12px",marginBottom:5}}>
          <div style={{fontSize:11,color:theme.textSec,marginBottom:7}}>브러시 선택</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {BRUSHES.map(b=>(
              <button key={b.id} onClick={()=>{setBrushId(b.id);if(b.id!=="ERASER")setPenSize(b.defSize);setShowBrushPanel(false);}}
                style={{padding:"7px 10px",borderRadius:10,border:brushId===b.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,background:brushId===b.id?`${PASTEL.coral}15`:theme.bg,color:brushId===b.id?PASTEL.coral:theme.text,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontWeight:brushId===b.id?700:400}}>
                <span>{b.icon}</span><span>{b.name}</span>
              </button>))}
          </div>
          {(selectedId||curPage.paths.length>0)&&<div style={{display:"flex",gap:6,marginTop:8}}>
            {selectedId&&<button onClick={()=>{snap();updPage({blocks:curPage.blocks.filter(b=>b.id!==selectedId)});setSelectedId(null);}} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${PASTEL.coral}`,background:`${PASTEL.coral}10`,color:PASTEL.coral,fontSize:11,cursor:"pointer"}}>🗑 블록 삭제</button>}
            <button onClick={()=>{if(window.confirm("이 쪽의 모든 획을 지울까요?")){snap();updPage({paths:[]});}}} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${theme.border}`,background:"none",color:theme.textSec,fontSize:11,cursor:"pointer"}}>획 전체삭제</button>
          </div>}
        </div>}

        {/* Style/deco panel */}
        {showStylePanel&&<div style={{background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,padding:"12px 14px",marginBottom:5}}>
          {/* Desk */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:theme.textSec,marginBottom:7,fontWeight:600}}>🪵 책상 배경</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {DESK_THEMES.map(d=>(
                <button key={d.id} onClick={()=>setDeskId(d.id)}
                  style={{padding:"5px 10px",borderRadius:8,border:deskId===d.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:theme.bg}}>
                  <div style={{width:18,height:18,borderRadius:4,background:d.bg,border:"1px solid rgba(0,0,0,0.1)"}}/>
                  <span style={{fontSize:11,color:deskId===d.id?PASTEL.coral:theme.text,fontWeight:deskId===d.id?700:400}}>{d.label}</span>
                </button>))}
            </div>
          </div>
          {/* Cover */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:theme.textSec,marginBottom:7,fontWeight:600}}>📔 다이어리 표지</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {COVER_STYLES.map(c=>(
                <button key={c.id} onClick={()=>setCoverId(c.id)}
                  style={{padding:"5px 10px",borderRadius:8,border:coverId===c.id?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6,background:theme.bg}}>
                  <div style={{width:14,height:20,borderRadius:2,background:c.id==="none"?"transparent":theme.card,border:c.border==="none"?"1px dashed "+theme.border:c.border}}/>
                  <span style={{fontSize:11,color:coverId===c.id?PASTEL.coral:theme.text,fontWeight:coverId===c.id?700:400}}>{c.label}</span>
                </button>))}
            </div>
          </div>
          {/* Decorations */}
          <div>
            <div style={{fontSize:11,color:theme.textSec,marginBottom:7,fontWeight:600}}>🌸 책상 꾸미기 <span style={{fontSize:10,fontWeight:400}}>(최대 4개)</span></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {DECO_CATALOG.map(d=>{
                const on=activeDecos.includes(d.id);
                return<button key={d.id} onClick={()=>setActiveDecos(prev=>on?prev.filter(x=>x!==d.id):prev.length<4?[...prev,d.id]:prev)}
                  style={{padding:"5px 9px",borderRadius:8,border:on?`2px solid ${PASTEL.mint}`:`1px solid ${theme.border}`,background:on?`${PASTEL.mint}15`:theme.bg,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:18}}>{d.emoji}</span>
                  <span style={{fontSize:10,color:on?PASTEL.mint:theme.textSec}}>{d.label}</span>
                </button>;
              })}
            </div>
          </div>
        </div>}
      </div>}

      {/* Slash menu */}
      {slashMenu&&filteredCmds.length>0&&<div style={{position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:150,zIndex:500,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.18)",overflow:"hidden",minWidth:220}}>
        {filteredCmds.map(c=>(
          <button key={c.cmd} onMouseDown={e=>{e.preventDefault();execSlash(c.cmd);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer",textAlign:"left"}}>
            <span style={{width:22,textAlign:"center"}}>{c.icon}</span>{c.label}
          </button>))}
      </div>}

      {/* Context menu */}
      {ctxMenu&&<div style={{position:"fixed",left:ctxMenu.sx-10,top:Math.min(ctxMenu.sy-10,window.innerHeight-120),zIndex:500,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.18)",overflow:"hidden"}} onMouseLeave={()=>setCtxMenu(null)}>
        <button onClick={()=>{setCtxMenu(null);setArchivePicker({cx:ctxMenu.cx,cy:ctxMenu.cy});}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 16px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer"}}>📂 아카이브 불러오기</button>
        <button onClick={()=>{setCtxMenu(null);setMathDialog({cx:ctxMenu.cx,cy:ctxMenu.cy});}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 16px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer"}}>∑ 수식 삽입</button>
      </div>}

      {/* Archive picker */}
      {archivePicker&&<div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.42)",display:"flex",alignItems:"flex-end"}} onClick={e=>e.target===e.currentTarget&&setArchivePicker(null)}>
        <div style={{width:"100%",background:theme.card,borderRadius:"20px 20px 0 0",padding:"20px 16px",maxHeight:"72vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontWeight:700,fontSize:15,color:theme.text}}>📂 아카이브 불러오기</span>
            <button onClick={()=>setArchivePicker(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.textSec}}>✕</button>
          </div>
          {(archive||[]).length===0?<p style={{color:theme.textSec,textAlign:"center",fontSize:13,padding:20}}>저장된 아카이브가 없어요</p>
          :(archive||[]).slice(0,30).map(item=>(
            <div key={item.id} style={{border:`1px solid ${theme.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8,background:theme.bg}}>
              <div style={{fontSize:13,fontWeight:600,color:theme.text,marginBottom:4}}>{item.title||"제목 없음"}</div>
              <div style={{fontSize:11,color:theme.textSec,marginBottom:8}}>{item.preview?.slice(0,60)||item.type}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>importArchive(item,"widget")} style={{flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>🔗 위젯</button>
                <button onClick={()=>importArchive(item,"image")} style={{flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer"}}>🖼 이미지</button>
              </div>
            </div>))}
        </div>
      </div>}

      {/* Math dialog */}
      {mathDialog&&<MathDialog theme={theme} initial={mathDialog.initial||""}
        onConfirm={tex=>{ snap(); if(mathDialog.blockId)updBlock(mathDialog.blockId,{tex}); else{const id=`b${Date.now()}`;updPage({blocks:[...curPage.blocks,{id,type:"math",x:mathDialog.cx||40,y:mathDialog.cy||60,w:280,tex}]});} setMathDialog(null); }}
        onCancel={()=>setMathDialog(null)}/>}

      {/* Image upload */}
      <input id="d-img-inp" type="file" accept="image/*" style={{display:"none"}}
        onChange={async e=>{ const file=e.target.files?.[0]; if(!file) return;
          if(file.size>3e6){showMsg("이미지가 너무 커요 (최대 3MB)",2000);return;}
          const url=URL.createObjectURL(file),img=new Image(); img.src=url;
          img.onload=()=>{const MAX=900,sc=Math.min(MAX/img.width,MAX/img.height,1),c=document.createElement("canvas"); c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc); c.getContext("2d").drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
            const dataUrl=c.toDataURL("image/jpeg",0.72); snap(); const id=`b${Date.now()}`; updPage({blocks:[...curPage.blocks,{id,type:"image",x:30,y:30,w:260,dataUrl}]});};
          e.target.value="";}}/>
    </div>
  );
}
