import { describe, expect, it } from 'vitest';
import { createTiling } from '../src/tilings';
import { polygonArea } from '../src/core/geometry';

describe('tetromino tiling', () => {
  it('builds every tile from exactly four square cells', () => {
    const tileSize = 24;
    const cell = tileSize / 2;
    const raw = createTiling('tetromino', {
      width: 320,
      height: 240,
      tileSize,
      seed: 123,
    });
    expect(raw.length).toBeGreaterThan(100);
    for (const tile of raw) {
      expect(tile.parts).toHaveLength(4);
      let area = 0;
      for (const part of tile.parts) {
        const partArea = polygonArea(part);
        expect(partArea).toBeCloseTo(cell * cell, 4);
        area += partArea;
      }
      expect(area).toBeCloseTo(4 * cell * cell, 3);
      expect(tile.outline).toBeDefined();
      expect(polygonArea(tile.outline!)).toBeCloseTo(4 * cell * cell, 3);
    }
  });

  it('uses several tetromino shapes', () => {
    const raw = createTiling('tetromino', {
      width: 400,
      height: 300,
      tileSize: 24,
      seed: 321,
    });
    const shapes = new Set<string>();
    for (const tile of raw.slice(0, 80)) {
      const xs = tile.parts.map((part) => Math.round(part[0]!.x));
      const ys = tile.parts.map((part) => Math.round(part[0]!.y));
      const width = (Math.max(...xs) - Math.min(...xs)) / 12 + 1;
      const height = (Math.max(...ys) - Math.min(...ys)) / 12 + 1;
      shapes.add(`${width}x${height}`);
    }
    expect(shapes.size).toBeGreaterThan(2);
  });
});

describe('tetromino seam breaking', () => {
  it('breaks the 8×8 block grid with local flips', () => {
    const tileSize = 24;
    const cell = tileSize / 2;
    const raw = createTiling('tetromino', {
      width: 400,
      height: 300,
      tileSize,
      seed: 777,
    });
    let minX = Infinity;
    let minY = Infinity;
    for (const tile of raw) {
      for (const part of tile.parts) {
        minX = Math.min(minX, part[0]!.x);
        minY = Math.min(minY, part[0]!.y);
      }
    }
    let crossing = 0;
    for (const tile of raw) {
      const blocksX = new Set<number>();
      const blocksY = new Set<number>();
      for (const part of tile.parts) {
        const x = Math.round((part[0]!.x - minX) / cell);
        const y = Math.round((part[0]!.y - minY) / cell);
        blocksX.add(Math.floor(x / 8));
        blocksY.add(Math.floor(y / 8));
      }
      if (blocksX.size > 1 || blocksY.size > 1) crossing++;
    }
    expect(crossing / raw.length).toBeGreaterThan(0.2);
  });
});
