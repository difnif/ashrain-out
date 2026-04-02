// DiaryDeskScene.jsx — 3D CSS perspective desk with VR parallax
// Tilt table, preserve-3d objects, device orientation, draggable decos
import React, { useState, useRef, useEffect, useCallback } from "react";
import { DECO_CATALOG } from "./DiaryConfig";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TILT_X = 52; // table tilt degrees
const SIN_T = Math.sin((TILT_X * Math.PI) / 180);
const COS_T = Math.cos((TILT_X * Math.PI) / 180);

function coverBg(coverId) {
  const map = {
    brown: "linear-gradient(145deg,#5a2e10 0%,#8B5E3C 40%,#6b3e1e 70%,#7a4a28 100%)",
    navy:  "linear-gradient(145deg,#0a1525 0%,#1a2a4a 45%,#0f1e38 100%)",
    bordeaux: "linear-gradient(145deg,#3a0e1a 0%,#6b1e2e 45%,#4a1222 100%)",
    forest: "linear-gradient(145deg,#162812 0%,#2d4a28 45%,#1e3818 100%)",
    gold:  "linear-gradient(145deg,#6a4808 0%,#c8a84b 45%,#9a7020 100%)",
    simple: "linear-gradient(145deg,#d0c8b8,#e8e0d0)",
    none:  "linear-gradient(145deg,#d8d0c0,#ece4d4)",
  };
  return map[coverId] || map.brown;
}

function coverSpineColor(coverId) {
  const map = {
    brown: "#3a1c08", navy: "#060f1e", bordeaux: "#220810",
    forest: "#0e1c0a", gold: "#3a2804", simple: "#b0a898", none: "#c0b8a8",
  };
  return map[coverId] || "#3a1c08";
}

// Screen coords → table coords (inverse of rotateX + perspective)
function screenToTable(screenDx, screenDy) {
  return { x: screenDx, y: screenDy / SIN_T };
}

