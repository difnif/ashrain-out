// src/components/precipitation/SolubilityChart.jsx
// 용해도 곡선 그래프 (SVG)
// 선택한 물질의 곡선 강조 + 현재 고온/저온 포인트 표시

import { SUBSTANCES, SUBSTANCE_LIST } from '../../data/solubilityData';

const CHART_W = 320;
const CHART_H = 200;
const PAD_L = 42;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

const MAX_SOLUBILITY = 250; // y축 최대
const TEMP_MIN = 0;
const TEMP_MAX = 100;

function tempToX(t) {
  return PAD_L + ((t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * PLOT_W;
}
function solToY(s) {
  return PAD_T + PLOT_H - (Math.min(s, MAX_SOLUBILITY) / MAX_SOLUBILITY) * PLOT_H;
}

export default function SolubilityChart({
  highlightSubstanceId,
  hotTemp,
  coldTemp,
  hotSolubility,
  coldSolubility,
  useFormula = false,
}) {
  return (
    <div style={{ width: '100%', maxWidth: CHART_W, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* 배경 */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="#FAFBFC"
          stroke="#D4D9E0"
          strokeWidth="1"
        />

        {/* Y축 눈금 */}
        {[0, 50, 100, 150, 200, 250].map(s => (
          <g key={`y-${s}`}>
            <line
              x1={PAD_L}
              x2={PAD_L + PLOT_W}
              y1={solToY(s)}
              y2={solToY(s)}
              stroke="#E5E8EC"
              strokeWidth="0.5"
            />
            <text x={PAD_L - 6} y={solToY(s) + 3} fontSize="9" fill="#6B7280" textAnchor="end">
              {s}
            </text>
          </g>
        ))}

        {/* X축 눈금 */}
        {[0, 20, 40, 60, 80, 100].map(t => (
          <g key={`x-${t}`}>
            <line
              x1={tempToX(t)}
              x2={tempToX(t)}
              y1={PAD_T + PLOT_H}
              y2={PAD_T + PLOT_H + 3}
              stroke="#9CA3AF"
              strokeWidth="0.8"
            />
            <text
              x={tempToX(t)}
              y={PAD_T + PLOT_H + 13}
              fontSize="9"
              fill="#6B7280"
              textAnchor="middle"
            >
              {t}
            </text>
          </g>
        ))}

        {/* 축 라벨 */}
        <text x={PAD_L + PLOT_W / 2} y={CHART_H - 4} fontSize="10" fill="#4B5563" textAnchor="middle">
          온도 (℃)
        </text>
        <text
          x={10}
          y={PAD_T + PLOT_H / 2}
          fontSize="10"
          fill="#4B5563"
          textAnchor="middle"
          transform={`rotate(-90, 10, ${PAD_T + PLOT_H / 2})`}
        >
          용해도 (g/물100g)
        </text>

        {/* 전체 물질 곡선 (연한 색) */}
        {SUBSTANCE_LIST.map(sub => {
          const isHighlight = sub.id === highlightSubstanceId;
          const points = Object.entries(sub.fineSolubility)
            .map(([t, s]) => `${tempToX(+t)},${solToY(s)}`)
            .join(' ');
          return (
            <polyline
              key={sub.id}
              points={points}
              fill="none"
              stroke={sub.displayColor}
              strokeWidth={isHighlight ? 2.5 : 1}
              strokeOpacity={isHighlight ? 1 : 0.25}
            />
          );
        })}

        {/* 현재 선택 물질의 포인트 강조 */}
        {highlightSubstanceId && hotTemp != null && hotSolubility != null && (
          <g>
            <line
              x1={tempToX(hotTemp)}
              y1={solToY(hotSolubility)}
              x2={tempToX(hotTemp)}
              y2={PAD_T + PLOT_H}
              stroke="#D94A4A"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={tempToX(hotTemp)} cy={solToY(hotSolubility)} r="4" fill="#D94A4A" />
            <text
              x={tempToX(hotTemp) + 6}
              y={solToY(hotSolubility) - 4}
              fontSize="9"
              fill="#D94A4A"
              fontWeight="bold"
            >
              {hotSolubility}g
            </text>
          </g>
        )}
        {highlightSubstanceId && coldTemp != null && coldSolubility != null && (
          <g>
            <line
              x1={tempToX(coldTemp)}
              y1={solToY(coldSolubility)}
              x2={tempToX(coldTemp)}
              y2={PAD_T + PLOT_H}
              stroke="#4A7ED9"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={tempToX(coldTemp)} cy={solToY(coldSolubility)} r="4" fill="#4A7ED9" />
            <text
              x={tempToX(coldTemp) + 6}
              y={solToY(coldSolubility) - 4}
              fontSize="9"
              fill="#4A7ED9"
              fontWeight="bold"
            >
              {coldSolubility}g
            </text>
          </g>
        )}
      </svg>

      {/* 범례 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginTop: 6,
          fontSize: 10,
        }}
      >
        {SUBSTANCE_LIST.map(sub => {
          const active = sub.id === highlightSubstanceId;
          return (
            <div
              key={sub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: active ? 1 : 0.5,
                fontWeight: active ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 3,
                  background: sub.displayColor,
                  borderRadius: 2,
                }}
              />
              <span>{useFormula ? sub.formula : sub.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
