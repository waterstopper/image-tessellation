import type { PreparedSource } from './types';

export const MAX_SOURCE_DIMENSION = 1600;

export async function prepareSource(blob: Blob, name: string): Promise<PreparedSource> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(blob);
  }

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  if (originalWidth === 0 || originalHeight === 0) {
    bitmap.close();
    throw new Error('Пустое изображение');
  }

  const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error('Canvas недоступен');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const imageData = context.getImageData(0, 0, width, height);
  // The preview uses the prepared (downscaled, white-composited) pixels rather
  // than the original blob: it avoids a second full-size decode and lines up
  // exactly with the mosaic when comparing before/after.
  const previewUrl = canvas.toDataURL('image/png');

  return {
    width,
    height,
    imageData: {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    },
    previewUrl,
    name,
    originalWidth,
    originalHeight,
  };
}
