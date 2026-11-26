import {
  cellsOutline,
  createRng,
  rectanglePolygon,
  type Cell,
  type Point,
  type Rng,
} from '../core/geometry';
import type { RawTile, TilingOptions } from '../core/types';

const BLOCK = 8;
const NODE_LIMIT = 80_000;

const BASE_SHAPES: readonly (readonly Cell[])[] = [
  // I
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  // O
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  // T
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }],
  // S
  [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  // Z
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  // J
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  // L
  [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
];

function normalize(cells: readonly Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function cellsKey(cells: readonly Cell[]): string {
  return cells.map(cellKey).join(';');
}

function pieceSignature(piece: readonly Cell[]): string {
  return piece.map(cellKey).sort().join('|');
}

function pairSignature(a: readonly Cell[], b: readonly Cell[]): string {
  return [pieceSignature(a), pieceSignature(b)].sort().join(';');
}

function buildOrientations(): Cell[][] {
  const result: Cell[][] = [];
  const seen = new Set<string>();
  for (const shape of BASE_SHAPES) {
    let current = normalize(shape);
    for (let rotation = 0; rotation < 4; rotation++) {
      const key = cellsKey(current);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(current);
      }
      current = normalize(current.map((c) => ({ x: -c.y, y: c.x })));
    }
  }
  return result;
}

const ORIENTATIONS = buildOrientations();

const PLACEMENTS = new Map<number, number[][]>();
for (const shape of ORIENTATIONS) {
  const maxX = Math.max(...shape.map((c) => c.x));
  const maxY = Math.max(...shape.map((c) => c.y));
  for (let y = 0; y <= BLOCK - 1 - maxY; y++) {
    for (let x = 0; x <= BLOCK - 1 - maxX; x++) {
      const cells = shape.map((c) => (y + c.y) * BLOCK + (x + c.x));
      const anchor = Math.min(...cells);
      const list = PLACEMENTS.get(anchor);
      if (list) list.push(cells);
      else PLACEMENTS.set(anchor, [cells]);
    }
  }
}

function fallbackPattern(): Cell[][] {
  const tiles: Cell[][] = [];
  for (let y = 0; y < BLOCK; y++) {
    for (let x = 0; x < BLOCK; x += 4) {
      tiles.push([
        { x, y },
        { x: x + 1, y },
        { x: x + 2, y },
        { x: x + 3, y },
      ]);
    }
  }
  return tiles;
}

function randomBlockPattern(rng: Rng): Cell[][] {
  const board = new Uint8Array(BLOCK * BLOCK);
  const placed: number[][] = [];
  let nodes = 0;
  let exhausted = false;

  const solve = (): boolean => {
    if (exhausted) return false;
    if (++nodes > NODE_LIMIT) {
      exhausted = true;
      return false;
    }
    let first = -1;
    for (let i = 0; i < board.length; i++) {
      if (board[i] === 0) {
        first = i;
        break;
      }
    }
    if (first < 0) return true;

    const candidates = PLACEMENTS.get(first);
    if (!candidates || candidates.length === 0) return false;
    const offset = rng.int(0, candidates.length - 1);
    for (let k = 0; k < candidates.length; k++) {
      const cells = candidates[(offset + k) % candidates.length]!;
      let fits = true;
      for (const cell of cells) {
        if (board[cell] === 1) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;

      for (const cell of cells) board[cell] = 1;
      placed.push(cells);
      if (solve()) return true;
      placed.pop();
      for (const cell of cells) board[cell] = 0;
    }
    return false;
  };

  if (!solve()) return fallbackPattern();

  return placed.map((cells) =>
    cells.map((index) => ({ x: index % BLOCK, y: Math.floor(index / BLOCK) })),
  );
}

function transformPattern(pattern: readonly Cell[][], mirror: boolean, rotations: number): Cell[][] {
  return pattern.map((tile) =>
    tile.map((cell) => {
      let x = mirror ? BLOCK - 1 - cell.x : cell.x;
      let y = cell.y;
      for (let i = 0; i < rotations; i++) {
        const nx = BLOCK - 1 - y;
        const ny = x;
        x = nx;
        y = ny;
      }
      return { x, y };
    }),
  );
}

interface PairPattern {
  pieces: [Cell[], Cell[]];
  signature: string;
}

/**
 * All ways to retile the union of two adjacent tetrominoes. The union has
 * exactly eight cells, so every alternative also consists of two pieces.
 * Results are cached by the shape of the union, not by its position.
 */
const PAIR_PATTERNS = new Map<string, PairPattern[]>();

function computePairPatterns(target: readonly Cell[]): PairPattern[] {
  const normalized = normalize(target);
  const targetSet = new Map<string, number>();
  for (let i = 0; i < normalized.length; i++) {
    targetSet.set(cellKey(normalized[i]!), i);
  }
  const maxX = Math.max(...normalized.map((c) => c.x));
  const maxY = Math.max(...normalized.map((c) => c.y));

  const placements: { cells: Cell[]; mask: number }[] = [];
  for (const orientation of ORIENTATIONS) {
    const orientationMaxX = Math.max(...orientation.map((c) => c.x));
    const orientationMaxY = Math.max(...orientation.map((c) => c.y));
    if (orientationMaxX > maxX || orientationMaxY > maxY) continue;
    for (let y = 0; y <= maxY - orientationMaxY; y++) {
      for (let x = 0; x <= maxX - orientationMaxX; x++) {
        const cells = orientation.map((c) => ({ x: x + c.x, y: y + c.y }));
        let mask = 0;
        let fits = true;
        for (const cell of cells) {
          const bit = targetSet.get(cellKey(cell));
          if (bit === undefined) {
            fits = false;
            break;
          }
          mask |= 1 << bit;
        }
        if (fits) placements.push({ cells, mask });
      }
    }
  }

  const patterns: PairPattern[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < placements.length; i++) {
    const first = placements[i]!;
    for (let j = i + 1; j < placements.length; j++) {
      const second = placements[j]!;
      if ((first.mask & second.mask) !== 0) continue;
      // Both placements are subsets of the 8-cell union, so a disjoint pair
      // covers it exactly.
      const signature = pairSignature(first.cells, second.cells);
      if (seen.has(signature)) continue;
      seen.add(signature);
      patterns.push({ pieces: [first.cells, second.cells], signature });
    }
  }
  return patterns;
}

function tryPairFlip(
  firstId: number,
  secondId: number,
  tiles: Cell[][],
  owner: Int32Array,
  cols: number,
  rng: Rng,
): boolean {
  const first = tiles[firstId];
  const second = tiles[secondId];
  if (!first || !second) return false;

  let minX = Infinity;
  let minY = Infinity;
  for (const cell of first) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
  }
  for (const cell of second) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
  }

  const firstLocal = first.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  const secondLocal = second.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  const union = [...firstLocal, ...secondLocal];
  if (new Set(union.map(cellKey)).size !== 8) return false;

  const shapeKey = union.map(cellKey).sort().join(';');
  let patterns = PAIR_PATTERNS.get(shapeKey);
  if (!patterns) {
    patterns = computePairPatterns(union);
    PAIR_PATTERNS.set(shapeKey, patterns);
  }
  if (patterns.length < 2) return false;

  const currentSignature = pairSignature(firstLocal, secondLocal);
  const start = rng.int(0, patterns.length - 1);
  let chosen: PairPattern | null = null;
  for (let k = 0; k < patterns.length; k++) {
    const candidate = patterns[(start + k) % patterns.length]!;
    if (candidate.signature !== currentSignature) {
      chosen = candidate;
      break;
    }
  }
  if (!chosen) return false;

  for (const cell of first) owner[cell.y * cols + cell.x] = -1;
  for (const cell of second) owner[cell.y * cols + cell.x] = -1;

  const nextFirst = chosen.pieces[0].map((c) => ({ x: c.x + minX, y: c.y + minY }));
  const nextSecond = chosen.pieces[1].map((c) => ({ x: c.x + minX, y: c.y + minY }));
  tiles[firstId] = nextFirst;
  tiles[secondId] = nextSecond;
  for (const cell of nextFirst) owner[cell.y * cols + cell.x] = firstId;
  for (const cell of nextSecond) owner[cell.y * cols + cell.x] = secondId;
  return true;
}

