export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function srgbByteToLinear(value: number): number {
  return SRGB_TO_LINEAR[Math.max(0, Math.min(255, value | 0))]!;
}

export function linearChannelToSrgb(value: number): number {
  const c = Math.max(0, Math.min(1, value));
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function linearToRgb(color: LinearRgb): Rgb {
  return {
    r: Math.round(linearChannelToSrgb(color.r) * 255),
    g: Math.round(linearChannelToSrgb(color.g) * 255),
    b: Math.round(linearChannelToSrgb(color.b) * 255),
  };
}

export function rgbToLinear(color: Rgb): LinearRgb {
  return {
    r: srgbByteToLinear(color.r),
    g: srgbByteToLinear(color.g),
    b: srgbByteToLinear(color.b),
  };
}

export function rgbToHex(color: Rgb): string {
  const toHex = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function rgbToCss(color: Rgb): string {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

export function linearToOklab(color: LinearRgb): Oklab {
  const l = 0.4122214708 * color.r + 0.5363325363 * color.g + 0.0514459929 * color.b;
  const m = 0.2119034982 * color.r + 0.6806995451 * color.g + 0.1073969566 * color.b;
  const s = 0.0883024619 * color.r + 0.2817188376 * color.g + 0.6299787005 * color.b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function oklabToLinear(color: Oklab): LinearRgb {
  const lRoot = color.L + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.L - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.L - 0.0894841775 * color.a - 1.291485548 * color.b;

  const l = lRoot * lRoot * lRoot;
  const m = mRoot * mRoot * mRoot;
  const s = sRoot * sRoot * sRoot;

  return {
    r: Math.max(0, Math.min(1, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  };
}

export function oklabDistanceSq(a: Oklab, b: Oklab): number {
  const dl = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dl * dl + da * da + db * db;
}

export function mixLinear(a: LinearRgb, b: LinearRgb, t: number): LinearRgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}
