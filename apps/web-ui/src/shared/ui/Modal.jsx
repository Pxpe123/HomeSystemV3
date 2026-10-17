import { useEffect, useRef } from "react";
import "./primitives.css";

/** Browser modal provides focus trapping and inert background; caller owns the outcome. */
export function Modal({
  title,
  description,
  children,
  onClose,
  id = "hs-modal-title",
}) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const opener = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      className="hs-modal"
      ref={ref}
      aria-labelledby={id}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={id}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="hs-modal-actions">{children}</div>
    </dialog>
  );
}
