(() => {
  const selector = '.post-content img';
  const ignoredSelector = '.no-lightbox';
  const content = document.querySelector('.post-content');
  if (!content || !content.querySelector('img')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'image-lightbox';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('tabindex', '-1');
  overlay.innerHTML = '<img class="image-lightbox__img" alt="" draggable="false">';
  document.body.appendChild(overlay);

  const overlayImg = overlay.querySelector('.image-lightbox__img');
  let activeImages = [];
  let activeIndex = -1;
  let closeTimer;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipePointerId = null;
  let suppressNextClick = false;
  let suppressClickTimer;
  let previousActiveElement = null;
  const preloadedImages = new Map();
  const swipeDistance = 48;
  const swipeAxisRatio = 1.4;

  const close = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (closeTimer) {
      window.clearTimeout(closeTimer);
    }
    if (suppressClickTimer) {
      window.clearTimeout(suppressClickTimer);
      suppressClickTimer = null;
    }
    suppressNextClick = false;
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus({ preventScroll: true });
      previousActiveElement = null;
    }
    closeTimer = window.setTimeout(() => {
      overlayImg.src = '';
      overlayImg.alt = '';
    }, 240);
  };

  const getLightboxImages = () => Array.from(document.querySelectorAll(selector))
    .filter((img) => !img.matches(ignoredSelector) && !img.closest('a'));

  const getImageSrc = (img) => img.getAttribute('data-zoom-src') || img.currentSrc || img.src;

  const preloadAtIndex = (index) => {
    if (!activeImages.length) {
      return;
    }

    const img = activeImages[(index + activeImages.length) % activeImages.length];
    const src = getImageSrc(img);
    if (!src || preloadedImages.has(src)) {
      return;
    }

    const preload = new Image();
    preload.decoding = 'async';
    preload.src = src;
    preloadedImages.set(src, preload);
  };

  const preloadAdjacent = () => {
    preloadAtIndex(activeIndex - 1);
    preloadAtIndex(activeIndex + 1);
  };

  const showAtIndex = (index) => {
    if (!activeImages.length) {
      return;
    }
    activeIndex = (index + activeImages.length) % activeImages.length;
    const img = activeImages[activeIndex];
    overlayImg.src = getImageSrc(img);
    overlayImg.alt = img.alt || '';
    preloadAdjacent();
  };

  const resetSwipe = () => {
    swipeStartX = 0;
    swipeStartY = 0;
    swipePointerId = null;
  };

  const suppressClickAfterSwipe = () => {
    suppressNextClick = true;
    if (suppressClickTimer) {
      window.clearTimeout(suppressClickTimer);
    }
    suppressClickTimer = window.setTimeout(() => {
      suppressNextClick = false;
      suppressClickTimer = null;
    }, 400);
  };

  const open = (img) => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
    }
    previousActiveElement = document.activeElement;
    activeImages = getLightboxImages();
    activeIndex = activeImages.indexOf(img);
    if (activeIndex === -1) {
      activeImages = [];
      activeIndex = -1;
      overlayImg.src = getImageSrc(img);
      overlayImg.alt = img.alt || '';
    } else {
      showAtIndex(activeIndex);
    }
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    overlay.focus({ preventScroll: true });
  };

  overlay.addEventListener('click', () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      if (suppressClickTimer) {
        window.clearTimeout(suppressClickTimer);
        suppressClickTimer = null;
      }
      return;
    }
    close();
  });

  overlay.addEventListener('pointerdown', (event) => {
    if (!overlay.classList.contains('is-open') || !event.isPrimary) {
      return;
    }

    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipePointerId = event.pointerId;
    if (typeof overlay.setPointerCapture === 'function') {
      overlay.setPointerCapture(event.pointerId);
    }
  });

  overlay.addEventListener('pointerup', (event) => {
    if (event.pointerId !== swipePointerId) {
      return;
    }

    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    const isHorizontalSwipe = Math.abs(deltaX) >= swipeDistance
      && Math.abs(deltaX) > Math.abs(deltaY) * swipeAxisRatio;

    resetSwipe();

    if (!isHorizontalSwipe) {
      return;
    }

    suppressClickAfterSwipe();
    showAtIndex(activeIndex + (deltaX < 0 ? 1 : -1));
  });

  overlay.addEventListener('pointercancel', resetSwipe);

  window.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('is-open')) {
      return;
    }
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'Right') {
      event.preventDefault();
      showAtIndex(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'Left') {
      event.preventDefault();
      showAtIndex(activeIndex - 1);
    }
  }, true);

  document.addEventListener('click', (event) => {
    const img = event.target.closest(selector);
    if (!img) {
      return;
    }
    if (img.matches(ignoredSelector) || img.closest('a')) {
      return;
    }
    if (overlay.contains(img)) {
      return;
    }
    event.preventDefault();
    open(img);
  });
})();
