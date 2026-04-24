// src/screens/PrecipitationSimScreen.jsx
// 석출 시뮬레이터 메인 (v5)
//
// 셋팅 모드: 4단계 카테고리 태그
//   ① 물질
//   ② 용해 온도 (20/40/60/80℃)
//   ③ 냉각 온도 (0/20/40/60℃, 용해온도보다 작은 것만 활성)
//   ④ 용액양 (물 100g 기준 포화용액 배수, g 수치 표시)
//
// 각 카테고리는 가로 스크롤 가능 (flex-nowrap + overflowX: auto)
//
// 1차 비커: 물 100g 기준 (항상 표시)
// 2차 비커: 선택한 용액양 기준 + 계산식 (용액양 선택 시 표시)

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

  // 셋팅 모드 상태
  const [settingSubstance, setSettingSubstance] = useState('KNO3');
  const [settingHotTemp, setSettingHotTemp] = useState(60);
  const [settingColdTemp, setSettingColdTemp] = useState(20);
  const [settingMultiplier, setSettingMultiplier] = useState(null);

  // 커스텀/심화 상태
  const [customSubstance, setCustomSubstance] = useState('KNO3');
  const [customWaterMass, setCustomWaterMass] = useState(100);
  const [customHotTemp, setCustomHotTemp] = useState(60);
  const [customColdTemp, setCustomColdTemp] = useState(20);
  const [customSolutionMass, setCustomSolutionMass] = useState(null);
  const [advancedSaturation, setAdvancedSaturation] = useState(100);

  const [sim1, setSim1] = useState({ phase: 'empty', temp: 60 });
  const [sim2, setSim2] = useState({ phase: 'empty', temp: 60 });

  function passQuiz() {
    try { localStorage.setItem(QUIZ_PASS_KEY, 'true'); } catch {}
    setQuizPassed(true);
    setMode('custom');
  }

  // 1차 컨텍스트 (물 100g 기준)
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

  // 2차 컨텍스트
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

  // 커스텀/심화 컨텍스트
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

  // 비커 상태 유도
  function deriveBeakerState(ctx, result, phase) {
    if (!ctx || !result) return { waterMass: 0, dissolvedMass: 0, precipitatedMass: 0, maxDissolvedMass: 1 };
    const waterMass = ctx.waterMass || 100;
    const totalSolute = ctx.soluteMass != null
      ? ctx.soluteMass
      : result.hotS * waterMass / 100;
    const maxPrecipitated = Math.max(0, (result.hotS - result.coldS)) * waterMass / 100;

    let dissolvedMass, precipitatedMass;
    switch (phase) {
      case 'empty':
      case 'fillingWater':
        dissolvedMass = 0; precipitatedMass = 0;
        break;
      case 'addingSolute':
      case 'saturated':
        dissolvedMass = totalSolute; precipitatedMass = 0;
        break;
      case 'cold':
        dissolvedMass = totalSolute - maxPrecipitated;
        precipitatedMass = maxPrecipitated;
        break;
      case 'cooling':
      default:
        dissolvedMass = totalSolute; precipitatedMass = 0;
        break;
    }
    return {
      waterMass,
      dissolvedMass: +Math.max(0, dissolvedMass).toFixed(1),
      precipitatedMass: +Math.max(0, precipitatedMass).toFixed(1),
      maxDissolvedMass: totalSolute || 1,
    };
  }

  // 자동 시퀀스
  const seqTimeoutsRef = useRef({ sim1: [], sim2: [] });
  function startSequence(key, simSetter, hotTemp) {
    (seqTimeoutsRef.current[key] || []).forEach(id => clearTimeout(id));
    seqTimeoutsRef.current[key] = [];
    simSetter({ phase: 'empty', temp: hotTemp });
    const t1 = setTimeout(() => simSetter({ phase: 'fillingWater', temp: hotTemp }), 400);
    const t2 = setTimeout(() => simSetter({ phase: 'addingSolute', temp: hotTemp }), 1700);
    const t3 = setTimeout(() => simSetter({ phase: 'saturated', temp: hotTemp }), 3000);
    seqTimeoutsRef.current[key].push(t1, t2, t3);
  }

  useEffect(() => {
    startSequence('sim1', setSim1, ctx1.hotTemp);
    return () => (seqTimeoutsRef.current.sim1 || []).forEach(id => clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx1.substanceId, ctx1.hotTemp, ctx1.coldTemp]);

  useEffect(() => {
    if (!ctx2) return;
    startSequence('sim2', setSim2, ctx2.hotTemp);
    return () => (seqTimeoutsRef.current.sim2 || []).forEach(id => clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx2?.substanceId, ctx2?.hotTemp, ctx2?.coldTemp, ctx2?.solutionMass]);

  const coolRafRef = useRef({});
  function startCooling(key, ctx, simSetter) {
    if (!ctx) return;
    if (coolRafRef.current[key]) cancelAnimationFrame(coolRafRef.current[key]);
    const startTemp = ctx.hotTemp;
    const endTemp = ctx.coldTemp;
    const duration = 2500;
    const startTime = performance.now();

    simSetter({ phase: 'cooling', temp: startTemp });

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      const newTemp = startTemp - (startTemp - endTemp) * eased;
      simSetter({ phase: t < 1 ? 'cooling' : 'cold', temp: t < 1 ? newTemp : endTemp });
      if (t < 1) coolRafRef.current[key] = requestAnimationFrame(tick);
    };
    coolRafRef.current[key] = requestAnimationFrame(tick);
  }
  function resetSim(key, ctx, simSetter) {
    if (coolRafRef.current[key]) cancelAnimationFrame(coolRafRef.current[key]);
    startSequence(key, simSetter, ctx.hotTemp);
  }

  // 냉각온도는 용해온도보다 작아야 함 — 제약
  function handleHotTempChange(t) {
    setSettingHotTemp(t);
    if (settingColdTemp >= t) {
      // cold가 hot 이상이면 cold를 자동 조정
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
          beakerState={deriveBeakerState(ctx1, result1, sim1.phase)}
          onCool={() => startCooling('sim1', ctx1, setSim1)}
          onReset={() => resetSim('sim1', ctx1, setSim1)}
          useFormula={useFormula}
        />
      )}

      {(mode === 'custom' || mode === 'advanced') && ctxCustom && resultCustom && (
        <BeakerCard
          title={mode === 'advanced' ? '심화 시뮬레이션' : '시뮬레이션'}
          subtitle={`${getSubstanceLabel(ctxCustom.substanceId, useFormula)} · ${ctxCustom.hotTemp}℃ → ${ctxCustom.coldTemp}℃`}
          ctx={{ ...ctxCustom, soluteMass: getSolubility(customSubstance, customHotTemp) * customWaterMass / 100 }}
          sim={sim1}
          beakerState={deriveBeakerState({ ...ctxCustom, soluteMass: getSolubility(customSubstance, customHotTemp) * customWaterMass / 100 }, resultCustom, sim1.phase)}
          onCool={() => startCooling('sim1', ctxCustom, setSim1)}
          onReset={() => resetSim('sim1', ctxCustom, setSim1)}
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
            beakerState={deriveBeakerState(ctx2, result2, sim2.phase)}
            result1={result1}
            result2={result2}
            onCool={() => startCooling('sim2', ctx2, setSim2)}
            onReset={() => resetSim('sim2', ctx2, setSim2)}
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

// ─── 1차 BeakerCard: 물 100g 기준 ─────────────

function BeakerCard({ title, subtitle, ctx, sim, beakerState, onCool, onReset, useFormula }) {
  const sub = SUBSTANCES[ctx.substanceId];
  const canCool = sim.phase === 'saturated' || sim.phase === 'cold';
  const coolLabel = sim.phase === 'cold'
    ? '다시 냉각'
    : sim.phase === 'cooling'
      ? '냉각 중...'
      : sim.phase === 'saturated'
        ? `${ctx.coldTemp}℃로 냉각`
        : '준비 중...';

  const hotS = ctx.soluteMass ?? 0;
  const dissolved = beakerState.dissolvedMass;
  const precipitated = beakerState.precipitatedMass;
  const solutionNow = +(beakerState.waterMass + dissolved).toFixed(1);
  const conservation = +(dissolved + precipitated).toFixed(1); // 보존되는 합

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

      {/* 색상 안내 (비커 밖 별도 영역) */}
      {sub.colorNote && (
        <div style={cardStyles.colorNote}>
          ※ {sub.name}({sub.formula})의 실제 색은 <b>{sub.realColor}</b>이지만, 가시성을 위해 색을 입혀 표시합니다.
        </div>
      )}

      {/* 상태 수식: 물 + 용질 = 용액 / 석출 */}
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

      <div style={cardStyles.controls}>
        <button style={{ ...cardStyles.coolBtn, opacity: canCool ? 1 : 0.5 }} onClick={onCool} disabled={!canCool}>
          {coolLabel}
        </button>
        <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
      </div>
    </div>
  );
}

// ─── 2차 BeakerCard: 선택 용액양 기준 ─────────────
// 물/용질 개별 양은 가리고, 전체 용액량과 석출량만 표시
// 석출량은 "이전 석출량 × 현재 용액량 / 기준 용액량" 분수 꼴로 표시

function BeakerCard2({ ctx, sim, beakerState, result1, result2, onCool, onReset, useFormula }) {
  const sub = SUBSTANCES[ctx.substanceId];
  const canCool = sim.phase === 'saturated' || sim.phase === 'cold';
  const coolLabel = sim.phase === 'cold'
    ? '다시 냉각'
    : sim.phase === 'cooling'
      ? '냉각 중...'
      : sim.phase === 'saturated'
        ? `${ctx.coldTemp}℃로 냉각`
        : '준비 중...';

  return (
    <div style={cardStyles.wrap}>
      <div style={cardStyles.header}>
        <div style={cardStyles.title}>포화용액 {ctx.solutionMass}g 기준</div>
        <div style={cardStyles.subtitle}>
          같은 물질·온도지만 용액량만 다릅니다. 물과 용질의 개별 양은 <b>보여주지 않습니다</b>.
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

      {/* 상태 수식 (2차): 용액량 + 석출량만, 분수 형태 */}
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
          <span style={{ fontSize: 10, color: '#6B7280' }}>
            (이전 석출량 × 현재 용액량 / 기준 용액량)
          </span>
        </div>
      </div>

      <div style={cardStyles.controls}>
        <button style={{ ...cardStyles.coolBtn, opacity: canCool ? 1 : 0.5 }} onClick={onCool} disabled={!canCool}>
          {coolLabel}
        </button>
        <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
      </div>
    </div>
  );
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

// ─── 셋팅 모드 태그 ─────────────────────────

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
      {/* 물질 */}
      <TagRow label="물질">
        {SUBSTANCE_LIST.map(s => (
          <Chip
            key={s.id}
            active={substance === s.id}
            onClick={() => onSubstance(s.id)}
            activeColor={s.displayColor}
          >
            {useFormula ? s.formula : s.name}
          </Chip>
        ))}
      </TagRow>

      {/* 용해 온도 */}
      <TagRow label="용해 온도">
        {HOT_TEMPERATURES.map(t => (
          <Chip key={t} active={hotTemp === t} onClick={() => onHotTemp(t)} activeColor="#D94A4A">
            {t}℃
          </Chip>
        ))}
      </TagRow>

      {/* 냉각 온도 */}
      <TagRow label="냉각 온도">
        {COLD_TEMPERATURES.map(t => {
          const disabled = t >= hotTemp;
          return (
            <Chip
              key={t}
              active={coldTemp === t}
              onClick={() => !disabled && onColdTemp(t)}
              activeColor="#4A7ED9"
              disabled={disabled}
            >
              {t}℃
            </Chip>
          );
        })}
      </TagRow>

      {/* 용액양 */}
      <TagRow label="용액양">
        {amountOptions.map(opt => (
          <Chip
            key={opt.multiplier}
            active={multiplier === opt.multiplier}
            onClick={() => onMultiplier(opt.multiplier)}
            activeColor="#F59E0B"
          >
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
      <div style={styles.tagCategory}>{label}</div>
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

// ─── 기타 ─────────────────────────────────

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

      <div style={styles.fieldLabel}>물 양: <b>{waterMass}g</b></div>
      <input type="range" min={50} max={500} step={10} value={waterMass}
        onChange={e => onWaterMass(+e.target.value)} style={styles.slider} />

      <TagRow label="용해 온도">
        {PRESET_TEMPERATURES.map(t => (
          <Chip key={t} active={hotTemp === t} onClick={() => t > coldTemp && onHotTemp(t)} activeColor="#D94A4A" disabled={t <= coldTemp}>
            {t}℃
          </Chip>
        ))}
      </TagRow>
      <TagRow label="냉각 온도">
        {PRESET_TEMPERATURES.map(t => (
          <Chip key={t} active={coldTemp === t} onClick={() => t < hotTemp && onColdTemp(t)} activeColor="#4A7ED9" disabled={t >= hotTemp}>
            {t}℃
          </Chip>
        ))}
      </TagRow>

      {mode === 'advanced' && (
        <>
          <div style={styles.fieldLabel}>초기 포화도: <b style={{ color: '#F59E0B' }}>{saturation}%</b></div>
          <input type="range" min={20} max={100} step={5} value={saturation}
            onChange={e => onSaturation(+e.target.value)} style={styles.slider} />
        </>
      )}

      <div style={styles.fieldLabel}>
        용액 양: <b>{solutionMass != null ? `${solutionMass}g` : `${computedSolutionMass}g (자동)`}</b>
      </div>
      <TagRow label="">
        <Chip active={solutionMass == null} onClick={() => onSolutionMass(null)} activeColor="#4A7ED9">자동(포화)</Chip>
        {[100, 200, 500].map(v => (
          <Chip key={v} active={solutionMass === v} onClick={() => onSolutionMass(v)} activeColor="#4A7ED9">{v}g</Chip>
        ))}
      </TagRow>
    </div>
  );
}

// ─── 스타일 ─────────────────────────────────

const styles = {
  screen: {
    height: '100dvh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 12,
    paddingBottom: 48,
    background: '#F3F4F6',
    maxWidth: 480,
    margin: '0 auto',
    width: '100%',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
  },
  backBtn: {
    width: 32, height: 32,
    background: '#FFFFFF', border: '1px solid #E5E8EC', borderRadius: 8,
    fontSize: 16, cursor: 'pointer',
  },
  title: { margin: 0, fontSize: 18, fontWeight: 800, color: '#1F2937' },
  tabs: {
    display: 'flex', gap: 6,
    background: '#FFFFFF', padding: 4, borderRadius: 10,
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
    padding: 12, background: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  tagRow: {
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  tagCategory: {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  // 가로 스크롤: 한 줄에 나열, 넘치면 좌우 스크롤
  tagListScroll: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    paddingBottom: 2, // 스크롤바 공간
  },
  tagListInner: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    paddingRight: 4,
  },
  tagHint: {
    marginTop: 4, padding: 8,
    background: '#F9FAFB', borderRadius: 6,
    fontSize: 11, color: '#6B7280', lineHeight: 1.5,
  },
  controlPanel: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 12, background: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  panelTitle: { fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 4 },
  fieldLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 500 },
  slider: { width: '100%', marginTop: 2, accentColor: '#4A7ED9' },
  chartSection: {
    padding: 12, background: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#1F2937', marginBottom: 8 },
  divider: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 4, marginBottom: -4,
  },
  dividerLine: { flex: 1, height: 1, background: '#D4D9E0' },
  dividerText: { fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3 },
};

const cardStyles = {
  wrap: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 12, background: '#FFFFFF', borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  header: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 2 },
  title: { fontSize: 13, fontWeight: 800, color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#6B7280', lineHeight: 1.5 },
  colorNote: {
    padding: '6px 10px',
    background: '#F9FAFB',
    borderRadius: 6,
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  equationBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '8px 10px',
    background: '#F9FAFB',
    borderRadius: 8,
    border: '1px solid #F0F2F5',
  },
  eqRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    flexWrap: 'wrap',
  },
  eqLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#6B7280',
  },
  eqVal: {
    padding: '2px 6px',
    background: '#FFFFFF',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    fontWeight: 700,
  },
  eqOp: { color: '#9CA3AF', fontWeight: 700, margin: '0 2px' },
  conservationNote: {
    fontSize: 10,
    color: '#6B7280',
  },
  chip: {
    padding: '2px 8px',
    background: '#E0E7FF',
    color: '#3730A3',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 11,
  },
  controls: { display: 'flex', gap: 8 },
  coolBtn: {
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
    background: 'linear-gradient(135deg, #4A7ED9, #3B5FC2)',
    color: '#FFFFFF',
  },
  tabLabel: { fontSize: 12, fontWeight: 700 },
  tabDesc: { fontSize: 9, marginTop: 2, opacity: 0.85 },
};

const toggleStyles = {
  wrap: {
    display: 'inline-flex', alignItems: 'center',
    padding: 2, background: '#F3F4F6',
    border: '1px solid #E5E8EC', borderRadius: 16,
    cursor: 'pointer', gap: 0,
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
