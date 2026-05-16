import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useStore } from '../store.jsx';
import { STATUS_CONFIG } from '../data/seed.js';
import HeatmapLayer from './HeatmapLayer.jsx';

// Fix Leaflet default icon paths broken by Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const SEVERITY_PRIORITY = { low: 1, medium: 2, high: 3 };

function getClusterSeverity(markers) {
  let highest = 'low';
  markers.forEach((marker) => {
    const markerSeverity = marker._reportSeverity || 'low';
    if (SEVERITY_PRIORITY[markerSeverity] > SEVERITY_PRIORITY[highest]) {
      highest = markerSeverity;
    }
  });
  return highest;
}

function createClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  const severity = getClusterSeverity(childMarkers);
  const count = cluster.getChildCount();

  return L.divIcon({
    html: `<div class="severity-cluster severity-${severity}"><span>${count}</span></div>`,
    className: 'severity-cluster-wrapper',
    iconSize: L.point(42, 42),
  });
}

function hasValidCoordinates(report) {
  return Number.isFinite(report.lat) && Number.isFinite(report.lng);
}

export default function MapView() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerClusterRef = useRef(null);
  const markersRef = useRef([]);
  const [leafletMap, setLeafletMap] = useState(null);
  const {
    filteredReports,
    filteredHeatmapReports,
    setActive,
    showHeatmap,
  } = useStore();

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

    const clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      animate: false,
      animateAddingMarkers: false,
      iconCreateFunction: createClusterIcon,
    });
    clusterLayer.addTo(map);

    markerClusterRef.current = clusterLayer;
    mapInstance.current = map;
    setLeafletMap(map);
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstance.current = null;
      markerClusterRef.current = null;
      markersRef.current = [];
      setLeafletMap(null);
    };
  }, []);

  useEffect(() => {
    if (!markerClusterRef.current) return;
    markerClusterRef.current.clearLayers();
    markersRef.current = [];

    filteredReports
      .filter(hasValidCoordinates)
      .forEach(report => {
      const cfg = STATUS_CONFIG[report.status];
      const size = 14;
      const risk = report.risk;
      const riskColor = '#f59e0b';
      const communityResolvedTag =
        report.status === 'resolved' && report.resolvedBy === 'community'
          ? '<div style="margin-top:6px;font-size:10px;font-weight:700;color:#10b981;">✅ Résolu par la communauté</div>'
          : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${cfg.dot};
          border:2px solid rgba(0,0,0,0.4);
          box-shadow:0 0 8px ${cfg.dot}99;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([report.lat, report.lng], { icon })
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
            ${communityResolvedTag}
          </div>
        `);

      marker.bindTooltip(`
        <div style="font-family:sans-serif;min-width:180px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${report.neighborhood}, ${report.city}</div>
          <div style="font-size:11px;color:${riskColor};font-weight:700;">Risque: ${risk.score}/100</div>
          <div style="font-size:11px;color:#666;margin-bottom:4px;">Rétablissement: ${risk.recoveryHours}h</div>
          <div style="font-size:10px;color:#8b97b0;line-height:1.4;">${risk.reasons.join(' · ')}</div>
          ${communityResolvedTag}
        </div>
      `, { direction: 'top', offset: [0, -8], opacity: 0.95 });

      marker.on('click', () => setActive(report.id));
      marker._reportId = report.id;
      marker._reportSeverity = report.severity;
      markersRef.current.push(marker);
      markerClusterRef.current.addLayer(marker);
    });
  }, [filteredReports, setActive]);

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
      <HeatmapLayer reports={filteredHeatmapReports} showHeatmap={showHeatmap} mapInstance={leafletMap} />
    </div>
  );
}
