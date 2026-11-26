import {
  clipPolygonToRect,
  polygonArea,
  polygonBounds,
  polygonCentroid,
  type Polygon,
} from './geometry';
import { srgbByteToLinear } from './color';
import type { LinearRgb } from './color';
import type { PixelData, RawTile, Tile } from './types';

interface Sums {
  r: number;
  g: number;
  b: number;
  count: number;
}

/**
 * Rasterizes a polygon over pixel centers and returns the sum of linear-light
 * RGB values. Using linear light for the average avoids the muddy edges that
 * a naive sRGB average produces.
 */
function samplePolygon(polygon: Polygon, image: PixelData): Sums {
  const bounds = polygonBounds(polygon);
  const yStart = Math.max(0, Math.floor(bounds.minY));
  const yEnd = Math.min(image.height - 1, Math.ceil(bounds.maxY) - 1);
  const width = image.width;
  const data = image.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const intersections: number[] = [];

  for (let y = yStart; y <= yEnd; y++) {
    const scanY = y + 0.5;
    if (scanY <= bounds.minY || scanY >= bounds.maxY) continue;
    intersections.length = 0;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!;
      const c = polygon[j]!;
      if ((a.y <= scanY && c.y > scanY) || (c.y <= scanY && a.y > scanY)) {
        const t = (scanY - a.y) / (c.y - a.y);
        intersections.push(a.x + (c.x - a.x) * t);
      }
    }
    if (intersections.length < 2) continue;
    intersections.sort((a, b) => a - b);

    for (let k = 0; k + 1 < intersections.length; k += 2) {
      const start = Math.max(0, Math.ceil(intersections[k]! - 0.5));
      // Half-open spans: a pixel centre exactly on a shared edge belongs to
      // the tile on its right, never to both neighbours.
      const end = Math.min(width - 1, Math.ceil(intersections[k + 1]! - 0.5) - 1);
      if (end < start) continue;
      let offset = (y * width + start) * 4;
      for (let x = start; x <= end; x++, offset += 4) {
        r += srgbByteToLinear(data[offset]!);
        g += srgbByteToLinear(data[offset + 1]!);
        b += srgbByteToLinear(data[offset + 2]!);
      }
      count += end - start + 1;
    }
  }

  return { r, g, b, count };
}

function pixelColorAt(image: PixelData, x: number, y: number): LinearRgb {
  const px = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = (py * image.width + px) * 4;
  const data = image.data;
  return {
    r: srgbByteToLinear(data[offset]!),
    g: srgbByteToLinear(data[offset + 1]!),
    b: srgbByteToLinear(data[offset + 2]!),
  };
}

export interface AnalysisResult {
  tiles: Tile[];
  elapsedMs: number;
}

export function analyzeTiles(rawTiles: readonly RawTile[], image: PixelData): AnalysisResult {
  const start = performance.now();
  const tiles: Tile[] = [];

  for (const raw of rawTiles) {
    const parts: Polygon[] = [];
    let area = 0;
    let centroidX = 0;
    let centroidY = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const part of raw.parts) {
      const clipped = clipPolygonToRect(part, image.width, image.height);
      if (!clipped) continue;
      const partArea = polygonArea(clipped);
      if (partArea < 1e-5) continue;
      const centroid = polygonCentroid(clipped);
      parts.push(clipped);
      area += partArea;
      centroidX += centroid.x * partArea;
      centroidY += centroid.y * partArea;
      const bounds = polygonBounds(clipped);
      if (bounds.minX < minX) minX = bounds.minX;
      if (bounds.minY < minY) minY = bounds.minY;
      if (bounds.maxX > maxX) maxX = bounds.maxX;
      if (bounds.maxY > maxY) maxY = bounds.maxY;
    }

    if (parts.length === 0 || area < 1e-5) continue;

    let r = 0;
    let g = 0;
    let b = 0;
    let sampleCount = 0;
    for (const part of parts) {
      const sums = samplePolygon(part, image);
      r += sums.r;
      g += sums.g;
      b += sums.b;
      sampleCount += sums.count;
    }

    const centroid = { x: centroidX / area, y: centroidY / area };
    let color: LinearRgb;
    if (sampleCount > 0) {
      color = { r: r / sampleCount, g: g / sampleCount, b: b / sampleCount };
    } else {
      color = pixelColorAt(image, centroid.x, centroid.y);
      sampleCount = 1;
    }

    const outline = raw.outline && raw.outline.length >= 3 ? raw.outline : (parts[0] as Polygon);
    tiles.push({
      parts,
      outline,
      area,
      sampleCount,
      bbox: { minX, minY, maxX, maxY },
      centroid,
      color,
    });
  }

  return { tiles, elapsedMs: performance.now() - start };
}
