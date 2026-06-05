// src/components/leafletMapHtml.ts
// Leaflet map HTML for WebView. Inline string avoids Metro .html asset bundling.
// TODO(phase-6-polish): Bundle leaflet.js + leaflet.css LOCALLY (not from CDN)
//   so map works offline / on slow 4G. Either base64-inline the CSS+JS into
//   this template string, or use require() of local .js asset.

export const LEAFLET_MAP_HTML = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self' https: data: blob:; img-src https: data: blob:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:;">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .marker-avatar {
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,0.3);
    }
    .marker-avatar.self {
      width: 44px;
      height: 44px;
      border: 3px solid #10B981;
      background: #10B981;
    }
    .marker-avatar.member {
      width: 38px;
      height: 38px;
      border: 3px solid #3B82F6;
      background: #3B82F6;
    }
    .marker-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .marker-dest {
      width: 24px !important;
      height: 24px !important;
      font-size: 20px;
      text-align: center;
      line-height: 24px;
    }
    .marker-sos {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 4px solid #fff;
      background: #DC2626;
      box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.5),
                  0 0 20px rgba(220, 38, 38, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      animation: sos-pulse 1.0s ease-in-out infinite;
    }
    @keyframes sos-pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.9);
      }
      50% {
        transform: scale(1.2);
        box-shadow: 0 0 0 12px rgba(220, 38, 38, 0.2), 0 0 30px rgba(220, 38, 38, 1);
      }
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  // Default view: Bangkok area; will fit-bounds once markers arrive
  const map = L.map('map', { zoomControl: true }).setView([13.7563, 100.5018], 12);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Marker layer group — clear all + redraw on update
  let layer = L.layerGroup().addTo(map);

  // XSS safety — escape any value going into HTML attribute context
  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;');
  }

  function selfIcon(pictureUrl) {
    const imgTag = pictureUrl
      ? '<img src="' + escapeAttr(pictureUrl) + '" onerror="this.style.display=\\'none\\'" />'
      : '';
    return L.divIcon({
      html: '<div class="marker-avatar self">' + imgTag + '</div>',
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }
  function memberIcon(pictureUrl) {
    const imgTag = pictureUrl
      ? '<img src="' + escapeAttr(pictureUrl) + '" onerror="this.style.display=\\'none\\'" />'
      : '';
    return L.divIcon({
      html: '<div class="marker-avatar member">' + imgTag + '</div>',
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  }
  function destIcon() {
    return L.divIcon({ className: 'marker-dest', html: '\\uD83C\\uDFAF', iconSize: [24, 24], iconAnchor: [12, 24] });
  }
  function sosIcon() {
    // Emoji-first for max visibility — identity shown in popup, not marker
    return L.divIcon({ html: '<div class="marker-sos">\\uD83D\\uDEA8</div>', className: '', iconSize: [56, 56], iconAnchor: [28, 28] });
  }

  // Receives data from React Native via injectJavaScript
  window.updateMap = function(payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      layer.clearLayers();
      const points = [];

      // Self
      if (data.self && Number.isFinite(data.self.lat) && Number.isFinite(data.self.lng)) {
        L.marker([data.self.lat, data.self.lng], { icon: selfIcon(data.self.pictureUrl) })
          .bindPopup('\\u0E04\\u0E38\\u0E13').addTo(layer);
        points.push([data.self.lat, data.self.lng]);
      }

      // Members
      (data.members || []).forEach(function(m) {
        if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
          L.marker([m.lat, m.lng], { icon: memberIcon(m.pictureUrl) })
            .bindPopup(m.name || '\\u0E2A\\u0E21\\u0E32\\u0E0A\\u0E34\\u0E01').addTo(layer);
          points.push([m.lat, m.lng]);
        }
      });

      // Destination
      if (data.destination && Number.isFinite(data.destination.lat) && Number.isFinite(data.destination.lng)) {
        L.marker([data.destination.lat, data.destination.lng], { icon: destIcon() })
          .bindPopup(data.destination.name || '\\u0E08\\u0E38\\u0E14\\u0E2B\\u0E21\\u0E32\\u0E22').addTo(layer);
        points.push([data.destination.lat, data.destination.lng]);
      }

      // SOS markers (rendered ABOVE all regular markers via zIndexOffset)
      (data.sosMarkers || []).forEach(function(s) {
        if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
          L.marker([s.lat, s.lng], { icon: sosIcon(), zIndexOffset: 1000 })
            .bindPopup('\\uD83D\\uDEA8 ' + escapeAttr(s.name || '\\u0E2A\\u0E21\\u0E32\\u0E0A\\u0E34\\u0E01') + ' \\u2022 ' + escapeAttr(s.timeHHMM || ''))
            .addTo(layer);
          points.push([s.lat, s.lng]);
        }
      });

      // Auto-fit bounds
      if (points.length > 1) {
        map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
      } else if (points.length === 1) {
        map.setView(points[0], 15);
      }
    } catch (err) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
    }
  };

  // Tell RN we are ready to receive data
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>`;
