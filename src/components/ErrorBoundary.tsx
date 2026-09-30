import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Uncaught App Error Caught by Boundary]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center text-on-surface">
          <div className="w-16 h-16 rounded-3xl bg-error/10 text-error flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="font-headline-md text-xl font-black text-on-surface mb-2">
            Something unexpected occurred
          </h1>
          <p className="text-xs text-on-surface-variant max-w-sm mb-6">
            The application encountered a minor hiccup. Tap below to reload your dashboard.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-2xl bg-primary text-on-primary font-black text-xs shadow-md active:scale-95 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
