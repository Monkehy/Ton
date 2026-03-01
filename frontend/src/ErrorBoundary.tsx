import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 p-6 text-slate-100">
          <h1 className="mb-2 text-lg font-semibold text-rose-400">页面出错</h1>
          <pre className="whitespace-pre-wrap break-all rounded bg-slate-800 p-3 text-sm">
            {this.state.error.message}
          </pre>
          <p className="mt-2 text-sm text-slate-400">请打开开发者工具 (F12) 查看 Console 获取详情</p>
        </div>
      );
    }
    return this.props.children;
  }
}
