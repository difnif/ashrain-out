// src/components/precipitation/CalculationSteps.jsx
// 석출량 계산 2가지 방법 + 분수 표기
//
// 계산법 1 (단축형 — 분수 × 차이):
//   물 100 + 용해온도 용질 S_hot = 기준 용액량 R
//   석출량 = (S_hot − S_cold) × (주어진 용액량 ÷ R)
//
// 계산법 2 (비율 상수 a 먼저):
//   a = 주어진 용액량 ÷ 기준 용액량
//   석출량 = a × S_hot − a × S_cold
//
// 심화 모드: 초기 포화도 변수 추가 (기존 유지)

import { SUBSTANCES } from '../../data/solubilityData';

export default function CalculationSteps({
  mode = 'basic',
  substanceId,
  hotTemp,
  coldTemp,
  solutionMass,
  saturationPercent = 100,
  result,
  useFormula = false,
}) {
  if (!result) return null;
  const sub = SUBSTANCES[substanceId];

  if (mode === 'advanced') {
    return <AdvancedSteps sub={sub} hotTemp={hotTemp} coldTemp={coldTemp} solutionMass={solutionMass} saturationPercent={saturationPercent} result={result} useFormula={useFormula} />;
  }

  return <BasicSteps sub={sub} hotTemp={hotTemp} coldTemp={coldTemp} solutionMass={solutionMass} result={result} useFormula={useFormula} />;
}

function BasicSteps({ sub, hotTemp, coldTemp, solutionMass, result, useFormula }) {
  const { hotS, coldS, referenceSolution, referencePrecipitation, actualPrecipitation, willPrecipitate } = result;
  const label = useFormula ? sub.formula : sub.name;

  // 계산법 2용 비율 상수 a
  const a = +(solutionMass / referenceSolution).toFixed(4);
  const aTimesHot = +(a * hotS).toFixed(2);
  const aTimesCold = +(a * coldS).toFixed(2);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerBadge}>{label}</span>
        <span style={styles.headerText}>
          {hotTemp}℃ 포화용액 {solutionMass}g → {coldTemp}℃ 냉각
        </span>
      </div>

      {/* 기준 용액량 공통 */}
      <div style={styles.commonBox}>
        <div style={styles.commonLabel}>기준 용액량 (물 100g + 용해 온도 용질)</div>
        <div style={styles.equation}>
          <span style={styles.eqToken}>100</span>
          <span style={styles.op}>+</span>
          <span style={styles.eqToken}>{hotS}</span>
          <span style={styles.op}>=</span>
          <span style={styles.eqResult}>{referenceSolution} g</span>
        </div>
      </div>

      {!willPrecipitate ? (
        <div style={styles.noNote}>
          고온 용해도가 저온 용해도보다 작거나 같아 <b>석출이 일어나지 않습니다</b>.
        </div>
      ) : (
        <>
          {/* 계산법 1 */}
          <div style={styles.methodBox}>
            <div style={styles.methodTitle}>
              <span style={styles.methodBadge}>계산법 1</span>
              <span>물 100g 기준 석출량 × 비율</span>
            </div>
            <div style={styles.methodBody}>
              <div style={styles.explain}>
                물 100g 기준 석출량에 <b>주어진 용액량/기준 용액량</b> 비율을 곱합니다.
              </div>
              <div style={styles.equation}>
                <span style={styles.eqParen}>(</span>
                <span style={styles.eqToken}>{hotS}</span>
                <span style={styles.op}>−</span>
                <span style={styles.eqToken}>{coldS}</span>
                <span style={styles.eqParen}>)</span>
                <span style={styles.op}>×</span>
                <Fraction top={solutionMass} bottom={referenceSolution} />
              </div>
              <div style={styles.equation}>
                <span style={styles.op}>=</span>
                <span style={styles.eqToken}>{referencePrecipitation}</span>
                <span style={styles.op}>×</span>
                <Fraction top={solutionMass} bottom={referenceSolution} />
                <span style={styles.op}>=</span>
                <span style={styles.finalChip}>{actualPrecipitation} g</span>
              </div>
            </div>
          </div>

          {/* 계산법 2 */}
          <div style={styles.methodBox}>
            <div style={styles.methodTitle}>
              <span style={styles.methodBadge}>계산법 2</span>
              <span>비율 a를 먼저 구하기</span>
            </div>
            <div style={styles.methodBody}>
              <div style={styles.explain}>
                먼저 용액량 비율 a를 구한 뒤, 용해/냉각 온도 용질량에 각각 곱해서 차이를 구합니다.
              </div>
              {/* a 구하기 */}
              <div style={styles.equation}>
                <span style={styles.subLabel}>a =</span>
                <span style={styles.eqToken}>{solutionMass}</span>
                <span style={styles.op}>÷</span>
                <span style={styles.eqToken}>{referenceSolution}</span>
                <span style={styles.op}>=</span>
                <span style={styles.aChip}>{a}</span>
              </div>
              {/* 석출량 = a × hot - a × cold */}
              <div style={styles.equation}>
                <span style={styles.subLabel}>석출량 =</span>
                <span style={styles.aChip}>a</span>
                <span style={styles.op}>×</span>
                <span style={styles.eqToken}>{hotS}</span>
                <span style={styles.op}>−</span>
                <span style={styles.aChip}>a</span>
                <span style={styles.op}>×</span>
                <span style={styles.eqToken}>{coldS}</span>
              </div>
              <div style={styles.equation}>
                <span style={styles.op}>=</span>
                <span style={styles.eqToken}>{aTimesHot}</span>
                <span style={styles.op}>−</span>
                <span style={styles.eqToken}>{aTimesCold}</span>
                <span style={styles.op}>=</span>
                <span style={styles.finalChip}>{actualPrecipitation} g</span>
              </div>
            </div>
          </div>

          {/* 최종 답 */}
          <div style={styles.finalBox}>
            <div style={styles.finalLabel}>석출량</div>
            <div style={styles.finalValue}>{actualPrecipitation} g</div>
          </div>
        </>
      )}
    </div>
  );
}

