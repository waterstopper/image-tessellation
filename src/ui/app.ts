import { analyzeTiles } from '../core/analyze';
import { applyPalette } from '../core/palette';
import { renderMosaic } from '../core/render';
import { prepareSource } from '../core/source';
import type { PaletteResult, PreparedSource, TilingId } from '../core/types';
import { createTiling, TILING_META } from '../tilings';
import {
  COMPARE_SVG,
  DOWNLOAD_SVG,
  LOGO_SVG,
  SHUFFLE_SVG,
  TILING_ICONS,
  UPLOAD_SVG,
} from './icons';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const DEFAULT_SEED = 20261126;

interface State {
  source: PreparedSource | null;
  tiling: TilingId;
  tileSize: number;
  colorLimit: number;
  unlimited: boolean;
  seed: number;
  grout: number;
  showOriginal: boolean;
  analysis: ReturnType<typeof analyzeTiles> | null;
  palette: PaletteResult | null;
  lastTiming: number;
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

const params = new URLSearchParams(window.location.search);
const availableTilings = new Set<string>(TILING_META.map((meta) => meta.id));
const requestedTiling = params.get('type') ?? '';
const initialTiling = availableTilings.has(requestedTiling)
  ? (requestedTiling as TilingId)
  : 'square';
const initialUnlimited = params.get('colors') === '0' || params.get('unlimited') === '1';
const parsedTile = Number(params.get('tile'));
const parsedColors = Number(params.get('colors'));
const parsedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const parsedGrout = params.has('grout') ? Number(params.get('grout')) : 0.8;

const state: State = {
  source: null,
  tiling: initialTiling,
  tileSize: Math.round(clamp(Number.isFinite(parsedTile) && parsedTile > 0 ? parsedTile : 26, 8, 80)),
  colorLimit: Math.round(
    clamp(Number.isFinite(parsedColors) && parsedColors >= 1 ? parsedColors : 12, 1, 40),
  ),
  unlimited: initialUnlimited,
  seed: Number.isFinite(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_SEED,
  grout: clamp(Number.isFinite(parsedGrout) ? parsedGrout : 0.8, 0, 2.4),
  showOriginal: false,
  analysis: null,
  palette: null,
  lastTiming: 0,
};

const ui = {
  brandMark: must<HTMLSpanElement>('#brand-mark'),
  tileSize: must<HTMLInputElement>('#tile-size'),
  tileSizeValue: must<HTMLOutputElement>('#tile-size-value'),
  colorLimit: must<HTMLInputElement>('#color-limit'),
  colorLimitValue: must<HTMLOutputElement>('#color-limit-value'),
  unlimited: must<HTMLInputElement>('#unlimited-colors'),
  grout: must<HTMLInputElement>('#grout'),
  groutValue: must<HTMLOutputElement>('#grout-value'),
  tilingGrid: must<HTMLDivElement>('#tiling-grid'),
  tilingHint: must<HTMLParagraphElement>('#tiling-hint'),
  shuffleButton: must<HTMLButtonElement>('#shuffle-button'),
  palette: must<HTMLDivElement>('#palette'),
  paletteBar: must<HTMLDivElement>('#palette-bar'),
  paletteCount: must<HTMLSpanElement>('#palette-count'),
  sourceName: must<HTMLElement>('#source-name'),
  sourceDims: must<HTMLSpanElement>('#source-dims'),
  sourceThumb: must<HTMLImageElement>('#source-thumb'),
  originalImage: must<HTMLImageElement>('#original-image'),
  canvas: must<HTMLCanvasElement>('#canvas'),
  stage: must<HTMLElement>('#stage'),
  stageEmpty: must<HTMLDivElement>('#stage-empty'),
  dropOverlay: must<HTMLDivElement>('#drop-overlay'),
  busyOverlay: must<HTMLDivElement>('#busy-overlay'),
  busyLabel: must<HTMLSpanElement>('#busy-label'),
  stats: must<HTMLSpanElement>('#stats'),
  fileInput: must<HTMLInputElement>('#file-input'),
  compareButton: must<HTMLButtonElement>('#compare-button'),
  downloadButton: must<HTMLButtonElement>('#download-button'),
  openFileButton: must<HTMLButtonElement>('#open-file-button'),
  sampleButton: must<HTMLButtonElement>('#sample-button'),
};

const context = ui.canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is not available');

const colorControl = ui.colorLimit.closest<HTMLElement>('.control') ?? ui.colorLimit.parentElement;

let runToken = 0;
let loadToken = 0;
let buildTimer: ReturnType<typeof setTimeout> | null = null;
let paletteTimer: ReturnType<typeof setTimeout> | null = null;
let renderTimer: ReturnType<typeof setTimeout> | null = null;
let dragDepth = 0;

const isFileDrag = (event: DragEvent): boolean =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    // Two frames let a browser paint the busy state before the synchronous
    // tiling work begins. The timeout keeps things moving in headless
    // browsers that throttle requestAnimationFrame.
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 70);
  });
}

