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
const STORAGE_KEY = "aman-offline-cache-v1";

let nextId = 200;
const ADMIN_SESSION_KEY = "aman_admin_session";
const ADMIN_DEMO_KEY = "admin";
const ALLOWED_VIEWS = new Set(["map", "list", "report", "admin"]);
const VALID_REPORT_STATUSES = new Set([
  "active",
  "partial",
  "resolved",
  "scheduled",
  "false",
  "duplicate",
]);
const EDITABLE_REPORT_FIELDS = new Set([
  "city",
  "neighborhood",
  "description",
  "reportedBy",
  "severity",
  "status",
  "lat",
  "lng",
  "estimatedRestore",
]);

function getInitialAdminAuth() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function isValidReportStatus(status) {
  return VALID_REPORT_STATUSES.has(status);
}

function sanitizeReportPatch(patch = {}) {
  const safePatch = {};
  Object.entries(patch).forEach(([key, value]) => {
    if (!EDITABLE_REPORT_FIELDS.has(key)) return;
    if (key === "status" && !isValidReportStatus(value)) return;
    safePatch[key] = value;
  });
  return safePatch;
}

const initialState = {
  reports: SEED_REPORTS,
  activeReport: null,
  filter: { city: "all", status: "all" },
  showHeatmap: true,
  view: "map", // 'map' | 'list' | 'report' | 'admin'
  toast: null,
  admin: {
    isAuthenticated: getInitialAdminAuth(),
  },
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
  lastDataSyncAt: null,
};

