import { rgbToCss, type Rgb } from './color';
import type { Tile } from './types';

export interface RenderOptions {
  /** Width of the contour lines in pixels. 0 disables them. */
  grout: number;
}

const CONTOUR_COLOR = 'rgba(8, 8, 12, 0.32)';

export function renderMosaic(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  tiles: readonly Tile[],
  colors: readonly Rgb[],
  options: RenderOptions,
): void {
  context.save();
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  const sealSeams = options.grout <= 0.05;
  context.lineJoin = 'round';
  context.lineCap = 'round';

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const color = colors[i]!;
    const css = rgbToCss(color);
    context.beginPath();
    for (const part of tile.parts) {
      if (part.length < 3) continue;
      context.moveTo(part[0]!.x, part[0]!.y);
      for (let p = 1; p < part.length; p++) context.lineTo(part[p]!.x, part[p]!.y);
      context.closePath();
    }
    context.fillStyle = css;
    context.fill();
    if (sealSeams) {
      context.strokeStyle = css;
      context.lineWidth = 0.8;
      context.stroke();
    }
  }

  if (options.grout > 0.05) {
    context.save();
    context.beginPath();
    context.rect(0, 0, width, height);
    context.clip();
    context.strokeStyle = CONTOUR_COLOR;
    context.lineWidth = options.grout;
    for (const tile of tiles) {
      const outline = tile.outline;
      if (outline.length < 3) continue;
      context.beginPath();
      context.moveTo(outline[0]!.x, outline[0]!.y);
      for (let p = 1; p < outline.length; p++) context.lineTo(outline[p]!.x, outline[p]!.y);
      context.closePath();
      context.stroke();
    }
    context.restore();
  }

  context.restore();
}
