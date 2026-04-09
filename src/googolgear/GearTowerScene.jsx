import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createGearGeometry, createGearEdges,
  createGearMaterial, createFirstGearMaterial, createEdgeMaterial,
  getStyleBg, DEFAULT_STYLE,
} from "./GearMesh";

// 다니엘 데 브루인 스타일 배치:
// 가로 축(X) 방향으로 기어들이 촘촘히 쌓이는 "통" 형태.
// 두 개의 평행한 축이 가로로 나란히 (앞열/뒷열) — Z축으로 분리.
const X_STEP       = 0.14;
const SHAFT_Z_FRONT = 0.82;
const SHAFT_Z_BACK  = -0.82;
const MAX_STAGES = 100;

function stagePosition(i) {
  return {
    x: i * X_STEP,
    y: 0,
    z: (i % 2 === 0) ? SHAFT_Z_FRONT : SHAFT_Z_BACK,
  };
}

export default function GearTowerScene({
  B, E, controller, previewMode, theme,
  onFirstGearDrag, onFirstGearRelease,
  previewRpm,
  styleKey = DEFAULT_STYLE,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  // 최신 prop을 animate loop에서 참조하기 위한 ref
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const onFirstGearDragRef = useRef(onFirstGearDrag);
  onFirstGearDragRef.current = onFirstGearDrag;
  const onFirstGearReleaseRef = useRef(onFirstGearRelease);
  onFirstGearReleaseRef.current = onFirstGearRelease;
  const previewRpmRef = useRef(previewRpm);
  previewRpmRef.current = previewRpm;

  // ============ MOUNT 전용: 씬 1회 생성 ============
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const initStyle = styleKey;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(getStyleBg(initStyle));

    const width = mount.clientWidth || 300;
    const height = mount.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    camera.position.set(0.5, 0.8, 3.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // 조명: 헤미스피어(채움) + 키(앞위) + 림(뒤) + 필(하단)
    // 스타일 무관하게 충분히 밝게 (어두운 스타일에서 너무 어두워지지 않도록)
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
    controls.enabled = false; // 초기엔 프리뷰니까 비활성

    const state = {
      scene, camera, renderer, controls, gearGroup,
      geom: null,
      edgesGeom: null,
      stageMaterials: [],
      firstMaterial: createFirstGearMaterial(initStyle),
      edgeMaterial: createEdgeMaterial(initStyle),
      gearEntries: [],
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

    // Pointer handlers for manual gear drag
    function getClientXY(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width * 2 - 1,
        y: -(e.clientY - rect.top) / rect.height * 2 + 1,
      };
    }
    function onPointerDown(e) {
      if (state.currentPreview || !onFirstGearDragRef.current) return;
      if (state.gearEntries.length === 0) return;
      const { x, y } = getClientXY(e);
      state.ndc.set(x, y);
      state.raycaster.setFromCamera(state.ndc, state.camera);
      const hits = state.raycaster.intersectObject(state.gearEntries[0].mesh, false);
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
      if (onFirstGearDragRef.current) {
        onFirstGearDragRef.current(deltaAngle);
      }
    }
    function onPointerUp(e) {
      if (!state.dragging) return;
      state.dragging = false;
      if (!state.currentPreview) state.controls.enabled = true;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      // 관성 트리거
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
      const tNow = performance.now() / 1000;
      const dt = Math.min(0.05, tNow - lastT);
      lastT = tNow;

      // Scale add/remove 애니메이션
      for (let i = state.gearEntries.length - 1; i >= 0; i--) {
        const entry = state.gearEntries[i];
        const diff = entry.targetScale - entry.currentScale;
        if (Math.abs(diff) > 0.002) {
          entry.currentScale += diff * Math.min(1, dt * 9);
          entry.mesh.scale.setScalar(entry.currentScale);
        } else if (entry.currentScale !== entry.targetScale) {
          entry.currentScale = entry.targetScale;
          entry.mesh.scale.setScalar(entry.currentScale);
        }
        if (entry.removing && entry.currentScale < 0.02) {
          state.gearGroup.remove(entry.mesh);
          state.gearEntries.splice(i, 1);
        }
      }

      // Rotation animation based on preview mode
      const pm = state.currentPreview;
      if (pm === "single" && state.gearEntries.length > 0) {
        // 단일 기어 회전 — previewRpm이 있으면 그 값 기준, 없으면 기본 느린 회전
        const rpm = previewRpmRef.current;
        const radPerSec = (typeof rpm === "number" && rpm > 0)
          ? (rpm / 60) * Math.PI * 2
          : 0.5;
        const m = state.gearEntries[0].mesh;
        m.rotation.z += radPerSec * dt;
      } else if (pm === "tower" && state.gearEntries.length > 0) {
        // 타워: 첫 기어 spin + cascade (인접 기어는 역방향 회전)
        const first = state.gearEntries[0].mesh;
        first.rotation.x += 0.7 * dt;
        const invB = -1 / Math.max(2, state.currentB);
        let r = first.rotation.x;
        for (let i = 1; i < state.gearEntries.length; i++) {
          r *= invB;
          state.gearEntries[i].mesh.rotation.x = r;
        }
      } else if (!pm && controllerRef.current) {
        const c = controllerRef.current;
        try {
          if (c.step) c.step(dt);
          const rots = c.rotations;
          for (let i = 0; i < state.gearEntries.length && i < rots.length; i++) {
            state.gearEntries[i].mesh.rotation.x = rots[i];
          }
        } catch (err) {
          // 컨트롤러 전환 중 race condition 방지
        }
      }

      state.controls.update();
      state.renderer.render(state.scene, state.camera);
      raf = requestAnimationFrame(animate);
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
    // Also observe mount element size changes
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Cleanup — try/catch로 감싸서 뒤로가기 시 에러가 상위로 전파되지 않도록
    return () => {
      try {
        state.mounted = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        ro.disconnect();
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        controls.dispose();
        if (state.geom) state.geom.dispose();
        if (state.edgesGeom) state.edgesGeom.dispose();
        state.stageMaterials.forEach(m => { try { m.dispose(); } catch {} });
        state.firstMaterial.dispose();
        state.edgeMaterial.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      } catch (err) {
        console.warn("[GearTowerScene] cleanup error:", err);
      }
      stateRef.current = null;
    };
  }, []); // MOUNT ONCE ONLY

  // ============ STYLE EFFECT: rebuild materials + bg ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.currentStyle === styleKey) return;

    s.currentStyle = styleKey;
    s.scene.background = new THREE.Color(getStyleBg(styleKey));

    try { s.firstMaterial.dispose(); } catch {}
    try { s.edgeMaterial.dispose(); } catch {}
    for (const m of s.stageMaterials) { try { m.dispose(); } catch {} }
    s.stageMaterials = [];

    s.firstMaterial = createFirstGearMaterial(styleKey);
    s.edgeMaterial = createEdgeMaterial(styleKey);

    for (let i = 0; i < s.gearEntries.length; i++) {
      const entry = s.gearEntries[i];
      if (i === 0) {
        entry.mesh.material = s.firstMaterial;
      } else {
        const m = createGearMaterial(i, styleKey);
        s.stageMaterials.push(m);
        entry.mesh.material = m;
      }
      if (entry.edges) entry.edges.material = s.edgeMaterial;
    }
  }, [styleKey]);

  // ============ B EFFECT: regen geometry, swap on all meshes ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const newGeom = createGearGeometry(B);
    const newEdges = createGearEdges(newGeom);
    if (s.geom) s.geom.dispose();
    if (s.edgesGeom) s.edgesGeom.dispose();
    s.geom = newGeom;
    s.edgesGeom = newEdges;
    s.currentB = B;
    for (const entry of s.gearEntries) {
      entry.mesh.geometry = newGeom;
      if (entry.edges) entry.edges.geometry = newEdges;
    }
  }, [B]);

  // ============ E EFFECT: incremental add/remove ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.geom) return;
    const target = Math.max(1, Math.min(MAX_STAGES, E));
    s.currentE = target;

    // Add meshes
    while (s.gearEntries.length < target) {
      const idx = s.gearEntries.length;
      let mat;
      if (idx === 0) {
        mat = s.firstMaterial;
      } else {
        mat = createGearMaterial(idx, s.currentStyle);
        s.stageMaterials.push(mat);
      }
      const mesh = new THREE.Mesh(s.geom, mat);

      // 엣지 라인을 child로 추가 (mesh transform 상속)
      const edges = new THREE.LineSegments(s.edgesGeom, s.edgeMaterial);
      mesh.add(edges);

      // 초기 위치/회전은 현재 preview mode에 맞춰
      if (s.currentPreview === "single") {
        mesh.rotation.set(0, 0, 0);
        mesh.position.set(0, 0, 0);
      } else {
        mesh.rotation.set(0, Math.PI / 2, 0);
        const pos = stagePosition(idx);
        mesh.position.set(pos.x, pos.y, pos.z);
      }
      mesh.scale.setScalar(0); // animate in

      s.gearGroup.add(mesh);
      s.gearEntries.push({
        mesh, edges,
        targetScale: 1,
        currentScale: 0,
        removing: false,
        stageIdx: idx,
      });
    }

    // Remove excess
    for (let i = s.gearEntries.length - 1; i >= target; i--) {
      s.gearEntries[i].targetScale = 0;
      s.gearEntries[i].removing = true;
    }
    // 재등장 (E가 줄었다가 다시 늘 때)
    for (let i = 0; i < Math.min(target, s.gearEntries.length); i++) {
      if (s.gearEntries[i].removing) {
        s.gearEntries[i].removing = false;
        s.gearEntries[i].targetScale = 1;
      }
    }
  }, [E]);

  // ============ PREVIEW MODE EFFECT: camera + mesh orientation ============
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.currentPreview = previewMode;

    // 기존 메시들의 위치/회전을 모드에 맞춰 재배치
    for (let i = 0; i < s.gearEntries.length; i++) {
      const mesh = s.gearEntries[i].mesh;
      if (previewMode === "single") {
        mesh.rotation.set(0, 0, 0);
        mesh.position.set(0, 0, 0);
      } else {
        mesh.rotation.set(mesh.rotation.x || 0, Math.PI / 2, 0);
        const pos = stagePosition(i);
        mesh.position.set(pos.x, pos.y, pos.z);
      }
    }

    // 카메라 배치 — 가로 통을 옆면에서 비스듬히, 첫 기어 근처에 포커스
    if (previewMode === "single") {
      s.camera.position.set(0.4, 0.7, 3.6);
      s.camera.lookAt(0, 0, 0);
      s.controls.target.set(0, 0, 0);
      s.controls.enabled = false;
    } else if (previewMode === "tower") {
      // 타워 프리뷰: 단수에 비례해 카메라 거리를 조정, 통 전체가 보이도록
      const stages = Math.max(1, Math.min(E, MAX_STAGES));
      const towerLen = stages * 0.14;
      const midX = towerLen / 2;
      const dist = Math.max(4, towerLen * 0.9 + 3);
      s.camera.position.set(midX - dist * 0.3, 1.4, dist);
      s.camera.lookAt(midX, 0, 0);
      s.controls.target.set(midX, 0, 0);
      s.controls.enabled = false;
    } else {
      // 전체 씬: orbit + pan 활성, 크게 물러날 수 있음
      const stages = Math.max(1, Math.min(E, MAX_STAGES));
      const towerLen = stages * 0.14;
      const midX = towerLen / 2;
      s.camera.position.set(midX - 2, 2.5, 7);
      s.camera.lookAt(midX * 0.5, 0, 0);
      s.controls.target.set(midX * 0.5, 0, 0);
      s.controls.maxDistance = Math.max(25, towerLen * 2.5);
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
      background: DARK_BG,
    }} />
  );
}