function AdvancedSteps({ sub, hotTemp, coldTemp, solutionMass, saturationPercent, result, useFormula }) {
  const { hotS, coldS, actualSoluteIn100gWater, water, solute, maxSoluteAtColdTemp, precipitation, willPrecipitate } = result;
  const label = useFormula ? sub.formula : sub.name;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ ...styles.headerBadge, background: '#F59E0B' }}>심화</span>
        <span style={styles.headerText}>
          {label} {hotTemp}℃ 용액 {solutionMass}g (포화도 {saturationPercent}%) → {coldTemp}℃ 냉각
        </span>
      </div>

      <div style={styles.commonBox}>
        <div style={styles.commonLabel}>① 실제 녹은 용질 (물 100g 기준)</div>
        <div style={styles.equation}>
          <span style={styles.eqToken}>{hotS}</span>
          <span style={styles.op}>×</span>
          <span style={styles.eqToken}>{saturationPercent}%</span>
          <span style={styles.op}>=</span>
          <span style={styles.eqResult}>{actualSoluteIn100gWater} g</span>
        </div>
      </div>

      <div style={styles.methodBox}>
        <div style={styles.methodTitle}>
          <span style={styles.methodBadge}>②</span>
          <span>실제 물 양과 용질 양</span>
        </div>
        <div style={styles.methodBody}>
          <div style={styles.equation}>
            <span style={styles.subLabel}>물 =</span>
            <span style={styles.eqToken}>{solutionMass}</span>
            <span style={styles.op}>×</span>
            <Fraction top={100} bottom={`100+${actualSoluteIn100gWater}`} />
            <span style={styles.op}>=</span>
            <span style={styles.aChip}>{water} g</span>
          </div>
          <div style={styles.equation}>
            <span style={styles.subLabel}>용질 =</span>
            <span style={styles.eqToken}>{solutionMass}</span>
            <span style={styles.op}>−</span>
            <span style={styles.eqToken}>{water}</span>
            <span style={styles.op}>=</span>
            <span style={styles.finalChip}>{solute} g</span>
          </div>
        </div>
      </div>

      <div style={styles.methodBox}>
        <div style={styles.methodTitle}>
          <span style={styles.methodBadge}>③</span>
          <span>{coldTemp}℃에서 녹을 수 있는 최대량</span>
        </div>
        <div style={styles.methodBody}>
          <div style={styles.equation}>
            <span style={styles.eqToken}>{coldS}</span>
            <span style={styles.op}>×</span>
            <span style={styles.eqToken}>{water}</span>
            <span style={styles.op}>÷</span>
            <span style={styles.eqToken}>100</span>
            <span style={styles.op}>=</span>
            <span style={styles.finalChip}>{maxSoluteAtColdTemp} g</span>
          </div>
        </div>
      </div>

      <div style={styles.methodBox}>
        <div style={styles.methodTitle}>
          <span style={styles.methodBadge}>④</span>
          <span>석출량</span>
        </div>
        <div style={styles.methodBody}>
          {willPrecipitate ? (
            <div style={styles.equation}>
              <span style={styles.eqToken}>{solute}</span>
              <span style={styles.op}>−</span>
              <span style={styles.eqToken}>{maxSoluteAtColdTemp}</span>
              <span style={styles.op}>=</span>
              <span style={styles.finalChip}>{precipitation} g</span>
            </div>
          ) : (
            <div style={styles.noNote}>
              현재 용질 양이 최대 용해량보다 작거나 같아 <b>석출되지 않습니다</b>.
            </div>
          )}
        </div>
      </div>

      {willPrecipitate && (
        <div style={styles.finalBox}>
          <div style={styles.finalLabel}>석출량</div>
          <div style={styles.finalValue}>{precipitation} g</div>
        </div>
      )}
    </div>
  );
}

