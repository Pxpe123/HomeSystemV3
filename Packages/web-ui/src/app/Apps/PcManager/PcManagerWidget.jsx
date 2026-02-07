import "./PcManagerWidget.css"

export default function PcManagerWidget() {
  return (
    <div className="pc-manager-widget">
      <div className="widget-header">
        <span className="widget-title">PC Manager</span>
        <span className="widget-status">Coming Soon</span>
      </div>

      <div className="widget-content">
        <p>Welcome to your PC management panel.</p>
      </div>

      <div className="widget-footer">
        <span className="widget-hint">Control and monitor your PCs here.</span>
      </div>
    </div>
  )
}
