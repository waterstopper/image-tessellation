import { describe, expect, it } from 'vitest';
import { applyPalette } from '../src/core/palette';
import { rgbToLinear, type LinearRgb } from '../src/core/color';
import type { Tile } from '../src/core/types';

function syntheticTile(color: LinearRgb, index: number): Tile {
  return {
    parts: [],
    outline: [],
    area: 1,
    sampleCount: 1,
    bbox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    centroid: { x: index, y: 0 },
    color,
  };
}

function cluster(
  count: number,
  base: [number, number, number],
  jitter: number,
  offset: number,
): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    const delta = (i % 5) * jitter - jitter * 2;
    const color = rgbToLinear({
      r: base[0] + delta,
      g: base[1] - delta * 0.4,
      b: base[2] + delta * 0.3,
    });
    tiles.push(syntheticTile(color, offset + i));
  }
  return tiles;
}

describe('palette quantization', () => {
  const tiles = [
    ...cluster(40, [220, 40, 40], 4, 0),
    ...cluster(40, [40, 200, 70], 4, 100),
    ...cluster(40, [40, 70, 220], 4, 200),
  ];

  it('limits the palette to the requested number of colors', () => {
    const result = applyPalette(tiles, 3, 7);
    expect(result.limited).toBe(true);
    expect(result.palette.length).toBeLessThanOrEqual(3);
    expect(result.colors).toHaveLength(tiles.length);
    expect(result.indices).not.toBeNull();
    expect(result.meanError).toBeGreaterThanOrEqual(0);
    expect(result.meanError).toBeLessThan(0.2);
  });

  it('assigns one palette color per cluster', () => {
    const result = applyPalette(tiles, 3, 7);
    for (let i = 0; i < 40; i++) {
      expect(result.colors[i]).toEqual(result.colors[0]);
      expect(result.colors[40 + i]).toEqual(result.colors[40]);
      expect(result.colors[80 + i]).toEqual(result.colors[80]);
    }
    expect(result.colors[0]).not.toEqual(result.colors[40]);
    expect(result.colors[40]).not.toEqual(result.colors[80]);
  });

  it('supports a single-color palette', () => {
    const result = applyPalette(tiles, 1, 5);
    expect(result.limited).toBe(true);
    expect(result.palette).toHaveLength(1);
    for (const color of result.colors) expect(color).toEqual(result.palette[0]);
  });

  it('supports an unlimited palette', () => {
    const result = applyPalette(tiles, 0, 7);
    expect(result.limited).toBe(false);
    expect(result.indices).toBeNull();
    expect(result.colors).toHaveLength(tiles.length);
    expect(result.palette.length).toBeGreaterThan(0);
  });

  it('is deterministic for a fixed seed', () => {
    const first = applyPalette(tiles, 3, 99);
    const second = applyPalette(tiles, 3, 99);
    expect(first.colors).toEqual(second.colors);
  });
});
