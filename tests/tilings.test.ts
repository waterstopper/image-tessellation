import { describe, expect, it } from 'vitest';
import { buildTiles, sampleCoverage, totalArea } from './helpers';
import { TILING_META } from '../src/tilings';

describe.each(TILING_META.map((meta) => [meta.id, meta.name] as const))(
  '%s tiling (%s)',
  (id) => {
    const width = 240;
    const height = 180;
    const tiles = buildTiles(id, width, height, 20, 1234);

    it('produces a reasonable number of tiles', () => {
      expect(tiles.length).toBeGreaterThan(70);
      expect(tiles.length).toBeLessThan(220);
    });

    it('covers the image without gaps or overlaps', () => {
      const area = totalArea(tiles);
      const imageArea = width * height;
      expect(Math.abs(area - imageArea) / imageArea).toBeLessThan(0.002);

      const coverage = sampleCoverage(tiles, width, height);
      expect(coverage.overlaps).toBe(0);
      expect(coverage.uncovered).toBe(0);
    });
  },
);

describe.each([8, 64])('extreme tile size %i px', (tileSize) => {
  it.each(TILING_META.map((meta) => [meta.id] as const))(
    '%s still tiles the whole image',
    (id) => {
      const width = 240;
      const height = 180;
      const tiles = buildTiles(id, width, height, tileSize, 99);
      expect(tiles.length).toBeGreaterThan(4);
      const area = totalArea(tiles);
      expect(Math.abs(area - width * height) / (width * height)).toBeLessThan(0.003);

      const coverage = sampleCoverage(tiles, width, height, 300, 5);
      expect(coverage.overlaps).toBe(0);
      expect(coverage.uncovered).toBe(0);
    },
  );
});
