import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { ErrorFallback } from './ErrorFallback'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  private handleGoHome = () => {
    window.location.assign('/')
  }

  private handleRetry = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return <ErrorFallback onHome={this.handleGoHome} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}
