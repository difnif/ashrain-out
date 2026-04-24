// src/components/precipitation/CalculationSteps.jsx
// 석출량 계산식 단계별 표시
//
// 방법 A (기본):
//   1단계: 물 100g 기준 석출량 = S_hot - S_cold
//   2단계: 실제 석출량 = 1단계 결과 × (주어진 포화용액양 / (100 + S_hot))
//
// 심화 모드: 초기 포화도가 변수로 추가되어 3단계

import { SUBSTANCES } from '../../data/solubilityData';

export default function CalculationSteps({
  mode = 'basic', // 'basic' | 'advanced'
  substanceId,
  hotTemp,
  coldTemp,
  solutionMass,
  saturationPercent = 100,
  result,
}) {
  if (!result) return null;
  const sub = SUBSTANCES[substanceId];

  if (mode === 'advanced') {
    return <AdvancedSteps sub={sub} hotTemp={hotTemp} coldTemp={coldTemp} solutionMass={solutionMass} saturationPercent={saturationPercent} result={result} />;
  }

  return <BasicSteps sub={sub} hotTemp={hotTemp} coldTemp={coldTemp} solutionMass={solutionMass} result={result} />;
}

function BasicSteps({ sub, hotTemp, coldTemp, solutionMass, result }) {
  const { hotS, coldS, referenceSolution, referencePrecipitation, ratio, actualPrecipitation, willPrecipitate } = result;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerBadge}>{sub.formula}</span>
        <span style={styles.headerText}>
          {hotTemp}℃ 포화용액 {solutionMass}g → {coldTemp}℃ 냉각
        </span>
      </div>

      {/* 용해도 조회 */}
      <div style={styles.lookupBox}>
        <div style={styles.lookupRow}>
          <span style={styles.lookupLabel}>{hotTemp}℃ 용해도</span>
          <span style={styles.lookupValue(sub.displayColor)}>{hotS} g / 물 100g</span>
        </div>
        <div style={styles.lookupRow}>
          <span style={styles.lookupLabel}>{coldTemp}℃ 용해도</span>
          <span style={styles.lookupValue(sub.displayColor)}>{coldS} g / 물 100g</span>
        </div>
      </div>

      {!willPrecipitate && (
        <div style={styles.noNote}>
          고온 용해도가 저온 용해도보다 작거나 같아 <b>석출이 일어나지 않습니다</b>.
        </div>
      )}

      {willPrecipitate && (
        <>
          {/* 1단계 */}
          <StepBlock num="1" title="물 100g 기준 석출량">
            <div style={styles.equation}>
              <span>{hotTemp}℃ 용해도</span>
              <span style={styles.op}>−</span>
              <span>{coldTemp}℃ 용해도</span>
              <span style={styles.op}>=</span>
              <span style={styles.numberChip}>{hotS}</span>
              <span style={styles.op}>−</span>
              <span style={styles.numberChip}>{coldS}</span>
              <span style={styles.op}>=</span>
              <span style={styles.resultChip}>{referencePrecipitation} g</span>
            </div>
            <div style={styles.explain}>
              물 100g일 때 녹아있던 {hotS}g 중 {coldTemp}℃에선 {coldS}g만 녹을 수 있으므로,
              <br />그 차이 <b>{referencePrecipitation}g</b>이 석출됩니다.
            </div>
          </StepBlock>

          {/* 2단계 */}
          <StepBlock num="2" title="실제 석출량 (포화용액 양 비례)">
            <div style={styles.subEquation}>
              <span style={styles.subLabel}>포화용액 비율</span>
              <span style={styles.op}>=</span>
              <span style={styles.numberChip}>{solutionMass}</span>
              <span style={styles.op}>÷</span>
              <span style={styles.numberChip}>(100 + {hotS})</span>
              <span style={styles.op}>=</span>
              <span style={styles.numberChip}>{solutionMass}</span>
              <span style={styles.op}>÷</span>
              <span style={styles.numberChip}>{referenceSolution}</span>
              <span style={styles.op}>=</span>
              <span style={styles.miniResult}>{ratio}</span>
            </div>
            <div style={styles.equation}>
              <span>1단계 결과</span>
              <span style={styles.op}>×</span>
              <span>비율</span>
              <span style={styles.op}>=</span>
              <span style={styles.numberChip}>{referencePrecipitation}</span>
              <span style={styles.op}>×</span>
              <span style={styles.numberChip}>{ratio}</span>
              <span style={styles.op}>=</span>
              <span style={styles.resultChip}>{actualPrecipitation} g</span>
            </div>
            <div style={styles.explain}>
              물 100g 기준 포화용액은 {referenceSolution}g이지만, 문제는 {solutionMass}g이므로
              <br />그 비율만큼 스케일한 값이 실제 석출량입니다.
            </div>
          </StepBlock>

          {/* 최종 */}
          <div style={styles.finalBox}>
            <div style={styles.finalLabel}>석출량</div>
            <div style={styles.finalValue}>{actualPrecipitation} g</div>
          </div>
        </>
      )}
    </div>
  );
}

