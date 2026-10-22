// Curvy still timeline: draws an S-curve through the stills, fills it as you
// scroll, and scales each still up as it nears the middle of the screen.
(() => {
  const tl = document.querySelector('.curve-tl');
  if (!tl) return;
  const svg = tl.querySelector('.curve');
  const track = svg.querySelector('.track');
  const fill = svg.querySelector('.fill');
  const items = [...tl.querySelectorAll('li')];
  const figs = items.map(li => li.querySelector('figure'));
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let length = 0, dots = [];

  function draw() {
    const w = tl.clientWidth, h = tl.clientHeight, narrow = w < 560;
    const pts = [[narrow ? 12 : w / 2, 0]];
    items.forEach((li, i) => {
      const y = li.offsetTop + li.offsetHeight / 2;
      // The line swings into the empty half opposite each still.
      const x = narrow ? (i % 2 ? 6 : 20) : (i % 2 ? w * 0.24 : w * 0.76);
      pts.push([x, y]);
    });
    pts.push([narrow ? 12 : w / 2, h]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y1 - y0) / 2;
      d += ` C${x0},${y0 + my} ${x1},${y1 - my} ${x1},${y1}`;
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    track.setAttribute('d', d);
    fill.setAttribute('d', d);
    length = fill.getTotalLength();
    fill.style.strokeDasharray = length;
    dots.forEach(c => c.remove());
    dots = pts.slice(1, -1).map(([x, y]) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 6);
      svg.appendChild(c);
      return c;
    });
    update();
  }

  function update() {
    const vh = innerHeight, r = tl.getBoundingClientRect();
    const progress = still.matches ? 1 : Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
    fill.style.strokeDashoffset = length * (1 - progress);
    figs.forEach(f => {
      const b = f.getBoundingClientRect();
      const dist = Math.abs(b.top + b.height / 2 - vh / 2) / (vh / 2);
      f.style.setProperty('--s', still.matches ? 1 : (0.72 + 0.4 * Math.max(0, 1 - dist)).toFixed(3));
    });
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); }
  }, { passive: true });
  addEventListener('resize', draw);
  tl.querySelectorAll('img').forEach(img => img.complete || img.addEventListener('load', draw, { once: true }));
  draw();
})();
