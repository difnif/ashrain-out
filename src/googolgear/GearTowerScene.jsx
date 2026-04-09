import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createGearGeometry, createGearEdges,
  createGearMaterial, createFirstGearMaterial, createEdgeMaterial,
  getStyleBg, DEFAULT_STYLE, isBlueprint,
} from "./GearMesh";

// ============================================================
// 다니엘 데 브루인 구조:
//   한 단(stage) = 큰 기어(bigGear, 톱니 B개) + 작은 피니언(pinion, 톱니 1개 비율)
//   같은 축에 박혀 함께 회전. 단 i의 pinion이 단 i+1의 bigGear와 맞물려 1/B 감속.
//   두 평행축 — 짝수 단은 shaft 0, 홀수 단은 shaft 1.
// ============================================================

// 기하 상수
const R_BIG = 1.0;          // 큰 기어 반지름 (고정)
// R_PIN은 B에 따라 동적 계산: R_BIG / B (정확한 비율)
// 단 너무 작아지지 않게 최소값 보장
const R_PIN_MIN = 0.06;
function getRPin(B) {
  return Math.max(R_PIN_MIN, R_BIG / B);
}
function getShaftDist(B) {
  return R_BIG + getRPin(B);
}

// 기어 두께
const DEPTH_BIG = 0.18;
const DEPTH_PIN = 0.18;

// 한 단의 한 셋트 너비: bigGear depth + pinion depth (둘이 옆구리로 붙음)
const SET_WIDTH = DEPTH_BIG + DEPTH_PIN;
// 한 단의 X 영역: 셋트 너비 + 약간의 여유
// 인접 단의 큰 기어가 이 단의 pinion 위치와 같은 X에 와야 맞물림
// → 단 간격 = pinion까지의 거리 = DEPTH_BIG (큰 기어 두께만큼 떨어짐)

