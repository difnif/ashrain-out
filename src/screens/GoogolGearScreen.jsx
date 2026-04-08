import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import SetupPanel from "../googolgear/SetupPanel";
import GearTowerScene from "../googolgear/GearTowerScene";
import RemainingTime from "../googolgear/RemainingTime";
import ExplanationPanel from "../googolgear/ExplanationPanel";
import { createAutoController } from "../googolgear/AutoController";
import { createManualController } from "../googolgear/ManualController";
import { RPM_MAX, RPM_MIN } from "../googolgear/rpmExamples";

export function renderGoogolGearScreen(ctx) {
  const { theme, setScreen } = ctx;
  return <GoogolGearInner theme={theme} setScreen={setScreen} />;
}

function GoogolGearInner({ theme, setScreen }) {
  const [phase, setPhase] = useState("setup-b");
  const [B, setB] = useState(10);
  const [E, setE] = useState(10);
  const [rpm, setRpm] = useState(60);
  const [explanationVisible, setExplanationVisible] = useState(false);

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

  // 수동 모드용 RPM 표시 (매 100ms 갱신)
  const [manualRpm, setManualRpm] = useState(0);
  useEffect(() => {
    if (phase !== "manual-scene" || !manualController) return;
    const id = setInterval(() => setManualRpm(manualController.getRpm()), 100);
    return () => clearInterval(id);
  }, [phase, manualController]);

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
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <GearTowerScene
            B={B}
            E={E}
            controller={manualController}
            theme={theme}
            onFirstGearDrag={handleFirstGearDrag}
            onFirstGearRelease={handleFirstGearRelease}
          />
          <div style={{ position: "absolute", top: 12, left: 12, right: 12 }}>
            <RemainingTime B={B} E={E} rpm={manualRpm} theme={theme} />
          </div>
          {explanationVisible && (
            <ExplanationPanel
              B={B} E={E} rpm={manualRpm || 60} theme={theme} mode="manual"
              onContinue={() => setExplanationVisible(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // === Phase: auto-scene ===
  if (phase === "auto-scene") {
    return (
      <div style={baseStyle}>
        <Header title="자동 모드" />
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <GearTowerScene
            B={B}
            E={E}
            controller={autoController}
            theme={theme}
          />
          <div style={{ position: "absolute", top: 12, left: 12, right: 12 }}>
            <RemainingTime B={B} E={E} rpm={rpm} theme={theme} />
          </div>
          {explanationVisible && (
            <ExplanationPanel
              B={B} E={E} rpm={rpm} theme={theme} mode="auto"
              onContinue={() => setExplanationVisible(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
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
