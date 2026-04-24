// src/components/precipitation/Beaker.jsx
// 비커 + 용질 입자/결정/덩어리 Canvas 애니메이션
// 비중 반영한 침전 속도, 냉각 시 석출 시각화

import { useEffect, useRef } from 'react';
import { SUBSTANCES } from '../../data/solubilityData';

/**
 * props:
 *   substanceId: string
 *   waterMass: number (g)        물의 양
 *   dissolvedMass: number (g)     현재 녹아있는 용질 양
 *   precipitatedMass: number (g)  석출된 용질 양 (바닥에 쌓임)
 *   temperature: number           온도 (시각 효과용)
 *   phase: 'initial' | 'cooling' | 'done'
 */
export default function Beaker({
  substanceId = 'KNO3',
  waterMass = 100,
  dissolvedMass = 0,
  precipitatedMass = 0,
  temperature = 20,
  phase = 'initial',
  height = 320,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const crystalsRef = useRef([]);
  const lastParamsRef = useRef(null);

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

    // 시각화 스케일: 물 높이는 waterMass/200 비율로 (최대 100% near 200g)
    const waterRatio = Math.min(0.85, 0.25 + waterMass / 400);

    // 용질 입자 개수: 질량에 연동하되 상한
    const dissolvedCount = Math.min(60, Math.max(0, Math.floor(dissolvedMass * 1.2)));
    const precipitatedCount = Math.min(40, Math.max(0, Math.floor(precipitatedMass * 1.5)));

    // 파라미터 변경 시 파티클 재생성
    const paramKey = `${substanceId}|${Math.round(waterMass)}|${dissolvedCount}|${precipitatedCount}|${phase}`;
    if (lastParamsRef.current !== paramKey) {
      lastParamsRef.current = paramKey;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // 비커 내부 영역
      const beakerPad = 30;
      const beakerTop = 40;
      const beakerBottom = h - 25;
      const beakerLeft = beakerPad;
      const beakerRight = w - beakerPad;
      const beakerWidth = beakerRight - beakerLeft;
      const waterTop = beakerBottom - (beakerBottom - beakerTop) * waterRatio;

      // 녹은 용질 입자 (물 속을 떠다님)
      particlesRef.current = Array.from({ length: dissolvedCount }, () => ({
        x: beakerLeft + 10 + Math.random() * (beakerWidth - 20),
        y: waterTop + 10 + Math.random() * (beakerBottom - waterTop - 15),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1.8 + Math.random() * 1.4,
        alpha: 0.55 + Math.random() * 0.35,
      }));

      // 석출된 결정 (바닥에 쌓임, 비중 반영 — 비중이 클수록 아래로 몰림)
      const densityFactor = Math.min(1, sub.density / 2.3); // 0.6 ~ 1
      crystalsRef.current = Array.from({ length: precipitatedCount }, (_, i) => {
        // 바닥에 쌓이도록: i가 클수록 위쪽
        const stackLevel = Math.floor(i / 12); // 12개씩 한 층
        const posInLevel = i % 12;
        const xBase = beakerLeft + 15 + (posInLevel / 11) * (beakerWidth - 30);
        const yBase = beakerBottom - 8 - stackLevel * 6;

        // 결정 크기: 뭉쳐서 덩어리 표현 (일부 큰 결정)
        const isLargeCrystal = Math.random() < 0.25;
        const size = isLargeCrystal ? 4.5 + Math.random() * 2.5 : 2.2 + Math.random() * 1.8;

        return {
          x: xBase + (Math.random() - 0.5) * 10,
          y: yBase + (Math.random() - 0.5) * 3,
          size,
          rotation: Math.random() * Math.PI,
          // 비중에 따라 초기 y 오프셋 (비중 낮으면 천천히 가라앉음)
          targetY: yBase,
          currentY: phase === 'cooling' ? waterTop + Math.random() * 20 : yBase,
          fallSpeed: 0.5 + densityFactor * 1.5,
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

      // 비커 치수
      const beakerPad = 30;
      const beakerTop = 40;
      const beakerBottom = h - 25;
      const beakerLeft = beakerPad;
      const beakerRight = w - beakerPad;
      const beakerWidth = beakerRight - beakerLeft;
      const waterTop = beakerBottom - (beakerBottom - beakerTop) * waterRatio;

      // 온도에 따른 물 색 (차가우면 푸르게, 따뜻하면 붉은 기운)
      const tempHue = Math.max(180, Math.min(210, 210 - temperature * 0.4));
      const warmTint = temperature > 50 ? Math.min(0.15, (temperature - 50) / 400) : 0;

      // === 비커 그림자 ===
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.ellipse(w / 2, beakerBottom + 8, beakerWidth / 2 + 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // === 물 ===
      const waterGrad = ctx.createLinearGradient(0, waterTop, 0, beakerBottom);
      waterGrad.addColorStop(0, `hsla(${tempHue}, 60%, ${70 - warmTint * 100}%, 0.75)`);
      waterGrad.addColorStop(1, `hsla(${tempHue}, 55%, ${55 - warmTint * 80}%, 0.85)`);
      ctx.fillStyle = waterGrad;
      // 비커 안쪽 좌우 각도(약간 기운 벽)를 반영
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

      // === 녹은 용질 입자 (떠다니는 작은 점들) ===
      ctx.fillStyle = sub.displayColor;
      particlesRef.current.forEach(p => {
        // 브라운 운동
        p.x += p.vx + (Math.random() - 0.5) * 0.2;
        p.y += p.vy + (Math.random() - 0.5) * 0.2;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.vx += (Math.random() - 0.5) * 0.08;
        p.vy += (Math.random() - 0.5) * 0.08;

        // 경계 bounce
        if (p.x < beakerLeft + 6) { p.x = beakerLeft + 6; p.vx *= -1; }
        if (p.x > beakerRight - 6) { p.x = beakerRight - 6; p.vx *= -1; }
        if (p.y < waterTop + 4) { p.y = waterTop + 4; p.vy *= -1; }
        if (p.y > beakerBottom - 6) { p.y = beakerBottom - 6; p.vy *= -1; }

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // === 석출 결정/덩어리 (바닥에 쌓임, 비중 반영 침전) ===
      crystalsRef.current.forEach(c => {
        if (!c.settled) {
          // 물 속을 통과해 바닥으로 (비중 반영 속도)
          c.currentY += c.fallSpeed;
          c.rotation += 0.02;
          if (c.currentY >= c.targetY) {
            c.currentY = c.targetY;
            c.settled = true;
          }
        }

        ctx.save();
        ctx.translate(c.x, c.currentY);
        ctx.rotate(c.rotation);

        // 결정 모양: 기하학적이기보단 울퉁불퉁한 덩어리
        const s = c.size;
        ctx.fillStyle = sub.displayColor;
        ctx.strokeStyle = shade(sub.displayColor, -15);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        // 6~8각형 불규칙 결정 (덩어리 느낌)
        const sides = 6 + Math.floor(Math.random() * 2);
        for (let i = 0; i < sides; i++) {
          const a = (Math.PI * 2 * i) / sides;
          // seeded irregularity
          const r = s * (0.75 + ((i * 13 + Math.floor(c.x)) % 7) / 20);
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 하이라이트 (결정 느낌)
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // === 비커 외곽선 (나중에 그려서 앞에 오게) ===
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // 왼쪽 벽
      ctx.moveTo(beakerLeft - 4, beakerTop);
      ctx.lineTo(beakerLeft, beakerTop + 8);
      ctx.lineTo(beakerLeft, beakerBottom - 8);
      ctx.quadraticCurveTo(beakerLeft, beakerBottom, beakerLeft + 8, beakerBottom);
      // 바닥
      ctx.lineTo(beakerRight - 8, beakerBottom);
      ctx.quadraticCurveTo(beakerRight, beakerBottom, beakerRight, beakerBottom - 8);
      // 오른쪽 벽
      ctx.lineTo(beakerRight, beakerTop + 8);
      ctx.lineTo(beakerRight + 4, beakerTop);
      ctx.stroke();

      // 비커 주둥이 (테두리)
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

      // === 눈금 ===
      ctx.strokeStyle = 'rgba(40, 50, 70, 0.35)';
      ctx.lineWidth = 1;
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(40, 50, 70, 0.55)';
      for (let i = 1; i <= 4; i++) {
        const y = beakerTop + ((beakerBottom - beakerTop) * i) / 5;
        ctx.beginPath();
        ctx.moveTo(beakerLeft + 2, y);
        ctx.lineTo(beakerLeft + 8, y);
        ctx.stroke();
      }

      // === 온도계 표시 (우측 상단) ===
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = temperature >= 60 ? '#D94A4A' : temperature <= 20 ? '#4A7ED9' : '#4A9AD9';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(temperature)}℃`, w - 10, 22);
      ctx.textAlign = 'left';

      animRef.current = requestAnimationFrame(render);
    };

    render();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [substanceId, waterMass, dissolvedMass, precipitatedMass, temperature, phase]);

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
            fontSize: 11,
            color: '#6B7280',
            background: 'rgba(255,255,255,0.85)',
            padding: '4px 8px',
            borderRadius: 6,
            lineHeight: 1.3,
          }}
        >
          ※ {sub.name}({sub.formula})의 실제 색은 <b>{sub.realColor}</b>이지만, 가시성을 위해 색을 입혀 표시했습니다.
        </div>
      )}
    </div>
  );
}

// 색 밝기 조정 유틸
function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) + percent;
  const g = ((num >> 8) & 0x00ff) + percent;
  const b = (num & 0x0000ff) + percent;
  const clamp = v => Math.max(0, Math.min(255, v));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0')}`;
}
