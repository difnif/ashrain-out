// src/screens/PrecipitationSimScreen.jsx
// 석출 시뮬레이션 메인 화면
//
// 모드:
//   1. 셋팅 모드 (setting) — 교과서 프리셋
//   2. 커스텀 모드 (custom) — 자유 입력 [퀴즈 통과 필요]
//   3. 심화 모드 (advanced) — 초기 포화도 변수 추가 [퀴즈 통과 필요]
//   4. 퀴즈 (quiz) — 5문제 단계 관문
//
// 잠금 상태는 localStorage로 저장 (추후 Firestore 연동 예정)
//
// ⚠️ 총괄방에서 처리 필요:
//   - App.jsx에서 이 스크린 import 및 라우팅 연결
//   - 퀴즈 통과 플래그를 Firestore로 옮길지 결정 (현재는 localStorage)

import { useState, useEffect, useMemo } from 'react';
import {
  SUBSTANCES,
  SUBSTANCE_LIST,
  PRESET_TEMPERATURES,
  getSolubility,
  calculatePrecipitation,
  calculatePrecipitationAdvanced,
} from '../data/solubilityData';
import {
  PRESET_SCENARIOS,
  SOLUTION_MASS_PRESETS,
  resolvePresetSolutionMass,
} from '../data/precipitationPresets';
import Beaker from '../components/precipitation/Beaker';
import SolubilityChart from '../components/precipitation/SolubilityChart';
import CalculationSteps from '../components/precipitation/CalculationSteps';
import PrecipitationQuiz from '../components/precipitation/PrecipitationQuiz';

const QUIZ_PASS_KEY = 'ashrain:precipitation:quizPassed';

