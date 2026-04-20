// src/screens/AdminDissectScreen.jsx
// 해부실(Dissect) — 관리자 전용 문제 해부 도구
// 사진 업로드 → /api/dissect 호출 → 5가지 축으로 검토 결과 표시

import { useState, useRef, useCallback } from "react";
import { PASTEL } from "../config";
import {
  MathSpan,
  NumberVariationCard,
  GeneralRelationCard,
  ProofDemoCard,
  ShortcutCard,
  VerificationCard,
} from "./DissectResultCard";

const MODEL_LABELS = {
  "claude-opus-4-20250514": "Opus",
  "claude-sonnet-4-20250514": "Sonnet",
  "claude-haiku-4-5-20251001": "Haiku",
};

export function renderAdminDissectScreen(ctx) {
  const { theme, userRole, setScreen, ScreenWrap } = ctx;
  // 라우터 단 권한 가드 (App.jsx에서도 한 번 거름)
  if (userRole !== "admin") {
    setScreen("menu");
    return null;
  }
  return (
    <ScreenWrap title="🔬 해부실" back="관리자" backTo="admin">
      <AdminDissectInner ctx={ctx} />
    </ScreenWrap>
  );
}

function AdminDissectInner({ ctx }) {
  const { theme, playSfx, showMsg, analysisModel } = ctx;
  const [input, setInput] = useState("");
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const fileRef = useRef(null);

  const handleImage = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const mx = 1024;
      let w = img.width, h = img.height;
      if (w > mx || h > mx) {
        const s = mx / Math.max(w, h);
        w *= s; h *= s;
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const full = c.toDataURL("image/jpeg", 0.85);
      setImagePreview(full);
      setImageData(full.split(",")[1]);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const dissect = async () => {
    if (!input.trim() && !imageData) {
      showMsg("문제를 입력하거나 사진을 올려주세요", 2000);
      return;
    }
    if (loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    playSfx("click");

    setLoadingStage("문제를 읽고 있어요...");
    const t1 = setTimeout(() => setLoadingStage("숫자 변경 견고성 검토 중..."), 4000);
    const t2 = setTimeout(() => setLoadingStage("결과 관계의 일반성 분석 중..."), 9000);
    const t3 = setTimeout(() => setLoadingStage("증명 시연 작성 중..."), 14000);
    const t4 = setTimeout(() => setLoadingStage("편법 및 검산 검토 중..."), 19000);
    const t5 = setTimeout(() => setLoadingStage("거의 다 됐어요!"), 25000);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60초 (5축이라 길어짐)

    try {
      const resp = await fetch("/api/dissect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.trim() || undefined,
          imageBase64: imageData || undefined,
          model: analysisModel || undefined,
        }),
        signal: controller.signal,
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (data.problemText && !input.trim()) setInput(data.problemText);
      playSfx("success");
    } catch (e) {
      if (e.name === "AbortError") setError("해부 시간이 너무 오래 걸려요. 다시 시도해주세요.");
      else setError(e.message || "해부 실패");
      playSfx("error");
    } finally {
      clearTimeout(timeout);
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
      setLoading(false);
      setLoadingStage("");
    }
  };

  const reset = () => {
    setInput("");
    setImageData(null);
    setImagePreview(null);
    setResult(null);
    setError("");
    setRawJsonOpen(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.bg,
    color: theme.text,
    fontSize: 12,
    fontFamily: "'Noto Serif KR', serif",
    resize: "vertical",
    boxSizing: "border-box",
  };

  const btnPrimary = {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: `linear-gradient(135deg, ${PASTEL.coral}, ${PASTEL.dustyRose})`,
    color: "white",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };

  const btnSecondary = {
    padding: "12px 16px",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 16, overflowY: "auto" }}>
      {/* 헤더 안내 */}
      <div style={{
        padding: "10px 14px",
        borderRadius: 12,
        background: `${PASTEL.lavender}15`,
        border: `1px solid ${PASTEL.lavender}50`,
        marginBottom: 14,
        fontSize: 11,
        color: theme.text,
        lineHeight: 1.6,
      }}>
        <b>🔬 해부실</b> · 관리자 전용 AI 검토 도구<br />
        한 문제를 5가지 축으로 깊이 검토합니다 · 모델: <b>{MODEL_LABELS[analysisModel] || "Sonnet"}</b>
      </div>

      {/* 입력 영역 */}
      {!result && !loading && (
        <>
          {/* 이미지 업로드 */}
          <div style={{ marginBottom: 12 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              style={{ display: "none" }}
            />
            {imagePreview ? (
              <div style={{ position: "relative" }}>
                <img
                  src={imagePreview}
                  alt="업로드 미리보기"
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                  }}
                />
                <button
                  onClick={() => { setImagePreview(null); setImageData(null); }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    width: 28, height: 28, borderRadius: "50%",
                    border: "none", background: "rgba(0,0,0,0.6)",
                    color: "white", fontSize: 14, cursor: "pointer",
                  }}
                >×</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "30px 16px",
                  borderRadius: 12,
                  border: `2px dashed ${theme.border}`,
                  background: theme.card,
                  color: theme.textSec,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                📷 문제 사진 올리기 (탭)
              </button>
            )}
          </div>

          {/* 텍스트 입력 (선택) */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="또는 문제 텍스트를 직접 붙여넣기 (선택)"
            rows={4}
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          {/* 실행 버튼 */}
          <button
            onClick={dissect}
            disabled={!input.trim() && !imageData}
            style={{
              ...btnPrimary,
              width: "100%",
              opacity: (input.trim() || imageData) ? 1 : 0.4,
              marginBottom: 8,
            }}
          >
            🔬 해부 시작
          </button>
        </>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={{
          padding: "40px 20px",
          textAlign: "center",
          background: theme.card,
          borderRadius: 14,
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
          <div style={{ fontSize: 13, color: theme.text, fontWeight: 700, marginBottom: 8 }}>
            해부 중...
          </div>
          <div style={{ fontSize: 11, color: theme.textSec }}>
            {loadingStage}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div style={{
          padding: "12px 14px",
          marginBottom: 12,
          borderRadius: 10,
          background: `${PASTEL.coral}15`,
          border: `1px solid ${PASTEL.coral}`,
          color: theme.text,
          fontSize: 12,
        }}>
          ⚠️ {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: 10, padding: "2px 8px", borderRadius: 6,
              border: `1px solid ${PASTEL.coral}`, background: "transparent",
              color: PASTEL.coral, fontSize: 10, cursor: "pointer",
            }}
          >닫기</button>
        </div>
      )}

      {/* 결과 표시 */}
      {result && !loading && (
        <>
          {/* 문제 요약 헤더 */}
          <div style={{
            padding: 14,
            marginBottom: 14,
            borderRadius: 14,
            background: theme.card,
            border: `1px solid ${theme.border}`,
          }}>
            {(result.type || result.grade || result.chapter) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {result.grade && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 999,
                    background: `${PASTEL.sky}25`, fontSize: 10, fontWeight: 700,
                  }}>{result.grade}</span>
                )}
                {result.chapter && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 999,
                    background: `${PASTEL.mint}25`, fontSize: 10, fontWeight: 700,
                  }}>{result.chapter}</span>
                )}
                {result.type && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 999,
                    background: `${PASTEL.lavender}25`, fontSize: 10, fontWeight: 700,
                  }}>{result.type}</span>
                )}
              </div>
            )}
            {result.problemText && (
              <div style={{
                fontSize: 12, lineHeight: 1.7, color: theme.text,
                whiteSpace: "pre-wrap",
              }}>
                <MathSpan>{result.problemText}</MathSpan>
              </div>
            )}
          </div>

          {/* 5가지 검토 카드 */}
          <NumberVariationCard data={result.dissection?.numberVariation} theme={theme} />
          <GeneralRelationCard data={result.dissection?.generalRelation} theme={theme} />
          <ProofDemoCard data={result.dissection?.proofDemo} theme={theme} />
          <ShortcutCard data={result.dissection?.shortcut} theme={theme} />
          <VerificationCard data={result.dissection?.verification} theme={theme} />

          {/* Raw JSON 토글 (디버깅용) */}
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <button
              onClick={() => setRawJsonOpen(v => !v)}
              style={{
                ...btnSecondary,
                width: "100%",
                fontSize: 11,
              }}
            >
              {rawJsonOpen ? "▼" : "▶"} Raw JSON 응답 보기 (디버깅)
            </button>
            {rawJsonOpen && (
              <pre style={{
                marginTop: 8, padding: 12, borderRadius: 10,
                background: theme.bg, border: `1px solid ${theme.border}`,
                fontSize: 10, color: theme.textSec,
                overflowX: "auto", maxHeight: 300, overflowY: "auto",
                fontFamily: "monospace",
              }}>{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={reset} style={btnSecondary}>
              🔄 새 문제
            </button>
            <button onClick={dissect} style={btnPrimary}>
              🔬 다시 해부 (같은 입력)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
