import type { TilingId } from '../core/types';

const svg = (content: string): string =>
  `<svg viewBox="0 0 56 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;

const STROKE = 'stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"';
const FILL = 'fill="currentColor" fill-opacity="0.07"';

export const TILING_ICONS: Record<TilingId, string> = {
  square: svg(`
    <g ${STROKE}>
      <rect x="9" y="4" width="12" height="10" ${FILL}/>
      <rect x="21" y="4" width="12" height="10" ${FILL}/>
      <rect x="33" y="4" width="12" height="10" ${FILL}/>
      <rect x="9" y="14" width="12" height="10" ${FILL}/>
      <rect x="21" y="14" width="12" height="10" ${FILL}/>
      <rect x="33" y="14" width="12" height="10" ${FILL}/>
      <rect x="9" y="24" width="12" height="10" ${FILL}/>
      <rect x="21" y="24" width="12" height="10" ${FILL}/>
      <rect x="33" y="24" width="12" height="10" ${FILL}/>
    </g>`),
  triangle: svg(`
    <g ${STROKE}>
      <path d="M8 34 L16 20 L24 34 Z" ${FILL}/>
      <path d="M24 34 L16 20 L32 20 Z" ${FILL}/>
      <path d="M24 34 L32 20 L40 34 Z" ${FILL}/>
      <path d="M40 34 L32 20 L48 20 Z" ${FILL}/>
      <path d="M8 34 L16 20 L32 20 L24 34 Z"/>
      <path d="M24 6 L32 20 L40 6 Z" ${FILL}/>
      <path d="M16 20 L24 6 L32 20 Z" ${FILL}/>
      <path d="M32 20 L40 6 L48 20 Z" ${FILL}/>
    </g>`),
  hexagon: svg(`
    <g ${STROKE}>
      <path d="M19 1 L27.7 6 L27.7 16 L19 21 L10.3 16 L10.3 6 Z" ${FILL}/>
      <path d="M36.4 1 L45.1 6 L45.1 16 L36.4 21 L27.7 16 L27.7 6 Z" ${FILL}/>
      <path d="M27.7 16 L36.4 21 L36.4 31 L27.7 36 L19 31 L19 21 Z" ${FILL}/>
    </g>`),
  rhombille: svg(`
    <g ${STROKE}>
      <path d="M28 5 L45 14.5 L45 27.5 L28 37 L11 27.5 L11 14.5 Z"/>
      <path d="M28 5 L28 21 L45 27.5"/>
      <path d="M28 5 L11 27.5"/>
      <path d="M28 21 L28 5 L45 14.5 L45 27.5 Z" ${FILL}/>
      <path d="M28 21 L45 27.5 L28 37 L11 27.5 Z" ${FILL}/>
      <path d="M28 21 L11 27.5 L11 14.5 L28 5 Z" ${FILL}/>
    </g>`),
  tetromino: svg(`
    <g ${STROKE}>
      <rect x="7" y="5" width="10" height="10" ${FILL}/>
      <rect x="17" y="5" width="10" height="10" ${FILL}/>
      <rect x="27" y="5" width="10" height="10" ${FILL}/>
      <rect x="27" y="15" width="10" height="10" ${FILL}/>
      <rect x="7" y="25" width="10" height="10" ${FILL}/>
      <rect x="17" y="25" width="10" height="10" ${FILL}/>
      <rect x="17" y="15" width="10" height="10" ${FILL}/>
      <rect x="37" y="15" width="10" height="10" ${FILL}/>
      <rect x="37" y="25" width="10" height="10" ${FILL}/>
    </g>`),
  penrose: svg(`
    <g ${STROKE}>
      <path d="M28 4 L44 15 L37 34 L19 34 L12 15 Z" ${FILL}/>
      <path d="M28 4 L35 15 L28 22 L21 15 Z" ${FILL}/>
      <path d="M28 22 L37 34 L19 34 Z" ${FILL}/>
      <path d="M12 15 L21 15 L28 22 L19 34 Z" ${FILL}/>
      <path d="M44 15 L35 15 L28 22 L37 34 Z" ${FILL}/>
    </g>`),
  voronoi: svg(`
    <g ${STROKE}>
      <path d="M6 6 L22 8 L26 20 L14 33 L5 24 Z" ${FILL}/>
      <path d="M22 8 L38 5 L48 16 L40 30 L26 20 Z" ${FILL}/>
      <path d="M14 33 L26 20 L40 30 L36 36 L18 37 Z" ${FILL}/>
      <path d="M40 30 L48 16 L51 26 L46 35 L36 36 Z" ${FILL}/>
      <path d="M5 24 L14 33 L18 37 L7 37 L3 31 Z" ${FILL}/>
    </g>`),
};

export const LOGO_SVG = `
<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" stroke="currentColor" stroke-width="1.6"/>
  <path d="M20 3 L20 20 M20 20 L35 11.5 M20 20 L5 28.5" stroke="currentColor" stroke-width="1.6"/>
  <path d="M20 3 L35 11.5 L20 20 L5 11.5 Z" fill="currentColor" fill-opacity="0.16"/>
  <path d="M20 20 L35 28.5 L20 37 L5 28.5 Z" fill="currentColor" fill-opacity="0.08"/>
</svg>`;

export const SHUFFLE_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M3 7h3.2c1.4 0 2.7.7 3.5 1.9l4.6 6.2a4.2 4.2 0 0 0 3.5 1.9H21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M3 17h3.2c1.4 0 2.7-.7 3.5-1.9l1.4-1.9M13.9 9l1.4-1.9A4.2 4.2 0 0 1 18.8 5H21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="m18 2.5 3 2.5-3 2.5M18 14.5l3 2.5-3 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const DOWNLOAD_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const UPLOAD_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 16V5m0 0 4 4m-4-4L8 9M4 16v3.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const COMPARE_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6"/>
  <path d="M3.8 5.8c0-1 .8-1.8 1.8-1.8H12v16H5.6c-1 0-1.8-.8-1.8-1.8Z" fill="currentColor" fill-opacity="0.32"/>
</svg>`;
