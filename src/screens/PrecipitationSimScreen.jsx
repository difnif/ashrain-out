// src/screens/PrecipitationSimScreen.jsx
// 석출 시뮬레이션 메인 화면
//
// 스크롤 전략:
//   App.jsx 루트가 overflow: hidden인 구조이므로, 이 스크린이 독립 스크롤 영역이 되어야 함.
//   height: 100dvh + overflow-y: auto로 자체 뷰포트 높이 + 자체 스크롤 처리.
//   (ScreenWrap을 쓰지 않는 대신 ScreenWrap 역할을 직접 수행)
//
// 모드:
//   1. 셋팅 모드 (setting) — 교과서 프리셋
//   2. 커스텀 모드 (custom) — 자유 입력 [퀴즈 통과 필요]
//   3. 심화 모드 (advanced) — 초기 포화도 변수 추가 [퀴즈 통과 필요]
//   4. 퀴즈 (quiz) — 5문제 단계 관문
//
// 표시 언어:
//   - 기본: 한글 이름 (질산칼륨, 염화나트륨 등)
//   - 토글: 화학식 (KNO₃, NaCl 등)
//   - localStorage로 선호 저장
//
// 잠금 상태는 localStorage로 저장 (추후 Firestore 연동 예정)

import { useState, useEffect, useMemo } from 'react';
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
  PRESET_SCENARIOS,
  resolvePresetSolutionMass,
} from '../data/precipitationPresets';
import Beaker from '../components/precipitation/Beaker';
import SolubilityChart from '../components/precipitation/SolubilityChart';
import CalculationSteps from '../components/precipitation/CalculationSteps';
import PrecipitationQuiz from '../components/precipitation/PrecipitationQuiz';

const QUIZ_PASS_KEY = 'ashrain:precipitation:quizPassed';
const FORMULA_KEY = 'ashrain:precipitation:useFormula';

