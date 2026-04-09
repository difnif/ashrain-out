import { useEffect, useState } from "react";
import { RPM_EXAMPLES, findClosestExample } from "./rpmExamples";

// 4단계 설명 슬라이드인 패널
// 자동 모드: 5초 후 자동 등장 / 수동 모드: 학생이 한 번이라도 돌리면 5초 후 등장
export default function ExplanationPanel({
  B, E, rpm, theme, onContinue, mode, collapsible = false,
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const closest = findClosestExample(rpm || 60);

  const steps = [
    {
      title: "거듭제곱이란?",
      body: (
        <>
          <p style={{ margin: "0 0 8px" }}>
            여러분이 셋팅한 값은 <b>{B}<sup>{E}</sup></b>입니다.
          </p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            "{B}을 {E}번 곱한다"는 뜻이에요. 톱니가 {B}개인 기어가 {E}단으로 직렬 연결되면,
            맨 앞 기어가 {B}<sup>{E}</sup>번 돌아야 맨 뒤 기어가 단 1번 돕니다.
          </p>
        </>
      ),
    },
    {
      title: "내가 셋팅한 RPM은 어디쯤?",
      body: (
        <div>
          <p style={{ margin: "0 0 10px", opacity: 0.85 }}>
            현재 RPM: <b>{Math.round(rpm)}</b> · 가장 비슷한 건 <b>{closest.label}</b>이에요.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {RPM_EXAMPLES.map((ex) => {
              const isClosest = ex.label === closest.label;
              return (
                <div key={ex.label} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  padding: "3px 8px",
                  background: isClosest ? theme.accent + "33" : "transparent",
                  borderRadius: 6,
                  fontWeight: isClosest ? 500 : 400,
                }}>
                  <span>{isClosest ? "→ " : "  "}{ex.label}</span>
                  <span style={{ opacity: 0.7 }}>{ex.rpm.toLocaleString()} rpm</span>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      title: "그래서 얼마나 걸리느냐",
      body: (
        <>
          <p style={{ margin: "0 0 8px" }}>
            그 RPM으로 쉬지 않고 돌려도, 마지막 기어가 <b>1바퀴</b>를 도는 데
            우주 나이를 통째로 써도 한참 모자라요.
          </p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            우리 인생, 지구 나이, 심지어 우주 나이까지 더해도 — 이 기어는 인간이 의미를 둘 만큼 움직이지 않습니다.
            거듭제곱은 그렇게 무자비하게 커져요.
          </p>
        </>
      ),
    },
    {
      title: "그래도 한 번 보고 갈래요?",
      body: (
        <>
          <p style={{ margin: "0 0 8px" }}>
            이제 본 화면으로 돌아갑니다. 빈 공간을 드래그해서 시점을 돌려볼 수 있고,
            두 손가락으로 살짝 확대할 수 있어요. 시간 표시는 <b>년 ⇄ 광년</b>으로 토글 가능합니다.
          </p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
            (광년은 거리 단위지만, 그 시간 동안 빛이 갈 수 있는 거리로 환산해서 보여줘요.)
          </p>
        </>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const cur = steps[step];

  // 최소화 상태 — 작은 버튼만 남김
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "absolute",
          left: "50%",
          bottom: 20,
          transform: "translateX(-50%)",
          padding: "10px 18px",
          borderRadius: 20,
          border: `2px solid ${theme.border}`,
          background: theme.bg,
          color: theme.text,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          zIndex: 50,
        }}
      >📖 설명 다시 보기</button>
    );
  }

  return (
    <div style={{
      position: "absolute",
      left: "50%",
      bottom: visible ? 20 : -400,
      transform: "translateX(-50%)",
      width: "min(420px, 92vw)",
      maxHeight: "70vh",
      overflowY: "auto",
      background: theme.bg,
      border: `2px solid ${theme.border}`,
      borderRadius: 16,
      padding: 18,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      transition: "bottom 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)",
      color: theme.text,
      zIndex: 50,
    }}>
      {/* 상단: 진행바 + 최소화 버튼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= step ? theme.accent : theme.border,
            }} />
          ))}
        </div>
        {collapsible && (
          <button
            onClick={() => setMinimized(true)}
            title="설명 접기"
            style={{
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >접기 ▾</button>
        )}
      </div>
      <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 500 }}>{cur.title}</h3>
      <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{cur.body}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.text,
              fontSize: 13,
              cursor: "pointer",
            }}
          >이전</button>
        )}
        {!isLast ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: theme.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >다음</button>
        ) : (
          <button
            onClick={onContinue}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: theme.accent,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >계속 관람하기 →</button>
        )}
      </div>
    </div>
  );
}
