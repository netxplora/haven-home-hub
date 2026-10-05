import { Component, ErrorInfo, ReactNode } from "react";

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-secondary p-4 font-sans text-foreground dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-secondary rounded-xl shadow-xl border border-border dark:border-slate-800 p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                An unexpected error occurred in the application. We apologize for the inconvenience.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-muted dark:bg-secondary rounded-lg text-left overflow-auto max-h-48 border border-border dark:border-border">
                <p className="font-mono text-xs text-red-600 dark:text-red-400 font-semibold mb-2">
                  {this.state.error.toString()}
                </p>
                <pre className="font-mono text-[10px] text-muted-foreground dark:text-muted-foreground whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary outline-none"
              >
                <RefreshCcw className="h-4 w-4" />
                Try again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-muted dark:bg-secondary text-foreground dark:text-slate-100 font-medium rounded-lg hover:bg-muted dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 outline-none border border-border dark:border-border"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
