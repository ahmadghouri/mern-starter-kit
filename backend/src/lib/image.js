/**
 * Detects the image type from its first bytes ("magic numbers").
 * The Content-Type header is client-controlled, so it is never trusted alone.
 * Returns a MIME type, or null for unsupported or unknown data.
 */
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  const ascii = (start, end) => buffer.toString('latin1', start, end);

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return 'image/webp';
  }
  // ISO base media file: "ftyp" box with an AVIF major brand.
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) {
    return 'image/avif';
  }
  return null;
}

module.exports = { detectImageType };
