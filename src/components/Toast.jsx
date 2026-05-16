import React from 'react';
import { useStore } from '../store.jsx';

export default function Toast() {
  const { toast } = useStore();
  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg2)', border: '1px solid var(--border2)',
      borderRadius: 12, padding: '12px 24px',
      color: 'var(--text)', fontSize: 14, fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 13000, animation: 'fadeUp 0.3s ease',
      whiteSpace: 'nowrap',
    }}>
      {toast}
    </div>
  );
}
