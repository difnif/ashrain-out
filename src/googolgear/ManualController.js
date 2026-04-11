// 수동 모드 컨트롤러 — 관성 물리 포함
// 사용자 드래그 → 드래그 속도 측정 → 손가락 뗀 후 마찰로 서서히 감속
export function createManualController(B, E) {
  const stages = Math.min(E, 100);
  const rotations = new Float64Array(stages);
  const reductionPerStage = 1 / B;

  let velocity = 0;            // 첫 기어 각속도 (rad/sec)
  let hasInteracted = false;
  let lastInputT = -Infinity;
  let peakAbsVelocity = 0;     // 누적 최고 절대 각속도 (매 입력/프레임마다 갱신)

  // 드래그 속도 계산용 최근 샘플
  const samples = [];
  const SAMPLE_WINDOW = 0.12;  // 최근 120ms

  // 관성 파라미터
  const FRICTION = 0.55;       // 초당 감쇠 계수 (작을수록 오래 돎)
  // 최대 각속도 제한 — 1200 RPM을 훨씬 웃도는 값으로 (자동 모드 상한의 2배 여유)
  // 1200 RPM ≈ 125.66 rad/sec. 학생이 실제로 도달 가능한 수치 + 여유
  const VELOCITY_CAP = 300;    // rad/sec ≈ 2865 RPM

  function cascade() {
    let r = rotations[0];
    for (let k = 1; k < stages; k++) {
      r *= reductionPerStage;
      rotations[k] = r;
    }
  }

  // 사용자가 드래그 중: 각도 변화분 적용 + 속도 갱신
  function applyDragDelta(deltaAngle) {
    const tNow = performance.now() / 1000;
    rotations[0] += deltaAngle;
    cascade();

    samples.push({ t: tNow, delta: deltaAngle });
    while (samples.length > 0 && samples[0].t < tNow - SAMPLE_WINDOW) {
      samples.shift();
    }
    // 즉시 속도도 갱신 (드래그 중에도 RPM 표시용)
    if (samples.length >= 2) {
      const totalDelta = samples.reduce((s, x) => s + x.delta, 0);
      const duration = tNow - samples[0].t;
      if (duration > 0.001) {
        velocity = totalDelta / duration;
        if (velocity > VELOCITY_CAP) velocity = VELOCITY_CAP;
        if (velocity < -VELOCITY_CAP) velocity = -VELOCITY_CAP;
        const absV = Math.abs(velocity);
        if (absV > peakAbsVelocity) peakAbsVelocity = absV;
      }
    }
    lastInputT = tNow;
    hasInteracted = true;
  }

  // 손가락 뗌 — 별도 처리 없음 (step에서 자동 coast 시작)
  function releaseDrag() {
    // 샘플 윈도우는 이미 applyDragDelta에서 유지됨 — velocity만 그대로 사용
    lastInputT = performance.now() / 1000 - 10; // coast 즉시 시작
  }

  // 매 프레임 호출 — coast(관성) 단계
  function step(dt) {
    const tNow = performance.now() / 1000;
    // 입력이 멈춘 경우 (30ms 이상 신호 없음) → coast
    if (tNow - lastInputT > 0.03) {
      if (Math.abs(velocity) > 0.002) {
        rotations[0] += velocity * dt;
        // 지수 감쇠: v *= exp(-FRICTION * dt)
        velocity *= Math.exp(-FRICTION * dt);
        cascade();
      } else {
        velocity = 0;
      }
    }
  }

  return {
    rotations,
    applyDragDelta,
    releaseDrag,
    step,
    getRpm: () => Math.abs(velocity) / (Math.PI * 2) * 60,
    getPeakRpm: () => peakAbsVelocity / (Math.PI * 2) * 60,
    resetPeakRpm: () => { peakAbsVelocity = 0; },
    getHasInteracted: () => hasInteracted,
  };
}
