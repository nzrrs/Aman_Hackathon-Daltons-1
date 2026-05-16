import React from "react";
import { useStore } from "../store.jsx";
import { STATUS_CONFIG, CITIES } from "../data/seed.js";

export default function FilterBar() {
  const {
    filter,
    setFilter,
    view,
    showHeatmap,
    setShowHeatmap,
    resolutionUndo,
    undoLastResolution,
  } = useStore();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!resolutionUndo) return undefined;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [resolutionUndo]);

  const undoSecondsLeft = React.useMemo(() => {
    if (!resolutionUndo) return 0;
    return Math.max(0, Math.ceil((resolutionUndo.expiresAt - now) / 1000));
  }, [resolutionUndo, now]);

  return (
    <div
      style={{
        padding: "10px 24px",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text3)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Filtrer :
      </span>

      {/* City filter */}
      <select
        value={filter.city}
        onChange={(e) => setFilter({ city: e.target.value })}
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          color: "var(--text)",
          padding: "6px 12px",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "var(--font-body)",
          cursor: "pointer",
        }}
      >
        <option value="all">Toutes les villes</option>
        {CITIES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { value: "all", label: "Tous" },
          ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({
            value: k,
            label: v.label,
          })),
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter({ status: value })}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor:
                filter.status === value ? "var(--accent)" : "var(--border2)",
              background:
                filter.status === value
                  ? "rgba(0,180,216,0.12)"
                  : "transparent",
              color: filter.status === value ? "var(--accent)" : "var(--text2)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          Résolu = signal communautaire (non vérifié)
        </span>
        {resolutionUndo && (
          <button
            onClick={undoLastResolution}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(245,158,11,0.35)",
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              fontSize: 12,
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↩ Annuler résolution ({undoSecondsLeft}s)
          </button>
        )}
        {view === "map" && (
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border2)",
              background: showHeatmap ? "rgba(0,180,216,0.12)" : "transparent",
              color: showHeatmap ? "var(--accent)" : "var(--text2)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {showHeatmap ? "Heatmap ON" : "Heatmap OFF"}
          </button>
        )}
      </div>
    </div>
  );
}
