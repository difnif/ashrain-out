import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: "monospace", background: "#1E1B18", color: "#E8A598", minHeight: "100vh" }}>
        <h2>ashrain.out 오류 발생</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 20, color: "#E8DDD4" }}>
          {this.state.error.message}
        </pre>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, marginTop: 10, color: "#9B8E82" }}>
          {this.state.error.stack}
        </pre>
        <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
          style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, background: "#E8A598", color: "white", border: "none", fontSize: 14, cursor: "pointer" }}>
          데이터 초기화 후 새로고침
        </button>
      </div>
    );
    return this.props.children;
  }
}
