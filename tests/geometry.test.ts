import { describe, expect, it } from 'vitest';
import { cellsOutline, clipPolygonToRect, polygonArea, signedArea } from '../src/core/geometry';
import type { Polygon } from '../src/core/geometry';

describe('polygon geometry', () => {
  it('computes area and winding', () => {
    const square: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(signedArea(square)).toBe(100);
    expect(polygonArea(square)).toBe(100);
  });

  it('clips polygons to the image rectangle', () => {
    const polygon: Polygon = [
      { x: -10, y: -10 },
      { x: 20, y: -10 },
      { x: 20, y: 20 },
      { x: -10, y: 20 },
    ];
    const clipped = clipPolygonToRect(polygon, 10, 10);
    expect(clipped).not.toBeNull();
    if (!clipped) return;
    expect(polygonArea(clipped)).toBeCloseTo(100, 5);
  });

  it('returns null for polygons fully outside the image', () => {
    const polygon: Polygon = [
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
    ];
    expect(clipPolygonToRect(polygon, 10, 10)).toBeNull();
  });
});

describe('tetromino outlines', () => {
  it('traces the T tetromino boundary', () => {
    const outline = cellsOutline([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(polygonArea(outline)).toBeCloseTo(4, 6);
    expect(outline.length).toBe(8);
  });

  it('traces the O tetromino as a square', () => {
    const outline = cellsOutline([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(outline.length).toBe(4);
    expect(polygonArea(outline)).toBeCloseTo(4, 6);
  });

  it('traces an L shape', () => {
    const outline = cellsOutline([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(outline.length).toBe(6);
    expect(polygonArea(outline)).toBeCloseTo(4, 6);
  });
});
