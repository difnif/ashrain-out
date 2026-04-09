import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createGearGeometry, createGearEdges,
  createGearMaterial, createFirstGearMaterial, createEdgeMaterial,
  getStyleBg, DEFAULT_STYLE,
} from "./GearMesh";

// ============================================================
// 다니엘 데 브루인 구조:
//   한 단(stage) = 큰 기어(bigGear, 톱니 B개) + 작은 피니언(pinion, 톱니 1개 비율)
//   같은 축에 박혀 함께 회전. 단 i의 pinion이 단 i+1의 bigGear와 맞물려 1/B 감속.
//   두 평행축 — 짝수 단은 shaft 0, 홀수 단은 shaft 1.
// ============================================================

// 기하 상수
const R_BIG = 1.0;          // 큰 기어 반지름
const R_PIN = 0.25;         // 작은 피니언 반지름
const SHAFT_DIST = R_BIG + R_PIN;  // 두 축 사이 거리 (인접 단 맞물림 조건)

// X 방향: 한 단의 bigGear와 pinion 사이 간격 = 단 간격
// 인접 단의 bigGear가 정확히 그 사이 X에 위치
const X_STEP = 0.32;        // 부품 간 가로 간격
const DEPTH = 0.18;         // 기어 두께

const MAX_STAGES = 100;

// 단 i의 위치 정보
function stageGeometry(i) {
  const onShaft0 = i % 2 === 0;
  const z = onShaft0 ? -SHAFT_DIST / 2 : SHAFT_DIST / 2;
  // X: bigGear는 단의 시작 위치, pinion은 step만큼 다음
  const xBig = i * X_STEP * 2;
  const xPin = xBig + X_STEP;
  return { xBig, xPin, z };
}

