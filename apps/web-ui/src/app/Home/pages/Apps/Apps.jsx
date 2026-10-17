import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePlugins } from "../../../../application/usePlugins";
import { useAppState } from "../../../../application/useAppState";
import { runtime } from "../../../../application/services";
import { LauncherLayout } from "../../../../core/LauncherLayout";
import { Modal } from "../../../../shared/ui/Modal";
import { Icon } from "../../../../shared/ui/Icon";
import "./Apps.css";

function AppTile({ app, icon, children }) {
  return (
    <div className="hs-launcher-tile">
      <Link
        to={app.path}
        className="hs-launcher-open"
        aria-label={app.name}
        title={app.name}
      >
        <span
          className="hs-launcher-icon"
          style={{ "--app-accent": app.color }}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
        <strong>{app.name}</strong>
        <small>{app.description}</small>
      </Link>
      {children}
    </div>
  );
}
export default function Apps() {
  const { apps, manager } = usePlugins();
  const launcherApps = useMemo(
    () => apps.filter((app) => app.launcher),
    [apps],
  );
  const defaults = useMemo(
    () => launcherApps.map((app) => ({ id: app.id, type: "app" })),
    [launcherApps],
  );
  const [saved, setSaved] = useAppState("launcher", "layout", defaults);
  const [savedView, setView] = useAppState("launcher", "viewMode", "expanded");
  const view = savedView === "compact" ? "compact" : "expanded";
  const model = useMemo(
    () =>
      new LauncherLayout(
        saved,
        launcherApps.map((app) => app.id),
      ),
    [saved, launcherApps],
  );
  const [editing, setEditing] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [folderName, setFolderName] = useState("");
  const byId = Object.fromEntries(launcherApps.map((app) => [app.id, app]));
  const folder = model.items.find(
    (item) => item.id === folderId && item.type === "folder",
  );
  const available = launcherApps.filter((app) => !model.placed().has(app.id));
  const change = (next) => setSaved(next.items);
  const controls = (item) => (
    <div className="hs-launcher-controls" data-no-swipe>
      <button
        aria-label={`Move ${item.name || byId[item.id]?.name} earlier`}
        disabled={model.items[0]?.id === item.id}
        onClick={() => change(model.move(item.id, -1))}
      >
        ←
      </button>
      <button
        aria-label={`Move ${item.name || byId[item.id]?.name} later`}
        disabled={model.items.at(-1)?.id === item.id}
        onClick={() => change(model.move(item.id, 1))}
      >
        →
      </button>
      <button
        aria-label={`Hide ${item.name || byId[item.id]?.name} from launcher`}
        onClick={() => change(model.remove(item.id))}
      >
        <Icon name="close" />
      </button>
    </div>
  );
  return (
    <div className="Page apps-page" data-view={view}>
      <header className="hs-launcher-header">
        <div>
          <span className="hs-eyebrow">AT YOUR FINGERTIPS</span>
          <h1>Your apps</h1>
          <p>Everything at home, a touch away.</p>
        </div>
        <div className="hs-launcher-toolbar">
          <div
            className="hs-launcher-view-switch"
            role="group"
            aria-label="App view"
            data-no-swipe
          >
            {["compact", "expanded"].map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                {mode === "compact" ? "Compact" : "Expanded"}
              </button>
            ))}
          </div>
          <Link className="hs-button secondary" to="/app-library">
            App library
          </Link>
          <button
            className="hs-button"
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Done" : "Organise"}
          </button>
        </div>
      </header>
      {editing && (
        <div className="hs-launcher-editbar" data-no-swipe>
          <span>Move, group or hide apps. Hiding does not uninstall.</span>
          <button
            className="hs-button secondary"
            onClick={() => change(model.createFolder(`folder-${runtime.id()}`))}
          >
            <Icon name="plus" />
            New folder
          </button>
          <button
            className="hs-button secondary"
            onClick={() => setSaved(defaults)}
          >
            Reset layout
          </button>
        </div>
      )}
      <div className="hs-launcher-scroll">
        <div className="hs-launcher-grid">
          {model.items.map((item) =>
            item.type === "app" ? (
              <AppTile
                key={item.id}
                app={byId[item.id]}
                icon={manager.packages.get(item.id)?.icon}
              >
                {editing && controls(item)}
              </AppTile>
            ) : (
              <div className="hs-launcher-tile" key={item.id}>
                <button
                  className="hs-launcher-open"
                  aria-label={item.name}
                  title={item.name}
                  onClick={() => {
                    setFolderId(item.id);
                    setFolderName(item.name);
                  }}
                >
                  <span className="hs-launcher-icon folder">
                    <Icon name="apps" />
                  </span>
                  <strong>{item.name}</strong>
                  <small>{item.children.length} apps</small>
                </button>
                {editing && controls(item)}
              </div>
            ),
          )}
        </div>
        {!model.items.length && (
          <p className="hs-launcher-empty">
            No apps on your launcher. Choose Organise to add installed apps, or
            browse the App library.
          </p>
        )}
        {editing && (
          <section className="hs-launcher-available">
            <h2>Add to launcher</h2>
            <div>
              {available.length ? (
                available.map((app) => (
                  <button
                    key={app.id}
                    className="hs-button secondary"
                    onClick={() => change(model.add(app.id))}
                  >
                    <Icon name="plus" />
                    {app.name}
                  </button>
                ))
              ) : (
                <p>All installed apps are on your launcher.</p>
              )}
            </div>
          </section>
        )}
      </div>
      {folder && (
        <Modal
          id="launcher-folder"
          title={folder.name}
          description={
            editing
              ? "Rename this folder or choose the apps inside it."
              : "Choose an app to open."
          }
          onClose={() => setFolderId(null)}
        >
          <div className="hs-launcher-folder-content">
            {editing && (
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  change(model.rename(folder.id, folderName));
                }}
              >
                <label htmlFor="folder-name">Folder name</label>
                <input
                  id="folder-name"
                  value={folderName}
                  maxLength={40}
                  onChange={(event) => setFolderName(event.target.value)}
                />
                <button className="hs-button" type="submit">
                  Rename
                </button>
              </form>
            )}
            {folder.children.map((id) => (
              <div className="hs-folder-app" key={id}>
                <Link className="hs-button secondary" to={byId[id].path}>
                  {byId[id].name}
                </Link>
                {editing && (
                  <button
                    className="hs-button secondary"
                    onClick={() => change(model.takeOut(id, folder.id))}
                  >
                    Move out
                  </button>
                )}
              </div>
            ))}
            {editing &&
              launcherApps
                .filter((app) => !folder.children.includes(app.id))
                .map((app) => (
                  <button
                    className="hs-button secondary"
                    key={app.id}
                    onClick={() => change(model.putInFolder(app.id, folder.id))}
                  >
                    <Icon name="plus" />
                    {app.name}
                  </button>
                ))}
            {!editing && !folder.children.length && (
              <p>This folder is empty. Organise your apps to add some.</p>
            )}
          </div>
          <button
            className="hs-button"
            autoFocus
            onClick={() => setFolderId(null)}
          >
            Done
          </button>
        </Modal>
      )}
    </div>
  );
}
