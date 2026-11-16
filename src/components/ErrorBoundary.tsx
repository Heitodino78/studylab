import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Keep user content out of console logs. */ }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>Não foi possível abrir esta página.</h1><p>Seus dados permanecem no navegador. Recarregue para tentar novamente.</p><button onClick={() => window.location.reload()}>Recarregar o StudyLab</button></main>;
    return this.props.children;
  }
}
