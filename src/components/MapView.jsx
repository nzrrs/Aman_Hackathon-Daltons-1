import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store.jsx';
import { STATUS_CONFIG } from '../data/seed.js';

// Fix Leaflet default icon paths broken by Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

export default function MapView() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const { filteredReports, setActive, activeReport } = useStore();

  useEffect(() => {
    if (mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [31.7917, -7.0926],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstance.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filteredReports.forEach(report => {
      const cfg = STATUS_CONFIG[report.status];
      const isActive = report.id === activeReport;
      const size = isActive ? 20 : 14;
      const risk = report.risk;
      const riskColor = '#f59e0b';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${cfg.dot};
          border:${isActive ? '3px solid white' : '2px solid rgba(0,0,0,0.4)'};
          box-shadow:0 0 ${isActive ? 14 : 8}px ${cfg.dot}99;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([report.lat, report.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${cfg.dot};display:inline-block;"></span>
              <strong style="font-size:13px;">${report.neighborhood}, ${report.city}</strong>
            </div>
            <p style="font-size:12px;color:#8b97b0;margin-bottom:8px;line-height:1.5;">${report.description}</p>
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:700;color:${riskColor};">Risque: ${risk.score}/100</span>
              <span style="font-size:11px;color:#666;">Rétablissement: ${risk.recoveryHours}h</span>
            </div>
            <div style="font-size:10px;color:#667085;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Raisons</div>
            <ul style="margin:0 0 8px 14px;padding:0;color:#8b97b0;font-size:11px;line-height:1.4;">
              ${risk.reasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:11px;background:${cfg.bg};color:${cfg.color};padding:2px 8px;border-radius:10px;">${cfg.label}</span>
              <span style="font-size:11px;color:#666;">👍 ${report.upvotes}</span>
            </div>
          </div>
        `);

      marker.bindTooltip(`
        <div style="font-family:sans-serif;min-width:180px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${report.neighborhood}, ${report.city}</div>
          <div style="font-size:11px;color:${riskColor};font-weight:700;">Risque: ${risk.score}/100</div>
          <div style="font-size:11px;color:#666;margin-bottom:4px;">Rétablissement: ${risk.recoveryHours}h</div>
          <div style="font-size:10px;color:#8b97b0;line-height:1.4;">${risk.reasons.join(' · ')}</div>
        </div>
      `, { direction: 'top', offset: [0, -8], opacity: 0.95 });

      marker.on('click', () => setActive(report.id));
      marker._reportId = report.id;
      markersRef.current.push(marker);
    });
  }, [filteredReports]);

  useEffect(() => {
    if (!activeReport) return;
    const activeMarker = markersRef.current.find(m => m._reportId === activeReport);
    if (activeMarker) activeMarker.openPopup();
  }, [activeReport]);

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Map overlay legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Légende</div>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.dot, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
