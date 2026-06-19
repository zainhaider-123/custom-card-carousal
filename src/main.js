(function () {
  'use strict';

  // Configuration matching the original Swiper creativeEffect.
  const CONFIG = {
    loop: true,
    grabCursor: true,
    slidesPerView: 3,
    limitProgress: 3,
    perspective: true,
    speed: 500,
    creativeEffect: {
      prev: {
        translate: ['-90%', '20%', -100],
        rotate: [0, 0, -20],
        origin: 'bottom'
      },
      next: {
        translate: ['90%', '20%', -100],
        rotate: [0, 0, 20],
        origin: 'bottom'
      }
    }
  };

  const wrapper = document.querySelector('.my-carousel__slides');
  const slides = Array.from(document.querySelectorAll('.my-carousel__slide'));
  const prevBtn = document.querySelector('.my-carousel__control--prev');
  const nextBtn = document.querySelector('.my-carousel__control--next');

  if (!slides.length) return;

  let activeIndex = 0;
  let isDragging = false;
  let startX = 0;
  let dragOffset = 0;

  function parseTransformValue(value, index) {
    if (typeof value === 'string' && value.includes('%')) {
      return parseFloat(value) * index;
    }
    return value * index;
  }

  function buildTransform(offset) {
    const absOffset = Math.abs(offset);

    if (absOffset === 0) {
      return {
        transform: 'translate3d(-50%, -50%, 0)',
        zIndex: 10
      };
    }

    const side = offset < 0 ? CONFIG.creativeEffect.prev : CONFIG.creativeEffect.next;
    const translate = side.translate.map((v) => parseTransformValue(v, absOffset));
    const rotate = side.rotate.map((v) => parseTransformValue(v, absOffset));

    // The base translate(-50%, -50%) centers the absolutely positioned slide.
    // The creative transform is then applied in the slide's local coordinate
    // system with transform-origin: bottom center.
    const transform = [
      'translate3d(-50%, -50%, 0)',
      `translate3d(${translate[0]}%, ${translate[1]}%, ${translate[2]}px)`,
      `rotateX(${rotate[0]}deg) rotateY(${rotate[1]}deg) rotateZ(${rotate[2]}deg)`
    ].join(' ');

    return {
      transform,
      zIndex: 10 - absOffset
    };
  }

  function getLoopOffset(slideIndex, centerIndex) {
    let offset = slideIndex - centerIndex;
    const total = slides.length;

    if (!CONFIG.loop) return offset;

    // Pick the shortest path around the loop so navigation stays smooth.
    if (offset > total / 2) {
      offset -= total;
    } else if (offset < -total / 2) {
      offset += total;
    }

    return offset;
  }

  function render(targetIndex, visualOffset) {
    const centerIndex = (targetIndex + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      let offset = getLoopOffset(i, centerIndex) + visualOffset;

      // Hide slides that are beyond the configured limit.
      if (Math.abs(offset) > CONFIG.limitProgress) {
        slide.style.opacity = '0';
        slide.style.transform = 'translate3d(-50%, -50%, 0)';
        slide.style.pointerEvents = 'none';
        slide.style.zIndex = '0';
        return;
      }

      const { transform, zIndex } = buildTransform(offset);
      slide.style.transform = transform;
      slide.style.opacity = '1';
      slide.style.zIndex = String(zIndex);
      slide.style.pointerEvents = offset === 0 ? 'auto' : 'none';
    });
  }

  function goTo(index) {
    activeIndex = (index + slides.length) % slides.length;
    render(activeIndex, 0);
  }

  function next() {
    goTo(activeIndex + 1);
  }

  function prev() {
    goTo(activeIndex - 1);
  }

  // Pointer / touch drag handling
  function onDragStart(clientX) {
    isDragging = true;
    startX = clientX;
    dragOffset = 0;
    slides.forEach((slide) => slide.classList.add('is-dragging'));
  }

  function onDragMove(clientX) {
    if (!isDragging) return;

    const slideWidth = slides[0].offsetWidth || 368;
    const delta = clientX - startX;
    // A full slide-width drag moves the carousel by one position.
    dragOffset = -delta / slideWidth;

    render(activeIndex, dragOffset);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    slides.forEach((slide) => slide.classList.remove('is-dragging'));

    if (Math.abs(dragOffset) > 0.15) {
      const direction = dragOffset > 0 ? 1 : -1;
      goTo(activeIndex + direction);
    } else {
      goTo(activeIndex);
    }

    dragOffset = 0;
  }

  wrapper.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onDragStart(e.clientX);
    wrapper.setPointerCapture(e.pointerId);
  });

  wrapper.addEventListener('pointermove', (e) => {
    e.preventDefault();
    onDragMove(e.clientX);
  });

  wrapper.addEventListener('pointerup', (e) => {
    onDragEnd();
    if (wrapper.hasPointerCapture(e.pointerId)) {
      wrapper.releasePointerCapture(e.pointerId);
    }
  });

  wrapper.addEventListener('pointercancel', (e) => {
    onDragEnd();
    if (wrapper.hasPointerCapture(e.pointerId)) {
      wrapper.releasePointerCapture(e.pointerId);
    }
  });

  // Touch fallback for older browsers
  wrapper.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      onDragStart(e.touches[0].clientX);
    },
    { passive: false }
  );

  wrapper.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      onDragMove(e.touches[0].clientX);
    },
    { passive: false }
  );

  wrapper.addEventListener('touchend', onDragEnd);
  wrapper.addEventListener('touchcancel', onDragEnd);

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Initial render
  goTo(activeIndex);
})();
