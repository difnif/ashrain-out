import { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import SetupPanel from "../googolgear/SetupPanel";
import GearTowerScene from "../googolgear/GearTowerScene";
import RemainingTime from "../googolgear/RemainingTime";
import ExplanationPanel from "../googolgear/ExplanationPanel";
import { createAutoController } from "../googolgear/AutoController";
import { createManualController } from "../googolgear/ManualController";
import { RPM_MAX, RPM_MIN } from "../googolgear/rpmExamples";

// 전체 화면 에러 바운더리 — 흰 화면 방지
class GoogolErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err, info) {
    console.error("[GoogolGear] caught:", err, info);
  }
  render() {
    if (this.state.hasError) {
      const t = this.props.theme || {};
      return (
        <div style={{
          position: "fixed", inset: 0,
          background: t.bg || "#fff",
          color: t.text || "#000",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 24, gap: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 40 }}>⚙️</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>구골 기어가 잠시 멈췄어요</div>
          <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 300 }}>
            화면을 빠져나오던 중 오류가 났어요. 홈으로 돌아가서 다시 들어와 주세요.
          </div>
          <button
            onClick={() => this.props.onExit && this.props.onExit()}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: t.accent || "#888",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >홈으로</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function renderGoogolGearScreen(ctx) {
  const { theme, setScreen } = ctx;
  return (
    <GoogolErrorBoundary theme={theme} onExit={() => setScreen("studentHome")}>
      <GoogolGearInner theme={theme} setScreen={setScreen} />
    </GoogolErrorBoundary>
  );
}

function GoogolGearInner({ theme, setScreen }) {
  const [phase, setPhase] = useState("setup-b");
  const [B, setB] = useState(10);
  const [E, setE] = useState(10);
  const [rpm, setRpm] = useState(60);
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [styleKey, setStyleKey] = useState("copper");

  // 화면 가로/세로 감지
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== "undefined" ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // 컨트롤러는 useMemo로 phase 진입 시점에 한 번만 생성
  const autoController = useMemo(
    () => phase === "auto-scene" ? createAutoController(B, E, rpm) : null,
    [phase, B, E, rpm]
  );
  const manualController = useMemo(
    () => phase === "manual-scene" ? createManualController(B, E) : null,
    [phase, B, E]
  );

  // 수동 모드: 첫 기어 드래그 콜백
  const handleFirstGearDrag = useCallback((deltaAngle) => {
    if (!manualController) return;
    manualController.applyDragDelta(deltaAngle);
  }, [manualController]);

  // 수동 모드: 손가락 뗌 → 관성 coast 시작
  const handleFirstGearRelease = useCallback(() => {
    if (!manualController) return;
    manualController.releaseDrag();
  }, [manualController]);

  // 수동 모드: 한 번이라도 돌리면 5초 후 설명 슬라이드인
  // (controller.step은 animate loop에서 dt로 호출되므로 여기서는 interaction check만)
  const interactionCheckRef = useRef(null);
  useEffect(() => {
    if (phase !== "manual-scene" || !manualController) return;
    const interval = setInterval(() => {
      if (manualController.getHasInteracted() && !interactionCheckRef.current) {
        interactionCheckRef.current = setTimeout(() => {
          setExplanationVisible(true);
        }, 5000);
      }
    }, 200);
    return () => {
      clearInterval(interval);
      if (interactionCheckRef.current) {
        clearTimeout(interactionCheckRef.current);
        interactionCheckRef.current = null;
      }
    };
  }, [phase, manualController]);

  // 자동 모드: 진입 후 5초 뒤 자동으로 설명
  useEffect(() => {
    if (phase !== "auto-scene") return;
    setExplanationVisible(false);
    const t = setTimeout(() => setExplanationVisible(true), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  // 수동 모드용 RPM 표시 + 최고 기록 (매 100ms 갱신)
  const [manualRpm, setManualRpm] = useState(0);
  const [manualMaxRpm, setManualMaxRpm] = useState(0);
  useEffect(() => {
    if (phase !== "manual-scene" || !manualController) return;
    manualController.resetPeakRpm && manualController.resetPeakRpm();
    setManualMaxRpm(0);
    const id = setInterval(() => {
      const cur = manualController.getRpm();
      setManualRpm(cur);
      // 최고 기록은 누적 한 바퀴 이상 돌렸을 때만 갱신 (첫 탭 이상치 차단)
      if (manualController.isUnlocked && manualController.isUnlocked()) {
        setManualMaxRpm(prev => cur > prev ? cur : prev);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, manualController]);

  // 최고 RPM 리셋 핸들러 — 컨트롤러와 UI 둘 다 초기화
  const resetManualMaxRpm = useCallback(() => {
    if (manualController && manualController.resetPeakRpm) {
      manualController.resetPeakRpm();
    }
    setManualMaxRpm(0);
  }, [manualController]);

  // === 화면 렌더링 ===
  const baseStyle = {
    position: "fixed",
    inset: 0,
    background: theme.bg,
    color: theme.text,
    display: "flex",
    flexDirection: "column",
  };

  // 헤더 (전 화면 공통)
  const Header = ({ title }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <button
        onClick={() => {
          if (phase === "setup-b") setScreen("studentHome");
          else if (phase === "setup-e") setPhase("setup-b");
          else if (phase === "mode") setPhase("setup-e");
          else if (phase === "auto-rpm") setPhase("mode");
          else setPhase("mode");
        }}
        style={{
          background: "transparent", border: "none", color: theme.text,
          fontSize: 20, cursor: "pointer", padding: "4px 8px",
        }}
      >←</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, opacity: 0.6 }}>🧮 쓸모없어 보이는 수학</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      </div>
      <button
        onClick={() => setScreen("studentHome")}
        style={{
          background: "transparent", border: `1px solid ${theme.border}`,
          color: theme.text, fontSize: 13, cursor: "pointer",
          padding: "6px 12px", borderRadius: 10,
        }}
        title="홈으로 나가기"
      >✕ 닫기</button>
    </div>
  );

  // === Phase: setup-b ===
  if (phase === "setup-b") {
    return (
      <div style={baseStyle}>
        <Header title="구골 기어 — 1단계" />
        <div style={{ flex: 1, minHeight: 0 }}>
          <SetupPanel
            phase="B"
            value={B}
            onChange={setB}
            onBack={() => setScreen("studentHome")}
            onNext={() => setPhase("setup-e")}
            theme={theme}
          />
        </div>
      </div>
    );
  }

  // === Phase: setup-e ===
  if (phase === "setup-e") {
    return (
      <div style={baseStyle}>
        <Header title="구골 기어 — 2단계" />
        <div style={{ flex: 1, minHeight: 0 }}>
          <SetupPanel
            phase="E"
            value={E}
            onChange={setE}
            onBack={() => setPhase("setup-b")}
            onNext={() => setPhase("mode")}
            theme={theme}
            B={B}
          />
        </div>
      </div>
    );
  }

  // === Phase: mode select ===
  if (phase === "mode") {
    return (
      <div style={baseStyle}>
        <Header title="모드 선택" />
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: 24, gap: 16, justifyContent: "center",
        }}>
          <div style={{
            padding: 16, borderRadius: 12,
            background: theme.accent + "22", textAlign: "center",
          }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>현재 셋팅</div>
            <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
              {B}<sup>{E}</sup>
            </div>
          </div>

          <button
            onClick={() => setPhase("manual-scene")}
            style={{
              padding: "20px 16px", borderRadius: 14,
              border: `2px solid ${theme.border}`,
              background: "transparent", color: theme.text,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>✋ 수동 모드</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>직접 손가락으로 첫 기어를 돌려봐요.</div>
          </button>

          <button
            onClick={() => setPhase("auto-rpm")}
            style={{
              padding: "20px 16px", borderRadius: 14,
              border: `2px solid ${theme.border}`,
              background: "transparent", color: theme.text,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>⚙️ 자동 모드</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>RPM을 셋팅하고 자동으로 돌려요.</div>
          </button>
        </div>
      </div>
    );
  }

  // === Phase: auto-rpm setup ===
  if (phase === "auto-rpm") {
    return (
      <div style={baseStyle}>
        <Header title="자동 모드 — RPM 셋팅" />
        <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            flex: 1, minHeight: 200, borderRadius: 12,
            background: theme.border + "22",
          }}>
            <GearTowerScene B={B} E={1} previewMode="single" theme={theme} previewRpm={rpm} />
          </div>
          <RpmSlider value={rpm} onChange={setRpm} theme={theme} />
          <button
            onClick={() => setPhase("auto-scene")}
            style={{
              padding: "14px", borderRadius: 12,
              border: "none", background: theme.accent,
              color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer",
            }}
          >확인 →</button>
        </div>
      </div>
    );
  }

  // === Phase: manual-scene ===
  if (phase === "manual-scene") {
    return (
      <div style={baseStyle}>
        <Header title="수동 모드" />
        <SceneArea
          isLandscape={isLandscape}
          showPanel={explanationVisible}
          theme={theme}
          sceneNode={
            <GearTowerScene
              B={B} E={E}
              controller={manualController}
              theme={theme}
              styleKey={styleKey}
              onFirstGearDrag={handleFirstGearDrag}
              onFirstGearRelease={handleFirstGearRelease}
            />
          }
          topOverlay={
            <ManualTopBar
              B={B} E={E} rpm={manualRpm} maxRpm={manualMaxRpm} theme={theme}
              onResetMax={resetManualMaxRpm}
            />
          }
          stylePicker={<StylePicker value={styleKey} onChange={setStyleKey} theme={theme} />}
          panelNode={
            explanationVisible ? (
              <ExplanationPanel
                B={B} E={E} rpm={manualRpm || 60} theme={theme} mode="manual"
                onContinue={() => setExplanationVisible(false)}
                collapsible={true}
                docked={isLandscape}
              />
            ) : null
          }
        />
      </div>
    );
  }

  // === Phase: auto-scene ===
  if (phase === "auto-scene") {
    return (
      <div style={baseStyle}>
        <Header title="자동 모드" />
        <SceneArea
          isLandscape={isLandscape}
          showPanel={explanationVisible}
          theme={theme}
          sceneNode={
            <GearTowerScene
              B={B} E={E}
              controller={autoController}
              theme={theme}
              styleKey={styleKey}
            />
          }
          topOverlay={
            <div style={{ padding: 0 }}>
              <RemainingTime B={B} E={E} rpm={rpm} theme={theme} />
            </div>
          }
          stylePicker={<StylePicker value={styleKey} onChange={setStyleKey} theme={theme} />}
          panelNode={
            explanationVisible ? (
              <ExplanationPanel
                B={B} E={E} rpm={rpm} theme={theme} mode="auto"
                onContinue={() => setExplanationVisible(false)}
                collapsible={true}
                docked={isLandscape}
              />
            ) : null
          }
        />
      </div>
    );
  }

  return null;
}

// 가로/세로 모드에 따라 씬과 설명 패널을 배치하는 컨테이너
function SceneArea({ isLandscape, showPanel, theme, sceneNode, topOverlay, stylePicker, panelNode }) {
  // 가로 + 설명 활성: 좌(씬) | 우(패널)
  if (isLandscape && showPanel && panelNode) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
        <div style={{ flex: "1 1 60%", minWidth: 0, position: "relative" }}>
          {sceneNode}
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}>{topOverlay}</div>
          </div>
          {stylePicker}
        </div>
        <div style={{
          flex: "0 0 40%", maxWidth: 460, minWidth: 280,
          borderLeft: `1px solid ${theme.border}`,
          background: theme.bg,
          position: "relative",
          overflowY: "auto",
        }}>
          {panelNode}
        </div>
      </div>
    );
  }

  // 세로: 위(씬) / 아래(패널). showPanel일 때 씬은 55%로 줄어듦
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{
        flex: showPanel && panelNode ? "0 0 55%" : "1 1 100%",
        minHeight: 0,
        position: "relative",
        transition: "flex-basis 0.4s ease",
      }}>
        {sceneNode}
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>{topOverlay}</div>
        </div>
        {stylePicker}
      </div>
      {showPanel && panelNode && (
        <div style={{
          flex: "1 1 45%", minHeight: 0,
          borderTop: `1px solid ${theme.border}`,
          background: theme.bg,
          position: "relative",
          overflowY: "auto",
        }}>
          {panelNode}
        </div>
      )}
    </div>
  );
}

// 수동 모드 상단 바: 남은 시간 + 현재 RPM + 최고 RPM
function ManualTopBar({ B, E, rpm, maxRpm, theme, onResetMax }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <RemainingTime B={B} E={E} rpm={rpm} theme={theme} />
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: theme.border + "33",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 12,
        color: theme.text,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, opacity: 0.6 }}>현재 RPM</div>
          <div style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(rpm)}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: theme.border }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, opacity: 0.6 }}>🏆 최고 기록</div>
          <div style={{ fontSize: 16, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: theme.accent }}>
            {Math.round(maxRpm)}
          </div>
        </div>
        <button
          onClick={onResetMax}
          title="최고 기록 초기화"
          style={{
            background: "transparent",
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: 10,
            padding: "4px 8px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >리셋</button>
      </div>
    </div>
  );
}

