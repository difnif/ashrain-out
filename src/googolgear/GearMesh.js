import * as THREE from "three";

// 기어 BufferGeometry 생성 — 축은 Z (XY 평면에 놓인 원반)
// 타워에서 수직 축으로 쓸 땐 mesh를 rotateY(PI/2)로 돌려서 축을 X로 전환
export function createGearGeometry(teeth, opts = {}) {
  const outerR = opts.outerR ?? 1.0;
  const innerR = opts.innerR ?? 0.82;
  const holeR  = opts.holeR  ?? 0.18;
  const depth  = opts.depth  ?? 0.22;

  const t = Math.max(2, Math.min(200, Math.floor(teeth)));
  const shape = new THREE.Shape();

  for (let i = 0; i < t; i++) {
    const a0   = (i        / t) * Math.PI * 2;
    const aMid = ((i + 0.5) / t) * Math.PI * 2;
    const aEnd = ((i + 1)   / t) * Math.PI * 2;

    const p1 = [Math.cos(a0)   * innerR, Math.sin(a0)   * innerR];
    const p2 = [Math.cos(aMid) * innerR, Math.sin(aMid) * innerR];
    const p3 = [Math.cos(aMid) * outerR, Math.sin(aMid) * outerR];
    const p4 = [Math.cos(aEnd) * outerR, Math.sin(aEnd) * outerR];

    if (i === 0) shape.moveTo(p1[0], p1[1]);
    else shape.lineTo(p1[0], p1[1]);
    shape.lineTo(p2[0], p2[1]);
    shape.lineTo(p3[0], p3[1]);
    shape.lineTo(p4[0], p4[1]);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 6,
    steps: 1,
  });
  geom.translate(0, 0, -depth / 2);
  geom.computeVertexNormals();
  return geom;
}

// 엣지(윤곽선) 지오메트리 — 레이어 구분 강화용
export function createGearEdges(gearGeom, threshold = 25) {
  return new THREE.EdgesGeometry(gearGeom, threshold);
}

// 레이어별 메탈릭 재질 — Daniel de Bruin 스타일 copper/brass 교번
export function createGearMaterial(stageIndex = 0) {
  const palette = [
    "#C88A42",
    "#A86F2E",
    "#D8A050",
    "#B88038",
  ];
  const color = palette[stageIndex % palette.length];
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.78,
  });
}

// 첫 기어 전용 — 눈에 띄게 밝은 메탈 + 살짝 발광
export function createFirstGearMaterial() {
  return new THREE.MeshStandardMaterial({
    color: "#F0C060",
    roughness: 0.3,
    metalness: 0.85,
    emissive: "#3A2810",
    emissiveIntensity: 0.35,
  });
}

// 엣지 라인 재질
export function createEdgeMaterial() {
  return new THREE.LineBasicMaterial({
    color: "#1A0F08",
    transparent: true,
    opacity: 0.6,
  });
}

// 배경 색 — 메탈이 돋보이면서도 어둡지 않게 (warm medium brown)
export const DARK_BG = "#6B5340";
