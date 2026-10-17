import { Component } from "react";
import { AppState } from "../../../shared/ui/AppState";

/** A failing plugin stays isolated; diagnostics stay in the developer console. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("HomeSystem component failed", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="hs-error-state">
        <AppState
          icon="warning"
          title="This part of your home needs attention"
          description="The rest of your display is still available. Try opening this part again."
        >
          <button
            className="hs-button"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
          <button
            className="hs-button secondary"
            onClick={() => window.location.reload()}
          >
            Reload display
          </button>
          {import.meta.env.DEV && (
            <details>
              <summary>Developer details</summary>
              <pre>{String(this.state.error)}</pre>
            </details>
          )}
        </AppState>
      </div>
    );
  }
}
