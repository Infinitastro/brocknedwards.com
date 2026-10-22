// Curvy still timeline: fills the line on scroll and scales stills on mobile.
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
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  let length = 0, sketchLength = 0, accentLength = 0, dots = [];

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
    let sketchD = d;
    let accentD = d;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y1 - y0) / 2;
      d += ` C${x0},${y0 + my} ${x1},${y1 - my} ${x1},${y1}`;
      const wobble = (narrow ? 8 : 14) * (i % 2 ? 1 : -1);
      sketchD += ` C${x0 + wobble},${y0 + my} ${x1 + wobble * .6},${y1 - my} ${x1},${y1}`;
      const accentWobble = (narrow ? 14 : 22) * (i % 2 ? -1 : 1);
      accentD += ` C${x0 + accentWobble},${y0 + my} ${x1 + accentWobble * .65},${y1 - my} ${x1},${y1}`;
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    track.setAttribute('d', d);
    fill.setAttribute('d', d);
    sketch.setAttribute('d', sketchD);
    accentSketch.setAttribute('d', accentD);
    length = fill.getTotalLength();
    sketchLength = sketch.getTotalLength();
    accentLength = accentSketch.getTotalLength();
    fill.style.strokeDasharray = length;
    sketch.style.strokeDasharray = sketchLength;
    accentSketch.style.strokeDasharray = accentLength;
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
    sketch.style.strokeDashoffset = sketchLength * (1 - progress);
    accentSketch.style.strokeDashoffset = accentLength * (1 - progress);
    dots.forEach((dot, i) => {
      const y = items[i].getBoundingClientRect().top + items[i].offsetHeight / 2;
      dot.classList.toggle('is-passed', still.matches || y <= vh * 0.6);
    });
    figs.forEach((f, i) => {
      if (!mobile.matches) { f.style.removeProperty('--s'); return; }
      // Measure the row so scaling the still cannot change its own progress.
      const b = items[i].getBoundingClientRect();
      const dist = Math.abs(b.top + b.height / 2 - vh / 2) / (vh / 2);
      const focus = still.matches ? 1 : Math.max(0, 1 - dist);
      f.style.setProperty('--s', still.matches ? 1 : (0.72 + 0.4 * focus).toFixed(3));
    });
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); }
  }, { passive: true });
  addEventListener('resize', draw);
  tl.querySelectorAll('img').forEach(img => img.complete || img.addEventListener('load', draw, { once: true }));
  draw();

  const gallery = document.querySelector('.still-lightbox');
  const openButtons = [...tl.querySelectorAll('.still-open')];
  const galleryImage = gallery.querySelector('.lightbox-figure img');
  const galleryTime = gallery.querySelector('.lightbox-time');
  const galleryCount = gallery.querySelector('.lightbox-count');
  let current = 0;
  let travelImage = null;
  let openingButton = null;

  function finishOpening() {
    if (travelImage) travelImage.remove();
    travelImage = null;
    if (openingButton) openingButton.style.removeProperty('visibility');
    openingButton = null;
    galleryImage.style.removeProperty('visibility');
  }

  function showStill(index) {
    current = (index + openButtons.length) % openButtons.length;
    const figure = figs[current];
    const image = figure.querySelector('img');
    galleryImage.src = image.src;
    galleryImage.alt = image.alt;
    galleryTime.textContent = figure.querySelector('figcaption').textContent;
    galleryCount.textContent = `${current + 1} / ${openButtons.length}`;
  }

  function changeStill(delta) {
    if (gallery.classList.contains('is-closing')) return;
    finishOpening();
    galleryImage.getAnimations().forEach(animation => animation.cancel());
    showStill(current + delta);
    if (!still.matches) galleryImage.animate([
      { opacity: .45, transform: 'scale(.97)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  }

  function closeGallery() {
    if (!gallery.open || gallery.classList.contains('is-closing')) return;
    finishOpening();
    galleryImage.getAnimations().forEach(animation => animation.cancel());
    if (still.matches) { gallery.close(); return; }
    gallery.classList.add('is-closing');
    setTimeout(() => gallery.close(), 260);
  }

  openButtons.forEach((button, index) => {
    button.setAttribute('aria-label', `View still ${index + 1} of ${openButtons.length}: ${figs[index].querySelector('img').alt}`);
    button.addEventListener('click', () => {
      const start = button.getBoundingClientRect();
      showStill(index);
      if (!still.matches) {
        galleryImage.style.visibility = 'hidden';
        openingButton = button;
        button.style.visibility = 'hidden';
      }
      gallery.showModal();
      document.body.classList.add('gallery-open');
      if (still.matches) return;
      const end = galleryImage.getBoundingClientRect();
      if (!end.width || !end.height) { finishOpening(); return; }
      travelImage = document.createElement('div');
      travelImage.setAttribute('aria-hidden', 'true');
      travelImage.className = 'lightbox-travel';
      const travelStill = button.querySelector('img').cloneNode();
      travelStill.removeAttribute('loading');
      travelStill.alt = '';
      travelImage.appendChild(travelStill);
      Object.assign(travelImage.style, {
        left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`
      });
      gallery.appendChild(travelImage);
      const animation = travelImage.animate([
        { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})` },
        { transform: 'none' }
      ], { duration: 850, easing: 'ease-in-out' });
      animation.onfinish = finishOpening;
    });
  });
  gallery.querySelector('.lightbox-close').addEventListener('click', closeGallery);
  gallery.querySelector('.lightbox-prev').addEventListener('click', () => changeStill(-1));
  gallery.querySelector('.lightbox-next').addEventListener('click', () => changeStill(1));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeStill(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  gallery.addEventListener('cancel', event => { event.preventDefault(); closeGallery(); });
  gallery.addEventListener('click', event => { if (event.target === gallery) closeGallery(); });
  gallery.addEventListener('close', () => {
    finishOpening();
    document.body.classList.remove('gallery-open');
    gallery.classList.remove('is-closing');
  });
})();