export default function PrecipitationSimScreen({ onBack }) {
  // 퀴즈 통과 여부
  const [quizPassed, setQuizPassed] = useState(() => {
    try {
      return localStorage.getItem(QUIZ_PASS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 현재 모드: 'setting' | 'custom' | 'advanced' | 'quiz'
  const [mode, setMode] = useState('setting');

  // 셋팅 모드 상태
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_SCENARIOS[0].id);
  const [presetSubstanceOverride, setPresetSubstanceOverride] = useState(null); // compareMode용

  // 커스텀 모드 상태
  const [customSubstance, setCustomSubstance] = useState('KNO3');
  const [customWaterMass, setCustomWaterMass] = useState(100);
  const [customHotTemp, setCustomHotTemp] = useState(60);
  const [customColdTemp, setCustomColdTemp] = useState(20);
  const [customSolutionMass, setCustomSolutionMass] = useState(null); // null이면 자동(포화용액)

  // 심화 모드 추가 변수
  const [advancedSaturation, setAdvancedSaturation] = useState(100); // %

  // 시뮬레이션 진행 상태: 'initial'(고온, 포화) | 'cooling'(냉각 중) | 'done'(냉각 완료)
  const [simPhase, setSimPhase] = useState('initial');
  const [simTemperature, setSimTemperature] = useState(60);

  function passQuiz() {
    try {
      localStorage.setItem(QUIZ_PASS_KEY, 'true');
    } catch {}
    setQuizPassed(true);
    setMode('custom');
  }

  // 현재 모드의 계산 컨텍스트 도출
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
    // quiz 모드 등 — placeholder (실제로 안 씀)
    return {
      substanceId: 'KNO3',
      hotTemp: 60,
      coldTemp: 20,
      solutionMass: 210,
      mode: 'basic',
    };
  }, [mode, selectedPresetId, presetSubstanceOverride, customSubstance, customWaterMass, customHotTemp, customColdTemp, customSolutionMass, advancedSaturation]);

  // 계산 결과
  const result = useMemo(() => {
    if (ctx.mode === 'advanced') {
      return calculatePrecipitationAdvanced(ctx);
    }
    return calculatePrecipitation(ctx);
  }, [ctx]);

  // 비커에 보여줄 값
  const beakerState = useMemo(() => {
    const hotS = result.hotS;

    // 실제 물/용질 양 (시각화용)
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
        // cooling 중간: 온도에 따라 보간
        const progress = (ctx.hotTemp - simTemperature) / (ctx.hotTemp - ctx.coldTemp);
        dissolvedMass = Math.max(result.maxSoluteAtColdTemp, result.solute - result.precipitation * progress);
        precipitatedMass = result.precipitation * progress;
      }
    } else {
      // basic — 포화 용액이라 가정
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

  // 시뮬레이션 리셋 (ctx 바뀌면)
  useEffect(() => {
    setSimPhase('initial');
    setSimTemperature(ctx.hotTemp);
  }, [ctx.substanceId, ctx.hotTemp, ctx.coldTemp, ctx.solutionMass, ctx.mode]);

  // 냉각 애니메이션
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

  // 퀴즈 모드일 때 별도 렌더링 (Hooks 호출 이후로 이동)
  if (mode === 'quiz') {
    return (
      <PrecipitationQuiz
        onComplete={passQuiz}
        onCancel={() => setMode('setting')}
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

      {/* 퀴즈 안내 (미통과 시) */}
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

      {/* 컨트롤 패널 */}
      {mode === 'setting' && (
        <SettingModeControls
          selectedId={selectedPresetId}
          onSelect={setSelectedPresetId}
          presetSubstanceOverride={presetSubstanceOverride}
          onOverrideSubstance={setPresetSubstanceOverride}
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
        />
      )}

      {/* 비커 시뮬레이션 */}
      <div style={styles.beakerSection}>
        <Beaker
          substanceId={ctx.substanceId}
          waterMass={beakerState.waterMass}
          dissolvedMass={beakerState.dissolvedMass}
          precipitatedMass={beakerState.precipitatedMass}
          temperature={simTemperature}
          phase={simPhase}
        />
        {/* 상태 표시 */}
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

      {/* 용해도 곡선 */}
      <div style={styles.chartSection}>
        <div style={styles.sectionTitle}>용해도 곡선</div>
        <SolubilityChart
          highlightSubstanceId={ctx.substanceId}
          hotTemp={ctx.hotTemp}
          coldTemp={ctx.coldTemp}
          hotSolubility={result.hotS}
          coldSolubility={result.coldS}
        />
      </div>

      {/* 계산식 */}
      <CalculationSteps
        mode={ctx.mode}
        substanceId={ctx.substanceId}
        hotTemp={ctx.hotTemp}
        coldTemp={ctx.coldTemp}
        solutionMass={ctx.solutionMass}
        saturationPercent={ctx.saturationPercent}
        result={result}
      />
    </div>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────

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

function SettingModeControls({ selectedId, onSelect, presetSubstanceOverride, onOverrideSubstance }) {
  const selected = PRESET_SCENARIOS.find(p => p.id === selectedId);

  return (
    <div style={styles.controlPanel}>
      <div style={styles.panelTitle}>시나리오 선택</div>
      <div style={styles.presetGrid}>
        {PRESET_SCENARIOS.map(p => (
          <button
            key={p.id}
            style={{
              ...styles.presetBtn,
              ...(p.id === selectedId ? styles.presetBtnActive : {}),
            }}
            onClick={() => { onSelect(p.id); onOverrideSubstance(null); }}
          >
            <div style={styles.presetTitle}>{p.title}</div>
            <div style={styles.presetDifficulty}>
              {'●'.repeat(p.difficulty)}
              <span style={{ opacity: 0.2 }}>{'●'.repeat(3 - p.difficulty)}</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div style={styles.presetDesc}>{selected.description}</div>
      )}
      {/* 비교 모드: 물질 바꿔가며 확인 */}
      {selected?.compareMode && (
        <div style={{ marginTop: 10 }}>
          <div style={styles.fieldLabel}>물질 바꿔보기</div>
          <div style={styles.substanceRow}>
            {SUBSTANCE_LIST.map(s => (
              <button
                key={s.id}
                style={{
                  ...styles.substanceChip,
                  borderColor: (presetSubstanceOverride || selected.substanceId) === s.id ? s.displayColor : '#E5E8EC',
                  background: (presetSubstanceOverride || selected.substanceId) === s.id ? s.displayColorLight : '#FFFFFF',
                }}
                onClick={() => onOverrideSubstance(s.id)}
              >
                {s.formula}
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
}) {
  return (
    <div style={styles.controlPanel}>
      <div style={styles.panelTitle}>
        {mode === 'advanced' ? '심화 모드' : '커스텀 모드'}
      </div>

      {/* 물질 선택 */}
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
            {s.formula}
          </button>
        ))}
      </div>

      {/* 물 양 */}
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

      {/* 고온 / 저온 */}
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

      {/* 심화: 포화도 */}
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

      {/* 포화용액 양: 자동 or 수동 */}
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
  screen: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 12,
    background: '#F3F4F6',
    maxWidth: 480,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 20,
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
