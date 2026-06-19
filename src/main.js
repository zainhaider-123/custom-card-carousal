(function () {
  'use strict';

  // Half-circle (arc) carousel configuration.
  const CONFIG = {
    loop: true,
    grabCursor: true,
    limitProgress: 4,
    angleStep: 15,   // degrees between each slide on the arc
    depthStep: 100,  // px to push side slides back in Z
    maxRadius: 850,   // px cap for the arc radius

    responsive: {
      slides: {
        0: 3,//how many slides to show above 0px
        560: 4,//how many slides to show above 560px
        768: 5,//how many slides to show above 768px
        1036: 6,//how many slides to show above 1036px
        1336: 7,//how many slides to show above 1336px
      },

    }
  };

  const wrapper = document.querySelector('.my-carousel__slides');
  const track = document.querySelector('.my-carousel__track');
  const slides = Array.from(document.querySelectorAll('.my-carousel__slide'));
  const prevBtn = document.querySelector('.my-carousel__control--prev');
  const nextBtn = document.querySelector('.my-carousel__control--next');

  if (!slides.length) return;

  let activeIndex = 0;
  let isDragging = false;
  let startX = 0;
  let dragOffset = 0;

  function getRadius() {
    if (!track) return CONFIG.maxRadius;
    // Fit the arc inside the track: center at the bottom middle,
    // radius nearly the track height so the peak sits near the top.
    return Math.min(
      track.clientHeight * 0.92,
      track.clientWidth * 0.42,
      CONFIG.maxRadius
    );
  }

  function getResponsiveLimit() {
    if (!CONFIG.responsive || !CONFIG.responsive.slides) {
      return CONFIG.limitProgress;
    }

    const width = window.innerWidth;
    const breakpoints = Object.keys(CONFIG.responsive.slides)
      .map(Number)
      .sort((a, b) => a - b);

    let chosen = CONFIG.limitProgress;
    for (const breakpoint of breakpoints) {
      if (width >= breakpoint) {
        chosen = CONFIG.responsive.slides[breakpoint];
      }
    }

    // The responsive value is total visible slides; convert to "slides per side".
    return Math.max(1, Math.floor((chosen - 1) / 2));
  }

  function buildTransform(offset) {
    const absOffset = Math.abs(offset);
    const radius = getRadius();
    const theta = offset * CONFIG.angleStep * (Math.PI / 180);

    // Position each slide so its bottom sits on the upper half of a large
    // circle centered below the track, then rotate it to point outward.
    const x = Math.sin(theta) * radius;
    const y = -Math.cos(theta) * radius;
    const z = -absOffset * CONFIG.depthStep;
    const rotateZ = offset * CONFIG.angleStep;

    const transform = [
      'translate3d(-50%, 0, 0)',
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z}px)`,
      `rotateZ(${rotateZ.toFixed(1)}deg)`
    ].join(' ');

    return {
      transform,
      zIndex: 10 - Math.round(absOffset)
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
    const limit = getResponsiveLimit();

    slides.forEach((slide, i) => {
      let offset = getLoopOffset(i, centerIndex) + visualOffset;

      // Hide slides that are beyond the configured limit.
      if (Math.abs(offset) > limit) {
        slide.style.opacity = '0';
        slide.style.transform = 'translate3d(-50%, 0, 0)';
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

  // Recompute arc on resize
  window.addEventListener('resize', () => render(activeIndex, 0));

  // Initial render
  goTo(activeIndex);
})();