function setBusy(visible: boolean, label?: string): void {
  ui.busyOverlay.hidden = !visible;
  ui.stage.setAttribute('aria-busy', String(visible));
  ui.stats.classList.toggle('is-busy', visible);
  if (label) ui.busyLabel.textContent = label;
}

function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 280);
  }, 3200);
}

function updateRangeFill(input: HTMLInputElement): void {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  input.style.setProperty('--fill', `${percent}%`);
}

function syncControls(): void {
  ui.tileSize.value = String(state.tileSize);
  ui.tileSizeValue.textContent = `${state.tileSize} px`;
  updateRangeFill(ui.tileSize);

  ui.colorLimit.value = String(state.colorLimit);
  ui.colorLimitValue.textContent = state.unlimited ? '∞' : String(state.colorLimit);
  updateRangeFill(ui.colorLimit);
  ui.colorLimit.disabled = state.unlimited;
  colorControl?.classList.toggle('is-disabled', state.unlimited);
  ui.unlimited.checked = state.unlimited;

  ui.grout.value = String(state.grout);
  ui.groutValue.textContent = state.grout === 0 ? 'off' : `${state.grout.toFixed(1)} px`;
  updateRangeFill(ui.grout);

  for (const card of ui.tilingGrid.querySelectorAll<HTMLButtonElement>('.tiling-card')) {
    const active = card.dataset.tiling === state.tiling;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-pressed', String(active));
  }

  const meta = TILING_META.find((item) => item.id === state.tiling);
  if (meta) {
    ui.tilingHint.textContent = meta.description;
    ui.shuffleButton.disabled = !meta.random;
    ui.shuffleButton.title = meta.random
      ? 'Shuffle layout'
      : 'This pattern is deterministic';
  }

  ui.compareButton.disabled = !state.source;
  ui.compareButton.setAttribute('aria-pressed', String(state.showOriginal));
  ui.compareButton.title = state.showOriginal ? 'Show mosaic' : 'Show original';
  const compareLabel = ui.compareButton.querySelector<HTMLElement>('.button-label');
  if (compareLabel) compareLabel.textContent = state.showOriginal ? 'Mosaic' : 'Original';
}

function updateSourceUI(source: PreparedSource): void {
  ui.sourceName.textContent = source.name;
  ui.sourceThumb.src = source.previewUrl;
  ui.sourceThumb.alt = source.name;
  ui.originalImage.src = source.previewUrl;
  ui.originalImage.alt = `Original: ${source.name}`;
  ui.originalImage.hidden = true;
  ui.canvas.hidden = false;
  ui.stageEmpty.hidden = true;

  const downscaled = source.width !== source.originalWidth || source.height !== source.originalHeight;
  ui.sourceDims.textContent = downscaled
    ? `${source.width} × ${source.height} px · downscaled`
    : `${source.width} × ${source.height} px`;
  ui.sourceDims.title = `${source.originalWidth} × ${source.originalHeight} px`;

  ui.compareButton.disabled = false;
  ui.downloadButton.disabled = true;
}

