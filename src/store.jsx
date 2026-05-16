import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { SEED_REPORTS } from "./data/seed.js";
import {
  generateSimulatedReport,
  pickSimulationResolution,
} from "./data/simulation.js";
import { buildReplayDataset, getReplaySnapshot } from "./data/replay.js";

const StoreCtx = createContext(null);

let nextId = 200;

const initialState = {
  reports: SEED_REPORTS,
  activeReport: null,
  filter: { city: "all", status: "all" },
  showHeatmap: true,
  view: "map", // 'map' | 'list' | 'report'
  toast: null,
  simulation: {
    running: false,
    frequencySec: 8,
  },
  replay: {
    isPlaying: false,
    speed: 1,
    currentMs: Date.now(),
    visible: true,
    windowDays: 1,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_REPORT":
      return { ...state, reports: [action.payload, ...state.reports] };
    case "UPVOTE": {
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, upvotes: r.upvotes + 1 } : r,
        ),
      };
    }
    case "UPDATE_STATUS": {
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r,
        ),
      };
    }
    case "PATCH_REPORT": {
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r,
        ),
      };
    }
    case "SET_ACTIVE":
      return { ...state, activeReport: action.id };
    case "SET_FILTER":
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_SHOW_HEATMAP":
      return { ...state, showHeatmap: action.showHeatmap };
    case "TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "SET_SIMULATION_RUNNING":
      return {
        ...state,
        simulation: { ...state.simulation, running: action.running },
      };
    case "SET_SIMULATION_FREQUENCY": {
      const nextSeconds = Number.isFinite(action.seconds)
        ? action.seconds
        : state.simulation.frequencySec;
      const safeSeconds = Math.min(60, Math.max(2, Math.round(nextSeconds)));
      return {
        ...state,
        simulation: { ...state.simulation, frequencySec: safeSeconds },
      };
    }
    case "SET_REPLAY_PLAYING":
      return {
        ...state,
        replay: { ...state.replay, isPlaying: action.isPlaying },
      };
    case "SET_REPLAY_SPEED": {
      const nextSpeed =
        action.speed === 1 || action.speed === 4 ? action.speed : 1;
      return {
        ...state,
        replay: { ...state.replay, speed: nextSpeed },
      };
    }
    case "SET_REPLAY_CURSOR":
      return {
        ...state,
        replay: { ...state.replay, currentMs: action.currentMs },
      };
    case "SET_REPLAY_VISIBLE":
      return {
        ...state,
        replay: { ...state.replay, visible: action.visible },
      };
    case "SET_REPLAY_WINDOW_DAYS": {
      const windowDays = [1, 7, 14].includes(action.windowDays)
        ? action.windowDays
        : 1;
      return {
        ...state,
        replay: { ...state.replay, windowDays },
      };
    }
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reportsRef = useRef(state.reports);

  useEffect(() => {
    reportsRef.current = state.reports;
  }, [state.reports]);

  const pushToast = useCallback((message) => {
    dispatch({ type: "TOAST", message });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }, []);

  const addReport = useCallback(
    (data) => {
      const report = {
        id: `r${++nextId}`,
        reportedAt: new Date().toISOString(),
        upvotes: 0,
        comments: 0,
        estimatedRestore: null,
        severity: "medium",
        ...data,
      };
      dispatch({ type: "ADD_REPORT", payload: report });
      pushToast("✅ Signalement soumis avec succès!");
      return report;
    },
    [pushToast],
  );

  const upvote = useCallback((id) => {
    dispatch({ type: "UPVOTE", id });
  }, []);

  const setActive = useCallback((id) => {
    dispatch({ type: "SET_ACTIVE", id });
  }, []);

  const setFilter = useCallback((filter) => {
    dispatch({ type: "SET_FILTER", filter });
  }, []);

  const setView = useCallback((view) => {
    dispatch({ type: "SET_VIEW", view });
  }, []);

  const setShowHeatmap = useCallback((showHeatmap) => {
    dispatch({ type: "SET_SHOW_HEATMAP", showHeatmap });
  }, []);

  const setSimulationFrequency = useCallback((seconds) => {
    dispatch({ type: "SET_SIMULATION_FREQUENCY", seconds });
  }, []);

  const startSimulation = useCallback(() => {
    dispatch({ type: "SET_SIMULATION_RUNNING", running: true });
    pushToast("🧪 Simulation démarrée");
  }, [pushToast]);

  const stopSimulation = useCallback(() => {
    dispatch({ type: "SET_SIMULATION_RUNNING", running: false });
    pushToast("⏹️ Simulation arrêtée");
  }, [pushToast]);

  const runSimulationTick = useCallback(() => {
    const currentReports = reportsRef.current;
    const resolution = pickSimulationResolution(currentReports);
    const shouldResolve = resolution && Math.random() < 0.42;

    if (shouldResolve) {
      dispatch({
        type: "PATCH_REPORT",
        id: resolution.id,
        patch: resolution.patch,
      });
      const statusLabel =
        resolution.patch.status === "resolved"
          ? "rétablie"
          : "stabilisée (partielle)";
      pushToast(
        `✅ [Simulation] ${resolution.neighborhood}, ${resolution.city} : situation ${statusLabel}`,
      );
      return;
    }

    const report = {
      id: `r${++nextId}`,
      reportedAt: new Date().toISOString(),
      upvotes: Math.floor(Math.random() * 26),
      comments: Math.floor(Math.random() * 10),
      ...generateSimulatedReport(),
    };
    dispatch({ type: "ADD_REPORT", payload: report });
    pushToast(
      `🧪 [Simulation] Nouveau signalement à ${report.neighborhood}, ${report.city}`,
    );
  }, [pushToast]);

  useEffect(() => {
    if (!state.simulation.running) return undefined;

    const timerId = setInterval(
      runSimulationTick,
      state.simulation.frequencySec * 1000,
    );
    return () => clearInterval(timerId);
  }, [
    state.simulation.running,
    state.simulation.frequencySec,
    runSimulationTick,
  ]);

  const replayDataset = useMemo(
    () => buildReplayDataset(state.reports, state.replay.windowDays),
    [state.reports, state.replay.windowDays],
  );

  const replayCurrentMs = Math.min(
    replayDataset.endMs,
    Math.max(replayDataset.startMs, state.replay.currentMs),
  );

  useEffect(() => {
    if (state.replay.currentMs === replayCurrentMs) return;
    dispatch({ type: "SET_REPLAY_CURSOR", currentMs: replayCurrentMs });
  }, [state.replay.currentMs, replayCurrentMs]);

  const replayReports = useMemo(
    () => getReplaySnapshot(replayDataset, replayCurrentMs, { playableOnly: true }),
    [replayDataset, replayCurrentMs],
  );

  const replayStatusReports = useMemo(
    () => getReplaySnapshot(replayDataset, replayCurrentMs, { playableOnly: false }),
    [replayDataset, replayCurrentMs],
  );

  useEffect(() => {
    if (!state.replay.isPlaying) return undefined;

    const baseStepMs =
      state.replay.windowDays === 1
        ? 15000
        : state.replay.windowDays === 7
          ? 120000
          : 300000;

    const timerId = setInterval(() => {
      const nextMs = Math.min(
        replayDataset.endMs,
        replayCurrentMs + baseStepMs * state.replay.speed,
      );
      dispatch({ type: "SET_REPLAY_CURSOR", currentMs: nextMs });
      if (nextMs >= replayDataset.endMs) {
        dispatch({ type: "SET_REPLAY_PLAYING", isPlaying: false });
      }
    }, 250);

    return () => clearInterval(timerId);
  }, [
    state.replay.isPlaying,
    state.replay.speed,
    state.replay.windowDays,
    replayCurrentMs,
    replayDataset.endMs,
  ]);

  const filteredReports = replayReports.filter((r) => {
    if (state.filter.city !== "all" && r.city !== state.filter.city)
      return false;
    if (state.filter.status !== "all" && r.status !== state.filter.status)
      return false;
    return true;
  });

  const stats = {
    total: replayStatusReports.length,
    active: replayStatusReports.filter((r) => r.status === "active").length,
    partial: replayStatusReports.filter((r) => r.status === "partial").length,
    resolved: replayStatusReports.filter((r) => r.status === "resolved").length,
    scheduled: replayStatusReports.filter((r) => r.status === "scheduled").length,
    citiesAffected: new Set(
      replayStatusReports.filter((r) => r.status === "active").map((r) => r.city),
    ).size,
  };

  const playReplay = useCallback(() => {
    dispatch({ type: "SET_REPLAY_PLAYING", isPlaying: true });
  }, []);

  const pauseReplay = useCallback(() => {
    dispatch({ type: "SET_REPLAY_PLAYING", isPlaying: false });
  }, []);

  const setReplaySpeed = useCallback((speed) => {
    dispatch({ type: "SET_REPLAY_SPEED", speed });
  }, []);

  const setReplayCursor = useCallback((currentMs) => {
    dispatch({ type: "SET_REPLAY_CURSOR", currentMs });
  }, []);

  const setReplayVisible = useCallback((visible) => {
    dispatch({ type: "SET_REPLAY_VISIBLE", visible });
  }, []);

  const setReplayWindowDays = useCallback((windowDays) => {
    dispatch({ type: "SET_REPLAY_WINDOW_DAYS", windowDays });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      filteredReports,
      stats,
      replay: {
        ...state.replay,
        startMs: replayDataset.startMs,
        endMs: replayDataset.endMs,
        currentMs: replayCurrentMs,
      },
      addReport,
      upvote,
      setActive,
      setFilter,
      setView,
      setShowHeatmap,
      setSimulationFrequency,
      startSimulation,
      stopSimulation,
      playReplay,
      pauseReplay,
      setReplaySpeed,
      setReplayCursor,
      setReplayVisible,
      setReplayWindowDays,
      dispatch,
    }),
    [
      state,
      filteredReports,
      stats,
      replayDataset.startMs,
      replayDataset.endMs,
      replayCurrentMs,
      addReport,
      upvote,
      setActive,
      setFilter,
      setView,
      setShowHeatmap,
      setSimulationFrequency,
      startSimulation,
      stopSimulation,
      playReplay,
      pauseReplay,
      setReplaySpeed,
      setReplayCursor,
      setReplayVisible,
      setReplayWindowDays,
      dispatch,
    ],
  );

  return (
    <StoreCtx.Provider value={value}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  return useContext(StoreCtx);
}

export default useStore;
