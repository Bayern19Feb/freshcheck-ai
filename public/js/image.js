// Image checking, decoding and resizing before analysis.

import { ACCEPTED_TYPES, MAX_FILE_BYTES, ANALYSIS_MAX_SIDE, THUMB_MAX_SIDE } from './config.js';

export class ImageError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const IMAGE_ERRORS = {
  'no-file': 'No photo was selected. Take a photo or choose one from your gallery.',
  'empty': 'This file is empty. Please choose a different photo.',
  'too-large': 'This file is too large (over 25 MB). Please choose a smaller photo.',
  'unsupported-type': 'This file type is not supported. Please use a JPG, PNG or WebP photo. (iPhone HEIC photos may need to be converted, or set the camera to "Most Compatible".)',
  'corrupt': 'This photo could not be opened. The file may be damaged or not a real image.',
  'too-small': 'This image is too small for the AI to analyse. Please use a photo at least 100 × 100 pixels.',
};

/** Check a file before trying to open it. Throws ImageError. */
export function validateFile(file) {
  if (!file) throw new ImageError('no-file', IMAGE_ERRORS['no-file']);
  if (file.size === 0) throw new ImageError('empty', IMAGE_ERRORS.empty);
  if (file.size > MAX_FILE_BYTES) throw new ImageError('too-large', IMAGE_ERRORS['too-large']);
  const type = (file.type || '').toLowerCase();
  // Some Android galleries give an empty type; we let the decoder decide in that case.
  if (type && !ACCEPTED_TYPES.includes(type)) throw new ImageError('unsupported-type', IMAGE_ERRORS['unsupported-type']);
}

/** Decode a file into something drawable. Uses EXIF orientation where the browser supports it. */
async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fall through to the <img> decoder, which some browsers handle better
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ImageError('corrupt', IMAGE_ERRORS.corrupt);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draw a source into a new canvas whose longest side is at most maxSide. */
export function scaleToCanvas(source, maxSide) {
  const w = source.width || source.videoWidth;
  const h = source.height || source.videoHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Open a photo file and return an analysis-sized canvas.
 * The full-resolution image is released straight away.
 */
export async function loadPhoto(file) {
  validateFile(file);
  const source = await decode(file);
  const w = source.width;
  const h = source.height;
  if (!w || !h) throw new ImageError('corrupt', IMAGE_ERRORS.corrupt);
  if (Math.min(w, h) < 100) throw new ImageError('too-small', IMAGE_ERRORS['too-small']);
  const canvas = scaleToCanvas(source, ANALYSIS_MAX_SIDE);
  if (source.close) source.close();
  return canvas;
}

/** Square, centre-cropped thumbnail (the same area the model looks at). */
export function makeThumbnail(canvas, size = THUMB_MAX_SIDE) {
  const side = Math.min(canvas.width, canvas.height);
  const sx = (canvas.width - side) / 2;
  const sy = (canvas.height - side) / 2;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  out.getContext('2d').drawImage(canvas, sx, sy, side, side, 0, 0, size, size);
  return out.toDataURL('image/jpeg', 0.72);
}

/**
 * Simple photo-quality checks on a small grey copy of the centre square.
 * brightness: 0 (black) – 255 (white); sharpness: variance of edge strength.
 * Only "very dark" and "very bright" are treated as severe, because a blur
 * threshold has not been validated on real photos (see docs/KNOWN_ISSUES.md).
 */
export function checkQuality(canvas) {
  const N = 64;
  const side = Math.min(canvas.width, canvas.height);
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);
  const grey = new Float32Array(N * N);
  let sum = 0;
  for (let i = 0; i < N * N; i++) {
    grey[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    sum += grey[i];
  }
  const brightness = sum / (N * N);
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const lap = 4 * grey[i] - grey[i - 1] - grey[i + 1] - grey[i - N] - grey[i + N];
      lapSum += lap;
      lapSq += lap * lap;
      count += 1;
    }
  }
  const mean = lapSum / count;
  const sharpness = lapSq / count - mean * mean;

  const warnings = [];
  if (brightness < 35) warnings.push('too-dark');
  else if (brightness > 235) warnings.push('too-bright');
  if (sharpness < 15) warnings.push('maybe-blurry');
  return {
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    warnings,
    severe: warnings.includes('too-dark') || warnings.includes('too-bright'),
  };
}

export const QUALITY_TEXT = {
  'too-dark': 'The photo looks very dark. Try again in brighter light.',
  'too-bright': 'The photo looks very bright or washed out. Avoid strong direct light or flash glare.',
  'maybe-blurry': 'The photo may be blurry or very plain. Hold the phone steady and tap to focus.',
};
