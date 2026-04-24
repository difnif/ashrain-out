// src/components/precipitation/Beaker.jsx
// v8 — 3D 렌더링 (Three.js)
//
// 구성:
//   - 앵글 고정 (카메라 제어 없음, 성능·UX 최우선)
//   - 세로로 길게 (기본 height 380px)
//   - 상하좌우 여백 충분
//
// 장면:
//   - 비커 (MeshPhysicalMaterial 반투명 유리)
//   - 용액 (Cylinder, 용질 tint lerp)
//   - 삼각대 (받침 + 두 다리)
//   - 알콜램프 (LatheGeometry 본체 + 심지 캡 + 심지)
//   - 불꽃 (이중 Cone — 외곽 주황, 내부 파랑)
//   - 결정 (Octahedron, 점진적 추가 + opacity fade)
//   - 물줄기 (fillingWater 중 상단 Cylinder)
//   - 유리막대 (stirring 중 회전 궤도)
//   - 물질 가루 (solute-added/stirring 시 수면 위 작은 Sphere)
//
// 조명: Ambient + Directional (key + fill) + PointLight (불꽃 근처)
//
// 핵심 React 패턴:
//   - propsRef로 최신 props 동기화 (setup은 mount 시 한 번)
//   - phase 변경 시 crystals 관리 별도 useEffect

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SUBSTANCES } from '../../data/solubilityData';