function updatePaletteUI(palette: PaletteResult): void {
  ui.palette.replaceChildren();
  for (const color of palette.palette) {
    const hex = `#${[color.r, color.g, color.b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = hex;
    swatch.title = hex;
    swatch.setAttribute('aria-label', hex);
    ui.palette.append(swatch);
  }

  if (palette.limited) {
    ui.paletteCount.textContent = String(palette.palette.length);
    ui.paletteBar.title = `k-means in OKLab. Mean error ${(palette.meanError * 100).toFixed(1)}%.`;
  } else {
    ui.paletteCount.textContent = '∞';
    ui.paletteBar.title =
      'Unlimited: every tile keeps its own average color.';
  }
}

function updateStats(): void {
  if (!state.source || !state.analysis || !state.palette) return;
  const count = state.analysis.tiles.length;
  const colors = state.palette.limited
    ? `${state.palette.palette.length} ${plural(state.palette.palette.length, 'color', 'colors')}`
    : '∞ colors';
  ui.stats.textContent = `${NUMBER_FORMAT.format(count)} ${plural(count, 'tile', 'tiles')} · ${colors} · ${Math.max(1, state.lastTiming)} ms`;
  ui.stats.title = `Tile ${state.tileSize} px · source ${state.source.width} × ${state.source.height} px`;
}

function render(): void {
  if (!state.source || !state.analysis || !state.palette) return;
  const { width, height } = state.source;
  if (ui.canvas.width !== width || ui.canvas.height !== height) {
    ui.canvas.width = width;
    ui.canvas.height = height;
  }
  renderMosaic(context!, width, height, state.analysis.tiles, state.palette.colors, {
    grout: state.grout,
  });
  ui.canvas.hidden = state.showOriginal;
  ui.originalImage.hidden = !state.showOriginal;
  ui.downloadButton.disabled = false;
  ui.compareButton.disabled = false;
}

function setShowOriginal(show: boolean): void {
  if (!state.source) return;
  state.showOriginal = show;
  ui.canvas.hidden = show;
  ui.originalImage.hidden = !show;
  ui.compareButton.setAttribute('aria-pressed', String(show));
  ui.compareButton.title = show ? 'Show mosaic' : 'Show original';
  const label = ui.compareButton.querySelector<HTMLElement>('.button-label');
  if (label) label.textContent = show ? 'Mosaic' : 'Original';
}

function clearTimers(): void {
  if (buildTimer !== null) {
    clearTimeout(buildTimer);
    buildTimer = null;
  }
  if (paletteTimer !== null) {
    clearTimeout(paletteTimer);
    paletteTimer = null;
  }
  if (renderTimer !== null) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }
}

function scheduleBuild(delay = 160): void {
  if (buildTimer !== null) clearTimeout(buildTimer);
  buildTimer = setTimeout(() => {
    buildTimer = null;
    void buildTiles();
  }, delay);
}

function schedulePalette(delay = 100): void {
  if (paletteTimer !== null) clearTimeout(paletteTimer);
  paletteTimer = setTimeout(() => {
    paletteTimer = null;
    void repalette();
  }, delay);
}

function scheduleRender(delay = 30): void {
  if (renderTimer !== null) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderTimer = null;
    render();
  }, delay);
}

async function buildTiles(): Promise<void> {
  if (!state.source) return;
  const token = ++runToken;
  const tilingStart = performance.now();

  try {
    setBusy(true, 'Laying out tiles…');
    await nextPaint();
    if (token !== runToken) return;

    const rawTiles = createTiling(state.tiling, {
      width: state.source.width,
      height: state.source.height,
      tileSize: state.tileSize,
      seed: state.seed,
    });
    const tilingMs = performance.now() - tilingStart;

    if (token !== runToken) return;
    setBusy(true, 'Averaging colors…');
    await nextPaint();
    if (token !== runToken) return;

    const analysis = analyzeTiles(rawTiles, state.source.imageData);
    if (token !== runToken) return;
    if (analysis.tiles.length === 0) {
      setBusy(false);
      showToast('Could not tile this image');
      return;
    }

    setBusy(true, 'Matching the palette…');
    await nextPaint();
    if (token !== runToken) return;

    const paletteStart = performance.now();
    const palette = applyPalette(
      analysis.tiles,
      state.unlimited ? 0 : state.colorLimit,
      state.seed,
    );
    const paletteMs = performance.now() - paletteStart;
    if (token !== runToken) return;

    state.analysis = analysis;
    state.palette = palette;
    state.lastTiming = Math.round(tilingMs + analysis.elapsedMs + paletteMs);

    updatePaletteUI(palette);
    updateStats();
    render();
    setBusy(false);
  } catch (error) {
    console.error(error);
    setBusy(false);
    showToast('Something went wrong while building the mosaic');
  }
}

async function repalette(): Promise<void> {
  if (!state.source) return;
  if (!state.analysis) {
    void buildTiles();
    return;
  }

  const token = ++runToken;
  try {
    setBusy(true, 'Matching the palette…');
    await nextPaint();
    if (token !== runToken) return;

    const start = performance.now();
    const palette = applyPalette(
      state.analysis.tiles,
      state.unlimited ? 0 : state.colorLimit,
      state.seed,
    );
    state.lastTiming = Math.round(performance.now() - start);
    if (token !== runToken) return;

    state.palette = palette;
    updatePaletteUI(palette);
    updateStats();
    render();
    setBusy(false);
  } catch (error) {
    console.error(error);
    setBusy(false);
    showToast('Could not match the palette');
  }
}

async function loadBlob(blob: Blob, name: string): Promise<boolean> {
  clearTimers();
  runToken += 1;
  const token = ++loadToken;
  setBusy(true, 'Reading the image…');
  try {
    const prepared = await prepareSource(blob, name);
    if (token !== loadToken) return false;

    state.source = prepared;
    state.analysis = null;
    state.palette = null;
    state.showOriginal = false;
    ui.canvas.hidden = false;
    updateSourceUI(prepared);
    syncControls();
    await buildTiles();
    return true;
  } catch (error) {
    if (token !== loadToken) return false;
    console.error(error);
    setBusy(false);
    showToast('Could not read the image');
    if (!state.source) {
      ui.stageEmpty.hidden = false;
      ui.stats.textContent = 'No image';
    }
    return false;
  }
}

async function loadFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    showToast('Choose an image file: PNG, JPG, or WebP');
    return;
  }
  await loadBlob(file, file.name || 'clipboard.png');
}

async function loadSample(): Promise<void> {
  const requestToken = loadToken;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}sample.png`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    // A user may have started uploading a file while the sample was loading.
    if (loadToken !== requestToken) return;
    await loadBlob(blob, 'sample.png');
  } catch (error) {
    console.error(error);
    setBusy(false);
    if (!state.source) {
      ui.stageEmpty.hidden = false;
      ui.stats.textContent = 'No image';
    }
    showToast('Could not load the demo');
  }
}