const RISK_WEIGHTS = {
  populationDensity: 0.25,
  infrastructureAge: 0.2,
  weatherStress: 0.2,
  outageFrequency: 0.2,
  maintenanceActivity: 0.15,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeOutageFrequency(report, reports) {
  const base = hashString(`${report.city}-${report.neighborhood}`) % 45;
  const neighborhoodActive = reports.filter(r =>
    r.city === report.city &&
    r.neighborhood === report.neighborhood &&
    !["resolved", "false", "duplicate"].includes(r.status)
  ).length;
  const statusBoost =
    report.status === "active"
      ? 12
      : report.status === "partial"
        ? 6
        : report.status === "resolved" || report.status === "false" || report.status === "duplicate"
          ? 0
          : 3;
  return clamp(base + neighborhoodActive * 10 + statusBoost, 10, 100);
}
const CITY_RISK_FACTORS = {
  Casablanca: {
    populationDensity: 90,
    infrastructureAge: 75,
    weatherStress: 70,
    maintenanceActivity: 50,
  },
  Rabat: {
    populationDensity: 70,
    infrastructureAge: 60,
    weatherStress: 65,
    maintenanceActivity: 65,
  },
  Marrakech: {
    populationDensity: 65,
    infrastructureAge: 70,
    weatherStress: 85,
    maintenanceActivity: 45,
  },
  Fes: {
    populationDensity: 60,
    infrastructureAge: 80,
    weatherStress: 75,
    maintenanceActivity: 40,
  },
  Tangier: {
    populationDensity: 68,
    infrastructureAge: 55,
    weatherStress: 60,
    maintenanceActivity: 60,
  },
};

function computeRisk(report, reports) {
  const cityBase = CITY_RISK_FACTORS[report.city] || {
    populationDensity: 55,
    infrastructureAge: 55,
    weatherStress: 55,
    maintenanceActivity: 55,
  };

  const outageFrequency = computeOutageFrequency(report, reports);
  const maintenanceRisk = 100 - cityBase.maintenanceActivity;

  const weightedScore =
    cityBase.populationDensity * RISK_WEIGHTS.populationDensity +
    cityBase.infrastructureAge * RISK_WEIGHTS.infrastructureAge +
    cityBase.weatherStress * RISK_WEIGHTS.weatherStress +
    outageFrequency * RISK_WEIGHTS.outageFrequency +
    maintenanceRisk * RISK_WEIGHTS.maintenanceActivity;

  const severityBoost = report.severity === 'high' ? 8 : report.severity === 'low' ? -5 : 0;
  const statusBoost =
    report.status === "active"
      ? 6
      : report.status === "scheduled"
        ? -4
        : report.status === "false" || report.status === "duplicate"
          ? -8
          : 0;
  const upvoteBoost = clamp(Math.round(report.upvotes / 10), 0, 6);

  const score = clamp(Math.round(weightedScore + severityBoost + statusBoost + upvoteBoost), 0, 100);

  const statusMultiplier = report.status === "active"
    ? 1.2
    : report.status === "partial"
      ? 0.9
      : report.status === "scheduled"
        ? 0.7
        : report.status === "false" || report.status === "duplicate"
          ? 0.2
          : 0.3;
  const maintenanceRelief = cityBase.maintenanceActivity / 25;
  const baseHours = 2 + score / 8;
  const recoveryHours = clamp(Math.round(baseHours * statusMultiplier - maintenanceRelief + (report.severity === 'high' ? 2 : 0)), 0, 96);

  const contributions = [
    { key: 'Population dense', value: cityBase.populationDensity, weight: RISK_WEIGHTS.populationDensity },
    { key: 'Réseau vieillissant', value: cityBase.infrastructureAge, weight: RISK_WEIGHTS.infrastructureAge },
    { key: 'Chaleur / sécheresse', value: cityBase.weatherStress, weight: RISK_WEIGHTS.weatherStress },
    { key: 'Pannes passées', value: outageFrequency, weight: RISK_WEIGHTS.outageFrequency },
    { key: 'Maintenance faible', value: maintenanceRisk, weight: RISK_WEIGHTS.maintenanceActivity },
  ];

  const reasons = contributions
    .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
    .slice(0, 3)
    .map(item => `${item.key}: ${item.value}/100`);

  return {
    score,
    recoveryHours,
    reasons,
    factors: {
      populationDensity: cityBase.populationDensity,
      infrastructureAge: cityBase.infrastructureAge,
      weatherStress: cityBase.weatherStress,
      outageFrequency,
      maintenanceActivity: cityBase.maintenanceActivity,
    },
  };
}

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
      if (!isValidReportStatus(action.status)) return state;
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r,
        ),
      };
    }
    case "PATCH_REPORT": {
      const safePatch = sanitizeReportPatch(action.patch);
      if (Object.keys(safePatch).length === 0) return state;
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, ...safePatch } : r,
        ),
      };
    }
    case "DELETE_REPORT":
      return {
        ...state,
        reports: state.reports.filter((r) => r.id !== action.id),
        activeReport: state.activeReport === action.id ? null : state.activeReport,
      };
    case "SET_ACTIVE":
      return { ...state, activeReport: action.id };
    case "SET_FILTER":
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case "SET_VIEW":
      return { ...state, view: ALLOWED_VIEWS.has(action.view) ? action.view : state.view };
    case "SET_ADMIN_AUTH":
      return {
        ...state,
        admin: { ...state.admin, isAuthenticated: action.isAuthenticated },
        view:
          !action.isAuthenticated && state.view === "admin"
            ? "map"
            : state.view,
      };
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
    case "SET_LAST_DATA_SYNC":
      if (state.lastDataSyncAt === action.value) return state;
      return { ...state, lastDataSyncAt: action.value };
    default:
      return state;
  }
}

