"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, Geometry, LineString } from "geojson";
import { MAPBOX_STYLE, MAPBOX_TOKEN, SWIRL_BLUE, positionAlongLine } from "@/lib/mapbox";
import CheckpointMarker from "@/components/map/CheckpointMarker";
import UserPin from "@/components/map/UserPin";
import type { RouteCheckpoint } from "@/types/database";

const MIST = "#e2e8f2";
const USER_POSITION_ZOOM = 10.5;
const POSITION_ANIMATION_MS = 1200;

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
  /** When set, checkpoint markers render locked/unlocked based on this distance instead of a plain dot. */
  currentDistanceM?: number;
  /** 0-1 along the selected route's line. Renders a UserPin and animates smoothly between updates. */
  userPositionFraction?: number | null;
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function MapboxRoute({
  routes,
  selectedRouteId = null,
  checkpoints = [],
  currentDistanceM,
  userPositionFraction = null,
  tight = false,
  className,
}: MapboxRouteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ marker: mapboxgl.Marker; root: Root }[]>([]);
  const userMarkerRef = useRef<{ marker: mapboxgl.Marker; root: Root } | null>(null);
  const displayedFractionRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasCenteredOnUserRef = useRef(false);
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
      syncUserMarker(true);
    });

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      markersRef.current.forEach(({ marker, root }) => {
        marker.remove();
        root.unmount();
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.marker.remove();
        userMarkerRef.current.root.unmount();
      }
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectedLine(): LineString | null {
    const selected = routes.find((r) => r.id === selectedRouteId && r.geojson?.type === "LineString");
    return selected?.geojson?.type === "LineString" ? selected.geojson : null;
  }

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
    // The dashboard centers on the user's position instead (see syncUserMarker's initial flyTo).
    if (userPositionFraction != null) return;

    const line = selectedLine();
    if (line) {
      map.fitBounds(lineBounds(line), { padding: tight ? 64 : 80, duration: 1200, essential: true });
    } else {
      map.fitBounds(DEFAULT_BOUNDS, { padding: 40, duration: 1200, essential: true });
    }
  }

  function syncMarkers() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    markersRef.current.forEach(({ marker, root }) => {
      marker.remove();
      root.unmount();
    });
    markersRef.current = checkpoints
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => {
        const container = document.createElement("div");
        const root = createRoot(container);
        const unlocked = currentDistanceM != null ? c.distance_from_start_m <= currentDistanceM : true;
        root.render(<CheckpointMarker unlocked={unlocked} />);
        const marker = new mapboxgl.Marker({ element: container }).setLngLat([c.lng!, c.lat!]).addTo(map);
        return { marker, root };
      });
  }

  function syncUserMarker(isInitial: boolean) {
    const map = mapRef.current;
    const line = selectedLine();
    if (!map || !loadedRef.current || !line || userPositionFraction == null) return;

    if (!userMarkerRef.current) {
      const container = document.createElement("div");
      const root = createRoot(container);
      root.render(<UserPin />);
      const marker = new mapboxgl.Marker({ element: container }).setLngLat(positionAlongLine(
        line.coordinates as [number, number][],
        userPositionFraction
      ));
      marker.addTo(map);
      userMarkerRef.current = { marker, root };
      displayedFractionRef.current = userPositionFraction;
    }

    if (isInitial && !hasCenteredOnUserRef.current) {
      hasCenteredOnUserRef.current = true;
      const pos = positionAlongLine(line.coordinates as [number, number][], userPositionFraction);
      map.flyTo({ center: pos, zoom: USER_POSITION_ZOOM, duration: 1200, essential: true });
      return;
    }

    const from = displayedFractionRef.current ?? userPositionFraction;
    const to = userPositionFraction;
    if (from === to) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (prefersReducedMotion()) {
      const pos = positionAlongLine(line.coordinates as [number, number][], to);
      userMarkerRef.current.marker.setLngLat(pos);
      displayedFractionRef.current = to;
      map.panTo(pos, { duration: 0 });
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / POSITION_ANIMATION_MS, 1);
      const eased = easeOutCubic(t);
      const fraction = from + (to - from) * eased;
      const pos = positionAlongLine(line.coordinates as [number, number][], fraction);
      userMarkerRef.current?.marker.setLngLat(pos);
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        displayedFractionRef.current = to;
        map.panTo(pos, { duration: 400 });
      }
    };
    animationFrameRef.current = requestAnimationFrame(step);
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
  }, [checkpoints, currentDistanceM]);

  useEffect(() => {
    syncUserMarker(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPositionFraction]);

  // mapbox-gl.css sets `.mapboxgl-map { position: relative }`, which — depending on CSS import
  // order — can outrank the `absolute` utility class callers pass in and collapse this to 0 height.
  // Inline styles always win the cascade, so position/inset are set here rather than via className.
  return <div ref={containerRef} className={className} style={{ position: "absolute", inset: 0 }} />;
}
