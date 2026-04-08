import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createGearGeometry, createGearMaterial } from "./GearMesh";

// Three.js 기어 타워 씬
// props:
//   B, E: 셋팅값
//   controller: ManualController 또는 AutoController 인스턴스 (없으면 자동 슬로우 스핀)
//   previewMode: "single" | "tower" | null — Setup 단계 프리뷰 용
//   theme: 색상 테마
//   onPointerOnFirstGear: (deltaAngle) => void — 수동 모드에서 첫 기어 드래그 콜백
export default function GearTowerScene({
  B, E, controller, previewMode, theme,
  onFirstGearDrag, // (angleDelta, tNow) => void
}) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.bg || "#FFF8F0");

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);

    // 단수에 따라 카메라 거리 조정
    const stages = previewMode === "single" ? 1 : Math.min(E, 100);
    const towerHeight = stages * 0.4;
    const initialDist = previewMode === "single" ? 4 : Math.max(6, towerHeight * 1.1 + 4);

    camera.position.set(0, towerHeight / 2, initialDist);
    camera.lookAt(0, towerHeight / 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dir1.position.set(5, 8, 6);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dir2.position.set(-4, -2, -3);
    scene.add(dir2);

    // --- Gears ---
    const geom = createGearGeometry(B);
    const mat = createGearMaterial(theme.accent || "#DCAE96");
    const matFirst = createGearMaterial(theme.accentSoft || "#FADADD");

    const gearMeshes = [];
    const gearGroup = new THREE.Group();
    for (let i = 0; i < stages; i++) {
      const m = new THREE.Mesh(geom, i === 0 ? matFirst : mat);
      m.position.y = i * 0.4;
      // 살짝 지그재그
      m.position.z = (i % 2) * 0.05 - 0.025;
      gearGroup.add(m);
      gearMeshes.push(m);
    }
    scene.add(gearGroup);

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, towerHeight / 2, 0);
    // 줌 아웃 금지: maxDistance를 초기값으로
    controls.maxDistance = initialDist;
    controls.minDistance = 1.5;
    controls.enablePan = false;
    if (previewMode) {
      controls.enabled = false;
    }
    controls.update();

    // --- Pointer interaction for manual gear drag ---
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    function getNDC(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = -(e.clientY - rect.top) / rect.height * 2 + 1;
      return { x, y };
    }

    function onPointerDown(e) {
      if (previewMode || !onFirstGearDrag) return;
      const { x, y } = getNDC(e);
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(gearMeshes[0], false);
      if (hits.length > 0) {
        dragging = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        controls.enabled = false;
        renderer.domElement.setPointerCapture?.(e.pointerId);
      }
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dy = e.clientY - lastPointerY;
      const dx = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      // 수직 드래그 → 회전. 100px ≈ 1 라디안
      const deltaAngle = -dy / 100;
      const tNow = performance.now() / 1000;
      onFirstGearDrag(deltaAngle, tNow);
    }
    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      controls.enabled = true;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    // --- Animation loop ---
    let raf;
    let lastT = performance.now() / 1000;
    function animate() {
      const tNow = performance.now() / 1000;
      const dt = Math.min(0.05, tNow - lastT);
      lastT = tNow;

      if (previewMode === "single") {
        // 단일 기어 천천히 회전
        gearMeshes[0].rotation.x += 0.4 * dt;
      } else if (previewMode === "tower") {
        // 작은 타워: 첫 기어만 회전, 나머지는 1/B씩
        const baseAngle = (gearMeshes[0]?.rotation.x ?? 0) + 0.5 * dt;
        let r = baseAngle;
        for (let i = 0; i < gearMeshes.length; i++) {
          gearMeshes[i].rotation.x = r;
          r *= 1 / B;
        }
      } else if (controller) {
        if (controller.step) controller.step(controller.getRpm ? tNow : dt);
        const rots = controller.rotations;
        for (let i = 0; i < gearMeshes.length && i < rots.length; i++) {
          gearMeshes[i].rotation.x = rots[i];
        }
      }

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    // --- Resize ---
    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    stateRef.current = { scene, camera, renderer, controls, gearMeshes };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      controls.dispose();
      geom.dispose();
      mat.dispose();
      matFirst.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [B, E, previewMode, controller]);

  return (
    <div ref={mountRef} style={{
      width: "100%",
      height: "100%",
      minHeight: 240,
      touchAction: "none",
      borderRadius: 12,
      overflow: "hidden",
    }} />
  );
}
