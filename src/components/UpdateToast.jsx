import { PASTEL } from "../config";

// ============================================================
// UpdateToast — 하단 고정 업데이트 알림 팝업
// ============================================================
// 특징:
// - 닫기 버튼 없음 (업데이트할 때까지 계속 노출)
// - PASTEL.coral 기반 강조 톤 (눈에 확 띄게)
// - 펄스 애니메이션으로 인지율 극대화
// - 업데이트 버튼 클릭 시 onUpdate() 호출

export default function UpdateToast({ onUpdate, themeKey = "light" }) {
  const isDark = themeKey === "dark";

  return (
    <>
      <style>{`
        @keyframes updateToastSlideUp {
          from { transform: translate(-50%, 120%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes updateTogglePulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(232, 165, 152, 0.45), 0 0 0 0 rgba(232, 165, 152, 0.7); }
          50% { box-shadow: 0 8px 32px rgba(232, 165, 152, 0.55), 0 0 0 12px rgba(232, 165, 152, 0); }
        }
        @keyframes updateBtnShine {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .ashrain-update-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translate(-50%, 0);
          z-index: 99999;
          animation: updateToastSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both,
                     updateTogglePulse 2.2s ease-in-out 0.5s infinite;
          max-width: calc(100vw - 32px);
          width: 340px;
        }
        .ashrain-update-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(217, 95, 75, 0.45);
        }
        .ashrain-update-btn:active {
          transform: translateY(0) scale(0.98);
        }
      `}</style>

      <div
        className="ashrain-update-toast"
        role="alert"
        aria-live="assertive"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #2A2622 0%, #3D2F2A 100%)"
            : "linear-gradient(135deg, #FFFFFF 0%, #FFF8F0 100%)",
          border: `2px solid ${PASTEL.coral}`,
          borderRadius: 18,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icon */}
        <div
          style={{
            flexShrink: 0,
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${PASTEL.coral}, #D95F4B)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 4px 12px rgba(217, 95, 75, 0.35)",
          }}
        >
          ✨
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: isDark ? "#F8FAFC" : "#4A3F35",
              marginBottom: 2,
              letterSpacing: "-0.01em",
            }}
          >
            새 버전이 준비됐어요!
          </div>
          <div
            style={{
              fontSize: 11,
              color: isDark ? "#9B8E82" : "#8B7E74",
              lineHeight: 1.4,
            }}
          >
            업데이트 버튼을 눌러 적용해주세요
          </div>
        </div>

        {/* Update button */}
        <button
          className="ashrain-update-btn"
          onClick={onUpdate}
          style={{
            flexShrink: 0,
            padding: "10px 18px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(90deg, ${PASTEL.coral} 0%, #D95F4B 50%, ${PASTEL.coral} 100%)`,
            backgroundSize: "200% 100%",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(217, 95, 75, 0.35)",
            transition: "all 0.2s ease",
            animation: "updateBtnShine 3s linear infinite",
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          업데이트
        </button>
      </div>
    </>
  );
}
