// Curvy still timeline: scroll progress with a shared responsive layout.
(() => {
  const tl = document.querySelector('.curve-tl');
  if (!tl) return;
  const svg = tl.querySelector('.curve');
  const track = svg.querySelector('.track');
  const fill = svg.querySelector('.fill');
  const sketch = svg.querySelector('.sketch');
  const accentSketch = svg.querySelector('.accent-sketch');
  const items = [...tl.querySelectorAll('li')];
  const figs = items.map(li => li.querySelector('figure'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // This must match the still layout in styles.css, not the column's width.
  const mobile = matchMedia('(max-width: 760px)');
  const paths = [fill, sketch, accentSketch];
  let lengths = [], centers = [], dots = [];
  let frame = 0, layoutDirty = true;

  function draw() {
    const w = tl.clientWidth, h = tl.clientHeight;
    if (!w || !h) return;
    const narrow = mobile.matches;
    centers = items.map(li => li.offsetTop + li.offsetHeight / 2);
    const pts = [[narrow ? 12 : w / 2, 0]];
    centers.forEach((y, i) => {
      // On phones/tablets all stills sit right of the left-hand rail.
      const x = narrow ? (i % 2 ? 6 : 20) : (i % 2 ? w * 0.24 : w * 0.76);
      pts.push([x, y]);
    });
    pts.push([narrow ? 12 : w / 2, h]);
    const lines = [0, 1, 2].map(() => `M${pts[0][0]},${pts[0][1]}`);
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y1 - y0) / 2;
      lines[0] += ` C${x0},${y0 + my} ${x1},${y1 - my} ${x1},${y1}`;
      const wobble = (narrow ? 8 : 14) * (i % 2 ? 1 : -1);
      lines[1] += ` C${x0 + wobble},${y0 + my} ${x1 + wobble * .6},${y1 - my} ${x1},${y1}`;
      const accentWobble = (narrow ? 14 : 22) * (i % 2 ? -1 : 1);
      lines[2] += ` C${x0 + accentWobble},${y0 + my} ${x1 + accentWobble * .65},${y1 - my} ${x1},${y1}`;
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('preserveAspectRatio', 'none');
    track.setAttribute('d', lines[0]);
    paths.forEach((path, i) => path.setAttribute('d', lines[i]));
    lengths = paths.map(path => path.getTotalLength());
    paths.forEach((path, i) => { path.style.strokeDasharray = `${lengths[i]}px`; });
    if (!dots.length) {
      dots = items.map(() => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', 6);
        svg.appendChild(dot);
        return dot;
      });
    }
    dots.forEach((dot, i) => {
      dot.setAttribute('cx', pts[i + 1][0]);
      dot.setAttribute('cy', pts[i + 1][1]);
    });
  }

  function update() {
    const vh = innerHeight, r = tl.getBoundingClientRect();
    if (!r.height) return;
    // Reading progress remains useful with reduced motion. Reveal it instantly;
    // reduced motion disables the still zoom and all interpolated transitions.
    const progress = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
    paths.forEach((path, i) => { path.style.strokeDashoffset = `${lengths[i] * (1 - progress)}px`; });
    dots.forEach((dot, i) => dot.classList.toggle('is-passed', r.top + centers[i] <= vh * 0.6));
    figs.forEach((figure, i) => {
      if (!mobile.matches || reducedMotion.matches) {
        figure.style.removeProperty('--s');
        return;
      }
      const dist = Math.abs(r.top + centers[i] - vh / 2) / (vh / 2);
      const focus = Math.max(0, 1 - dist);
      figure.style.setProperty('--s', (0.72 + 0.4 * focus).toFixed(3));
    });
  }

  function schedule(redraw = false) {
    layoutDirty = layoutDirty || redraw;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (layoutDirty) { layoutDirty = false; draw(); }
      update();
    });
  }
  addEventListener('scroll', () => schedule(), { passive: true });
  addEventListener('resize', () => schedule(true));
  mobile.addEventListener('change', () => schedule(true));
  reducedMotion.addEventListener('change', () => schedule());
  // Lazy images, loaded fonts, and column layout can resize the timeline without
  // a window resize. Coalesce those changes into the next animation frame.
  if ('ResizeObserver' in window) new ResizeObserver(() => schedule(true)).observe(tl);
  tl.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => schedule(true), { once: true });
  });
  if (document.fonts) document.fonts.ready.then(() => schedule(true));
  schedule(true);
})();
