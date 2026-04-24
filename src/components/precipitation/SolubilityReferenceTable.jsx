// src/components/precipitation/SolubilityReferenceTable.jsx
// 선택한 물질의 온도별 용해도 + 포화용액 질량 참고 표

import { SUBSTANCES } from '../../data/solubilityData';

const TABLE_TEMPS = [0, 20, 40, 60, 80];

export default function SolubilityReferenceTable({ substanceId, useFormula = false, highlightTemps = [] }) {
  const sub = SUBSTANCES[substanceId];
  if (!sub) return null;

  const label = useFormula ? sub.formula : sub.name;

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>
        <span style={{ ...styles.badge, background: sub.displayColor }}>{label}</span>
        <span style={styles.titleText}>온도별 용해도 (물 100g 기준)</span>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>온도</th>
              <th style={styles.th}>용해도<br /><span style={styles.thSub}>(g/물100g)</span></th>
              <th style={styles.th}>포화용액<br /><span style={styles.thSub}>(물+용질, g)</span></th>
            </tr>
          </thead>
          <tbody>
            {TABLE_TEMPS.map(t => {
              const s = sub.solubility[t];
              const solution = +(100 + s).toFixed(1);
              const isHi = highlightTemps.includes(t);
              return (
                <tr key={t} style={isHi ? { background: '#FFFBEB' } : null}>
                  <td style={{ ...styles.td, fontWeight: isHi ? 700 : 500 }}>{t}℃</td>
                  <td style={{ ...styles.td, color: sub.displayColor, fontWeight: isHi ? 700 : 600 }}>
                    {s} g
                  </td>
                  <td style={{ ...styles.td, fontWeight: isHi ? 700 : 500 }}>{solution} g</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={styles.note}>
        💡 물이 200g이면 용해도와 포화용액 모두 2배, 300g이면 3배가 됩니다.
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    padding: 12,
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E8EC',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    padding: '3px 8px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1F2937',
  },
  tableWrap: {
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid #E5E8EC',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    padding: '8px 6px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E8EC',
    fontWeight: 700,
    color: '#4B5563',
    textAlign: 'center',
    fontSize: 11,
  },
  thSub: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: 500,
  },
  td: {
    padding: '8px 6px',
    textAlign: 'center',
    borderBottom: '1px solid #F0F2F5',
    color: '#374151',
  },
  note: {
    marginTop: 8,
    padding: 8,
    background: '#F0F9FF',
    borderLeft: '3px solid #4A7ED9',
    borderRadius: 6,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 1.5,
  },
};
