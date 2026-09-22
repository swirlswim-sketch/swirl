"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, Geometry, LineString } from "geojson";
import { MAPBOX_STYLE, MAPBOX_TOKEN, SWIRL_BLUE } from "@/lib/mapbox";
import type { RouteCheckpoint } from "@/types/database";

const MIST = "#e2e8f2";

/** Roughly Atlantic-Europe: used as the onboarding map's resting view before a route is picked. */
const DEFAULT_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-35, 28],
  [15, 60],
];

export interface MapboxRouteData {
  id: string;
  geojson: Geometry | null;
}

interface MapboxRouteProps {
  routes: MapboxRouteData[];
  selectedRouteId?: string | null;
  checkpoints?: RouteCheckpoint[];
  /** Tighter fit + longer padding, used when a single route fills the screen (onboarding screen 2). */
  tight?: boolean;
  className?: string;
}

function lineBounds(line: LineString): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  for (const coord of line.coordinates) {
    bounds.extend(coord as [number, number]);
  }
  return bounds;
}

export default function MapboxRoute({
  routes,
  selectedRouteId = null,
  checkpoints = [],
  tight = false,
  className,
}: MapboxRouteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      bounds: DEFAULT_BOUNDS,
      attributionControl: false,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      loadedRef.current = true;

      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": MIST,
          "line-width": 2,
        },
      });

      syncData();
      syncStyle();
      syncBounds();
      syncMarkers();
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncData() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("routes") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const features: Feature<LineString>[] = routes
      .filter((r): r is MapboxRouteData & { geojson: LineString } => r.geojson?.type === "LineString")
      .map((r) => ({
        type: "Feature",
        properties: { id: r.id },
        geometry: r.geojson,
      }));

    source.setData({ type: "FeatureCollection", features });
  }

  function syncStyle() {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer("routes-line")) return;

    map.setPaintProperty("routes-line", "line-color", [
      "case",
      ["==", ["get", "id"], selectedRouteId ?? ""],
      SWIRL_BLUE,
      MIST,
    ]);
    map.setPaintProperty("routes-line", "line-width", [
      "case",
      ["==", ["get", "id"], selectedRouteId ?? ""],
      4,
      2,
    ]);
  }

  function syncBounds() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const selected = routes.find((r) => r.id === selectedRouteId && r.geojson?.type === "LineString");
    if (selected?.geojson?.type === "LineString") {
      map.fitBounds(lineBounds(selected.geojson), {
        padding: tight ? 64 : 80,
        duration: 1200,
        essential: true,
      });
    } else {
      map.fitBounds(DEFAULT_BOUNDS, { padding: 40, duration: 1200, essential: true });
    }
  }

  function syncMarkers() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = checkpoints
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => {
        const el = document.createElement("div");
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.background = SWIRL_BLUE;
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
        return new mapboxgl.Marker({ element: el }).setLngLat([c.lng!, c.lat!]).addTo(map);
      });
  }

  useEffect(() => {
    syncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  useEffect(() => {
    syncStyle();
    syncBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId, tight]);

  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoints]);

  // mapbox-gl.css sets `.mapboxgl-map { position: relative }`, which — depending on CSS import
  // order — can outrank the `absolute` utility class callers pass in and collapse this to 0 height.
  // Inline styles always win the cascade, so position/inset are set here rather than via className.
  return <div ref={containerRef} className={className} style={{ position: "absolute", inset: 0 }} />;
}
