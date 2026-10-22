// Curvy still timeline: fills the line on scroll and scales stills on mobile.
(() => {
  const tl = document.querySelector('.curve-tl');
  if (!tl) return;
  const svg = tl.querySelector('.curve');
  const track = svg.querySelector('.track');
  const fill = svg.querySelector('.fill');
  const items = [...tl.querySelectorAll('li')];
  const figs = items.map(li => li.querySelector('figure'));
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
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
    galleryImage.getAnimations().forEach(animation => animation.cancel());
    showStill(current + delta);
    if (!still.matches) galleryImage.animate([
      { opacity: .45, transform: 'scale(.97)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  }

  function closeGallery() {
    if (!gallery.open || gallery.classList.contains('is-closing')) return;
    galleryImage.getAnimations().forEach(animation => animation.cancel());
    if (still.matches) { gallery.close(); return; }
    gallery.classList.add('is-closing');
    setTimeout(() => gallery.close(), 260);
  }

  openButtons.forEach((button, index) => {
    button.setAttribute('aria-label', `View still ${index + 1} of ${openButtons.length}: ${figs[index].querySelector('img').alt}`);
    button.addEventListener('pointermove', event => {
      const rect = button.getBoundingClientRect();
      button.style.setProperty('--spot-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
      button.style.setProperty('--spot-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
    });
    button.addEventListener('pointerleave', () => {
      button.style.removeProperty('--spot-x');
      button.style.removeProperty('--spot-y');
    });
    button.addEventListener('click', () => {
      const start = button.getBoundingClientRect();
      showStill(index);
      gallery.showModal();
      document.body.classList.add('gallery-open');
      if (still.matches) return;
      const end = galleryImage.getBoundingClientRect();
      if (!end.width || !end.height) return;
      const dx = start.left + start.width / 2 - end.left - end.width / 2;
      const dy = start.top + start.height / 2 - end.top - end.height / 2;
      galleryImage.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${start.width / end.width}, ${start.height / end.height})`, opacity: .78 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ], { duration: 780, easing: 'cubic-bezier(.16, 1, .3, 1)' });
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
    document.body.classList.remove('gallery-open');
    gallery.classList.remove('is-closing');
  });
})();
