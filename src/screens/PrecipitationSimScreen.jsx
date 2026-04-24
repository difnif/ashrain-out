// src/screens/PrecipitationSimScreen.jsx
// 석출 시뮬레이션 메인 화면 (재설계 v4)
//
// === 셋팅 모드 UX (신규) ===
//   3단계 카테고리 태그 선택:
//     ① 물질 (KNO₃ / NaCl / CuSO₄ / H₃BO₃ / NH₄Cl)
//     ② 온도 조합 (80→0, 80→20, ..., 20→0)
//     ③ 용액양 (물 100g 기준 포화용액의 배수; 표시는 g 수치)
//
//   모든 3개가 선택되면 2차 시뮬레이션 + 계산식 해설 표시
//
// === 비커 애니메이션 ===
//   1차 (항상 표시): 물 100g 기준으로 "빈 비커 → 물 붓기 → 용질 녹이기 → 포화 → 냉각 → 석출"
//   2차 (3단계 선택 후): 선택한 용액양 기준 동일 흐름 + 계산식 해설
//
// === 참고 자료 ===
//   선택 물질의 온도별 용해도 표 (highlight: 선택된 hot/cold 온도)

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
  TEMP_COMBINATIONS,
  SOLUTION_MULTIPLIERS,
  computeAmountOption,
  formatTempCombo,
  tempComboId,
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

  // === 셋팅 모드 3단계 선택 ===
  const [settingSubstance, setSettingSubstance] = useState('KNO3');
  const [settingTempComboIdx, setSettingTempComboIdx] = useState(5); // 기본: 60→20
  const [settingMultiplier, setSettingMultiplier] = useState(null); // null이면 미선택

  // === 커스텀/심화 모드 상태 ===
  const [customSubstance, setCustomSubstance] = useState('KNO3');
  const [customWaterMass, setCustomWaterMass] = useState(100);
  const [customHotTemp, setCustomHotTemp] = useState(60);
  const [customColdTemp, setCustomColdTemp] = useState(20);
  const [customSolutionMass, setCustomSolutionMass] = useState(null);
  const [advancedSaturation, setAdvancedSaturation] = useState(100);

  // 비커 애니메이션 phase + 온도 상태 (1차/2차 각각)
  const [sim1, setSim1] = useState({ phase: 'empty', temp: 60 });
  const [sim2, setSim2] = useState({ phase: 'empty', temp: 60 });

  function passQuiz() {
    try { localStorage.setItem(QUIZ_PASS_KEY, 'true'); } catch {}
    setQuizPassed(true);
    setMode('custom');
  }

  // === 현재 선택된 온도 조합 ===
  const tempCombo = mode === 'setting'
    ? TEMP_COMBINATIONS[settingTempComboIdx]
    : { hot: customHotTemp, cold: customColdTemp };

  // === 1차 시뮬 컨텍스트 (항상 물 100g 기준) ===
  const ctx1 = useMemo(() => {
    const substanceId = mode === 'setting' ? settingSubstance : customSubstance;
    const hotTemp = tempCombo.hot;
    const coldTemp = tempCombo.cold;
    const hotS = getSolubility(substanceId, hotTemp);
    return {
      substanceId,
      hotTemp,
      coldTemp,
      waterMass: 100,
      solutionMass: +(100 + hotS).toFixed(1),
      soluteMass: hotS,
      mode: 'basic',
    };
  }, [mode, settingSubstance, customSubstance, tempCombo.hot, tempCombo.cold]);

  const result1 = useMemo(() => calculatePrecipitation(ctx1), [ctx1]);

  // === 2차 시뮬 컨텍스트 (선택한 용액양 기준) ===
  const has2ndSim = mode === 'setting' && settingMultiplier != null;

  const ctx2 = useMemo(() => {
    if (!has2ndSim) return null;
    const substanceId = settingSubstance;
    const opt = computeAmountOption(substanceId, tempCombo.hot, settingMultiplier);
    return {
      substanceId,
      hotTemp: tempCombo.hot,
      coldTemp: tempCombo.cold,
      waterMass: opt.waterMass,
      soluteMass: opt.soluteMass,
      solutionMass: opt.solutionMass,
      mode: 'basic',
    };
  }, [has2ndSim, settingSubstance, tempCombo.hot, tempCombo.cold, settingMultiplier]);

  const result2 = useMemo(() => ctx2 ? calculatePrecipitation(ctx2) : null, [ctx2]);

  // === 커스텀/심화 모드 컨텍스트 ===
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

  // ─── 비커 상태 계산 (dissolvedMass, precipitatedMass, maxDissolvedMass) ───

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
        dissolvedMass = 0;
        precipitatedMass = 0;
        break;
      case 'addingSolute':
      case 'saturated':
        dissolvedMass = totalSolute;
        precipitatedMass = 0;
        break;
      case 'cold':
        dissolvedMass = totalSolute - maxPrecipitated;
        precipitatedMass = maxPrecipitated;
        break;
      case 'cooling':
      default:
        dissolvedMass = totalSolute;
        precipitatedMass = 0;
        break;
    }
    return {
      waterMass,
      dissolvedMass: +Math.max(0, dissolvedMass).toFixed(1),
      precipitatedMass: +Math.max(0, precipitatedMass).toFixed(1),
      maxDissolvedMass: totalSolute || 1,
    };
  }

  // ─── 자동 시퀀스: mode/ctx 바뀌면 빈 비커부터 다시 시작 ───
  const seqTimeoutsRef = useRef([]);

  function startSequence(simSetter, hotTemp) {
    // 이전 타이머 모두 취소
    seqTimeoutsRef.current.forEach(id => clearTimeout(id));
    seqTimeoutsRef.current = [];

    simSetter({ phase: 'empty', temp: hotTemp });
    const t1 = setTimeout(() => simSetter({ phase: 'fillingWater', temp: hotTemp }), 400);
    const t2 = setTimeout(() => simSetter({ phase: 'addingSolute', temp: hotTemp }), 1700);
    const t3 = setTimeout(() => simSetter({ phase: 'saturated', temp: hotTemp }), 3000);
    seqTimeoutsRef.current.push(t1, t2, t3);
  }

  // 1차 시뮬 자동 시작
  useEffect(() => {
    startSequence(setSim1, ctx1.hotTemp);
    return () => seqTimeoutsRef.current.forEach(id => clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx1.substanceId, ctx1.hotTemp, ctx1.coldTemp]);

  // 2차 시뮬 자동 시작
  useEffect(() => {
    if (!ctx2) return;
    startSequence(setSim2, ctx2.hotTemp);
    return () => seqTimeoutsRef.current.forEach(id => clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx2?.substanceId, ctx2?.hotTemp, ctx2?.coldTemp, ctx2?.solutionMass]);

  // ─── 냉각 애니메이션 ───
  const coolRafRef = useRef({});

  function startCooling(key, ctx, simSetter) {
    if (!ctx) return;
    const startTemp = ctx.hotTemp;
    const endTemp = ctx.coldTemp;
    const duration = 2200;
    const startTime = performance.now();

    simSetter({ phase: 'cooling', temp: startTemp });

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      const newTemp = startTemp - (startTemp - endTemp) * eased;
      simSetter({ phase: t < 1 ? 'cooling' : 'cold', temp: t < 1 ? newTemp : endTemp });
      if (t < 1) {
        coolRafRef.current[key] = requestAnimationFrame(tick);
      }
    };
    coolRafRef.current[key] = requestAnimationFrame(tick);
  }

  function resetSim(key, ctx, simSetter) {
    if (coolRafRef.current[key]) cancelAnimationFrame(coolRafRef.current[key]);
    startSequence(simSetter, ctx.hotTemp);
  }

  // 퀴즈 모드
  if (mode === 'quiz') {
    return (
      <PrecipitationQuiz
        onComplete={passQuiz}
        onCancel={() => setMode('setting')}
        useFormula={useFormula}
      />
    );
  }

  // ─── 렌더 ────────────────────────────────────

  return (
    <div style={styles.screen}>
      {/* 상단 바 */}
      <div style={styles.topBar}>
        {onBack && <button style={styles.backBtn} onClick={onBack}>←</button>}
        <h1 style={styles.title}>석출 시뮬레이터</h1>
        <div style={{ flex: 1 }} />
        <LabelToggle useFormula={useFormula} onToggle={toggleFormula} />
      </div>

      {/* 모드 탭 */}
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

      {/* === 셋팅 모드 === */}
      {mode === 'setting' && (
        <SettingModeTags
          substance={settingSubstance}
          onSubstance={(s) => { setSettingSubstance(s); setSettingMultiplier(null); }}
          tempComboIdx={settingTempComboIdx}
          onTempCombo={(i) => { setSettingTempComboIdx(i); setSettingMultiplier(null); }}
          multiplier={settingMultiplier}
          onMultiplier={setSettingMultiplier}
          useFormula={useFormula}
        />
      )}

      {/* === 커스텀/심화 모드 컨트롤 === */}
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

      {/* === 1차 비커: 물 100g 기준 === */}
      {mode === 'setting' && (
        <BeakerCard
          title="① 물 100g 기준"
          subtitle={`${getSubstanceLabel(ctx1.substanceId, useFormula)} 포화용액을 ${ctx1.hotTemp}℃에서 만든 뒤 ${ctx1.coldTemp}℃로 냉각`}
          ctx={ctx1}
          sim={sim1}
          beakerState={deriveBeakerState(ctx1, result1, sim1.phase)}
          onCool={() => startCooling('sim1', ctx1, setSim1)}
          onReset={() => resetSim('sim1', ctx1, setSim1)}
          result={result1}
        />
      )}

      {/* === 커스텀/심화 모드 비커 === */}
      {(mode === 'custom' || mode === 'advanced') && ctxCustom && resultCustom && (
        <BeakerCard
          title={mode === 'advanced' ? '심화 시뮬레이션' : '시뮬레이션'}
          subtitle={`${getSubstanceLabel(ctxCustom.substanceId, useFormula)} ${ctxCustom.hotTemp}℃ → ${ctxCustom.coldTemp}℃`}
          ctx={{ ...ctxCustom, waterMass: customWaterMass, soluteMass: getSolubility(customSubstance, customHotTemp) * customWaterMass / 100 }}
          sim={sim1}
          beakerState={deriveBeakerState({ ...ctxCustom, waterMass: customWaterMass, soluteMass: getSolubility(customSubstance, customHotTemp) * customWaterMass / 100 }, resultCustom, sim1.phase)}
          onCool={() => startCooling('sim1', ctxCustom, setSim1)}
          onReset={() => resetSim('sim1', ctxCustom, setSim1)}
          result={resultCustom}
        />
      )}

      {/* === 2차 비커: 선택한 용액양 기준 (셋팅 모드 + 3단계 선택 완료 시) === */}
      {mode === 'setting' && has2ndSim && ctx2 && result2 && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>② 선택한 용액양 기준</span>
            <span style={styles.dividerLine} />
          </div>
          <BeakerCard
            title={`② 포화용액 ${ctx2.solutionMass}g 기준`}
            subtitle={`물 ${ctx2.waterMass}g + ${getSubstanceLabel(ctx2.substanceId, useFormula)} ${ctx2.soluteMass}g`}
            ctx={ctx2}
            sim={sim2}
            beakerState={deriveBeakerState(ctx2, result2, sim2.phase)}
            onCool={() => startCooling('sim2', ctx2, setSim2)}
            onReset={() => resetSim('sim2', ctx2, setSim2)}
            result={result2}
          />

          {/* 계산식 해설 */}
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

      {/* 커스텀/심화 모드 계산식 */}
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

      {/* === 용해도 곡선 === */}
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

      {/* === 참고 표 === */}
      <SolubilityReferenceTable
        substanceId={ctx1.substanceId}
        useFormula={useFormula}
        highlightTemps={[ctx1.hotTemp, ctx1.coldTemp]}
      />
    </div>
  );
}

// ─── BeakerCard ─────────────────────────────

function BeakerCard({ title, subtitle, ctx, sim, beakerState, onCool, onReset, result }) {
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
      <div style={cardStyles.stateRow}>
        <StateCard label="물" value={`${beakerState.waterMass} g`} color="#4A7ED9" />
        <StateCard label="녹은 용질" value={`${beakerState.dissolvedMass} g`} color={sub.displayColor} />
        <StateCard label="석출량" value={`${beakerState.precipitatedMass} g`} color="#F59E0B" />
      </div>
      <div style={cardStyles.controls}>
        <button
          style={{ ...cardStyles.coolBtn, opacity: canCool ? 1 : 0.5 }}
          onClick={onCool}
          disabled={!canCool}
        >
          {coolLabel}
        </button>
        <button style={cardStyles.resetBtn} onClick={onReset}>리셋</button>
      </div>
    </div>
  );
}

