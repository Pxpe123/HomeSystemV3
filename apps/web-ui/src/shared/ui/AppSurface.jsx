import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHome } from "../../application/useHome";
import { useSwipeNavigation } from "../hooks/useSwipeNavigation";
import "./AppSurface.css";

/** Only the left edge owns the exit gesture; app controls and scrolling stay native. */
export function AppSurface({ children }) {
  const navigate = useNavigate();
  const reducedEffects = useHome((state) => state.preferences.reducedEffects);
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef(null);
  useEffect(() => () => clearTimeout(exitTimer.current), []);
  const { offset, dragging, handlers } = useSwipeNavigation({
    index: 1,
    count: 2,
    onChange: (next) => {
      if (next !== 0 || leaving) return;
      if (
        reducedEffects ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        navigate("/");
        return;
      }
      setLeaving(true);
      exitTimer.current = setTimeout(() => navigate("/"), 380);
    },
  });
  const distance = Math.max(0, offset);
  return (
    <div className="hs-app-surface" data-leaving={leaving}>
      <div
        className="hs-app-sheet"
        inert={leaving}
        style={{
          transform: leaving
            ? "translate3d(100%, 0, 0)"
            : `translate3d(${distance}px, 0, 0)`,
          transition: dragging ? "none" : undefined,
        }}
      >
        {children}
      </div>
      <div
        className="hs-app-exit-edge"
        {...handlers}
        aria-hidden="true"
        title="Swipe right to return home"
      >
        <span />
      </div>
      {dragging && distance > 12 && (
        <span className="hs-app-exit-hint" aria-hidden="true">
          Swipe right to return home
        </span>
      )}
    </div>
  );
}
