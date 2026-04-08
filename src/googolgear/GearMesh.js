import * as THREE from "three";

// Build a single gear BufferGeometry with `teeth` rectangular teeth.
// Diameter and tooth length are FIXED — only the count varies (per Park spec).
// Result: outer radius ~1.0 unit, depth ~0.18 unit, hub hole in middle.
export function createGearGeometry(teeth, opts = {}) {
  const outerR = opts.outerR ?? 1.0;
  const innerR = opts.innerR ?? 0.82;
  const holeR  = opts.holeR  ?? 0.12;
  const depth  = opts.depth  ?? 0.18;

  const t = Math.max(2, Math.min(200, Math.floor(teeth)));
  const shape = new THREE.Shape();

  // Trace outer perimeter: alternating gap (innerR) and tooth (outerR) per slot.
  // Each slot occupies 1/t of the full circle. First half = gap, second half = tooth.
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

  // Center hole
  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 6,
    steps: 1,
  });
  geom.translate(0, 0, -depth / 2);
  // Orient gear so its rotation axis is X (axes are horizontal in our tower)
  geom.rotateY(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

// Single material — matte pastel, works in both light and dark themes
export function createGearMaterial(color = "#DCAE96") {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.2,
    flatShading: false,
  });
}
