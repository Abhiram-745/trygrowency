// A procedural ASCII world: a true rotating sphere, orbiting signals and a
// small geographic mask. No image, extra dependency or WebGL context needed.
const CONTINENTS: number[][][] = [
  [[-168,70],[-140,72],[-124,60],[-110,55],[-97,50],[-82,53],[-55,48],[-65,32],[-81,25],[-89,16],[-100,20],[-117,32],[-130,52],[-155,58]],
  [[-82,12],[-65,10],[-48,-1],[-35,-8],[-43,-24],[-54,-36],[-68,-55],[-76,-41],[-80,-15]],
  [[-53,82],[-22,78],[-20,63],[-45,59],[-60,68]],
  [[-18,35],[2,37],[15,33],[34,30],[51,11],[41,-12],[31,-34],[18,-35],[8,-20],[-3,3],[-17,15]],
  [[-10,36],[-10,57],[9,71],[34,70],[51,57],[76,74],[122,73],[165,66],[179,51],[143,45],[141,33],[125,23],[110,1],[98,8],[81,7],[70,25],[49,12],[36,30],[26,40],[11,44]],
  [[112,-11],[135,-10],[153,-24],[146,-39],[128,-35],[114,-25]],
  [[47,-13],[51,-16],[49,-26],[44,-23]],
  [[-9,59],[-3,59],[1,51],[-6,50]],
  [[130,32],[142,44],[145,42],[136,32]],
  [[166,-34],[178,-39],[173,-47],[166,-45]],
];
const inside = (x: number, y: number, polygon: number[][]) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
};

export function initFooterTexture(footer: HTMLElement) {
  const canvas = footer.querySelector<HTMLCanvasElement>('[data-footer-texture]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  // Build once; each frame uses constant-time lookups rather than polygons.
  const land = new Uint8Array(360 * 180);
  for (let lat = 0; lat < 180; lat++) {
    for (let lon = 0; lon < 360; lon++) {
      land[lat * 360 + lon] = CONTINENTS.some(p => inside(lon - 180, 90 - lat, p)) ? 1 : 0;
    }
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = canvas.parentElement!;
  let width = 0, height = 0, radius = 0, cx = 0, cy = 0;
  let points: { x: number; y: number; nx: number; ny: number; nz: number }[] = [];
  let visible = false, raf = 0, last = 0, angle = -0.45;
  const glyphs = '.:+*#@';
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const c = Math.cos(angle), s = Math.sin(angle);
    // Character-based orbital paths behind the world.
    for (let orbit = 0; orbit < 2; orbit++) {
      for (let i = 0; i < 230; i++) {
        const a = i / 230 * Math.PI * 2;
        const x = Math.cos(a) * radius * 1.40;
        const y = Math.sin(a) * radius * .32;
        const tilt = orbit ? -.48 : .36;
        const px = x * Math.cos(tilt) - y * Math.sin(tilt);
        const py = x * Math.sin(tilt) + y * Math.cos(tilt);
        if (px * px + py * py < radius * radius) continue;
        ctx.fillStyle = i % 12 === 0 ? '#b2b7bf' : '#e4e6eb';
        ctx.fillText(i % 12 === 0 ? '+' : '·', cx + px, cy + py);
      }
      const a = angle * (orbit ? -.9 : .7) + orbit * 2;
      const x = Math.cos(a) * radius * 1.40, y = Math.sin(a) * radius * .32;
      const tilt = orbit ? -.48 : .36;
      const px = x * Math.cos(tilt) - y * Math.sin(tilt), py = x * Math.sin(tilt) + y * Math.cos(tilt);
      if (px * px + py * py > radius * radius) {
        ctx.fillStyle = '#353c49';
        ctx.fillText('✦', cx + px, cy + py);
      }
    }
    for (const p of points) {
      // Slight axis tilt, then turn the surface under a stationary light.
      const x = p.nx * c + p.nz * s;
      const z = -p.nx * s + p.nz * c;
      const y = p.ny * .985 + z * .17;
      const lon = Math.atan2(x, z) * 180 / Math.PI;
      const lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
      const col = Math.max(0, Math.min(359, Math.floor(lon + 180)));
      const row = Math.max(0, Math.min(179, Math.floor(90 - lat)));
      const isLand = land[row * 360 + col];
      const light = Math.max(0, -.3 * p.nx + .35 * p.ny + .8 * p.nz);
      const grid = Math.abs(lon % 30) < 1.3 || Math.abs(lat % 20) < 1;
      if (!isLand && !grid && (Math.round(p.x) + Math.round(p.y)) % 3 !== 0) continue;
      const shade = isLand ? Math.round(45 + (1 - light) * 115) : grid ? 190 : 222;
      ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 8})`;
      ctx.globalAlpha = .22 + .78 * Math.pow(p.nz, .45);
      ctx.fillText(isLand ? glyphs[Math.min(5, Math.floor(light * 5.5))] : grid ? ':' : '·', p.x, p.y);
    }
    ctx.globalAlpha = 1;
    canvas.dataset.ready = 'true';
    canvas.dataset.frame = String(Number(canvas.dataset.frame || 0) + 1);
  };
  const resize = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
    const mobile = width <= 800;
    cx = width * (mobile ? .5 : .72);
    cy = height * (mobile ? .66 : .49);
    radius = Math.min(width * (mobile ? .36 : .19), height * .43);
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = [];
    const stepX = mobile ? 6 : 7;
    for (let y = -radius; y <= radius; y += 10) {
      for (let x = -radius; x <= radius; x += stepX) {
        const nx = x / radius, ny = -y / radius;
        const d = nx * nx + ny * ny;
        if (d < 1) points.push({ x: cx + x, y: cy + y, nx, ny, nz: Math.sqrt(1 - d) });
      }
    }
    draw();
  };
  const tick = (now: number) => {
    if (!visible || document.hidden || motion.matches) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    if (now - last < 55) return; // ~18 fps, sufficient for this slow turn.
    angle += Math.min(now - last, 100) * .00008;
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
