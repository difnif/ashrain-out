// src/components/precipitation/Beaker.jsx
// v9 — 비주얼 품질 대폭 개선
//
// 주요 개선:
//   1) RoomEnvironment로 환경맵 추가 → 유리 재질의 transmission/clearcoat이
//      제대로 작동하여 실제 유리처럼 보임 (이전엔 envMap 없어서 플라스틱 느낌)
//   2) PCFSoftShadowMap + ShadowMaterial 바닥 → 깊이감 + 비커가 떠있는 느낌 제거
//   3) 유리 재질 파라미터 완전 튜닝 (IOR 1.5, roughness 0.03, clearcoat 1)
//   4) 수위 계산: (waterMass + dissolvedMass * 0.55) 기반으로 용액 부피 증가 반영
//   5) 삼각대 다리 4개 (안정적 모양), 철망 격자 패턴
//   6) 알콜램프 유리감 강화, 불꽃 이중 레이어

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SUBSTANCES } from '../../data/solubilityData';

// 비커 최대 용량 (g 기준, 수위 비율 계산용)
// 418.4g 용액(2배 스케일)이 약 0.85 수위에 오도록 조정
const BEAKER_CAPACITY = 500;

export default function Beaker(props) {
  const { height = 380 } = props;
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // phase 변경 시 결정 정리
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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 300;
    const H = mount.clientHeight || 380;

    // ═══ Scene / Renderer ═══
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    camera.position.set(0, 0.6, 5.5);
    camera.lookAt(0, -0.25, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // ═══ 환경맵 (핵심!) ═══
    // RoomEnvironment로 간단한 실내 조명 환경 생성
    // → MeshPhysicalMaterial의 transmission/clearcoat이 진짜 유리처럼 보임
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // ═══ 조명 ═══
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb8d8ff, 0.3);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.2);
    rimLight.position.set(0, 1, -5);
    scene.add(rimLight);

    const flameLight = new THREE.PointLight(0xff6820, 0, 3);
    flameLight.position.set(0, -1.15, 0);
    scene.add(flameLight);

    // ═══ 치수 ═══
    const beakerRadius = 0.7;
    const beakerHeight = 1.35;
    const beakerBottomY = -0.45;
    const beakerTopY = beakerBottomY + beakerHeight;

    // ═══ 바닥 (그림자 받기용) ═══
    const groundGeom = new THREE.PlaneGeometry(8, 8);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = beakerBottomY - 1.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // ═══ 비커 (유리) ═══
    const beakerGroup = new THREE.Group();

    // 유리 재질 (실제 유리 느낌)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.03,
      transmission: 0.95,
      thickness: 0.5,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.2,
      attenuationColor: new THREE.Color(0xd8e8f0),
      attenuationDistance: 1.5,
    });

    // 벽
    const wallGeom = new THREE.CylinderGeometry(beakerRadius, beakerRadius, beakerHeight, 64, 1, true);
    const wall = new THREE.Mesh(wallGeom, glassMat);
    wall.position.y = beakerBottomY + beakerHeight / 2;
    wall.castShadow = true;
    beakerGroup.add(wall);

    // 바닥
    const bottomGeom = new THREE.CircleGeometry(beakerRadius, 64);
    const bottomMesh = new THREE.Mesh(bottomGeom, glassMat);
    bottomMesh.rotation.x = -Math.PI / 2;
    bottomMesh.position.y = beakerBottomY + 0.005;
    bottomMesh.castShadow = true;
    beakerGroup.add(bottomMesh);

    // 테두리 torus
    const rimGeom = new THREE.TorusGeometry(beakerRadius, 0.022, 12, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8898a8,
      roughness: 0.25,
      metalness: 0.5,
      envMapIntensity: 0.8,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = beakerTopY;
    rim.castShadow = true;
    beakerGroup.add(rim);

    scene.add(beakerGroup);

    // ═══ 용액 ═══
    const baseWaterColor = new THREE.Color(0xd8ecf2);
    const liquidGeom = new THREE.CylinderGeometry(beakerRadius * 0.985, beakerRadius * 0.985, 1, 64);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
      metalness: 0,
      ior: 1.33,
      thickness: 0.3,
      envMapIntensity: 0.8,
    });
    const liquid = new THREE.Mesh(liquidGeom, liquidMat);
    liquid.scale.y = 0.001;
    liquid.position.y = beakerBottomY + 0.015;
    scene.add(liquid);

    // ═══ 삼각대 ═══
    const standGroup = new THREE.Group();
    const standY = beakerBottomY - 0.05;

    // 받침 (철망) — 살짝 두껍고 얇은 사각판
    const gauzeGeom = new THREE.BoxGeometry(beakerRadius * 2.6, 0.028, beakerRadius * 2.2);
    const gauzeMat = new THREE.MeshStandardMaterial({
      color: 0x8894a0,
      roughness: 0.55,
      metalness: 0.45,
      envMapIntensity: 0.6,
    });
    const gauze = new THREE.Mesh(gauzeGeom, gauzeMat);
    gauze.position.y = standY;
    gauze.castShadow = true;
    gauze.receiveShadow = true;
    standGroup.add(gauze);

    // 다리 4개 (사각뿔대 형태로 약간 벌어짐)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x5c6370,
      roughness: 0.35,
      metalness: 0.5,
      envMapIntensity: 0.8,
    });
    const legLen = 0.65;
    const legCorners = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
    ];
    legCorners.forEach(([sx, sz]) => {
      const legGeom = new THREE.CylinderGeometry(0.024, 0.024, legLen, 12);
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(
        sx * beakerRadius * 1.0,
        standY - legLen / 2,
        sz * beakerRadius * 0.75
      );
      leg.rotation.z = sx * 0.18;
      leg.rotation.x = -sz * 0.15;
      leg.castShadow = true;
      standGroup.add(leg);
    });

    scene.add(standGroup);

    // ═══ 알콜램프 ═══
    const lampGroup = new THREE.Group();
    const lampCenterY = beakerBottomY - 0.95;

    // 병 본체 (LatheGeometry)
    const lampProfile = [
      new THREE.Vector2(0.03, 0.16),
      new THREE.Vector2(0.08, 0.14),
      new THREE.Vector2(0.12, 0.1),
      new THREE.Vector2(0.2, 0.04),
      new THREE.Vector2(0.24, -0.03),
      new THREE.Vector2(0.23, -0.12),
      new THREE.Vector2(0.17, -0.19),
      new THREE.Vector2(0.05, -0.21),
    ];
    const lampBodyGeom = new THREE.LatheGeometry(lampProfile, 40);
    const lampBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.12,
      transmission: 0.85,
      thickness: 0.3,
      transparent: true,
      opacity: 1,
      ior: 1.5,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1,
      attenuationColor: new THREE.Color(0xeaf2f8),
      attenuationDistance: 0.8,
    });
    const lampBody = new THREE.Mesh(lampBodyGeom, lampBodyMat);
    lampBody.position.y = lampCenterY;
    lampBody.castShadow = true;
    lampGroup.add(lampBody);

    // 내부 알콜 (파란색 액체)
    const alcoholGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 24);
    const alcoholMat = new THREE.MeshPhysicalMaterial({
      color: 0x3f78d0,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      transmission: 0.3,
      ior: 1.36,
    });
    const alcohol = new THREE.Mesh(alcoholGeom, alcoholMat);
    alcohol.position.y = lampCenterY - 0.12;
    lampGroup.add(alcohol);

    // 심지 캡 (금속)
    const wickCapGeom = new THREE.CylinderGeometry(0.062, 0.062, 0.05, 20);
    const wickCapMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.3,
      metalness: 0.7,
      envMapIntensity: 1,
    });
    const wickCap = new THREE.Mesh(wickCapGeom, wickCapMat);
    wickCap.position.y = lampCenterY + 0.185;
    wickCap.castShadow = true;
    lampGroup.add(wickCap);

    // 심지
    const wickGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.055, 10);
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const wick = new THREE.Mesh(wickGeom, wickMat);
    wick.position.y = lampCenterY + 0.235;
    lampGroup.add(wick);

    scene.add(lampGroup);

    // ═══ 불꽃 ═══
    const outerFlameGeom = new THREE.ConeGeometry(0.1, 0.28, 20);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff8820,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const outerFlame = new THREE.Mesh(outerFlameGeom, outerFlameMat);
    outerFlame.position.y = lampCenterY + 0.4;
    scene.add(outerFlame);

    const innerFlameGeom = new THREE.ConeGeometry(0.05, 0.16, 16);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x5c90e0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeom, innerFlameMat);
    innerFlame.position.y = lampCenterY + 0.32;
    scene.add(innerFlame);

    // ═══ 결정 그룹 ═══
    const crystalGroup = new THREE.Group();
    scene.add(crystalGroup);

    // ═══ 물줄기 ═══
    const streamGeom = new THREE.CylinderGeometry(0.025, 0.04, 1, 12);
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x7cb8e8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.3,
    });
    const waterStream = new THREE.Mesh(streamGeom, streamMat);
    waterStream.visible = false;
    scene.add(waterStream);

    // ═══ 유리막대 ═══
    const rodGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 16);
    const rodMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.06,
      transmission: 0.9,
      thickness: 0.3,
      transparent: true,
      opacity: 1,
      ior: 1.5,
      clearcoat: 0.9,
    });
    const stirRod = new THREE.Mesh(rodGeom, rodMat);
    stirRod.visible = false;
    scene.add(stirRod);

    // ═══ 물질 가루 ═══
    const granuleGroup = new THREE.Group();
    granuleGroup.visible = false;
    scene.add(granuleGroup);

    // ═══ State ═══
    const state = {
      scene, camera, renderer,
      liquid, liquidMat, baseWaterColor,
      outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
      crystalGroup, crystals: [],
      waterStream, stirRod, granuleGroup,
      beakerBottomY, beakerHeight, beakerRadius,
      lampCenterY,
      waterLevel: 0,
      soluteAnim: 0,
      flame: 0,
      time: 0,
      envMap,
    };
    stateRef.current = state;

    let animId;
    const animate = () => {
      const p = propsRef.current;
      state.time++;
      updateScene(state, p);
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

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
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      if (envMap) envMap.dispose();
      renderer.dispose();
    };
  }, []);

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
      background: 'linear-gradient(180deg, #F5F7FA 0%, #DBE3EC 100%)',
      borderRadius: 12,
      overflow: 'hidden',
      touchAction: 'pan-y',
    }}>
      <div
        ref={mountRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <div style={{
        position: 'absolute',
        top: 12,
        right: 14,
        fontSize: 16,
        fontWeight: 700,
        color: tempColor,
        fontFamily: 'system-ui, sans-serif',
        textShadow: '0 1px 2px rgba(255,255,255,0.95)',
        pointerEvents: 'none',
      }}>
        {Math.round(temperature)}℃
      </div>
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {phaseLabel}
        </div>
      )}
    </div>
  );
}

