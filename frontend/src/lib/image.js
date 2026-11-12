export const AVATAR_SIZE = 256;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/webp', 'image/avif', 'image/png', 'image/jpeg'];

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Center-crops and resizes an image file to a square avatar.
 * Encodes as WebP; browsers that cannot encode WebP fall back to PNG.
 * Re-encoding also strips metadata such as GPS location (EXIF).
 */
export async function resizeImageForAvatar(file, size = AVATAR_SIZE) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Choose a WebP, AVIF, PNG, or JPEG image');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Image is too large (max 10 MB)');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be read');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
  bitmap.close?.();

  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (webp?.type === 'image/webp') {
    return webp;
  }
  const png = await canvasToBlob(canvas, 'image/png');
  if (!png) {
    throw new Error('This image could not be processed');
  }
  return png;
}