export default function PrecipitationSimScreen({ onBack }) {
  const [quizPassed, setQuizPassed] = useState(() => {
    try {
      return localStorage.getItem(QUIZ_PASS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 한글 이름/화학식 토글 (localStorage 연동)
  const [useFormula, setUseFormula] = useState(() => {
    try {
      return localStorage.getItem(FORMULA_KEY) === 'true';
    } catch {
      return false;
    }
  });

  function toggleFormula() {
    const next = !useFormula;
    setUseFormula(next);
    try {
      localStorage.setItem(FORMULA_KEY, next ? 'true' : 'false');
    } catch {}
  }

  const [mode, setMode] = useState('setting');

  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_SCENARIOS[0].id);
  const [presetSubstanceOverride, setPresetSubstanceOverride] = useState(null);

  const [customSubstance, setCustomSubstance] = useState('KNO3');
  const [customWaterMass, setCustomWaterMass] = useState(100);
  const [customHotTemp, setCustomHotTemp] = useState(60);
  const [customColdTemp, setCustomColdTemp] = useState(20);
  const [customSolutionMass, setCustomSolutionMass] = useState(null);

  const [advancedSaturation, setAdvancedSaturation] = useState(100);

  const [simPhase, setSimPhase] = useState('initial');
  const [simTemperature, setSimTemperature] = useState(60);

  function passQuiz() {
    try {
      localStorage.setItem(QUIZ_PASS_KEY, 'true');
    } catch {}
    setQuizPassed(true);
    setMode('custom');
  }

  const ctx = useMemo(() => {
    if (mode === 'setting') {
      const preset = PRESET_SCENARIOS.find(p => p.id === selectedPresetId) || PRESET_SCENARIOS[0];
      const substanceId = preset.compareMode && presetSubstanceOverride ? presetSubstanceOverride : preset.substanceId;
      const solutionMass = resolvePresetSolutionMass({ ...preset, substanceId });
      return {
        substanceId,
        hotTemp: preset.hotTemp,
        coldTemp: preset.coldTemp,
        solutionMass,
        mode: 'basic',
      };
    }
    if (mode === 'custom') {
      const hotS = getSolubility(customSubstance, customHotTemp);
      const autoSolutionMass = +(customWaterMass * (100 + hotS) / 100).toFixed(2);
      return {
        substanceId: customSubstance,
        hotTemp: customHotTemp,
        coldTemp: customColdTemp,
        solutionMass: customSolutionMass != null ? customSolutionMass : autoSolutionMass,
        mode: 'basic',
      };
    }
    if (mode === 'advanced') {
      const hotS = getSolubility(customSubstance, customHotTemp);
      const actualSoluteIn100gWater = hotS * (advancedSaturation / 100);
      const autoSolutionMass = +(customWaterMass * (100 + actualSoluteIn100gWater) / 100).toFixed(2);
      return {
        substanceId: customSubstance,
        hotTemp: customHotTemp,
        coldTemp: customColdTemp,
        solutionMass: customSolutionMass != null ? customSolutionMass : autoSolutionMass,
        saturationPercent: advancedSaturation,
        mode: 'advanced',
      };
    }
    return {
      substanceId: 'KNO3',
      hotTemp: 60,
      coldTemp: 20,
      solutionMass: 210,
      mode: 'basic',
    };
  }, [mode, selectedPresetId, presetSubstanceOverride, customSubstance, customWaterMass, customHotTemp, customColdTemp, customSolutionMass, advancedSaturation]);

  const result = useMemo(() => {
    if (ctx.mode === 'advanced') {
      return calculatePrecipitationAdvanced(ctx);
    }
    return calculatePrecipitation(ctx);
  }, [ctx]);

  const beakerState = useMemo(() => {
    const hotS = result.hotS;
    let waterMass, dissolvedMass, precipitatedMass;

    if (ctx.mode === 'advanced') {
      waterMass = result.water;
      if (simPhase === 'initial') {
        dissolvedMass = result.solute;
        precipitatedMass = 0;
      } else if (simPhase === 'done') {
        dissolvedMass = result.maxSoluteAtColdTemp;
        precipitatedMass = result.precipitation;
      } else {
        const progress = (ctx.hotTemp - simTemperature) / (ctx.hotTemp - ctx.coldTemp);
        dissolvedMass = Math.max(result.maxSoluteAtColdTemp, result.solute - result.precipitation * progress);
        precipitatedMass = result.precipitation * progress;
      }
    } else {
      waterMass = ctx.solutionMass * 100 / (100 + hotS);
      const totalSolute = ctx.solutionMass - waterMass;
      if (simPhase === 'initial') {
        dissolvedMass = totalSolute;
        precipitatedMass = 0;
      } else if (simPhase === 'done') {
        dissolvedMass = totalSolute - result.actualPrecipitation;
        precipitatedMass = result.actualPrecipitation;
      } else {
        const progress = (ctx.hotTemp - simTemperature) / (ctx.hotTemp - ctx.coldTemp);
        const currentPrecipitation = result.actualPrecipitation * progress;
        dissolvedMass = totalSolute - currentPrecipitation;
        precipitatedMass = currentPrecipitation;
      }
    }

    return {
      waterMass: +waterMass.toFixed(1),
      dissolvedMass: +Math.max(0, dissolvedMass).toFixed(1),
      precipitatedMass: +Math.max(0, precipitatedMass).toFixed(1),
    };
  }, [ctx, result, simPhase, simTemperature]);

  useEffect(() => {
    setSimPhase('initial');
    setSimTemperature(ctx.hotTemp);
  }, [ctx.substanceId, ctx.hotTemp, ctx.coldTemp, ctx.solutionMass, ctx.mode]);

  useEffect(() => {
    if (simPhase !== 'cooling') return;
    const startTemp = simTemperature;
    const endTemp = ctx.coldTemp;
    const duration = 2500;
    const startTime = performance.now();

    let raf;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      const newTemp = startTemp - (startTemp - endTemp) * eased;
      setSimTemperature(newTemp);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setSimPhase('done');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simPhase]);

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

  function startCooling() {
    if (simPhase === 'done') {
      setSimPhase('initial');
      setSimTemperature(ctx.hotTemp);
      setTimeout(() => setSimPhase('cooling'), 50);
    } else {
      setSimPhase('cooling');
    }
  }
  function resetSim() {
    setSimPhase('initial');
    setSimTemperature(ctx.hotTemp);
  }

  return (
    <div style={styles.screen}>
      {/* 상단 바 */}
      <div style={styles.topBar}>
        {onBack && (
          <button style={styles.backBtn} onClick={onBack}>←</button>
        )}
        <h1 style={styles.title}>석출 시뮬레이터</h1>
        <div style={{ flex: 1 }} />
        {/* 한글/화학식 토글 */}
        <LabelToggle useFormula={useFormula} onToggle={toggleFormula} />
      </div>

      {/* 모드 탭 */}
      <div style={styles.tabs}>
        <ModeTab
          active={mode === 'setting'}
          onClick={() => setMode('setting')}
          label="셋팅"
          desc="교과서 예시"
          locked={false}
        />
        <ModeTab
          active={mode === 'custom'}
          onClick={() => quizPassed ? setMode('custom') : setMode('quiz')}
          label="커스텀"
          desc="자유 조작"
          locked={!quizPassed}
        />
        <ModeTab
          active={mode === 'advanced'}
          onClick={() => quizPassed ? setMode('advanced') : setMode('quiz')}
          label="심화"
          desc="포화도 변수"
          locked={!quizPassed}
        />
      </div>

      {!quizPassed && (
        <div style={styles.quizBanner}>
          <div>
            <div style={styles.quizBannerTitle}>🔒 커스텀 / 심화 모드 해금하기</div>
            <div style={styles.quizBannerDesc}>퀴즈 5문제를 모두 맞히면 해금됩니다.</div>
          </div>
          <button style={styles.quizBannerBtn} onClick={() => setMode('quiz')}>
            퀴즈 풀기
          </button>
        </div>
      )}

      {mode === 'setting' && (
        <SettingModeControls
          selectedId={selectedPresetId}
          onSelect={setSelectedPresetId}
          presetSubstanceOverride={presetSubstanceOverride}
          onOverrideSubstance={setPresetSubstanceOverride}
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
          computedSolutionMass={ctx.solutionMass}
          useFormula={useFormula}
        />
      )}

      <div style={styles.beakerSection}>
        <Beaker
          substanceId={ctx.substanceId}
          waterMass={beakerState.waterMass}
          dissolvedMass={beakerState.dissolvedMass}
          precipitatedMass={beakerState.precipitatedMass}
          temperature={simTemperature}
          phase={simPhase}
        />
        <div style={styles.stateRow}>
          <StateCard label="물" value={`${beakerState.waterMass} g`} color="#4A7ED9" />
          <StateCard label="녹은 용질" value={`${beakerState.dissolvedMass} g`} color={SUBSTANCES[ctx.substanceId].displayColor} />
          <StateCard label="석출량" value={`${beakerState.precipitatedMass} g`} color="#F59E0B" />
        </div>

        <div style={styles.simControls}>
          <button
            style={styles.coolBtn}
            onClick={startCooling}
            disabled={simPhase === 'cooling'}
          >
            {simPhase === 'cooling' ? '냉각 중...' : simPhase === 'done' ? '다시 냉각' : `${ctx.coldTemp}℃로 냉각`}
          </button>
          <button style={styles.resetBtn} onClick={resetSim}>
            리셋
          </button>
        </div>
      </div>

      <div style={styles.chartSection}>
        <div style={styles.sectionTitle}>용해도 곡선</div>
        <SolubilityChart
          highlightSubstanceId={ctx.substanceId}
          hotTemp={ctx.hotTemp}
          coldTemp={ctx.coldTemp}
          hotSolubility={result.hotS}
          coldSolubility={result.coldS}
          useFormula={useFormula}
        />
      </div>

      <CalculationSteps
        mode={ctx.mode}
        substanceId={ctx.substanceId}
        hotTemp={ctx.hotTemp}
        coldTemp={ctx.coldTemp}
        solutionMass={ctx.solutionMass}
        saturationPercent={ctx.saturationPercent}
        result={result}
        useFormula={useFormula}
      />
    </div>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────

function LabelToggle({ useFormula, onToggle }) {
  return (
    <button style={toggleStyles.wrap} onClick={onToggle} aria-label="표시 전환">
      <span style={{ ...toggleStyles.side, ...(useFormula ? {} : toggleStyles.sideActive) }}>
        한글
      </span>
      <span style={{ ...toggleStyles.side, ...(useFormula ? toggleStyles.sideActive : {}) }}>
        화학식
      </span>
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
      <div style={tabStyles.tabLabel}>
        {locked && '🔒 '}{label}
      </div>
      <div style={tabStyles.tabDesc}>{desc}</div>
    </button>
  );
}

function SettingModeControls({ selectedId, onSelect, presetSubstanceOverride, onOverrideSubstance, useFormula }) {
  const selected = PRESET_SCENARIOS.find(p => p.id === selectedId);
  const effectiveSubstanceId = selected?.compareMode && presetSubstanceOverride ? presetSubstanceOverride : selected?.substanceId;

  return (
    <div style={styles.controlPanel}>
      <div style={styles.panelTitle}>시나리오 선택</div>
      <div style={styles.presetGrid}>
        {PRESET_SCENARIOS.map(p => {
          const label = getSubstanceLabel(p.substanceId, useFormula);
          return (
            <button
              key={p.id}
              style={{
                ...styles.presetBtn,
                ...(p.id === selectedId ? styles.presetBtnActive : {}),
              }}
              onClick={() => { onSelect(p.id); onOverrideSubstance(null); }}
            >
              <div style={styles.presetTitle}>{p.title(label)}</div>
              <div style={styles.presetDifficulty}>
                {'●'.repeat(p.difficulty)}
                <span style={{ opacity: 0.2 }}>{'●'.repeat(3 - p.difficulty)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={styles.presetDesc}>{selected.description}</div>
      )}
      {selected?.compareMode && (
        <div style={{ marginTop: 10 }}>
          <div style={styles.fieldLabel}>물질 바꿔보기</div>
          <div style={styles.substanceRow}>
            {SUBSTANCE_LIST.map(s => (
              <button
                key={s.id}
                style={{
                  ...styles.substanceChip,
                  borderColor: effectiveSubstanceId === s.id ? s.displayColor : '#E5E8EC',
                  background: effectiveSubstanceId === s.id ? s.displayColorLight : '#FFFFFF',
                }}
                onClick={() => onOverrideSubstance(s.id)}
              >
                {useFormula ? s.formula : s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
      <div style={styles.panelTitle}>
        {mode === 'advanced' ? '심화 모드' : '커스텀 모드'}
      </div>

      <div style={styles.fieldLabel}>물질</div>
      <div style={styles.substanceRow}>
        {SUBSTANCE_LIST.map(s => (
          <button
            key={s.id}
            style={{
              ...styles.substanceChip,
              borderColor: substance === s.id ? s.displayColor : '#E5E8EC',
              background: substance === s.id ? s.displayColorLight : '#FFFFFF',
            }}
            onClick={() => onSubstance(s.id)}
          >
            {useFormula ? s.formula : s.name}
          </button>
        ))}
      </div>

      <div style={styles.fieldLabel}>물 양: <b>{waterMass}g</b></div>
      <input
        type="range"
        min={50}
        max={500}
        step={10}
        value={waterMass}
        onChange={e => onWaterMass(+e.target.value)}
        style={styles.slider}
      />

      <div style={styles.tempRow}>
        <div style={{ flex: 1 }}>
          <div style={styles.fieldLabel}>고온(초기): <b style={{ color: '#D94A4A' }}>{hotTemp}℃</b></div>
          <div style={styles.tempChips}>
            {PRESET_TEMPERATURES.map(t => (
              <button
                key={t}
                style={{
                  ...styles.tempChip,
                  ...(hotTemp === t ? styles.tempChipActive('hot') : {}),
                }}
                onClick={() => onHotTemp(t)}
                disabled={t <= coldTemp}
              >
                {t}℃
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.fieldLabel}>저온(냉각): <b style={{ color: '#4A7ED9' }}>{coldTemp}℃</b></div>
          <div style={styles.tempChips}>
            {PRESET_TEMPERATURES.map(t => (
              <button
                key={t}
                style={{
                  ...styles.tempChip,
                  ...(coldTemp === t ? styles.tempChipActive('cold') : {}),
                }}
                onClick={() => onColdTemp(t)}
                disabled={t >= hotTemp}
              >
                {t}℃
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'advanced' && (
        <>
          <div style={styles.fieldLabel}>초기 포화도: <b style={{ color: '#F59E0B' }}>{saturation}%</b></div>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={saturation}
            onChange={e => onSaturation(+e.target.value)}
            style={styles.slider}
          />
        </>
      )}

      <div style={styles.fieldLabel}>
        용액 양:{' '}
        <b>{solutionMass != null ? `${solutionMass}g` : `${computedSolutionMass}g (자동)`}</b>
      </div>
      <div style={styles.solutionMassRow}>
        <button
          style={{
            ...styles.solMassBtn,
            ...(solutionMass == null ? styles.solMassBtnActive : {}),
          }}
          onClick={() => onSolutionMass(null)}
        >
          자동(포화)
        </button>
        {[100, 200, 500].map(v => (
          <button
            key={v}
            style={{
              ...styles.solMassBtn,
              ...(solutionMass === v ? styles.solMassBtnActive : {}),
            }}
            onClick={() => onSolutionMass(v)}
          >
            {v}g
          </button>
        ))}
      </div>
    </div>
  );
}

function StateCard({ label, value, color }) {
  return (
    <div style={styles.stateCard}>
      <div style={{ ...styles.stateCardLabel, color }}>{label}</div>
      <div style={styles.stateCardValue}>{value}</div>
    </div>
  );
}

// ─── 스타일 ─────────────────────────────────────

const styles = {
  // 핵심: App.jsx 루트가 overflow:hidden이어도 동작하도록 독립 스크롤 영역
  screen: {
    height: '100dvh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    boxSizing: 'border-box',
    // 내부 레이아웃
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
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#1F2937',
  },
  tabs: {
    display: 'flex',
    gap: 6,
    background: '#FFFFFF',
    padding: 4,
    borderRadius: 10,
    border: '1px solid #E5E8EC',
  },
  quizBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
    borderRadius: 10,
    border: '1px solid #C7D2FE',
  },
  quizBannerTitle: {
    fontSize: 13, fontWeight: 700, color: '#3730A3',
  },
  quizBannerDesc: {
    fontSize: 11, color: '#4338CA', marginTop: 2,
  },
  quizBannerBtn: {
    padding: '8px 14px',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  controlPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: 500,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 6,
  },
  presetBtn: {
    padding: '8px 10px',
    background: '#FFFFFF',
    border: '2px solid #E5E8EC',
    borderRadius: 8,
    fontSize: 11,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  presetBtnActive: {
    borderColor: '#4A7ED9',
    background: '#EEF2FF',
  },
  presetTitle: {
    fontWeight: 600,
    color: '#1F2937',
    lineHeight: 1.35,
  },
  presetDifficulty: {
    fontSize: 9,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  presetDesc: {
    padding: 8,
    background: '#F9FAFB',
    borderRadius: 6,
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 1.5,
    marginTop: 4,
  },
  substanceRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  substanceChip: {
    padding: '6px 10px',
    border: '2px solid',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#1F2937',
  },
  slider: {
    width: '100%',
    marginTop: 2,
    accentColor: '#4A7ED9',
  },
  tempRow: {
    display: 'flex',
    gap: 10,
  },
  tempChips: {
    display: 'flex',
    gap: 3,
    flexWrap: 'wrap',
  },
  tempChip: {
    padding: '4px 8px',
    background: '#FFFFFF',
    border: '1.5px solid #E5E8EC',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    cursor: 'pointer',
  },
  tempChipActive: which => ({
    borderColor: which === 'hot' ? '#D94A4A' : '#4A7ED9',
    color: which === 'hot' ? '#D94A4A' : '#4A7ED9',
    background: which === 'hot' ? '#FEF2F2' : '#EFF6FF',
  }),
  solutionMassRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  solMassBtn: {
    padding: '6px 10px',
    background: '#FFFFFF',
    border: '1.5px solid #E5E8EC',
    borderRadius: 6,
    fontSize: 11,
    color: '#6B7280',
    cursor: 'pointer',
    fontWeight: 600,
  },
  solMassBtnActive: {
    borderColor: '#4A7ED9',
    color: '#4A7ED9',
    background: '#EFF6FF',
  },
  beakerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  stateRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
  },
  stateCard: {
    padding: '8px 6px',
    background: '#F9FAFB',
    borderRadius: 8,
    textAlign: 'center',
  },
  stateCardLabel: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 2,
  },
  stateCardValue: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1F2937',
    fontFamily: 'ui-monospace, monospace',
  },
  simControls: {
    display: 'flex',
    gap: 8,
  },
  coolBtn: {
    flex: 1,
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #4A7ED9, #3B5FC2)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(74, 126, 217, 0.25)',
  },
  resetBtn: {
    padding: '10px 14px',
    background: '#FFFFFF',
    color: '#6B7280',
    border: '1.5px solid #D4D9E0',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  chartSection: {
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 8,
  },
};

const tabStyles = {
  tab: {
    flex: 1,
    padding: '8px 6px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #4A7ED9, #3B5FC2)',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  tabDesc: {
    fontSize: 9,
    marginTop: 2,
    opacity: 0.85,
  },
};

const toggleStyles = {
  wrap: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: 2,
    background: '#F3F4F6',
    border: '1px solid #E5E8EC',
    borderRadius: 16,
    cursor: 'pointer',
    gap: 0,
  },
  side: {
    padding: '4px 9px',
    fontSize: 11,
    fontWeight: 700,
    color: '#9CA3AF',
    borderRadius: 14,
    transition: 'all 0.15s',
  },
  sideActive: {
    background: '#FFFFFF',
    color: '#1F2937',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
};
