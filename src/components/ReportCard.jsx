import React from 'react';
import { useStore } from '../store.jsx';
import { STATUS_CONFIG } from '../data/seed.js';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function timeAgo(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return '';
  }
}

export default function ReportCard({ report, compact = false }) {
  const { upvote } = useStore();
  const cfg = STATUS_CONFIG[report.status];
  const risk = report.risk;
  const riskColor = '#f59e0b';

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: compact ? 14 : 18,
      transition: 'border-color 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: compact ? 14 : 16 }}>
            {report.neighborhood}
            <span style={{ color: 'var(--text2)', fontWeight: 400 }}> · {report.city}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Signalé {timeAgo(report.reportedAt)} par {report.reportedBy}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: cfg.bg, color: cfg.color, flexShrink: 0, marginLeft: 12,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      {!compact && (
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>
          {report.description}
        </p>
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 10, padding: compact ? 8 : 10, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>
            Risque: {risk.score}/100
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Rétablissement estimé: {risk.recoveryHours}h
          </span>
        </div>
        {!compact && (
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
            {risk.reasons.join(' · ')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => upvote(report.id)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
          color: 'var(--text2)', fontSize: 12, fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
        >
          👍 {report.upvotes} confirmations
        </button>

        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          💬 {report.comments} commentaires
        </span>

        {report.estimatedRestore && new Date(report.estimatedRestore) > new Date() && (
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
            ⏱ Rétablissement : {timeAgo(report.estimatedRestore).replace('dans ', '')}
          </span>
        )}

        {report.severity === 'high' && (
          <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 10, marginLeft: 'auto' }}>
            🔴 Critique
          </span>
        )}
      </div>
    </div>
  );
}
