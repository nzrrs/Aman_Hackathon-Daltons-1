import React from 'react';
import { useStore } from '../store.jsx';
import ReportCard from './ReportCard.jsx';

export default function ListView() {
  const { filteredListReports } = useStore();

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: 24,
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22,
          marginBottom: 6,
        }}>
          Signalements récents
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>
          {filteredListReports.length} résultat{filteredListReports.length !== 1 ? 's' : ''}
          <div style={{ marginTop: 6, fontSize: 11 }}>
            Les résolutions sont des signaux communautaires (frontend-only, non autoritaires).
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredListReports.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 0',
              color: 'var(--text3)', fontSize: 14,
            }}>
              Aucun signalement pour ces filtres.
            </div>
          ) : (
            filteredListReports.map((r, i) => (
              <div key={r.id} className={`fade-up`} style={{ animationDelay: `${i * 0.04}s` }}>
                <ReportCard report={r} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
