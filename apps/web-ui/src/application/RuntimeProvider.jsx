import { useEffect } from "react";
import { runtime, server } from "./services";
import { PluginLifecycles } from "./PluginHost";
import { useLocation } from "react-router-dom";
import { NotificationFeedback } from "../features/notifications/NotificationFeedback";
import { useHome } from "./useHome";

export function RuntimeProvider({ children }) {
  const preferences = useHome((state) => state.preferences);
  useEffect(() => {
    document.documentElement.dataset.reducedEffects = String(
      preferences.reducedEffects,
    );
    return () => {
      delete document.documentElement.dataset.reducedEffects;
    };
  }, [preferences.reducedEffects]);
  const { pathname } = useLocation();
  useEffect(() => {
    const id = pathname.split("/")[2];
    if (id) runtime.open(id);
    document.title = `${id || "Home"} · HomeSystem`;
  }, [pathname]);
  useEffect(() => {
    const feedback = new NotificationFeedback(runtime, window);
    feedback.start();
    const onNotification = server.on("notification", (event) =>
      runtime.notify({
        title: event.data?.title || "Home update",
        message: event.data?.content,
        appId: event.data?.appName,
      }),
    );
    return () => {
      onNotification();
      feedback.stop();
    };
  }, []);
  return (
    <>
      <PluginLifecycles />
      {children}
    </>
  );
}
