// src/screens/PrecipitationSimScreen.jsx
// 석출 시뮬레이터 메인 (v6 - 단계별 체험)
//
// 학생이 각 단계 버튼을 직접 눌러 진행하는 방식:
//   empty      → [💧 물 붓기]
//   water      → [🔥 램프 켜기]
//   heated     → [🧂 물질 붓기]
//   solute-added → [🥢 유리막대로 젓기]
//   saturated  → [❄️ 불 끄고 냉각]
//   cold       → [🔄 처음부터] / [다시 냉각]
//
// 자동 진행 단계: fillingWater, heating, stirring, cooling
// → 버튼 비활성화, 애니메이션 진행
//
// 냉각 중 점진적 석출: 현재 온도의 용해도로 dissolvedMass/precipitatedMass 실시간 계산

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  SUBSTANCES,
  SUBSTANCE_LIST,
  PRESET_TEMPERATURES,
  getSolubility,
  getSubstanceLabel,
  calculatePrecipitation,
  calculatePrecipitationAdvanced,
} from '../data/solubilityData';
import {
  HOT_TEMPERATURES,
  COLD_TEMPERATURES,
  SOLUTION_MULTIPLIERS,
  computeAmountOption,
} from '../data/precipitationPresets';
import Beaker from '../components/precipitation/Beaker';
import SolubilityChart from '../components/precipitation/SolubilityChart';
import CalculationSteps from '../components/precipitation/CalculationSteps';
import SolubilityReferenceTable from '../components/precipitation/SolubilityReferenceTable';
import PrecipitationQuiz from '../components/precipitation/PrecipitationQuiz';

const QUIZ_PASS_KEY = 'ashrain:precipitation:quizPassed';
const FORMULA_KEY = 'ashrain:precipitation:useFormula';
const ROOM_TEMP = 20; // 상온 (heating 시작 온도)

// 자동 진행 단계와 소요 시간 (ms)
const AUTO_PHASES = {
  fillingWater: { next: 'water', duration: 1200 },
  heating: { next: 'heated', duration: 1800 },
  stirring: { next: 'saturated', duration: 1800 },
  cooling: { next: 'cold', duration: 3000 },
};

