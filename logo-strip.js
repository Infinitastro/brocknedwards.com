// Keep a CSS marquee as the no-script fallback. JS owns its transform when ready.
(() => {
  const marquee = document.querySelector('.orgs-marquee');
  const track = marquee?.querySelector('.orgs-track');
  const list = track?.querySelector('.orgs-list');
  if (!list || !window.ResizeObserver) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let position = 0;
  let rate = -1;
  let target = -1;
  let hovered;
  let lastTime;
  let frame = 0;

  const measure = () => {
    const nextWidth = list.getBoundingClientRect().width;
    if (width && nextWidth) position *= nextWidth / width;
    width = nextWidth;
  };
  measure();
  new ResizeObserver(measure).observe(list);
  track.classList.add('is-driven');

  const tick = time => {
    // Cap elapsed time after a background tab resumes, preventing a large jump.
    const elapsed = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    rate += (target - rate) * (1 - Math.exp(-elapsed / .1));
    if (width) {
      position = ((position + width / (reduced.matches ? 88 : 44) * rate * elapsed) % width + width) % width;
      track.style.transform = `translate3d(${position - width}px, 0, 0)`;
    }
    frame = requestAnimationFrame(tick);
  };
  const reset = () => {
    target = -1;
    hovered?.classList.remove('is-hovered');
    hovered = undefined;
  };
  marquee.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const item = event.target.closest('.orgs-list li');
    if (item !== hovered) {
      hovered?.classList.remove('is-hovered');
      hovered = item;
      hovered?.classList.add('is-hovered');
    }
    const rect = marquee.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    target = (fraction - .5) * 6;
  });
  marquee.addEventListener('pointerleave', reset);
  marquee.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    lastTime = undefined;
    reset();
    if (!document.hidden) frame = requestAnimationFrame(tick);
  });
  frame = requestAnimationFrame(tick);
})();
