import {
  bboxIntersects,
  clipPolygonByHalfPlane,
  createRng,
  polygonArea,
  polygonBounds,
  rectanglePolygon,
  type Point,
  type Polygon,
} from '../core/geometry';
import type { RawTile, TilingOptions } from '../core/types';

interface Seed {
  x: number;
  y: number;
}

const HASH_FACTOR = 3;
const JITTER = 0.4;

/** Organic Voronoi mosaic built from jittered grid seeds. */
export function voronoiTiling({ width, height, tileSize, seed }: TilingOptions): RawTile[] {
  const spacing = Math.max(3, tileSize);
  const rng = createRng(seed ^ 0x68e31da4);
  const seeds: Seed[] = [];
  const cols = Math.ceil(width / spacing) + 3;
  const rows = Math.ceil(height / spacing) + 3;

  for (let gy = -1; gy < rows; gy++) {
    for (let gx = -1; gx < cols; gx++) {
      seeds.push({
        x: (gx + 0.5 + rng.range(-JITTER, JITTER)) * spacing,
        y: (gy + 0.5 + rng.range(-JITTER, JITTER)) * spacing,
      });
    }
  }

  const hashSize = spacing * HASH_FACTOR;
  const buckets = new Map<string, number[]>();
  const hashKey = (x: number, y: number): string =>
    `${Math.floor(x / hashSize)},${Math.floor(y / hashSize)}`;

  for (let i = 0; i < seeds.length; i++) {
    const seedPoint = seeds[i]!;
    const key = hashKey(seedPoint.x, seedPoint.y);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }

  const outer = rectanglePolygon(-spacing * 2, -spacing * 2, width + spacing * 4, height + spacing * 4);
  const imageBounds = { minX: 0, minY: 0, maxX: width, maxY: height };
  const tiles: RawTile[] = [];

  for (let i = 0; i < seeds.length; i++) {
    const origin = seeds[i]!;
    if (
      origin.x < -spacing * 1.5 ||
      origin.x > width + spacing * 1.5 ||
      origin.y < -spacing * 1.5 ||
      origin.y > height + spacing * 1.5
    ) {
      continue;
    }

    let polygon: Polygon = outer;
    const gx = Math.floor(origin.x / hashSize);
    const gy = Math.floor(origin.y / hashSize);

    outer: for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const bucket = buckets.get(`${gx + ox},${gy + oy}`);
        if (!bucket) continue;
        for (const j of bucket) {
          if (j === i) continue;
          const other = seeds[j]!;
          // Points closer to `origin` than to `other`:
          //   2·p·(other - origin) <= |other|² - |origin|²
          const nx = other.x - origin.x;
          const ny = other.y - origin.y;
          const constant = (other.x * other.x + other.y * other.y - origin.x * origin.x - origin.y * origin.y) / 2;
          polygon = clipPolygonByHalfPlane(polygon, nx, ny, constant);
          if (polygon.length < 3) break outer;
        }
      }
    }

    if (polygon.length < 3) continue;
    polygon = dedupe(polygon);
    if (polygon.length < 3 || polygonArea(polygon) < 0.01) continue;
    const bounds = polygonBounds(polygon);
    if (!bboxIntersects(bounds, imageBounds)) continue;
    tiles.push({ parts: [polygon] });
  }

  return tiles;
}

function dedupe(polygon: Polygon): Polygon {
  const out: Point[] = [];
  for (const point of polygon) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - point.x) > 1e-7 || Math.abs(last.y - point.y) > 1e-7) {
      out.push(point);
    }
  }
  if (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.abs(first.x - last.x) < 1e-7 && Math.abs(first.y - last.y) < 1e-7) out.pop();
  }
  return out;
}
