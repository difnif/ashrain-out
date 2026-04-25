// src/components/precipitation/Beaker.jsx
// v11 — 물 가시성 강화 + 결정 강조 + 돋보기 확대 기능
//
// 주요 수정:
//   1) 물을 더 진하게: baseWaterColor 0xb8dce8 → 0x89c4dc (선명한 하늘색),
//      liquidMat transmission 0.3 → 0.15, opacity 0.95 유지
//   2) 결정 강화: 크기 0.035~0.07 → 0.055~0.1, 색 채도 높임
//      (더 많이/크게 만들어 확실히 보이도록), 바닥에 깔리는 조건 개선
//   3) 돋보기 확대 기능:
//      - 우측 하단 돋보기 버튼
//      - 클릭 시 두 번째 렌더러로 비커 내부 확대 뷰 표시
//      - 원형 마스크 + 유리 테두리 스타일

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SUBSTANCES } from '../../data/solubilityData';

const BEAKER_CAPACITY = 500;

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

    // ═══ 메인 카메라 (사선 구도) ═══
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // ═══ 돋보기 카메라 (확대용) ═══
    // 비커 바닥 근처를 가까이에서 본다 (결정이 쌓이는 모습 관찰)
    const magCamera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
    const magFocus = new THREE.Vector3(0, -0.35, 0); // 비커 바닥 근처
    magCamera.position.set(
      Math.sin(CAM_YAW) * 2.2,
      Math.sin(CAM_PITCH) * 2.2 + 0.1,
      Math.cos(CAM_YAW) * 2.2
    );
    magCamera.lookAt(magFocus);

    // 돋보기 렌더러 (별도)
    let magRenderer = null;
    if (magMount) {
      magRenderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true,
      });
      magRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      magRenderer.shadowMap.enabled = true;
      magRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      magRenderer.outputEncoding = THREE.sRGBEncoding;
      magRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      magRenderer.toneMappingExposure = 1.1;
      const magSize = magMount.clientWidth || 140;
      magRenderer.setSize(magSize, magSize);
      magMount.appendChild(magRenderer.domElement);
    }

    // ═══ 환경맵 ═══
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // ═══ 조명 ═══
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(3, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb8d8ff, 0.35);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.25);
    rimLight.position.set(0, 1, -5);
    scene.add(rimLight);

    const flameLight = new THREE.PointLight(0xff6820, 0, 3);
    flameLight.position.set(0, -1.15, 0);
    scene.add(flameLight);

    // ═══ 씬 루트 ═══
    const sceneRoot = new THREE.Group();
    sceneRoot.scale.setScalar(0.82);
    scene.add(sceneRoot);

    // 치수
    const beakerRadius = 0.7;
    const beakerHeight = 1.35;
    const beakerBottomY = -0.45;
    const beakerTopY = beakerBottomY + beakerHeight;

    // 바닥
    const groundGeom = new THREE.PlaneGeometry(8, 8);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = beakerBottomY - 1.6;
    ground.receiveShadow = true;
    sceneRoot.add(ground);

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

    // ═══ 용액 (물 진하게) ═══
    const baseWaterColor = new THREE.Color(0x89c4dc); // 더 선명한 하늘색
    const liquidGeom = new THREE.CylinderGeometry(beakerRadius * 0.985, beakerRadius * 0.985, 1, 64);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      transmission: 0.15,  // 더 낮춤 (0.3 → 0.15)
      transparent: true,
      opacity: 0.95,
      roughness: 0.08,
      metalness: 0,
      ior: 1.33,
      thickness: 0.4,
      envMapIntensity: 0.7,
    });
    const liquid = new THREE.Mesh(liquidGeom, liquidMat);
    liquid.scale.y = 0.001;
    liquid.position.y = beakerBottomY + 0.015;
    sceneRoot.add(liquid);

    // 수면 하이라이트
    const surfaceGeom = new THREE.CircleGeometry(beakerRadius * 0.985, 64);
    const surfaceMat = new THREE.MeshPhysicalMaterial({
      color: baseWaterColor.clone(),
      metalness: 0, roughness: 0.05,
      transparent: true, opacity: 0.6,
      envMapIntensity: 1.3,
    });
    const surface = new THREE.Mesh(surfaceGeom, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.visible = false;
    sceneRoot.add(surface);

    // 삼각대
    const standGroup = new THREE.Group();
    const standY = beakerBottomY - 0.05;
    const gauzeGeom = new THREE.BoxGeometry(beakerRadius * 2.6, 0.03, beakerRadius * 2.2);
    const gauzeMat = new THREE.MeshStandardMaterial({
      color: 0x8894a0, roughness: 0.55, metalness: 0.45, envMapIntensity: 0.6,
    });
    const gauze = new THREE.Mesh(gauzeGeom, gauzeMat);
    gauze.position.y = standY;
    gauze.castShadow = true;
    gauze.receiveShadow = true;
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
      leg.castShadow = true;
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
    lampBody.castShadow = true;
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
    wickCap.castShadow = true;
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

    // 결정
    const crystalGroup = new THREE.Group();
    sceneRoot.add(crystalGroup);

    // 물줄기
    const streamGeom = new THREE.CylinderGeometry(0.03, 0.045, 1, 12);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: 0x5ca0d0, transparent: true, opacity: 0.9,
      roughness: 0.1, metalness: 0, transmission: 0.3, ior: 1.33,
    });
    const waterStream = new THREE.Mesh(streamGeom, streamMat);
    waterStream.visible = false;
    sceneRoot.add(waterStream);

    // 유리막대
    const rodGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 16);
    const rodMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.06,
      transmission: 0.85, thickness: 0.3,
      transparent: true, opacity: 1, ior: 1.5, clearcoat: 0.9,
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
    pile.castShadow = true;
    petriGroup.add(pile);
    sceneRoot.add(petriGroup);

    const granuleGroup = new THREE.Group();
    granuleGroup.visible = false;
    sceneRoot.add(granuleGroup);

    const state = {
      scene, sceneRoot, camera, renderer,
      magCamera, magRenderer, magMount,
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
      // 돋보기 활성 시 추가 렌더
      if (magnifierOnRef.current && magRenderer) {
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

    // 돋보기 렌더러 사이즈 업데이트
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
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
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

  return (
    <div style={{
      width: '100%', height: `${height}px`, position: 'relative',
      background: 'linear-gradient(180deg, #F5F7FA 0%, #DBE3EC 100%)',
      borderRadius: 12, overflow: 'hidden', touchAction: 'pan-y',
    }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* 온도 */}
      <div style={{
        position: 'absolute', top: 12, right: 14,
        fontSize: 16, fontWeight: 700, color: tempColor,
        fontFamily: 'system-ui, sans-serif',
        textShadow: '0 1px 2px rgba(255,255,255,0.95)',
        pointerEvents: 'none',
      }}>
        {Math.round(temperature)}℃
      </div>

      {/* phase 라벨 */}
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

      {/* 돋보기 버튼 (우측 하단) */}
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
          fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        🔍
      </button>

      {/* 돋보기 확대 뷰 */}
      {magnifierOn && (
        <div style={{
          position: 'absolute',
          left: 12, bottom: 12,
          width: 140, height: 140,
          pointerEvents: 'none',
        }}>
          {/* 유리 렌즈 테두리 */}
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
              }}
            />
          </div>
          {/* 손잡이 */}
          <div style={{
            position: 'absolute',
            right: -18, bottom: -18,
            width: 36, height: 10,
            background: 'linear-gradient(90deg, #4B5563, #6B7280)',
            borderRadius: 5,
            transform: 'rotate(45deg)',
            transformOrigin: 'left center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }} />
          {/* 라벨 */}
          <div style={{
            position: 'absolute',
            top: -8, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 700, color: '#fff',
            background: '#4A7ED9',
            padding: '2px 8px',
            borderRadius: 10,
            whiteSpace: 'nowrap',
          }}>
            확대
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Scene update (v10과 동일 + 결정 강화) ═══
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

  const soluteCol = new THREE.Color(sub.displayColor);
  liquidMat.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * 0.6);

  const liquidTopY = liquid.position.y + liquidHeight / 2;

  surface.visible = wl > 0.03;
  if (surface.visible) {
    surface.position.y = liquidTopY + 0.001;
    surface.material.color.copy(baseWaterColor).lerp(soluteCol, state.soluteAnim * 0.5);
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

  // 페트리
  petriGroup.visible = showPetri;
  if (showPetri) {
    const targetTilt = 0.75;
    state.petriTilt += (targetTilt - state.petriTilt) * 0.04;
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
    pileMatRef.color.set(sub.displayColor);
    pile.scale.setScalar(Math.max(0.1, 1 - tilt * 0.8));
  } else {
    state.petriTilt += (0 - state.petriTilt) * 0.1;
  }

  granuleGroup.visible = showGranules;
  if (showGranules) {
    const granuleRatio = phase === 'stirring' ? (1 - state.soluteAnim) : 1;
    const targetCount = phase === 'solute-added' ? 22 : Math.floor(28 * granuleRatio);

    while (granuleGroup.children.length < targetCount) {
      const gSize = 0.013 + Math.random() * 0.008;
      const gGeom = new THREE.SphereGeometry(gSize, 8, 6);
      const gMat = new THREE.MeshStandardMaterial({
        color: sub.displayColor, roughness: 0.5, metalness: 0.1,
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

  // ═══ 결정 (크기·개수·색상 강화) ═══
  if (phase === 'cooling' || phase === 'cold') {
    // 개수 증가: 0.7 → 1.0 계수, 최대 50개
    const targetCrystalCount = Math.min(50, Math.floor(precipitatedMass * 1.0));
    while (crystals.length < targetCrystalCount) {
      const idx = crystals.length;
      // 크기 증가: 0.035~0.07 → 0.055~0.105
      const size = 0.055 + Math.random() * 0.05;
      const cGeom = new THREE.OctahedronGeometry(size, 0);

      // 색상 강화: 원본 색에 채도 boost
      const origColor = new THREE.Color(sub.displayColor);
      const hsl = {};
      origColor.getHSL(hsl);
      const enhancedColor = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.15), hsl.l * 0.95);

      const cMat = new THREE.MeshStandardMaterial({
        color: enhancedColor,
        roughness: 0.12,
        metalness: 0.4,
        transparent: true,
        opacity: 0,
        flatShading: true,
        envMapIntensity: 1.4,
      });
      const c = new THREE.Mesh(cGeom, cMat);
      c.castShadow = true;

      // 배치: 바닥 중심부에 더 조밀하게
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