// 12시 방향 톱니 한 개의 끝 1/3만 빨갛게 표시
// 원본 톱니와 정확히 겹치되, 톱니 바깥쪽 1/3 구간만 채움
function createSingleToothGeometry(teeth, opts = {}) {
  const outerR = opts.outerR ?? 1.0;
  const innerR = opts.innerR ?? 0.82;
  const depth  = opts.depth  ?? 0.22;

  const t = Math.max(2, Math.min(200, Math.floor(teeth)));
  const slotAng = (Math.PI * 2) / t;

  // 12시에 가장 가까운 톱니 인덱스
  const idealI = Math.round((Math.PI / 2) / slotAng - 0.75);
  const aMid = (idealI + 0.5) * slotAng;
  const aEnd = (idealI + 1) * slotAng;

  // 톱니 끝 1/3만 — 반지름 방향으로 innerR 대신 (outerR - 1/3 * toothLen) 사용
  const toothLen = outerR - innerR;
  const tipStartR = outerR - toothLen * (1 / 3);

  const shape = new THREE.Shape();
  const p1 = [Math.cos(aMid) * tipStartR, Math.sin(aMid) * tipStartR];
  const p2 = [Math.cos(aMid) * outerR,    Math.sin(aMid) * outerR];
  const p3 = [Math.cos(aEnd) * outerR,    Math.sin(aEnd) * outerR];
  const p4 = [Math.cos(aEnd) * tipStartR, Math.sin(aEnd) * tipStartR];

  shape.moveTo(p1[0], p1[1]);
  shape.lineTo(p2[0], p2[1]);
  shape.lineTo(p3[0], p3[1]);
  shape.lineTo(p4[0], p4[1]);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    curveSegments: 4,
    steps: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

const TICK_COLOR = "#E8342F"; // 빨강

const MAX_STAGES = 100;

// 단 i의 부품 위치
// bigGear는 단의 시작 X에, pinion은 그 옆구리 (DEPTH_BIG/2 + DEPTH_PIN/2 만큼 옆)
// 다음 단의 bigGear는 이 단의 pinion 위치에서 +DEPTH_BIG 만큼 옆 → pinion 옆에 바로 붙음
function stageGeometry(i, B) {
  const onShaft0 = i % 2 === 0;
  const sd = getShaftDist(B);
  const z = onShaft0 ? -sd / 2 : sd / 2;
  // 단 i의 bigGear X = i * (DEPTH_BIG + DEPTH_PIN)
  // 단 i의 pinion X = bigGear X + (DEPTH_BIG/2 + DEPTH_PIN/2) (옆구리 붙음)
  // 단 i+1의 bigGear X = 단 i의 pinion X + (DEPTH_PIN/2 + DEPTH_BIG/2)
  //                    = 단 i의 bigGear X + (DEPTH_BIG + DEPTH_PIN)
  // 즉 단 간격 = DEPTH_BIG + DEPTH_PIN = SET_WIDTH
  const xBig = i * SET_WIDTH;
  const xPin = xBig + (DEPTH_BIG + DEPTH_PIN) / 2;
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

    // 블루프린트 그리드 — 별도 그룹, 스타일 변경 시 추가/제거
    const blueprintGroup = new THREE.Group();
    blueprintGroup.visible = false;
    scene.add(blueprintGroup);

    function buildBlueprintGrid() {
      // 기존 자식 정리
      while (blueprintGroup.children.length > 0) {
        const c = blueprintGroup.children[0];
        blueprintGroup.remove(c);
        if (c.geometry) try { c.geometry.dispose(); } catch {}
        if (c.material) try { c.material.dispose(); } catch {}
      }
      // 1) 바닥 그리드 (XZ 평면)
      const gridSize = 60;
      const gridDiv = 60;
      const grid1 = new THREE.GridHelper(gridSize, gridDiv, 0x4A8FCC, 0x2A5580);
      grid1.position.y = -1.6;
      grid1.material.transparent = true;
      grid1.material.opacity = 0.55;
      blueprintGroup.add(grid1);

      // 2) 뒤쪽 벽 그리드 (XY 평면)
      const grid2 = new THREE.GridHelper(gridSize, gridDiv, 0x3A6FA8, 0x1F4470);
      grid2.rotation.x = Math.PI / 2;
      grid2.position.z = -8;
      grid2.material.transparent = true;
      grid2.material.opacity = 0.4;
      blueprintGroup.add(grid2);

      // 3) 옆쪽 벽 그리드 (YZ 평면)
      const grid3 = new THREE.GridHelper(gridSize, gridDiv, 0x3A6FA8, 0x1F4470);
      grid3.rotation.z = Math.PI / 2;
      grid3.position.x = -8;
      grid3.material.transparent = true;
      grid3.material.opacity = 0.35;
      blueprintGroup.add(grid3);

      // 4) 좌표축 (X 빨강 → 시안 / Y 초록 → 시안 / Z 파랑 → 시안 — 모두 톤 통일)
      const axisLen = 5;
      const axMat = new THREE.LineBasicMaterial({ color: 0x9FD4FF, transparent: true, opacity: 0.6 });
      const axGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axisLen, -1.6, -8),
        new THREE.Vector3(axisLen, -1.6, -8),
      ]);
      blueprintGroup.add(new THREE.Line(axGeo, axMat));
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.enabled = false;

    const state = {
      scene, camera, renderer, controls, gearGroup,
      blueprintGroup, buildBlueprintGrid,
      bigGeom: null,
      pinGeom: null,
      bigEdges: null,
      pinEdges: null,
      bigTickGeom: null,
      pinTickGeom: null,
      tickMaterial: new THREE.MeshStandardMaterial({
        color: TICK_COLOR,
        roughness: 0.5,
        metalness: 0.2,
        emissive: TICK_COLOR,
        emissiveIntensity: 0.3,
      }),
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

    // 초기 스타일이 blueprint면 그리드 켜기
    if (isBlueprint(initStyle)) {
      buildBlueprintGrid();
      blueprintGroup.visible = true;
    }

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
      const deltaAngle = dy / 100;
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
      try { if (state.bigTickGeom) state.bigTickGeom.dispose(); } catch {}
      try { if (state.pinTickGeom) state.pinTickGeom.dispose(); } catch {}
      try { state.stageMaterials.forEach(m => { try { m.dispose(); } catch {} }); } catch {}
      try { state.firstMaterial.dispose(); } catch {}
      try { state.edgeMaterial.dispose(); } catch {}
      try { state.tickMaterial.dispose(); } catch {}

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

    // 블루프린트 토글
    if (isBlueprint(styleKey)) {
      s.buildBlueprintGrid();
      s.blueprintGroup.visible = true;
    } else {
      s.blueprintGroup.visible = false;
    }

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

    // 큰 기어 톱니 수 = 사용자가 설정한 B 그대로 (학생이 "B=10이면 톱니 10개" 기대)
    // 피니언은 시각상 2개 최소 (1개는 불가능)
    // 물리 감속비는 컨트롤러에서 1/B 그대로 — 시각비와 살짝 다를 수 있음 (작은 B에서만 두드러짐)
    const bigT = Math.max(2, Math.min(200, B));
    const pinT = 2;

    // pinion 반지름 = R_BIG / B (정확한 물리 비율)
    // 단 너무 작아지지 않게 최소값 보장
    const rPin = getRPin(B);

    const newBigGeom = createGearGeometry(bigT, {
      outerR: R_BIG, innerR: R_BIG * 0.84, holeR: R_BIG * 0.12, depth: DEPTH_BIG,
    });
    const newPinGeom = createGearGeometry(pinT, {
      outerR: rPin, innerR: rPin * 0.7, holeR: Math.min(rPin * 0.35, 0.04), depth: DEPTH_PIN,
    });
    const newBigEdges = createGearEdges(newBigGeom);
    const newPinEdges = createGearEdges(newPinGeom);
    const newBigTickGeom = createSingleToothGeometry(bigT, {
      outerR: R_BIG, innerR: R_BIG * 0.84, depth: DEPTH_BIG,
    });
    const newPinTickGeom = createSingleToothGeometry(pinT, {
      outerR: rPin, innerR: rPin * 0.7, depth: DEPTH_PIN,
    });

    if (s.bigGeom) s.bigGeom.dispose();
    if (s.pinGeom) s.pinGeom.dispose();
    if (s.bigEdges) s.bigEdges.dispose();
    if (s.pinEdges) s.pinEdges.dispose();
    if (s.bigTickGeom) s.bigTickGeom.dispose();
    if (s.pinTickGeom) s.pinTickGeom.dispose();

    s.bigGeom = newBigGeom;
    s.pinGeom = newPinGeom;
    s.bigEdges = newBigEdges;
    s.pinEdges = newPinEdges;
    s.bigTickGeom = newBigTickGeom;
    s.pinTickGeom = newPinTickGeom;

    // 기존 mesh들의 geometry 교체 + 위치 재계산 (B 바뀌면 SHAFT_DIST 변함)
    for (let i = 0; i < s.stageEntries.length; i++) {
      const entry = s.stageEntries[i];
      entry.bigMesh.geometry = newBigGeom;
      if (entry.pinMesh) entry.pinMesh.geometry = newPinGeom;
      entry.bigMesh.children.forEach(c => {
        if (c.isLineSegments) c.geometry = newBigEdges;
        else if (c.isMesh && c.userData.isTick) c.geometry = newBigTickGeom;
      });
      if (entry.pinMesh) {
        entry.pinMesh.children.forEach(c => {
          if (c.isLineSegments) c.geometry = newPinEdges;
          else if (c.isMesh && c.userData.isTick) c.geometry = newPinTickGeom;
        });
      }
      // 위치 재배치 (z가 B에 의존)
      if (s.currentPreview !== "single") {
        const g = stageGeometry(i, B);
        entry.bigMesh.position.set(g.xBig, 0, g.z);
        if (entry.pinMesh) entry.pinMesh.position.set(g.xPin, 0, g.z);
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
      // 12시 방향 빨간 마커
      const bigTick = new THREE.Mesh(s.bigTickGeom, s.tickMaterial);
      bigTick.userData.isTick = true;
      bigMesh.add(bigTick);

      // pinion mesh (single 미리보기 모드에선 안 보임)
      const pinMesh = new THREE.Mesh(s.pinGeom, mat);
      const pinEdgesMesh = new THREE.LineSegments(s.pinEdges, s.edgeMaterial);
      pinMesh.add(pinEdgesMesh);
      const pinTick = new THREE.Mesh(s.pinTickGeom, s.tickMaterial);
      pinTick.userData.isTick = true;
      pinMesh.add(pinTick);

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
      const g = stageGeometry(i, s.currentB);
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
      const towerLen = stages * SET_WIDTH;
      const midX = towerLen / 2;
      const dist = Math.max(5, towerLen * 0.7 + 4);
      s.camera.position.set(midX - dist * 0.3, 1.8, dist);
      s.camera.lookAt(midX * 0.6, 0, 0);
      s.controls.target.set(midX * 0.6, 0, 0);
      s.controls.enabled = false;
    } else {
      const stages = Math.max(1, Math.min(E, MAX_STAGES));
      const towerLen = stages * SET_WIDTH;
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
