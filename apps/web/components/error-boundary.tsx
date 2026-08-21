"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

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
      <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-5 px-4 py-8">
        <div className="w-full rounded-2xl border border-blush-200 bg-blush-100 p-6 shadow-card">
          <div className="flex items-center gap-2.5 text-blush-900">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold tracking-tight">Something went wrong</h2>
          </div>
          <p className="mt-2.5 text-sm leading-6 text-blush-800">{this.state.error.message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            window.location.href = "/";
          }}
          className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-800"
        >
          Back to home
        </button>
      </section>
    );
  }
}
