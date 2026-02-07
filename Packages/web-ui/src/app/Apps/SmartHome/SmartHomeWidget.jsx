import "./SmartHomeWidget.css"

export default function SmartHomeWidget() {
  return (
    <div className="smart-home-widget">
      <div className="widget-header">
        <span className="widget-title">Smart Home</span>
        <span className="widget-status">Coming Soon</span>
      </div>

      <div className="widget-content">
        <p>Welcome to your smart home control panel.</p>
      </div>

      <div className="widget-footer">
        <span className="widget-hint">Controls & automations will appear here.</span>
      </div>
    </div>
  )
}
