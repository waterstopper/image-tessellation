import { describe, expect, it } from 'vitest';
import {
  linearToOklab,
  linearToRgb,
  oklabToLinear,
  rgbToLinear,
  type LinearRgb,
} from '../src/core/color';

describe('color conversions', () => {
  it('round-trips sRGB bytes through linear light', () => {
    const samples = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 217, g: 255, b: 99 },
      { r: 18, g: 92, b: 164 },
    ];
    for (const sample of samples) {
      expect(linearToRgb(rgbToLinear(sample))).toEqual(sample);
    }
  });

  it('round-trips linear colors through OKLab', () => {
    const samples: LinearRgb[] = [
      { r: 0, g: 0, b: 0 },
      { r: 1, g: 1, b: 1 },
      { r: 0.8, g: 0.2, b: 0.1 },
      { r: 0.1, g: 0.5, b: 0.9 },
    ];
    for (const sample of samples) {
      const back = oklabToLinear(linearToOklab(sample));
      expect(back.r).toBeCloseTo(sample.r, 5);
      expect(back.g).toBeCloseTo(sample.g, 5);
      expect(back.b).toBeCloseTo(sample.b, 5);
    }
  });

  it('represents white with unit lightness', () => {
    const white = linearToOklab({ r: 1, g: 1, b: 1 });
    expect(white.L).toBeCloseTo(1, 5);
    expect(white.a).toBeCloseTo(0, 5);
    expect(white.b).toBeCloseTo(0, 5);
  });
});
