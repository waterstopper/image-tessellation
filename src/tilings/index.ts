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
    name: 'Квадраты',
    subtitle: 'Square grid',
    description: 'Ровная классическая сетка. Самый предсказуемый результат.',
    random: false,
  },
  {
    id: 'triangle',
    name: 'Треугольники',
    subtitle: 'Triangular',
    description: 'Плотная сетка из равносторонних треугольников.',
    random: false,
  },
  {
    id: 'hexagon',
    name: 'Соты',
    subtitle: 'Hexagonal',
    description: 'Шестиугольники, как пчелиные соты.',
    random: false,
  },
  {
    id: 'rhombille',
    name: 'Ромбилль',
    subtitle: 'Roman rhombille',
    description: 'Римская мозаика: каждый шестиугольник расколот на три ромба.',
    random: false,
  },
  {
    id: 'tetromino',
    name: 'Тетромино',
    subtitle: 'Tetromino',
    description: 'Фигуры из четырёх клеток: I, O, T, S, Z, J и L.',
    random: true,
  },
  {
    id: 'penrose',
    name: 'Пенроуз P3',
    subtitle: 'Penrose rhombi',
    description: 'Квазикристалл из толстых и тонких ромбов. Не повторяется.',
    random: true,
  },
  {
    id: 'voronoi',
    name: 'Вороной',
    subtitle: 'Voronoi',
    description: 'Органические ячейки, похожие на осколки или витраж.',
    random: true,
  },
];

export function createTiling(id: TilingId, options: TilingOptions): RawTile[] {
  return TILINGS[id](options);
}