function setTiling(id: TilingId, rebuild: boolean): void {
  if (state.tiling === id) return;
  state.tiling = id;
  syncControls();
  if (rebuild && state.source) {
    if (buildTimer !== null) {
      clearTimeout(buildTimer);
      buildTimer = null;
    }
    void buildTiles();
  }
}

async function downloadPng(): Promise<void> {
  if (!state.analysis || !state.palette) return;
  ui.downloadButton.disabled = true;
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      ui.canvas.toBlob((result) => resolve(result), 'image/png');
    });
    if (!blob) throw new Error('empty blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const colors = state.unlimited ? 'all-colors' : `${state.colorLimit}-colors`;
    link.href = url;
    link.download = `tesselation-${state.tiling}-${state.tileSize}px-${colors}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (error) {
    console.error(error);
    showToast('Could not save the PNG');
  } finally {
    ui.downloadButton.disabled = false;
  }
}

function buildTilingCards(): void {
  for (const meta of TILING_META) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tiling-card';
    card.dataset.tiling = meta.id;
    card.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'tiling-icon';
    icon.innerHTML = TILING_ICONS[meta.id];

    const copy = document.createElement('span');
    copy.className = 'tiling-copy';
    const title = document.createElement('strong');
    title.textContent = meta.name;
    const subtitle = document.createElement('small');
    subtitle.textContent = meta.subtitle;
    copy.append(title, subtitle);

    card.append(icon, copy);
    ui.tilingGrid.append(card);
  }
}

function injectIcons(): void {
  ui.brandMark.innerHTML = LOGO_SVG;
  const icons: Record<string, string> = {
    compare: COMPARE_SVG,
    download: DOWNLOAD_SVG,
    upload: UPLOAD_SVG,
    shuffle: SHUFFLE_SVG,
  };
  for (const element of document.querySelectorAll<HTMLElement>('[data-icon]')) {
    const icon = icons[element.dataset.icon ?? ''];
    if (icon) element.innerHTML = icon;
  }
}

function bindEvents(): void {
  ui.tilingGrid.addEventListener('click', (event) => {
    const card = (event.target as Element | null)?.closest<HTMLButtonElement>('.tiling-card');
    const id = card?.dataset.tiling as TilingId | undefined;
    if (!id || !availableTilings.has(id)) return;
    setTiling(id, true);
  });

  ui.tileSize.addEventListener('input', () => {
    state.tileSize = clamp(Math.round(Number(ui.tileSize.value)), 8, 80);
    syncControls();
    scheduleBuild(170);
  });

  ui.colorLimit.addEventListener('input', () => {
    state.colorLimit = clamp(Math.round(Number(ui.colorLimit.value)), 1, 40);
    syncControls();
    schedulePalette(110);
  });

  ui.unlimited.addEventListener('change', () => {
    state.unlimited = ui.unlimited.checked;
    syncControls();
    if (paletteTimer !== null) {
      clearTimeout(paletteTimer);
      paletteTimer = null;
    }
    void repalette();
  });

  ui.grout.addEventListener('input', () => {
    state.grout = clamp(Number(ui.grout.value), 0, 2.4);
    syncControls();
    scheduleRender(35);
  });

  ui.shuffleButton.addEventListener('click', () => {
    state.seed = (Math.random() * 0x7fffffff) | 0;
    if (state.source) void buildTiles();
  });

  ui.compareButton.addEventListener('click', () => {
    setShowOriginal(!state.showOriginal);
  });

  ui.downloadButton.addEventListener('click', () => {
    void downloadPng();
  });

  ui.openFileButton.addEventListener('click', () => {
    ui.fileInput.click();
  });

  ui.sampleButton.addEventListener('click', () => {
    void loadSample();
  });

  ui.fileInput.addEventListener('change', () => {
    const file = ui.fileInput.files?.[0];
    ui.fileInput.value = '';
    if (file) void loadFile(file);
  });

  window.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      void loadBlob(file, file.name || 'clipboard.png');
      break;
    }
  });

  const resetDragOverlay = (): void => {
    dragDepth = 0;
    ui.dropOverlay.hidden = true;
  };

  window.addEventListener('dragenter', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragDepth += 1;
    ui.dropOverlay.hidden = false;
  });

  window.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) ui.dropOverlay.hidden = true;
  });

  window.addEventListener('dragend', resetDragOverlay);

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    resetDragOverlay();
    const file = event.dataTransfer?.files[0];
    if (file) void loadFile(file);
  });
}

function init(): void {
  injectIcons();
  buildTilingCards();
  syncControls();
  bindEvents();
  setBusy(true, 'Loading the demo…');
  void loadSample();
}

init();
