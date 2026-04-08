// 수동 모드 회전 컨트롤러
// 첫 기어가 사용자 드래그로 회전 → 각 단은 1/B 속도로 따라감
// 드래그 속도를 측정해서 현재 RPM을 산출 (최근 0.5초 평균)

export function createManualController(B, E) {
  const stages = Math.min(E, 100);
  const rotations = new Float64Array(stages);
  const reductionPerStage = 1 / B;

  // 드래그 샘플: { t, angle } — 최근 0.5초만 보관
  const samples = [];
  const SAMPLE_WINDOW = 0.5; // 초

  let lastFirstAngle = 0;
  let currentRpm = 0;
  let hasInteracted = false;

  function setFirstAngle(angle, tNow) {
    const delta = angle - lastFirstAngle;
    lastFirstAngle = angle;
    rotations[0] = angle;

    // cascade
    let r = angle;
    for (let k = 1; k < stages; k++) {
      r *= reductionPerStage;
      rotations[k] = r;
    }

    // 샘플 기록
    samples.push({ t: tNow, angle });
    while (samples.length > 0 && samples[0].t < tNow - SAMPLE_WINDOW) {
      samples.shift();
    }

    if (Math.abs(delta) > 0.001) hasInteracted = true;
  }

  // 매 프레임 호출 — 드래그가 멈췄으면 RPM이 자연스럽게 0으로 감쇠
  function step(tNow) {
    // 최근 샘플 윈도우 정리
    while (samples.length > 0 && samples[0].t < tNow - SAMPLE_WINDOW) {
      samples.shift();
    }
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      if (dt > 0.001) {
        const dAngle = last.angle - first.angle;
        const radPerSec = dAngle / dt;
        currentRpm = Math.abs(radPerSec) / (Math.PI * 2) * 60;
      } else {
        currentRpm = 0;
      }
    } else {
      currentRpm = 0;
    }
  }

  return {
    rotations,
    setFirstAngle,
    step,
    getRpm: () => currentRpm,
    getHasInteracted: () => hasInteracted,
  };
}
