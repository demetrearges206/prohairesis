/* ============================================================
   timeline-h.js — Horizontal scroll-pinned timeline (Ch I)
   ------------------------------------------------------------
   Wraps a .timeline-h block:
     • Sizes the block tall (cards * 100vh) so vertical scroll
       inside it drives a horizontal track translateX.
     • Sticky-pins .timeline-h-stage at top of viewport.
     • Keeps a fixed YEAR + big year-number ticker centered.
     • As scroll progresses, slides the track right→left and
       rapidly tickers the year number between the from/to
       year during each card-to-card transition.
     • Reverses cleanly on scroll-back (no state drift).
   ============================================================ */
(function () {
  const blocks = Array.from(document.querySelectorAll('.timeline-h'));
  if (!blocks.length) return;

  blocks.forEach(initTimeline);

  function initTimeline(block) {
    const track = block.querySelector('[data-timeline-track]');
    const yearNumEl = block.querySelector('[data-year-num]');
    const cards = Array.from(block.querySelectorAll('.timeline-h-card'));
    if (!track || !yearNumEl || cards.length < 2) return;

    const years = cards.map(c => parseInt(c.dataset.year, 10));
    const N = cards.length;

    // Per-card vertical scroll budget. 100vh = "one screen of scroll per card."
    // Slightly over 1 keeps each card readable before the next starts moving.
    const PER_CARD_VH = 1.15;

    function sizeBlock() {
      const vh = window.innerHeight;
      // Total height = (N-1) transitions * PER_CARD_VH + 1 final card hold + 0.5 entry pad
      const heightVh = (N - 1) * PER_CARD_VH + 1.0;
      block.style.height = (heightVh * vh) + 'px';
    }
    sizeBlock();

    let lastDisplayedYear = years[0];
    yearNumEl.textContent = String(years[0]);

    function setYear(value) {
      const v = Math.round(value);
      if (v !== lastDisplayedYear) {
        lastDisplayedYear = v;
        yearNumEl.textContent = String(v);
      }
    }

    // Map global scroll progress (0..1 over the block) to:
    //  - track translateX (in vw)
    //  - active card index (float)
    //  - displayed year (linear interpolation from years[from] -> years[to],
    //    snapped to nearest integer — purely scroll-driven, no animation,
    //    no jitter, no transitions).
    function update() {
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const blockH = block.offsetHeight;
      const scrollable = blockH - vh;
      let p = -rect.top / Math.max(1, scrollable);
      p = Math.max(0, Math.min(1, p));

      const floatIdx = p * (N - 1);
      const fromIdx = Math.floor(floatIdx);
      const toIdx = Math.min(N - 1, fromIdx + 1);
      const subProgress = floatIdx - fromIdx; // 0..1 within the current transition

      // Track translate: each card occupies 100vw, so track shifts by floatIdx * 100vw
      track.style.transform = `translate3d(${-floatIdx * 100}vw, 0, 0)`;

      // Year: linear lerp between fromYear and toYear, snapped to nearest int.
      // No jitter, no setInterval, no CSS animation — pure scroll-position read.
      const fromYear = years[fromIdx];
      const toYear = years[toIdx];
      const linear = fromYear + (toYear - fromYear) * subProgress;
      setYear(linear);
    }

    // RAF-throttled scroll handler
    let raf = 0;
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; update(); });
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { sizeBlock(); schedule(); });
    window.addEventListener('load', () => { sizeBlock(); update(); });

    // Initial paint
    update();

    // Continuous rAF poll while the block is in/near the viewport. This is
    // a belt-and-braces fallback so the track stays in sync even when the
    // host swallows scroll events (some iframe / programmatic-scroll cases
    // don't fire 'scroll' on window). Throttled and only updates when the
    // scroll position has actually changed since last frame.
    let raf2 = 0;
    let lastY = -1;
    function pollLoop() {
      raf2 = requestAnimationFrame(pollLoop);
      const y = window.scrollY;
      if (y === lastY) return;          // bail if scroll hasn't changed
      lastY = y;
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only do work when the block is within ±2 viewports of the viewport
      if (rect.bottom > -vh && rect.top < vh * 2) {
        update();
      }
    }
    raf2 = requestAnimationFrame(pollLoop);
  }
})();
