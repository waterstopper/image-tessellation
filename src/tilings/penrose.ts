import { createRng, signedArea, type Point } from '../core/geometry';
import type { RawTile, TilingOptions } from '../core/types';

const TAU = Math.PI * 2;
const GOLDEN_RATIO_AREA = 0.8108; // mean area of a rhomb with edge 1, from thick/thin ratio φ
const EDGE_FACTOR = 1 / Math.sqrt(GOLDEN_RATIO_AREA);

interface Vec {
  x: number;
  y: number;
}

function penroseOffsets(seed: number): number[] {
  const rng = createRng(seed ^ 0x1f123bb5);
  const values: number[] = [];
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const value = rng.range(0.06, 0.94);
    values.push(value);
    sum += value;
  }
  // A regular pentagrid has an integer sum of offsets. Keeping the fifth
  // offset in (0, 1] preserves the true Penrose matching rules.
  values.push(Math.floor(sum) + 1 - sum);
  return values;
}

/**
 * Penrose P3 rhombi generated as the dual of a regular pentagrid
 * (de Bruijn's projection method). Every intersection of two grids becomes
 * one thick (72°) or thin (36°) rhomb.
 */
export function penroseTiling({ width, height, tileSize, seed }: TilingOptions): RawTile[] {
  const edge = Math.max(2, tileSize) * EDGE_FACTOR;
  const halfWidth = width / (2 * edge);
  const halfHeight = height / (2 * edge);
  const margin = 2.6; // in rhombs, enough to cover clipping at the border

  const extent = {
    minX: -halfWidth - margin,
    maxX: halfWidth + margin,
    minY: -halfHeight - margin,
    maxY: halfHeight + margin,
  };

  const gamma = penroseOffsets(seed);
  const directions: Vec[] = [];
  for (let j = 0; j < 5; j++) {
    const angle = (TAU * j) / 5;
    directions.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }

  let cX = 0;
  let cY = 0;
  for (let j = 0; j < 5; j++) {
    cX += gamma[j]! * directions[j]!.x;
    cY += gamma[j]! * directions[j]!.y;
  }

  const extentRadius = Math.hypot(
    Math.max(Math.abs(extent.minX), Math.abs(extent.maxX)),
    Math.max(Math.abs(extent.minY), Math.abs(extent.maxY)),
  );
  const pRadius = extentRadius / 2.5 + Math.hypot(cX, cY) / 2.5 + 4;
  const maxGamma = Math.max(...gamma.map(Math.abs));
  const range = Math.ceil(pRadius + maxGamma) + 2;

  const tiles: RawTile[] = [];

  for (let j = 0; j < 5; j++) {
    for (let k = j + 1; k < 5; k++) {
      const uj = directions[j]!;
      const uk = directions[k]!;
      const determinant = uj.x * uk.y - uj.y * uk.x;
      if (Math.abs(determinant) < 1e-12) continue;

      for (let a = -range; a <= range; a++) {
        for (let b = -range; b <= range; b++) {
          const ra = a + gamma[j]!;
          const rb = b + gamma[k]!;
          const px = (ra * uk.y - rb * uj.y) / determinant;
          const py = (rb * uj.x - ra * uk.x) / determinant;
          if (px * px + py * py > pRadius * pRadius) continue;

          const base: number[] = [];
          for (let m = 0; m < 5; m++) {
            if (m === j || m === k) {
              base.push(0);
            } else {
              const um = directions[m]!;
              base.push(Math.ceil(px * um.x + py * um.y - gamma[m]!));
            }
          }

          const corner = (dj: number, dk: number): Vec => {
            let x = 0;
            let y = 0;
            for (let m = 0; m < 5; m++) {
              const index =
                m === j ? a + dj : m === k ? b + dk : base[m]!;
              x += directions[m]!.x * index;
              y += directions[m]!.y * index;
            }
            return { x, y };
          };

          const unitQuad = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
          const centerX = (unitQuad[0]!.x + unitQuad[1]!.x + unitQuad[2]!.x + unitQuad[3]!.x) / 4;
          const centerY = (unitQuad[0]!.y + unitQuad[1]!.y + unitQuad[2]!.y + unitQuad[3]!.y) / 4;
          if (
            centerX < extent.minX ||
            centerX > extent.maxX ||
            centerY < extent.minY ||
            centerY > extent.maxY
          ) {
            continue;
          }

          const points: Point[] = unitQuad.map((p) => ({
            x: width / 2 + p.x * edge,
            y: height / 2 + p.y * edge,
          }));

          if (
            Math.max(...points.map((p) => p.x)) < -edge * 2 ||
            Math.min(...points.map((p) => p.x)) > width + edge * 2 ||
            Math.max(...points.map((p) => p.y)) < -edge * 2 ||
            Math.min(...points.map((p) => p.y)) > height + edge * 2
          ) {
            continue;
          }

          if (signedArea(points) < 0) points.reverse();
          tiles.push({ parts: [points] });
        }
      }
    }
  }

  return tiles;
}
