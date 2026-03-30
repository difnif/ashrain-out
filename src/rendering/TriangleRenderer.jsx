import {
  PASTEL, dist, midpoint, lerp, perpBisector, angleBisector,
  lineIntersection, circumcenter, incenter,
  pointToSegDist, triangleType, angleAtVertex,
} from "../config";

export function getProperties(ctx) {
  if (!ctx) return [];
  const { triangle, jedoCenter, jedoCircle, jedoType } = ctx;
    if (!triangle || !jedoCenter || !jedoCircle) return [];
    const { A, B, C } = triangle;
    const types = triangleType(A, B, C);
    const O = jedoCenter;
    const props = [];

    props.push({ id: "type", text: `삼각형 종류: ${types.join(", ")}`, bold: true, color: PASTEL.coral,
      highlight: "triType" });

    if (jedoType === "circum") {
      const r = jedoCircle.r;
      props.push({ id: "cRadius", text: `외접원의 반지름 R = ${(r / (triangle.scale || 1)).toFixed(1)}`, color: PASTEL.sky,
        highlight: "circumRadius" });
      props.push({ id: "cEqual", text: `OA = OB = OC (외심에서 세 꼭지점까지 거리 동일)`, color: "#7EC8E3",
        highlight: "circumRadiiAll" });

      const angA = angleAtVertex(A, B, C) * 180 / Math.PI;
      const angB = angleAtVertex(B, A, C) * 180 / Math.PI;
      const angC = angleAtVertex(C, A, B) * 180 / Math.PI;
      props.push({ id: "angles", text: `∠A = ${angA.toFixed(1)}°, ∠B = ${angB.toFixed(1)}°, ∠C = ${angC.toFixed(1)}°`, color: PASTEL.yellow,
        highlight: "allAngles" });
      props.push({ id: "central", text: `∠BOC = 2∠A = ${(2 * angA).toFixed(1)}° (중심각 = 2 × 원주각)`, color: PASTEL.mint, bold: true,
        highlight: "centralAngle" });

      const angOBC = angleAtVertex(B, O, C) * 180 / Math.PI / 2;
      const angOCA = angleAtVertex(C, O, A) * 180 / Math.PI / 2;
      const angOAB = angleAtVertex(A, O, B) * 180 / Math.PI / 2;
      props.push({ id: "iso90", text: `∠OBC + ∠OCA + ∠OAB = ${(angOBC + angOCA + angOAB).toFixed(1)}° = 90°`, color: PASTEL.lavender, bold: true,
        highlight: "isoTriangles" });

      if (types.includes("직각삼각형")) props.push({ id: "right", text: "→ 직각삼각형: 외심이 빗변의 중점에 위치!", bold: true, color: "#FF8A80", highlight: "rightHyp" });
      if (types.includes("둔각삼각형")) props.push({ id: "obtuse", text: "→ 둔각삼각형: 외심이 삼각형 바깥에 위치!", bold: true, color: "#FF8A80", highlight: "obtuseOut" });
      if (types.includes("예각삼각형")) props.push({ id: "acute", text: "→ 예각삼각형: 외심이 삼각형 내부에 위치!", bold: true, color: "#82C9A5", highlight: "acuteIn" });
      if (types.includes("이등변삼각형")) props.push({ id: "isoCircum", text: "→ 이등변삼각형: 외심이 꼭지각의 이등분선 위!", bold: true, color: "#FFB74D", highlight: "isoBisector" });

      // Isosceles triangles formed by circumcenter
      props.push({ id: "isoOAB", text: `△OAB: OA = OB = R → 이등변삼각형`, color: "#F48FB1", highlight: "isoOAB" });
      props.push({ id: "isoOBC", text: `△OBC: OB = OC = R → 이등변삼각형`, color: "#80CBC4", highlight: "isoOBC" });
      props.push({ id: "isoOCA", text: `△OCA: OC = OA = R → 이등변삼각형`, color: "#CE93D8", highlight: "isoOCA" });
    } else {
      const r = jedoCircle.r;
      const a = dist(B, C), b = dist(A, C), c = dist(A, B);
      props.push({ id: "iRadius", text: `내접원의 반지름 r = ${(r / (triangle.scale || 1)).toFixed(1)}`, color: PASTEL.lavender,
        highlight: "inRadius" });
      props.push({ id: "iEqual", text: `내심에서 세 변까지의 거리가 모두 같다 (= r)`, color: "#B39DDB",
        highlight: "inRadiiAll" });

      const angA = angleAtVertex(A, B, C) * 180 / Math.PI;
      const angBIC = 90 + angA / 2;
      props.push({ id: "bicAngle", text: `∠BIC = 90° + ½∠A = ${angBIC.toFixed(1)}°`, color: PASTEL.mint, bold: true,
        highlight: "bicAngle" });

      const s = (a + b + c) / 2;
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      props.push({ id: "area", text: `넓이 S = ½ × r × (a+b+c) = ${(area / ((triangle.scale || 1) ** 2)).toFixed(1)}`, color: PASTEL.yellow, bold: true,
        highlight: "areaFill" });
      props.push({ id: "bisRatio", text: `각의 이등분선은 대변을 양 옆 변의 비로 나눈다`, color: PASTEL.peach,
        highlight: "bisectorRatio" });

      // Congruent triangles formed by incenter
      props.push({ id: "congA", text: `△AFI ≅ △AEI (RHS 합동: AI 공통, IF=IE=r, ∠F=∠E=90°)`, bold: true, color: "#FF8A65", highlight: "congA" });
      props.push({ id: "congB", text: `△BDI ≅ △BFI (RHS 합동: BI 공통, ID=IF=r, ∠D=∠F=90°)`, bold: true, color: "#4FC3F7", highlight: "congB" });
      props.push({ id: "congC", text: `△CDI ≅ △CEI (RHS 합동: CI 공통, ID=IE=r, ∠D=∠E=90°)`, bold: true, color: "#AED581", highlight: "congC" });
    }
    return props;
  };