export default function Beaker(props) {
  const { height = 380 } = props;
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // phase 변경 시 결정 정리 (cooling/cold가 아니면 비우기)
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.scene) return;
    const p = props.phase;
    if (p !== 'cooling' && p !== 'cold') {
      if (s.crystals && s.crystals.length > 0) {
        s.crystals.forEach(c => {
          s.crystalGroup.remove(c);
          c.geometry.dispose();
          c.material.dispose();
        });
        s.crystals = [];
      }
    }
  }, [props.phase]);

  // Setup (한 번만)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 300;
    const H = mount.clientHeight || 380;

    // === Scene / Camera / Renderer ===
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
    // 약간 위에서 내려다보는 앵글
    camera.position.set(0, 0.5, 5.2);
    camera.lookAt(0, -0.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    mount.appendChild(renderer.domElement);

    // === 조명 ===
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xcce0ff, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.25);
    rimLight.position.set(0, 1, -5);
    scene.add(rimLight);

    // 불꽃 주변 포인트 라이트
    const flameLight = new THREE.PointLight(0xff7828, 1.0, 2.5);
    flameLight.position.set(0, -1.15, 0);
    flameLight.visible = false;
    scene.add(flameLight);

    // === 치수 ===
    const beakerRadius = 0.72;
    const beakerHeight = 1.35;
    const beakerBottomY = -0.5;
    const beakerTopY = beakerBottomY + beakerHeight;

    // === 비커 (유리) ===
    const beakerGroup = new THREE.Group();
    const wallGeom = new THREE.CylinderGeometry(beakerRadius, beakerRadius, beakerHeight, 48, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdce6f0,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.6,
      thickness: 0.3,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });
    const wall = new THREE.Mesh(wallGeom, glassMat);
    wall.position.y = beakerBottomY + beakerHeight / 2;
    beakerGroup.add(wall);

    // 바닥
    const bottomGeom = new THREE.CircleGeometry(beakerRadius, 48);
    const bottom = new THREE.Mesh(bottomGeom, glassMat.clone());
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = beakerBottomY + 0.003;
    beakerGroup.add(bottom);

    // 테두리 (torus)
    const rimGeom = new THREE.TorusGeometry(beakerRadius, 0.02, 8, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      roughness: 0.3,
      metalness: 0.3,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = beakerTopY;
    beakerGroup.add(rim);

    scene.add(beakerGroup);

    // === 용액 (Liquid) ===
    const baseWaterColor = new THREE.Color(0xd8ecf2);
    const liquidGeom = new THREE.CylinderGeometry(beakerRadius * 0.98, beakerRadius * 0.98, 1, 48);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      transmission: 0.4,
      transparent: true,
      opacity: 0.78,
      roughness: 0.08,
      metalness: 0,
      ior: 1.33,
    });
    const liquid = new THREE.Mesh(liquidGeom, liquidMat);
    liquid.scale.y = 0.001;
    liquid.position.y = beakerBottomY + 0.01;
    scene.add(liquid);

    // === 삼각대 (Stand) ===
    const standGroup = new THREE.Group();
    const standY = beakerBottomY - 0.05;

    // 받침 (철망)
    const gauzeGeom = new THREE.BoxGeometry(beakerRadius * 2.5, 0.025, beakerRadius * 2.5);
    const gauzeMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.5,
      metalness: 0.3,
    });
    const gauze = new THREE.Mesh(gauzeGeom, gauzeMat);
    gauze.position.y = standY;
    standGroup.add(gauze);

    // 다리 (좌우 각 1개)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.4,
      metalness: 0.4,
    });
    for (let i = -1; i <= 1; i += 2) {
      const legGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 10);
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(i * beakerRadius * 1.15, standY - 0.3, 0);
      leg.rotation.z = i * 0.22;
      standGroup.add(leg);
    }
    scene.add(standGroup);

    // === 알콜램프 ===
    const lampGroup = new THREE.Group();
    const lampCenterY = beakerBottomY - 0.9;

    // 본체 (LatheGeometry로 병 모양)
    const lampProfile = [
      new THREE.Vector2(0.03, 0.15),
      new THREE.Vector2(0.08, 0.12),
      new THREE.Vector2(0.2, 0.06),
      new THREE.Vector2(0.24, -0.02),
      new THREE.Vector2(0.23, -0.11),
      new THREE.Vector2(0.18, -0.18),
      new THREE.Vector2(0.05, -0.2),
    ];
    const lampBodyGeom = new THREE.LatheGeometry(lampProfile, 32);
    const lampBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4d8de,
      metalness: 0.2,
      roughness: 0.25,
      transmission: 0.35,
      thickness: 0.2,
      transparent: true,
      opacity: 0.85,
      clearcoat: 0.6,
    });
    const lampBody = new THREE.Mesh(lampBodyGeom, lampBodyMat);
    lampBody.position.y = lampCenterY;
    lampGroup.add(lampBody);

    // 램프 내부 알콜 (파란빛)
    const alcoholGeom = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 20);
    const alcoholMat = new THREE.MeshBasicMaterial({
      color: 0x4a7ed9,
      transparent: true,
      opacity: 0.35,
    });
    const alcohol = new THREE.Mesh(alcoholGeom, alcoholMat);
    alcohol.position.y = lampCenterY - 0.11;
    lampGroup.add(alcohol);

    // 심지 캡
    const wickCapGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const wickCapMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.4,
      metalness: 0.5,
    });
    const wickCap = new THREE.Mesh(wickCapGeom, wickCapMat);
    wickCap.position.y = lampCenterY + 0.17;
    lampGroup.add(wickCap);

    // 심지
    const wickGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8);
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const wick = new THREE.Mesh(wickGeom, wickMat);
    wick.position.y = lampCenterY + 0.215;
    lampGroup.add(wick);

    scene.add(lampGroup);

    // === 불꽃 ===
    const outerFlameGeom = new THREE.ConeGeometry(0.09, 0.26, 18);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff9530,
      transparent: true,
      opacity: 0,
    });
    const outerFlame = new THREE.Mesh(outerFlameGeom, outerFlameMat);
    outerFlame.position.y = lampCenterY + 0.36;
    scene.add(outerFlame);

    const innerFlameGeom = new THREE.ConeGeometry(0.045, 0.14, 14);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x6090e0,
      transparent: true,
      opacity: 0,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeom, innerFlameMat);
    innerFlame.position.y = lampCenterY + 0.3;
    scene.add(innerFlame);

    // === 결정 그룹 ===
    const crystalGroup = new THREE.Group();
    scene.add(crystalGroup);

    // === 물줄기 ===
    const streamGeom = new THREE.CylinderGeometry(0.025, 0.04, 1, 10);
    const streamMat = new THREE.MeshBasicMaterial({
      color: 0x78b8e8,
      transparent: true,
      opacity: 0.75,
    });
    const waterStream = new THREE.Mesh(streamGeom, streamMat);
    waterStream.visible = false;
    scene.add(waterStream);

    // === 유리막대 ===
    const rodGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 14);
    const rodMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8b0bc,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.4,
      transparent: true,
      opacity: 0.75,
      clearcoat: 0.8,
    });
    const stirRod = new THREE.Mesh(rodGeom, rodMat);
    stirRod.visible = false;
    scene.add(stirRod);

    // === 물질 가루 그룹 ===
    const granuleGroup = new THREE.Group();
    granuleGroup.visible = false;
    scene.add(granuleGroup);

    // State 저장
    const state = {
      scene, camera, renderer,
      liquid, liquidMat, baseWaterColor,
      outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
      crystalGroup, crystals: [],
      waterStream, stirRod,
      granuleGroup,
      beakerBottomY, beakerHeight, beakerRadius,
      lampCenterY,
      waterLevel: 0,
      soluteAnim: 0,
      flame: 0,
      time: 0,
    };
    stateRef.current = state;

    // === 애니메이션 루프 ===
    let animId;
    const animate = () => {
      const p = propsRef.current;
      state.time++;
      updateScene(state, p);
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    // === Resize 대응 ===
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      // 전체 dispose
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []); // ★ mount 시 한 번만

  // === JSX ===
  const p = props;
  const temperature = p.temperature ?? 20;
  const phase = p.phase || 'empty';
  const tempColor = temperature >= 60 ? '#D94A4A' : temperature <= 20 ? '#4A7ED9' : '#4A9AD9';

  const phaseLabel = {
    'fillingWater': '💧 물 붓는 중...',
    'heating': '🔥 가열 중...',
    'stirring': '🥢 녹이는 중...',
    'cooling': '❄️ 냉각 중...',
  }[phase];

  return (
    <div style={{
      width: '100%',
      height: `${height}px`,
      position: 'relative',
      background: 'linear-gradient(180deg, #F5F7FA 0%, #E0E6EE 100%)',
      borderRadius: 12,
      overflow: 'hidden',
      touchAction: 'pan-y',
    }}>
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {/* 온도 표시 */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 14,
        fontSize: 16,
        fontWeight: 700,
        color: tempColor,
        fontFamily: 'system-ui, sans-serif',
        textShadow: '0 1px 2px rgba(255,255,255,0.9)',
        pointerEvents: 'none',
      }}>
        {Math.round(temperature)}℃
      </div>
      {/* phase 라벨 */}
      {phaseLabel && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 14,
          fontSize: 11,
          color: '#374151',
          background: 'rgba(255,255,255,0.88)',
          padding: '4px 10px',
          borderRadius: 12,
          fontWeight: 600,
          pointerEvents: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          {phaseLabel}
        </div>
      )}
    </div>
  );
}

