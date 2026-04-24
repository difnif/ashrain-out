import { useState, useRef, useCallback, useEffect } from "react";

// ============================================================
// EpisodePlayer — 성분표 탐정 에피소드 재생 엔진
// 스텝별로 카드를 보여주고, 학생 추측 → 풀이 → 결과 비교까지 진행
// ============================================================

// 간단한 효과음 (Web Audio API)
function playTone(freq, duration = 0.15, type = "sine", vol = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}
const sfx = {
  step: () => playTone(880, 0.08, "sine", 0.08),
  reveal: () => {
    playTone(523, 0.15, "triangle", 0.1);
    setTimeout(() => playTone(659, 0.15, "triangle", 0.1), 120);
    setTimeout(() => playTone(784, 0.3, "triangle", 0.12), 240);
  },
  tension: () => playTone(220, 0.4, "sawtooth", 0.04),
  guess: () => playTone(440, 0.1, "sine", 0.06),
};

export default function EpisodePlayer({ episode, theme, onExit }) {
  const [step, setStep] = useState(0);
  const [guesses, setGuesses] = useState({}); // { cream: 30, milk: 20, ... }
  const [solveStep, setSolveStep] = useState(0); // solve 단계 내부 진행
  const [fadeIn, setFadeIn] = useState(true);
  const scrollRef = useRef(null);

  const ep = episode;
  const steps = ep?.steps || [];
  const currentStep = steps[step] || { type: "intro", title: "" };

  // 초기 추측값 세팅
  useEffect(() => {
    if (!ep) return;
    const init = {};
    for (const ing of ep.ingredients) {
      if (ing.key === "vanilla") continue; // 미량이라 추측 제외
      init[ing.key] = Math.round(ep.servingWeightG / ep.ingredients.length);
    }
    setGuesses(init);
  }, [ep]);

  // 효과음 — 스텝 타입 변경 시 (hooks를 최상위에서 호출)
  const prevStepType = useRef(null);
  useEffect(() => {
    if (currentStep.type === prevStepType.current) return;
    prevStepType.current = currentStep.type;
    if (currentStep.type === "solve") sfx.tension();
    if (currentStep.type === "reveal") sfx.reveal();
  }, [currentStep.type]);

  // 스텝 전환 애니메이션
  const goStep = useCallback((n) => {
    setFadeIn(false);
    sfx.step();
    setTimeout(() => {
      setStep(n);
      setSolveStep(0);
      setFadeIn(true);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, 200);
  }, []);

  const next = () => step < steps.length - 1 && goStep(step + 1);
  const prev = () => step > 0 && goStep(step - 1);

  // 추측 슬라이더 핸들러
  const setGuess = (key, val) => {
    setGuesses(prev => ({ ...prev, [key]: val }));
    sfx.guess();
  };

  // 스타일
  const s = {
    card: {
      background: theme.bg,
      border: `1.5px solid ${theme.border}`,
      borderRadius: 16,
      padding: "20px 18px",
      marginBottom: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    },
    heading: {
      fontSize: 18, fontWeight: 700, marginBottom: 10,
      color: theme.text,
    },
    subtext: {
      fontSize: 13, lineHeight: 1.6, color: theme.text,
      opacity: 0.8,
    },
    accent: {
      color: theme.accent || "#D96B5A",
      fontWeight: 600,
    },
    badge: {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: (theme.accent || "#D96B5A") + "22",
      color: theme.accent || "#D96B5A",
    },
  };

  // ========== 스텝별 렌더링 ==========

  function renderIntro() {
    return (
      <div style={s.card}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 56 }}>{ep.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: theme.text }}>
            {ep.title}
          </div>
          <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4, color: theme.text }}>
            {ep.subtitle}
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={s.badge}>{ep.category}</span>
            <span style={{ ...s.badge, marginLeft: 8 }}>{ep.difficulty}</span>
          </div>
        </div>
        <div style={{ ...s.subtext, textAlign: "center", marginTop: 12 }}>
          성분: {ep.ingredients.map(i => i.icon + " " + i.name).join(", ")}
        </div>
        <div style={{
          marginTop: 16, padding: "12px 14px",
          background: theme.border + "33",
          borderRadius: 10,
          fontSize: 13, lineHeight: 1.7,
          color: theme.text,
        }}>
          <strong>미션:</strong> 이 {ep.ingredients.length}가지 재료가 각각 몇 g 들어갔을까?<br />
          기업은 절대 안 알려줘요. 수학으로 밝혀냅시다.
        </div>
      </div>
    );
  }

  function renderClue() {
    const n = ep.nutrition;
    const rows = [
      ["열량", n.calories, "kcal"],
      ["지방", n.fat, "g"],
      ["  포화지방", n.saturatedFat, "g"],
      ["단백질", n.protein, "g"],
      ["탄수화물", n.carbs, "g"],
      ["  당류", n.sugar, "g"],
      ["콜레스테롤", n.cholesterol, "mg"],
      ["나트륨", n.sodium, "mg"],
    ];
    return (
      <div style={s.card}>
        <div style={s.heading}>📋 단서 #1 — 영양성분표</div>
        <div style={{
          fontSize: 12, opacity: 0.6, marginBottom: 12, color: theme.text,
        }}>
          {ep.servingSize}{ep.servingUnit}당 (약 {ep.servingWeightG}g)
        </div>
        <div style={{
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {rows.map(([label, val, unit], i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 14px",
              fontSize: 13,
              color: theme.text,
              background: i % 2 === 0 ? "transparent" : theme.border + "18",
              borderBottom: i < rows.length - 1 ? `1px solid ${theme.border}33` : "none",
            }}>
              <span style={{ opacity: label.startsWith("  ") ? 0.7 : 1 }}>
                {label}
              </span>
              <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {val} {unit}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          background: theme.border + "22",
          borderRadius: 8,
          fontSize: 12, lineHeight: 1.6,
          color: theme.text,
        }}>
          💡 <strong>핵심 단서:</strong> 원재료명은 <strong style={s.accent}>함량이 많은 순</strong>으로 적혀 있어요 (법으로 정해져 있음).<br />
          즉, {ep.ingredients.map(i => i.name).join(" > ")}
        </div>
      </div>
    );
  }

  function renderGuess() {
    const mainIngs = ep.ingredients.filter(i => i.key !== "vanilla");
    const total = Object.values(guesses).reduce((a, b) => a + b, 0);
    const remaining = ep.servingWeightG - total;

    return (
      <div style={s.card}>
        <div style={s.heading}>🤔 느낌으로 맞춰봐!</div>
        <div style={{ ...s.subtext, marginBottom: 16 }}>
          {ep.servingWeightG}g 중에 각 재료가 몇 g인지 추측해보세요.
        </div>

        {mainIngs.map(ing => (
          <div key={ing.key} style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 4,
            }}>
              <span style={{ fontSize: 13, color: theme.text }}>
                {ing.icon} {ing.name}
              </span>
              <span style={{
                fontSize: 16, fontWeight: 700, color: theme.accent || "#D96B5A",
                fontVariantNumeric: "tabular-nums",
                minWidth: 50, textAlign: "right",
              }}>
                {guesses[ing.key] || 0}g
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={ep.servingWeightG}
              value={guesses[ing.key] || 0}
              onChange={e => setGuess(ing.key, parseInt(e.target.value))}
              style={{ width: "100%", accentColor: theme.accent || "#D96B5A" }}
            />
          </div>
        ))}

        <div style={{
          padding: "10px 14px",
          background: remaining < 0 ? "#FFDDDD" : theme.border + "22",
          borderRadius: 8,
          fontSize: 13,
          color: remaining < 0 ? "#C44" : theme.text,
          textAlign: "center",
        }}>
          합계: {total}g / {ep.servingWeightG}g
          {remaining > 0 && ` (나머지 ${remaining}g = 정제수 + 바닐라향)`}
          {remaining < 0 && ` — ${Math.abs(remaining)}g 초과!`}
        </div>
      </div>
    );
  }

  function renderRefData() {
    const cols = ["지방", "단백질", "탄수화물"];
    const colKeys = ["fat", "protein", "carbs"];
    return (
      <div style={s.card}>
        <div style={s.heading}>🔬 단서 #2 — 각 재료의 정체</div>
        <div style={{ ...s.subtext, marginBottom: 14 }}>
          각 재료 100g당 영양소 함량 (USDA 기준)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            fontSize: 12, color: theme.text,
          }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>재료</th>
                {cols.map(c => (
                  <th key={c} style={{ textAlign: "right", padding: "6px 8px" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ep.ingredients.filter(i => i.key !== "vanilla").map((ing, idx) => {
                const ref = ep.refData[ing.key];
                return (
                  <tr key={ing.key} style={{
                    background: idx % 2 === 0 ? "transparent" : theme.border + "15",
                  }}>
                    <td style={{ padding: "8px", fontWeight: 500 }}>
                      {ing.icon} {ing.name}
                    </td>
                    {colKeys.map(k => (
                      <td key={k} style={{
                        textAlign: "right", padding: "8px",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: k === "fat" && ref[k] > 20 ? 700 : 400,
                        color: k === "fat" && ref[k] > 20 ? (theme.accent || "#D96B5A") : "inherit",
                      }}>
                        {ref[k]}g
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{
          marginTop: 12, padding: "10px 14px",
          background: theme.border + "22", borderRadius: 8,
          fontSize: 12, lineHeight: 1.6, color: theme.text,
        }}>
          👀 눈에 띄는 점: <strong style={s.accent}>크림의 지방이 36%</strong>로 압도적.
          설탕은 순수 탄수화물(100%). 이 차이가 방정식을 세울 열쇠예요.
        </div>
      </div>
    );
  }

  function renderEquation() {
    return (
      <div style={s.card}>
        <div style={s.heading}>📐 방정식을 세운다</div>
        <div style={{ ...s.subtext, marginBottom: 16 }}>
          미지수 {ep.ingredients.length - 1}개, 방정식 {ep.equations.length}개.
          풀 수 있을까?
        </div>
        {ep.equations.map((eq, i) => (
          <div key={i} style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: theme.border + "15",
            borderRadius: 10,
            borderLeft: `3px solid ${theme.accent || "#D96B5A"}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, marginBottom: 6,
              color: theme.accent || "#D96B5A",
            }}>
              {eq.label}
            </div>
            <div style={{
              fontSize: 12, fontFamily: "monospace",
              color: theme.text,
              overflowX: "auto",
              whiteSpace: "nowrap",
              lineHeight: 1.8,
            }}>
              {eq.latex.replace(/\\cdot/g, "·").replace(/_(\d)/g, "₁₂₃₄₅"["$1"] || "$1")}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, color: theme.text }}>
              {eq.note}
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 8, padding: "10px 14px",
          background: (theme.accent || "#D96B5A") + "15",
          borderRadius: 8,
          fontSize: 13, color: theme.text, textAlign: "center",
        }}>
          4개 미지수, 4개 방정식... 하지만 바닐라향은 미량이라 제외하면<br />
          <strong>4개 미지수, 4개 방정식 → 풀 수 있다!</strong>
        </div>
      </div>
    );
  }

  function renderConstraint() {
    return (
      <div style={s.card}>
        <div style={s.heading}>🔬 식품 과학의 제약</div>
        <div style={{ ...s.subtext, marginBottom: 16 }}>
          수학만으로 부족할 때, 과학이 범위를 좁혀줘요.
          <br />이 범위를 벗어나면 <strong style={s.accent}>아이스크림이 아닌 다른 것</strong>이 돼요.
        </div>
        {ep.constraints.map((c, i) => {
          const ing = ep.ingredients.find(x => x.key === c.key);
          return (
            <div key={i} style={{
              marginBottom: 14,
              padding: "14px",
              background: theme.border + "18",
              borderRadius: 12,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              }}>
                <span style={{ fontSize: 20 }}>{ing?.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                  {c.title}
                </span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: theme.text, marginBottom: 8 }}>
                {c.reason}
              </div>
              {/* 범위 바 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, color: theme.text,
              }}>
                <span style={{ opacity: 0.5 }}>0g</span>
                <div style={{
                  flex: 1, height: 8, background: theme.border + "44",
                  borderRadius: 4, position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute",
                    left: `${(c.min / ep.servingWeightG) * 100}%`,
                    width: `${((c.max - c.min) / ep.servingWeightG) * 100}%`,
                    height: "100%",
                    background: theme.accent || "#D96B5A",
                    borderRadius: 4,
                    opacity: 0.7,
                  }} />
                </div>
                <span style={{ opacity: 0.5 }}>{ep.servingWeightG}g</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 11, opacity: 0.6, marginTop: 4, color: theme.text,
              }}>
                <span>최소 {c.min}g</span>
                <span>최대 {c.max}g</span>
              </div>
              <div style={{
                marginTop: 8, fontSize: 11, lineHeight: 1.6,
                color: theme.text, opacity: 0.7,
              }}>
                ⬇️ {c.tooLow}<br />
                ⬆️ {c.tooHigh}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderSolve() {
    const ss = ep.solveSteps;
    return (
      <div style={s.card}>
        <div style={s.heading}>🔎 풀이 — 한 단계씩</div>
        {ss.map((st, i) => {
          if (i > solveStep) return null;
          const isNew = i === solveStep;
          return (
            <div key={i} style={{
              marginBottom: 14,
              padding: "14px",
              background: isNew ? (theme.accent || "#D96B5A") + "12" : theme.border + "12",
              borderRadius: 12,
              borderLeft: isNew ? `3px solid ${theme.accent || "#D96B5A"}` : "3px solid transparent",
              opacity: isNew ? 1 : 0.7,
              transition: "all 0.3s",
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, marginBottom: 6,
                color: isNew ? (theme.accent || "#D96B5A") : theme.text,
              }}>
                {st.title}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: theme.text }}>
                {st.body}
              </div>
              <div style={{
                marginTop: 8, padding: "8px 10px",
                background: theme.bg,
                borderRadius: 8,
                fontFamily: "monospace", fontSize: 12,
                color: theme.text,
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}>
                {st.formula}
              </div>
            </div>
          );
        })}
        {solveStep < ss.length - 1 && (
          <button
            onClick={() => { setSolveStep(p => p + 1); sfx.step(); }}
            style={btnStyle(theme, false)}
          >
            다음 단계 →
          </button>
        )}
      </div>
    );
  }

  function renderReveal() {
    const sol = ep.solution;
    const keys = Object.keys(sol);
    const maxVal = Math.max(...keys.map(k => sol[k].best));
    return (
      <div style={s.card}>
        <div style={{ ...s.heading, textAlign: "center" }}>🎉 추정 레시피 공개!</div>
        <div style={{ marginBottom: 20 }}>
          {keys.map((key, i) => {
            const item = sol[key];
            const ing = ep.ingredients.find(x => x.key === key);
            const label = ing ? `${ing.icon} ${ing.name}` : (key === "water" ? "💧 정제수" : key);
            const pct = (item.best / maxVal) * 100;
            return (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, color: theme.text, marginBottom: 3,
                }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {item.best}g
                    <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 4 }}>
                      ({item.range[0]}~{item.range[1]})
                    </span>
                  </span>
                </div>
                <div style={{
                  height: 18, background: theme.border + "33",
                  borderRadius: 6, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: ing?.color || (theme.accent || "#D96B5A"),
                    borderRadius: 6,
                    transition: "width 1s ease-out",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        {/* 서프라이즈 */}
        <div style={{
          padding: "14px",
          background: (theme.accent || "#D96B5A") + "12",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: theme.accent || "#D96B5A" }}>
            💡 놀라운 사실
          </div>
          {ep.surprises.map((txt, i) => (
            <div key={i} style={{
              fontSize: 12, lineHeight: 1.7, color: theme.text,
              marginBottom: i < ep.surprises.length - 1 ? 6 : 0,
              paddingLeft: 10,
              borderLeft: `2px solid ${theme.border}`,
            }}>
              {txt}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderCompare() {
    const sol = ep.solution;
    const mainIngs = ep.ingredients.filter(i => i.key !== "vanilla" && sol[i.key]);
    const maxVal = ep.servingWeightG;
    let totalDiff = 0;

    return (
      <div style={s.card}>
        <div style={{ ...s.heading, textAlign: "center" }}>🏆 네 추측은 어땠을까?</div>
        <div style={{ marginBottom: 20 }}>
          {mainIngs.map((ing) => {
            const guess = guesses[ing.key] || 0;
            const actual = sol[ing.key].best;
            const diff = Math.abs(guess - actual);
            totalDiff += diff;

            return (
              <div key={ing.key} style={{ marginBottom: 14 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 13, color: theme.text, marginBottom: 4,
                }}>
                  <span>{ing.icon} {ing.name}</span>
                  <span style={{
                    fontSize: 12,
                    color: diff <= 5 ? "#4CAF50" : diff <= 10 ? "#FF9800" : "#E53935",
                    fontWeight: 600,
                  }}>
                    {diff === 0 ? "정확!" : `${diff}g 차이`}
                  </span>
                </div>
                {/* 두 줄 바 */}
                <div style={{ marginBottom: 2 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: theme.text,
                  }}>
                    <span style={{ width: 30, opacity: 0.5 }}>추측</span>
                    <div style={{
                      flex: 1, height: 12, background: theme.border + "33",
                      borderRadius: 4, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${(guess / maxVal) * 100}%`,
                        background: theme.border,
                        borderRadius: 4,
                      }} />
                    </div>
                    <span style={{
                      width: 30, textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}>{guess}g</span>
                  </div>
                </div>
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: theme.text,
                  }}>
                    <span style={{ width: 30, opacity: 0.5 }}>실제</span>
                    <div style={{
                      flex: 1, height: 12, background: theme.border + "33",
                      borderRadius: 4, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${(actual / maxVal) * 100}%`,
                        background: ing.color || (theme.accent || "#D96B5A"),
                        borderRadius: 4,
                      }} />
                    </div>
                    <span style={{
                      width: 30, textAlign: "right",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}>{actual}g</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* 탐정 점수 */}
        <div style={{
          textAlign: "center",
          padding: "18px 14px",
          background: (theme.accent || "#D96B5A") + "12",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 13, opacity: 0.7, color: theme.text }}>총 오차</div>
          <div style={{
            fontSize: 32, fontWeight: 800,
            color: totalDiff <= 20 ? "#4CAF50" : totalDiff <= 40 ? "#FF9800" : (theme.accent || "#D96B5A"),
          }}>
            {totalDiff}g
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: theme.text }}>
            {totalDiff <= 10 ? "🏅 천재 탐정!" :
             totalDiff <= 20 ? "🕵️ 유능한 탐정!" :
             totalDiff <= 40 ? "🔍 수습 탐정" :
             "📚 다음엔 더 잘할 수 있어!"}
          </div>
        </div>
      </div>
    );
  }

  // 스텝 타입 → 렌더 함수 매핑
  const renderers = {
    intro: renderIntro,
    clue: renderClue,
    guess: renderGuess,
    refdata: renderRefData,
    equation: renderEquation,
    constraint: renderConstraint,
    solve: renderSolve,
    reveal: renderReveal,
    compare: renderCompare,
  };

  const canGoNext = currentStep.type !== "solve" || solveStep >= ep.solveSteps.length - 1;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0,
      color: theme.text,
    }}>
      {/* 진행 바 */}
      <div style={{
        display: "flex", gap: 3, padding: "12px 16px 8px",
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? (theme.accent || "#D96B5A") : theme.border + "44",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* 스텝 타이틀 */}
      <div style={{
        padding: "4px 16px 8px",
        fontSize: 12, opacity: 0.5,
        color: theme.text,
      }}>
        {step + 1}/{steps.length} · {currentStep.title}
      </div>

      {/* 카드 컨텐츠 */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "0 16px 16px",
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.2s ease-out",
      }}>
        {renderers[currentStep.type]?.()}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{
        display: "flex", gap: 10,
        padding: "12px 16px",
        borderTop: `1px solid ${theme.border}33`,
      }}>
        {step > 0 && (
          <button onClick={prev} style={btnStyle(theme, true)}>
            이전
          </button>
        )}
        {step === 0 && (
          <button onClick={onExit} style={btnStyle(theme, true)}>
            나가기
          </button>
        )}
        <button
          onClick={step === steps.length - 1 ? onExit : next}
          disabled={!canGoNext}
          style={{
            ...btnStyle(theme, false),
            flex: 2,
            opacity: canGoNext ? 1 : 0.4,
          }}
        >
          {step === steps.length - 1 ? "완료" :
           step === 0 ? "수사 시작 →" : "다음 →"}
        </button>
      </div>
    </div>
  );
}

function btnStyle(theme, secondary) {
  return {
    flex: 1,
    padding: "12px 0",
    borderRadius: 12,
    border: secondary ? `1.5px solid ${theme.border}` : "none",
    background: secondary ? "transparent" : (theme.accent || "#D96B5A"),
    color: secondary ? theme.text : "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
