import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import { STATUS_CONFIG } from '../data/seed.js';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import AppModal from './AppModal.jsx';

function timeAgo(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return '';
  }
}

export default function ReportCard({ report, compact = false }) {
  const { upvote, markReportResolved } = useStore();
  const [showResolveModal, setShowResolveModal] = useState(false);
  const cfg = STATUS_CONFIG[report.status];
  const risk = report.risk;
  const riskColor = '#f59e0b';
  const canResolve = ['active', 'partial', 'scheduled'].includes(report.status);
  const isCommunityResolved = report.status === 'resolved' && report.resolvedBy === 'community';

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

      {isCommunityResolved && (
        <div style={{
          marginBottom: 12,
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid rgba(16,185,129,0.35)',
          background: 'rgba(16,185,129,0.12)',
          color: '#10b981',
          fontSize: 12,
          fontWeight: 700,
        }}>
          ✅ Résolution confirmée par la communauté
          {(report.resolvedAt || report.estimatedRestore) && (
            <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
              {' '}· {timeAgo(report.resolvedAt || report.estimatedRestore)}
            </span>
          )}
        </div>
      )}

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

        {canResolve && (
          <button
            onClick={() => setShowResolveModal(true)}
            style={{
              marginLeft: 'auto',
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid rgba(16,185,129,0.45)',
              background: 'rgba(16,185,129,0.12)',
              color: '#10b981',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✅ Marquer résolu
          </button>
        )}

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
      <AppModal
        open={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Marquer cette panne comme résolue ?"
        description="Confirmez seulement si l'eau est revenue. Sans backend ni authentification, cette action est un signal communautaire et peut être erronée."
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setShowResolveModal(false)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'transparent',
                color: 'var(--text2)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => {
                const updated = markReportResolved(report.id);
                if (updated) setShowResolveModal(false);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(16,185,129,0.45)',
                background: 'rgba(16,185,129,0.12)',
                color: '#10b981',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirmer
            </button>
          </div>
        )}
      >
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong>{report.neighborhood}</strong>
          <span style={{ color: 'var(--text3)' }}> · {report.city}</span>
          <div style={{ marginTop: 8 }}>{report.description}</div>
        </div>
      </AppModal>
    </div>
  );
}
