import type { RawTile, TilingId, TilingMeta, TilingOptions } from '../core/types';
import { squareTiling } from './square';
import { triangleTiling } from './triangle';
import { hexagonTiling } from './hexagon';
import { rhombilleTiling } from './rhombille';
import { tetrominoTiling } from './tetromino';
import { penroseTiling } from './penrose';
import { voronoiTiling } from './voronoi';

export type TilingGenerator = (options: TilingOptions) => RawTile[];

export const TILINGS: Record<TilingId, TilingGenerator> = {
  square: squareTiling,
  triangle: triangleTiling,
  hexagon: hexagonTiling,
  rhombille: rhombilleTiling,
  tetromino: tetrominoTiling,
  penrose: penroseTiling,
  voronoi: voronoiTiling,
};

export const TILING_META: readonly TilingMeta[] = [
  {
    id: 'square',
    name: 'Squares',
    subtitle: 'Square grid',
    description: 'A clean, predictable grid.',
    random: false,
  },
  {
    id: 'triangle',
    name: 'Triangles',
    subtitle: 'Triangular',
    description: 'A dense grid of equilateral triangles.',
    random: false,
  },
  {
    id: 'hexagon',
    name: 'Hexagons',
    subtitle: 'Honeycomb',
    description: 'Hexagonal cells, like a honeycomb.',
    random: false,
  },
  {
    id: 'rhombille',
    name: 'Rhombille',
    subtitle: 'Roman rhombille',
    description: 'Roman mosaic: each hexagon is split into three rhombi.',
    random: false,
  },
  {
    id: 'tetromino',
    name: 'Tetromino',
    subtitle: '4-cell pieces',
    description: 'I, O, T, S, Z, J and L pieces, shuffled without repeating blocks.',
    random: true,
  },
  {
    id: 'penrose',
    name: 'Penrose P3',
    subtitle: 'Penrose rhombs',
    description: 'A quasicrystal of thick and thin rhombi. Never repeats.',
    random: true,
  },
  {
    id: 'voronoi',
    name: 'Voronoi',
    subtitle: 'Organic cells',
    description: 'Organic cells resembling shards or stained glass.',
    random: true,
  },
];

export function createTiling(id: TilingId, options: TilingOptions): RawTile[] {
  return TILINGS[id](options);
}