export default function PrecipitationSimScreen({ onBack }) {
  const [quizPassed, setQuizPassed] = useState(() => {
    try { return localStorage.getItem(QUIZ_PASS_KEY) === 'true'; } catch { return false; }
  });
  const [useFormula, setUseFormula] = useState(() => {
    try { return localStorage.getItem(FORMULA_KEY) === 'true'; } catch { return false; }
  });

  function toggleFormula() {
    const next = !useFormula;
    setUseFormula(next);
    try { localStorage.setItem(FORMULA_KEY, next ? 'true' : 'false'); } catch {}
  }

  const [mode, setMode] = useState('setting');

  const [settingSubstance, setSettingSubstance] = useState('KNO3');
  const [settingHotTemp, setSettingHotTemp] = useState(60);
  const [settingColdTemp, setSettingColdTemp] = useState(20);
  const [settingMultiplier, setSettingMultiplier] = useState(null);

  const [customSubstance, setCustomSubstance] = useState('KNO3');
  const [customWaterMass, setCustomWaterMass] = useState(100);
  const [customHotTemp, setCustomHotTemp] = useState(60);
  const [customColdTemp, setCustomColdTemp] = useState(20);
  const [customSolutionMass, setCustomSolutionMass] = useState(null);
  const [advancedSaturation, setAdvancedSaturation] = useState(100);

  // 시뮬레이션 상태 (phase + 현재 온도)
  const [sim1, setSim1] = useState({ phase: 'empty', temp: ROOM_TEMP });
  const [sim2, setSim2] = useState({ phase: 'empty', temp: ROOM_TEMP });

  function passQuiz() {
    try { localStorage.setItem(QUIZ_PASS_KEY, 'true'); } catch {}
    setQuizPassed(true);
    setMode('custom');
  }

  const ctx1 = useMemo(() => {
    const substanceId = mode === 'setting' ? settingSubstance : customSubstance;
    const hotTemp = mode === 'setting' ? settingHotTemp : customHotTemp;
    const coldTemp = mode === 'setting' ? settingColdTemp : customColdTemp;
    const hotS = getSolubility(substanceId, hotTemp);
    return {
      substanceId, hotTemp, coldTemp,
      waterMass: 100,
      solutionMass: +(100 + hotS).toFixed(1),
      soluteMass: hotS,
    };
  }, [mode, settingSubstance, customSubstance, settingHotTemp, settingColdTemp, customHotTemp, customColdTemp]);

  const result1 = useMemo(() => calculatePrecipitation({ ...ctx1, mode: 'basic' }), [ctx1]);

  const has2ndSim = mode === 'setting' && settingMultiplier != null;
  const ctx2 = useMemo(() => {
    if (!has2ndSim) return null;
    const opt = computeAmountOption(settingSubstance, settingHotTemp, settingMultiplier);
    return {
      substanceId: settingSubstance,
      hotTemp: settingHotTemp,
      coldTemp: settingColdTemp,
      waterMass: opt.waterMass,
      soluteMass: opt.soluteMass,
      solutionMass: opt.solutionMass,
    };
  }, [has2ndSim, settingSubstance, settingHotTemp, settingColdTemp, settingMultiplier]);

  const result2 = useMemo(() => ctx2 ? calculatePrecipitation({ ...ctx2, mode: 'basic' }) : null, [ctx2]);

  const ctxCustom = useMemo(() => {
    if (mode !== 'custom' && mode !== 'advanced') return null;
    const hotS = getSolubility(customSubstance, customHotTemp);
    const actualSoluteIn100gWater = mode === 'advanced'
      ? hotS * (advancedSaturation / 100)
      : hotS;
    const autoSolutionMass = +(customWaterMass * (100 + actualSoluteIn100gWater) / 100).toFixed(2);
    return {
      substanceId: customSubstance,
      hotTemp: customHotTemp,
      coldTemp: customColdTemp,
      waterMass: customWaterMass,
      soluteMass: hotS * customWaterMass / 100,
      solutionMass: customSolutionMass != null ? customSolutionMass : autoSolutionMass,
      saturationPercent: advancedSaturation,
      mode: mode === 'advanced' ? 'advanced' : 'basic',
    };
  }, [mode, customSubstance, customWaterMass, customHotTemp, customColdTemp, customSolutionMass, advancedSaturation]);

  const resultCustom = useMemo(() => {
    if (!ctxCustom) return null;
    return ctxCustom.mode === 'advanced'
      ? calculatePrecipitationAdvanced(ctxCustom)
      : calculatePrecipitation(ctxCustom);
  }, [ctxCustom]);

  // ─── 비커 상태 유도 (phase + 현재 온도 반영) ───
  // 상태 표시는 현재 비커 안의 실제 내용물과 일치해야 함:
  //   - empty: 물 0g (아직 안 부어짐)
  //   - fillingWater~heated: 물 있음, 용질 아직 없음
  //   - solute-added: 가루만 투입 (아직 안 녹음)
  //   - stirring: 점진 용해 중
  //   - saturated: 완전 용해
  //   - cooling/cold: 현재 온도의 용해도로 실시간 석출
  function deriveBeakerState(ctx, result, sim) {
    if (!ctx || !result) return { waterMass: 0, dissolvedMass: 0, precipitatedMass: 0, maxDissolvedMass: 1 };
    const waterMassFull = ctx.waterMass || 100;
    const totalSolute = ctx.soluteMass != null ? ctx.soluteMass : result.hotS * waterMassFull / 100;

    let waterMass, dissolvedMass, precipitatedMass;
    switch (sim.phase) {
      case 'empty':
        // 아직 물을 안 부은 상태 → 비커 비어있음, 상태도 0
        waterMass = 0; dissolvedMass = 0; precipitatedMass = 0;
        break;
      case 'fillingWater':
      case 'water':
      case 'heating':
      case 'heated':
        waterMass = waterMassFull; dissolvedMass = 0; precipitatedMass = 0;
        break;
      case 'solute-added':
        // 가루 상태 (아직 안 녹음)
        waterMass = waterMassFull; dissolvedMass = 0; precipitatedMass = 0;
        break;
      case 'stirring': {
        // 점진 용해: stirProgress (0→1) 반영
        waterMass = waterMassFull;
        dissolvedMass = totalSolute * (sim.stirProgress ?? 1);
        precipitatedMass = 0;
        break;
      }
      case 'saturated':
        waterMass = waterMassFull; dissolvedMass = totalSolute; precipitatedMass = 0;
        break;
      case 'cooling':
      case 'cold': {
        waterMass = waterMassFull;
        const currentS = getSolubility(ctx.substanceId, sim.temp);
        const maxDissolvedAtCurrent = currentS * waterMassFull / 100;
        dissolvedMass = Math.min(totalSolute, maxDissolvedAtCurrent);
        precipitatedMass = Math.max(0, totalSolute - dissolvedMass);
        break;
      }
      default:
        waterMass = waterMassFull; dissolvedMass = totalSolute; precipitatedMass = 0;
    }

    return {
      waterMass,
      dissolvedMass: +Math.max(0, dissolvedMass).toFixed(1),
      precipitatedMass: +Math.max(0, precipitatedMass).toFixed(1),
      maxDissolvedMass: totalSolute || 1,
    };
  }

  // ─── Phase 전환 ───
  const autoTimersRef = useRef({ sim1: null, sim2: null });
  const tweenRafRef = useRef({ sim1: null, sim2: null });

  // mode/ctx 바뀌면 empty로 리셋
  useEffect(() => {
    resetToEmpty('sim1', setSim1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx1.substanceId, ctx1.hotTemp, ctx1.coldTemp]);

  useEffect(() => {
    if (!ctx2) return;
    resetToEmpty('sim2', setSim2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx2?.substanceId, ctx2?.hotTemp, ctx2?.coldTemp, ctx2?.solutionMass]);

  function resetToEmpty(key, setSim) {
    if (autoTimersRef.current[key]) clearTimeout(autoTimersRef.current[key]);
    if (tweenRafRef.current[key]) cancelAnimationFrame(tweenRafRef.current[key]);
    setSim({ phase: 'empty', temp: ROOM_TEMP });
  }

  // 자동 진행 단계 관리
  function advanceAuto(key, setSim, currentPhase) {
    const config = AUTO_PHASES[currentPhase];
    if (!config) return;
    if (autoTimersRef.current[key]) clearTimeout(autoTimersRef.current[key]);
    autoTimersRef.current[key] = setTimeout(() => {
      setSim(prev => ({ ...prev, phase: config.next }));
    }, config.duration);
  }

  // Sim1 자동 phase 전환 감시
  useEffect(() => {
    if (AUTO_PHASES[sim1.phase]) advanceAuto('sim1', setSim1, sim1.phase);
    return () => {
      if (autoTimersRef.current.sim1) clearTimeout(autoTimersRef.current.sim1);
    };
  }, [sim1.phase]);

  useEffect(() => {
    if (AUTO_PHASES[sim2.phase]) advanceAuto('sim2', setSim2, sim2.phase);
    return () => {
      if (autoTimersRef.current.sim2) clearTimeout(autoTimersRef.current.sim2);
    };
  }, [sim2.phase]);

  // 온도 tween (heating, cooling 중)
  function startTempTween(key, setSim, fromTemp, toTemp, duration) {
    if (tweenRafRef.current[key]) cancelAnimationFrame(tweenRafRef.current[key]);
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      const temp = fromTemp + (toTemp - fromTemp) * eased;
      setSim(prev => ({ ...prev, temp }));
      if (t < 1) tweenRafRef.current[key] = requestAnimationFrame(tick);
    };
    tweenRafRef.current[key] = requestAnimationFrame(tick);
  }

  useEffect(() => {
    if (sim1.phase === 'heating') {
      startTempTween('sim1', setSim1, ROOM_TEMP, ctx1.hotTemp, AUTO_PHASES.heating.duration);
    } else if (sim1.phase === 'cooling') {
      startTempTween('sim1', setSim1, ctx1.hotTemp, ctx1.coldTemp, AUTO_PHASES.cooling.duration);
    }
    return () => {
      if (tweenRafRef.current.sim1) cancelAnimationFrame(tweenRafRef.current.sim1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim1.phase]);

  useEffect(() => {
    if (!ctx2) return;
    if (sim2.phase === 'heating') {
      startTempTween('sim2', setSim2, ROOM_TEMP, ctx2.hotTemp, AUTO_PHASES.heating.duration);
    } else if (sim2.phase === 'cooling') {
      startTempTween('sim2', setSim2, ctx2.hotTemp, ctx2.coldTemp, AUTO_PHASES.cooling.duration);
    }
    return () => {
      if (tweenRafRef.current.sim2) cancelAnimationFrame(tweenRafRef.current.sim2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim2.phase]);

  // stirring 중 점진적 용해 (stirProgress tween)
  useEffect(() => {
    if (sim1.phase !== 'stirring') return;
    const startTime = performance.now();
    const duration = AUTO_PHASES.stirring.duration;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      setSim1(prev => prev.phase === 'stirring' ? { ...prev, stirProgress: t } : prev);
      if (t < 1) tweenRafRef.current.sim1 = requestAnimationFrame(tick);
    };
    tweenRafRef.current.sim1 = requestAnimationFrame(tick);
    return () => {
      if (tweenRafRef.current.sim1) cancelAnimationFrame(tweenRafRef.current.sim1);
    };
  }, [sim1.phase]);

  useEffect(() => {
    if (sim2.phase !== 'stirring') return;
    const startTime = performance.now();
    const duration = AUTO_PHASES.stirring.duration;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      setSim2(prev => prev.phase === 'stirring' ? { ...prev, stirProgress: t } : prev);
      if (t < 1) tweenRafRef.current.sim2 = requestAnimationFrame(tick);
    };
    tweenRafRef.current.sim2 = requestAnimationFrame(tick);
    return () => {
      if (tweenRafRef.current.sim2) cancelAnimationFrame(tweenRafRef.current.sim2);
    };
  }, [sim2.phase]);

  // 버튼 액션: 다음 단계로
  function goToNextPhase(key, setSim, currentPhase) {
    const map = {
      empty: 'fillingWater',
      water: 'heating',
      heated: 'solute-added',
      'solute-added': 'stirring',
      saturated: 'cooling',
    };
    const next = map[currentPhase];
    if (!next) return;
    setSim(prev => ({ ...prev, phase: next, stirProgress: 0 }));
  }

  function recoolFromSaturated(key, ctx, setSim) {
    // cold → saturated (포화 상태로 되돌림) 준비상태
    setSim({ phase: 'saturated', temp: ctx.hotTemp });
  }

  function handleHotTempChange(t) {
    setSettingHotTemp(t);
    if (settingColdTemp >= t) {
      const valid = COLD_TEMPERATURES.filter(c => c < t);
      if (valid.length) setSettingColdTemp(valid[valid.length - 1]);
    }
    setSettingMultiplier(null);
  }
  function handleColdTempChange(t) {
    if (t >= settingHotTemp) return;
    setSettingColdTemp(t);
    setSettingMultiplier(null);
  }

  if (mode === 'quiz') {
    return (
      <PrecipitationQuiz
        onComplete={passQuiz}
        onCancel={() => setMode('setting')}
        useFormula={useFormula}
      />
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.topBar}>
        {onBack && <button style={styles.backBtn} onClick={onBack}>←</button>}
        <h1 style={styles.title}>석출 시뮬레이터</h1>
        <div style={{ flex: 1 }} />
        <LabelToggle useFormula={useFormula} onToggle={toggleFormula} />
      </div>

      <div style={styles.tabs}>
        <ModeTab active={mode === 'setting'} onClick={() => setMode('setting')} label="셋팅" desc="교과서 예시" locked={false} />
        <ModeTab active={mode === 'custom'} onClick={() => quizPassed ? setMode('custom') : setMode('quiz')} label="커스텀" desc="자유 조작" locked={!quizPassed} />
        <ModeTab active={mode === 'advanced'} onClick={() => quizPassed ? setMode('advanced') : setMode('quiz')} label="심화" desc="포화도 변수" locked={!quizPassed} />
      </div>

      {!quizPassed && (
        <div style={styles.quizBanner}>
          <div>
            <div style={styles.quizBannerTitle}>🔒 커스텀 / 심화 모드 해금하기</div>
            <div style={styles.quizBannerDesc}>퀴즈 5문제를 모두 맞히면 해금됩니다.</div>
          </div>
          <button style={styles.quizBannerBtn} onClick={() => setMode('quiz')}>퀴즈 풀기</button>
        </div>
      )}

      {mode === 'setting' && (
        <SettingModeTags
          substance={settingSubstance}
          onSubstance={(s) => { setSettingSubstance(s); setSettingMultiplier(null); }}
          hotTemp={settingHotTemp}
          onHotTemp={handleHotTempChange}
          coldTemp={settingColdTemp}
          onColdTemp={handleColdTempChange}
          multiplier={settingMultiplier}
          onMultiplier={setSettingMultiplier}
          useFormula={useFormula}
        />
      )}

      {(mode === 'custom' || mode === 'advanced') && (
        <CustomControls
          mode={mode}
          substance={customSubstance}
          onSubstance={setCustomSubstance}
          waterMass={customWaterMass}
          onWaterMass={setCustomWaterMass}
          hotTemp={customHotTemp}
          onHotTemp={setCustomHotTemp}
          coldTemp={customColdTemp}
          onColdTemp={setCustomColdTemp}
          solutionMass={customSolutionMass}
          onSolutionMass={setCustomSolutionMass}
          saturation={advancedSaturation}
          onSaturation={setAdvancedSaturation}
          computedSolutionMass={ctxCustom?.solutionMass}
          useFormula={useFormula}
        />
      )}

      {/* 1차 비커 */}
      {mode === 'setting' && (
        <BeakerCard
          title="① 물 100g 기준"
          subtitle={`${getSubstanceLabel(ctx1.substanceId, useFormula)} · ${ctx1.hotTemp}℃ → ${ctx1.coldTemp}℃`}
          ctx={ctx1}
          sim={sim1}
          beakerState={deriveBeakerState(ctx1, result1, sim1)}
          onNextPhase={() => goToNextPhase('sim1', setSim1, sim1.phase)}
          onReset={() => resetToEmpty('sim1', setSim1)}
          onRecool={() => recoolFromSaturated('sim1', ctx1, setSim1)}
          useFormula={useFormula}
        />
      )}

      {(mode === 'custom' || mode === 'advanced') && ctxCustom && resultCustom && (
        <BeakerCard
          title={mode === 'advanced' ? '심화 시뮬레이션' : '시뮬레이션'}
          subtitle={`${getSubstanceLabel(ctxCustom.substanceId, useFormula)} · ${ctxCustom.hotTemp}℃ → ${ctxCustom.coldTemp}℃`}
          ctx={ctxCustom}
          sim={sim1}
          beakerState={deriveBeakerState(ctxCustom, resultCustom, sim1)}
          onNextPhase={() => goToNextPhase('sim1', setSim1, sim1.phase)}
          onReset={() => resetToEmpty('sim1', setSim1)}
          onRecool={() => recoolFromSaturated('sim1', ctxCustom, setSim1)}
          useFormula={useFormula}
        />
      )}

      {/* 2차 비커 */}
      {mode === 'setting' && has2ndSim && ctx2 && result2 && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>② 선택한 용액양 기준</span>
            <span style={styles.dividerLine} />
          </div>
          <BeakerCard2
            ctx={ctx2}
            sim={sim2}
            beakerState={deriveBeakerState(ctx2, result2, sim2)}
            result1={result1}
            result2={result2}
            onNextPhase={() => goToNextPhase('sim2', setSim2, sim2.phase)}
            onReset={() => resetToEmpty('sim2', setSim2)}
            onRecool={() => recoolFromSaturated('sim2', ctx2, setSim2)}
            useFormula={useFormula}
          />

          <CalculationSteps
            mode="basic"
            substanceId={ctx2.substanceId}
            hotTemp={ctx2.hotTemp}
            coldTemp={ctx2.coldTemp}
            solutionMass={ctx2.solutionMass}
            result={result2}
            useFormula={useFormula}
          />
        </>
      )}

      {(mode === 'custom' || mode === 'advanced') && ctxCustom && resultCustom && (
        <CalculationSteps
          mode={ctxCustom.mode}
          substanceId={ctxCustom.substanceId}
          hotTemp={ctxCustom.hotTemp}
          coldTemp={ctxCustom.coldTemp}
          solutionMass={ctxCustom.solutionMass}
          saturationPercent={ctxCustom.saturationPercent}
          result={resultCustom}
          useFormula={useFormula}
        />
      )}

      <div style={styles.chartSection}>
        <div style={styles.sectionTitle}>용해도 곡선</div>
        <SolubilityChart
          highlightSubstanceId={ctx1.substanceId}
          hotTemp={ctx1.hotTemp}
          coldTemp={ctx1.coldTemp}
          hotSolubility={result1.hotS}
          coldSolubility={result1.coldS}
          useFormula={useFormula}
        />
      </div>

      <SolubilityReferenceTable
        substanceId={ctx1.substanceId}
        useFormula={useFormula}
        highlightTemps={[ctx1.hotTemp, ctx1.coldTemp]}
      />
    </div>
  );
}

// ─── BeakerCard (1차) ────────────────────

function BeakerCard({ title, subtitle, ctx, sim, beakerState, onNextPhase, onReset, onRecool, useFormula }) {
  const sub = SUBSTANCES[ctx.substanceId];
  const actionLabel = getActionLabel(sim.phase, ctx);
  const isAutoPhase = !!AUTO_PHASES[sim.phase];

  const dissolved = beakerState.dissolvedMass;
  const precipitated = beakerState.precipitatedMass;
  const solutionNow = +(beakerState.waterMass + dissolved).toFixed(1);
  const conservation = +(dissolved + precipitated).toFixed(1);

  return (
    <div style={cardStyles.wrap}>
      <div style={cardStyles.header}>
        <div style={cardStyles.title}>{title}</div>
        <div style={cardStyles.subtitle}>{subtitle}</div>
      </div>

      <Beaker
        substanceId={ctx.substanceId}
        waterMass={beakerState.waterMass}
        dissolvedMass={beakerState.dissolvedMass}
        precipitatedMass={beakerState.precipitatedMass}
        maxDissolvedMass={beakerState.maxDissolvedMass}
        temperature={sim.temp}
        phase={sim.phase}
      />

      {sub.colorNote && (
        <div style={cardStyles.colorNote}>
          ※ {sub.name}({sub.formula})의 실제 색은 <b>{sub.realColor}</b>이지만, 가시성을 위해 색을 입혀 표시합니다.
        </div>
      )}

      {/* 상태 수식 */}
      <div style={cardStyles.equationBox}>
        <div style={cardStyles.eqRow}>
          <span style={cardStyles.eqLabel}>물</span>
          <span style={{ ...cardStyles.eqVal, color: '#4A7ED9' }}>{beakerState.waterMass}g</span>
          <span style={cardStyles.eqOp}>+</span>
          <span style={cardStyles.eqLabel}>용질</span>
          <span style={{ ...cardStyles.eqVal, color: sub.displayColor }}>{dissolved}g</span>
          <span style={cardStyles.eqOp}>=</span>
          <span style={cardStyles.eqLabel}>용액</span>
          <span style={{ ...cardStyles.eqVal, color: '#059669' }}>{solutionNow}g</span>
        </div>
        <div style={cardStyles.eqRow}>
          <span style={cardStyles.eqLabel}>석출</span>
          <span style={{ ...cardStyles.eqVal, color: '#F59E0B' }}>{precipitated}g</span>
          <span style={{ flex: 1 }} />
          <span style={cardStyles.conservationNote}>
            용질+석출 = <b style={{ color: '#374151' }}>{conservation}g</b> (유지)
          </span>
        </div>
      </div>

      {/* 단계별 버튼 */}
      <div style={cardStyles.controls}>
        {sim.phase === 'cold' ? (
          <button
            style={{ ...cardStyles.nextBtn, flex: 1 }}
            onClick={onReset}
          >
            🔄 처음부터 다시
          </button>
        ) : isAutoPhase ? (
          <>
            <button style={{ ...cardStyles.nextBtn, opacity: 0.5 }} disabled>
              {actionLabel}
            </button>
            <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
          </>
        ) : (
          <>
            <button style={cardStyles.nextBtn} onClick={onNextPhase}>
              {actionLabel}
            </button>
            <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── BeakerCard2 (2차) ────────────────────

function BeakerCard2({ ctx, sim, beakerState, result1, result2, onNextPhase, onReset, onRecool, useFormula }) {
  const sub = SUBSTANCES[ctx.substanceId];
  const actionLabel = getActionLabel(sim.phase, ctx);
  const isAutoPhase = !!AUTO_PHASES[sim.phase];

  return (
    <div style={cardStyles.wrap}>
      <div style={cardStyles.header}>
        <div style={cardStyles.title}>포화용액 {ctx.solutionMass}g 기준</div>
        <div style={cardStyles.subtitle}>
          물/용질 개별 양은 보여주지 않습니다 — 용액량 기준으로만 판단.
        </div>
      </div>

      <Beaker
        substanceId={ctx.substanceId}
        waterMass={beakerState.waterMass}
        dissolvedMass={beakerState.dissolvedMass}
        precipitatedMass={beakerState.precipitatedMass}
        maxDissolvedMass={beakerState.maxDissolvedMass}
        temperature={sim.temp}
        phase={sim.phase}
      />

      {/* 상태 수식 (용액량만) */}
      <div style={cardStyles.equationBox}>
        <div style={cardStyles.eqRow}>
          <span style={cardStyles.eqLabel}>용액</span>
          <span style={{ ...cardStyles.eqVal, color: '#059669' }}>{ctx.solutionMass}g</span>
          <span style={{ flex: 1 }} />
          <span style={cardStyles.eqLabel}>석출</span>
          <span style={{ ...cardStyles.eqVal, color: '#F59E0B' }}>
            {sim.phase === 'cold' ? `${result2.actualPrecipitation}g` : '?'}
          </span>
        </div>
        {sim.phase === 'cold' && (
          <div style={{ ...cardStyles.eqRow, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 700 }}>석출량 공식</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={cardStyles.chip}>{result1.actualPrecipitation}g</span>
              <span style={{ color: '#9CA3AF' }}>×</span>
              <InlineFraction top={ctx.solutionMass} bottom={result1.referenceSolution} />
              <span style={{ color: '#9CA3AF' }}>=</span>
              <span style={{ ...cardStyles.chip, background: '#FEF3C7', color: '#92400E' }}>
                {result2.actualPrecipitation}g
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={cardStyles.controls}>
        {sim.phase === 'cold' ? (
          <button
            style={{ ...cardStyles.nextBtn, flex: 1 }}
            onClick={onReset}
          >
            🔄 처음부터 다시
          </button>
        ) : isAutoPhase ? (
          <>
            <button style={{ ...cardStyles.nextBtn, opacity: 0.5 }} disabled>
              {actionLabel}
            </button>
            <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
          </>
        ) : (
          <>
            <button style={cardStyles.nextBtn} onClick={onNextPhase}>{actionLabel}</button>
            <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Phase별 버튼 라벨 ────────────────────

function getActionLabel(phase, ctx) {
  switch (phase) {
    case 'empty':         return `💧 물 ${ctx.waterMass}g 붓기`;
    case 'fillingWater':  return '💧 물 붓는 중...';
    case 'water':         return '🔥 램프 켜기';
    case 'heating':       return '🔥 가열 중...';
    case 'heated':        return `🧂 ${ctx.soluteMass?.toFixed(1)}g 붓기`;
    case 'solute-added':  return '🥢 유리막대로 젓기';
    case 'stirring':      return '🥢 녹이는 중...';
    case 'saturated':     return `❄️ 불 끄고 ${ctx.coldTemp}℃로 냉각`;
    case 'cooling':       return '❄️ 냉각 중...';
    case 'cold':          return '완료';
    default: return '...';
  }
}

function InlineFraction({ top, bottom }) {
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', verticalAlign: 'middle',
      fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.1,
    }}>
      <span style={{ padding: '0 4px', fontWeight: 600 }}>{top}</span>
      <span style={{ height: 1, width: '100%', background: '#374151', margin: '1px 0' }} />
      <span style={{ padding: '0 4px', fontWeight: 600 }}>{bottom}</span>
    </span>
  );
}

// ─── 셋팅 태그 ────────────────────────────

function SettingModeTags({
  substance, onSubstance,
  hotTemp, onHotTemp,
  coldTemp, onColdTemp,
  multiplier, onMultiplier,
  useFormula,
}) {
  const amountOptions = SOLUTION_MULTIPLIERS.map(m =>
    computeAmountOption(substance, hotTemp, m)
  );

  return (
    <div style={styles.tagPanel}>
      <TagRow label="물질">
        {SUBSTANCE_LIST.map(s => (
          <Chip key={s.id} active={substance === s.id} onClick={() => onSubstance(s.id)} activeColor={s.displayColor}>
            {useFormula ? s.formula : s.name}
          </Chip>
        ))}
      </TagRow>

      <TagRow label="용해 온도">
        {HOT_TEMPERATURES.map(t => (
          <Chip key={t} active={hotTemp === t} onClick={() => onHotTemp(t)} activeColor="#D94A4A">
            {t}℃
          </Chip>
        ))}
      </TagRow>

      <TagRow label="냉각 온도">
        {COLD_TEMPERATURES.map(t => {
          const disabled = t >= hotTemp;
          return (
            <Chip key={t} active={coldTemp === t} onClick={() => !disabled && onColdTemp(t)} activeColor="#4A7ED9" disabled={disabled}>
              {t}℃
            </Chip>
          );
        })}
      </TagRow>

      <TagRow label="용액양">
        {amountOptions.map(opt => (
          <Chip key={opt.multiplier} active={multiplier === opt.multiplier} onClick={() => onMultiplier(opt.multiplier)} activeColor="#F59E0B">
            {opt.solutionMass}g
          </Chip>
        ))}
      </TagRow>

      <div style={styles.tagHint}>
        {multiplier == null
          ? '💡 용액양까지 선택하면 아래에 상세 계산식이 나타납니다.'
          : `선택 완료: ${getSubstanceLabel(substance, useFormula)} · ${hotTemp}℃→${coldTemp}℃ · ${amountOptions.find(o => o.multiplier === multiplier)?.solutionMass}g`
        }
      </div>
    </div>
  );
}

function TagRow({ label, children }) {
  return (
    <div style={styles.tagRow}>
      {label && <div style={styles.tagCategory}>{label}</div>}
      <div style={styles.tagListScroll}>
        <div style={styles.tagListInner}>{children}</div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, activeColor, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1.5px solid',
        borderColor: disabled ? '#E5E8EC' : active ? activeColor : '#D4D9E0',
        background: disabled ? '#F9FAFB' : active ? activeColor : '#FFFFFF',
        color: disabled ? '#D1D5DB' : active ? '#FFFFFF' : '#4B5563',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function LabelToggle({ useFormula, onToggle }) {
  return (
    <button style={toggleStyles.wrap} onClick={onToggle} aria-label="표시 전환">
      <span style={{ ...toggleStyles.side, ...(useFormula ? {} : toggleStyles.sideActive) }}>한글</span>
      <span style={{ ...toggleStyles.side, ...(useFormula ? toggleStyles.sideActive : {}) }}>화학식</span>
    </button>
  );
}

function ModeTab({ active, onClick, label, desc, locked }) {
  return (
    <button
      style={{
        ...tabStyles.tab,
        ...(active ? tabStyles.tabActive : {}),
        opacity: locked ? 0.6 : 1,
      }}
      onClick={onClick}
    >
      <div style={tabStyles.tabLabel}>{locked && '🔒 '}{label}</div>
      <div style={tabStyles.tabDesc}>{desc}</div>
    </button>
  );
}

function CustomControls({
  mode,
  substance, onSubstance,
  waterMass, onWaterMass,
  hotTemp, onHotTemp,
  coldTemp, onColdTemp,
  solutionMass, onSolutionMass,
  saturation, onSaturation,
  computedSolutionMass,
  useFormula,
}) {
  // 용액 양 슬라이더 활성화 상태
  // null이면 "자동(포화)" 모드, 숫자면 수동 모드
  const isAutoSolution = solutionMass == null;
  const sliderSolutionMass = solutionMass != null ? solutionMass : (computedSolutionMass ?? 200);

  // 용액 양 최대값: 비커 용량에 맞춰 800g 정도까지
  const SOLUTION_MAX = 800;

  return (
    <div style={styles.controlPanel}>
      <div style={styles.panelTitle}>{mode === 'advanced' ? '심화 모드' : '커스텀 모드'}</div>

      <TagRow label="물질">
        {SUBSTANCE_LIST.map(s => (
          <Chip key={s.id} active={substance === s.id} onClick={() => onSubstance(s.id)} activeColor={s.displayColor}>
            {useFormula ? s.formula : s.name}
          </Chip>
        ))}
      </TagRow>

      {/* 물 양 */}
      <div style={styles.sliderField}>
        <div style={styles.sliderLabel}>
          <span>물 양</span>
          <b style={{ color: '#1F2937' }}>{waterMass}g</b>
        </div>
        <input type="range" min={50} max={500} step={10} value={waterMass}
          onChange={e => onWaterMass(+e.target.value)} style={styles.slider} />
        <div style={styles.quickChipRow}>
          {[50, 100, 200, 300, 500].map(v => (
            <QuickChip key={v} active={waterMass === v} onClick={() => onWaterMass(v)} color="#4A7ED9">
              {v}g
            </QuickChip>
          ))}
        </div>
      </div>

      {/* 용해 온도 */}
      <div style={styles.sliderField}>
        <div style={styles.sliderLabel}>
          <span>용해 온도</span>
          <b style={{ color: '#D94A4A' }}>{hotTemp}℃</b>
        </div>
        <input
          type="range"
          min={Math.max(10, coldTemp + 10)}
          max={100}
          step={1}
          value={hotTemp}
          onChange={e => {
            const v = +e.target.value;
            if (v > coldTemp) onHotTemp(v);
          }}
          style={{ ...styles.slider, accentColor: '#D94A4A' }}
        />
        <div style={styles.quickChipRow}>
          {PRESET_TEMPERATURES.map(t => (
            <QuickChip
              key={t}
              active={hotTemp === t}
              onClick={() => t > coldTemp && onHotTemp(t)}
              color="#D94A4A"
              disabled={t <= coldTemp}
            >
              {t}℃
            </QuickChip>
          ))}
        </div>
      </div>

      {/* 냉각 온도 */}
      <div style={styles.sliderField}>
        <div style={styles.sliderLabel}>
          <span>냉각 온도</span>
          <b style={{ color: '#4A7ED9' }}>{coldTemp}℃</b>
        </div>
        <input
          type="range"
          min={0}
          max={Math.min(90, hotTemp - 10)}
          step={1}
          value={coldTemp}
          onChange={e => {
            const v = +e.target.value;
            if (v < hotTemp) onColdTemp(v);
          }}
          style={{ ...styles.slider, accentColor: '#4A7ED9' }}
        />
        <div style={styles.quickChipRow}>
          {PRESET_TEMPERATURES.map(t => (
            <QuickChip
              key={t}
              active={coldTemp === t}
              onClick={() => t < hotTemp && onColdTemp(t)}
              color="#4A7ED9"
              disabled={t >= hotTemp}
            >
              {t}℃
            </QuickChip>
          ))}
        </div>
      </div>

      {/* 심화: 초기 포화도 */}
      {mode === 'advanced' && (
        <div style={styles.sliderField}>
          <div style={styles.sliderLabel}>
            <span>초기 포화도</span>
            <b style={{ color: '#F59E0B' }}>{saturation}%</b>
          </div>
          <input type="range" min={20} max={100} step={5} value={saturation}
            onChange={e => onSaturation(+e.target.value)}
            style={{ ...styles.slider, accentColor: '#F59E0B' }} />
        </div>
      )}

      {/* 용액 양 */}
      <div style={styles.sliderField}>
        <div style={styles.sliderLabel}>
          <span>용액 양</span>
          <b style={{ color: '#059669' }}>
            {isAutoSolution ? `${computedSolutionMass}g (자동)` : `${solutionMass}g`}
          </b>
        </div>
        <input
          type="range"
          min={50}
          max={SOLUTION_MAX}
          step={10}
          value={sliderSolutionMass}
          disabled={isAutoSolution}
          onChange={e => onSolutionMass(+e.target.value)}
          style={{ ...styles.slider, accentColor: '#059669', opacity: isAutoSolution ? 0.4 : 1 }}
        />
        <div style={styles.quickChipRow}>
          <QuickChip active={isAutoSolution} onClick={() => onSolutionMass(null)} color="#059669">
            자동(포화)
          </QuickChip>
          {[100, 200, 300, 500].map(v => (
            <QuickChip key={v} active={solutionMass === v} onClick={() => onSolutionMass(v)} color="#059669">
              {v}g
            </QuickChip>
          ))}
        </div>
      </div>
    </div>
  );
}

// 빠른 선택 칩 — 슬라이더 보조용 (가로 스크롤)
function QuickChip({ active, onClick, children, color, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid',
        borderColor: disabled ? '#E5E8EC' : active ? color : '#D4D9E0',
        background: disabled ? '#F9FAFB' : active ? color : '#FFFFFF',
        color: disabled ? '#D1D5DB' : active ? '#FFFFFF' : '#6B7280',
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

// ─── 스타일 ─────────────────────────────

const styles = {
  screen: {
    height: '100dvh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 12, padding: 12, paddingBottom: 48,
    background: '#F3F4F6', maxWidth: 480, margin: '0 auto', width: '100%',
  },
  topBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' },
  backBtn: {
    width: 32, height: 32, background: '#FFFFFF', border: '1px solid #E5E8EC',
    borderRadius: 8, fontSize: 16, cursor: 'pointer',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 800, color: '#1F2937' },
  tabs: {
    display: 'flex', gap: 6, background: '#FFFFFF', padding: 4, borderRadius: 10,
    border: '1px solid #E5E8EC',
  },
  quizBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    padding: 12, background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
    borderRadius: 10, border: '1px solid #C7D2FE',
  },
  quizBannerTitle: { fontSize: 13, fontWeight: 700, color: '#3730A3' },
  quizBannerDesc: { fontSize: 11, color: '#4338CA', marginTop: 2 },
  quizBannerBtn: {
    padding: '8px 14px', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  tagPanel: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: 12, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E8EC',
  },
  tagRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  tagCategory: {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tagListScroll: {
    width: '100%', overflowX: 'auto', overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', paddingBottom: 2,
  },
  tagListInner: { display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: 6, paddingRight: 4 },
  tagHint: {
    marginTop: 4, padding: 8, background: '#F9FAFB', borderRadius: 6,
    fontSize: 11, color: '#6B7280', lineHeight: 1.5,
  },
  controlPanel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 12, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E8EC',
  },
  panelTitle: { fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 4 },
  fieldLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 500 },
  slider: { width: '100%', marginTop: 2, accentColor: '#4A7ED9' },
  sliderField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '6px 0',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 600,
  },
  quickChipRow: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 4,
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 2,
  },
  chartSection: {
    padding: 12, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E8EC',
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 8 },
  divider: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: -4 },
  dividerLine: { flex: 1, height: 1, background: '#D4D9E0' },
  dividerText: { fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3 },
};

const cardStyles = {
  wrap: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 12, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E8EC',
  },
  header: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 2 },
  title: { fontSize: 13, fontWeight: 800, color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#6B7280', lineHeight: 1.5 },
  colorNote: {
    padding: '6px 10px', background: '#F9FAFB', borderRadius: 6,
    fontSize: 10, color: '#6B7280', lineHeight: 1.4,
  },
  equationBox: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F0F2F5',
  },
  eqRow: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, flexWrap: 'wrap' },
  eqLabel: { fontSize: 10, fontWeight: 600, color: '#6B7280' },
  eqVal: {
    padding: '2px 6px', background: '#FFFFFF', borderRadius: 4,
    fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700,
  },
  eqOp: { color: '#9CA3AF', fontWeight: 700, margin: '0 2px' },
  conservationNote: { fontSize: 10, color: '#6B7280' },
  chip: {
    padding: '2px 8px', background: '#E0E7FF', color: '#3730A3', borderRadius: 4,
    fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 11,
  },
  controls: { display: 'flex', gap: 8 },
  nextBtn: {
    flex: 1, padding: '10px 14px',
    background: 'linear-gradient(135deg, #4A7ED9, #3B5FC2)',
    color: '#FFFFFF', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(74, 126, 217, 0.25)',
  },
  resetBtn: {
    padding: '10px 14px', background: '#FFFFFF', color: '#6B7280',
    border: '1.5px solid #D4D9E0', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
};

const tabStyles = {
  tab: {
    flex: 1, padding: '8px 6px',
    background: 'transparent', border: 'none', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #4A7ED9, #3B5FC2)', color: '#FFFFFF',
  },
  tabLabel: { fontSize: 12, fontWeight: 700 },
  tabDesc: { fontSize: 9, marginTop: 2, opacity: 0.85 },
};

const toggleStyles = {
  wrap: {
    display: 'inline-flex', alignItems: 'center', padding: 2,
    background: '#F3F4F6', border: '1px solid #E5E8EC',
    borderRadius: 16, cursor: 'pointer', gap: 0,
  },
  side: {
    padding: '4px 9px', fontSize: 11, fontWeight: 700,
    color: '#9CA3AF', borderRadius: 14, transition: 'all 0.15s',
  },
  sideActive: {
    background: '#FFFFFF', color: '#1F2937',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
};