// 스타일 선택 UI — 화면 우측 상단 고정
function StylePicker({ value, onChange, theme }) {
  const styles = [
    { key: "copper",  label: "구리",  color: "#C88A42" },
    { key: "rainbow", label: "컬러",  color: "#F9A825" },
    { key: "black",   label: "블랙",  color: "#1A1A1A" },
    { key: "white",   label: "화이트", color: "#F5F0E8" },
    { key: "lineart", label: "블루프린트", color: "#0F2540" },
  ];
  return (
    <div style={{
      position: "absolute",
      top: 12, right: 12,
      display: "flex", flexDirection: "column", gap: 6,
      zIndex: 10,
    }}>
      {styles.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          title={s.label}
          style={{
            width: 32, height: 32,
            borderRadius: "50%",
            border: value === s.key
              ? `3px solid ${theme.accent}`
              : `1.5px solid ${theme.border}`,
            background: s.color,
            cursor: "pointer",
            padding: 0,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        />
      ))}
    </div>
  );
}

// 자동 모드 RPM 슬라이더 — 가로 슬라이더 + 숫자 표시
function RpmSlider({ value, onChange, theme }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: theme.border + "33",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>RPM</span>
        <span style={{ fontSize: 18, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <input
        type="range"
        min={RPM_MIN}
        max={RPM_MAX}
        value={value}
        step={1}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginTop: 2 }}>
        <span>{RPM_MIN}</span>
        <span>{RPM_MAX}</span>
      </div>
    </div>
  );
}
