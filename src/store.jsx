import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CITY_RISK_FACTORS, SEED_REPORTS } from './data/seed.js';

const StoreCtx = createContext(null);

let nextId = 200;

const initialState = {
  reports: SEED_REPORTS,
  activeReport: null,
  filter: { city: 'all', status: 'all' },
  view: 'map', // 'map' | 'list' | 'report'
  toast: null,
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
    r.status !== 'resolved'
  ).length;
  const statusBoost = report.status === 'active' ? 12 : report.status === 'partial' ? 6 : 3;
  return clamp(base + neighborhoodActive * 10 + statusBoost, 10, 100);
}

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
  const statusBoost = report.status === 'active' ? 6 : report.status === 'scheduled' ? -4 : 0;
  const upvoteBoost = clamp(Math.round(report.upvotes / 10), 0, 6);

  const score = clamp(Math.round(weightedScore + severityBoost + statusBoost + upvoteBoost), 0, 100);

  const statusMultiplier = report.status === 'active' ? 1.2 : report.status === 'partial' ? 0.9 : report.status === 'scheduled' ? 0.7 : 0.3;
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
    case 'ADD_REPORT':
      return { ...state, reports: [action.payload, ...state.reports] };
    case 'UPVOTE': {
      return {
        ...state,
        reports: state.reports.map(r =>
          r.id === action.id ? { ...r, upvotes: r.upvotes + 1 } : r
        ),
      };
    }
    case 'UPDATE_STATUS': {
      return {
        ...state,
        reports: state.reports.map(r =>
          r.id === action.id ? { ...r, status: action.status } : r
        ),
      };
    }
    case 'SET_ACTIVE': return { ...state, activeReport: action.id };
    case 'SET_FILTER': return { ...state, filter: { ...state.filter, ...action.filter } };
    case 'SET_VIEW': return { ...state, view: action.view };
    case 'TOAST': return { ...state, toast: action.message };
    case 'CLEAR_TOAST': return { ...state, toast: null };
    default: return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addReport = useCallback((data) => {
    const report = {
      id: `r${++nextId}`,
      reportedAt: new Date().toISOString(),
      upvotes: 0,
      comments: 0,
      estimatedRestore: null,
      severity: 'medium',
      ...data,
    };
    dispatch({ type: 'ADD_REPORT', payload: report });
    dispatch({ type: 'TOAST', message: '✅ Signalement soumis avec succès!' });
    setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3000);
    return report;
  }, []);

  const upvote = useCallback((id) => {
    dispatch({ type: 'UPVOTE', id });
  }, []);

  const setActive = useCallback((id) => {
    dispatch({ type: 'SET_ACTIVE', id });
  }, []);

  const setFilter = useCallback((filter) => {
    dispatch({ type: 'SET_FILTER', filter });
  }, []);

  const setView = useCallback((view) => {
    dispatch({ type: 'SET_VIEW', view });
  }, []);

  const enrichedReports = state.reports.map(r => ({
    ...r,
    risk: computeRisk(r, state.reports),
  }));

  const filteredReports = enrichedReports.filter(r => {
    if (state.filter.city !== 'all' && r.city !== state.filter.city) return false;
    if (state.filter.status !== 'all' && r.status !== state.filter.status) return false;
    return true;
  });

  const stats = {
    total: state.reports.length,
    active: state.reports.filter(r => r.status === 'active').length,
    partial: state.reports.filter(r => r.status === 'partial').length,
    resolved: state.reports.filter(r => r.status === 'resolved').length,
    scheduled: state.reports.filter(r => r.status === 'scheduled').length,
    citiesAffected: new Set(state.reports.filter(r => r.status === 'active').map(r => r.city)).size,
  };

  return (
    <StoreCtx.Provider value={{
      ...state,
      filteredReports,
      stats,
      addReport,
      upvote,
      setActive,
      setFilter,
      setView,
      dispatch,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
