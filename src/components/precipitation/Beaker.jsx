// src/components/precipitation/Beaker.jsx
// 비커 + 용질 Canvas 애니메이션 (재설계)
//
// 핵심 변경:
//   1) 포화 상태 = 단색 용액 (입자 점 없음) — 용질 색으로 tint
//   2) 석출 시작 → 입자 나타남 → 결정 → 덩어리
//   3) 비중 > 물(1.0): 아래로 가라앉음 / 비중 < 1: 위로 부유
//   4) 순차 phase: empty → fillingWater → addingSolute → saturated → cooling → cold
//
// 물 밀도 기준 1.0g/cm³. 용질들:
//   KNO₃ 2.11, NaCl 2.16, CuSO₄ 2.28, H₃BO₃ 1.44, NH₄Cl 1.52 — 전부 >1이므로 실제로는 모두 침전
//   (가벼운 물질 로직은 미래 확장용)

import { useEffect, useRef } from 'react';
import { SUBSTANCES } from '../../data/solubilityData';

const WATER_BASE = { r: 223, g: 238, b: 246 }; // 연한 맑은 파랑

/**
 * props:
 *   substanceId
 *   waterMass         물의 양 (g)
 *   dissolvedMass     녹아있는 용질 양 (g) — 단색 농도에 반영
 *   precipitatedMass  석출된 양 (g)        — 결정 개수/크기에 반영
 *   maxDissolvedMass  물에 녹아있을 수 있던 최대량 (tint 정규화용)
 *   temperature       현재 온도
 *   phase             'empty' | 'fillingWater' | 'addingSolute' | 'saturated' | 'cooling' | 'cold'
 *   height            Canvas 높이 (기본 320)
 */
