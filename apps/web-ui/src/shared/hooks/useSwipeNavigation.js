import { useEffect, useRef, useState } from "react";
import { SwipeGesture } from "../../core/SwipeGesture";

const interactive =
  'button,a,input,select,textarea,[role="button"],[draggable="true"],[data-no-swipe],.folder-overlay';
export function useSwipeNavigation({ index, count, onChange }) {
  const gesture = useRef(new SwipeGesture());
  const frame = useRef(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setOffset(0);
    setDragging(false);
  }
  return {
    offset,
    dragging,
    handlers: {
      onPointerDown(event) {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          event.target.closest(interactive)
        )
          return;
        gesture.current.begin(event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      },
      onPointerMove(event) {
        if (!gesture.current.start) return;
        const value = gesture.current.offset(event.clientX, event.clientY);
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          setOffset(value);
          frame.current = null;
        });
      },
      onPointerUp(event) {
        if (!gesture.current.start) return;
        const delta = gesture.current.end(event.clientX, event.clientY);
        reset();
        if (delta) onChange(Math.max(0, Math.min(count - 1, index + delta)));
      },
      onPointerCancel() {
        gesture.current.cancel();
        reset();
      },
    },
  };
}
