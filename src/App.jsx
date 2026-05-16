import React from 'react';
import { StoreProvider, useStore } from './store.jsx';
import Header from './components/Header.jsx';
import StatsBar from './components/StatsBar.jsx';
import FilterBar from './components/FilterBar.jsx';
import TimelineReplay from './components/TimelineReplay.jsx';
import MapView from './components/MapView.jsx';
import ListView from './components/ListView.jsx';
import ReportForm from './components/ReportForm.jsx';
import Toast from './components/Toast.jsx';

function Main() {
  const { view, replay } = useStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <StatsBar />
      {view !== 'report' && <FilterBar />}
      {view !== 'report' && replay.visible && <TimelineReplay />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'map' && <MapView />}
        {view === 'list' && <ListView />}
        {view === 'report' && <ReportForm />}
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  );
}