export default function Beaker({
  substanceId = 'KNO3',
  waterMass = 100,
  dissolvedMass = 0,
  precipitatedMass = 0,
  maxDissolvedMass = 1,
  temperature = 20,
  phase = 'saturated',
  height = 320,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const crystalsRef = useRef([]);
  const paramKeyRef = useRef(null);
  // 물 높이 애니메이션용 (fillingWater)
  const waterLevelRef = useRef(0); // 0~1
  const soluteAnimRef = useRef(0); // 0~1, addingSolute 시 tint 서서히 진해짐

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const sub = SUBSTANCES[substanceId] || SUBSTANCES.KNO3;
    const isLighterThanWater = sub.density < 1.0; // 미래 확장용
    const densityFactor = Math.min(1, Math.abs(sub.density - 1.0) / 1.3); // 침전/부유 속도

    // 물 높이 비율 (waterMass에 비례, 최대 0.85)
    const waterRatio = Math.min(0.85, 0.25 + waterMass / 400);

    // === Phase에 따른 타깃 값 ===
    // waterLevel: 물 높이 (0~1)
    // soluteAnim: 용액 색 진함 정도 (0~1)
    // dissolvedRatio: tint 농도 계산용
    const dissolvedRatio = maxDissolvedMass > 0
      ? Math.min(1, dissolvedMass / maxDissolvedMass)
      : 0;

    let targetWaterLevel, targetSoluteAnim;
    switch (phase) {
      case 'empty':
        targetWaterLevel = 0;
        targetSoluteAnim = 0;
        break;
      case 'fillingWater':
        targetWaterLevel = 1;
        targetSoluteAnim = 0;
        break;
      case 'addingSolute':
        targetWaterLevel = 1;
        targetSoluteAnim = dissolvedRatio;
        break;
      default:
        targetWaterLevel = 1;
        targetSoluteAnim = dissolvedRatio;
    }

    // === 결정 생성 로직 ===
    // precipitatedMass에 따라 crystal 개수 & 크기
    const crystalCount = Math.min(40, Math.max(0, Math.floor(precipitatedMass * 0.8)));

    const paramKey = `${substanceId}|${Math.round(waterMass)}|${crystalCount}|${phase}|${isLighterThanWater}`;
    if (paramKeyRef.current !== paramKey) {
      paramKeyRef.current = paramKey;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const beakerPad = 30;
      const beakerTop = 40;
      const beakerBottom = h - 25;
      const beakerLeft = beakerPad;
      const beakerRight = w - beakerPad;
      const beakerWidth = beakerRight - beakerLeft;
      const waterTopBase = beakerBottom - (beakerBottom - beakerTop) * waterRatio;

      crystalsRef.current = Array.from({ length: crystalCount }, (_, i) => {
        let restYBase, fallFrom;
        if (isLighterThanWater) {
          // 부유: 수면 근처에 쌓임
          const stackLevel = Math.floor(i / 10);
          restYBase = waterTopBase + 8 + stackLevel * 5;
          fallFrom = beakerBottom - 10 - Math.random() * 30; // 아래에서 솟아오름
        } else {
          // 침전: 바닥에 쌓임
          const stackLevel = Math.floor(i / 12);
          restYBase = beakerBottom - 8 - stackLevel * 6;
          fallFrom = waterTopBase + Math.random() * 15; // 수면 근처에서 떨어짐
        }
        const posInLevel = i % 12;
        const xBase = beakerLeft + 15 + (posInLevel / 11) * (beakerWidth - 30);
        const isLargeCrystal = Math.random() < 0.25;
        const size = isLargeCrystal ? 4.5 + Math.random() * 2.5 : 2.2 + Math.random() * 1.8;

        return {
          x: xBase + (Math.random() - 0.5) * 10,
          currentY: phase === 'cooling' ? fallFrom : restYBase,
          targetY: restYBase + (Math.random() - 0.5) * 3,
          size,
          rotation: Math.random() * Math.PI,
          settleSpeed: 0.4 + densityFactor * 1.5,
          direction: isLighterThanWater ? -1 : 1, // 1 = 아래로, -1 = 위로
          settled: phase !== 'cooling',
        };
      });
    }

    let time = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      time += 1;

      ctx.clearRect(0, 0, w, h);

      const beakerPad = 30;
      const beakerTop = 40;
      const beakerBottom = h - 25;
      const beakerLeft = beakerPad;
      const beakerRight = w - beakerPad;
      const beakerWidth = beakerRight - beakerLeft;
      const waterTopBase = beakerBottom - (beakerBottom - beakerTop) * waterRatio;

      // 애니메이션 값 보간
      waterLevelRef.current += (targetWaterLevel - waterLevelRef.current) * 0.08;
      soluteAnimRef.current += (targetSoluteAnim - soluteAnimRef.current) * 0.06;

      const currentWaterLevel = waterLevelRef.current;
      const currentSoluteAnim = soluteAnimRef.current;
      const waterTop = beakerBottom - (beakerBottom - waterTopBase) * currentWaterLevel;

      // === 그림자 ===
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(w / 2, beakerBottom + 8, beakerWidth / 2 + 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // === 용액 (단색 tint) ===
      if (currentWaterLevel > 0.02) {
        const sr = lerp(WATER_BASE.r, hexR(sub.displayColor), currentSoluteAnim * 0.55);
        const sg = lerp(WATER_BASE.g, hexG(sub.displayColor), currentSoluteAnim * 0.55);
        const sb = lerp(WATER_BASE.b, hexB(sub.displayColor), currentSoluteAnim * 0.55);
        const topColor = `rgba(${Math.round(sr)}, ${Math.round(sg)}, ${Math.round(sb)}, 0.78)`;
        const botColor = `rgba(${Math.round(sr * 0.85)}, ${Math.round(sg * 0.85)}, ${Math.round(sb * 0.85)}, 0.88)`;
        const grad = ctx.createLinearGradient(0, waterTop, 0, beakerBottom);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, botColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(beakerLeft + 4, waterTop);
        ctx.lineTo(beakerRight - 4, waterTop);
        ctx.lineTo(beakerRight - 2, beakerBottom - 4);
        ctx.quadraticCurveTo(w / 2, beakerBottom, beakerLeft + 2, beakerBottom - 4);
        ctx.closePath();
        ctx.fill();

        // 수면 물결
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = beakerLeft + 4; x <= beakerRight - 4; x += 2) {
          const wave = Math.sin((x + time * 0.5) * 0.1) * 0.8;
          if (x === beakerLeft + 4) ctx.moveTo(x, waterTop + wave);
          else ctx.lineTo(x, waterTop + wave);
        }
        ctx.stroke();
      }

      // === 석출 결정 (비중 기반 위치) ===
      crystalsRef.current.forEach(c => {
        if (!c.settled) {
          c.currentY += c.settleSpeed * c.direction;
          c.rotation += 0.02;
          if (c.direction > 0 && c.currentY >= c.targetY) {
            c.currentY = c.targetY;
            c.settled = true;
          } else if (c.direction < 0 && c.currentY <= c.targetY) {
            c.currentY = c.targetY;
            c.settled = true;
          }
        }

        ctx.save();
        ctx.translate(c.x, c.currentY);
        ctx.rotate(c.rotation);
        const s = c.size;
        ctx.fillStyle = sub.displayColor;
        ctx.strokeStyle = shade(sub.displayColor, -15);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const sides = 6 + Math.floor(Math.random() * 2);
        for (let i = 0; i < sides; i++) {
          const a = (Math.PI * 2 * i) / sides;
          const r = s * (0.75 + ((i * 13 + Math.floor(c.x)) % 7) / 20);
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // === 비커 외곽 ===
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beakerLeft - 4, beakerTop);
      ctx.lineTo(beakerLeft, beakerTop + 8);
      ctx.lineTo(beakerLeft, beakerBottom - 8);
      ctx.quadraticCurveTo(beakerLeft, beakerBottom, beakerLeft + 8, beakerBottom);
      ctx.lineTo(beakerRight - 8, beakerBottom);
      ctx.quadraticCurveTo(beakerRight, beakerBottom, beakerRight, beakerBottom - 8);
      ctx.lineTo(beakerRight, beakerTop + 8);
      ctx.lineTo(beakerRight + 4, beakerTop);
      ctx.stroke();
      // 주둥이
      ctx.beginPath();
      ctx.moveTo(beakerLeft - 4, beakerTop);
      ctx.lineTo(beakerLeft + 12, beakerTop - 6);
      ctx.stroke();
      // 유리 하이라이트
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beakerLeft + 6, beakerTop + 20);
      ctx.lineTo(beakerLeft + 6, beakerBottom - 30);
      ctx.stroke();

      // 눈금
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const y = beakerTop + ((beakerBottom - beakerTop) * i) / 5;
        ctx.beginPath();
        ctx.moveTo(beakerLeft + 2, y);
        ctx.lineTo(beakerLeft + 8, y);
        ctx.stroke();
      }

      // 온도 표시
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = temperature >= 60 ? '#D94A4A' : temperature <= 20 ? '#4A7ED9' : '#4A9AD9';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(temperature)}℃`, w - 10, 22);
      ctx.textAlign = 'left';

      // Phase 라벨 (디버깅용, 간단하게)
      if (phase === 'fillingWater' || phase === 'addingSolute') {
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(75, 85, 99, 0.85)';
        ctx.textAlign = 'center';
        const label = phase === 'fillingWater' ? '💧 물 붓는 중...' : '🧪 용질 녹이는 중...';
        ctx.fillText(label, w / 2, 22);
        ctx.textAlign = 'left';
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [substanceId, waterMass, dissolvedMass, precipitatedMass, maxDissolvedMass, temperature, phase]);

  const sub = SUBSTANCES[substanceId] || SUBSTANCES.KNO3;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: `${height}px`,
          display: 'block',
          background: 'linear-gradient(180deg, #F5F7FA 0%, #E8EDF3 100%)',
          borderRadius: 12,
          touchAction: 'pan-y',
        }}
      />
      {sub.colorNote && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            fontSize: 10,
            color: '#6B7280',
            background: 'rgba(255,255,255,0.85)',
            padding: '4px 8px',
            borderRadius: 6,
            lineHeight: 1.3,
          }}
        >
          ※ {sub.name}({sub.formula})의 실제 색은 <b>{sub.realColor}</b>이지만, 가시성을 위해 색을 입혀 표시.
        </div>
      )}
    </div>
  );
}

// ─── 색 유틸 ────────────────────────────────
function hexR(hex) { return parseInt(hex.slice(1, 3), 16); }
function hexG(hex) { return parseInt(hex.slice(3, 5), 16); }
function hexB(hex) { return parseInt(hex.slice(5, 7), 16); }
function lerp(a, b, t) { return a + (b - a) * t; }
function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) + percent;
  const g = ((num >> 8) & 0x00ff) + percent;
  const b = (num & 0x0000ff) + percent;
  const clamp = v => Math.max(0, Math.min(255, v));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0')}`;
}
