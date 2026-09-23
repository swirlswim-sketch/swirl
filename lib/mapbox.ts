export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

export const SWIRL_BLUE = "#0057FF";

/**
 * A static preview image of a route's line, via Mapbox's Static Images API
 * (no client-side map instance needed -- just an <img src>). Used for route
 * cards instead of a flat placeholder gradient. Returns null when the route
 * has no line geometry to draw.
 */
export function routePreviewImageUrl(
  geojson: GeoJSON.Geometry | null,
  width = 600,
  height = 300
): string | null {
  if (!geojson || geojson.type !== "LineString") return null;

  const feature = {
    type: "Feature",
    properties: { stroke: SWIRL_BLUE, "stroke-width": 4, "stroke-opacity": 1 },
    geometry: geojson,
  };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(feature))})`;

  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlay}/auto/${width}x${height}@2x?padding=30&access_token=${MAPBOX_TOKEN}`;
}

/** Fraction (0-1) of the way along a route's coordinate list at a given distance. */
export function distanceFractionAlongRoute(distanceM: number, totalDistanceM: number): number {
  if (totalDistanceM <= 0) return 0;
  return Math.min(Math.max(distanceM / totalDistanceM, 0), 1);
}

/**
 * Interpolates a [lng, lat] position along a GeoJSON LineString at a given
 * fraction (0-1) of its length, using cumulative straight-line segment distances.
 */
export function positionAlongLine(
  coordinates: [number, number][],
  fraction: number
): [number, number] {
  if (coordinates.length === 0) return [0, 0];
  if (coordinates.length === 1 || fraction <= 0) return coordinates[0];
  if (fraction >= 1) return coordinates[coordinates.length - 1];

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];
    const length = Math.hypot(x2 - x1, y2 - y1);
    segmentLengths.push(length);
    totalLength += length;
  }

  const targetLength = fraction * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i];
    if (accumulated + segmentLength >= targetLength) {
      const segmentFraction = segmentLength === 0 ? 0 : (targetLength - accumulated) / segmentLength;
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      return [x1 + (x2 - x1) * segmentFraction, y1 + (y2 - y1) * segmentFraction];
    }
    accumulated += segmentLength;
  }

  return coordinates[coordinates.length - 1];
}
