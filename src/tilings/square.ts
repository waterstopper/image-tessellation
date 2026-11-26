import type { RawTile, TilingOptions } from '../core/types';
import { rectanglePolygon } from '../core/geometry';

export function squareTiling({ width, height, tileSize }: TilingOptions): RawTile[] {
  const size = Math.max(2, tileSize);
  const tiles: RawTile[] = [];
  for (let y = -size; y < height + size; y += size) {
    for (let x = -size; x < width + size; x += size) {
      tiles.push({ parts: [rectanglePolygon(x, y, size, size)] });
    }
  }
  return tiles;
}
