export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Cell {
  x: number;
  y: number;
}

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

const EPS = 1e-9;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}

export function signedArea(polygon: Polygon): number {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    sum += polygon[j]!.x * polygon[i]!.y - polygon[i]!.x * polygon[j]!.y;
  }
  return sum / 2;
}

export function polygonArea(polygon: Polygon): number {
  return Math.abs(signedArea(polygon));
}

export function polygonCentroid(polygon: Polygon): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!;
    const b = polygon[i]!;
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < EPS) {
    let x = 0;
    let y = 0;
    for (const p of polygon) {
      x += p.x;
      y += p.y;
    }
    return { x: x / polygon.length, y: y / polygon.length };
  }
  area /= 2;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function polygonBounds(polygon: Polygon): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function rectanglePolygon(x: number, y: number, width: number, height: number): Polygon {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function clipPolygonByHalfPlane(
  polygon: Polygon,
  normalX: number,
  normalY: number,
  constant: number,
): Polygon {
  const evaluate = (p: Point): number => normalX * p.x + normalY * p.y - constant;
  return clipHalfPlane(
    polygon,
    (p) => evaluate(p) <= 1e-9,
    (a, b) => {
      const da = evaluate(a);
      const db = evaluate(b);
      const t = da / (da - db || EPS);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    },
  );
}

function clipHalfPlane(
  polygon: Polygon,
  inside: (p: Point) => boolean,
  intersect: (a: Point, b: Point) => Point,
): Polygon {
  if (polygon.length === 0) return [];
  const out: Polygon = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i]!;
    const previous = polygon[(i + polygon.length - 1) % polygon.length]!;
    const currentInside = inside(current);
    const previousInside = inside(previous);
    if (currentInside) {
      if (!previousInside) out.push(intersect(previous, current));
      out.push(current);
    } else if (previousInside) {
      out.push(intersect(previous, current));
    }
  }
  return out;
}

function intersectX(a: Point, b: Point, x: number): Point {
  const t = (x - a.x) / (b.x - a.x || EPS);
  return { x, y: a.y + (b.y - a.y) * t };
}

function intersectY(a: Point, b: Point, y: number): Point {
  const t = (y - a.y) / (b.y - a.y || EPS);
  return { x: a.x + (b.x - a.x) * t, y };
}

/** Clips a polygon to the [0, width] × [0, height] image rectangle. */
export function clipPolygonToRect(polygon: Polygon, width: number, height: number): Polygon | null {
  let out = clipHalfPlane(polygon, (p) => p.x >= 0, (a, b) => intersectX(a, b, 0));
  out = clipHalfPlane(out, (p) => p.x <= width, (a, b) => intersectX(a, b, width));
  out = clipHalfPlane(out, (p) => p.y >= 0, (a, b) => intersectY(a, b, 0));
  out = clipHalfPlane(out, (p) => p.y <= height, (a, b) => intersectY(a, b, height));
  if (out.length < 3 || polygonArea(out) < 1e-6) return null;
  return out;
}

export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Returns the outer boundary of a set of grid cells as a polygon in cell units.
 * Cells are expected to be edge-connected (as every tetromino is).
 */
export function cellsOutline(cells: readonly Cell[]): Polygon {
  type Edge = { a: Point; b: Point };
  const edges = new Map<string, Edge>();
  const key = (x: number, y: number): string => `${x},${y}`;

  const toggle = (a: Point, b: Point): void => {
    const reverse = `${key(b.x, b.y)}>${key(a.x, a.y)}`;
    if (edges.has(reverse)) {
      edges.delete(reverse);
    } else {
      edges.set(`${key(a.x, a.y)}>${key(b.x, b.y)}`, { a, b });
    }
  };

  for (const cell of cells) {
    const x = cell.x;
    const y = cell.y;
    // Clockwise in screen coordinates, so the tile interior is always to the right.
    toggle({ x, y }, { x: x + 1, y });
    toggle({ x: x + 1, y }, { x: x + 1, y: y + 1 });
    toggle({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
    toggle({ x, y: y + 1 }, { x, y });
  }

  const outgoing = new Map<string, Point>();
  for (const edge of edges.values()) {
    outgoing.set(key(edge.a.x, edge.a.y), edge.b);
  }

  const loops: Polygon[] = [];
  const visited = new Set<string>();
  for (const edge of edges.values()) {
    const startKey = key(edge.a.x, edge.a.y);
    if (visited.has(startKey)) continue;
    const loop: Polygon = [];
    let cursor: Point | undefined = edge.a;
    let guard = 0;
    while (cursor && guard++ < 512) {
      const cursorKey = key(cursor.x, cursor.y);
      if (visited.has(cursorKey)) break;
      visited.add(cursorKey);
      loop.push(cursor);
      cursor = outgoing.get(cursorKey);
    }
    if (loop.length >= 4) loops.push(simplifyOrthogonalLoop(loop));
  }

  if (loops.length === 0) return [];
  loops.sort((a, b) => polygonArea(b) - polygonArea(a));
  return loops[0]!;
}

function simplifyOrthogonalLoop(loop: Polygon): Polygon {
  if (loop.length <= 4) return loop;
  const out: Polygon = [];
  for (let i = 0; i < loop.length; i++) {
    const prev = loop[(i + loop.length - 1) % loop.length]!;
    const curr = loop[i]!;
    const next = loop[(i + 1) % loop.length]!;
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 1e-9) out.push(curr);
  }
  return out;
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