// ─── Setting Mode Tags ────────────────────────

function SettingModeTags({ substance, onSubstance, tempComboIdx, onTempCombo, multiplier, onMultiplier, useFormula }) {
  // 현재 선택된 정보
  const combo = TEMP_COMBINATIONS[tempComboIdx];
  const sub = SUBSTANCES[substance];

  // 용액양 옵션 g 값 (현재 물질·온도 기준)
  const amountOptions = SOLUTION_MULTIPLIERS.map(m =>
    computeAmountOption(substance, combo.hot, m)
  );

  return (
    <div style={styles.tagPanel}>
      {/* 물질 선택 */}
      <div style={styles.tagRow}>
        <div style={styles.tagCategory}>물질</div>
        <div style={styles.tagList}>
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
        </div>
      </div>

      {/* 온도 조합 선택 */}
      <div style={styles.tagRow}>
        <div style={styles.tagCategory}>온도</div>
        <div style={styles.tagList}>
          {TEMP_COMBINATIONS.map((c, i) => (
            <Chip
              key={tempComboId(c)}
              active={tempComboIdx === i}
              onClick={() => onTempCombo(i)}
              activeColor="#4A7ED9"
            >
              {c.hot}°→{c.cold}°
            </Chip>
          ))}
        </div>
      </div>

      {/* 용액양 선택 */}
      <div style={styles.tagRow}>
        <div style={styles.tagCategory}>용액양</div>
        <div style={styles.tagList}>
          {amountOptions.map((opt, i) => (
            <Chip
              key={opt.multiplier}
              active={multiplier === opt.multiplier}
              onClick={() => onMultiplier(opt.multiplier)}
              activeColor="#F59E0B"
            >
              {opt.solutionMass}g
            </Chip>
          ))}
        </div>
      </div>

      {/* 안내 */}
      <div style={styles.tagHint}>
        {multiplier == null
          ? '용액양까지 선택하면 해당 양 기준 시뮬레이션과 계산식이 나타납니다.'
          : `선택: ${useFormula ? sub.formula : sub.name} · ${combo.hot}℃→${combo.cold}℃ · ${amountOptions.find(o => o.multiplier === multiplier)?.solutionMass}g`
        }
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, activeColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1.5px solid',
        borderColor: active ? activeColor : '#E5E8EC',
        background: active ? activeColor : '#FFFFFF',
        color: active ? '#FFFFFF' : '#4B5563',
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── 기타 서브 컴포넌트 ──────────────────────

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

      <div style={styles.fieldLabel}>물질</div>
      <div style={styles.tagList}>
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
      </div>

      <div style={styles.fieldLabel}>물 양: <b>{waterMass}g</b></div>
      <input type="range" min={50} max={500} step={10} value={waterMass}
        onChange={e => onWaterMass(+e.target.value)} style={styles.slider} />

      <div style={styles.tempRow}>
        <div style={{ flex: 1 }}>
          <div style={styles.fieldLabel}>고온: <b style={{ color: '#D94A4A' }}>{hotTemp}℃</b></div>
          <div style={styles.tagList}>
            {PRESET_TEMPERATURES.map(t => (
              <Chip key={t} active={hotTemp === t} onClick={() => t > coldTemp && onHotTemp(t)} activeColor="#D94A4A">{t}℃</Chip>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.fieldLabel}>저온: <b style={{ color: '#4A7ED9' }}>{coldTemp}℃</b></div>
          <div style={styles.tagList}>
            {PRESET_TEMPERATURES.map(t => (
              <Chip key={t} active={coldTemp === t} onClick={() => t < hotTemp && onColdTemp(t)} activeColor="#4A7ED9">{t}℃</Chip>
            ))}
          </div>
        </div>
      </div>

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
      <div style={styles.tagList}>
        <Chip active={solutionMass == null} onClick={() => onSolutionMass(null)} activeColor="#4A7ED9">자동(포화)</Chip>
        {[100, 200, 500].map(v => (
          <Chip key={v} active={solutionMass === v} onClick={() => onSolutionMass(v)} activeColor="#4A7ED9">{v}g</Chip>
        ))}
      </div>
    </div>
  );
}

function StateCard({ label, value, color }) {
  return (
    <div style={cardStyles.stateCell}>
      <div style={{ ...cardStyles.stateLabel, color }}>{label}</div>
      <div style={cardStyles.stateValue}>{value}</div>
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
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
  },
  backBtn: {
    width: 32, height: 32,
    background: '#FFFFFF',
    border: '1px solid #E5E8EC',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
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
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  tagCategory: {
    fontSize: 10, fontWeight: 700, color: '#9CA3AF',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  tagList: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
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
  tempRow: { display: 'flex', gap: 10 },
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
  header: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: 800, color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#6B7280' },
  stateRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  stateCell: { padding: '8px 6px', background: '#F9FAFB', borderRadius: 8, textAlign: 'center' },
  stateLabel: { fontSize: 10, fontWeight: 600, marginBottom: 2 },
  stateValue: { fontSize: 13, fontWeight: 700, color: '#1F2937', fontFamily: 'ui-monospace, monospace' },
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
