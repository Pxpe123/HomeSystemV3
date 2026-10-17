import { useState } from "react";
import { Modal } from "../../shared/ui/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePlugins } from "../../application/usePlugins";
import { runtime } from "../../application/services";
import { AppTopBar } from "../../app/Apps/components";
import "../../app/Apps/AppPage.css";
import "./AppLibrary.css";

function UninstallDialog({ app, onClose, onConfirm }) {
  return (
    <Modal
      id="uninstall-title"
      title={`Uninstall ${app.name}?`}
      description="This stops the app’s background work, removes its widgets and deletes its saved local settings. You can install it again from this library."
      onClose={onClose}
    >
      <button className="hs-button secondary" autoFocus onClick={onClose}>
        Keep app
      </button>
      <button className="hs-button danger" onClick={onConfirm}>
        Uninstall app
      </button>
    </Modal>
  );
}
export function AppLibrary() {
  const { manager } = usePlugins();
  const [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  function install(app) {
    try {
      manager.install(app.id);
      setError("");
      runtime.notify({
        title: `${app.name} installed`,
        message: "The app is available in your launcher.",
        tone: "success",
      });
    } catch (failure) {
      setError(failure.message);
    }
  }
  function uninstall() {
    try {
      manager.uninstall(selected.id);
      runtime.notify({
        title: `${selected.name} uninstalled`,
        message: "Its background work and widgets have been stopped.",
        tone: "info",
      });
      setError("");
      setSelected(null);
    } catch (failure) {
      setError(failure.message);
      setSelected(null);
    }
  }
  return (
    <div className="app-page hs-app-library">
      <AppTopBar title="App library" />
      <div className="hs-library-content">
        <p className="hs-library-intro">
          Install apps on this display. Each package brings its own screens,
          widgets and background services.
        </p>
        {error && (
          <p className="hs-library-error" role="alert">
            {error}
          </p>
        )}
        <div className="hs-library-grid">
          {manager.registry.all().map((app) => {
            const installed = manager.isInstalled(app.id),
              icon = manager.packages.get(app.id)?.icon;
            return (
              <article className="hs-library-card" key={app.id}>
                <div
                  className="hs-library-app-icon"
                  style={{ color: app.color }}
                >
                  {icon && <FontAwesomeIcon icon={icon} />}
                </div>
                <div>
                  <h2>{app.name}</h2>
                  <p>{app.description}</p>
                  <small>
                    v{app.version} · {installed ? "Installed" : "Available"}
                    {app.required ? " · System app" : ""}
                  </small>
                </div>
                <button
                  disabled={app.required}
                  className={installed ? "" : "install"}
                  onClick={() => (installed ? setSelected(app) : install(app))}
                >
                  {app.required
                    ? "Required"
                    : installed
                      ? "Uninstall"
                      : "Install"}
                </button>
              </article>
            );
          })}
        </div>
        <p className="hs-library-note">
          Installations are saved on this display. Packages in this library are
          included with your HomeSystem deployment; installing external code or
          downloading marketplace apps is not enabled.
        </p>
      </div>
      {selected && (
        <UninstallDialog
          app={selected}
          onClose={() => setSelected(null)}
          onConfirm={uninstall}
        />
      )}
    </div>
  );
}
