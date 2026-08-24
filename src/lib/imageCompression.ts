/**
 * Downscales and re-encodes an image client-side before upload, so large
 * phone-camera photos don't take forever to reach Supabase Storage.
 * PNGs keep transparency; everything else becomes JPEG. Falls back to the
 * original file on any failure (unsupported format, no canvas support,
 * compression that didn't actually shrink it) — never blocks an upload.
 */
export async function compressImage(
  file: File,
  opts?: { maxDimension?: number; quality?: number }
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  const maxDimension = opts?.maxDimension ?? 1920;
  const quality = opts?.quality ?? 0.8;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, outputType === 'image/png' ? '.png' : '.jpg');
    return new File([blob], newName, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
