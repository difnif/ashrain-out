// DiaryScreen.jsx — ashrain.out
// Full-featured diary: bezier drawing, KaTeX, slash commands, archive embeds
import { useState, useRef, useEffect, useCallback } from "react";
import { PASTEL } from "../config";
// KaTeX loaded from CDN to avoid Vercel rolldown bundling issues
let _katex = null;
function loadKatex() {
  if (_katex) return Promise.resolve(_katex);
  return new Promise(resolve => {
    if (document.getElementById("katex-css")) { /* already loading */ }
    else {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";
    script.onload = () => { _katex = window.katex; resolve(_katex); };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const TOOL = { PEN: "pen", HIGHLIGHT: "hl", ERASER: "eraser", TEXT: "text", SELECT: "select" };
const BG = { RULED: "ruled", GRID: "grid", DOT: "dot", PLAIN: "plain" };
const MOODS = ["😊","😐","😔","😤","🥱","🤔","💪","🎉","🥳","😴"];
const ERASER_R = 18; // canvas-space radius

const PEN_COLORS = [
  "#2d2d2d","#1a6fc4","#e05252","#2ecc71","#9b59b6","#e67e22","#16a085",
];
const SLASH_CMDS = [
  { cmd: "archive", icon: "📂", label: "아카이브 불러오기" },
  { cmd: "math",    icon: "∑",  label: "수식 (LaTeX)" },
  { cmd: "todo",    icon: "☐",  label: "체크리스트" },
  { cmd: "callout", icon: "💡", label: "강조 박스" },
  { cmd: "toggle",  icon: "▶",  label: "접기/펼치기" },
  { cmd: "divider", icon: "─",  label: "구분선" },
  { cmd: "date",    icon: "📅", label: "날짜 삽입" },
  { cmd: "image",   icon: "🖼", label: "이미지 업로드" },
];


// ─── Brush Engine ─────────────────────────────────────────────────────────────
const BRUSH = {
  PEN:       { id:"PEN",       name:"펜",    emoji:"🖊",  tip:"깔끔한 디지털 펜" },
  PENCIL:    { id:"PENCIL",    name:"연필",  emoji:"✏️",  tip:"종이 결의 연필" },
  PASTEL:    { id:"PASTEL",    name:"파스텔",emoji:"🟣",  tip:"분필 같은 파스텔" },
  CHARCOAL:  { id:"CHARCOAL",  name:"목탄",  emoji:"🌑",  tip:"거친 목탄" },
  WATERCOLOR:{ id:"WATERCOLOR",name:"수채",  emoji:"💧",  tip:"번지는 수채화" },
  OIL:       { id:"OIL",       name:"유채",  emoji:"🖌",  tip:"두꺼운 유채물감" },
  INK:       { id:"INK",       name:"수묵",  emoji:"🎏",  tip:"속도감 있는 수묵" },
  EMBOSS:    { id:"EMBOSS",    name:"엠보싱",emoji:"⬜",  tip:"입체 엠보싱" },
  TEXTURE:   { id:"TEXTURE",   name:"텍스쳐",emoji:"🟫",  tip:"거친 브리슬 붓" },
};
const BRUSH_LIST = Object.values(BRUSH);

// XOR-shift seeded RNG — deterministic per path
function mkRng(s){ let x=(s|0)||12345; return ()=>{ x^=x<<13; x^=x>>17; x^=x<<5; return (x>>>0)/4294967296; }; }

// Color utils
function hexRgb(h){ if(!h||!h.startsWith("#"))return{r:50,g:50,b:50}; const v=h.replace("#",""); return v.length===3?{r:parseInt(v[0]+v[0],16),g:parseInt(v[1]+v[1],16),b:parseInt(v[2]+v[2],16)}:{r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)}; }
function rgba(c,a){ const {r,g,b}=hexRgb(c); return `rgba(${r},${g},${b},${a})`; }
function lighter(c,n){ const {r,g,b}=hexRgb(c); return `rgb(${Math.min(255,r+n)},${Math.min(255,g+n)},${Math.min(255,b+n)})`; }
function darker(c,n){ const {r,g,b}=hexRgb(c); return `rgb(${Math.max(0,r-n)},${Math.max(0,g-n)},${Math.max(0,b-n)})`; }

// Smooth bezier through points on canvas ctx
function csSmooth(ctx,pts){
  if(!pts||pts.length<2)return;
  ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length-1;i++){
    const mx=(pts[i].x+pts[i+1].x)/2, my=(pts[i].y+pts[i+1].y)/2;
    ctx.quadraticCurveTo(pts[i].x,pts[i].y,mx,my);
  }
  ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
}

// ── Brush renderers ──────────────────────────────────────────────────────────
function bPen(ctx,pts,color,size){
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=size; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath(); csSmooth(ctx,pts); ctx.stroke(); ctx.restore();
}

function bHighlight(ctx,pts,color,size){
  ctx.save(); ctx.globalAlpha=0.4; ctx.strokeStyle=color; ctx.lineWidth=size;
  ctx.lineCap="square"; ctx.lineJoin="round";
  ctx.beginPath(); csSmooth(ctx,pts); ctx.stroke(); ctx.restore();
}

function bPencil(ctx,pts,color,size,rng){
  ctx.save();
  const {r,g,b}=hexRgb(color);
  for(let p=0;p<5;p++){
    ctx.globalAlpha=0.12+rng()*0.22; ctx.strokeStyle=`rgb(${r},${g},${b})`;
    ctx.lineWidth=size*(0.2+rng()*0.4); ctx.lineCap="round";
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*size*2.5,oy=(rng()-0.5)*size*2.5; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke();
  }
  for(let i=0;i<pts.length;i++) for(let g2=0;g2<7;g2++){
    ctx.globalAlpha=rng()*0.16; ctx.fillStyle=`rgb(${r},${g},${b})`;
    ctx.fillRect(pts[i].x+(rng()-0.5)*size*2.8,pts[i].y+(rng()-0.5)*size*2.8,rng()*1.3,rng()*1.3);
  }
  ctx.restore();
}

function bPastel(ctx,pts,color,size,rng){
  ctx.save();
  for(let p=0;p<5;p++){
    ctx.save(); ctx.globalAlpha=0.05+rng()*0.06; ctx.strokeStyle=color;
    ctx.lineWidth=size*(2.5+rng()*3.5); ctx.lineCap="round"; ctx.filter=`blur(${size*(0.6+rng()*1)}px)`;
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*size*2.5,oy=(rng()-0.5)*size*2.5; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke(); ctx.restore();
  }
  for(let i=0;i<pts.length;i++) for(let g2=0;g2<14;g2++){
    ctx.globalAlpha=rng()*0.45; ctx.fillStyle=color;
    ctx.fillRect(pts[i].x+(rng()-0.5)*size*2.5,pts[i].y+(rng()-0.5)*size*2.5,0.4+rng()*2.2,0.4+rng()*2.2);
  }
  ctx.restore();
}

function bCharcoal(ctx,pts,color,size,rng){
  ctx.save();
  for(let p=0;p<6;p++){
    ctx.save(); ctx.globalAlpha=0.025+rng()*0.065; ctx.strokeStyle=color;
    ctx.lineWidth=size*(3+rng()*6); ctx.lineCap="round"; ctx.filter=`blur(${size*(1.8+rng()*2.5)}px)`;
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*size*5,oy=(rng()-0.5)*size*5; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke(); ctx.restore();
  }
  for(let p=0;p<4;p++){
    ctx.globalAlpha=0.3+rng()*0.4; ctx.strokeStyle=color; ctx.lineWidth=size*(0.3+rng()*0.7); ctx.lineCap="butt";
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*size*1.2,oy=(rng()-0.5)*size*1.2; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke();
  }
  for(let i=0;i<pts.length;i++) if(rng()>0.3){
    ctx.globalAlpha=rng()*0.6; ctx.fillStyle=color;
    ctx.fillRect(pts[i].x+(rng()-0.5)*size*4.5,pts[i].y+(rng()-0.5)*size*4.5,rng()*3,rng()*1.2);
  }
  ctx.restore();
}

function bWatercolor(ctx,pts,color,size,rng){
  ctx.save();
  for(let p=0;p<12;p++){
    ctx.save(); const spread=size*(0.7+p*0.65);
    ctx.globalAlpha=0.014+rng()*0.013; ctx.strokeStyle=color; ctx.lineWidth=spread;
    ctx.lineCap="round"; ctx.lineJoin="round"; ctx.filter=`blur(${spread*0.2}px)`;
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*spread*0.45,oy=(rng()-0.5)*spread*0.45; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke(); ctx.restore();
  }
  for(let i=0;i<pts.length;i+=2) if(rng()>0.55){
    ctx.save(); const r2=size*(1.8+rng()*3.5);
    ctx.globalAlpha=rng()*0.038; ctx.filter=`blur(${r2*0.5}px)`;
    const grad=ctx.createRadialGradient(pts[i].x,pts[i].y,0,pts[i].x,pts[i].y,r2);
    grad.addColorStop(0,color); grad.addColorStop(0.55,color); grad.addColorStop(1,"transparent");
    ctx.fillStyle=grad; ctx.beginPath();
    ctx.ellipse(pts[i].x+(rng()-0.5)*r2*0.5,pts[i].y+(rng()-0.5)*r2*0.5,r2*(0.7+rng()*0.5),r2*(0.5+rng()*0.6),rng()*Math.PI,0,Math.PI*2);
    ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

function bOil(ctx,pts,color,size,rng){
  ctx.save(); const {r,g,b}=hexRgb(color);
  for(let p=0;p<7;p++){
    const cr=Math.max(0,Math.min(255,r+Math.floor((rng()-0.5)*50)));
    const cg=Math.max(0,Math.min(255,g+Math.floor((rng()-0.5)*50)));
    const cb=Math.max(0,Math.min(255,b+Math.floor((rng()-0.5)*50)));
    ctx.globalAlpha=0.32+rng()*0.48; ctx.strokeStyle=`rgb(${cr},${cg},${cb})`;
    ctx.lineWidth=size*(0.55+rng()*1); ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath();
    pts.forEach((pt,i)=>{ const ox=(rng()-0.5)*size*0.9,oy=(rng()-0.5)*size*0.9; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
    ctx.stroke();
  }
  // Impasto specular
  ctx.globalAlpha=0.38; ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=size*0.25; ctx.lineCap="round";
  ctx.beginPath();
  pts.forEach((pt,i)=>{ const ox=-size*0.28+(rng()-0.5)*size*0.15,oy=-size*0.22; i===0?ctx.moveTo(pt.x+ox,pt.y+oy):ctx.lineTo(pt.x+ox,pt.y+oy); });
  ctx.stroke();
  // Dark shadow edge
  ctx.globalAlpha=0.22; ctx.strokeStyle=darker(color,60); ctx.lineWidth=size*0.18;
  ctx.beginPath(); pts.forEach((pt,i)=>{ i===0?ctx.moveTo(pt.x+size*0.32,pt.y+size*0.32):ctx.lineTo(pt.x+size*0.32,pt.y+size*0.32); }); ctx.stroke();
  ctx.restore();
}

function bInk(ctx,pts,color,size,rng){
  ctx.save(); if(pts.length<2){ctx.restore();return;}
  const spds=pts.map((p,i)=>i===0?1:Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y));
  const maxS=Math.max(...spds,0.5);
  for(let i=1;i<pts.length;i++){
    const sp=spds[i]/maxS, w=size*(0.12+2.8*(1-sp));
    ctx.globalAlpha=Math.min(1,0.45+sp*0.5); ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(pts[i-1].x,pts[i-1].y); ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke();
    if(sp<0.28){
      ctx.save(); ctx.globalAlpha=0.015+rng()*0.02; ctx.filter=`blur(${w*0.85}px)`;
      ctx.strokeStyle=color; ctx.lineWidth=w*3;
      ctx.beginPath(); ctx.moveTo(pts[i-1].x,pts[i-1].y); ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
}

function bEmboss(ctx,pts,color,size,rng){
  ctx.save();
  // Shadow
  ctx.globalAlpha=0.48; ctx.strokeStyle="rgba(0,0,0,0.38)"; ctx.lineWidth=size*1.5;
  ctx.lineCap="round"; ctx.lineJoin="round"; ctx.filter=`blur(${size*0.1}px)`;
  ctx.beginPath(); pts.forEach((pt,i)=>i===0?ctx.moveTo(pt.x+size*0.42,pt.y+size*0.42):ctx.lineTo(pt.x+size*0.42,pt.y+size*0.42)); ctx.stroke();
  // Highlight
  ctx.filter="none"; ctx.globalAlpha=0.62; ctx.strokeStyle="rgba(255,255,255,0.82)"; ctx.lineWidth=size*1.5;
  ctx.beginPath(); pts.forEach((pt,i)=>i===0?ctx.moveTo(pt.x-size*0.42,pt.y-size*0.42):ctx.lineTo(pt.x-size*0.42,pt.y-size*0.42)); ctx.stroke();
  // Midtone
  ctx.globalAlpha=0.2; ctx.strokeStyle=color; ctx.lineWidth=size;
  ctx.beginPath(); csSmooth(ctx,pts); ctx.stroke();
  ctx.restore();
}

function bTexture(ctx,pts,color,size,rng){
  ctx.save();
  for(let i=0;i<pts.length;i++){
    const n=Math.ceil(5+rng()*9);
    for(let d=0;d<n;d++){
      ctx.globalAlpha=0.06+rng()*0.35; ctx.fillStyle=color;
      const dx=(rng()-0.5)*size*3,dy=(rng()-0.5)*size*3;
      const dw=rng()*size*2.2+size*0.15,dh=rng()*size*0.55+size*0.1;
      ctx.save(); ctx.translate(pts[i].x+dx,pts[i].y+dy); ctx.rotate(rng()*Math.PI);
      ctx.fillRect(-dw/2,-dh/2,dw,dh); ctx.restore();
    }
  }
  ctx.globalAlpha=0.18; ctx.strokeStyle=color; ctx.lineWidth=size*0.32; ctx.lineCap="round";
  ctx.beginPath(); csSmooth(ctx,pts); ctx.stroke();
  ctx.restore();
}

// ── Master dispatcher ────────────────────────────────────────────────────────
function renderPath(ctx,path){
  const{pts,color,size,tool:t,brushType="PEN",seed=42}=path;
  if(!pts||pts.length<2)return;
  const rng=mkRng(typeof seed==="number"?seed:42);
  if(t===TOOL.HIGHLIGHT||brushType==="HIGHLIGHT"){bHighlight(ctx,pts,color,size);return;}
  switch(brushType){
    case "PENCIL":    bPencil(ctx,pts,color,size,rng);break;
    case "PASTEL":    bPastel(ctx,pts,color,size,rng);break;
    case "CHARCOAL":  bCharcoal(ctx,pts,color,size,rng);break;
    case "WATERCOLOR":bWatercolor(ctx,pts,color,size,rng);break;
    case "OIL":       bOil(ctx,pts,color,size,rng);break;
    case "INK":       bInk(ctx,pts,color,size,rng);break;
    case "EMBOSS":    bEmboss(ctx,pts,color,size,rng);break;
    case "TEXTURE":   bTexture(ctx,pts,color,size,rng);break;
    default:          bPen(ctx,pts,color,size);
  }
}

// ─── Bezier smoothing (Catmull-Rom → cubic bezier) ───────────────────────────
const F = n => n.toFixed(1);
function smooth(pts) {
  if (!pts || pts.length < 2) return "";
  if (pts.length === 2) return `M${F(pts[0].x)},${F(pts[0].y)}L${F(pts[1].x)},${F(pts[1].y)}`;
  let d = `M${F(pts[0].x)},${F(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${F(cp1x)},${F(cp1y)},${F(cp2x)},${F(cp2y)},${F(p2.x)},${F(p2.y)}`;
  }
  return d;
}

// ─── Image compression ───────────────────────────────────────────────────────
function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

// ─── MathRender component ────────────────────────────────────────────────────
function MathRender({ tex, display = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    loadKatex().then(k => {
      if (!k || !ref.current) return;
      try { k.render(tex || "\\square", ref.current, { throwOnError: false, displayMode: display }); }
      catch { if(ref.current) ref.current.textContent = tex; }
    });
  }, [tex, display]);
  return <span ref={ref} />;
}

// ─── MathDialog ──────────────────────────────────────────────────────────────
function MathDialog({ theme, initial, onConfirm, onCancel }) {
  const [tex, setTex] = useState(initial || "");
  const previewRef = useRef(null);
  useEffect(() => {
    if (!previewRef.current) return;
    loadKatex().then(k => {
      if (!k || !previewRef.current) return;
      try { k.render(tex || "\\square", previewRef.current, { throwOnError: false, displayMode: true }); }
      catch { if(previewRef.current) previewRef.current.textContent = tex; }
    });
  }, [tex]);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:420,background:theme.card,borderRadius:18,padding:20 }}>
        <div style={{ fontWeight:700,fontSize:14,color:theme.text,marginBottom:12 }}>∑ 수식 입력 (LaTeX)</div>
        <input value={tex} onChange={e=>setTex(e.target.value)} placeholder="예: \frac{a}{b} + \sqrt{c^2+1}"
          style={{ width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.bg,color:theme.text,fontSize:13,boxSizing:"border-box",fontFamily:"monospace" }} />
        <div ref={previewRef} style={{ minHeight:52,padding:"10px 4px",textAlign:"center",overflowX:"auto" }} />
        <div style={{ display:"flex",gap:8,marginTop:8 }}>
          <button onClick={onCancel} style={{ flex:1,padding:10,borderRadius:8,border:`1px solid ${theme.border}`,background:"none",color:theme.textSec,cursor:"pointer" }}>취소</button>
          <button onClick={()=>onConfirm(tex)} style={{ flex:1,padding:10,borderRadius:8,border:"none",background:PASTEL.lavender,color:"#3d2d60",fontWeight:700,cursor:"pointer" }}>확인</button>
        </div>
        <div style={{ marginTop:10,fontSize:10,color:theme.textSec,lineHeight:1.6 }}>
          분수: \frac{'{a}'}{'{b}'}　　루트: \sqrt{'{x}'}　　제곱: x^2　　합: \sum_{'{n=1}'}^N　　벡터: \vec{'{v}'}
        </div>
      </div>
    </div>
  );
}

// ─── ArchiveImageBlock (must be a component to use hooks) ────────────────────
function ArchiveImageBlock({ block, theme, isSelected, onTap, onNavigate }) {
  const [longHint, setLongHint] = useState(false);
  const lpRef = useRef(null);
  const { imageContent, title } = block;
  const isText = imageContent?.kind === "text";

  return (
    <div style={{ position:"absolute",left:block.x,top:block.y,width:block.w||260,zIndex:isSelected?20:10,
        outline:isSelected?`2px solid ${PASTEL.lavender}`:"none",borderRadius:12,overflow:"hidden",
        background:theme.card,border:`1px solid ${theme.border}`,userSelect:"none",cursor:"default" }}
      onTouchStart={e=>{ e.stopPropagation(); lpRef.current=setTimeout(()=>setLongHint(true),600); }}
      onTouchEnd={e=>{ e.stopPropagation(); clearTimeout(lpRef.current); }}
      onTouchMove={()=>clearTimeout(lpRef.current)}
      onMouseDown={e=>{ e.stopPropagation(); onTap(block.id); }}
      onDoubleClick={e=>{ e.stopPropagation(); onNavigate?.(block.archiveId); }}>
      <div style={{ padding:"10px 12px",minHeight:50,position:"relative" }}>
        {isText ? (
          <p style={{ fontSize:12,color:theme.text,margin:0,lineHeight:1.65,whiteSpace:"pre-wrap",maxHeight:120,overflow:"hidden" }}>
            {imageContent.text}
          </p>
        ) : (
          <svg width="100%" viewBox="0 0 300 80" preserveAspectRatio="xMidYMid meet" style={{ display:"block" }}>
            {(imageContent?.paths||[]).map((p,i)=>(
              <path key={i} d={smooth(p.pts)} fill="none" stroke={p.color||"#333"} strokeWidth={Math.max(0.8,p.size*0.35)} strokeLinecap="round" />
            ))}
          </svg>
        )}
        <div style={{ fontSize:10,color:theme.textSec,marginTop:4 }}>📎 {title}</div>
      </div>
      {longHint && (
        <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}
          onTouchEnd={()=>setLongHint(false)}>
          <button onClick={()=>{ setLongHint(false); onNavigate?.(block.archiveId); }}
            style={{ padding:"10px 22px",borderRadius:20,background:"white",border:"none",fontWeight:700,fontSize:13,cursor:"pointer",color:"#333" }}>
            📂 아카이브로 이동
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ArchiveWidgetBlock ───────────────────────────────────────────────────────
function ArchiveWidgetBlock({ block, theme, isSelected, onTap, onNavigate }) {
  const typeIcon = block.itemType?.includes("외심")||block.itemType?.includes("내심")||block.itemType?.includes("합동")||block.itemType?.includes("삼각형") ? "📐"
    : block.itemType==="문제분석"||block.itemType==="질문" ? "📝" : "📂";
  return (
    <div style={{ position:"absolute",left:block.x,top:block.y,width:block.w||280,zIndex:isSelected?20:10,
        outline:isSelected?`2px solid ${PASTEL.sky}`:"none",
        background:theme.card,border:`1.5px solid ${theme.border}`,borderRadius:12,
        padding:"10px 14px",cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}
      onMouseDown={e=>{ e.stopPropagation(); onTap(block.id); }}
      onTouchStart={e=>{ e.stopPropagation(); onTap(block.id); }}
      onDoubleClick={e=>{ e.stopPropagation(); onNavigate?.(block.archiveId); }}>
      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
        <span style={{ fontSize:16 }}>{typeIcon}</span>
        <span style={{ fontSize:12,fontWeight:700,color:theme.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{block.title}</span>
      </div>
      {block.preview && <p style={{ fontSize:11,color:theme.textSec,margin:0,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{block.preview}</p>}
      <div style={{ marginTop:6,fontSize:10,color:PASTEL.sky }}>탭 두 번 → 아카이브로 이동 ↗</div>
    </div>
  );
}

// ─── TodoBlock ───────────────────────────────────────────────────────────────
function TodoBlock({ block, theme, isSelected, isEditing, onTap, onDblTap, onChange }) {
  return (
    <div style={{ position:"absolute",left:block.x,top:block.y,width:block.w||280,zIndex:isSelected?20:10,
        outline:isSelected?`2px solid ${PASTEL.mint}`:"none",
        background:theme.card+"cc",border:`1px solid ${theme.border}`,borderRadius:10,padding:"8px 12px" }}
      onMouseDown={e=>{ e.stopPropagation(); onTap(block.id); }}
      onTouchStart={e=>{ e.stopPropagation(); onTap(block.id); }}
      onDoubleClick={e=>{ e.stopPropagation(); onDblTap(block.id); }}>
      {block.items.map((item,i)=>(
        <div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
          <input type="checkbox" checked={item.done} onChange={e=>{
            const items=[...block.items]; items[i]={...items[i],done:e.target.checked};
            onChange(block.id,{items});
          }} style={{ cursor:"pointer",accentColor:PASTEL.mint }} />
          {isEditing ? (
            <input value={item.text} autoFocus={i===block.items.length-1}
              onChange={e=>{ const items=[...block.items]; items[i]={...items[i],text:e.target.value}; onChange(block.id,{items}); }}
              onKeyDown={e=>{ if(e.key==="Enter"){ onChange(block.id,{items:[...block.items,{done:false,text:""}]}); } }}
              style={{ flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,outline:"none" }} />
          ) : (
            <span style={{ fontSize:13,color:theme.text,textDecoration:item.done?"line-through":"none",opacity:item.done?0.45:1 }}>{item.text||"항목"}</span>
          )}
        </div>
      ))}
      {isEditing && (
        <button onClick={e=>{ e.stopPropagation(); onChange(block.id,{items:[...block.items,{done:false,text:""}]}); }}
          style={{ fontSize:11,color:theme.textSec,background:"none",border:"none",cursor:"pointer",marginTop:2 }}>+ 추가</button>
      )}
    </div>
  );
}

// ─── Main DiaryTab ────────────────────────────────────────────────────────────
export default function DiaryTab({ theme, diary, setDiary, playSfx, showMsg, archive, setTab }) {
  const today = new Date().toISOString().slice(0,10);
  const [viewDate, setViewDate] = useState(today);
  const canEdit = viewDate === today;

  // Canvas transform
  const [xf, setXf] = useState({ z:1, tx:0, ty:0 }); // matrix(z,0,0,z,tx,ty)
  const containerRef = useRef(null);
  const baseZoomRef = useRef(1);

  // Drawing
  const [tool, setTool] = useState(TOOL.TEXT);
  const [brushType, setBrushType] = useState("PEN");
  const [penColor, setPenColor] = useState("#2d2d2d");
  const [penSize, setPenSize] = useState(3);
  const [paths, setPaths] = useState([]);
  const [curPts, setCurPts] = useState([]);
  const [eraserPos, setEraserPos] = useState(null);
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);

  // Page text (main textarea content)
  const [pageText, setPageText] = useState("");
  const textareaRef = useRef(null);

  // Blocks (special: math, callout, todo, toggle, archive, image, divider)
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Page meta
  const [mood, setMood] = useState(null);
  const [bgType, setBgType] = useState(BG.RULED);
  const [pageH, setPageH] = useState(1400);

  // Overlays
  const [slashMenu, setSlashMenu] = useState(null); // {blockId, query, x, y}
  const [archivePicker, setArchivePicker] = useState(null); // {cx, cy}
  const [archiveMode, setArchiveMode] = useState(null); // null until item selected
  const [mathDialog, setMathDialog] = useState(null); // {blockId?, cx?, cy?, initial?}
  const [contextMenu, setContextMenu] = useState(null); // {sx, sy, cx, cy}

  // Gesture refs
  const pinchRef = useRef(null);
  const lpRef = useRef(null);
  const lpStartRef = useRef(null);
  const dragRef = useRef(null); // { blockId, startCx, startCy, origX, origY }
  const panRef = useRef(null); // { startX, startY, startTx, startTy }

  // Undo
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const isDrawMode = tool===TOOL.PEN||tool===TOOL.HIGHLIGHT||tool===TOOL.ERASER;
  const isPenLike = tool===TOOL.PEN;

  // ── Canvas rendering ───────────────────────────────────────────────────────
  // Redraw all committed paths to bgCanvas
  useEffect(()=>{
    const bg=bgCanvasRef.current; if(!bg)return;
    bg.width=CANVAS_W; bg.height=pageH;
    const ctx=bg.getContext("2d");
    paths.forEach(p=>renderPath(ctx,p));
  },[paths,pageH]);

  // Draw live stroke to fgCanvas
  useEffect(()=>{
    const fg=fgCanvasRef.current; if(!fg)return;
    if(fg.width!==CANVAS_W||fg.height!==pageH){fg.width=CANVAS_W;fg.height=pageH;}
    const ctx=fg.getContext("2d");
    ctx.clearRect(0,0,CANVAS_W,pageH);
    if(curPts.length<2)return;
    const liveColor=tool===TOOL.HIGHLIGHT?penColor+"55":penColor;
    const liveSize=tool===TOOL.HIGHLIGHT?penSize*4:penSize;
    renderPath(ctx,{id:"cur",pts:curPts,color:liveColor,size:liveSize,tool,
      brushType:tool===TOOL.HIGHLIGHT?"HIGHLIGHT":brushType,seed:999});
  },[curPts,penColor,penSize,tool,brushType,pageH]);

  // ── Load entry ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    const e = diary.find(d=>d.date===viewDate);
    setPaths(e?.paths||[]);
    setBlocks(e?.blocks||[]);
    setPageText(e?.pageText||"");
    setMood(e?.mood||null);
    setBgType(e?.bgType||BG.RULED);
    setSelectedId(null); setEditingId(null); setCurPts([]);
    const bz = baseZoomRef.current;
    setXf({ z:bz, tx:0, ty:0 });
  },[viewDate]);

  // ── Fit zoom on mount ───────────────────────────────────────────────────────
  useEffect(()=>{
    if(containerRef.current){
      const w = containerRef.current.getBoundingClientRect().width;
      const bz = w/CANVAS_W;
      baseZoomRef.current = bz;
      setXf({ z:bz, tx:0, ty:0 });
    }
  },[]);

  // ── Coords ─────────────────────────────────────────────────────────────────
  const s2c = useCallback((sx,sy)=>{
    const r = containerRef.current?.getBoundingClientRect();
    if(!r) return {x:0,y:0};
    return { x:(sx-r.left-xf.tx)/xf.z, y:(sy-r.top-xf.ty)/xf.z };
  },[xf]);

  const evPos = e => {
    const t = e.touches?.[0] || e;
    return { sx: t.clientX, sy: t.clientY, ...s2c(t.clientX, t.clientY) };
  };

  // ── Undo/Redo ───────────────────────────────────────────────────────────────
  const snapshot = useCallback(()=>{
    undoStack.current.push({ paths:JSON.parse(JSON.stringify(paths)), blocks:JSON.parse(JSON.stringify(blocks)) });
    if(undoStack.current.length>60) undoStack.current.shift();
    redoStack.current=[];
  },[paths,blocks]);

  const undo=()=>{
    if(!undoStack.current.length) return;
    redoStack.current.push({ paths:JSON.parse(JSON.stringify(paths)), blocks:JSON.parse(JSON.stringify(blocks)) });
    const p=undoStack.current.pop(); setPaths(p.paths); setBlocks(p.blocks);
  };
  const redo=()=>{
    if(!redoStack.current.length) return;
    undoStack.current.push({ paths:JSON.parse(JSON.stringify(paths)), blocks:JSON.parse(JSON.stringify(blocks)) });
    const p=redoStack.current.pop(); setPaths(p.paths); setBlocks(p.blocks);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const save=()=>{
    setDiary(prev=>{
      const entry={ id:`diary-${viewDate}`, date:viewDate, paths, blocks, pageText, mood, bgType, updatedAt:Date.now() };
      const ex=prev.find(d=>d.date===viewDate);
      if(ex) return prev.map(d=>d.date===viewDate?{...d,...entry}:d);
      return [...prev,{...entry,createdAt:Date.now()}];
    });
    playSfx("success"); showMsg("저장했어요! 📓",1500);
  };

  // ── Block helper ────────────────────────────────────────────────────────────
  const updBlock=(id,patch)=>setBlocks(prev=>prev.map(b=>b.id===id?{...b,...patch}:b));

  // ── Pointer events ──────────────────────────────────────────────────────────
  const onDown = useCallback(e=>{
    if(!canEdit) return;
    const pos = evPos(e);

    // Two-finger → pinch init
    if(e.touches?.length===2){
      clearTimeout(lpRef.current);
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      pinchRef.current={ d0:d, z0:xf.z, tx0:xf.tx, ty0:xf.ty,
        mx0:((e.touches[0].clientX+e.touches[1].clientX)/2)-(containerRef.current?.getBoundingClientRect().left||0),
        my0:((e.touches[0].clientY+e.touches[1].clientY)/2)-(containerRef.current?.getBoundingClientRect().top||0) };
      panRef.current=null; dragRef.current=null; setCurPts([]);
      return;
    }

    // Draw mode
    if(isDrawMode){
      e.preventDefault();
      setCurPts([{x:pos.x,y:pos.y}]);
      // Long press for context menu
      lpStartRef.current={sx:pos.sx,sy:pos.sy,cx:pos.x,cy:pos.y};
      lpRef.current=setTimeout(()=>{
        setContextMenu({sx:lpStartRef.current.sx,sy:lpStartRef.current.sy,cx:lpStartRef.current.cx,cy:lpStartRef.current.cy});
        setCurPts([]);
      },650);
      return;
    }

    // SELECT mode — check for block hit
    if(tool===TOOL.SELECT){
      const hit=[...blocks].reverse().find(b=>
        pos.x>=b.x&&pos.x<=b.x+(b.w||280)&&pos.y>=b.y&&pos.y<=b.y+(b.h||200)
      );
      if(hit){
        setSelectedId(hit.id);
        dragRef.current={blockId:hit.id,startSx:pos.sx,startSy:pos.sy,origX:hit.x,origY:hit.y};
        return;
      }
      setSelectedId(null);
      // Pan
      panRef.current={startSx:pos.sx,startSy:pos.sy,tx0:xf.tx,ty0:xf.ty};
      return;
    }

    // TEXT mode — tap on canvas creates text block
    const hitBlock=[...blocks].reverse().find(b=>
      pos.x>=b.x&&pos.x<=b.x+(b.w||280)&&pos.y>=b.y&&pos.y<=b.y+(b.h||200)
    );
    if(!hitBlock){
      setSelectedId(null); setEditingId(null);
    }
  },[canEdit,isDrawMode,tool,blocks,xf,s2c]);

  const onMove = useCallback(e=>{
    if(!canEdit) return;

    // Pinch zoom
    if(e.touches?.length===2 && pinchRef.current){
      e.preventDefault();
      const r=containerRef.current?.getBoundingClientRect();
      const mx=((e.touches[0].clientX+e.touches[1].clientX)/2)-(r?.left||0);
      const my=((e.touches[0].clientY+e.touches[1].clientY)/2)-(r?.top||0);
      const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      const { d0,z0,tx0,ty0,mx0,my0 }=pinchRef.current;
      const newZ=Math.max(0.3,Math.min(12,z0*(d/d0)));
      // Zoom about pinch center + pan delta
      const cx=(mx0-tx0)/z0, cy=(my0-ty0)/z0;
      const newTx=mx-cx*newZ+(mx-mx0), newTy=my-cy*newZ+(my-my0);
      setXf({z:newZ,tx:newTx,ty:newTy});
      return;
    }

    const t=e.touches?.[0]||e;
    const sx=t.clientX,sy=t.clientY;
    const pos=s2c(sx,sy);

    // Long press cancel on move
    if(lpStartRef.current){
      const dx=sx-lpStartRef.current.sx, dy=sy-lpStartRef.current.sy;
      if(Math.hypot(dx,dy)>8){ clearTimeout(lpRef.current); lpStartRef.current=null; }
    }

    // Eraser
    if(tool===TOOL.ERASER && curPts.length>0){
      e.preventDefault();
      setEraserPos(pos);
      setPaths(prev=>prev.filter(p=>!p.pts.some(pt=>Math.hypot(pt.x-pos.x,pt.y-pos.y)<ERASER_R)));
      return;
    }

    // Drawing
    if(isDrawMode && curPts.length>0){
      e.preventDefault();
      setCurPts(prev=>[...prev,{x:pos.x,y:pos.y}]);
      return;
    }

    // Drag block
    if(dragRef.current){
      e.preventDefault();
      const {blockId,startSx,startSy,origX,origY}=dragRef.current;
      updBlock(blockId,{x:origX+(sx-startSx)/xf.z, y:origY+(sy-startSy)/xf.z});
      return;
    }

    // Pan
    if(panRef.current){
      e.preventDefault();
      const {startSx,startSy,tx0,ty0}=panRef.current;
      setXf(prev=>({...prev,tx:tx0+(sx-startSx),ty:ty0+(sy-startSy)}));
      return;
    }
  },[canEdit,tool,isDrawMode,curPts,xf,s2c,updBlock]);

  const onUp = useCallback(e=>{
    pinchRef.current=null; panRef.current=null; dragRef.current=null;
    clearTimeout(lpRef.current); lpStartRef.current=null;

    if(tool===TOOL.ERASER){ setEraserPos(null); setCurPts([]); return; }

    if(isDrawMode && curPts.length>1){
      snapshot();
      setPaths(prev=>[...prev,{
        id:`p${Date.now()}`,
        pts:curPts,
        color:tool===TOOL.HIGHLIGHT?penColor+"55":penColor,
        size:tool===TOOL.HIGHLIGHT?penSize*4:penSize,
        tool,
        brushType:tool===TOOL.HIGHLIGHT?"HIGHLIGHT":brushType,
        seed:Date.now()%999983,
      }]);
    }
    setCurPts([]);
  },[isDrawMode,tool,curPts,penColor,penSize,snapshot]);

  // ── Canvas tap (TEXT mode) ──────────────────────────────────────────────────
  const onCanvasClick = useCallback(e=>{
    if(isDrawMode||!canEdit) return;
    if(tool===TOOL.SELECT){
      // In select mode, deselect if clicking empty area
      const pos = s2c(e.clientX,e.clientY);
      const hit=[...blocks].reverse().find(b=>
        pos.x>=b.x&&pos.x<=b.x+(b.w||280)&&pos.y>=b.y&&pos.y<=b.y+(b.h||200)
      );
      if(!hit){ setSelectedId(null); setEditingId(null); }
      return;
    }
    if(tool===TOOL.TEXT){
      // Focus the textarea; no floating block created
      textareaRef.current?.focus();
      setSelectedId(null);
    }
  },[isDrawMode,tool,canEdit,s2c,blocks]);

  // ── Slash command ───────────────────────────────────────────────────────────
  const handlePageTextChange=(val)=>{
    setPageText(val);
    const m=val.match(/\/([a-z]*)$/);
    if(m){
      setSlashMenu({blockId:"__page__",query:m[1]});
    } else { setSlashMenu(null); }
  };

  const execSlash=(blockId,cmd)=>{
    setSlashMenu(null);
    // Remove /cmd from pageText
    setPageText(prev=>prev.replace(/\/[a-z]*$/,""));
    const bx=60, by=Math.max(60, (blocks.length*60)+60);
    snapshot();
    if(cmd==="archive"){ setArchivePicker({cx:bx,cy:by}); }
    else if(cmd==="math"){ setMathDialog({cx:bx,cy:by}); }
    else if(cmd==="todo"){
      const id=`blk${Date.now()}`;
      setBlocks(prev=>[...prev,{id,type:"todo",x:bx,y:by,w:280,items:[{done:false,text:""}]}]);
      setEditingId(id);
    } else if(cmd==="callout"){
      const id=`blk${Date.now()}`;
      setBlocks(prev=>[...prev,{id,type:"callout",x:bx,y:by,w:280,color:"#fff9e0",emoji:"💡",text:""}]);
      setEditingId(id);
    } else if(cmd==="toggle"){
      const id=`blk${Date.now()}`;
      setBlocks(prev=>[...prev,{id,type:"toggle",x:bx,y:by,w:280,title:"",content:"",open:true}]);
      setEditingId(id);
    } else if(cmd==="divider"){
      const id=`blk${Date.now()}`;
      setBlocks(prev=>[...prev,{id,type:"divider",x:bx,y:by,w:260}]);
    } else if(cmd==="date"){
      const ds=new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
      updBlock(blockId,{content:(blocks.find(b=>b.id===blockId)?.content||"")+ds});
    } else if(cmd==="image"){
      document.getElementById("diary-img-input")?.click();
    }
  };

  // ── Archive import ──────────────────────────────────────────────────────────
  const importArchive=(item,mode)=>{
    setArchivePicker(null);
    const id=`blk${Date.now()}`;
    const {cx=60,cy=60}=archivePicker||{};
    snapshot();
    if(mode==="widget"){
      setBlocks(prev=>[...prev,{id,type:"archive-widget",x:cx,y:cy,w:280,
        archiveId:item.id,title:item.title,preview:item.preview?.slice(0,80),itemType:item.type}]);
    } else {
      const isDrawPost=item.type?.includes("외심")||item.type?.includes("내심")||item.type?.includes("합동")||item.type?.includes("삼각형");
      const imageContent=isDrawPost
        ?{kind:"svg",paths:item.paths||[]}
        :{kind:"text",text:item.content?.problemText||item.preview||item.title||""};
      setBlocks(prev=>[...prev,{id,type:"archive-image",x:cx,y:cy,w:270,
        archiveId:item.id,imageContent,title:item.title}]);
    }
    playSfx("click"); showMsg("불러왔어요!",1200);
  };

  // ── Navigate to archive ─────────────────────────────────────────────────────
  const goArchive=()=>setTab?.("archive");

  // ── Block renderer ──────────────────────────────────────────────────────────
  const renderBlock=(block)=>{
    const isSel=selectedId===block.id, isEd=editingId===block.id;
    const onTap=(id)=>{ setSelectedId(id); };
    const onDbl=(id)=>{ if(canEdit) setEditingId(id); };

    if(block.type==="archive-image") return (
      <ArchiveImageBlock key={block.id} block={block} theme={theme} isSelected={isSel}
        onTap={onTap} onNavigate={goArchive} />
    );
    if(block.type==="archive-widget") return (
      <ArchiveWidgetBlock key={block.id} block={block} theme={theme} isSelected={isSel}
        onTap={onTap} onNavigate={goArchive} />
    );
    if(block.type==="todo") return (
      <TodoBlock key={block.id} block={block} theme={theme} isSelected={isSel} isEditing={isEd}
        onTap={onTap} onDblTap={onDbl} onChange={updBlock} />
    );

    const base={ position:"absolute",left:block.x,top:block.y,width:block.w||280,zIndex:isSel?20:10 };
    const selOutline={ outline:isSel?`2px solid ${PASTEL.coral}`:"none",borderRadius:8 };

    switch(block.type){
      case "text":
        // Legacy text blocks (migrated entries) — shown inline
        return (
          <div key={block.id} style={{...base,...selOutline,minHeight:24,padding:"2px 4px"}}
            onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
            onTouchStart={e=>{e.stopPropagation();onTap(block.id);}}>
            <div style={{ fontSize:block.fontSize||14,lineHeight:1.65,color:theme.text,whiteSpace:"pre-wrap" }}>
              {block.content}
            </div>
          </div>
        );

      case "math":
        return (
          <div key={block.id} style={{...base,...selOutline,
              background:theme.card,border:`1px solid ${theme.border}`,padding:"8px 12px",cursor:"pointer",
              overflowX:"auto"}}
            onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
            onTouchStart={e=>{e.stopPropagation();onTap(block.id);}}
            onDoubleClick={e=>{e.stopPropagation();if(canEdit)setMathDialog({blockId:block.id,initial:block.tex});}}>
            <MathRender tex={block.tex||"\\square"} />
            {canEdit&&<div style={{fontSize:9,color:theme.textSec,marginTop:2}}>더블탭 → 편집</div>}
          </div>
        );

      case "callout":
        return (
          <div key={block.id} style={{...base,borderRadius:10,
              background:block.color||"#fff9e0",border:`1px solid ${block.color||"#ffe58f"}`,padding:"10px 14px"}}
            onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
            onTouchStart={e=>{e.stopPropagation();onTap(block.id);}}
            onDoubleClick={e=>{e.stopPropagation();onDbl(block.id);}}
            style={{...base,outline:isSel?`2px solid ${PASTEL.yellow}`:undefined,borderRadius:10,
              background:block.color||"#fff9e0",border:`1px solid ${block.color||"#ffe58f"}`,padding:"10px 14px"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:18,lineHeight:1}}>{block.emoji||"💡"}</span>
              {isEd?(
                <textarea autoFocus value={block.text}
                  onChange={e=>updBlock(block.id,{text:e.target.value})}
                  onBlur={()=>setEditingId(null)}
                  style={{flex:1,border:"none",background:"transparent",color:"#5a4000",fontSize:13,resize:"none",outline:"none",lineHeight:1.6}}/>
              ):(
                <span style={{fontSize:13,color:"#5a4000",whiteSpace:"pre-wrap",lineHeight:1.6}}>
                  {block.text||"강조 내용을 입력하세요"}
                </span>
              )}
            </div>
          </div>
        );

      case "toggle":
        return (
          <div key={block.id} style={{...base,outline:isSel?`2px solid ${PASTEL.lavender}`:undefined,
              border:`1px solid ${theme.border}`,background:theme.card+"cc",borderRadius:10,overflow:"hidden"}}
            onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
            onTouchStart={e=>{e.stopPropagation();onTap(block.id);}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",cursor:"pointer",
                borderBottom:block.open?`1px solid ${theme.border}`:"none"}}
              onClick={()=>updBlock(block.id,{open:!block.open})}
              onDoubleClick={e=>{e.stopPropagation();onDbl(block.id);}}>
              <span style={{fontSize:10,transition:"transform 0.2s",transform:block.open?"rotate(90deg)":"",display:"inline-block"}}>▶</span>
              {isEd?(
                <input value={block.title}
                  onChange={e=>updBlock(block.id,{title:e.target.value})}
                  style={{flex:1,border:"none",background:"transparent",color:theme.text,fontSize:13,fontWeight:600,outline:"none"}}/>
              ):(
                <span style={{fontSize:13,fontWeight:600,color:theme.text}}>{block.title||"접기 블록"}</span>
              )}
            </div>
            {block.open&&(
              <div style={{padding:"8px 12px"}} onDoubleClick={e=>{e.stopPropagation();onDbl(block.id);}}>
                {isEd?(
                  <textarea autoFocus value={block.content}
                    onChange={e=>updBlock(block.id,{content:e.target.value})}
                    onBlur={()=>setEditingId(null)}
                    style={{width:"100%",border:"none",background:"transparent",color:theme.text,fontSize:12,resize:"none",outline:"none",lineHeight:1.6}}/>
                ):(
                  <span style={{fontSize:12,color:theme.textSec,whiteSpace:"pre-wrap",lineHeight:1.6}}>
                    {block.content||"내용을 입력하세요"}
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "divider":
        return <div key={block.id} style={{...base,height:1,background:theme.border,borderRadius:1,pointerEvents:"none"}} />;

      case "image":
        return (
          <div key={block.id} style={{...base,...selOutline}}
            onMouseDown={e=>{e.stopPropagation();onTap(block.id);}}
            onTouchStart={e=>{e.stopPropagation();onTap(block.id);}}>
            <img src={block.dataUrl} alt="diary" style={{width:"100%",borderRadius:8,display:"block"}} />
          </div>
        );

      default: return null;
    }
  };

  // ── Background SVG ──────────────────────────────────────────────────────────
  const renderBg=()=>{
    if(bgType===BG.PLAIN) return null;
    const el=[];
    if(bgType===BG.RULED){
      for(let y=48;y<pageH;y+=32) el.push(<line key={y} x1={16} y1={y} x2={CANVAS_W-16} y2={y} stroke={theme.border} strokeWidth={0.6} opacity={0.45}/>);
    } else if(bgType===BG.GRID){
      for(let y=0;y<pageH;y+=32) el.push(<line key={`h${y}`} x1={0} y1={y} x2={CANVAS_W} y2={y} stroke={theme.border} strokeWidth={0.5} opacity={0.3}/>);
      for(let x=0;x<CANVAS_W;x+=32) el.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={pageH} stroke={theme.border} strokeWidth={0.5} opacity={0.3}/>);
    } else if(bgType===BG.DOT){
      for(let y=32;y<pageH;y+=32)
        for(let x=32;x<CANVAS_W;x+=32)
          el.push(<circle key={`${x},${y}`} cx={x} cy={y} r={1.5} fill={theme.border} opacity={0.4}/>);
    }
    return el;
  };

  // Canvas fills available screen space; scrollable when not drawing
  const containerH = Math.max(380, window.innerHeight - 320);
  const filteredCmds = slashMenu ? SLASH_CMDS.filter(c=>c.cmd.startsWith(slashMenu.query)) : [];

  return (
    <div style={{ padding:"12px 16px", userSelect:"none" }}>
      {/* Date nav */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
        <button onClick={()=>{ const d=new Date(viewDate+"T00:00:00"); d.setDate(d.getDate()-1); setViewDate(d.toISOString().slice(0,10)); }}
          style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.text,padding:"4px 8px" }}>◀</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:14,fontWeight:700,color:theme.text }}>
            {new Date(viewDate+"T00:00:00").toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
          </div>
          {viewDate===today&&<span style={{ fontSize:10,color:PASTEL.coral,fontWeight:700 }}>오늘</span>}
          {mood&&<span style={{ fontSize:16,marginLeft:6 }}>{mood}</span>}
        </div>
        <button onClick={()=>{ const d=new Date(viewDate+"T00:00:00"); d.setDate(d.getDate()+1); const n=d.toISOString().slice(0,10); if(n<=today) setViewDate(n); }}
          style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:viewDate<today?theme.text:theme.border,padding:"4px 8px" }}>▶</button>
      </div>

      {/* Mood + bg row */}
      {canEdit&&(
        <div style={{ display:"flex",gap:5,marginBottom:8,alignItems:"center",flexWrap:"wrap" }}>
          <span style={{ fontSize:10,color:theme.textSec }}>기분</span>
          {MOODS.map(m=>(
            <button key={m} onClick={()=>setMood(m===mood?null:m)}
              style={{ background:m===mood?`${PASTEL.peach}60`:"none",border:"none",fontSize:14,cursor:"pointer",
                borderRadius:6,padding:"1px 3px",opacity:(!mood||m===mood)?1:0.35 }}>{m}</button>
          ))}
          <div style={{ marginLeft:"auto",display:"flex",gap:3 }}>
            {[BG.RULED,BG.GRID,BG.DOT,BG.PLAIN].map((b,i)=>(
              <button key={b} onClick={()=>setBgType(b)}
                style={{ fontSize:10,padding:"3px 7px",borderRadius:6,border:`1px solid ${bgType===b?theme.text:theme.border}`,
                  background:bgType===b?theme.border:"none",color:theme.text,cursor:"pointer" }}>
                {["줄","격자","점","빈"][i]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Canvas container ── */}
      <div ref={containerRef} style={{ width:"100%",height:containerH,
          overflowY: isDrawMode ? "hidden" : "auto",
          WebkitOverflowScrolling:"touch",
          borderRadius:14,
          border:`1px solid ${theme.border}`,background:theme.card,position:"relative",
          touchAction: isDrawMode ? "none" : "pan-y",
          cursor: isDrawMode?(tool===TOOL.ERASER?"cell":"crosshair"):tool===TOOL.TEXT?"text":"default" }}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onClick={onCanvasClick}>

        {/* Transformed canvas layer */}
        <div style={{ position:"absolute",width:CANVAS_W,minHeight:pageH,
            transform:`matrix(${xf.z},0,0,${xf.z},${xf.tx},${xf.ty})`,transformOrigin:"0 0" }}>

          {/* BG */}
          <svg width={CANVAS_W} height={pageH} style={{ position:"absolute",top:0,left:0,pointerEvents:"none" }}>
            {renderBg()}
          </svg>

          {/* Drawing — Canvas 2D */}
          <canvas ref={bgCanvasRef} width={CANVAS_W} height={pageH}
            style={{ position:"absolute",top:0,left:0,pointerEvents:"none" }} />
          <canvas ref={fgCanvasRef} width={CANVAS_W} height={pageH}
            style={{ position:"absolute",top:0,left:0,pointerEvents:"none" }} />
          {/* Eraser cursor */}
          {eraserPos&&(
            <svg width={CANVAS_W} height={pageH} style={{ position:"absolute",top:0,left:0,pointerEvents:"none" }}>
              <circle cx={eraserPos.x} cy={eraserPos.y} r={ERASER_R} fill="rgba(255,255,255,0.3)"
                stroke="#aaa" strokeWidth={1/xf.z} strokeDasharray={`${4/xf.z},${3/xf.z}`}/>
            </svg>
          )}

          {/* Main textarea — aligned to ruled lines, always present */}
          <textarea
            ref={textareaRef}
            value={pageText}
            onChange={e=>handlePageTextChange(e.target.value)}
            readOnly={!canEdit}
            placeholder={canEdit ? "여기에 필기하세요... (/ 명령어)" : ""}
            style={{
              position:"absolute", top:0, left:0,
              width:CANVAS_W, minHeight:pageH,
              border:"none", background:"transparent",
              color:theme.text, fontSize:14,
              lineHeight:"32px",
              padding:"8px 20px",
              boxSizing:"border-box",
              resize:"none", outline:"none",
              fontFamily:"'Noto Serif KR', serif",
              zIndex:2,
              pointerEvents: isDrawMode ? "none" : tool===TOOL.TEXT ? "auto" : "none",
              caretColor: theme.text,
              WebkitUserSelect: tool===TOOL.TEXT ? "text" : "none",
            }}
          />

          {/* Blocks (special: math, callout, todo, toggle, archive, image) */}
          <div style={{ position:"absolute",top:0,left:0,width:CANVAS_W,minHeight:pageH,
              zIndex:3, pointerEvents:isDrawMode?"none":"auto" }}>
            {blocks.map(renderBlock)}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      {canEdit&&(
        <div style={{ marginTop:8 }}>
          {/* Tool row */}
          <div style={{ display:"flex",gap:4,marginBottom:6,flexWrap:"wrap" }}>
            {[
              {t:TOOL.TEXT,  icon:"T",  label:"텍스트"},
              {t:TOOL.SELECT,icon:"↖",  label:"선택/이동"},
              {t:TOOL.PEN,   icon:"🖊", label:"펜"},
              {t:TOOL.HIGHLIGHT,icon:"🖌",label:"형광펜"},
              {t:TOOL.ERASER,icon:"⌫", label:"지우개"},
            ].map(({t,icon,label})=>(
              <button key={t} onClick={()=>{ setTool(t); setEditingId(null); setSelectedId(null); }}
                style={{ padding:"7px 11px",borderRadius:10,
                  border:tool===t?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,
                  background:tool===t?`${PASTEL.coral}15`:theme.card,
                  color:tool===t?PASTEL.coral:theme.text,fontSize:11,cursor:"pointer",fontWeight:tool===t?700:400 }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Brush type selector */}
          {tool===TOOL.PEN&&(
            <div style={{ marginBottom:6, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
              <div style={{ display:"flex", gap:4, paddingBottom:2, minWidth:"max-content" }}>
                {BRUSH_LIST.map(br=>{
                  const active=brushType===br.id;
                  return (
                    <button key={br.id} title={br.tip} onClick={()=>setBrushType(br.id)}
                      style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center",
                        gap:1, padding:"4px 8px", borderRadius:10, cursor:"pointer",
                        border:active?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,
                        background:active?`${PASTEL.coral}18`:theme.card,
                        color:active?PASTEL.coral:theme.text }}>
                      <span style={{ fontSize:17 }}>{br.emoji}</span>
                      <span style={{ fontSize:9, fontWeight:active?700:400, whiteSpace:"nowrap" }}>{br.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pen options */}
          {(tool===TOOL.PEN||tool===TOOL.HIGHLIGHT)&&(
            <div style={{ display:"flex",gap:5,alignItems:"center",marginBottom:6,flexWrap:"wrap" }}>
              {["#2d2d2d","#555","#1a6fc4","#e05252","#2ecc71","#9b59b6","#e67e22","#16a085","#c8956c","#f8f0e0"].map(col=>(
                <button key={col} onClick={()=>setPenColor(col)}
                  style={{ width:22,height:22,borderRadius:11,background:col,
                    border:penColor===col?"3px solid white":"1px solid #ccc",
                    boxShadow:penColor===col?`0 0 0 2px ${col}`:"none",cursor:"pointer" }}/>
              ))}
              <div style={{ marginLeft:4,display:"flex",gap:3 }}>
                {[1,2,4,8].map(s=>(
                  <button key={s} onClick={()=>setPenSize(s)}
                    style={{ width:28,height:28,borderRadius:6,
                      border:penSize===s?`2px solid ${PASTEL.coral}`:`1px solid ${theme.border}`,
                      background:theme.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <div style={{ width:Math.min(s*2+2,18),height:Math.min(s*2+2,18),borderRadius:"50%",background:penColor }}/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected block actions */}
          {selectedId&&!isDrawMode&&(
            <div style={{ display:"flex",gap:6,marginBottom:6,alignItems:"center" }}>
              <span style={{ fontSize:11,color:theme.textSec }}>선택됨</span>
              {editingId!==selectedId&&blocks.find(b=>b.id===selectedId)?.type!=="divider"&&(
                <button onClick={()=>setEditingId(selectedId)}
                  style={{ padding:"5px 11px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer" }}>✏️ 편집</button>
              )}
              <button onClick={()=>{ snapshot(); setBlocks(prev=>prev.filter(b=>b.id!==selectedId)); setSelectedId(null); }}
                style={{ padding:"5px 11px",borderRadius:8,border:`1px solid ${PASTEL.coral}`,background:`${PASTEL.coral}10`,color:PASTEL.coral,fontSize:11,cursor:"pointer" }}>🗑 삭제</button>
              <button onClick={()=>setSelectedId(null)}
                style={{ padding:"5px 11px",borderRadius:8,border:`1px solid ${theme.border}`,background:"none",color:theme.textSec,fontSize:11,cursor:"pointer" }}>✕</button>
            </div>
          )}

          {/* Bottom row */}
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",alignItems:"center" }}>
            <button onClick={undo} style={{ padding:"6px 10px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer" }}>↩ 되돌리기</button>
            <button onClick={redo} style={{ padding:"6px 10px",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:11,cursor:"pointer" }}>↪ 다시하기</button>
            <button onClick={()=>{ if(window.confirm("모든 획을 지울까요?")){ snapshot(); setPaths([]); } }}
              style={{ padding:"6px 10px",borderRadius:8,border:`1px solid ${PASTEL.coral}`,background:"none",color:PASTEL.coral,fontSize:11,cursor:"pointer" }}>🗑 획 전체삭제</button>
            <button onClick={save}
              style={{ marginLeft:"auto",padding:"7px 18px",borderRadius:10,border:"none",background:PASTEL.coral,color:"white",fontSize:12,fontWeight:700,cursor:"pointer" }}>💾 저장</button>
          </div>
        </div>
      )}

      {/* ── Overlays ── */}

      {/* Slash menu */}
      {slashMenu&&filteredCmds.length>0&&(
        <div style={{ position:"fixed",left:"50%",transform:"translateX(-50%)",bottom:140,
            zIndex:500,background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,
            boxShadow:"0 4px 20px rgba(0,0,0,0.18)",overflow:"hidden",minWidth:220 }}>
          {filteredCmds.map(c=>(
            <button key={c.cmd} onMouseDown={e=>{e.preventDefault();execSlash(slashMenu.blockId,c.cmd);}}
              style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",
                border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer",textAlign:"left" }}>
              <span style={{ width:22,textAlign:"center" }}>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      )}

      {/* Context menu (long press in draw mode) */}
      {contextMenu&&(
        <div style={{ position:"fixed",left:contextMenu.sx-10,top:contextMenu.sy-10,zIndex:500,
            background:theme.card,border:`1px solid ${theme.border}`,borderRadius:12,
            boxShadow:"0 4px 20px rgba(0,0,0,0.18)",overflow:"hidden",minWidth:200 }}
          onMouseLeave={()=>setContextMenu(null)}>
          <button onClick={()=>{ setContextMenu(null); setArchivePicker({cx:contextMenu.cx,cy:contextMenu.cy}); }}
            style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 16px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer" }}>
            📂 아카이브 불러오기
          </button>
          <button onClick={()=>{ setContextMenu(null); setMathDialog({cx:contextMenu.cx,cy:contextMenu.cy}); }}
            style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 16px",border:"none",background:"none",color:theme.text,fontSize:13,cursor:"pointer" }}>
            ∑ 수식 삽입
          </button>
        </div>
      )}

      {/* Archive picker */}
      {archivePicker&&(
        <div style={{ position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.42)",display:"flex",alignItems:"flex-end" }}
          onClick={e=>e.target===e.currentTarget&&setArchivePicker(null)}>
          <div style={{ width:"100%",background:theme.card,borderRadius:"20px 20px 0 0",padding:"20px 16px",maxHeight:"72vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <span style={{ fontWeight:700,fontSize:15,color:theme.text }}>📂 아카이브 불러오기</span>
              <button onClick={()=>setArchivePicker(null)} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:theme.textSec }}>✕</button>
            </div>
            {(archive||[]).length===0?(
              <p style={{ color:theme.textSec,textAlign:"center",fontSize:13,padding:20 }}>저장된 아카이브가 없어요</p>
            ):(archive||[]).slice(0,30).map(item=>(
              <div key={item.id} style={{ border:`1px solid ${theme.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8,background:theme.bg }}>
                <div style={{ fontSize:13,fontWeight:600,color:theme.text,marginBottom:4 }}>{item.title||"제목 없음"}</div>
                <div style={{ fontSize:11,color:theme.textSec,marginBottom:8 }}>{item.preview?.slice(0,60)||item.type}</div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>importArchive(item,"widget")}
                    style={{ flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer" }}>
                    🔗 위젯
                  </button>
                  <button onClick={()=>importArchive(item,"image")}
                    style={{ flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${theme.border}`,background:theme.card,color:theme.text,fontSize:12,cursor:"pointer" }}>
                    🖼 이미지
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Math dialog */}
      {mathDialog&&(
        <MathDialog theme={theme} initial={mathDialog.initial||""}
          onConfirm={tex=>{
            snapshot();
            if(mathDialog.blockId){
              updBlock(mathDialog.blockId,{tex});
            } else {
              const id=`blk${Date.now()}`;
              setBlocks(prev=>[...prev,{id,type:"math",x:mathDialog.cx||60,y:mathDialog.cy||60,w:300,tex}]);
            }
            setMathDialog(null);
          }}
          onCancel={()=>setMathDialog(null)} />
      )}

      {/* Image upload */}
      <input id="diary-img-input" type="file" accept="image/*" style={{ display:"none" }}
        onChange={async e=>{
          const file=e.target.files?.[0];
          if(!file) return;
          if(file.size>3e6){ showMsg("이미지가 너무 커요 (최대 3MB)",2000); return; }
          const dataUrl=await compressImage(file);
          snapshot();
          const id=`blk${Date.now()}`;
          setBlocks(prev=>[...prev,{id,type:"image",x:40,y:40,w:280,dataUrl}]);
          e.target.value="";
        }} />
    </div>
  );
}
