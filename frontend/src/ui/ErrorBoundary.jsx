import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // Local only: no analytics, no reporting service.
    console.error(error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="flex min-h-dvh items-center px-6">
        <div className="mx-auto max-w-md">
          <div aria-hidden="true" className="mb-6 h-px w-16 bg-safelight" />
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-print">something went wrong.</h1>
          <p className="mt-4 text-[17px] leading-[27px] text-fog">
            start again to reload the story.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign(window.location.pathname + window.location.search)}
            className="mt-8 min-h-11 rounded-md bg-print px-5 text-base font-medium text-prussian hover:bg-white"
          >
            start again
          </button>
        </div>
      </main>
    )
  }
}
