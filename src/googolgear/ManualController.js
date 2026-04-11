// 수동 모드 컨트롤러 — 관성 물리 포함
// 사용자 드래그 → 드래그 속도 측정 → 손가락 뗀 후 마찰로 서서히 감속
export function createManualController(B, E) {
  const stages = Math.min(E, 100);
  const rotations = new Float64Array(stages);
  const reductionPerStage = 1 / B;

  let velocity = 0;            // 첫 기어 각속도 (rad/sec)
  let hasInteracted = false;
  let lastInputT = -Infinity;

  // 드래그 속도 계산용 최근 샘플
  const samples = [];
  const SAMPLE_WINDOW = 0.12;       // 최근 120ms
  const MIN_SAMPLES_FOR_VEL = 2;    // 최소 2개 샘플

  // Peak 인정 조건: 첫 기어를 "한 바퀴 이상" 돌린 시점부터
  // — 탭/이상치는 절대 한 바퀴 안 돌아가므로 자연스러운 방어
  const PEAK_UNLOCK_ANGLE = Math.PI * 2;
  let sessionAccumAngle = 0;        // 현재 드래그 세션에서 누적 회전량
  let peakUnlocked = false;         // 한 바퀴 이상 돌린 적 있는가

  // 관성 파라미터
  const FRICTION = 0.55;
  const VELOCITY_CAP = 300;         // rad/sec ≈ 2865 RPM (물리 한도)

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

    // 드래그 세션 감지: 200ms 이상 입력 없었으면 새 세션으로 간주
    // (세션별 누적 각도만 리셋 — samples는 그대로 둬서 velocity 계산 안정성 유지)
    if (tNow - lastInputT > 0.2) {
      sessionAccumAngle = 0;
    }

    // 세션 누적 각도 갱신
    sessionAccumAngle += deltaAngle;
    if (Math.abs(sessionAccumAngle) >= PEAK_UNLOCK_ANGLE) {
      peakUnlocked = true;
    }

    samples.push({ t: tNow, delta: deltaAngle });
    while (samples.length > 0 && samples[0].t < tNow - SAMPLE_WINDOW) {
      samples.shift();
    }

    // velocity 계산
    if (samples.length >= MIN_SAMPLES_FOR_VEL) {
      const totalDelta = samples.reduce((s, x) => s + x.delta, 0);
      const duration = tNow - samples[0].t;
      if (duration > 0.001) {
        let v = totalDelta / duration;
        if (v > VELOCITY_CAP) v = VELOCITY_CAP;
        if (v < -VELOCITY_CAP) v = -VELOCITY_CAP;
        velocity = v;
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
    // 실시간 RPM은 항상 반환 (unlock 무관)
    getRpm: () => Math.abs(velocity) / (Math.PI * 2) * 60,
    // 누적 한 바퀴 넘었는지 — UI에서 max 갱신 여부 결정용
    isUnlocked: () => peakUnlocked,
    resetPeakRpm: () => {
      peakUnlocked = false;
      sessionAccumAngle = 0;
    },
    getHasInteracted: () => hasInteracted,
  };
}
