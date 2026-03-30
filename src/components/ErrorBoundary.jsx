import { Component } from "react";

function logError(error, info) {
  try {
    const logs = JSON.parse(sessionStorage.getItem("ar_error_log") || "[]");
    logs.push({
      time: new Date().toISOString(),
      error: error?.message || String(error),
      stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
      component: info?.componentStack?.split("\n").slice(0, 3).join("\n"),
    });
    sessionStorage.setItem("ar_error_log", JSON.stringify(logs.slice(-20)));
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => logError(e.error || e.message, { componentStack: "global" }));
  window.addEventListener("unhandledrejection", (e) => logError(e.reason, { componentStack: "promise" }));
}

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { logError(error, info); console.error("ErrorBoundary:", error, info); }

  render() {
    if (this.state.error) {
      const logs = (() => { try { return JSON.parse(sessionStorage.getItem("ar_error_log") || "[]"); } catch { return []; } })();
      return (
        <div style={{ padding: 24, background: "#1E1B18", color: "#E8DDD4", minHeight: "100vh", fontFamily: "monospace" }}>
          <h2 style={{ color: "#E8A598", marginBottom: 8 }}>ashrain.out 오류 발생</h2>
          <p style={{ fontWeight: 700, marginBottom: 12 }}>{this.state.error.message}</p>
          <pre style={{ fontSize: 11, color: "#9B8E82", whiteSpace: "pre-wrap", marginBottom: 16, lineHeight: 1.6 }}>
            {this.state.error.stack}
          </pre>
          {logs.length > 1 && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 12, color: "#E8A598", cursor: "pointer", marginBottom: 8 }}>오류 기록 ({logs.length}건)</summary>
              {logs.slice().reverse().map((l, i) => (
                <div key={i} style={{ fontSize: 10, color: "#9B8E82", borderTop: "1px solid #3D3630", padding: "6px 0" }}>
                  <span style={{ color: "#E8A598" }}>{l.time}</span> {l.error}
                </div>
              ))}
            </details>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => this.setState({ error: null })} style={{
              padding: "14px 24px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #E8A598, #DCAE96)",
              color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>다시 시도</button>
            <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} style={{
              padding: "14px 24px", borderRadius: 14, border: "1px solid #E8A598",
              background: "transparent", color: "#E8A598", fontSize: 14, cursor: "pointer",
            }}>데이터 초기화</button>
            <button onClick={() => {
              const text = `[ashrain.out]\n${this.state.error.message}\n${this.state.error.stack}\n\n[로그]\n${logs.map(l => `${l.time}: ${l.error}`).join("\n")}`;
              navigator.clipboard?.writeText(text).then(() => alert("복사됨!"));
            }} style={{
              padding: "14px 24px", borderRadius: 14, border: "1px solid #3D3630",
              background: "transparent", color: "#9B8E82", fontSize: 12, cursor: "pointer",
            }}>📋 오류 복사</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