function AdvancedSteps({ sub, hotTemp, coldTemp, solutionMass, saturationPercent, result }) {
  const {
    hotS, coldS, actualSoluteIn100gWater, water, solute, maxSoluteAtColdTemp, precipitation, willPrecipitate,
  } = result;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ ...styles.headerBadge, background: '#F59E0B' }}>심화</span>
        <span style={styles.headerText}>
          {sub.formula} {hotTemp}℃ 용액 {solutionMass}g (포화도 {saturationPercent}%) → {coldTemp}℃ 냉각
        </span>
      </div>

      <div style={styles.lookupBox}>
        <div style={styles.lookupRow}>
          <span style={styles.lookupLabel}>{hotTemp}℃ 용해도</span>
          <span style={styles.lookupValue(sub.displayColor)}>{hotS} g / 물 100g</span>
        </div>
        <div style={styles.lookupRow}>
          <span style={styles.lookupLabel}>{coldTemp}℃ 용해도</span>
          <span style={styles.lookupValue(sub.displayColor)}>{coldS} g / 물 100g</span>
        </div>
      </div>

      <StepBlock num="1" title="현재 녹은 용질 양 (물 100g 기준)">
        <div style={styles.equation}>
          <span>{hotTemp}℃ 용해도</span>
          <span style={styles.op}>×</span>
          <span>포화도</span>
          <span style={styles.op}>=</span>
          <span style={styles.numberChip}>{hotS}</span>
          <span style={styles.op}>×</span>
          <span style={styles.numberChip}>{saturationPercent}%</span>
          <span style={styles.op}>=</span>
          <span style={styles.resultChip}>{actualSoluteIn100gWater} g</span>
        </div>
        <div style={styles.explain}>
          물 100g에 녹아있는 실제 용질은 포화량이 아닌 포화도를 곱한 양입니다.
        </div>
      </StepBlock>

      <StepBlock num="2" title="실제 물 양과 용질 양">
        <div style={styles.subEquation}>
          <span style={styles.subLabel}>물</span>
          <span style={styles.op}>=</span>
          <span style={styles.numberChip}>{solutionMass}</span>
          <span style={styles.op}>×</span>
          <span style={styles.numberChip}>100</span>
          <span style={styles.op}>÷</span>
          <span style={styles.numberChip}>(100 + {actualSoluteIn100gWater})</span>
          <span style={styles.op}>=</span>
          <span style={styles.miniResult}>{water} g</span>
        </div>
        <div style={styles.equation}>
          <span>용질</span>
          <span style={styles.op}>=</span>
          <span style={styles.numberChip}>{solutionMass}</span>
          <span style={styles.op}>−</span>
          <span style={styles.numberChip}>{water}</span>
          <span style={styles.op}>=</span>
          <span style={styles.resultChip}>{solute} g</span>
        </div>
      </StepBlock>

      <StepBlock num="3" title={`${coldTemp}℃에서 녹을 수 있는 최대량`}>
        <div style={styles.equation}>
          <span>{coldTemp}℃ 용해도</span>
          <span style={styles.op}>×</span>
          <span>물 양</span>
          <span style={styles.op}>÷</span>
          <span>100</span>
          <span style={styles.op}>=</span>
          <span style={styles.numberChip}>{coldS}</span>
          <span style={styles.op}>×</span>
          <span style={styles.numberChip}>{water}</span>
          <span style={styles.op}>÷</span>
          <span style={styles.numberChip}>100</span>
          <span style={styles.op}>=</span>
          <span style={styles.resultChip}>{maxSoluteAtColdTemp} g</span>
        </div>
      </StepBlock>

      <StepBlock num="4" title="석출량">
        {willPrecipitate ? (
          <div style={styles.equation}>
            <span>현재 용질</span>
            <span style={styles.op}>−</span>
            <span>최대 용해량</span>
            <span style={styles.op}>=</span>
            <span style={styles.numberChip}>{solute}</span>
            <span style={styles.op}>−</span>
            <span style={styles.numberChip}>{maxSoluteAtColdTemp}</span>
            <span style={styles.op}>=</span>
            <span style={styles.resultChip}>{precipitation} g</span>
          </div>
        ) : (
          <div style={styles.noNote}>
            현재 용질 양({solute}g)이 {coldTemp}℃ 최대 용해량({maxSoluteAtColdTemp}g)보다 작거나 같아
            <br /><b>석출되지 않습니다</b>.
          </div>
        )}
      </StepBlock>

      {willPrecipitate && (
        <div style={styles.finalBox}>
          <div style={styles.finalLabel}>석출량</div>
          <div style={styles.finalValue}>{precipitation} g</div>
        </div>
      )}
    </div>
  );
}

