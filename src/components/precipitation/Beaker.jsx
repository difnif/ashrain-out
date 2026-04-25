// src/components/precipitation/Beaker.jsx
// v12 — 피드백 종합 반영
//
// 주요 수정:
//   1) 물 푸른 채도 강화: emissive 추가 + transmission 더 낮춤 + surface 강조
//   2) 무색/흰색 물질은 결정·가루를 흰색으로 표현 (realColor === '무색' 또는 '흰색')
//   3) 돋보기: 비커 옆에 배치 + 드래그로 위치 이동
//      - 돋보기 영역 중심 기준으로 카메라 초점 연동
//   4) 그림자 제거 (castShadow/receiveShadow/ShadowMaterial 전부 off)
//   5) 페트리 접시: 기울기 완료 시점에 pile 완전히 0으로 (다 비움)
//   6) 유리막대: 색 진하게 + 굵게 + metalness 살림

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SUBSTANCES } from '../../data/solubilityData';

const BEAKER_CAPACITY = 500;

// 물질의 실제 색이 무색/흰색이면 결정을 흰색으로 렌더링
function getCrystalColor(sub) {
  const rc = sub.realColor;
  if (rc === '무색' || rc === '흰색') return '#F5F6F8';
  return sub.displayColor;
}

export default function Beaker(props) {
  const { height = 380 } = props;
  const mountRef = useRef(null);
  const magnifierMountRef = useRef(null);
  const stateRef = useRef({});
  const propsRef = useRef(props);
  propsRef.current = props;

  const [magnifierOn, setMagnifierOn] = useState(false);
  const magnifierOnRef = useRef(false);
  magnifierOnRef.current = magnifierOn;

  // 돋보기 위치 (containerRef 기준 px, 좌상단)
  // 기본: 좌측 중단. 드래그로 이동 가능.
  const [magPos, setMagPos] = useState({ x: 16, y: 120 });
  const magPosRef = useRef(magPos);
  magPosRef.current = magPos;
  const MAG_SIZE = 140;

  // 드래그 상태
  const dragStateRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });

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
    const magMount = magnifierMountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 300;
    const H = mount.clientHeight || 380;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
    const CAM_DIST = 6.2;
    const CAM_YAW = 0.26;
    const CAM_PITCH = 0.16;
    camera.position.set(
      Math.sin(CAM_YAW) * CAM_DIST,
      Math.sin(CAM_PITCH) * CAM_DIST + 0.3,
      Math.cos(CAM_YAW) * CAM_DIST
    );
    camera.lookAt(0, -0.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // 그림자 비활성화 (피드백)
    renderer.shadowMap.enabled = false;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // 돋보기 카메라
    const magCamera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
    // 초기 초점 (비커 중심)
    const magFocus = new THREE.Vector3(0, -0.1, 0);
    const MAG_DIST = 1.8;
    magCamera.position.set(
      magFocus.x + Math.sin(CAM_YAW) * MAG_DIST,
      magFocus.y + Math.sin(CAM_PITCH) * MAG_DIST + 0.05,
      magFocus.z + Math.cos(CAM_YAW) * MAG_DIST
    );
    magCamera.lookAt(magFocus);

    let magRenderer = null;
    if (magMount) {
      magRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      magRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      magRenderer.shadowMap.enabled = false;
      magRenderer.outputEncoding = THREE.sRGBEncoding;
      magRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      magRenderer.toneMappingExposure = 1.1;
      const magSize = magMount.clientWidth || MAG_SIZE;
      magRenderer.setSize(magSize, magSize);
      magMount.appendChild(magRenderer.domElement);
    }

    // 환경맵
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 조명 (그림자 없음)
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(3, 6, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb8d8ff, 0.4);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.25);
    rimLight.position.set(0, 1, -5);
    scene.add(rimLight);
    const flameLight = new THREE.PointLight(0xff6820, 0, 3);
    flameLight.position.set(0, -1.15, 0);
    scene.add(flameLight);

    const sceneRoot = new THREE.Group();
    sceneRoot.scale.setScalar(0.82);
    scene.add(sceneRoot);

    const beakerRadius = 0.7;
    const beakerHeight = 1.35;
    const beakerBottomY = -0.45;
    const beakerTopY = beakerBottomY + beakerHeight;

    // (바닥 그림자 제거됨)

    // 비커 유리
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.05,
      transmission: 0.85, thickness: 0.35,
      transparent: true, opacity: 1, side: THREE.DoubleSide,
      ior: 1.5, clearcoat: 0.9, clearcoatRoughness: 0.08,
      envMapIntensity: 1.0,
      attenuationColor: new THREE.Color(0xeef5fa),
      attenuationDistance: 2.0,
    });

    const beakerGroup = new THREE.Group();
    const wallGeom = new THREE.CylinderGeometry(beakerRadius, beakerRadius, beakerHeight, 64, 1, true);
    const wall = new THREE.Mesh(wallGeom, glassMat);
    wall.position.y = beakerBottomY + beakerHeight / 2;
    beakerGroup.add(wall);

    const bottomGeom = new THREE.CircleGeometry(beakerRadius, 64);
    const bottomMesh = new THREE.Mesh(bottomGeom, glassMat);
    bottomMesh.rotation.x = -Math.PI / 2;
    bottomMesh.position.y = beakerBottomY + 0.005;
    beakerGroup.add(bottomMesh);

    const rimGeom = new THREE.TorusGeometry(beakerRadius, 0.022, 12, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8898a8, roughness: 0.25, metalness: 0.5, envMapIntensity: 0.8,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = beakerTopY;
    beakerGroup.add(rim);
    sceneRoot.add(beakerGroup);

    // ═══ 용액 (푸른 채도 강화) ═══
    // 물 기본색 채도 높임 + emissive 추가 (흐린 배경에서도 푸르게 보이도록)
    const baseWaterColor = new THREE.Color(0x5fb4d4); // 더 진한 하늘색
    const liquidGeom = new THREE.CylinderGeometry(beakerRadius * 0.985, beakerRadius * 0.985, 1, 64);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      emissive: new THREE.Color(0x3589ad), // 푸른 발광
      emissiveIntensity: 0.12,
      transmission: 0.08, // 더 낮춤 (0.15 → 0.08)
      transparent: true,
      opacity: 0.96,
      roughness: 0.1,
      metalness: 0,
      ior: 1.33,
      thickness: 0.4,
      envMapIntensity: 0.6,
    });
    const liquid = new THREE.Mesh(liquidGeom, liquidMat);
    liquid.scale.y = 0.001;
    liquid.position.y = beakerBottomY + 0.015;
    sceneRoot.add(liquid);

    // 수면 하이라이트
    const surfaceGeom = new THREE.CircleGeometry(beakerRadius * 0.985, 64);
    const surfaceMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      metalness: 0, roughness: 0.04,
      transparent: true, opacity: 0.75,
      envMapIntensity: 1.5,
    });
    const surface = new THREE.Mesh(surfaceGeom, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.visible = false;
    sceneRoot.add(surface);

    // 삼각대 (그림자 없음)
    const standGroup = new THREE.Group();
    const standY = beakerBottomY - 0.05;
    const gauzeGeom = new THREE.BoxGeometry(beakerRadius * 2.6, 0.03, beakerRadius * 2.2);
    const gauzeMat = new THREE.MeshStandardMaterial({
      color: 0x8894a0, roughness: 0.55, metalness: 0.45, envMapIntensity: 0.6,
    });
    const gauze = new THREE.Mesh(gauzeGeom, gauzeMat);
    gauze.position.y = standY;
    standGroup.add(gauze);

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x5c6370, roughness: 0.35, metalness: 0.5, envMapIntensity: 0.8,
    });
    const legLen = 0.65;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const legGeom = new THREE.CylinderGeometry(0.026, 0.026, legLen, 12);
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(sx * beakerRadius * 1.0, standY - legLen / 2, sz * beakerRadius * 0.75);
      leg.rotation.z = sx * 0.18;
      leg.rotation.x = -sz * 0.15;
      standGroup.add(leg);
    });
    sceneRoot.add(standGroup);

    // 알콜램프
    const lampGroup = new THREE.Group();
    const lampCenterY = beakerBottomY - 1.05;
    const lampProfile = [
      new THREE.Vector2(0.001, 0.18), new THREE.Vector2(0.04, 0.18),
      new THREE.Vector2(0.06, 0.16), new THREE.Vector2(0.08, 0.12),
      new THREE.Vector2(0.13, 0.08), new THREE.Vector2(0.2, 0.03),
      new THREE.Vector2(0.24, -0.04), new THREE.Vector2(0.23, -0.13),
      new THREE.Vector2(0.17, -0.2), new THREE.Vector2(0.05, -0.22),
      new THREE.Vector2(0.001, -0.22),
    ];
    const lampBodyGeom = new THREE.LatheGeometry(lampProfile, 40);
    const lampBodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.12,
      transmission: 0.8, thickness: 0.3,
      transparent: true, opacity: 1, ior: 1.5,
      clearcoat: 0.9, clearcoatRoughness: 0.08, envMapIntensity: 1,
      attenuationColor: new THREE.Color(0xeaf2f8),
      attenuationDistance: 0.8,
    });
    const lampBody = new THREE.Mesh(lampBodyGeom, lampBodyMat);
    lampBody.position.y = lampCenterY;
    lampGroup.add(lampBody);

    const alcoholGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 24);
    const alcoholMat = new THREE.MeshPhysicalMaterial({
      color: 0x3f78d0, transparent: true, opacity: 0.55,
      roughness: 0.1, transmission: 0.3, ior: 1.36,
    });
    const alcohol = new THREE.Mesh(alcoholGeom, alcoholMat);
    alcohol.position.y = lampCenterY - 0.13;
    lampGroup.add(alcohol);

    const wickCapGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20);
    const wickCapMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280, roughness: 0.3, metalness: 0.7, envMapIntensity: 1,
    });
    const wickCap = new THREE.Mesh(wickCapGeom, wickCapMat);
    wickCap.position.y = lampCenterY + 0.2;
    lampGroup.add(wickCap);

    const wickGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10);
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const wick = new THREE.Mesh(wickGeom, wickMat);
    wick.position.y = lampCenterY + 0.24;
    lampGroup.add(wick);
    sceneRoot.add(lampGroup);

    // 불꽃
    const outerFlameGeom = new THREE.ConeGeometry(0.07, 0.2, 20);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff8820, transparent: true, opacity: 0, depthWrite: false,
    });
    const outerFlame = new THREE.Mesh(outerFlameGeom, outerFlameMat);
    outerFlame.position.y = lampCenterY + 0.37;
    sceneRoot.add(outerFlame);

    const innerFlameGeom = new THREE.ConeGeometry(0.035, 0.12, 16);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0x5c90e0, transparent: true, opacity: 0, depthWrite: false,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeom, innerFlameMat);
    innerFlame.position.y = lampCenterY + 0.33;
    sceneRoot.add(innerFlame);

    const crystalGroup = new THREE.Group();
    sceneRoot.add(crystalGroup);

    // 물줄기
    const streamGeom = new THREE.CylinderGeometry(0.03, 0.045, 1, 12);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a9fd0, transparent: true, opacity: 0.9,
      roughness: 0.1, metalness: 0, transmission: 0.2, ior: 1.33,
    });
    const waterStream = new THREE.Mesh(streamGeom, streamMat);
    waterStream.visible = false;
    sceneRoot.add(waterStream);

    // ═══ 유리막대 (가시성 강화) ═══
    // 굵기 증가 (0.025 → 0.035), 회색 계열 + clearcoat로 또렷하게
    const rodGeom = new THREE.CylinderGeometry(0.035, 0.035, 0.95, 20);
    const rodMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4d9e0, // 살짝 회색
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.65, // 약간 낮춰서 더 보이게
      thickness: 0.4,
      transparent: true,
      opacity: 1,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.2,
    });
    const stirRod = new THREE.Mesh(rodGeom, rodMat);
    stirRod.visible = false;
    sceneRoot.add(stirRod);

    // 페트리 접시
    const petriGroup = new THREE.Group();
    petriGroup.visible = false;
    const petriRadius = 0.32;
    const petriHeight = 0.055;
    const petriGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.08,
      transmission: 0.88, thickness: 0.15,
      transparent: true, opacity: 1, ior: 1.5,
      clearcoat: 0.9, side: THREE.DoubleSide, envMapIntensity: 1,
    });
    const petriWallGeom = new THREE.CylinderGeometry(petriRadius, petriRadius, petriHeight, 40, 1, true);
    const petriWall = new THREE.Mesh(petriWallGeom, petriGlassMat);
    petriGroup.add(petriWall);
    const petriBottomGeom = new THREE.CircleGeometry(petriRadius, 40);
    const petriBottom = new THREE.Mesh(petriBottomGeom, petriGlassMat);
    petriBottom.rotation.x = -Math.PI / 2;
    petriBottom.position.y = -petriHeight / 2;
    petriGroup.add(petriBottom);
    const petriRimGeom = new THREE.TorusGeometry(petriRadius, 0.01, 8, 40);
    const petriRim = new THREE.Mesh(petriRimGeom, petriGlassMat);
    petriRim.rotation.x = Math.PI / 2;
    petriRim.position.y = petriHeight / 2;
    petriGroup.add(petriRim);

    const pileProfile = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = petriRadius * 0.7 * (1 - t * t);
      const y = 0.04 * t;
      pileProfile.push(new THREE.Vector2(r, y - petriHeight / 2 + 0.001));
    }
    const pileGeom = new THREE.LatheGeometry(pileProfile, 28);
    const pileMatRef = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.75,
    });
    const pile = new THREE.Mesh(pileGeom, pileMatRef);
    petriGroup.add(pile);
    sceneRoot.add(petriGroup);

    const granuleGroup = new THREE.Group();
    granuleGroup.visible = false;
    sceneRoot.add(granuleGroup);

    const state = {
      scene, sceneRoot, camera, renderer,
      magCamera, magRenderer, magMount, magFocus,
      CAM_YAW, CAM_PITCH, MAG_DIST,
      liquid, liquidMat, surface, baseWaterColor,
      outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
      crystalGroup, crystals: [],
      waterStream, stirRod, granuleGroup,
      petriGroup, pile, pileMatRef,
      beakerBottomY, beakerHeight, beakerRadius, beakerTopY,
      lampCenterY,
      waterLevel: 0, soluteAnim: 0, flame: 0, time: 0,
      petriTilt: 0,
      envMap,
    };
    stateRef.current = state;

    let animId;
    const animate = () => {
      const p = propsRef.current;
      state.time++;
      updateScene(state, p);
      renderer.render(scene, camera);
      if (magnifierOnRef.current && magRenderer) {
        // 돋보기 카메라 초점을 현재 위치에 맞춰 업데이트
        updateMagnifierCamera(state, magPosRef.current, mount.clientWidth, mount.clientHeight);
        magRenderer.render(scene, magCamera);
      }
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

    let magRo = null;
    if (magMount && magRenderer) {
      magRo = new ResizeObserver(() => {
        const s = magMount.clientWidth;
        if (s > 0) magRenderer.setSize(s, s);
      });
      magRo.observe(magMount);
    }

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (magRo) magRo.disconnect();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (magMount && magRenderer && magMount.contains(magRenderer.domElement)) {
        magMount.removeChild(magRenderer.domElement);
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
      if (magRenderer) magRenderer.dispose();
    };
  }, []);

  const p = props;
  const temperature = p.temperature ?? 20;
  const phase = p.phase || 'empty';
  const tempColor = temperature >= 60 ? '#D94A4A' : temperature <= 20 ? '#4A7ED9' : '#4A9AD9';
  const phaseLabel = {
    'fillingWater': '💧 물 붓는 중...',
    'heating': '🔥 가열 중...',
    'solute-added': '🥄 물질 넣는 중...',
    'stirring': '🥢 녹이는 중...',
    'cooling': '❄️ 냉각 중...',
  }[phase];

  // 돋보기 드래그 핸들러
  const containerRef = useRef(null);
  const onDragStart = (clientX, clientY) => {
    const center = { x: magPos.x + MAG_SIZE / 2, y: magPos.y + MAG_SIZE / 2 };
    dragStateRef.current = {
      dragging: true,
      offsetX: clientX - center.x,
      offsetY: clientY - center.y,
    };
  };
  const onDragMove = (clientX, clientY) => {
    if (!dragStateRef.current.dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = clientX - rect.left - dragStateRef.current.offsetX;
    const cy = clientY - rect.top - dragStateRef.current.offsetY;
    const nx = Math.max(0, Math.min(rect.width - MAG_SIZE, cx - MAG_SIZE / 2));
    const ny = Math.max(0, Math.min(rect.height - MAG_SIZE, cy - MAG_SIZE / 2));
    setMagPos({ x: nx, y: ny });
  };
  const onDragEnd = () => { dragStateRef.current.dragging = false; };

  const handleMouseDown = (e) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  };
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    if (t) onDragStart(t.clientX, t.clientY);
  };
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragStateRef.current.dragging) onDragMove(e.clientX, e.clientY);
    };
    const handleMouseUp = () => onDragEnd();
    const handleTouchMove = (e) => {
      if (dragStateRef.current.dragging) {
        const t = e.touches[0];
        if (t) { onDragMove(t.clientX, t.clientY); e.preventDefault(); }
      }
    };
    const handleTouchEnd = () => onDragEnd();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: `${height}px`, position: 'relative',
        background: 'linear-gradient(180deg, #F5F7FA 0%, #DBE3EC 100%)',
        borderRadius: 12, overflow: 'hidden', touchAction: magnifierOn ? 'none' : 'pan-y',
      }}
    >
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', top: 12, right: 14,
        fontSize: 16, fontWeight: 700, color: tempColor,
        fontFamily: 'system-ui, sans-serif',
        textShadow: '0 1px 2px rgba(255,255,255,0.95)',
        pointerEvents: 'none',
      }}>
        {Math.round(temperature)}℃
      </div>

      {phaseLabel && (
        <div style={{
          position: 'absolute', top: 12, left: 14,
          fontSize: 11, color: '#374151',
          background: 'rgba(255,255,255,0.88)',
          padding: '4px 10px', borderRadius: 12,
          fontWeight: 600, pointerEvents: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {phaseLabel}
        </div>
      )}

      {/* 돋보기 버튼 */}
      <button
        onClick={() => setMagnifierOn(v => !v)}
        aria-label="돋보기"
        style={{
          position: 'absolute', right: 12, bottom: 12,
          width: 44, height: 44, borderRadius: 22,
          background: magnifierOn
            ? 'linear-gradient(135deg, #4A7ED9, #3B5FC2)'
            : 'rgba(255,255,255,0.95)',
          color: magnifierOn ? '#fff' : '#4B5563',
          border: '1.5px solid',
          borderColor: magnifierOn ? '#3B5FC2' : '#D4D9E0',
          fontSize: 20, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', zIndex: 10,
        }}
      >
        🔍
      </button>

      {/* 돋보기 확대 뷰 (드래그 가능) */}
      {magnifierOn && (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            position: 'absolute',
            left: magPos.x, top: magPos.y,
            width: MAG_SIZE, height: MAG_SIZE,
            cursor: dragStateRef.current.dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            zIndex: 9,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            border: '4px solid #4B5563',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25), inset 0 0 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            background: '#F5F7FA',
          }}>
            <div
              ref={magnifierMountRef}
              style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            />
          </div>
          <div style={{
            position: 'absolute',
            top: -8, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 700, color: '#fff',
            background: '#4A7ED9',
            padding: '2px 8px',
            borderRadius: 10,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            확대 (드래그)
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ 돋보기 카메라 초점 업데이트 ═══
// 화면 상의 돋보기 중심 좌표 → scene 좌표로 역투영
function updateMagnifierCamera(state, magPos, containerW, containerH) {
  const { camera, magCamera, CAM_YAW, CAM_PITCH, MAG_DIST } = state;
  const centerX = magPos.x + 70; // MAG_SIZE/2
  const centerY = magPos.y + 70;

  // 화면 정규좌표 (-1 ~ 1)
  const ndcX = (centerX / containerW) * 2 - 1;
  const ndcY = -((centerY / containerH) * 2 - 1);

  // y=0 평면에 투영 (비커 중앙 높이)
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const targetY = -0.1; // 비커 중앙 근처
  // 평면 y=targetY와 ray 교차
  const rayOrigin = raycaster.ray.origin;
  const rayDir = raycaster.ray.direction;
  if (Math.abs(rayDir.y) < 0.0001) return;
  const t = (targetY - rayOrigin.y) / rayDir.y;
  const focus = new THREE.Vector3(
    rayOrigin.x + rayDir.x * t,
    rayOrigin.y + rayDir.y * t,
    rayOrigin.z + rayDir.z * t
  );

  state.magFocus.copy(focus);
  magCamera.position.set(
    focus.x + Math.sin(CAM_YAW) * MAG_DIST,
    focus.y + Math.sin(CAM_PITCH) * MAG_DIST + 0.05,
    focus.z + Math.cos(CAM_YAW) * MAG_DIST
  );
  magCamera.lookAt(focus);
}

// ═══ Scene update ═══
function updateScene(state, p) {
  const {
    liquid, liquidMat, surface, baseWaterColor,
    outerFlame, outerFlameMat, innerFlame, innerFlameMat, flameLight,
    crystalGroup, crystals,
    waterStream, stirRod, granuleGroup,
    petriGroup, pile, pileMatRef,
    beakerBottomY, beakerHeight, beakerRadius, beakerTopY,
  } = state;

  const sub = SUBSTANCES[p.substanceId] || SUBSTANCES.KNO3;
  const crystalColor = getCrystalColor(sub);
  const waterMass = p.waterMass ?? 0;
  const dissolvedMass = p.dissolvedMass ?? 0;
  const precipitatedMass = p.precipitatedMass ?? 0;
  const maxDissolvedMass = p.maxDissolvedMass ?? 1;
  const phase = p.phase || 'empty';
  const isLighterThanWater = sub.density < 1.0;
  const time = state.time;

  const dissolvedRatio = maxDissolvedMass > 0 ? Math.min(1, dissolvedMass / maxDissolvedMass) : 0;
  const effectiveMass = waterMass + dissolvedMass * 0.55;
  const waterRatio = waterMass > 0
    ? Math.min(0.88, Math.max(0.06, effectiveMass / BEAKER_CAPACITY))
    : 0;

  let tWater, tSolute, tFlame;
  let showGranules = false, showStirRod = false, showStream = false, showPetri = false;

  switch (phase) {
    case 'empty': tWater = 0; tSolute = 0; tFlame = 0; break;
    case 'fillingWater':
      tWater = waterRatio; tSolute = 0; tFlame = 0; showStream = true; break;
    case 'water': tWater = waterRatio; tSolute = 0; tFlame = 0; break;
    case 'heating':
    case 'heated': tWater = waterRatio; tSolute = 0; tFlame = 1; break;
    case 'solute-added':
      tWater = waterRatio; tSolute = 0; tFlame = 1;
      showGranules = true; showPetri = true; break;
    case 'stirring':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 1;
      showGranules = true; showStirRod = true; break;
    case 'saturated':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 1; break;
    case 'cooling':
    case 'cold':
      tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 0; break;
    default: tWater = waterRatio; tSolute = dissolvedRatio; tFlame = 0;
  }

  state.waterLevel += (tWater - state.waterLevel) * 0.05;
  state.soluteAnim += (tSolute - state.soluteAnim) * 0.05;
  state.flame += (tFlame - state.flame) * 0.08;

  const wl = state.waterLevel;
  const liquidHeight = Math.max(0.001, wl * beakerHeight * 0.98);
  liquid.scale.y = liquidHeight;
  liquid.position.y = beakerBottomY + liquidHeight / 2 + 0.01;
  liquid.visible = wl > 0.01;

  // 용액 색: 무색 물질이면 물색 유지, 유색 물질이면 살짝 섞임
  const isColorless = sub.realColor === '무색' || sub.realColor === '흰색';
  const soluteCol = new THREE.Color(isColorless ? '#5fb4d4' : sub.displayColor);
  liquidMat.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * (isColorless ? 0 : 0.5));

  const liquidTopY = liquid.position.y + liquidHeight / 2;

  surface.visible = wl > 0.03;
  if (surface.visible) {
    surface.position.y = liquidTopY + 0.001;
    surface.material.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * (isColorless ? 0 : 0.4));
  }

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

  waterStream.visible = showStream && wl < tWater - 0.01;
  if (waterStream.visible) {
    const streamTopY = 2.2;
    const streamBottomY = liquidTopY;
    const sh = Math.max(0.1, streamTopY - streamBottomY);
    waterStream.scale.y = sh;
    waterStream.position.set(Math.sin(time * 0.25) * 0.008, (streamTopY + streamBottomY) / 2, 0);
  }

  stirRod.visible = showStirRod;
  if (showStirRod) {
    const angle = time * 0.1;
    const orbitR = 0.3;
    stirRod.position.set(Math.cos(angle) * orbitR, liquidTopY - 0.05, Math.sin(angle) * orbitR);
    stirRod.rotation.z = Math.sin(angle) * 0.08;
  }

  // 페트리 (기울기 완료 시 접시 가루 완전히 비움)
  petriGroup.visible = showPetri;
  if (showPetri) {
    const targetTilt = 1.3; // 더 크게 기울임 (완전히 쏟음)
    state.petriTilt += (targetTilt - state.petriTilt) * 0.035;
    const pivotX = -beakerRadius * 0.85;
    const pivotY = beakerTopY + 0.2;
    const tilt = state.petriTilt;
    const dishDist = 0.3;
    petriGroup.position.set(
      pivotX + dishDist * Math.cos(tilt),
      pivotY - dishDist * Math.sin(tilt) * 0.3,
      0
    );
    petriGroup.rotation.z = -tilt;
    pileMatRef.color.set(crystalColor);
    // 기울어질수록 pile 완전히 축소 → 0
    pile.scale.setScalar(Math.max(0, 1 - tilt / 1.0));
  } else {
    state.petriTilt += (0 - state.petriTilt) * 0.1;
  }

  granuleGroup.visible = showGranules;
  if (showGranules) {
    const granuleRatio = phase === 'stirring' ? (1 - state.soluteAnim) : 1;
    const targetCount = phase === 'solute-added' ? 28 : Math.floor(28 * granuleRatio);

    while (granuleGroup.children.length < targetCount) {
      const gSize = 0.013 + Math.random() * 0.008;
      const gGeom = new THREE.SphereGeometry(gSize, 8, 6);
      const gMat = new THREE.MeshStandardMaterial({
        color: crystalColor, roughness: 0.5, metalness: 0.1,
      });
      const g = new THREE.Mesh(gGeom, gMat);
      if (phase === 'solute-added') {
        const pivotX = -beakerRadius * 0.85;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * beakerRadius * 0.7;
        g.position.set(pivotX + 0.3 + Math.random() * 0.3,
                       beakerTopY + 0.15 - Math.random() * 0.05,
                       (Math.random() - 0.5) * 0.3);
        g.userData = {
          falling: true,
          vx: -0.004 - Math.random() * 0.004,
          vy: -0.002,
          targetX: Math.cos(angle) * r,
          targetZ: Math.sin(angle) * r,
          targetY: liquidTopY + 0.005,
          bob: Math.random() * Math.PI * 2,
        };
      } else {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * beakerRadius * 0.85;
        g.position.set(Math.cos(angle) * r, liquidTopY + 0.005, Math.sin(angle) * r);
        g.userData = { falling: false, bob: Math.random() * Math.PI * 2 };
      }
      granuleGroup.add(g);
    }
    while (granuleGroup.children.length > targetCount) {
      const g = granuleGroup.children[granuleGroup.children.length - 1];
      granuleGroup.remove(g);
      g.geometry.dispose();
      g.material.dispose();
    }
    granuleGroup.children.forEach(g => {
      if (g.userData.falling) {
        g.userData.vy -= 0.0008;
        g.position.x += g.userData.vx;
        g.position.y += g.userData.vy;
        if (g.position.y <= g.userData.targetY) {
          g.position.y = g.userData.targetY;
          g.position.x = g.userData.targetX;
          g.position.z = g.userData.targetZ;
          g.userData.falling = false;
        }
      } else {
        g.position.y = liquidTopY + 0.005 + Math.sin(time * 0.06 + g.userData.bob) * 0.002;
      }
    });
  }

  // 결정 (무색/흰색 물질은 흰색 결정)
  if (phase === 'cooling' || phase === 'cold') {
    const targetCrystalCount = Math.min(50, Math.floor(precipitatedMass * 1.0));
    while (crystals.length < targetCrystalCount) {
      const idx = crystals.length;
      const size = 0.055 + Math.random() * 0.05;
      const cGeom = new THREE.OctahedronGeometry(size, 0);

      const origColor = new THREE.Color(crystalColor);
      const hsl = {};
      origColor.getHSL(hsl);
      // 무색/흰색은 채도 boost 안 함
      const enhancedColor = (sub.realColor === '무색' || sub.realColor === '흰색')
        ? origColor.clone()
        : new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.15), hsl.l * 0.95);

      const cMat = new THREE.MeshStandardMaterial({
        color: enhancedColor,
        roughness: 0.12,
        metalness: 0.25,
        transparent: true,
        opacity: 0,
        flatShading: true,
        envMapIntensity: 1.4,
      });
      const c = new THREE.Mesh(cGeom, cMat);

      const level = Math.floor(idx / 9);
      const posInLevel = idx % 9;
      const baseAngle = (posInLevel / 9) * Math.PI * 2 + level * 0.3;
      const radius = 0.08 + (level % 3) * 0.16 + Math.random() * 0.1;
      const x = Math.cos(baseAngle) * radius;
      const z = Math.sin(baseAngle) * radius;

      let targetY, startY, dir;
      if (isLighterThanWater) {
        targetY = liquidTopY - 0.05 - level * 0.05;
        startY = beakerBottomY + 0.3 + Math.random() * 0.15;
        dir = -1;
      } else {
        targetY = beakerBottomY + 0.06 + level * 0.065;
        startY = liquidTopY - 0.1 - Math.random() * 0.05;
        dir = 1;
      }

      c.position.set(x, startY, z);
      c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      c.userData = {
        targetY, settled: false, direction: dir,
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
        c.position.y = c.userData.targetY; c.userData.settled = true;
      } else if (c.userData.direction < 0 && c.position.y <= c.userData.targetY) {
        c.position.y = c.userData.targetY; c.userData.settled = true;
      }
    }
  });
}
