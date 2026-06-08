// src/components/LeafletMapView.tsx
// WebView-based Leaflet map for AiKlao Visualization Layer (Phase 6.1A).
// Renders self, members, destination markers. Auto-refresh handled by parent.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LEAFLET_MAP_HTML } from './leafletMapHtml';

export interface LeafletPoint {
  lat: number;
  lng: number;
  name?: string;
  pictureUrl?: string;
  arrivedAt?: string | null;   // Phase 6.5 — ISO timestamp when arrived (badge)
}

export interface SosMarker {
  id: string;
  lat: number;
  lng: number;
  name?: string;        // displayName of sender
  timeHHMM?: string;    // pre-formatted "13:22"
}

export interface LeafletData {
  self?: LeafletPoint;
  members?: Array<LeafletPoint & { id: string }>;
  destination?: LeafletPoint;
  sosMarkers?: SosMarker[];   // Phase 6.2
}

interface Props {
  data: LeafletData;
  style?: any;
  onMapTap?: (lat: number, lng: number) => void;   // Phase 6.1B — destination picker
  center?: { lat: number; lng: number; zoom?: number };   // optional initial center (overrides Bangkok fallback)
}

export function LeafletMapView({ data, style, onMapTap, center }: Props) {
  const webviewRef = useRef<WebView>(null);
  // Checkpoint B: state-based readiness so effect dependency works correctly
  const [webReady, setWebReady] = useState(false);

  // Push data whenever EITHER webReady OR data changes — eliminates both races:
  //   Race 1: WebView ready fires before parent has fetched trip data
  //   Race 2: Parent data updates (60s poll) but WebView never re-receives it
  useEffect(() => {
    if (!webReady || !data) return;
    const json = JSON.stringify(data);
    webviewRef.current?.injectJavaScript(`
      window.updateMap(${json});
      true;
    `);
  }, [webReady, data]);

  // Initial center — fire once the WebView is ready, or when center coords
  // change. Overrides the HTML's Bangkok fallback view. Deps use lat/lng
  // (not the object) so a fresh {lat,lng} literal each render won't re-fire.
  useEffect(() => {
    if (!webReady || !center) return;
    const zoom = center.zoom ?? 13;
    webviewRef.current?.injectJavaScript(`
      window.setMapCenter(${center.lat}, ${center.lng}, ${zoom});
      true;
    `);
  }, [webReady, center?.lat, center?.lng]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setWebReady(true);
      } else if (msg.type === 'mapTap' && onMapTap) {
        onMapTap(msg.lat, msg.lng);   // Phase 6.1B — destination picker
      }
    } catch {}
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: LEAFLET_MAP_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scalesPageToFit={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#EAEFEE' },
});
