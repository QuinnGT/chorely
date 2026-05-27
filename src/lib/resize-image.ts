export async function resizeImage(file: File, maxDimension: number): Promise<File> {
  // GIFs would lose animation if drawn to canvas; skip them.
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const longest = Math.max(width, height);

  if (longest <= maxDimension) {
    bitmap.close();
    return file;
  }

  const scale = maxDimension / longest;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // PNG preserves alpha; everything else becomes JPEG for size.
  const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outType === 'image/jpeg' ? 0.85 : undefined;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outType, quality);
  });
  if (!blob) return file;

  const ext = outType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `image.${ext}`, { type: outType });
}
