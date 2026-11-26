import type { Point } from '../core/geometry';
import type { RawTile, TilingOptions } from '../core/types';

export function hexagonVertices(centerX: number, centerY: number, radius: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    points.push({ x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
  }
  return points;
}

/** Pointy-top hexagonal tiling with an average cell area of tileSize². */
export function hexagonTiling({ width, height, tileSize }: TilingOptions): RawTile[] {
  const radius = Math.max(2, tileSize) * Math.sqrt(2 / (3 * Math.sqrt(3)));
  const columnWidth = Math.sqrt(3) * radius;
  const rowHeight = 1.5 * radius;
  const tiles: RawTile[] = [];
  const firstRow = -2;
  const lastRow = Math.ceil(height / rowHeight) + 2;
  const firstCol = -2;
  const lastCol = Math.ceil(width / columnWidth) + 2;

  for (let row = firstRow; row <= lastRow; row++) {
    const offset = (row & 1) === 0 ? 0 : columnWidth / 2;
    for (let col = firstCol; col <= lastCol; col++) {
      const cx = col * columnWidth + offset;
      const cy = row * rowHeight;
      tiles.push({ parts: [hexagonVertices(cx, cy, radius)] });
    }
  }

  return tiles;
}
