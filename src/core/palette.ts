import {
  linearToOklab,
  linearToRgb,
  oklabDistanceSq,
  oklabToLinear,
  rgbToHex,
  rgbToLinear,
  type Oklab,
  type Rgb,
} from './color';
import { createRng } from './geometry';
import type { PaletteResult, Tile } from './types';

const MAX_ITERATIONS = 18;

function weightedPick(weights: Float64Array, total: number, random: number): number {
  let cursor = random * total;
  for (let i = 0; i < weights.length; i++) {
    cursor -= weights[i]!;
    if (cursor <= 0) return i;
  }
  return weights.length - 1;
}

function kmeansPlusPlus(labs: readonly Oklab[], weights: Float64Array, k: number, seed: number): Oklab[] {
  const rng = createRng(seed ^ 0xa5a5f00d);
  const count = labs.length;
  const minDistances = new Float64Array(count).fill(Infinity);
  const centers: Oklab[] = [];

  let totalWeight = 0;
  for (let i = 0; i < count; i++) totalWeight += weights[i]!;
  const first = weightedPick(weights, totalWeight, rng.next());
  centers.push(labs[first]!);
  for (let i = 0; i < count; i++) {
    minDistances[i] = oklabDistanceSq(labs[i]!, centers[0]!);
  }

  while (centers.length < k) {
    const scored = new Float64Array(count);
    let total = 0;
    for (let i = 0; i < count; i++) {
      const score = minDistances[i]! * weights[i]!;
      scored[i] = score;
      total += score;
    }

    let index: number;
    if (total <= 1e-15) {
      index = rng.int(0, count - 1);
    } else {
      index = weightedPick(scored, total, rng.next());
    }
    const center = labs[index]!;
    centers.push(center);
    for (let i = 0; i < count; i++) {
      const distance = oklabDistanceSq(labs[i]!, center);
      if (distance < minDistances[i]!) minDistances[i] = distance;
    }
  }

  return centers;
}

function refineCenters(
  labs: readonly Oklab[],
  weights: Float64Array,
  centers: Oklab[],
): { centers: Oklab[]; assignments: Uint16Array } {
  const count = labs.length;
  const k = centers.length;
  const assignments = new Uint16Array(count);
  const sums = new Float64Array(k * 3);
  const clusterWeights = new Float64Array(k);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    sums.fill(0);
    clusterWeights.fill(0);

    for (let i = 0; i < count; i++) {
      const lab = labs[i]!;
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < k; c++) {
        const center = centers[c]!;
        const dl = lab.L - center.L;
        const da = lab.a - center.a;
        const db = lab.b - center.b;
        const distance = dl * dl + da * da + db * db;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = c;
        }
      }
      assignments[i] = best;
      const weight = weights[i]!;
      clusterWeights[best] += weight;
      sums[best * 3] += lab.L * weight;
      sums[best * 3 + 1] += lab.a * weight;
      sums[best * 3 + 2] += lab.b * weight;
    }

    let maxShift = 0;
    for (let c = 0; c < k; c++) {
      const weight = clusterWeights[c]!;
      if (weight <= 1e-12) {
        // Re-seed an empty cluster with the worst-represented tile.
        let worstIndex = 0;
        let worstDistance = -1;
        for (let i = 0; i < count; i++) {
          const center = centers[assignments[i]!]!;
          const distance = oklabDistanceSq(labs[i]!, center);
          if (distance > worstDistance) {
            worstDistance = distance;
            worstIndex = i;
          }
        }
        centers[c] = labs[worstIndex]!;
        continue;
      }
      const next: Oklab = {
        L: sums[c * 3]! / weight,
        a: sums[c * 3 + 1]! / weight,
        b: sums[c * 3 + 2]! / weight,
      };
      maxShift = Math.max(maxShift, oklabDistanceSq(next, centers[c]!));
      centers[c] = next;
    }

    if (maxShift < 1e-10) break;
  }

  // One final assignment for the converged centers.
  for (let i = 0; i < count; i++) {
    const lab = labs[i]!;
    let best = 0;
    let bestDistance = Infinity;
    for (let c = 0; c < k; c++) {
      const distance = oklabDistanceSq(lab, centers[c]!);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = c;
      }
    }
    assignments[i] = best;
  }

  return { centers, assignments };
}

function representativeColors(tiles: readonly Tile[]): Rgb[] {
  const unique = new Map<string, { color: Rgb; weight: number }>();
  for (const tile of tiles) {
    const color = linearToRgb(tile.color);
    const key = rgbToHex(color);
    const entry = unique.get(key);
    if (entry) entry.weight += tile.area;
    else unique.set(key, { color, weight: tile.area });
  }
  return [...unique.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12)
    .map((entry) => entry.color);
}

export function applyPalette(
  tiles: readonly Tile[],
  colorLimit: number,
  seed: number,
): PaletteResult {
  if (tiles.length === 0) {
    return { colors: [], palette: [], indices: null, meanError: 0, limited: false };
  }

  const unlimited = colorLimit <= 0 || colorLimit >= tiles.length;
  if (unlimited) {
    return {
      colors: tiles.map((tile) => linearToRgb(tile.color)),
      palette: representativeColors(tiles),
      indices: null,
      meanError: 0,
      limited: false,
    };
  }

  const labs = tiles.map((tile) => linearToOklab(tile.color));
  const weights = new Float64Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) weights[i] = tiles[i]!.area;

  const k = Math.max(1, Math.min(colorLimit, tiles.length));
  const initial = kmeansPlusPlus(labs, weights, k, seed);
  const refined = refineCenters(labs, weights, initial);
  const centers = refined.centers;
  const assignments = refined.assignments;

  // Deduplicate centers that converged on top of each other and sort the
  // palette by lightness for a pleasant swatch display.
  const entries = centers.map((center, index) => ({
    index,
    rgb: linearToRgb(oklabToLinear(center)),
    lab: center,
  }));
  entries.sort((a, b) => a.lab.L - b.lab.L || a.lab.b - b.lab.b || a.lab.a - b.lab.a);

  const palette: Rgb[] = [];
  const remap = new Uint16Array(centers.length);
  const seen = new Map<string, number>();
  for (const entry of entries) {
    const hex = rgbToHex(entry.rgb);
    let target = seen.get(hex);
    if (target === undefined) {
      target = palette.length;
      seen.set(hex, target);
      palette.push(entry.rgb);
    }
    remap[entry.index] = target;
  }

  const paletteLabs = palette.map((color) => linearToOklab(rgbToLinear(color)));
  const colors: Rgb[] = new Array(tiles.length);
  const finalAssignments = new Uint16Array(tiles.length);
  let errorSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < tiles.length; i++) {
    const index = remap[assignments[i]!]!;
    finalAssignments[i] = index;
    const color = palette[index]!;
    colors[i] = color;
    errorSum += oklabDistanceSq(labs[i]!, paletteLabs[index]!) * weights[i]!;
    totalWeight += weights[i]!;
  }

  return {
    colors,
    palette,
    indices: finalAssignments,
    meanError: totalWeight > 0 ? Math.sqrt(errorSum / totalWeight) : 0,
    limited: true,
  };
}
