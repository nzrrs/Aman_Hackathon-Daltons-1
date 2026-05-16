import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function AppModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 8, 13, 0.72)",
        backdropFilter: "blur(2px)",
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 14,
          border: "1px solid var(--border2)",
          background: "var(--bg2)",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
              {title}
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid var(--border2)",
                background: "var(--bg3)",
                color: "var(--text2)",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          {description && (
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>
              {description}
            </p>
          )}
        </div>
        <div style={{ padding: 16 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: "12px 16px 14px",
              borderTop: "1px solid var(--border)",
              background: "rgba(20, 28, 40, 0.45)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, document.body);
}
