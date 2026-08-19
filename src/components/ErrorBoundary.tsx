import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary caught:', error, errorInfo);

    // A code-split page's chunk can vanish out from under an already-open
    // tab the moment a new deploy goes live (old filename hash, new build no
    // longer serves it) — this shows up as a generic crash for something
    // that isn't a real bug, just a stale asset reference. One automatic
    // reload fetches the current app shell and resolves it; a session flag
    // stops a genuinely-broken chunk from reload-looping the user forever.
    const msg = error?.message || '';
    const isChunkLoadError = /dynamically imported module|Failed to fetch dynamically|Loading chunk|Loading CSS chunk|ChunkLoadError/i.test(msg);
    if (isChunkLoadError && !sessionStorage.getItem('chunk-reload-attempted')) {
      sessionStorage.setItem('chunk-reload-attempted', '1');
      window.location.reload();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-stone-500 mb-6">
              We encountered an unexpected error. Please try refreshing the page or go back to the home screen.
            </p>
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/explore'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600">Error details</summary>
                <pre className="mt-2 p-3 bg-stone-100 rounded-lg text-xs text-stone-600 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
