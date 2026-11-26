import type { LinearRgb, Rgb } from './color';
import type { BBox, Point, Polygon } from './geometry';

export type TilingId =
  | 'square'
  | 'triangle'
  | 'hexagon'
  | 'rhombille'
  | 'tetromino'
  | 'penrose'
  | 'voronoi';

export interface TilingOptions {
  width: number;
  height: number;
  /** Nominal tile size in source pixels. Tilings aim for an average tile area of tileSize². */
  tileSize: number;
  seed: number;
}

export interface RawTile {
  /** Convex pieces. Most tilings have exactly one; a tetromino is four square cells. */
  parts: Polygon[];
  /** Closed outline used for drawing grout/contours. */
  outline?: Polygon;
}

export interface Tile {
  parts: Polygon[];
  outline: Polygon;
  area: number;
  sampleCount: number;
  bbox: BBox;
  centroid: Point;
  color: LinearRgb;
}

export interface PixelData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface PreparedSource {
  width: number;
  height: number;
  imageData: PixelData;
  previewUrl: string;
  name: string;
  originalWidth: number;
  originalHeight: number;
}

export interface PaletteResult {
  /** Final color for every tile, in sRGB. */
  colors: Rgb[];
  /** Distinct palette colors (limited mode) or the most representative colors (unlimited). */
  palette: Rgb[];
  indices: Uint16Array | null;
  /** Mean OKLab distance between a tile's true average and its assigned palette color. */
  meanError: number;
  limited: boolean;
}

export interface TilingMeta {
  id: TilingId;
  name: string;
  subtitle: string;
  description: string;
  random: boolean;
}