export function renderHighlight(ctx) {
  if (!ctx || !ctx.triangle) return null;
  const { triangle, jedoCenter, jedoCircle, jedoType, selectedProp, zs, FixedG,
    jedoLines, jakdoArcs, jakdoRulerLines } = ctx;
    if (!selectedProp || !triangle || !jedoCenter || !jedoCircle) return null;
    const { A, B, C } = triangle;
    const O = jedoCenter;
    const prop = getProperties().find(p => p.id === selectedProp);
    if (!prop) return null;
    const hc = prop.color; // highlight color
    const hcAlpha = hc + "40"; // with transparency

    switch (prop.highlight) {
      case "triType": {
        const types = triangleType(A, B, C);
        // Highlight the triangle itself with type color
        return (
          <g>
            <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill={hcAlpha} stroke={hc} strokeWidth={3} />
            <text x={(A.x+B.x+C.x)/3} y={(A.y+B.y+C.y)/3} textAnchor="middle"
              fill={hc} fontSize={13} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {types.join(", ")}
            </text>
          </g>
        );
      }
      case "circumRadius": {
        const r = jedoCircle.r;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2.5} />
            <text x={(O.x+A.x)/2+10} y={(O.y+A.y)/2-8} fill={hc} fontSize={11}
              fontWeight={700} fontFamily="'Noto Serif KR', serif">
              R = {(r / (triangle.scale || 1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "circumRadiiAll": {
        return (
          <g>
            {[A, B, C].map((p, i) => (
              <line key={i} x1={O.x} y1={O.y} x2={p.x} y2={p.y}
                stroke={hc} strokeWidth={2.5} strokeDasharray="6 3" />
            ))}
            {[A, B, C].map((p, i) => (
              <circle key={`dot${i}`} cx={p.x} cy={p.y} r={6} fill={hc} opacity={0.7} />
            ))}
          </g>
        );
      }
      case "allAngles": {
        return (
          <g>
            {[[A, B, C, "∠A"], [B, A, C, "∠B"], [C, A, B, "∠C"]].map(([v, p1, p2, label], i) => {
              const ang = (angleAtVertex(v, p1, p2) * 180 / Math.PI).toFixed(1);
              const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
              const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
              let diff = a2 - a1;
              if (diff < -Math.PI) diff += 2 * Math.PI;
              if (diff > Math.PI) diff -= 2 * Math.PI;
              const midA = a1 + diff / 2;
              const arcR = 30;
              const sweepFlag = diff > 0 ? 1 : 0;
              const colors = ["#FFE082", "#FFF176", "#FFD54F"];
              return (
                <g key={i}>
                  <path
                    d={`M ${v.x + arcR * Math.cos(a1)} ${v.y + arcR * Math.sin(a1)} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${v.x + arcR * Math.cos(a2)} ${v.y + arcR * Math.sin(a2)}`}
                    fill="none" stroke={colors[i]} strokeWidth={3} />
                  <text x={v.x + (arcR+16)*Math.cos(midA)} y={v.y + (arcR+16)*Math.sin(midA)}
                    textAnchor="middle" dominantBaseline="central" fill={colors[i]}
                    fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
                    {ang}°
                  </text>
                </g>
              );
            })}
          </g>
        );
      }
      case "centralAngle": {
        const angA = angleAtVertex(A, B, C);
        const angBOC = angleAtVertex(O, B, C); // Angle at O between B and C? No, ∠BOC = angle at O
        // Draw angle arc at O between OB and OC, and arc at A
        const a1o = Math.atan2(B.y - O.y, B.x - O.x);
        const a2o = Math.atan2(C.y - O.y, C.x - O.x);
        let diffO = a2o - a1o; if (diffO < -Math.PI) diffO += 2*Math.PI; if (diffO > Math.PI) diffO -= 2*Math.PI;
        const sweepO = diffO > 0 ? 1 : 0;
        const rO = 25;
        const a1a = Math.atan2(B.y - A.y, B.x - A.x);
        const a2a = Math.atan2(C.y - A.y, C.x - A.x);
        let diffA = a2a - a1a; if (diffA < -Math.PI) diffA += 2*Math.PI; if (diffA > Math.PI) diffA -= 2*Math.PI;
        const sweepA = diffA > 0 ? 1 : 0;
        const rA = 22;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <path d={`M ${O.x+rO*Math.cos(a1o)} ${O.y+rO*Math.sin(a1o)} A ${rO} ${rO} 0 0 ${sweepO} ${O.x+rO*Math.cos(a2o)} ${O.y+rO*Math.sin(a2o)}`}
              fill="none" stroke={hc} strokeWidth={3} />
            <text x={O.x+40*Math.cos(a1o+diffO/2)} y={O.y+40*Math.sin(a1o+diffO/2)}
              textAnchor="middle" dominantBaseline="central" fill={hc}
              fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠BOC
            </text>
            <path d={`M ${A.x+rA*Math.cos(a1a)} ${A.y+rA*Math.sin(a1a)} A ${rA} ${rA} 0 0 ${sweepA} ${A.x+rA*Math.cos(a2a)} ${A.y+rA*Math.sin(a2a)}`}
              fill="none" stroke="#FF8A65" strokeWidth={3} />
            <text x={A.x+38*Math.cos(a1a+diffA/2)} y={A.y+38*Math.sin(a1a+diffA/2)}
              textAnchor="middle" dominantBaseline="central" fill="#FF8A65"
              fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠A
            </text>
          </g>
        );
      }
      case "isoTriangles": {
        // Highlight three isoceles triangles OBC, OCA, OAB
        const colors = ["rgba(195,177,225,0.25)", "rgba(168,213,186,0.25)", "rgba(246,227,186,0.25)"];
        const strokes = [PASTEL.lavender, PASTEL.mint, PASTEL.yellow];
        return (
          <g>
            {[[O,B,C],[O,C,A],[O,A,B]].map(([p1,p2,p3], i) => (
              <polygon key={i} points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                fill={colors[i]} stroke={strokes[i]} strokeWidth={2} />
            ))}
          </g>
        );
      }
      case "inRadius": {
        const r = jedoCircle.r;
        // Show one radius line from incenter to nearest point on AB
        const cp = closestPointOnLine(O, A, B);
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={cp.x} y2={cp.y} stroke={hc} strokeWidth={2.5} />
            <circle cx={cp.x} cy={cp.y} r={4} fill={hc} />
            <text x={(O.x+cp.x)/2+10} y={(O.y+cp.y)/2-8} fill={hc} fontSize={11}
              fontWeight={700} fontFamily="'Noto Serif KR', serif">
              r = {(r / (triangle.scale || 1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "inRadiiAll": {
        return (
          <g>
            {[[A,B],[B,C],[A,C]].map(([p1,p2], i) => {
              const cp = closestPointOnLine(O, p1, p2);
              return (
                <g key={i}>
                  <line x1={O.x} y1={O.y} x2={cp.x} y2={cp.y}
                    stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
                  <circle cx={cp.x} cy={cp.y} r={5} fill={hc} opacity={0.7} />
                </g>
              );
            })}
          </g>
        );
      }
      case "bicAngle": {
        // ∠BIC at incenter
        const a1 = Math.atan2(B.y - O.y, B.x - O.x);
        const a2 = Math.atan2(C.y - O.y, C.x - O.x);
        let diff = a2 - a1; if (diff < -Math.PI) diff += 2*Math.PI; if (diff > Math.PI) diff -= 2*Math.PI;
        const sweep = diff > 0 ? 1 : 0;
        const r = 20;
        return (
          <g>
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} opacity={0.6} />
            <path d={`M ${O.x+r*Math.cos(a1)} ${O.y+r*Math.sin(a1)} A ${r} ${r} 0 0 ${sweep} ${O.x+r*Math.cos(a2)} ${O.y+r*Math.sin(a2)}`}
              fill="none" stroke={hc} strokeWidth={3} />
            <text x={O.x+35*Math.cos(a1+diff/2)} y={O.y+35*Math.sin(a1+diff/2)}
              textAnchor="middle" dominantBaseline="central" fill={hc}
              fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              ∠BIC
            </text>
          </g>
        );
      }
      case "areaFill": {
        return (
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
            fill={hcAlpha} stroke={hc} strokeWidth={2} />
        );
      }
      case "bisectorRatio": {
        // Show angle bisector from A hitting BC, splitting it
        const bis = angleBisector(A, B, C, A, B, C);
        if (!bis) return null;
        const foot = lineIntersection(bis.start, bis.end, B, C);
        if (!foot) return null;
        const dBF = dist(B, foot), dFC = dist(foot, C);
        const dAB = dist(A, B), dAC = dist(A, C);
        return (
          <g>
            <line x1={A.x} y1={A.y} x2={foot.x} y2={foot.y} stroke={hc} strokeWidth={2.5} />
            <circle cx={foot.x} cy={foot.y} r={5} fill={hc} />
            <text x={(B.x+foot.x)/2} y={(B.y+foot.y)/2 - 12} textAnchor="middle"
              fill="#FF8A65" fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {(dBF / (triangle.scale||1)).toFixed(1)}
            </text>
            <text x={(C.x+foot.x)/2} y={(C.y+foot.y)/2 - 12} textAnchor="middle"
              fill="#4FC3F7" fontSize={10} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              {(dFC / (triangle.scale||1)).toFixed(1)}
            </text>
            <text x={foot.x} y={foot.y + 18} textAnchor="middle"
              fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              AB:AC = {(dAB/(triangle.scale||1)).toFixed(1)}:{(dAC/(triangle.scale||1)).toFixed(1)}
            </text>
          </g>
        );
      }
      case "isoOAB": {
        const eqLen = dist(O, A);
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${A.x},${A.y} ${B.x},${B.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} />
            {/* Equal marks on OA and OB */}
            {[A, B].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+A.x+B.x)/3} y={(O.y+A.y+B.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "isoOBC": {
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} />
            {[B, C].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+B.x+C.x)/3} y={(O.y+B.y+C.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "isoOCA": {
        return (
          <g>
            <polygon points={`${O.x},${O.y} ${C.x},${C.y} ${A.x},${A.y}`}
              fill={`${hc}30`} stroke={hc} strokeWidth={2.5} />
            <line x1={O.x} y1={O.y} x2={C.x} y2={C.y} stroke={hc} strokeWidth={2} />
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} stroke={hc} strokeWidth={2} />
            {[C, A].map((p, i) => {
              const mx = (O.x + p.x) / 2, my = (O.y + p.y) / 2;
              const dx = p.x - O.x, dy = p.y - O.y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const nx = -dy/d*6, ny = dx/d*6;
              return <g key={i}>
                <line x1={mx+nx-2} y1={my+ny-2} x2={mx-nx-2} y2={my-ny-2} stroke={hc} strokeWidth={2} />
                <line x1={mx+nx+2} y1={my+ny+2} x2={mx-nx+2} y2={my-ny+2} stroke={hc} strokeWidth={2} />
              </g>;
            })}
            <text x={(O.x+C.x+A.x)/3} y={(O.y+C.y+A.y)/3} textAnchor="middle"
              fill={hc} fontSize={11} fontWeight={700} fontFamily="'Noto Serif KR', serif">
              이등변
            </text>
          </g>
        );
      }
      case "congA": {
        // △AFI ≅ △AEI — I=incenter, F=foot on AB, E=foot on AC
        const F = closestPointOnLine(O, A, B);
        const E = closestPointOnLine(O, A, C);
        return (
          <g>
            <polygon points={`${A.x},${A.y} ${F.x},${F.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${A.x},${A.y} ${E.x},${E.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {/* Right angle marks at F and E */}
            {[F, E].map((foot, i) => {
              const side = i === 0 ? [A, B] : [A, C];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={F.x} cy={F.y} r={4} fill={hc} />
            <circle cx={E.x} cy={E.y} r={4} fill={hc} />
            <text x={F.x - 12} y={F.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>F</text>
            <text x={E.x + 8} y={E.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>E</text>
            <text x={(A.x+O.x)/2 + 14} y={(A.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      case "congB": {
        // △BDI ≅ △BFI — D=foot on BC, F=foot on AB
        const D = closestPointOnLine(O, B, C);
        const F = closestPointOnLine(O, A, B);
        return (
          <g>
            <polygon points={`${B.x},${B.y} ${D.x},${D.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${B.x},${B.y} ${F.x},${F.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {[D, F].map((foot, i) => {
              const side = i === 0 ? [B, C] : [A, B];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={D.x} cy={D.y} r={4} fill={hc} />
            <circle cx={F.x} cy={F.y} r={4} fill={hc} />
            <text x={D.x + 8} y={D.y + 14} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>D</text>
            <text x={F.x - 12} y={F.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>F</text>
            <text x={(B.x+O.x)/2 + 14} y={(B.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      case "congC": {
        // △CDI ≅ △CEI — D=foot on BC, E=foot on AC
        const D = closestPointOnLine(O, B, C);
        const E = closestPointOnLine(O, A, C);
        return (
          <g>
            <polygon points={`${C.x},${C.y} ${D.x},${D.y} ${O.x},${O.y}`}
              fill={`${hc}25`} stroke={hc} strokeWidth={2} />
            <polygon points={`${C.x},${C.y} ${E.x},${E.y} ${O.x},${O.y}`}
              fill={`${hc}15`} stroke={hc} strokeWidth={2} strokeDasharray="5 3" />
            {[D, E].map((foot, i) => {
              const side = i === 0 ? [B, C] : [A, C];
              const dx = side[1].x - side[0].x, dy = side[1].y - side[0].y;
              const d = Math.sqrt(dx*dx+dy*dy);
              const ux = dx/d, uy = dy/d;
              const nx = -uy, ny = ux;
              const toward = O.x * nx + O.y * ny > foot.x * nx + foot.y * ny ? 1 : -1;
              const sq = 8;
              return <path key={i}
                d={`M ${foot.x + ux*sq} ${foot.y + uy*sq} L ${foot.x + ux*sq + nx*sq*toward} ${foot.y + uy*sq + ny*sq*toward} L ${foot.x + nx*sq*toward} ${foot.y + ny*sq*toward}`}
                fill="none" stroke={hc} strokeWidth={1.5} />;
            })}
            <circle cx={D.x} cy={D.y} r={4} fill={hc} />
            <circle cx={E.x} cy={E.y} r={4} fill={hc} />
            <text x={D.x + 8} y={D.y + 14} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>D</text>
            <text x={E.x + 8} y={E.y - 8} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>E</text>
            <text x={(C.x+O.x)/2 + 14} y={(C.y+O.y)/2} fill={hc} fontSize={9} fontFamily="'Noto Serif KR', serif">
              RHS 합동
            </text>
          </g>
        );
      }
      default:
        return null;
    }
  };

export function renderTriangleAnim(ctx) {
  if (!ctx) return null;
  const { triangle, animPhase, animProgress, buildPhase, jedoLines, jedoCenter,
    jedoCircle, jedoType, jakdoArcs, jakdoRulerLines, jakdoSnaps,
    svgSize, floatingMsg, showProperties, selectedProp,
    compassCenter, compassRadius, compassPhase, compassDragPt,
    arcDrawPoints, rulerStart, crossedEdges, currentStroke,
    zs, FixedG, theme, themeKey, getActiveVB } = ctx;
    if (!triangle) return null;
    const { A, B, C, sides, scale } = triangle;
    const s = sides.map(v => v * scale);

    if (buildPhase === "animating") {
      const cx = svgSize.w / 2;
      const mode = triangle.mode || "sss";
      const ease = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

      if (mode === "sss") {
        // SSS: 3 parallel lines → attach to base → rotate to form triangle
        if (animPhase === 0) {
          const lineAlpha = Math.min(animProgress / 0.2, 1);
          const spacing = 30, y0 = svgSize.h / 2 - spacing;
          return (
            <g opacity={lineAlpha}>
              <line x1={cx-s[0]/2} y1={y0} x2={cx+s[0]/2} y2={y0} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={cx-s[1]/2} y1={y0+spacing} x2={cx+s[1]/2} y2={y0+spacing} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={cx-s[2]/2} y1={y0+spacing*2} x2={cx+s[2]/2} y2={y0+spacing*2} stroke={PASTEL.coral} strokeWidth={3} />
            </g>
          );
        }
        if (animPhase === 1) {
          const t = (animProgress-0.25)/0.25;
          const baseY = svgSize.h*0.7, bx1 = cx-s[2]/2, bx2 = cx+s[2]/2;
          const s1p1 = lerp({x:cx-s[0]/2,y:svgSize.h/2-30},{x:bx1,y:baseY},t);
          const s1p2 = lerp({x:cx+s[0]/2,y:svgSize.h/2-30},{x:bx1,y:baseY-s[0]},t);
          const s2p1 = lerp({x:cx-s[1]/2,y:svgSize.h/2},{x:bx2,y:baseY},t);
          const s2p2 = lerp({x:cx+s[1]/2,y:svgSize.h/2},{x:bx2,y:baseY-s[1]},t);
          return (
            <g>
              <line x1={bx1} y1={baseY} x2={bx2} y2={baseY} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={s1p1.x} y1={s1p1.y} x2={s1p2.x} y2={s1p2.y} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={s2p1.x} y1={s2p1.y} x2={s2p2.x} y2={s2p2.y} stroke={PASTEL.sky} strokeWidth={3} />
            </g>
          );
        }
        if (animPhase >= 2) {
          const t = Math.min((animProgress-0.5)/0.35, 1);
          const eased = ease(t);
          const baseY = svgSize.h*0.7, bx1 = cx-s[2]/2, bx2 = cx+s[2]/2;
          const targetAngleL = -Math.acos((s[2]*s[2]+s[1]*s[1]-s[0]*s[0])/(2*s[2]*s[1]));
          const currentAngleL = lerp({x:-Math.PI/2,y:0},{x:targetAngleL,y:0},eased).x;
          const targetAngleR = Math.PI+Math.acos((s[2]*s[2]+s[0]*s[0]-s[1]*s[1])/(2*s[2]*s[0]));
          const currentAngleR = lerp({x:Math.PI+Math.PI/2,y:0},{x:targetAngleR,y:0},eased).x;
          const lx = bx1+s[1]*Math.cos(currentAngleL), ly = baseY+s[1]*Math.sin(currentAngleL);
          const rx = bx2+s[0]*Math.cos(currentAngleR), ry = baseY+s[0]*Math.sin(currentAngleR);
          return (
            <g>
              <line x1={bx1} y1={baseY} x2={bx2} y2={baseY} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={bx1} y1={baseY} x2={lx} y2={ly} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={bx2} y1={baseY} x2={rx} y2={ry} stroke={PASTEL.mint} strokeWidth={3} />
              {animPhase===3 && <>
                <circle cx={lx} cy={ly} r={5} fill={PASTEL.coral} />
                <circle cx={bx1} cy={baseY} r={5} fill={PASTEL.coral} />
                <circle cx={bx2} cy={baseY} r={5} fill={PASTEL.coral} />
              </>}
            </g>
          );
        }
      }

      if (mode === "sas") {
        // SAS: Two sides appear → join at angle → connect remaining endpoints
        const baseY = svgSize.h * 0.7;
        // B is bottom-left vertex (origin of the angle)
        if (animPhase === 0) {
          // Phase 0: Two sides appear side by side
          const alpha = Math.min(animProgress / 0.2, 1);
          const spacing = 25, y0 = svgSize.h / 2;
          return (
            <g opacity={alpha}>
              <line x1={cx-s[1]/2} y1={y0-spacing/2} x2={cx+s[1]/2} y2={y0-spacing/2} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={cx-s[0]/2} y1={y0+spacing/2} x2={cx+s[0]/2} y2={y0+spacing/2} stroke={PASTEL.mint} strokeWidth={3} />
              {/* Angle indicator */}
              <text x={cx} y={y0+spacing*1.5} textAnchor="middle" fill={PASTEL.coral} fontSize={12}
                fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                ∠ = {triangle.sasData?.angle}°
              </text>
            </g>
          );
        }
        if (animPhase === 1) {
          // Phase 1: Two sides move to B and join at the angle
          const t = ease((animProgress-0.25)/0.25);
          const bx = B.x, by = B.y;
          // Side b (AB) goes from B upward at angle
          const angAB = Math.atan2(A.y-B.y, A.x-B.x);
          const angBC = Math.atan2(C.y-B.y, C.x-B.x);
          // Animate from vertical to target angle
          const curAngL = lerp({x:-Math.PI/2,y:0},{x:angAB,y:0},t).x;
          const curAngR = lerp({x:-Math.PI/2+0.3,y:0},{x:angBC,y:0},t).x;
          const sAB = dist(A,B), sBC = dist(B,C);
          const lx = bx+sAB*Math.cos(curAngL), ly = by+sAB*Math.sin(curAngL);
          const rx = bx+sBC*Math.cos(curAngR), ry = by+sBC*Math.sin(curAngR);
          return (
            <g>
              <line x1={bx} y1={by} x2={lx} y2={ly} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={bx} y1={by} x2={rx} y2={ry} stroke={PASTEL.mint} strokeWidth={3} />
              <circle cx={bx} cy={by} r={5} fill={PASTEL.coral} />
            </g>
          );
        }
        if (animPhase >= 2) {
          // Phase 2-3: Third side connects the two endpoints
          const t = Math.min((animProgress-0.5)/0.35, 1);
          const eased = ease(t);
          const sAB = dist(A,B), sBC = dist(B,C);
          const angAB = Math.atan2(A.y-B.y, A.x-B.x);
          const angBC = Math.atan2(C.y-B.y, C.x-B.x);
          const endA = {x:B.x+sAB*Math.cos(angAB), y:B.y+sAB*Math.sin(angAB)};
          const endC = {x:B.x+sBC*Math.cos(angBC), y:B.y+sBC*Math.sin(angBC)};
          // Draw the closing side with growing animation
          const closeMid = lerp(endA, endC, 0.5);
          const closeStart = lerp(closeMid, endA, eased);
          const closeEnd = lerp(closeMid, endC, eased);
          return (
            <g>
              <line x1={B.x} y1={B.y} x2={endA.x} y2={endA.y} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={B.x} y1={B.y} x2={endC.x} y2={endC.y} stroke={PASTEL.mint} strokeWidth={3} />
              <line x1={closeStart.x} y1={closeStart.y} x2={closeEnd.x} y2={closeEnd.y} stroke={PASTEL.coral} strokeWidth={3} />
              <circle cx={B.x} cy={B.y} r={5} fill={PASTEL.coral} />
              {animPhase===3 && <>
                <circle cx={endA.x} cy={endA.y} r={5} fill={PASTEL.coral} />
                <circle cx={endC.x} cy={endC.y} r={5} fill={PASTEL.coral} />
              </>}
            </g>
          );
        }
      }

      if (mode === "asa") {
        // ASA: Base appears → angles extend from both endpoints → meet at apex
        if (animPhase === 0) {
          // Phase 0: Base (BC) appears
          const alpha = Math.min(animProgress / 0.2, 1);
          return (
            <g opacity={alpha}>
              <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={PASTEL.coral} strokeWidth={3} />
              <circle cx={B.x} cy={B.y} r={4} fill={PASTEL.coral} />
              <circle cx={C.x} cy={C.y} r={4} fill={PASTEL.coral} />
            </g>
          );
        }
        if (animPhase === 1 || animPhase >= 2) {
          // Phase 1-2: Two lines extend from B and C at their angles, growing toward A
          const t1 = Math.min((animProgress-0.25)/0.5, 1);
          const eased = ease(Math.max(0, t1));
          const angBA = Math.atan2(A.y-B.y, A.x-B.x);
          const angCA = Math.atan2(A.y-C.y, A.x-C.x);
          const maxLenB = dist(B, A), maxLenC = dist(C, A);
          const curLenB = maxLenB * eased, curLenC = maxLenC * eased;
          const endB = {x: B.x+curLenB*Math.cos(angBA), y: B.y+curLenB*Math.sin(angBA)};
          const endC2 = {x: C.x+curLenC*Math.cos(angCA), y: C.y+curLenC*Math.sin(angCA)};
          // Angle arcs at B and C
          const arcR = 20;
          const angBC_B = Math.atan2(C.y-B.y, C.x-B.x);
          const angBC_C = Math.atan2(B.y-C.y, B.x-C.x);
          return (
            <g>
              <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={PASTEL.coral} strokeWidth={3} />
              <line x1={B.x} y1={B.y} x2={endB.x} y2={endB.y} stroke={PASTEL.sky} strokeWidth={3} />
              <line x1={C.x} y1={C.y} x2={endC2.x} y2={endC2.y} stroke={PASTEL.mint} strokeWidth={3} />
              {/* Angle arcs */}
              {eased > 0.1 && <>
                <path d={`M ${B.x+arcR*Math.cos(angBC_B)} ${B.y+arcR*Math.sin(angBC_B)} A ${arcR} ${arcR} 0 0 0 ${B.x+arcR*Math.cos(angBA)} ${B.y+arcR*Math.sin(angBA)}`}
                  fill="none" stroke={PASTEL.sky} strokeWidth={2} opacity={0.7} />
                <path d={`M ${C.x+arcR*Math.cos(angBC_C)} ${C.y+arcR*Math.sin(angBC_C)} A ${arcR} ${arcR} 0 0 1 ${C.x+arcR*Math.cos(angCA)} ${C.y+arcR*Math.sin(angCA)}`}
                  fill="none" stroke={PASTEL.mint} strokeWidth={2} opacity={0.7} />
              </>}
              <circle cx={B.x} cy={B.y} r={5} fill={PASTEL.coral} />
              <circle cx={C.x} cy={C.y} r={5} fill={PASTEL.coral} />
              {animPhase >= 2 && eased > 0.95 && (
                <circle cx={A.x} cy={A.y} r={5} fill={PASTEL.coral}>
                  <animate attributeName="r" values="3;7;5" dur="0.5s" fill="freeze" />
                </circle>
              )}
            </g>
          );
        }
      }
    }

    // --- Static triangle (after animation) ---
    return (
      <g>
        {/* Triangle fill */}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill={themeKey === "dark" ? "rgba(232,165,152,0.08)" : "rgba(232,165,152,0.12)"}
          stroke={theme.line}
          strokeWidth={2.5}
        />
        {/* Vertices — fixed screen size via FixedG */}
        {[A, B, C].map((p, i) => {
          const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
          const dx = p.x - centroid.x, dy = p.y - centroid.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const labelDist = 18;
          const lx = p.x + (dx/d) * labelDist;
          const ly = p.y + (dy/d) * labelDist;
          return (
          <FixedG key={i} x={p.x} y={p.y}>
            <circle cx={p.x} cy={p.y} r={(buildPhase === "jedo" && jedoType !== "circum") ? 14 : 6}
              fill={(buildPhase === "jedo" && jedoType !== "circum") ? "transparent" : PASTEL.coral}
              stroke={(buildPhase === "jedo" && jedoType !== "circum") ? PASTEL.lavender : "none"}
              strokeWidth={(buildPhase === "jedo" && jedoType !== "circum") ? 2 : 0}
              strokeDasharray={(buildPhase === "jedo" && jedoType !== "circum") ? "4 2" : "none"}
              style={{ cursor: (buildPhase === "jedo" && jedoType !== "circum") ? "pointer" : "default" }}
            />
            <circle cx={p.x} cy={p.y} r={4} fill={PASTEL.coral} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={theme.text}
              fontSize={13} fontFamily="'Playfair Display', serif" fontWeight={700}>
              {["A", "B", "C"][i]}
            </text>
          </FixedG>
          );
        })}
        {/* Edge labels + Angle arcs — visible only in modeSelect */}
        {buildPhase === "modeSelect" && (
          <g style={{ animation: "fadeIn 0.5s ease" }}>
            {/* Edge lengths */}
            {[[A, B, "c"], [B, C, "a"], [A, C, "b"]].map(([p1, p2, label], i) => {
              const mid = midpoint(p1, p2);
              const dx = p2.x - p1.x, dy = p2.y - p1.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              // Normal offset, push label outward from centroid
              const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
              const midToCx = mid.x - centroid.x, midToCy = mid.y - centroid.y;
              const midToCD = Math.sqrt(midToCx*midToCx + midToCy*midToCy) || 1;
              const offset = 18;
              const lx = mid.x + (midToCx/midToCD) * offset;
              const ly = mid.y + (midToCy/midToCD) * offset;
              const val = dist(p1, p2) / (triangle.scale || 1);
              return (
                <FixedG key={`edge${i}`} x={lx} y={ly}>
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                    fill={theme.textSec} fontSize={11} fontFamily="'Noto Serif KR', serif">
                    {label}={val.toFixed(1)}
                  </text>
                </FixedG>
              );
            })}
            {/* Angle arcs + labels + right angle markers + callout for tight angles */}
            {[[A, B, C, "A"], [B, A, C, "B"], [C, A, B, "C"]].map(([vertex, p1, p2, label], i) => {
              const ang = angleAtVertex(vertex, p1, p2);
              const angDeg = ang * 180 / Math.PI;
              const isRightAngle = Math.abs(angDeg - 90) < 1.5;
              const isTight = angDeg < 35;
              const arcR = (isTight ? 16 : 24);
              const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
              const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
              let startAngle = a1, endAngle = a2;
              let diff = endAngle - startAngle;
              if (diff < -Math.PI) diff += 2 * Math.PI;
              if (diff > Math.PI) diff -= 2 * Math.PI;
              const sweepFlag = diff > 0 ? 1 : 0;
              const midAngle = startAngle + diff / 2;
              const arcColor = [PASTEL.coral, PASTEL.sky, PASTEL.mint][i];

              if (isRightAngle) {
                const sqSize = 14;
                const u1 = { x: Math.cos(a1), y: Math.sin(a1) };
                const u2 = { x: Math.cos(a2), y: Math.sin(a2) };
                const corner1 = { x: vertex.x + u1.x*sqSize, y: vertex.y + u1.y*sqSize };
                const corner2 = { x: vertex.x + u1.x*sqSize + u2.x*sqSize, y: vertex.y + u1.y*sqSize + u2.y*sqSize };
                const corner3 = { x: vertex.x + u2.x*sqSize, y: vertex.y + u2.y*sqSize };
                // Label along the bisector direction, close to vertex
                const lblR = 38;
                const lblPos = { x: vertex.x + lblR*Math.cos(midAngle), y: vertex.y + lblR*Math.sin(midAngle) };
                return (
                  <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
                    <path d={`M ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${corner3.x} ${corner3.y}`}
                      fill="none" stroke={arcColor} strokeWidth={1.8} opacity={0.9} />
                    <text x={lblPos.x} y={lblPos.y} textAnchor="middle"
                      dominantBaseline="central" fill={arcColor}
                      fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                      90°
                    </text>
                  </FixedG>
                );
              }

              const arcStart = { x: vertex.x + arcR*Math.cos(startAngle), y: vertex.y + arcR*Math.sin(startAngle) };
              const arcEnd = { x: vertex.x + arcR*Math.cos(endAngle), y: vertex.y + arcR*Math.sin(endAngle) };

              if (isTight) {
                // Callout: short line from arc outward along bisector, staying near vertex
                const arcMid = { x: vertex.x + arcR*Math.cos(midAngle), y: vertex.y + arcR*Math.sin(midAngle) };
                const calloutR = arcR + 28; // only 28px beyond arc — stays close
                const calloutEnd = { x: vertex.x + calloutR*Math.cos(midAngle), y: vertex.y + calloutR*Math.sin(midAngle) };
                return (
                  <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
                    <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
                      fill="none" stroke={arcColor} strokeWidth={2} opacity={0.8} />
                    <line x1={arcMid.x} y1={arcMid.y} x2={calloutEnd.x} y2={calloutEnd.y}
                      stroke={arcColor} strokeWidth={1} opacity={0.5} />
                    <circle cx={arcMid.x} cy={arcMid.y} r={1.5} fill={arcColor} opacity={0.6} />
                    <text x={calloutEnd.x} y={calloutEnd.y - 6} textAnchor="middle"
                      dominantBaseline="central" fill={arcColor}
                      fontSize={9} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                      {angDeg.toFixed(1)}°
                    </text>
                  </FixedG>
                );
              }

              // Normal: label inside arc
              const labelR = arcR + 14;
              const labelPos = { x: vertex.x + labelR*Math.cos(midAngle), y: vertex.y + labelR*Math.sin(midAngle) };
              return (
                <FixedG key={`ang${i}`} x={vertex.x} y={vertex.y}>
                  <path d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`}
                    fill="none" stroke={arcColor} strokeWidth={2} opacity={0.8} />
                  <text x={labelPos.x} y={labelPos.y} textAnchor="middle"
                    dominantBaseline="central" fill={arcColor}
                    fontSize={10} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                    {angDeg.toFixed(1)}°
                  </text>
                </FixedG>
              );
            })}
          </g>
        )}
        {/* Edge click highlights for jedo mode — hide when doing angle bisectors */}
        {buildPhase === "jedo" && jedoType !== "in" && [[A, B, "AB"], [B, C, "BC"], [A, C, "AC"]].map(([p1, p2, key], i) => {
          const mid = midpoint(p1, p2);
          const done = jedoLines.find(l => l.key === `perp_${key}`);
          return (
            <g key={`edge-hit-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="transparent" strokeWidth={30}
                style={{ cursor: "pointer", vectorEffect: "none" }} />
              {!done && (
                <FixedG x={mid.x} y={mid.y}>
                  <circle cx={mid.x} cy={mid.y} r={8}
                    fill="transparent" stroke={PASTEL.sky} strokeWidth={1.5}
                    strokeDasharray="3 2" opacity={0.7}>
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </FixedG>
              )}
              {done && (
                <FixedG x={mid.x} y={mid.y}>
                  <circle cx={mid.x} cy={mid.y} r={4} fill={PASTEL.sky} opacity={0.5} />
                </FixedG>
              )}
            </g>
          );
        })}
        {/* Jedo lines — extending beyond triangle */}
        {jedoLines.map((line, i) => (
          <line key={i} x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
            stroke={line.color} strokeWidth={1.5} strokeDasharray={"6 3"} opacity={0.7}
          />
        ))}
        {/* Center point */}
        {jedoCenter && (() => {
          // Find label position that avoids vertices
          const verts = [A, B, C];
          let lx = jedoCenter.x + 16, ly = jedoCenter.y - 8;
          // Check if default position is too close to any vertex
          const tooClose = verts.some(v => dist(v, { x: lx, y: ly }) < 25);
          if (tooClose) {
            // Place label on opposite side of nearest vertex
            const centroid = { x: (A.x+B.x+C.x)/3, y: (A.y+B.y+C.y)/3 };
            const awayX = jedoCenter.x - centroid.x, awayY = jedoCenter.y - centroid.y;
            const awayLen = Math.sqrt(awayX*awayX+awayY*awayY) || 1;
            lx = jedoCenter.x + (awayX/awayLen) * 20;
            ly = jedoCenter.y + (awayY/awayLen) * 20 - 6;
          }
          return (
          <g style={{ cursor: "pointer" }}>
            <FixedG x={jedoCenter.x} y={jedoCenter.y}>
              <circle cx={jedoCenter.x} cy={jedoCenter.y} r={12}
                fill="transparent" stroke={PASTEL.coral} strokeWidth={2}>
                {jedoLines.length >= 3 && (
                  <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
              <circle cx={jedoCenter.x} cy={jedoCenter.y} r={4} fill={PASTEL.coral} />
              <text x={lx} y={ly} fill={theme.text}
                fontSize={12} fontFamily="'Noto Serif KR', serif" fontWeight={700}>
                {jedoType === "circum" ? "외심" : "내심"}
              </text>
            </FixedG>
            {/* Guide lines */}
            {jedoType === "circum" && jedoLines.length >= 3 && !jedoCircle && [A, B, C].map((p, i) => (
              <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={p.x} y2={p.y}
                stroke={theme.lineLight} strokeWidth={1} strokeDasharray={"4 4"} opacity={0.5} />
            ))}
            {jedoType === "in" && jedoLines.length >= 3 && !jedoCircle && [[A, B], [B, C], [A, C]].map(([p1, p2], i) => {
              const cp = closestPointOnLine(jedoCenter, p1, p2);
              return (
                <line key={`lead${i}`} x1={jedoCenter.x} y1={jedoCenter.y} x2={cp.x} y2={cp.y}
                  stroke={theme.lineLight} strokeWidth={1} strokeDasharray={"4 4"} opacity={0.5} />
              );
            })}
          </g>
          );
        })()}
        {/* Circle drawing animation — stroke progressively drawn */}
        {jedoCircle && (() => {
          const { cx, cy, r } = jedoCircle;
          const color = jedoType === "circum" ? PASTEL.sky : PASTEL.lavender;
          const circ = 2 * Math.PI * r;
          return (
            <g key={`circle-${jedoCircle.cx}-${jedoCircle.cy}`}>
              {/* Filled circle fades in then out */}
              <circle cx={cx} cy={cy} r={r} fill={`${color}20`} stroke="none">
                <animate attributeName="opacity" values="0;0.35;0.35;0" dur="2.5s" fill="freeze" />
              </circle>
              {/* Circle outline drawn progressively using dash trick */}
              <circle cx={cx} cy={cy} r={r}
                fill="none" stroke={color} strokeWidth={2.5}
                strokeDasharray={circ}
                strokeDashoffset={circ}
                strokeLinecap="round"
                opacity={0.9}>
                <animate attributeName="stroke-dashoffset" from={circ} to="0" dur="1.8s" fill="freeze" />
              </circle>
            </g>
          );
        })()}
      </g>
    );
  };

