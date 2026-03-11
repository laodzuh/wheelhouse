import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
          <div className="max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
            <h1 className="mb-2 text-xl font-semibold text-gray-100">
              Something went wrong
            </h1>
            <p className="mb-4 text-sm text-gray-400">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
