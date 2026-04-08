'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-card flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg text-gray-700">Something went wrong.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl px-6 font-semibold text-white"
            style={{
              minHeight: 'var(--touch-min)',
              minWidth: 'var(--touch-min)',
              backgroundColor: 'var(--kid-primary)',
            }}
          >
            Tap to retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
