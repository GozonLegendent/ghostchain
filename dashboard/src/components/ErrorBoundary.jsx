import { Component } from "react";

// Contains a crash to the subtree it wraps instead of letting React unmount
// the entire app root. Without this, an error thrown anywhere inside a
// wrapped component (e.g. a WebGL/Three.js render error) takes down the
// whole page — including routes like Login that have nothing to do with it.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-[400px] w-full flex-col items-center justify-center gap-3 border border-red-500/30 bg-red-500/5 p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-red-400">
              // render error contained
            </p>
            <p className="max-w-md text-sm text-slate-400">
              This panel failed to render, but the rest of the dashboard is unaffected.
            </p>
            <button
              onClick={this.handleRetry}
              className="cut-corner font-display mt-2 bg-cyan-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-cyan-400"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
