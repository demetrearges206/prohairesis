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

    // Ticker state (so we can stop a previous flicker before starting a new one)
    let tickerCancel = null;
    let lastDisplayedYear = years[0];
    yearNumEl.textContent = String(years[0]);

    function setYear(value, isMidTransition) {
      // value can be a non-integer during transitions; we round.
      const v = Math.round(value);
      if (v !== lastDisplayedYear) {
        lastDisplayedYear = v;
        yearNumEl.textContent = String(v);
      }
      yearNumEl.classList.toggle('ticking', !!isMidTransition);
    }

    // Map global scroll progress (0..1 over the block) to:
    //  - track translateX (in vw)
    //  - active card index (float)
    function update() {
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const blockH = block.offsetHeight;
      // progress: 0 when the block's top hits viewport top, 1 when the block
      // has finished its scroll (top + blockH - vh hits viewport top).
      const scrollable = blockH - vh;
      let p = -rect.top / Math.max(1, scrollable);
      p = Math.max(0, Math.min(1, p));

      // floatIdx: 0..N-1
      const floatIdx = p * (N - 1);
      const fromIdx = Math.floor(floatIdx);
      const toIdx = Math.min(N - 1, fromIdx + 1);
      const subProgress = floatIdx - fromIdx; // 0..1 within the current transition

      // Track translate: each card occupies 100vw, so track shifts by floatIdx * 100vw
      track.style.transform = `translate3d(${-floatIdx * 100}vw, 0, 0)`;

      // Year ticker:
      //  - When NOT mid-transition (subProgress near 0 or 1), show the exact year.
      //  - When mid-transition, rapid-tick: interpolate years[from]→years[to] and
      //    add a hash-based jitter so the digits feel "scrambling" rather than
      //    smoothly counting. This visually reads as a fast number-flick.
      const fromYear = years[fromIdx];
      const toYear = years[toIdx];
      const TRANS_BAND = 0.15; // last 15% of each card-span is the "ticking" zone
      if (subProgress < TRANS_BAND || fromIdx === toIdx) {
        // Settled on fromYear
        setYear(fromYear, false);
      } else if (subProgress > 1 - 0.02) {
        // Settled on toYear (very end)
        setYear(toYear, false);
      } else {
        // Mid-transition: interpolate with jitter
        const tBand = (subProgress - TRANS_BAND) / (1 - TRANS_BAND); // 0..1 over the ticking range
        const linear = fromYear + (toYear - fromYear) * tBand;
        // Jitter: small random-ish offset that depends on tBand so it doesn't
        // re-randomize every frame — pseudo-noise tied to floatIdx
        const seed = Math.sin(performance.now() * 0.04 + floatIdx * 13.37) * 0.5;
        const span = Math.abs(toYear - fromYear);
        const jitter = seed * Math.min(span * 0.4, 8);
        setYear(linear + jitter, true);
      }
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

    // While inside a transition we want a continuous animation tick so the
    // jitter looks alive even when the user holds still mid-scroll. Run a
    // light RAF loop that only does work when we're inside the block AND
    // currently in a ticking band.
    let liveRaf = 0;
    function liveLoop() {
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only run when block is visible
      if (rect.bottom > 0 && rect.top < vh) {
        update();
      }
      liveRaf = requestAnimationFrame(liveLoop);
    }
    // Only start the live loop on desktop — on mobile, throttle to scroll-only
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      liveRaf = requestAnimationFrame(liveLoop);
    }

    // Initial paint
    update();
  }
})();
