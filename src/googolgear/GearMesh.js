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

// ==================== 컬러 스타일 시스템 ====================
// 5가지 스타일: copper(다니엘) · rainbow · black · white · lineart
// 각 스타일은 팔레트 + 첫 기어 색 + 배경색 + 엣지 강도 + metalness 등을 함께 정의
export const GEAR_STYLES = {
  copper: {
    label: "구리 (다니엘)",
    palette: ["#C88A42", "#A86F2E", "#D8A050", "#B88038"],
    firstColor: "#F0C060",
    firstEmissive: "#3A2810",
    firstEmissiveIntensity: 0.35,
    bg: "#A68266",
    edgeColor: "#1A0F08",
    edgeOpacity: 0.55,
    roughness: 0.42,
    metalness: 0.78,
  },
  rainbow: {
    label: "알록달록",
    palette: ["#E8505B", "#F9A825", "#FBC02D", "#66BB6A", "#42A5F5", "#7E57C2", "#EC407A"],
    firstColor: "#FFFFFF",
    firstEmissive: "#333333",
    firstEmissiveIntensity: 0.2,
    bg: "#F4E9D8",
    edgeColor: "#1A1A1A",
    edgeOpacity: 0.4,
    roughness: 0.55,
    metalness: 0.3,
  },
  black: {
    label: "블랙",
    palette: ["#1A1A1A", "#2A2A2A", "#222222", "#333333"],
    firstColor: "#4A4A4A",
    firstEmissive: "#111111",
    firstEmissiveIntensity: 0.3,
    bg: "#D8D0C4",
    edgeColor: "#000000",
    edgeOpacity: 0.8,
    roughness: 0.5,
    metalness: 0.6,
  },
  white: {
    label: "화이트",
    palette: ["#F5F0E8", "#E8E0D2", "#F0EADE", "#EAE2D2"],
    firstColor: "#FFFFFF",
    firstEmissive: "#E0D8C8",
    firstEmissiveIntensity: 0.15,
    bg: "#6B8A9E",
    edgeColor: "#1A1A1A",
    edgeOpacity: 0.3,
    roughness: 0.6,
    metalness: 0.2,
  },
  lineart: {
    label: "라인 아트",
    palette: ["#FFFFFF"],
    firstColor: "#FFFFFF",
    firstEmissive: "#000000",
    firstEmissiveIntensity: 0,
    bg: "#FFFFFF",
    edgeColor: "#000000",
    edgeOpacity: 1.0,
    roughness: 1.0,
    metalness: 0.0,
    lineartMode: true, // fill을 거의 투명하게
  },
};

export const DEFAULT_STYLE = "copper";

// 레이어별 재질
export function createGearMaterial(stageIndex = 0, styleKey = DEFAULT_STYLE) {
  const style = GEAR_STYLES[styleKey] || GEAR_STYLES[DEFAULT_STYLE];
  const color = style.palette[stageIndex % style.palette.length];
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: style.roughness,
    metalness: style.metalness,
  });
  if (style.lineartMode) {
    mat.transparent = true;
    mat.opacity = 0.05;
  }
  return mat;
}

// 첫 기어 전용
export function createFirstGearMaterial(styleKey = DEFAULT_STYLE) {
  const style = GEAR_STYLES[styleKey] || GEAR_STYLES[DEFAULT_STYLE];
  const mat = new THREE.MeshStandardMaterial({
    color: style.firstColor,
    roughness: style.roughness * 0.7,
    metalness: style.metalness + 0.07,
    emissive: style.firstEmissive,
    emissiveIntensity: style.firstEmissiveIntensity,
  });
  if (style.lineartMode) {
    mat.transparent = true;
    mat.opacity = 0.05;
  }
  return mat;
}

// 엣지 라인
export function createEdgeMaterial(styleKey = DEFAULT_STYLE) {
  const style = GEAR_STYLES[styleKey] || GEAR_STYLES[DEFAULT_STYLE];
  return new THREE.LineBasicMaterial({
    color: style.edgeColor,
    transparent: true,
    opacity: style.edgeOpacity,
  });
}

export function getStyleBg(styleKey = DEFAULT_STYLE) {
  return (GEAR_STYLES[styleKey] || GEAR_STYLES[DEFAULT_STYLE]).bg;
}

// 배경 색 (기존 호환)
export const DARK_BG = GEAR_STYLES.copper.bg;
