import type { Point } from '../core/geometry';
import type { RawTile, TilingOptions } from '../core/types';

/**
 * Equilateral triangle grid. Side length is chosen so that every triangle has
 * an area of roughly tileSize², keeping the grain consistent across tilings.
 */
export function triangleTiling({ width, height, tileSize }: TilingOptions): RawTile[] {
  const side = (Math.max(2, tileSize) * 2) / Math.pow(3, 0.25);
  const rowHeight = (side * Math.sqrt(3)) / 2;
  const tiles: RawTile[] = [];
  const firstRow = -2;
  const lastRow = Math.ceil(height / rowHeight) + 1;

  for (let row = firstRow; row <= lastRow; row++) {
    const topY = row * rowHeight;
    const bottomY = topY + rowHeight;
    const even = (row & 1) === 0;
    const firstCol = -3;
    const lastCol = Math.ceil(width / side) + 3;

    for (let col = firstCol; col <= lastCol; col++) {
      if (even) {
        const apex: Point = { x: col * side, y: topY };
        const left: Point = { x: (col - 0.5) * side, y: bottomY };
        const right: Point = { x: (col + 0.5) * side, y: bottomY };
        tiles.push({ parts: [[left, right, apex]] });

        const nextApex: Point = { x: (col + 1) * side, y: topY };
        tiles.push({ parts: [[apex, nextApex, right]] });
      } else {
        const apex: Point = { x: (col + 0.5) * side, y: topY };
        const left: Point = { x: col * side, y: bottomY };
        const right: Point = { x: (col + 1) * side, y: bottomY };
        tiles.push({ parts: [[left, right, apex]] });

        const previousApex: Point = { x: (col - 0.5) * side, y: topY };
        tiles.push({ parts: [[previousApex, apex, left]] });
      }
    }
  }

  return tiles;
}