function StepBlock({ num, title, children }) {
  return (
    <div style={styles.stepBlock}>
      <div style={styles.stepHeader}>
        <span style={styles.stepNum}>{num}</span>
        <span style={styles.stepTitle}>{title}</span>
      </div>
      <div style={styles.stepBody}>{children}</div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 14,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottom: '1px solid #F0F2F5',
  },
  headerBadge: {
    padding: '3px 8px',
    background: '#4A7ED9',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 6,
  },
  headerText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: 500,
  },
  lookupBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 10,
    background: '#F9FAFB',
    borderRadius: 8,
    fontSize: 12,
  },
  lookupRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lookupLabel: { color: '#6B7280' },
  lookupValue: color => ({ color, fontWeight: 600 }),
  stepBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#4A7ED9',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1F2937',
  },
  stepBody: {
    paddingLeft: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  equation: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#374151',
  },
  subEquation: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#6B7280',
    paddingBottom: 4,
    borderBottom: '1px dashed #E5E8EC',
  },
  subLabel: {
    fontWeight: 600,
    color: '#4B5563',
  },
  op: { color: '#9CA3AF', fontWeight: 600, margin: '0 2px' },
  numberChip: {
    padding: '2px 6px',
    background: '#F3F4F6',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
  },
  resultChip: {
    padding: '3px 8px',
    background: '#FEF3C7',
    color: '#92400E',
    borderRadius: 6,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 13,
  },
  miniResult: {
    padding: '2px 6px',
    background: '#E0E7FF',
    color: '#3730A3',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 600,
    fontSize: 12,
  },
  explain: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 1.5,
    paddingLeft: 2,
  },
  finalBox: {
    marginTop: 4,
    padding: 14,
    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    borderRadius: 10,
    textAlign: 'center',
  },
  finalLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: 600,
    marginBottom: 4,
  },
  finalValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#78350F',
    fontFamily: 'ui-monospace, monospace',
  },
  noNote: {
    padding: 10,
    background: '#F3F4F6',
    borderRadius: 8,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.5,
  },
};
