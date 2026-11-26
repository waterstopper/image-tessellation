import { analyzeTiles } from '../src/core/analyze';
import { createRng, pointInPolygon } from '../src/core/geometry';
import type { PixelData, TilingId, Tile } from '../src/core/types';
import { createTiling } from '../src/tilings';

export function blankImage(width: number, height: number): PixelData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4).fill(255),
  };
}

export function buildTiles(
  id: TilingId,
  width = 240,
  height = 180,
  tileSize = 20,
  seed = 1234,
): Tile[] {
  const raw = createTiling(id, { width, height, tileSize, seed });
  return analyzeTiles(raw, blankImage(width, height)).tiles;
}

export interface Coverage {
  samples: number;
  covered: number;
  uncovered: number;
  overlaps: number;
}

export function sampleCoverage(
  tiles: readonly Tile[],
  width: number,
  height: number,
  sampleCount = 500,
  seed = 777,
): Coverage {
  const rng = createRng(seed);
  let covered = 0;
  let uncovered = 0;
  let overlaps = 0;
  for (let i = 0; i < sampleCount; i++) {
    const point = {
      x: rng.range(2, width - 2),
      y: rng.range(2, height - 2),
    };
    let hits = 0;
    for (const tile of tiles) {
      for (const part of tile.parts) {
        if (pointInPolygon(point, part)) {
          hits += 1;
          break;
        }
      }
      if (hits > 1) break;
    }
    if (hits === 1) covered += 1;
    else if (hits === 0) uncovered += 1;
    else overlaps += 1;
  }
  return { samples: sampleCount, covered, uncovered, overlaps };
}

export function totalArea(tiles: readonly Tile[]): number {
  return tiles.reduce((sum, tile) => sum + tile.area, 0);
}
