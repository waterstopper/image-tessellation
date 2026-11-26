import { describe, expect, it } from 'vitest';
import { createTiling } from '../src/tilings';
import { polygonArea } from '../src/core/geometry';
import { buildTiles, sampleCoverage } from './helpers';

describe('Penrose P3', () => {
  it('contains both thick and thin rhombs in the golden ratio', () => {
    const edge = 22 * 1.11;
    const raw = createTiling('penrose', {
      width: 500,
      height: 380,
      tileSize: 22,
      seed: 4242,
    });
    const areas = raw.map((tile) => polygonArea(tile.parts[0]!));
    const thickArea = Math.sin((72 * Math.PI) / 180) * edge * edge;
    const thinArea = Math.sin((36 * Math.PI) / 180) * edge * edge;
    let thick = 0;
    let thin = 0;
    for (const area of areas) {
      if (Math.abs(area - thickArea) < thickArea * 0.04) thick += 1;
      else if (Math.abs(area - thinArea) < thinArea * 0.04) thin += 1;
    }
    expect(thick).toBeGreaterThan(100);
    expect(thin).toBeGreaterThan(50);
    const ratio = thick / thin;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.85);
  });

  it('fills a rectangular patch', () => {
    const width = 300;
    const height = 220;
    const tiles = buildTiles('penrose', width, height, 20, 77);
    const coverage = sampleCoverage(tiles, width, height, 600, 3);
    expect(coverage.overlaps).toBe(0);
    expect(coverage.uncovered).toBe(0);
  });

  it('stays gap-free for many random pentagrid offsets', () => {
    const width = 210;
    const height = 160;
    for (let seed = 1; seed <= 12; seed++) {
      const tiles = buildTiles('penrose', width, height, 15, seed * 7919);
      const area = tiles.reduce((sum, tile) => sum + tile.area, 0);
      expect(Math.abs(area - width * height) / (width * height)).toBeLessThan(0.003);
      const coverage = sampleCoverage(tiles, width, height, 180, seed * 31 + 5);
      expect(coverage.overlaps).toBe(0);
      expect(coverage.uncovered).toBe(0);
    }
  });

  it('changes the patch when the seed changes', () => {
    const a = createTiling('penrose', { width: 200, height: 160, tileSize: 20, seed: 1 });
    const b = createTiling('penrose', { width: 200, height: 160, tileSize: 20, seed: 2 });
    const centroid = (tiles: typeof a): string =>
      tiles
        .slice(0, 5)
        .map((tile) =>
          (tile.parts[0]![0]!.x + tile.parts[0]![2]!.x).toFixed(4),
        )
        .join('|');
    expect(centroid(a)).not.toEqual(centroid(b));
  });
});
