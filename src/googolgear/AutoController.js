// 자동 모드 회전 컨트롤러
// 첫 기어가 RPM으로 회전 → 각 단은 1/B 속도로 따라감
// 각 단의 회전각(라디안)을 누적해서 반환

export function createAutoController(B, E, rpm) {
  const stages = Math.min(E, 100);
  const rotations = new Float64Array(stages); // 누적 회전각
  const reductionPerStage = 1 / B;

  // 미리 단별 속도 계산: rad/sec
  // stage 0: (rpm / 60) * 2π
  // stage k: stage 0 * (1/B)^k
  const speeds = new Float64Array(stages);
  let s0 = (rpm / 60) * Math.PI * 2;
  for (let k = 0; k < stages; k++) {
    speeds[k] = s0;
    s0 *= reductionPerStage;
    // 너무 느려지면 0으로 (수치 노이즈 방지)
    if (Math.abs(speeds[k]) < 1e-300) speeds[k] = 0;
  }

  function step(dt) {
    for (let k = 0; k < stages; k++) {
      rotations[k] += speeds[k] * dt;
    }
  }

  return { rotations, step, getRpm: () => rpm };
}
