import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useStore } from "../store.jsx";

function formatTs(ms) {
  return format(new Date(ms), "dd MMM HH:mm", { locale: fr });
}

export default function TimelineReplay() {
  const {
    replay,
    playReplay,
    pauseReplay,
    setReplaySpeed,
    setReplayCursor,
    setReplayWindowDays,
  } = useStore();

  const handlePlayPause = () => {
    if (replay.isPlaying) {
      pauseReplay();
      return;
    }

    if (replay.currentMs >= replay.endMs) {
      setReplayCursor(replay.startMs);
    }
    playReplay();
  };

  return (
    <div
      style={{
        background: "var(--bg2)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <button
        onClick={handlePlayPause}
        style={{
          border: "1px solid var(--border2)",
          background: replay.isPlaying ? "rgba(239,68,68,0.1)" : "rgba(0,180,216,0.1)",
          color: replay.isPlaying ? "#ef4444" : "var(--accent)",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {replay.isPlaying ? "⏸ Pause" : "▶ Play"}
      </button>

      <select
        value={replay.speed}
        onChange={(e) => setReplaySpeed(Number(e.target.value))}
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          color: "var(--text)",
          padding: "6px 8px",
          borderRadius: 8,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <option value={1}>1x</option>
        <option value={4}>4x</option>
      </select>

      <div style={{ display: "flex", gap: 6 }}>
        {[
          { days: 1, label: "1J" },
          { days: 7, label: "7J" },
          { days: 14, label: "14J" },
        ].map(({ days, label }) => (
          <button
            key={days}
            onClick={() => setReplayWindowDays(days)}
            style={{
              border: "1px solid var(--border2)",
              background: replay.windowDays === days ? "rgba(0,180,216,0.12)" : "transparent",
              color: replay.windowDays === days ? "var(--accent)" : "var(--text2)",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--text3)", width: 108, flexShrink: 0 }}>
        {formatTs(replay.currentMs)}
      </div>

      <input
        type="range"
        min={replay.startMs}
        max={replay.endMs}
        step={300000}
        value={replay.currentMs}
        onChange={(e) => setReplayCursor(Number(e.target.value))}
        style={{ flex: 1, cursor: "pointer" }}
      />

      <div style={{ fontSize: 11, color: "var(--text3)", width: 190, textAlign: "right" }}>
        Depuis {formatTs(replay.startMs)} · {replay.windowDays} jour{replay.windowDays > 1 ? "s" : ""}
      </div>
    </div>
  );
}