// ═══ Scene update ═══
function updateScene(state, p) {
  const {
    liquid, liquidMat, baseWaterColor,
    outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
    crystalGroup, crystals,
    waterStream, stirRod, granuleGroup,
    beakerBottomY, beakerHeight, beakerRadius,
  } = state;

  const sub = SUBSTANCES[p.substanceId] || SUBSTANCES.KNO3;
  const waterMass = p.waterMass ?? 0;
  const dissolvedMass = p.dissolvedMass ?? 0;
  const precipitatedMass = p.precipitatedMass ?? 0;
  const maxDissolvedMass = p.maxDissolvedMass ?? 1;
  const phase = p.phase || 'empty';
  const isLighterThanWater = sub.density < 1.0;
  const time = state.time;

  const dissolvedRatio = maxDissolvedMass > 0 ? Math.min(1, dissolvedMass / maxDissolvedMass) : 0;

  // ★ 실제 비율 기반 수위 계산
  // 물 부피 ~ waterMass(mL), 용질 부피 ~ dissolvedMass * 0.55 (밀도 2 가정 시)
  // 비커 용량 500g 기준 0.9까지
  const effectiveMass = waterMass + dissolvedMass * 0.55;
  const waterRatio = waterMass > 0
    ? Math.min(0.88, Math.max(0.06, effectiveMass / BEAKER_CAPACITY))
    : 0;

  // Phase별 target
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

  // 보간
  state.waterLevel += (tWater - state.waterLevel) * 0.05;
  state.soluteAnim += (tSolute - state.soluteAnim) * 0.05;
  state.flame += (tFlame - state.flame) * 0.08;

  const wl = state.waterLevel;
  const liquidHeight = Math.max(0.001, wl * beakerHeight * 0.98);
  liquid.scale.y = liquidHeight;
  liquid.position.y = beakerBottomY + liquidHeight / 2 + 0.01;
  liquid.visible = wl > 0.01;

  const soluteCol = new THREE.Color(sub.displayColor);
  liquidMat.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * 0.55);

  const liquidTopY = liquid.position.y + liquidHeight / 2;

  // 불꽃
  const flameVal = state.flame;
  const flameOn = flameVal > 0.04;
  outerFlame.visible = flameOn;
  innerFlame.visible = flameOn;
  if (flameOn) {
    const flicker = 1 + Math.sin(time * 0.38) * 0.1 + Math.sin(time * 0.71) * 0.05;
    outerFlameMat.opacity = flameVal * (0.85 + Math.sin(time * 0.3) * 0.08);
    innerFlameMat.opacity = flameVal * 0.82;
    outerFlame.scale.set(1, flicker, 1);
    innerFlame.scale.set(1, flicker * 0.96, 1);
  }
  flameLight.intensity = flameVal * 1.2;

  // 물줄기
  waterStream.visible = showStream && wl < (state.waterLevel + 0.02) && tWater > wl + 0.01;
  if (waterStream.visible) {
    const streamTopY = 2.0;
    const streamBottomY = liquidTopY;
    const sh = Math.max(0.1, streamTopY - streamBottomY);
    waterStream.scale.y = sh;
    waterStream.position.set(Math.sin(time * 0.25) * 0.008, (streamTopY + streamBottomY) / 2, 0);
  }

  // 유리막대
  stirRod.visible = showStirRod;
  if (showStirRod) {
    const angle = time * 0.1;
    const orbitR = 0.3;
    stirRod.position.set(Math.cos(angle) * orbitR, liquidTopY - 0.05, Math.sin(angle) * orbitR);
    stirRod.rotation.z = Math.sin(angle) * 0.08;
  }

  // 물질 가루
  granuleGroup.visible = showGranules;
  if (showGranules) {
    const granuleRatio = phase === 'stirring' ? (1 - state.soluteAnim) : 1;
    const targetCount = Math.floor(28 * granuleRatio);
    while (granuleGroup.children.length < targetCount) {
      const gSize = 0.012 + Math.random() * 0.008;
      const gGeom = new THREE.SphereGeometry(gSize, 8, 6);
      const gMat = new THREE.MeshStandardMaterial({
        color: sub.displayColor,
        roughness: 0.5,
        metalness: 0.1,
      });
      const g = new THREE.Mesh(gGeom, gMat);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * beakerRadius * 0.85;
      g.position.set(Math.cos(angle) * r, liquidTopY + 0.005, Math.sin(angle) * r);
      g.userData = { angle, r, bob: Math.random() * Math.PI * 2 };
      g.castShadow = true;
      granuleGroup.add(g);
    }
    while (granuleGroup.children.length > targetCount) {
      const g = granuleGroup.children[granuleGroup.children.length - 1];
      granuleGroup.remove(g);
      g.geometry.dispose();
      g.material.dispose();
    }
    granuleGroup.children.forEach(g => {
      g.position.y = liquidTopY + 0.005 + Math.sin(time * 0.06 + g.userData.bob) * 0.002;
    });
  }

  // 결정
  if (phase === 'cooling' || phase === 'cold') {
    const targetCrystalCount = Math.min(35, Math.floor(precipitatedMass * 0.7));

    while (crystals.length < targetCrystalCount) {
      const idx = crystals.length;
      const size = 0.035 + Math.random() * 0.035;
      const cGeom = new THREE.OctahedronGeometry(size, 0);
      const cMat = new THREE.MeshStandardMaterial({
        color: sub.displayColor,
        roughness: 0.15,
        metalness: 0.35,
        transparent: true,
        opacity: 0,
        flatShading: true,
        envMapIntensity: 1.2,
      });
      const c = new THREE.Mesh(cGeom, cMat);
      c.castShadow = true;

      const level = Math.floor(idx / 7);
      const posInLevel = idx % 7;
      const baseAngle = (posInLevel / 7) * Math.PI * 2 + level * 0.4;
      const radius = 0.1 + (level % 3) * 0.18 + Math.random() * 0.08;
      const x = Math.cos(baseAngle) * radius;
      const z = Math.sin(baseAngle) * radius;

      let targetY, startY, dir;
      if (isLighterThanWater) {
        targetY = liquidTopY - 0.04 - level * 0.045;
        startY = beakerBottomY + 0.3 + Math.random() * 0.15;
        dir = -1;
      } else {
        targetY = beakerBottomY + 0.04 + level * 0.055;
        startY = liquidTopY - 0.1 - Math.random() * 0.05;
        dir = 1;
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
