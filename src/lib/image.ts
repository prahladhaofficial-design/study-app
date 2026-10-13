/** Fits width × height inside a max edge, keeping aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Loads an image file and re-encodes it as a smaller JPEG data URL. */
export async function resizeImage(file: File, maxEdge = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = fitWithin(bitmap.width, bitmap.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