// ─── Thrown animation keyframes (injected once) ───────────────────────────────
let _animInjected = false;
function injectAnim() {
  if (_animInjected) return; _animInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes diaryLand {
      0%   { transform: translateZ(120px) rotate(-15deg) scale(1.12); opacity:0.7; }
      60%  { transform: translateZ(6px)   rotate(var(--land-r))  scale(1.02); }
      75%  { transform: translateZ(9px)   rotate(calc(var(--land-r)*0.6)) scale(1.01); }
      88%  { transform: translateZ(4px)   rotate(var(--land-r)); }
      100% { transform: translateZ(4px)   rotate(var(--land-r)); }
    }
    @keyframes shadowPulse {
      0%   { opacity:0.1; transform: scale(0.5); }
      100% { opacity:0.35; transform: scale(1); }
    }
    @keyframes decoFloat {
      0%,100% { transform: translateZ(6px) translateY(0px); }
      50%      { transform: translateZ(6px) translateY(-3px); }
    }
  `;
  document.head.appendChild(s);
}

// ─── DeskScene3D ──────────────────────────────────────────────────────────────
export default function DeskScene3D({
  deskTheme, coverStyle, diaryState, thrownXfm,
  decos, onDiaryClick, onDecoDragEnd, theme,
}) {
  injectAnim();

  // Device orientation → parallax
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => {
      const gx = Math.max(-20, Math.min(20, (e.gamma || 0)));
      const gy = Math.max(-12, Math.min(12, ((e.beta || 45) - 45)));
      setParallax({ x: gx * 0.45, y: gy * 0.45 });
    };
    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(r => {
        if (r === "granted") window.addEventListener("deviceorientation", handler);
      }).catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handler);
    }
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  // Mouse parallax fallback
  const containerRef = useRef(null);
  const onMouseMove = useCallback((e) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setParallax({ x: nx * 8, y: ny * 5 });
  }, []);
  const onMouseLeave = useCallback(() => setParallax({ x: 0, y: 0 }), []);

  // Deco positions (table-local %)
  const [decoPos, setDecoPos] = useState(() =>
    decos.reduce((a, d) => ({
      ...a,
      [d.id]: d.pos || { x: 30 + Math.random() * 40, y: 15 + Math.random() * 45 },
    }), {})
  );
  const dragRef = useRef(null);

  const onDecoPtrDown = useCallback((e, id) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, orig: { ...(decoPos[id] || { x: 50, y: 50 }) } };
  }, [decoPos]);

  const onDecoPtrMove = useCallback((e) => {
    if (!dragRef.current) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const { id, startX, startY, orig } = dragRef.current;
    const tableDelta = screenToTable(e.clientX - startX, e.clientY - startY);
    const scaleX = 100 / r.width, scaleY = 100 / (r.height * 1.5); // approximate table height
    const nx = Math.max(5, Math.min(88, orig.x + tableDelta.x * scaleX));
    const ny = Math.max(5, Math.min(88, orig.y + tableDelta.y * scaleY));
    setDecoPos(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  }, []);

  const onDecoPtrUp = useCallback((e) => {
    if (!dragRef.current) return;
    onDecoDragEnd?.(dragRef.current.id, decoPos[dragRef.current.id]);
    dragRef.current = null;
  }, [decoPos, onDecoDragEnd]);

  const isThrown = diaryState === "desk-thrown";
  const landR = thrownXfm?.angle || 0;
  const tx = thrownXfm?.tx || 0;
  const ty = thrownXfm?.ty || 0;

  // Room background — dark gradient top → table color transition
  const roomBg = `linear-gradient(185deg, 
    #0d0d18 0%, #131320 20%, #1a1830 38%,
    ${deskTheme.bg.includes("gradient") ? "#8a6030" : deskTheme.bg} 100%)`;

  return (
    <div ref={containerRef}
      style={{
        width: "100%", height: 330, position: "relative",
        overflow: "hidden", borderRadius: 16,
        perspective: "700px",
        perspectiveOrigin: `${50 + parallax.x}% ${28 + parallax.y}%`,
        background: roomBg,
        boxShadow: "inset 0 -3px 24px rgba(0,0,0,0.4)",
        transition: "perspective-origin 0.15s ease",
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onPointerMove={onDecoPtrMove}
      onPointerUp={onDecoPtrUp}
    >
      {/* ── Room ambient — ceiling light bloom ── */}
      <div style={{
        position: "absolute", top: -60, left: "50%",
        transform: "translateX(-50%)",
        width: 220, height: 120,
        background: "radial-gradient(ellipse at center, rgba(255,240,200,0.18) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Back wall (fades into room) ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "42%",
        background: "linear-gradient(180deg,#0a0a18 0%,rgba(20,18,36,0.9) 60%,transparent 100%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      {/* ── Table group (3D tilted) ── */}
      <div style={{
        position: "absolute", bottom: -60, left: -5, right: -5,
        height: 520,
        transformStyle: "preserve-3d",
        transform: `rotateX(${TILT_X}deg)`,
        transformOrigin: "50% 100%",
      }}>
        {/* Table surface */}
        <div style={{
          position: "absolute", inset: 0,
          background: deskTheme.bg,
          transformStyle: "preserve-3d",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.3)",
          overflow: "visible",
        }}>
          {/* Surface sheen */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)",
            pointerEvents: "none",
          }} />

          {/* Wood grain lines (subtle) */}
          {deskTheme.id === "oak" || deskTheme.id === "dark" || deskTheme.id === "linen" ? (
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06, pointerEvents: "none" }}>
              {[8, 22, 38, 55, 70, 84, 96].map(y => (
                <path key={y} d={`M0,${y}% Q30%,${y - 1}% 60%,${y + 0.5}% T 100%,${y}%`}
                  fill="none" stroke="#000" strokeWidth="1.5" />
              ))}
            </svg>
          ) : null}

          {/* Perspective grid (VR feel) */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, pointerEvents: "none" }}>
            {[10, 25, 40, 55, 70, 85].map(x => (
              <line key={`v${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#000" strokeWidth="0.8" />
            ))}
            {[15, 30, 45, 60, 75, 90].map(y => (
              <line key={`h${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#000" strokeWidth="0.5" />
            ))}
          </svg>

          {/* ── Decorations ── */}
          {decos.map(d => {
            const cat = DECO_CATALOG.find(c => c.id === d.id);
            if (!cat) return null;
            const pos = decoPos[d.id] || { x: 20, y: 20 };
            return (
              <div key={d.id}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`, top: `${pos.y}%`,
                  transformStyle: "preserve-3d",
                  transform: "translateZ(6px)",
                  cursor: "grab",
                  touchAction: "none",
                  userSelect: "none",
                  zIndex: 15,
                  animation: "decoFloat 3.5s ease-in-out infinite",
                  animationDelay: `${cat.baseSize * 0.05}s`,
                }}
                onPointerDown={e => onDecoPtrDown(e, d.id)}
              >
                {/* Shadow on table */}
                <div style={{
                  position: "absolute",
                  bottom: -8, left: "50%",
                  transform: "translateX(-50%) translateZ(-6px)",
                  width: cat.baseSize * 0.9,
                  height: cat.baseSize * 0.25,
                  background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 70%)",
                  borderRadius: "50%",
                  animation: "shadowPulse 3.5s ease-in-out infinite",
                  animationDelay: `${cat.baseSize * 0.05}s`,
                }} />
                {/* Emoji */}
                <span style={{
                  fontSize: cat.baseSize,
                  lineHeight: 1,
                  display: "block",
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                }}>
                  {cat.emoji}
                </span>
              </div>
            );
          })}

          {/* ── Diary book ── */}
          <div
            style={{
              position: "absolute",
              left: `${50 + (isThrown ? (tx / 3) : 0)}%`,
              top: `${38 + (isThrown ? (ty / 3) : 0)}%`,
              transformStyle: "preserve-3d",
              transform: isThrown
                ? `translateZ(4px) rotate(${landR}deg)`
                : "translateZ(4px) rotate(-2deg)",
              transformOrigin: "center center",
              animation: isThrown ? `diaryLand 0.6s cubic-bezier(0.22,1,0.36,1) forwards` : "none",
              "--land-r": `${landR}deg`,
              cursor: "pointer",
              zIndex: 20,
            }}
            onClick={onDiaryClick}
          >
            {/* Book shadow */}
            <div style={{
              position: "absolute",
              bottom: -12, left: "8%",
              width: "84%", height: 16,
              background: "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)",
              borderRadius: "50%",
              transform: "translateZ(-4px)",
            }} />

            {/* Book body — 3D box */}
            <div style={{
              width: 110, height: 150,
              transformStyle: "preserve-3d",
              position: "relative",
            }}>
              {/* Front cover (top face as viewed in 3D) */}
              <div style={{
                position: "absolute", inset: 0,
                background: coverBg(coverStyle?.id),
                borderRadius: "2px 4px 4px 2px",
                boxShadow: isThrown
                  ? "0 4px 16px rgba(0,0,0,0.5)"
                  : "0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
                overflow: "hidden",
              }}>
                {/* Spine shadow on cover */}
                <div style={{
                  position: "absolute", left: 0, top: 0, width: 14, height: "100%",
                  background: "linear-gradient(90deg,rgba(0,0,0,0.4),transparent)",
                }} />
                {/* Cover inner border */}
                <div style={{
                  position: "absolute", left: 18, right: 6, top: 10, bottom: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 2,
                }} />
                {/* Cover text */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 4,
                }}>
                  <span style={{ fontSize: 22, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>📔</span>
                  <span style={{
                    fontSize: 8, letterSpacing: "0.18em",
                    color: "rgba(255,255,255,0.5)", fontFamily: "serif",
                  }}>DIARY</span>
                </div>
                {/* Sheen */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(125deg, rgba(255,255,255,0.12) 0%, transparent 45%)",
                  pointerEvents: "none",
                }} />
              </div>

              {/* Spine (left face) */}
              <div style={{
                position: "absolute", left: 0, top: 0,
                width: 10, height: "100%",
                background: coverSpineColor(coverStyle?.id),
                transform: "translateX(-10px) rotateY(-90deg)",
                transformOrigin: "right center",
                borderRadius: "2px 0 0 2px",
              }} />

              {/* Pages (right edge) */}
              <div style={{
                position: "absolute", right: 0, top: 2, bottom: 2,
                width: 7,
                background: "repeating-linear-gradient(90deg, #f0ece4 0px, #e8e4dc 1px, #f0ece4 2px)",
                transform: "translateX(7px) rotateY(90deg)",
                transformOrigin: "left center",
                borderRadius: "0 1px 1px 0",
                boxShadow: "inset -2px 0 4px rgba(0,0,0,0.15)",
              }} />

              {/* Bottom face (thickness) */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: 6,
                background: coverSpineColor(coverStyle?.id),
                transform: "translateY(6px) rotateX(-90deg)",
                transformOrigin: "top center",
                opacity: 0.8,
              }} />
            </div>

            {/* Thrown hint */}
            {isThrown && (
              <div style={{
                position: "absolute", bottom: -26, left: "50%",
                transform: "translateX(-50%)",
                fontSize: 9, color: "rgba(220,190,100,0.7)",
                whiteSpace: "nowrap", fontFamily: "serif",
                pointerEvents: "none",
              }}>
                탭하여 옵션 ✦
              </div>
            )}
          </div>
        </div>

        {/* Table front edge (3D thickness) */}
        <div style={{
          position: "absolute", bottom: -18, left: 0, right: 0, height: 18,
          background: deskTheme.id === "dark"
            ? "linear-gradient(180deg,#2a1c12,#1a0e08)"
            : deskTheme.id === "felt"
            ? "linear-gradient(180deg,#1e3818,#142810)"
            : "linear-gradient(180deg,#9a7040,#7a5028)",
          transform: "rotateX(-90deg)",
          transformOrigin: "top center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
        }} />

        {/* Table legs hint (side shadows) */}
        <div style={{
          position: "absolute", bottom: -80, left: 8, width: 14,
          height: 80, background: "linear-gradient(180deg,rgba(0,0,0,0.6),transparent)",
          borderRadius: 3, transform: "rotateX(-90deg) skewY(-5deg)",
          transformOrigin: "top center",
        }} />
        <div style={{
          position: "absolute", bottom: -80, right: 8, width: 14,
          height: 80, background: "linear-gradient(180deg,rgba(0,0,0,0.6),transparent)",
          borderRadius: 3, transform: "rotateX(-90deg) skewY(5deg)",
          transformOrigin: "top center",
        }} />
      </div>

      {/* Floor reflection glow below table */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
        background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent)",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Ambient light spot */}
      <div style={{
        position: "absolute", top: "15%", left: "45%",
        width: 160, height: 60,
        background: "radial-gradient(ellipse, rgba(255,240,200,0.07) 0%, transparent 70%)",
        transform: "translateX(-50%)",
        pointerEvents: "none", zIndex: 3,
      }} />
    </div>
  );
}
