// Shared still gallery for the film timeline and the still grids across the site.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function createDialog(label) {
    const gallery = document.createElement('dialog');
    gallery.className = 'still-lightbox';
    gallery.setAttribute('aria-label', label);
    gallery.innerHTML = `
      <div class="lightbox-inner">
        <button class="lightbox-close" type="button" aria-label="Close gallery">Close ×</button>
        <button class="lightbox-prev" type="button" aria-label="Previous still">←</button>
        <figure class="lightbox-figure"><img alt=""><figcaption><span class="lightbox-time"></span><span class="lightbox-count"></span></figcaption></figure>
        <button class="lightbox-next" type="button" aria-label="Next still">→</button>
      </div>`;
    document.body.appendChild(gallery);
    return gallery;
  }

  function setupGallery(buttons, gallery, captionFor) {
    if (!buttons.length || !gallery) return;
    const galleryImage = gallery.querySelector('.lightbox-figure img');
    const galleryTime = gallery.querySelector('.lightbox-time');
    const galleryCount = gallery.querySelector('.lightbox-count');
    let current = 0;
    let travelImage = null;
    let movingImage = null;
    let imagePlaceholder = null;
    let openingButton = null;
    let lastButton = null;
    let closingTimer = null;

    function finishOpening() {
      if (movingImage && imagePlaceholder?.isConnected) imagePlaceholder.replaceWith(movingImage);
      movingImage = null;
      imagePlaceholder = null;
      if (travelImage) travelImage.remove();
      travelImage = null;
      if (openingButton) openingButton.style.removeProperty('visibility');
      openingButton = null;
      galleryImage.style.removeProperty('visibility');
    }

    function showStill(index) {
      current = (index + buttons.length) % buttons.length;
      const image = buttons[current].querySelector('img');
      galleryImage.src = image.currentSrc || image.src;
      galleryImage.alt = image.alt;
      galleryTime.textContent = captionFor(buttons[current]);
      galleryCount.textContent = `${current + 1} / ${buttons.length}`;
      const ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 16 / 9;
      gallery.style.setProperty('--gallery-ratio', ratio.toFixed(4));
    }

    function changeStill(delta) {
      if (gallery.classList.contains('is-closing')) return;
      finishOpening();
      galleryImage.getAnimations().forEach(animation => animation.cancel());
      showStill(current + delta);
      if (!reducedMotion.matches) galleryImage.animate([
        { opacity: .45, transform: 'scale(.97)' },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }

    function closeGallery() {
      if (!gallery.open || gallery.classList.contains('is-closing')) return;
      finishOpening();
      galleryImage.getAnimations().forEach(animation => animation.cancel());
      if (reducedMotion.matches) { gallery.close(); return; }
      gallery.classList.add('is-closing');
      closingTimer = setTimeout(() => gallery.close(), 260);
    }

    buttons.forEach((button, index) => {
      const image = button.querySelector('img');
      button.setAttribute('aria-label', `View still ${index + 1} of ${buttons.length}: ${image.alt}`);
      button.addEventListener('pointerenter', () => {
        if (!button.matches(':focus-visible')) button.classList.remove('gallery-return');
      });
      button.addEventListener('pointerleave', () => {
        if (!button.matches(':focus-visible')) button.classList.remove('gallery-return');
      });
      button.addEventListener('blur', () => button.classList.remove('gallery-return'));
      button.addEventListener('click', () => {
        button.classList.remove('gallery-return');
        lastButton = button;
        const start = button.getBoundingClientRect();
        showStill(index);
        if (!reducedMotion.matches) {
          galleryImage.style.visibility = 'hidden';
          openingButton = button;
          button.style.visibility = 'hidden';
        }
        gallery.showModal();
        document.body.classList.add('gallery-open');
        if (reducedMotion.matches) return;
        const end = galleryImage.getBoundingClientRect();
        if (!end.width || !end.height) { finishOpening(); return; }
        travelImage = document.createElement('div');
        travelImage.className = 'lightbox-travel';
        travelImage.setAttribute('aria-hidden', 'true');
        imagePlaceholder = image.cloneNode();
        imagePlaceholder.alt = '';
        imagePlaceholder.setAttribute('aria-hidden', 'true');
        image.replaceWith(imagePlaceholder);
        movingImage = image;
        travelImage.appendChild(image);
        Object.assign(travelImage.style, {
          left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`
        });
        const startTransform = `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})`;
        travelImage.style.transform = startTransform;
        gallery.appendChild(travelImage);
        const animation = travelImage.animate([
          { transform: startTransform },
          { transform: 'none' }
        ], { duration: 1150, easing: 'ease-in-out', fill: 'forwards' });
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
      clearTimeout(closingTimer);
      finishOpening();
      document.body.classList.remove('gallery-open');
      gallery.classList.remove('is-closing');
      if (lastButton) lastButton.classList.add('gallery-return');
    });
  }

  const timeline = document.querySelector('.curve-tl');
  if (timeline) {
    setupGallery(
      [...timeline.querySelectorAll('.still-open')],
      document.querySelector('.still-lightbox') || createDialog(`${document.title.split(' — ')[0]} still gallery`),
      button => button.closest('figure').querySelector('figcaption').textContent
    );
  }

  document.querySelectorAll('.stills').forEach(grid => {
    const buttons = [...grid.querySelectorAll(':scope > img')].map(image => {
      const cell = document.createElement('div');
      cell.className = 'still-cell';
      const button = document.createElement('button');
      button.className = 'still-open';
      button.type = 'button';
      image.replaceWith(cell);
      button.appendChild(image);
      cell.appendChild(button);
      return button;
    });
    const title = document.title.split(' — ')[0];
    setupGallery(buttons, createDialog(`${title} still gallery`), button => button.querySelector('img').alt);
  });
})();
