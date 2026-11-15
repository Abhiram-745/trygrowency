// The countryside is reconstructed as coloured pixel cells and ASCII glyphs.
// Tiny river glints and wind through the fields animate only while visible.
export async function initFooterTexture(footer: HTMLElement) {
  const canvas = footer.querySelector<HTMLCanvasElement>('[data-footer-texture]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const image = new Image();
  image.src = `${import.meta.env.BASE_URL}images/footer-ascii-source.webp`;
  await image.decode();
  const probe = document.createElement('canvas');
  const sample = probe.getContext('2d', { willReadFrequently: true });
  if (!sample) return;
  const stage = canvas.parentElement!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const glyphs = ' .,:;=+*#%@';
  let width = 0, height = 0, cols = 0, rows = 0, cell = 0, rowH = 0;
  let pixels = new Uint8ClampedArray(0);
  let sourceX = 0, sourceY = 0, imageW = 0, imageH = 0;
  let visible = false, raf = 0, last = 0, time = 0;
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${cell + 1}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    for (let y = 0; y < rows; y++) {
      const fade = Math.max(0, Math.min(1, (y / rows - .30) / .18));
      if (!fade) continue;
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const luminance = (r * .2126 + g * .7152 + b * .0722) / 255;
        const sx = (x * cell - sourceX) / imageW;
        const sy = (y * rowH - sourceY) / imageH;
        const river = sy > .5 && sy < .81 && r > g * .98 && b > g * .78 && luminance > .56;
        const breeze = Math.sin(x * .10 + y * .16 - time * .55) * .025;
        const shimmer = river ? Math.pow(Math.max(0, Math.sin(sx * 110 - time * .8 + sy * 65)), 12) * .12 : 0;
        const light = 1 + breeze + shimmer;
        const rr = Math.min(255, Math.round(r * light));
        const gg = Math.min(255, Math.round(g * light));
        const bb = Math.min(255, Math.round(b * light));
        // Flat sampled cells keep the scene pixelated; the glyphs add print-like detail.
        ctx.globalAlpha = fade * .83;
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx.fillRect(x * cell, y * rowH, cell, rowH);
        ctx.globalAlpha = fade * .68;
        ctx.fillStyle = `rgb(${Math.round(rr * .5)},${Math.round(gg * .55)},${Math.round(bb * .5)})`;
        const density = Math.max(0, Math.min(9, Math.floor((1 - luminance + breeze) * 10)));
        ctx.fillText(river && shimmer > .08 ? '+' : glyphs[density], x * cell, y * rowH);
      }
    }
    ctx.globalAlpha = 1;
    canvas.dataset.ready = 'true';
    canvas.dataset.frame = String(Number(canvas.dataset.frame || 0) + 1);
  };
  const resize = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    cell = width < 800 ? 5 : 7;
    rowH = cell * 1.2;
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / rowH);
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    probe.width = cols;
    probe.height = rows;
    const scale = Math.max(width / image.width, height / image.height);
    imageW = image.width * scale;
    imageH = image.height * scale;
    sourceX = (width - imageW) * (width < 800 ? .18 : .5);
    sourceY = height - imageH;
    sample.drawImage(image, sourceX / cell, sourceY / rowH, imageW / cell, imageH / rowH);
    pixels = sample.getImageData(0, 0, cols, rows).data;
    draw();
  };
  const tick = (now: number) => {
    if (!visible || document.hidden || motion.matches) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    if (now - last < 100) return;
    time += Math.min(200, now - last) / 1000;
    last = now;
    draw();
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (visible && !document.hidden && !motion.matches) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else draw();
  };
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  resize();
}
