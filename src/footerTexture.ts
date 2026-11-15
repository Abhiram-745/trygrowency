// A quiet ASCII overprint, sampled from the landscape itself. No animation
// loop: it paints once on entry and repaints only when the footer resizes.
export async function initFooterTexture(footer: HTMLElement) {
  const canvas = footer.querySelector<HTMLCanvasElement>('[data-footer-texture]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}images/footer-landscape.webp`;
  await image.decode();
  const probe = document.createElement('canvas');
  const sample = probe.getContext('2d', { willReadFrequently: true });
  if (!sample) return;
  const glyphs = ' .,:;=+*#@';
  let pending = 0;
  const paint = () => {
    const width = footer.clientWidth;
    const height = footer.clientHeight;
    const cell = width < 800 ? 5 : 6;
    const row = cell * 1.4;
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / row);
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${cell + 1}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    probe.width = cols;
    probe.height = rows;
    const scale = Math.max(width / image.width, height / image.height);
    const imageW = image.width * scale;
    const imageH = image.height * scale;
    const alignX = width < 800 ? 0.38 : 0.5;
    sample.drawImage(image, (width - imageW) * alignX / cell, (height - imageH) / row, imageW / cell, imageH / row);
    const pixels = sample.getImageData(0, 0, cols, rows).data;
    ctx.fillStyle = '#183b27';
    for (let y = Math.floor(rows * 0.3); y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const luminance = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
        const glyph = glyphs[Math.min(glyphs.length - 1, Math.floor((1 - luminance) * glyphs.length))];
        ctx.fillText(glyph, x * cell, y * row);
      }
    }
    canvas.dataset.ready = 'true';
  };
  new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(paint);
  }).observe(footer);
  paint();
}
