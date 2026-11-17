"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconX } from "./Icon";

const EXIT_MS = 160;

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState(open);

  if (open && !rendered) {
    setRendered(true);
  }

  useEffect(() => {
    if (open) return;
    if (!rendered) return;
    const timer = window.setTimeout(() => setRendered(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!rendered) return null;

  const closing = !open;

  return (
    <div
      className="modal-backdrop"
      data-closing={closing ? "true" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="body">{children}</div>
        {footer ? <div className="foot">{footer}</div> : null}
      </div>
    </div>
  );
}
