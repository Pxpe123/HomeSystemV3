import { useEffect, useState } from "react";
import PageDots from "../../components/common/PageDots/PageDots";
import Overview from "./pages/Overview/Overview";
import { PluginRoutePage } from "../../application/PluginRoutePage";
import { runtime } from "../../application/services";
import { useSwipeNavigation } from "../../shared/hooks/useSwipeNavigation";
import Apps from "./pages/Apps/Apps";
import "./Home.css";

const pages = [
  { id: "overview", label: "Home", Component: Overview },
  { id: "apps", label: "Apps", Component: Apps },
  { id: "statistics", label: "Activity", Component: Activity },
  { id: "settings", label: "Settings", Component: Settings },
];
function Activity() {
  return <PluginRoutePage id="statistics" view="Panel" embedded />;
}
function Settings() {
  return <PluginRoutePage id="settings" view="Panel" embedded />;
}
function restorePage() {
  let value = runtime.getSnapshot().appData.home?.activePage;
  if (!Number.isInteger(value)) {
    try {
      value = Number(sessionStorage.getItem("hs3-home-active-page") || 0);
    } catch {
      value = 0;
    }
  }
  return Number.isInteger(value) && value >= 0 && value < pages.length
    ? value
    : 0;
}
export default function Home() {
  const [activePage, setActivePage] = useState(restorePage);
  const { offset, dragging, handlers } = useSwipeNavigation({
    index: activePage,
    count: pages.length,
    onChange: setActivePage,
  });
  useEffect(() => {
    runtime.setAppState("home", { activePage });
  }, [activePage]);
  return (
    <div className="Home-Container">
      <div
        className="Pages-Wrapper"
        data-dragging={dragging}
        style={{
          transform: `translateX(calc(${-activePage * 100}% + ${offset}px))`,
          transition: dragging ? "none" : undefined,
        }}
        {...handlers}
      >
        {pages.map(({ id, label, Component }, index) => (
          <section
            className="PageWrapper"
            key={id}
            aria-label={label}
            inert={index !== activePage}
            aria-hidden={index !== activePage}
          >
            <Component />
          </section>
        ))}
      </div>
      <PageDots
        count={pages.length}
        labels={pages.map((page) => page.label)}
        active={activePage}
        onChange={setActivePage}
      />
    </div>
  );
}
