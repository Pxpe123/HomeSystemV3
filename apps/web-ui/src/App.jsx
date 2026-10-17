import { Routes, Route, Outlet, Link } from "react-router-dom";
import { AppState } from "./shared/ui/AppState";
import { Home } from "./app/Index";
import { WebSocketProvider, ProfileProvider, useProfile } from "./context";
import { ErrorBoundary, LoginScreen } from "./components";
import { RuntimeProvider } from "./application/RuntimeProvider";
import { NotificationShade } from "./features/notifications/NotificationShade";
import { PluginRoute } from "./application/PluginHost";
import { PluginRoutePage } from "./application/PluginRoutePage";
import { usePlugins } from "./application/usePlugins";
import { AppLibrary } from "./features/app-library/AppLibrary";
import { SetupGate } from "./features/setup/SetupGate";

function AppLayout() {
  return (
    <div className="MainContainer MainContainer-ImageBG">
      <ErrorBoundary>
        <Outlet />
        <NotificationShade />
      </ErrorBoundary>
    </div>
  );
}
function ProtectedApp() {
  const { isLoggedIn } = useProfile();
  if (!isLoggedIn) return <LoginScreen />;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/app-library" element={<AppLibrary />} />
        <Route path="/app/:appId" element={<PluginRoute />} />
        <Route
          path="*"
          element={
            <AppState
              title="Page not found"
              description="This page is not part of your home display."
            >
              <Link className="hs-button" to="/">
                Back to home
              </Link>
            </AppState>
          }
        />
      </Route>
    </Routes>
  );
}
function ApplicationRoutes() {
  const { apps } = usePlugins();
  return (
    <Routes>
      {apps.flatMap((app) =>
        (app.extraRoutes || []).map((path) => (
          <Route
            key={path}
            path={path}
            element={<PluginRoutePage id={app.id} view="Callback" />}
          />
        )),
      )}
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
export default function App() {
  return (
    <WebSocketProvider>
      <SetupGate>
      <ProfileProvider>
        <RuntimeProvider>
          <ApplicationRoutes />
        </RuntimeProvider>
      </ProfileProvider>
      </SetupGate>
    </WebSocketProvider>
  );
}
