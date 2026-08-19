"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Error boundary caught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-start justify-center gap-4 px-4 py-8">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-lg font-semibold text-rose-900">Something went wrong</h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">{this.state.error.message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            window.location.href = "/";
          }}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back to home
        </button>
      </section>
    );
  }
}