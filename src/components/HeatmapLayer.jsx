import { useEffect, useRef } from "react";
import L from "leaflet";

const SEVERITY_WEIGHTS = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
};

// Weather-style heatmap with efficient rendering
class WeatherHeatmap extends L.Layer {
  constructor(options = {}) {
    super(options);
    this.data = [];
    this.radius = options.radius || 50;
    this.maxOpacity = options.maxOpacity || 0.75;
    this._rafId = null;
    this._shouldTranslate = false;
  }

  onAdd(map) {
    this._map = map;
    this._container = L.DomUtil.create("div");
    this._container.style.position = "absolute";
    this._container.style.top = "0";
    this._container.style.left = "0";
    this._container.style.pointerEvents = "none";

    this._canvas = L.DomUtil.create("canvas", "", this._container);
    this._canvas.style.position = "absolute";
    this._canvas.style.top = "0";
    this._canvas.style.left = "0";
    map._panes.overlayPane.appendChild(this._container);

    // Keep the heatmap accurate on every interaction frame (drag, zoom, kinetic pan).
    this._map.on("move", this._scheduleUpdateAndTranslate, this);
    this._map.on("moveend", this._scheduleUpdateAndTranslate, this);
    this._map.on("zoom", this._scheduleUpdateAndTranslate, this);
    this._map.on("zoomend", this._scheduleUpdateAndTranslate, this);
    this._map.on("zoomanim", this._scheduleUpdateAndTranslate, this);
    this._map.on("viewreset", this._scheduleUpdateAndTranslate, this);
    this._map.on("resize", this._scheduleUpdateAndTranslate, this);

    // position container and draw initial frame
    this._translate();
    this._update();
    return this;
  }

  onRemove() {
    L.DomUtil.remove(this._container);
    if (this._map) {
      this._map.off("move", this._scheduleUpdateAndTranslate, this);
      this._map.off("moveend", this._scheduleUpdateAndTranslate, this);
      this._map.off("zoom", this._scheduleUpdateAndTranslate, this);
      this._map.off("zoomend", this._scheduleUpdateAndTranslate, this);
      this._map.off("zoomanim", this._scheduleUpdateAndTranslate, this);
      this._map.off("viewreset", this._scheduleUpdateAndTranslate, this);
      this._map.off("resize", this._scheduleUpdateAndTranslate, this);
    }
    if (this._rafId) {
      L.Util.cancelAnimFrame(this._rafId);
      this._rafId = null;
    }
  }

  setData(data) {
    this.data = data;
    if (this._map) {
      this._scheduleUpdate();
    }
  }

  _update() {
    if (!this._map || !this._canvas) return;

    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    const ctx = this._canvas.getContext("2d");
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    if (this.data.length === 0) return;

    // Build intensity map efficiently
    const pixelData = new Float32Array(size.x * size.y);
    let maxIntensity = 0;

    // Accumulate intensities using simple radial gradient
    this.data.forEach(([lat, lng, weight]) => {
      const pt = this._map.latLngToContainerPoint([lat, lng]);
      const x = Math.round(pt.x);
      const y = Math.round(pt.y);

      // Use smaller loop for efficiency
      const r = this.radius;
      const rSq = r * r;

      for (let dy = -r; dy <= r; dy++) {
        const py = y + dy;
        if (py < 0 || py >= size.y) continue;

        for (let dx = -r; dx <= r; dx++) {
          const px = x + dx;
          if (px < 0 || px >= size.x) continue;

          const distSq = dx * dx + dy * dy;
          if (distSq <= rSq) {
            // Gaussian falloff
            const intensity = weight * Math.exp(-distSq / (r * r * 0.5));
            const idx = py * size.x + px;
            pixelData[idx] += intensity;
            if (pixelData[idx] > maxIntensity) {
              maxIntensity = pixelData[idx];
            }
          }
        }
      }
    });

    // Render with color mapping
    const imgData = ctx.createImageData(size.x, size.y);
    const data32 = new Uint32Array(imgData.data.buffer);

    // Avoid spreading large array - use manual max
    const colorMap = [
      { pos: 0, r: 28, g: 214, b: 109 },
      { pos: 0.42, r: 120, g: 224, b: 79 },
      { pos: 0.6, r: 250, g: 204, b: 21 },
      { pos: 0.8, r: 249, g: 115, b: 22 },
      { pos: 1, r: 239, g: 68, b: 68 },
    ];

    const denom = maxIntensity || 1;
    for (let i = 0; i < pixelData.length; i++) {
      const norm = pixelData[i] / denom;
      const intensity = Math.pow(norm, 0.9);

      if (intensity > 0.02) {
        const color = this._interpolateColor(colorMap, intensity);
        const alpha = Math.round(intensity * this.maxOpacity * 255);
        data32[i] = (alpha << 24) | (color.b << 16) | (color.g << 8) | color.r;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  _translate() {
    if (!this._map || !this._container) return;
    // Align the canvas container with the map pane position so panning appears smooth.
    // Use Leaflet internal _getMapPanePos (stable across versions) when available.
    const panePos = this._map._getMapPanePos
      ? this._map._getMapPanePos()
      : L.point(0, 0);
    // setPosition expects a Point; invert to translate container opposite to pane movement
    L.DomUtil.setPosition(this._container, panePos.multiplyBy(-1));
  }

  _scheduleUpdate() {
    this._queueRender(false);
  }

  _scheduleUpdateAndTranslate() {
    this._queueRender(true);
  }

  _queueRender(shouldTranslate) {
    this._shouldTranslate = this._shouldTranslate || shouldTranslate;
    if (this._rafId) return;
    this._rafId = L.Util.requestAnimFrame(() => {
      this._rafId = null;
      if (this._shouldTranslate) this._translate();
      this._shouldTranslate = false;
      this._update();
    }, this);
  }

  _interpolateColor(colorMap, pos) {
    for (let i = 0; i < colorMap.length - 1; i++) {
      const c1 = colorMap[i];
      const c2 = colorMap[i + 1];
      if (pos >= c1.pos && pos <= c2.pos) {
        const t = (pos - c1.pos) / (c2.pos - c1.pos);
        return {
          r: Math.round(c1.r + (c2.r - c1.r) * t),
          g: Math.round(c1.g + (c2.g - c1.g) * t),
          b: Math.round(c1.b + (c2.b - c1.b) * t),
        };
      }
    }
    return colorMap[colorMap.length - 1];
  }
}

export default function HeatmapLayer({ reports, showHeatmap, mapInstance }) {
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!mapInstance) return;

    if (!showHeatmap) {
      if (heatmapRef.current) {
        mapInstance.removeLayer(heatmapRef.current);
        heatmapRef.current = null;
      }
      return;
    }
    if (!heatmapRef.current) {
      heatmapRef.current = new WeatherHeatmap({
        radius: 50,
        maxOpacity: 0.82,
      });
      heatmapRef.current.addTo(mapInstance);
    }

    return () => {
      if (heatmapRef.current && mapInstance) {
        mapInstance.removeLayer(heatmapRef.current);
        heatmapRef.current = null;
      }
    };
  }, [showHeatmap, mapInstance]);

  useEffect(() => {
    if (!showHeatmap || !heatmapRef.current) return;

    const heatData = reports
      .filter(
        (r) =>
          Number.isFinite(r.lat) &&
          Number.isFinite(r.lng),
      )
      .map((r) => [r.lat, r.lng, SEVERITY_WEIGHTS[r.severity] || 0.5]);

    heatmapRef.current.setData(heatData);
  }, [reports, showHeatmap]);

  return null;
}