function readPersistedState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.reports)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function computeNextIdFromReports(reports) {
  const maxId = reports.reduce((max, report) => {
    const match = /^r(\d+)$/.exec(report?.id ?? "");
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, nextId);
  nextId = Math.max(nextId, maxId);
}

function createInitialState() {
  const persisted = readPersistedState();
  if (!persisted) return initialState;

  const reports = Array.isArray(persisted.reports)
    ? persisted.reports
    : initialState.reports;
  computeNextIdFromReports(reports);

  return {
    ...initialState,
    reports,
    activeReport: persisted.activeReport ?? null,
    filter: { ...initialState.filter, ...(persisted.filter || {}) },
    showHeatmap:
      typeof persisted.showHeatmap === "boolean"
        ? persisted.showHeatmap
        : initialState.showHeatmap,
    view: ["map", "list", "report"].includes(persisted.view)
      ? persisted.view
      : initialState.view,
    simulation: {
      ...initialState.simulation,
      running: false,
      frequencySec: Number.isFinite(persisted?.simulation?.frequencySec)
        ? Math.min(60, Math.max(2, Math.round(persisted.simulation.frequencySec)))
        : initialState.simulation.frequencySec,
    },
    replay: {
      ...initialState.replay,
      isPlaying: false,
      speed: persisted?.replay?.speed === 4 ? 4 : 1,
      currentMs: Number.isFinite(persisted?.replay?.currentMs)
        ? persisted.replay.currentMs
        : Date.now(),
      visible:
        typeof persisted?.replay?.visible === "boolean"
          ? persisted.replay.visible
          : initialState.replay.visible,
      windowDays: [1, 7, 14].includes(persisted?.replay?.windowDays)
        ? persisted.replay.windowDays
        : initialState.replay.windowDays,
    },
    lastDataSyncAt:
      typeof persisted.lastDataSyncAt === "string"
        ? persisted.lastDataSyncAt
        : null,
  };
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, createInitialState);
  const reportsRef = useRef(state.reports);
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    reportsRef.current = state.reports;
  }, [state.reports]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

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
    if (!ALLOWED_VIEWS.has(view)) return;
    dispatch({ type: "SET_VIEW", view });
  }, []);

  const setReportStatus = useCallback((id, status) => {
    if (!isValidReportStatus(status)) {
      pushToast("❌ Statut invalide");
      return false;
    }
    dispatch({ type: "UPDATE_STATUS", id, status });
    return true;
  }, [pushToast]);

  const deleteReport = useCallback((id) => {
    dispatch({ type: "DELETE_REPORT", id });
  }, []);

  const patchReport = useCallback((id, patch) => {
    const safePatch = sanitizeReportPatch(patch);
    if (Object.keys(safePatch).length === 0) {
      pushToast("⚠️ Aucune modification valide");
      return false;
    }
    dispatch({ type: "PATCH_REPORT", id, patch: safePatch });
    return true;
  }, [pushToast]);

  const authenticateAdmin = useCallback((candidateKey) => {
    if (candidateKey !== ADMIN_DEMO_KEY) {
      pushToast("🔒 Clé admin invalide");
      return false;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "1");
    }
    dispatch({ type: "SET_ADMIN_AUTH", isAuthenticated: true });
    pushToast("✅ Session admin activée");
    return true;
  }, [pushToast]);

  const logoutAdmin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    dispatch({ type: "SET_ADMIN_AUTH", isAuthenticated: false });
    pushToast("🔐 Session admin fermée");
  }, [pushToast]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistedState = {
      reports: state.reports,
      activeReport: state.activeReport,
      filter: state.filter,
      showHeatmap: state.showHeatmap,
      view: state.view,
      simulation: { frequencySec: state.simulation.frequencySec },
      replay: {
        speed: state.replay.speed,
        visible: state.replay.visible,
        windowDays: state.replay.windowDays,
      },
      lastDataSyncAt: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    dispatch({
      type: "SET_LAST_DATA_SYNC",
      value: persistedState.lastDataSyncAt,
    });
  }, [
    state.reports,
    state.activeReport,
    state.filter,
    state.showHeatmap,
    state.view,
    state.simulation.frequencySec,
    state.replay.speed,
    state.replay.visible,
    state.replay.windowDays,
  ]);

 const enrichedReports = replayReports.map((r) => ({
  ...r,
  risk: computeRisk(r, replayReports),
}));

const filteredReports = enrichedReports.filter((r) => {
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
      setReportStatus,
      deleteReport,
      patchReport,
      authenticateAdmin,
      logoutAdmin,
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
      isOnline,
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
      setReportStatus,
      deleteReport,
      patchReport,
      authenticateAdmin,
      logoutAdmin,
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
      isOnline,
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
