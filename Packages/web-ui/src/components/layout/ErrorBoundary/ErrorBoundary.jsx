import { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import './ErrorBoundary.css'

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isMinimized: false 
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    console.error('Error caught by boundary:', error, errorInfo)
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleEscape)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEscape)
  }

  handleEscape = (e) => {
    if (e.key === 'Escape' && this.state.hasError && !this.state.isMinimized) {
      this.handleMinimize()
    }
  }

  handleMinimize = () => {
    this.setState({ isMinimized: true })
  }

  handleReopen = () => {
    this.setState({ isMinimized: false })
  }

  handleOverlayClick = (e) => {
    if (e.target.classList.contains('vite-error-overlay')) {
      this.handleMinimize()
    }
  }

  parseErrorLocation = () => {
    const { error, errorInfo } = this.state
    
    // Try to parse from error stack first
    if (error?.stack) {
      const stackLines = error.stack.split('\n')
      
      // Look for the first line that contains our source files (not node_modules)
      for (let line of stackLines) {
        // Match patterns like: at ComponentName (http://localhost:5173/src/pages/Home/Home.jsx:21:6)
        // Remove the ?t=... timestamp and URL prefix
        const match = line.match(/(?:at\s+)?(?:(\w+)\s+)?\(?.+?\/([^/]+\.jsx?)(?:\?[^:]*)?:(\d+):(\d+)\)?/)
        if (match && !line.includes('node_modules')) {
          const [, componentName, fileName, lineNum, colNum] = match
          return {
            file: fileName,
            line: lineNum,
            column: colNum,
            component: componentName
          }
        }
      }
    }

    // Try to parse from componentStack
    if (errorInfo?.componentStack) {
      const stackLines = errorInfo.componentStack.split('\n')
      for (let line of stackLines) {
        const match = line.match(/at\s+(\w+)\s+\(.+?\/([^/]+\.jsx?)(?:\?[^:]*)?:(\d+):(\d+)\)/)
        if (match) {
          const [, componentName, fileName, lineNum, colNum] = match
          return {
            file: fileName,
            line: lineNum,
            column: colNum,
            component: componentName
          }
        }
      }
    }

    return null
  }

  formatStackTrace = (stack) => {
    if (!stack) return ''
    
    // Clean up the stack trace to remove URLs and timestamps
    return stack.split('\n').map(line => {
      // Remove the full URL and just keep the filename
      return line.replace(/http:\/\/[^/]+\/src\/(.+?)(?:\?[^:]*)?:/g, '$1:')
                .replace(/http:\/\/[^/]+\/node_modules\/.+$/g, '[node_modules]')
    }).join('\n')
  }

  render() {
    if (this.state.hasError) {
      const errorName = this.state.error?.name || 'Error'
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'Unknown error'
      const stack = this.formatStackTrace(this.state.error?.stack || '')
      const location = this.parseErrorLocation()

      return (
        <>
          <div className="error-fallback">
            <p>Component failed to load</p>
          </div>
          
          {this.state.isMinimized ? (
            <div className="vite-error-indicator" onClick={this.handleReopen} title="Click to show error details">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 3L3 17h14L10 3z" fill="#f87171"/>
                <path d="M10 7v5M10 14v.5" stroke="#141414" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          ) : (
            <div className="vite-error-overlay" onClick={this.handleOverlayClick}>
              <div className="vite-error-window" onClick={(e) => e.stopPropagation()}>
                <div className="vite-error-header">
                  <div className="vite-error-title">
                    <span className="vite-error-plugin">[plugin:react]</span>
                    <span className="vite-error-type">{errorName}: {errorMessage}</span>
                  </div>
                  <button className="vite-error-close" onClick={this.handleMinimize}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
                
                <div className="vite-error-body">
                  {location && (
                    <div className="vite-error-location">
                      <span className="vite-error-file">{location.file}</span>
                      <span className="vite-error-line">:{location.line}:{location.column}</span>
                    </div>
                  )}

                  <div className="vite-error-message">
                    {errorMessage}
                  </div>

                  {stack && (
                    <details className="vite-error-stack" open>
                      <summary>Stack trace</summary>
                      <pre>{stack}</pre>
                    </details>
                  )}

                  <div className="vite-error-hint">
                    Click outside, press <kbd>Esc</kbd> key, or fix the code to dismiss.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }

    return this.props.children
  }
}

export default function ErrorBoundary({ children }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>
}