// ─── 분수 컴포넌트 ─────────────────────
function Fraction({ top, bottom }) {
  return (
    <span style={fractionStyles.wrap}>
      <span style={fractionStyles.top}>{top}</span>
      <span style={fractionStyles.line} />
      <span style={fractionStyles.bottom}>{bottom}</span>
    </span>
  );
}

const fractionStyles = {
  wrap: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    margin: '0 2px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    lineHeight: 1.1,
  },
  top: { padding: '0 4px', fontWeight: 600, color: '#1F2937' },
  line: { height: 1, width: '100%', background: '#374151', margin: '2px 0' },
  bottom: { padding: '0 4px', fontWeight: 600, color: '#1F2937' },
};

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
    paddingBottom: 8,
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
  headerText: { fontSize: 12, color: '#374151', fontWeight: 500 },
  commonBox: {
    padding: 10,
    background: '#F0F9FF',
    borderLeft: '3px solid #4A7ED9',
    borderRadius: 6,
  },
  commonLabel: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: 700,
    marginBottom: 6,
  },
  methodBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 10,
    background: '#FAFBFC',
    borderRadius: 8,
    border: '1px solid #E5E8EC',
  },
  methodTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: '#1F2937',
  },
  methodBadge: {
    padding: '2px 8px',
    background: '#4F46E5',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
  },
  methodBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingLeft: 2,
  },
  explain: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 1.5,
    marginBottom: 2,
  },
  equation: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#374151',
  },
  eqToken: {
    padding: '2px 6px',
    background: '#F3F4F6',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
    fontWeight: 600,
  },
  eqParen: {
    fontSize: 14,
    fontWeight: 700,
    color: '#9CA3AF',
  },
  eqResult: {
    padding: '2px 8px',
    background: '#DBEAFE',
    color: '#1E40AF',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 12,
  },
  aChip: {
    padding: '2px 8px',
    background: '#E0E7FF',
    color: '#3730A3',
    borderRadius: 4,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 12,
  },
  finalChip: {
    padding: '3px 8px',
    background: '#FEF3C7',
    color: '#92400E',
    borderRadius: 6,
    fontFamily: 'ui-monospace, monospace',
    fontWeight: 700,
    fontSize: 13,
  },
  op: { color: '#9CA3AF', fontWeight: 600 },
  subLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600 },
  finalBox: {
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
