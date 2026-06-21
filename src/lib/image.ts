// Client-side canvas encoding helper (browser-only — uses HTMLCanvasElement).

/**
 * Encode a canvas to a compact data URL, preferring webp but falling back to
 * jpeg where canvas webp export is unsupported.
 *
 * iOS Safari (and some older browsers) can't encode webp from a canvas; per the
 * HTML spec they then *silently* substitute png — which is larger and which the
 * upload validators reject. We detect that by checking the returned prefix and
 * re-encode as jpeg, which every browser supports. Both formats hit "a few KB"
 * at avatar/logo sizes, so the visual/size result is effectively the same.
 */
export function canvasToCompactDataUrl(canvas: HTMLCanvasElement, quality = 0.85): string {
  const webp = canvas.toDataURL("image/webp", quality)
  if (webp.startsWith("data:image/webp")) return webp
  return canvas.toDataURL("image/jpeg", quality)
}
