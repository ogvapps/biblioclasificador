import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error no controlado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
              Se produjo un error inesperado
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              La aplicación encontró un problema de visualización. Tus libros y datos guardados permanecen seguros en la memoria local.
            </p>

            {this.state.error && (
              <div className="bg-slate-100 rounded-xl p-3 text-left mb-6 text-xs text-slate-700 font-mono overflow-x-auto max-h-36 custom-scrollbar border border-slate-200">
                <span className="font-bold text-red-600 block mb-1">Detalle del error:</span>
                {this.state.error.message || 'Error desconocido'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold transition-colors"
              >
                <Home className="w-4 h-4" />
                Intentar continuar
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold shadow-md shadow-indigo-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Recargar aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