/**
 * Random tetromino tiling.
 *
 * A fast exact-cover solver fills 8×8 blocks with fresh (never reused)
 * patterns. Those blocks would leave an obvious 8-cell grid, so the result is
 * then relaxed with thousands of local pair flips: two neighboring tiles are
 * retiled inside their union, including flips across block borders. This
 * removes the grid and produces a globally varied tiling without ever leaving
 * a hole or double-covering a cell.
 */
export function tetrominoTiling({ width, height, tileSize, seed }: TilingOptions): RawTile[] {
  const rng = createRng(seed ^ 0x51ed270b);
  const cellSize = Math.max(1, tileSize / 2);
  const startCellX = -rng.int(0, BLOCK - 1);
  const startCellY = -rng.int(0, BLOCK - 1);
  const originX = startCellX * cellSize;
  const originY = startCellY * cellSize;
  const cols = Math.ceil((width - originX) / cellSize / BLOCK) * BLOCK;
  const rows = Math.ceil((height - originY) / cellSize / BLOCK) * BLOCK;

  const tileCells: Cell[][] = [];
  const owner = new Int32Array(cols * rows).fill(-1);

  const addTile = (cells: Cell[]): void => {
    const id = tileCells.length;
    for (const cell of cells) owner[cell.y * cols + cell.x] = id;
    tileCells.push(cells);
  };

  for (let blockY = 0; blockY < rows; blockY += BLOCK) {
    for (let blockX = 0; blockX < cols; blockX += BLOCK) {
      const pattern = randomBlockPattern(rng);
      const transformed = transformPattern(pattern, rng.next() < 0.5, rng.int(0, 3));
      for (const tile of transformed) {
        addTile(tile.map((cell) => ({ x: blockX + cell.x, y: blockY + cell.y })));
      }
    }
  }

  // Relax the block grid. A pair flip preserves the exact cover, so no
  // coverage checks are required after the initial block filling.
  const attempts = Math.min(120_000, Math.max(2_000, Math.round(tileCells.length * 3)));
  const wantedSuccesses = tileCells.length * 2;
  let successes = 0;

  for (let attempt = 0; attempt < attempts && successes < wantedSuccesses; attempt++) {
    let firstId = -1;
    let secondId = -1;
    const mode = rng.next();

    if (mode < 0.45 && cols >= 16 && rows >= 3) {
      // Cross a vertical block seam.
      const boundaryCount = Math.floor((cols - 8) / BLOCK);
      const boundary = 8 + BLOCK * rng.int(0, boundaryCount - 1);
      const y = rng.int(1, rows - 2);
      firstId = owner[y * cols + boundary - 1];
      secondId = owner[y * cols + boundary];
    } else if (mode < 0.8 && rows >= 16 && cols >= 3) {
      // Cross a horizontal block seam.
      const boundaryCount = Math.floor((rows - 8) / BLOCK);
      const boundary = 8 + BLOCK * rng.int(0, boundaryCount - 1);
      const x = rng.int(1, cols - 2);
      firstId = owner[(boundary - 1) * cols + x];
      secondId = owner[boundary * cols + x];
    } else if (cols >= 3 && rows >= 3) {
      // Mix the interior as well.
      const x = rng.int(1, cols - 2);
      const y = rng.int(1, rows - 2);
      const direction = rng.int(0, 3);
      const nx = x + (direction === 0 ? 1 : direction === 1 ? -1 : 0);
      const ny = y + (direction === 2 ? 1 : direction === 3 ? -1 : 0);
      firstId = owner[y * cols + x];
      secondId = owner[ny * cols + nx];
    }

    if (firstId < 0 || secondId < 0 || firstId === secondId) continue;
    if (tryPairFlip(firstId, secondId, tileCells, owner, cols, rng)) successes++;
  }

  const tiles: RawTile[] = [];
  for (const cells of tileCells) {
    const parts = cells.map((cell) =>
      rectanglePolygon(
        originX + cell.x * cellSize,
        originY + cell.y * cellSize,
        cellSize,
        cellSize,
      ),
    );

    const rawOutline = cellsOutline(cells);
    const outline: Point[] = rawOutline.map((p) => ({
      x: originX + p.x * cellSize,
      y: originY + p.y * cellSize,
    }));

    tiles.push({ parts, outline: outline.length >= 3 ? outline : undefined });
  }

  return tiles;
}