// ─── Scene 업데이트 ─────────────────────────

function updateScene(state, p) {
  const {
    liquid, liquidMat, baseWaterColor,
    outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
    crystalGroup, crystals,
    waterStream, stirRod, granuleGroup,
    beakerBottomY, beakerHeight, beakerRadius,
  } = state;

  const sub = SUBSTANCES[p.substanceId] || SUBSTANCES.KNO3;
  const waterMass = p.waterMass ?? 100;
  const dissolvedMass = p.dissolvedMass ?? 0;
  const precipitatedMass = p.precipitatedMass ?? 0;
  const maxDissolvedMass = p.maxDissolvedMass ?? 1;
  const phase = p.phase || 'empty';
  const isLighterThanWater = sub.density < 1.0;
  const time = state.time;

  const dissolvedRatio = maxDissolvedMass > 0 ? Math.min(1, dissolvedMass / maxDissolvedMass) : 0;
  // 물 양에 따른 높이 비율 (물 100g 기준으로 정규화, 최대 0.85)
  const waterRatio = Math.min(0.85, 0.25 + waterMass / 400);

  // Phase별 targets
  let tWater, tSolute, tFlame;
  let showGranules = false, showStirRod = false, showStream = false;

  switch (phase) {
    case 'empty':
      tWater = 0; tSolute = 0; tFlame = 0; break;
    case 'fillingWater':
      tWater = waterRatio; tSolute = 0; tFlame = 0;
      showStream = true; break;
    case 'water':
      tWater = waterRatio; tSolute = 0; tFlame = 0; break;
    case 'heating':
    case 'heated':
      tWater = waterRatio; tSolute = 0; tFlame = 1; break;
    case 'solute-added':
      tWater = waterRatio; tSolute = 0; tFlame = 1;
      showGranules = true; break;
    case 'stirring':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 1;
      showGranules = true; showStirRod = true; break;
    case 'saturated':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 1; break;
    case 'cooling':
    case 'cold':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 0; break;
    default:
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 0;
  }

  // 부드러운 보간
  state.waterLevel += (tWater - state.waterLevel) * 0.06;
  state.soluteAnim += (tSolute - state.soluteAnim) * 0.05;
  state.flame += (tFlame - state.flame) * 0.08;

  const wl = state.waterLevel;
  const liquidHeight = Math.max(0.001, wl * beakerHeight * 0.98);

  // 용액 크기/위치
  liquid.scale.y = liquidHeight;
  liquid.position.y = beakerBottomY + liquidHeight / 2 + 0.005;

  // 용액 색 (물색 → 용질색 lerp)
  const soluteCol = new THREE.Color(sub.displayColor);
  liquidMat.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * 0.5);

  // 수면 y좌표 (결정/가루 위치 참조용)
  const liquidTopY = liquid.position.y + liquidHeight / 2;

  // === 불꽃 ===
  const flameVal = state.flame;
  const flameOn = flameVal > 0.04;
  outerFlame.visible = flameOn;
  innerFlame.visible = flameOn;
  if (flameOn) {
    const flicker = 1 + Math.sin(time * 0.4) * 0.08 + Math.sin(time * 0.73) * 0.04;
    outerFlameMat.opacity = flameVal * (0.82 + Math.sin(time * 0.3) * 0.08);
    innerFlameMat.opacity = flameVal * 0.75;
    outerFlame.scale.set(1, flicker, 1);
    innerFlame.scale.set(1, flicker * 0.95, 1);
  }
  flameLight.visible = flameOn;
  flameLight.intensity = flameVal * 1.0;

  // === 물줄기 ===
  waterStream.visible = showStream && wl < (tWater * 0.97);
  if (waterStream.visible) {
    const streamTopY = 2.0;
    const streamBottomY = liquidTopY;
    const sh = Math.max(0.05, streamTopY - streamBottomY);
    waterStream.scale.y = sh;
    waterStream.position.set(0, (streamTopY + streamBottomY) / 2, 0);
    // 미세 떨림
    waterStream.position.x = Math.sin(time * 0.3) * 0.008;
  }

  // === 유리막대 ===
  stirRod.visible = showStirRod;
  if (showStirRod) {
    const angle = time * 0.1;
    const orbitR = 0.3;
    stirRod.position.set(
      Math.cos(angle) * orbitR,
      liquidTopY - 0.05,
      Math.sin(angle) * orbitR
    );
    stirRod.rotation.z = Math.sin(angle) * 0.08;
  }

  // === 물질 가루 ===
  granuleGroup.visible = showGranules;
  if (showGranules) {
    const granuleRatio = phase === 'stirring' ? (1 - state.soluteAnim) : 1;
    const targetCount = Math.floor(28 * granuleRatio);
    const currentCount = granuleGroup.children.length;

    // 추가
    while (granuleGroup.children.length < targetCount) {
      const gSize = 0.012 + Math.random() * 0.008;
      const gGeom = new THREE.SphereGeometry(gSize, 6, 5);
      const gMat = new THREE.MeshStandardMaterial({
        color: sub.displayColor,
        roughness: 0.6,
      });
      const g = new THREE.Mesh(gGeom, gMat);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * beakerRadius * 0.85;
      g.position.set(Math.cos(angle) * r, liquidTopY + 0.005, Math.sin(angle) * r);
      g.userData = { angle, r, bob: Math.random() * Math.PI * 2 };
      granuleGroup.add(g);
    }
    // 제거
    while (granuleGroup.children.length > targetCount) {
      const g = granuleGroup.children[granuleGroup.children.length - 1];
      granuleGroup.remove(g);
      g.geometry.dispose();
      g.material.dispose();
    }
    // 수면 따라 흔들림
    granuleGroup.children.forEach((g, i) => {
      g.position.y = liquidTopY + 0.005 + Math.sin(time * 0.06 + g.userData.bob) * 0.002;
    });
  }

  // === 결정 (석출) ===
  if (phase === 'cooling' || phase === 'cold') {
    const targetCrystalCount = Math.min(35, Math.floor(precipitatedMass * 0.7));

    while (crystals.length < targetCrystalCount) {
      const idx = crystals.length;
      const size = 0.035 + Math.random() * 0.035;
      const cGeom = new THREE.OctahedronGeometry(size, 0);
      const cMat = new THREE.MeshStandardMaterial({
        color: sub.displayColor,
        roughness: 0.15,
        metalness: 0.25,
        transparent: true,
        opacity: 0,
        flatShading: true,
      });
      const c = new THREE.Mesh(cGeom, cMat);

      // 배치 위치
      const level = Math.floor(idx / 7);
      const posInLevel = idx % 7;
      const baseAngle = (posInLevel / 7) * Math.PI * 2 + level * 0.4;
      const radius = 0.1 + (level % 3) * 0.18 + Math.random() * 0.08;
      const x = Math.cos(baseAngle) * radius;
      const z = Math.sin(baseAngle) * radius;

      let targetY, startY, dir;
      if (isLighterThanWater) {
        // 수면 근처 (위로 떠오름)
        targetY = liquidTopY - 0.04 - level * 0.045;
        startY = beakerBottomY + 0.3 + Math.random() * 0.15;
        dir = -1; // 위로 이동
      } else {
        // 바닥에 쌓임
        targetY = beakerBottomY + 0.04 + level * 0.055;
        startY = liquidTopY - 0.1 - Math.random() * 0.05;
        dir = 1; // 아래로 이동
      }

      c.position.set(x, startY, z);
      c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      c.userData = {
        targetY,
        settled: false,
        direction: dir,
        speed: 0.008 + Math.random() * 0.006,
        rotSpeedY: (Math.random() - 0.5) * 0.03,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
      };
      crystalGroup.add(c);
      crystals.push(c);
    }
  }

  // 결정 애니메이션 (매 프레임)
  crystals.forEach(c => {
    c.material.opacity = Math.min(1, c.material.opacity + 0.035);
    if (!c.userData.settled) {
      c.position.y += c.userData.direction * c.userData.speed;
      c.rotation.y += c.userData.rotSpeedY;
      c.rotation.x += c.userData.rotSpeedX;
      if (c.userData.direction > 0 && c.position.y >= c.userData.targetY) {
        c.position.y = c.userData.targetY;
        c.userData.settled = true;
      } else if (c.userData.direction < 0 && c.position.y <= c.userData.targetY) {
        c.position.y = c.userData.targetY;
        c.userData.settled = true;
      }
    }
  });
}
