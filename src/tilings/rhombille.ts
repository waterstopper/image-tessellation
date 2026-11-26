import { hexagonVertices } from './hexagon';
import type { RawTile, TilingOptions } from '../core/types';

/**
 * Roman rhombille mosaic: every hexagon is split into three 60°/120° rhombs.
 * The hexagon side is chosen so one rhomb has an area of roughly tileSize².
 */
export function rhombilleTiling({ width, height, tileSize }: TilingOptions): RawTile[] {
  const radius = Math.max(2, tileSize) * Math.sqrt(2 / Math.sqrt(3));
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
      const vertices = hexagonVertices(cx, cy, radius);
      const center = { x: cx, y: cy };

      // The three rhombs share the center and touch alternating hex vertices.
      const triplets = [
        [0, 1, 2],
        [2, 3, 4],
        [4, 5, 0],
      ] as const;
      for (const [a, b, c] of triplets) {
        tiles.push({
          parts: [[center, vertices[a]!, vertices[b]!, vertices[c]!]],
        });
      }
    }
  }

  return tiles;
}