export default function GearTowerScene({
  B, E, controller, previewMode, theme,
  onFirstGearDrag, onFirstGearRelease,
  previewRpm,
  styleKey = DEFAULT_STYLE,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const onFirstGearDragRef = useRef(onFirstGearDrag);
  onFirstGearDragRef.current = onFirstGearDrag;
  const onFirstGearReleaseRef = useRef(onFirstGearRelease);
  onFirstGearReleaseRef.current = onFirstGearRelease;
  const previewRpmRef = useRef(previewRpm);
  previewRpmRef.current = previewRpm;

  // ============ MOUNT: 씬 1회 생성 ============
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const initStyle = styleKey;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(getStyleBg(initStyle));

    const width = mount.clientWidth || 300;
    const height = mount.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    camera.position.set(0.5, 1.2, 4.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x606060, 0.85);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffcfa0, 0.7);
    rim.position.set(-4, 2, -5);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-2, -3, 2);
    scene.add(fill);

    const gearGroup = new THREE.Group();
    scene.add(gearGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.enabled = false;

    const state = {
      scene, camera, renderer, controls, gearGroup,
      bigGeom: null,
      pinGeom: null,
      bigEdges: null,
      pinEdges: null,
      stageMaterials: [],
      firstMaterial: createFirstGearMaterial(initStyle),
      edgeMaterial: createEdgeMaterial(initStyle),
      // stageEntries[i] = { bigMesh, pinMesh, bigEdgesMesh, pinEdgesMesh,
      //                    targetScale, currentScale, removing }
      stageEntries: [],
      raycaster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      dragging: false,
      lastDragY: 0,
      currentB: 10,
      currentE: 0,
      currentPreview: null,
      currentStyle: initStyle,
      mounted: true,
    };
    stateRef.current = state;

    // Pointer handlers
    function getClientXY(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width * 2 - 1,
        y: -(e.clientY - rect.top) / rect.height * 2 + 1,
      };
    }
    function onPointerDown(e) {
      if (state.currentPreview || !onFirstGearDragRef.current) return;
      if (state.stageEntries.length === 0) return;
      const p = getClientXY(e);
      state.ndc.set(p.x, p.y);
      state.raycaster.setFromCamera(state.ndc, state.camera);
      // 첫 단의 bigMesh와 pinMesh 둘 다 hit 대상
      const targets = [
        state.stageEntries[0].bigMesh,
        state.stageEntries[0].pinMesh,
      ].filter(Boolean);
      const hits = state.raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        state.dragging = true;
        state.lastDragY = e.clientY;
        state.controls.enabled = false;
        try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
      }
    }
    function onPointerMove(e) {
      if (!state.dragging) return;
      const dy = e.clientY - state.lastDragY;
      state.lastDragY = e.clientY;
      const deltaAngle = -dy / 100;
      if (onFirstGearDragRef.current) onFirstGearDragRef.current(deltaAngle);
    }
    function onPointerUp(e) {
      if (!state.dragging) return;
      state.dragging = false;
      if (!state.currentPreview) state.controls.enabled = true;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      if (onFirstGearReleaseRef.current) onFirstGearReleaseRef.current();
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    // Animation loop
    let raf;
    let lastT = performance.now() / 1000;
    function animate() {
      if (!state.mounted) return;
      try {
        const tNow = performance.now() / 1000;
        const dt = Math.min(0.05, tNow - lastT);
        lastT = tNow;

        // scale animation (single 또는 add/remove)
        for (let i = state.stageEntries.length - 1; i >= 0; i--) {
          const entry = state.stageEntries[i];
          const diff = entry.targetScale - entry.currentScale;
          if (Math.abs(diff) > 0.002) {
            entry.currentScale += diff * Math.min(1, dt * 9);
          } else if (entry.currentScale !== entry.targetScale) {
            entry.currentScale = entry.targetScale;
          }
          entry.bigMesh.scale.setScalar(entry.currentScale);
          if (entry.pinMesh) entry.pinMesh.scale.setScalar(entry.currentScale);

          if (entry.removing && entry.currentScale < 0.02) {
            state.gearGroup.remove(entry.bigMesh);
            if (entry.pinMesh) state.gearGroup.remove(entry.pinMesh);
            state.stageEntries.splice(i, 1);
          }
        }

        // rotation
        const pm = state.currentPreview;
        if (pm === "single" && state.stageEntries.length > 0) {
          // 단일 미리보기: bigGear만 보이고 자기 축 회전
          const rpm = previewRpmRef.current;
          const radPerSec = (typeof rpm === "number" && rpm > 0)
            ? (rpm / 60) * Math.PI * 2
            : 0.5;
          const m = state.stageEntries[0].bigMesh;
          m.rotation.z += radPerSec * dt;
        } else if (pm === "tower" && state.stageEntries.length > 0) {
          // 타워 미리보기: 첫 단 회전 + 캐스케이드 (실제 게어비)
          const first = state.stageEntries[0];
          first.bigMesh.rotation.x += 0.7 * dt;
          if (first.pinMesh) first.pinMesh.rotation.x = first.bigMesh.rotation.x;
          const invB = -1 / Math.max(2, state.currentB);
          let r = first.bigMesh.rotation.x;
          for (let i = 1; i < state.stageEntries.length; i++) {
            r *= invB;
            state.stageEntries[i].bigMesh.rotation.x = r;
            if (state.stageEntries[i].pinMesh) {
              state.stageEntries[i].pinMesh.rotation.x = r;
            }
          }
        } else if (!pm && controllerRef.current) {
          const c = controllerRef.current;
          if (c.step) c.step(dt);
          const rots = c.rotations;
          for (let i = 0; i < state.stageEntries.length && i < rots.length; i++) {
            const angle = rots[i];
            state.stageEntries[i].bigMesh.rotation.x = angle;
            if (state.stageEntries[i].pinMesh) {
              state.stageEntries[i].pinMesh.rotation.x = angle;
            }
          }
        }

        state.controls.update();
        state.renderer.render(state.scene, state.camera);
      } catch (err) {
        console.warn("[GearTowerScene] animate error:", err);
      }
      if (state.mounted) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    function onResize() {
      if (!mount || !state.mounted) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      state.camera.aspect = w / h;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Cleanup — Three.js 리소스 누수 방지
    return () => {
      try { state.mounted = false; } catch {}
      try { cancelAnimationFrame(raf); } catch {}
      try { window.removeEventListener("resize", onResize); } catch {}
      try { ro.disconnect(); } catch {}
      try {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      } catch {}
      try { controls.dispose(); } catch {}

      // gear meshes
      try {
        for (const entry of state.stageEntries) {
          try { state.gearGroup.remove(entry.bigMesh); } catch {}
          if (entry.pinMesh) try { state.gearGroup.remove(entry.pinMesh); } catch {}
        }
        state.stageEntries.length = 0;
      } catch {}

      // shared geom/materials
      try { if (state.bigGeom) state.bigGeom.dispose(); } catch {}
      try { if (state.pinGeom) state.pinGeom.dispose(); } catch {}
      try { if (state.bigEdges) state.bigEdges.dispose(); } catch {}
      try { if (state.pinEdges) state.pinEdges.dispose(); } catch {}
      try { state.stageMaterials.forEach(m => { try { m.dispose(); } catch {} }); } catch {}
      try { state.firstMaterial.dispose(); } catch {}
      try { state.edgeMaterial.dispose(); } catch {}

      // scene 전체 traverse dispose
      try {
        scene.traverse((obj) => {
          if (obj.geometry && typeof obj.geometry.dispose === "function") {
            try { obj.geometry.dispose(); } catch {}
          }
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) try { m.dispose(); } catch {}
          }
        });
        while (scene.children.length > 0) scene.remove(scene.children[0]);
      } catch {}

      try { renderer.dispose(); } catch {}
      try {
        const ctx = renderer.getContext && renderer.getContext();
        const lose = ctx && ctx.getExtension && ctx.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      } catch {}
      try {
        if (renderer.domElement && renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      } catch {}

      stateRef.current = null;
    };
  }, []);

  // ============ STYLE EFFECT ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.currentStyle === styleKey) return;

    s.currentStyle = styleKey;
    s.scene.background = new THREE.Color(getStyleBg(styleKey));

    try { s.firstMaterial.dispose(); } catch {}
    try { s.edgeMaterial.dispose(); } catch {}
    for (const m of s.stageMaterials) try { m.dispose(); } catch {}
    s.stageMaterials = [];

    s.firstMaterial = createFirstGearMaterial(styleKey);
    s.edgeMaterial = createEdgeMaterial(styleKey);

    for (let i = 0; i < s.stageEntries.length; i++) {
      const entry = s.stageEntries[i];
      let mat;
      if (i === 0) {
        mat = s.firstMaterial;
      } else {
        mat = createGearMaterial(i, styleKey);
        s.stageMaterials.push(mat);
      }
      entry.bigMesh.material = mat;
      if (entry.pinMesh) entry.pinMesh.material = mat;
      // 엣지 머티리얼 — child LineSegments
      entry.bigMesh.children.forEach(c => {
        if (c.isLineSegments) c.material = s.edgeMaterial;
      });
      if (entry.pinMesh) {
        entry.pinMesh.children.forEach(c => {
          if (c.isLineSegments) c.material = s.edgeMaterial;
        });
      }
    }
  }, [styleKey]);

  // ============ B EFFECT: 기어 지오메트리 재생성 ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.currentB = B;

    // bigGear: 톱니 B개, 반지름 R_BIG
    // pinion: 톱니 1개 (실제로는 시각상 4개로 그림), 반지름 R_PIN
    // 톱니 비율 1/B는 *물리*에서 처리. 시각적으로는 크기 차이로 표현.
    const bigT = Math.max(2, Math.min(200, B));
    const pinT = Math.max(2, Math.min(20, Math.round(bigT / Math.max(2, B / 4))));
    // 위 식: bigT가 작을 때(B=2) pinT=4, 클 때(B=100)도 pinT=4 정도

    const newBigGeom = createGearGeometry(bigT, {
      outerR: R_BIG, innerR: R_BIG * 0.82, holeR: R_BIG * 0.15, depth: DEPTH,
    });
    const newPinGeom = createGearGeometry(pinT, {
      outerR: R_PIN, innerR: R_PIN * 0.7, holeR: R_PIN * 0.35, depth: DEPTH,
    });
    const newBigEdges = createGearEdges(newBigGeom);
    const newPinEdges = createGearEdges(newPinGeom);

    if (s.bigGeom) s.bigGeom.dispose();
    if (s.pinGeom) s.pinGeom.dispose();
    if (s.bigEdges) s.bigEdges.dispose();
    if (s.pinEdges) s.pinEdges.dispose();

    s.bigGeom = newBigGeom;
    s.pinGeom = newPinGeom;
    s.bigEdges = newBigEdges;
    s.pinEdges = newPinEdges;

    // 기존 mesh들의 geometry 교체
    for (const entry of s.stageEntries) {
      entry.bigMesh.geometry = newBigGeom;
      if (entry.pinMesh) entry.pinMesh.geometry = newPinGeom;
      // 엣지도 교체
      entry.bigMesh.children.forEach(c => {
        if (c.isLineSegments) c.geometry = newBigEdges;
      });
      if (entry.pinMesh) {
        entry.pinMesh.children.forEach(c => {
          if (c.isLineSegments) c.geometry = newPinEdges;
        });
      }
    }
  }, [B]);

  // ============ E EFFECT: 단 추가/제거 ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.bigGeom) return;
    const target = Math.max(1, Math.min(MAX_STAGES, E));
    s.currentE = target;

    while (s.stageEntries.length < target) {
      const idx = s.stageEntries.length;
      let mat;
      if (idx === 0) {
        mat = s.firstMaterial;
      } else {
        mat = createGearMaterial(idx, s.currentStyle);
        s.stageMaterials.push(mat);
      }

      // bigGear mesh
      const bigMesh = new THREE.Mesh(s.bigGeom, mat);
      const bigEdgesMesh = new THREE.LineSegments(s.bigEdges, s.edgeMaterial);
      bigMesh.add(bigEdgesMesh);

      // pinion mesh (single 미리보기 모드에선 안 보임)
      const pinMesh = new THREE.Mesh(s.pinGeom, mat);
      const pinEdgesMesh = new THREE.LineSegments(s.pinEdges, s.edgeMaterial);
      pinMesh.add(pinEdgesMesh);

      // 위치/회전은 preview mode 적용 effect에서 처리
      bigMesh.scale.setScalar(0);
      pinMesh.scale.setScalar(0);

      s.gearGroup.add(bigMesh);
      s.gearGroup.add(pinMesh);

      // 모드에 맞는 위치 즉시 적용
      placeMeshes(s, idx, bigMesh, pinMesh);

      s.stageEntries.push({
        bigMesh, pinMesh,
        targetScale: 1,
        currentScale: 0,
        removing: false,
      });
    }

    for (let i = s.stageEntries.length - 1; i >= target; i--) {
      s.stageEntries[i].targetScale = 0;
      s.stageEntries[i].removing = true;
    }
    for (let i = 0; i < Math.min(target, s.stageEntries.length); i++) {
      if (s.stageEntries[i].removing) {
        s.stageEntries[i].removing = false;
        s.stageEntries[i].targetScale = 1;
      }
    }
  }, [E]);

  // 모드별 mesh 위치/회전 배치
  function placeMeshes(s, i, bigMesh, pinMesh) {
    if (s.currentPreview === "single") {
      bigMesh.rotation.set(0, 0, 0);
      bigMesh.position.set(0, 0, 0);
      // pinion은 single 모드에선 숨김
      if (pinMesh) {
        pinMesh.visible = false;
        pinMesh.position.set(0, 0, 0);
      }
      bigMesh.visible = (i === 0); // single 모드에선 첫 단만
    } else {
      const g = stageGeometry(i);
      bigMesh.rotation.set(0, Math.PI / 2, 0);
      bigMesh.position.set(g.xBig, 0, g.z);
      bigMesh.visible = true;
      if (pinMesh) {
        pinMesh.rotation.set(0, Math.PI / 2, 0);
        pinMesh.position.set(g.xPin, 0, g.z);
        pinMesh.visible = true;
      }
    }
  }

  // ============ PREVIEW MODE EFFECT ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.currentPreview = previewMode;

    for (let i = 0; i < s.stageEntries.length; i++) {
      const entry = s.stageEntries[i];
      placeMeshes(s, i, entry.bigMesh, entry.pinMesh);
    }

    if (previewMode === "single") {
      s.camera.position.set(0.4, 0.7, 3.6);
      s.camera.lookAt(0, 0, 0);
      s.controls.target.set(0, 0, 0);
      s.controls.enabled = false;
    } else if (previewMode === "tower") {
      const stages = Math.max(1, Math.min(E, MAX_STAGES));
      const towerLen = stages * X_STEP * 2;
      const midX = towerLen / 2;
      const dist = Math.max(5, towerLen * 0.7 + 4);
      s.camera.position.set(midX - dist * 0.3, 1.8, dist);
      s.camera.lookAt(midX * 0.6, 0, 0);
      s.controls.target.set(midX * 0.6, 0, 0);
      s.controls.enabled = false;
    } else {
      const stages = Math.max(1, Math.min(E, MAX_STAGES));
      const towerLen = stages * X_STEP * 2;
      s.camera.position.set(-2, 2.5, 6.5);
      s.camera.lookAt(1.0, 0, 0);
      s.controls.target.set(1.0, 0, 0);
      s.controls.maxDistance = Math.max(25, towerLen * 2);
      s.controls.minDistance = 1.5;
      s.controls.enablePan = true;
      s.controls.enabled = true;
    }
    s.controls.update();
  }, [previewMode, E]);

  return (
    <div ref={mountRef} style={{
      width: "100%",
      height: "100%",
      minHeight: 240,
      touchAction: "none",
      borderRadius: 12,
      overflow: "hidden",
      background: getStyleBg(styleKey),
    }} />
  );
}
