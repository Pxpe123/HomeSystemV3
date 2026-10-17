import { Suspense, useDeferredValue, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AppLoading, AppUnavailable } from "../shared/ui/AppState";
import { usePlugins } from "./usePlugins";
import { useProfile } from "../context/ProfileContext";
import { ErrorBoundary } from "../components";
import { AppSurface } from "../shared/ui/AppSurface";

export function PluginLifecycles() {
  const { apps, manager } = usePlugins();
  const { isLoggedIn } = useProfile();
  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      for (const app of apps) {
        // Warm code/CSS only. Data fetching still belongs to each app lifecycle.
        manager.packages
          .get(app.id)
          ?.Page?.preload?.()
          .catch(() => {});
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [apps, manager, isLoggedIn]);
  if (!isLoggedIn) return null;
  return apps.map((app) => {
    const Controller = manager.packages.get(app.id)?.Controller;
    return Controller ? (
      <ErrorBoundary key={app.id}>
        <Controller />
      </ErrorBoundary>
    ) : null;
  });
}
export function PluginRoute() {
  const { appId } = useParams();
  const displayedId = useDeferredValue(appId);
  const { manager } = usePlugins();
  const Page = manager.isInstalled(displayedId)
    ? manager.packages.get(displayedId)?.Page
    : null;
  return (
    <AppSurface key={displayedId}>
      {Page ? (
        <ErrorBoundary key={displayedId}>
          <Suspense
            fallback={
              <AppLoading
                title={manager.registry.get(displayedId)?.name}
                icon={manager.packages.get(displayedId)?.icon}
                color={manager.registry.get(displayedId)?.color}
              />
            }
          >
            <Page />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <AppUnavailable />
      )}
    </AppSurface>
  );
}
export function PluginDashboards() {
  const { apps, manager } = usePlugins();
  return apps.map((app) => {
    const Widget = manager.packages.get(app.id)?.DashboardWidget;
    return Widget ? (
      <div
        className="hs-dashboard-slot"
        style={{ gridArea: app.dashboardSlot || app.id }}
        key={app.id}
      >
        <ErrorBoundary>
          <Widget />
        </ErrorBoundary>
      </div>
    ) : null;
  });
}
