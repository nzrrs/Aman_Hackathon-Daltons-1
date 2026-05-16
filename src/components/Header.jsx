import React from 'react';
import { useStore } from '../store.jsx';

export default function Header() {
  const {
    view,
    setView,
    stats,
    simulation,
    replay,
    setSimulationFrequency,
    startSimulation,
    stopSimulation,
    setReplayVisible,
  } = useStore();

  return (
    <header style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #00b4d8, #0077a8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>💧</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, lineHeight: 1, letterSpacing: '-0.5px' }}>
            Aman
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Maroc · Signalement d'eau
          </div>
        </div>
      </div>

      {/* Live badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{stats.active} pannes actives</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            color: simulation.running ? '#10b981' : 'var(--text3)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {simulation.running ? 'Simulation ON' : 'Simulation OFF'}
          </span>
          <select
            value={simulation.frequencySec}
            onChange={(e) => setSimulationFrequency(Number(e.target.value))}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              color: 'var(--text)',
              padding: '6px 8px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            {[3, 5, 8, 12, 20, 30].map((seconds) => (
              <option key={seconds} value={seconds}>{seconds}s</option>
            ))}
          </select>
          <button
            onClick={simulation.running ? stopSimulation : startSimulation}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: simulation.running ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(16,185,129,0.45)',
              background: simulation.running ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
              color: simulation.running ? '#ef4444' : '#10b981',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {simulation.running ? '⏹ Arrêter' : '▶ Démarrer'}
          </button>
          <button
            onClick={() => setReplayVisible(!replay.visible)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border2)',
              background: replay.visible ? 'rgba(0,180,216,0.12)' : 'transparent',
              color: replay.visible ? 'var(--accent)' : 'var(--text2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {replay.visible ? '🙈 Masquer timeline' : '👁 Afficher timeline'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'map', label: '🗺 Carte' },
            { id: 'list', label: '📋 Liste' },
            { id: 'report', label: '➕ Signaler' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setView(id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              background: view === id ? 'var(--accent)' : 'transparent',
              color: view === id ? '#fff' : 'var(--text2)',
              transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
