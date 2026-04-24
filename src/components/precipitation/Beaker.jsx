// src/components/precipitation/Beaker.jsx
// 과학 실험실 느낌: 작은 비커 + 삼각대 + 알콜램프
//
// - 비커는 상단에 작게 배치
// - 아래에 철제 삼각대 (wire gauze 포함)
// - 그 아래 알콜램프 (심지 + 불꽃)
// - 냉각 시작하면 램프 꺼짐
//
// Phase:
//   empty         — 빈 비커, 램프 켜짐
//   fillingWater  — 물 붓는 중
//   addingSolute  — 물질 녹이는 중 (tint 진해짐)
//   saturated     — 포화 상태 (단색)
//   cooling       — 램프 꺼짐, 석출 진행
//   cold          — 냉각 완료
//
// 비중 > 1.0: 아래로 침전  /  비중 < 1.0: 위로 부유

import { useEffect, useRef } from 'react';
import { SUBSTANCES } from '../../data/solubilityData';

const WATER_BASE = { r: 223, g: 238, b: 246 };

export default function Beaker({
  substanceId = 'KNO3',
  waterMass = 100,
  dissolvedMass = 0,
  precipitatedMass = 0,
  maxDissolvedMass = 1,
  temperature = 20,
  phase = 'saturated',
  height = 340,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const crystalsRef = useRef([]);
  const paramKeyRef = useRef(null);
  const waterLevelRef = useRef(0);
  const soluteAnimRef = useRef(0);
  const flameRef = useRef(1); // 1 = on, 0 = off (부드럽게 전환)

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
    const isLighterThanWater = sub.density < 1.0;
    const densityFactor = Math.min(1, Math.abs(sub.density - 1.0) / 1.3);

    const dissolvedRatio = maxDissolvedMass > 0
      ? Math.min(1, dissolvedMass / maxDissolvedMass)
      : 0;

    let targetWaterLevel, targetSoluteAnim, targetFlame;
    switch (phase) {
      case 'empty':
        targetWaterLevel = 0; targetSoluteAnim = 0; targetFlame = 1;
        break;
      case 'fillingWater':
        targetWaterLevel = 1; targetSoluteAnim = 0; targetFlame = 1;
        break;
      case 'addingSolute':
        targetWaterLevel = 1; targetSoluteAnim = dissolvedRatio; targetFlame = 1;
        break;
      case 'saturated':
        targetWaterLevel = 1; targetSoluteAnim = dissolvedRatio; targetFlame = 1;
        break;
      case 'cooling':
      case 'cold':
        targetWaterLevel = 1; targetSoluteAnim = dissolvedRatio; targetFlame = 0;
        break;
      default:
        targetWaterLevel = 1; targetSoluteAnim = dissolvedRatio; targetFlame = 1;
    }

    const crystalCount = Math.min(35, Math.max(0, Math.floor(precipitatedMass * 0.7)));

    const paramKey = `${substanceId}|${Math.round(waterMass)}|${crystalCount}|${phase}|${isLighterThanWater}`;

    // 비커 레이아웃 계산 (렌더 시에도 필요하므로 여기서 미리)
    function computeLayout(w, h) {
      const beakerWidth = Math.min(180, w * 0.5);
      const beakerHeight = h * 0.42;
      const beakerCenterX = w / 2;
      const beakerLeft = beakerCenterX - beakerWidth / 2;
      const beakerRight = beakerCenterX + beakerWidth / 2;
      const beakerTop = 18;
      const beakerBottom = beakerTop + beakerHeight;

      const waterRatio = Math.min(0.85, 0.25 + waterMass / 400);
      const waterTopBase = beakerBottom - beakerHeight * waterRatio;

      const standTopY = beakerBottom + 8;
      const standHeight = 14;
      const standBottomY = standTopY + standHeight;
      const standWidth = beakerWidth + 30;

      const lampTopY = standBottomY + 18; // 삼각대와 램프 사이 간격
      const lampBodyHeight = Math.min(30, h - lampTopY - 18);
      const lampWidth = 34;

      return {
        beakerCenterX, beakerLeft, beakerRight, beakerWidth,
        beakerTop, beakerBottom, waterTopBase,
        standTopY, standBottomY, standWidth,
        lampTopY, lampBodyHeight, lampWidth,
      };
    }

    if (paramKeyRef.current !== paramKey) {
      paramKeyRef.current = paramKey;

      const rect = canvas.getBoundingClientRect();
      const L = computeLayout(rect.width, rect.height);

      crystalsRef.current = Array.from({ length: crystalCount }, (_, i) => {
        let restYBase, fallFrom;
        if (isLighterThanWater) {
          // 부유: 수면 근처에 쌓임
          const stackLevel = Math.floor(i / 8);
          restYBase = L.waterTopBase + 5 + stackLevel * 4;
          fallFrom = L.beakerBottom - 10 - Math.random() * 20;
        } else {
          // 침전: 바닥에 쌓임
          const stackLevel = Math.floor(i / 10);
          restYBase = L.beakerBottom - 6 - stackLevel * 5;
          fallFrom = L.waterTopBase + Math.random() * 10;
        }
        const posInLevel = i % 10;
        const xBase = L.beakerLeft + 10 + (posInLevel / 9) * (L.beakerWidth - 20);
        const isLargeCrystal = Math.random() < 0.25;
        const size = isLargeCrystal ? 3.5 + Math.random() * 2 : 1.8 + Math.random() * 1.5;

        return {
          x: xBase + (Math.random() - 0.5) * 8,
          currentY: phase === 'cooling' ? fallFrom : restYBase,
          targetY: restYBase + (Math.random() - 0.5) * 3,
          size,
          rotation: Math.random() * Math.PI,
          settleSpeed: 0.4 + densityFactor * 1.3,
          direction: isLighterThanWater ? -1 : 1,
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
      const L = computeLayout(w, h);

      // 애니메이션 보간
      waterLevelRef.current += (targetWaterLevel - waterLevelRef.current) * 0.08;
      soluteAnimRef.current += (targetSoluteAnim - soluteAnimRef.current) * 0.06;
      flameRef.current += (targetFlame - flameRef.current) * 0.1;

      const currentWaterLevel = waterLevelRef.current;
      const currentSoluteAnim = soluteAnimRef.current;
      const currentFlame = flameRef.current;
      const waterTop = L.beakerBottom - (L.beakerBottom - L.waterTopBase) * currentWaterLevel;

      // ─── 비커 그림자 ───
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.ellipse(L.beakerCenterX, L.beakerBottom + 3, L.beakerWidth / 2 + 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ─── 용액 (비커 내부) ───
      if (currentWaterLevel > 0.02) {
        const sr = lerp(WATER_BASE.r, hexR(sub.displayColor), currentSoluteAnim * 0.55);
        const sg = lerp(WATER_BASE.g, hexG(sub.displayColor), currentSoluteAnim * 0.55);
        const sb = lerp(WATER_BASE.b, hexB(sub.displayColor), currentSoluteAnim * 0.55);
        const topColor = `rgba(${Math.round(sr)}, ${Math.round(sg)}, ${Math.round(sb)}, 0.78)`;
        const botColor = `rgba(${Math.round(sr * 0.85)}, ${Math.round(sg * 0.85)}, ${Math.round(sb * 0.85)}, 0.88)`;
        const grad = ctx.createLinearGradient(0, waterTop, 0, L.beakerBottom);
        grad.addColorStop(0, topColor);
        grad.addColorStop(1, botColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(L.beakerLeft + 2, waterTop);
        ctx.lineTo(L.beakerRight - 2, waterTop);
        ctx.lineTo(L.beakerRight - 1, L.beakerBottom - 3);
        ctx.quadraticCurveTo(L.beakerCenterX, L.beakerBottom, L.beakerLeft + 1, L.beakerBottom - 3);
        ctx.closePath();
        ctx.fill();

        // 수면
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let x = L.beakerLeft + 2; x <= L.beakerRight - 2; x += 2) {
          const wave = Math.sin((x + time * 0.5) * 0.15) * 0.6;
          if (x === L.beakerLeft + 2) ctx.moveTo(x, waterTop + wave);
          else ctx.lineTo(x, waterTop + wave);
        }
        ctx.stroke();
      }

      // ─── 결정 (석출) ───
      crystalsRef.current.forEach(c => {
        if (!c.settled) {
          c.currentY += c.settleSpeed * c.direction;
          c.rotation += 0.02;
          if (c.direction > 0 && c.currentY >= c.targetY) {
            c.currentY = c.targetY; c.settled = true;
          } else if (c.direction < 0 && c.currentY <= c.targetY) {
            c.currentY = c.targetY; c.settled = true;
          }
        }
        ctx.save();
        ctx.translate(c.x, c.currentY);
        ctx.rotate(c.rotation);
        const s = c.size;
        ctx.fillStyle = sub.displayColor;
        ctx.strokeStyle = shade(sub.displayColor, -15);
        ctx.lineWidth = 0.4;
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
        ctx.restore();
      });

      // ─── 비커 외곽 ───
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L.beakerLeft - 3, L.beakerTop);
      ctx.lineTo(L.beakerLeft, L.beakerTop + 5);
      ctx.lineTo(L.beakerLeft, L.beakerBottom - 5);
      ctx.quadraticCurveTo(L.beakerLeft, L.beakerBottom, L.beakerLeft + 5, L.beakerBottom);
      ctx.lineTo(L.beakerRight - 5, L.beakerBottom);
      ctx.quadraticCurveTo(L.beakerRight, L.beakerBottom, L.beakerRight, L.beakerBottom - 5);
      ctx.lineTo(L.beakerRight, L.beakerTop + 5);
      ctx.lineTo(L.beakerRight + 3, L.beakerTop);
      ctx.stroke();

      // 주둥이
      ctx.beginPath();
      ctx.moveTo(L.beakerLeft - 3, L.beakerTop);
      ctx.lineTo(L.beakerLeft + 8, L.beakerTop - 4);
      ctx.stroke();

      // 유리 하이라이트
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(L.beakerLeft + 4, L.beakerTop + 12);
      ctx.lineTo(L.beakerLeft + 4, L.beakerBottom - 18);
      ctx.stroke();

      // 눈금
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.3)';
      ctx.lineWidth = 0.6;
      for (let i = 1; i <= 3; i++) {
        const y = L.beakerTop + ((L.beakerBottom - L.beakerTop) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(L.beakerLeft + 1, y);
        ctx.lineTo(L.beakerLeft + 5, y);
        ctx.stroke();
      }

      // ─── 삼각대 (철제 스탠드) ───
      // 상단: wire gauze (철망) — 비커 받침
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(L.beakerCenterX - L.standWidth / 2, L.standTopY, L.standWidth, 2);
      // 철망 격자 (간단한 해치)
      ctx.strokeStyle = 'rgba(107,114,128,0.5)';
      ctx.lineWidth = 0.5;
      for (let x = L.beakerCenterX - L.standWidth / 2 + 3; x < L.beakerCenterX + L.standWidth / 2 - 3; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, L.standTopY);
        ctx.lineTo(x, L.standTopY + 2);
        ctx.stroke();
      }

      // 삼각대 다리 (양쪽 2개)
      const legTopLeft = L.beakerCenterX - L.standWidth / 2 + 10;
      const legTopRight = L.beakerCenterX + L.standWidth / 2 - 10;
      const legBottomLeft = L.beakerCenterX - L.standWidth / 2 - 4;
      const legBottomRight = L.beakerCenterX + L.standWidth / 2 + 4;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legTopLeft, L.standTopY + 2);
      ctx.lineTo(legBottomLeft, L.standBottomY);
      ctx.moveTo(legTopRight, L.standTopY + 2);
      ctx.lineTo(legBottomRight, L.standBottomY);
      ctx.stroke();

      // ─── 알콜램프 ───
      const lampBottomY = L.lampTopY + L.lampBodyHeight;
      const lampLeft = L.beakerCenterX - L.lampWidth / 2;
      const lampRight = L.beakerCenterX + L.lampWidth / 2;

      // 램프 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(L.beakerCenterX, lampBottomY + 2, L.lampWidth / 2 + 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 램프 본체 (둥근 병 모양 - 유리)
      const lampGrad = ctx.createLinearGradient(lampLeft, L.lampTopY, lampRight, lampBottomY);
      lampGrad.addColorStop(0, '#C2C2C8');
      lampGrad.addColorStop(0.4, '#E8E8EC');
      lampGrad.addColorStop(1, '#A0A0A8');
      ctx.fillStyle = lampGrad;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // 상단 목 부분
      const neckWidth = L.lampWidth * 0.35;
      const neckTop = L.lampTopY + 6;
      ctx.moveTo(L.beakerCenterX - neckWidth / 2, L.lampTopY);
      ctx.lineTo(L.beakerCenterX + neckWidth / 2, L.lampTopY);
      ctx.lineTo(L.beakerCenterX + neckWidth / 2, neckTop);
      // 어깨 → 본체
      ctx.quadraticCurveTo(lampRight, neckTop + 2, lampRight, neckTop + 8);
      ctx.lineTo(lampRight, lampBottomY - 3);
      ctx.quadraticCurveTo(lampRight, lampBottomY, lampRight - 3, lampBottomY);
      ctx.lineTo(lampLeft + 3, lampBottomY);
      ctx.quadraticCurveTo(lampLeft, lampBottomY, lampLeft, lampBottomY - 3);
      ctx.lineTo(lampLeft, neckTop + 8);
      ctx.quadraticCurveTo(lampLeft, neckTop + 2, L.beakerCenterX - neckWidth / 2, neckTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 램프 내부 알콜 (파란빛)
      ctx.fillStyle = 'rgba(74, 126, 217, 0.35)';
      ctx.beginPath();
      ctx.ellipse(L.beakerCenterX, lampBottomY - 5, L.lampWidth * 0.35, L.lampBodyHeight * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 심지 (금속 캡 + 심지)
      const wickCapTop = L.lampTopY - 4;
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(L.beakerCenterX - 3, wickCapTop, 6, 4);
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(L.beakerCenterX - 1, wickCapTop - 3, 2, 3);

      // 불꽃 (on일 때만)
      if (currentFlame > 0.05) {
        const flameBaseY = wickCapTop - 3;
        const flicker = 1 + Math.sin(time * 0.4) * 0.08 + Math.sin(time * 0.7) * 0.05;
        const flameHeight = 16 * currentFlame * flicker;
        const flameWidth = 6 * currentFlame;

        ctx.save();
        ctx.globalAlpha = currentFlame;
        // 외곽 (주황)
        const outerGrad = ctx.createRadialGradient(
          L.beakerCenterX, flameBaseY - flameHeight * 0.4, 1,
          L.beakerCenterX, flameBaseY - flameHeight * 0.4, flameHeight * 0.8
        );
        outerGrad.addColorStop(0, 'rgba(255, 200, 80, 0.9)');
        outerGrad.addColorStop(0.5, 'rgba(255, 140, 40, 0.75)');
        outerGrad.addColorStop(1, 'rgba(255, 80, 20, 0)');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.moveTo(L.beakerCenterX, flameBaseY - flameHeight);
        ctx.quadraticCurveTo(L.beakerCenterX + flameWidth, flameBaseY - flameHeight * 0.5, L.beakerCenterX + flameWidth * 0.6, flameBaseY);
        ctx.quadraticCurveTo(L.beakerCenterX, flameBaseY + 2, L.beakerCenterX - flameWidth * 0.6, flameBaseY);
        ctx.quadraticCurveTo(L.beakerCenterX - flameWidth, flameBaseY - flameHeight * 0.5, L.beakerCenterX, flameBaseY - flameHeight);
        ctx.closePath();
        ctx.fill();

        // 안쪽 (파랑 - 가열부)
        ctx.fillStyle = 'rgba(90, 140, 220, 0.7)';
        ctx.beginPath();
        ctx.ellipse(L.beakerCenterX, flameBaseY - 2, flameWidth * 0.35, flameHeight * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // 연기(냉각 시 꺼지면서) — 생략
        ctx.restore();
      } else if (currentFlame > 0.002) {
        // 연기
        ctx.save();
        ctx.globalAlpha = Math.min(0.4, (1 - currentFlame) * 0.5);
        ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
        const smokeY = wickCapTop - 8 - (time % 60);
        ctx.beginPath();
        ctx.arc(L.beakerCenterX + Math.sin(time * 0.05) * 3, smokeY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ─── 온도 표시 (우측 상단) ───
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = temperature >= 60 ? '#D94A4A' : temperature <= 20 ? '#4A7ED9' : '#4A9AD9';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(temperature)}℃`, w - 10, 18);
      ctx.textAlign = 'left';

      // Phase 라벨
      if (phase === 'fillingWater' || phase === 'addingSolute') {
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(75, 85, 99, 0.85)';
        ctx.textAlign = 'left';
        const label = phase === 'fillingWater' ? '💧 물 붓는 중...' : '🧪 용질 녹이는 중...';
        ctx.fillText(label, 10, 18);
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

  return (
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
  );
}

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
