import { Suspense } from "react";
import { ErrorBoundary } from "../components";
import { AppLoading, AppUnavailable } from "../shared/ui/AppState";
import { usePlugins } from "./usePlugins";
export function PluginRoutePage({ id, view = "Page", embedded = false }) {
  const { manager } = usePlugins();
  const Page = manager.isInstalled(id)
    ? manager.packages.get(id)?.[view]
    : null;
  return Page ? (
    <ErrorBoundary key={id}>
      <Suspense
        fallback={
          embedded ? null : (
            <AppLoading
              title={manager.registry.get(id)?.name}
              icon={manager.packages.get(id)?.icon}
              color={manager.registry.get(id)?.color}
            />
          )
        }
      >
        <Page embedded={embedded} />
      </Suspense>
    </ErrorBoundary>
  ) : (
    <AppUnavailable />
  );
}
