import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors and shows a recovery UI.
 * Wraps the entire app so a crash in one page doesn't blank the screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Wheelhouse error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearData = async () => {
    if (
      window.confirm(
        "This will clear all local data and reset the app. Are you sure?"
      )
    ) {
      const { db } = await import("@/db");
      await db.delete();
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 text-4xl">⚠</div>
          <h1 className="text-xl font-bold text-wh-text">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-sm text-sm text-wh-text-muted">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-wh-accent px-5 py-2.5 text-sm font-medium text-wh-bg transition-colors hover:bg-wh-accent-hover"
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-lg border border-wh-border px-5 py-2.5 text-sm text-wh-text-muted transition-colors hover:text-wh-text"
            >
              Go home
            </button>
          </div>
          <button
            onClick={this.handleClearData}
            className="mt-8 text-xs text-wh-text-muted/50 hover:text-wh-danger"
          >
            Reset all data
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
