/* ============================================================
   timeline-h.js — Horizontal scroll-pinned timeline (Ch I)
   ------------------------------------------------------------
   Wraps a .timeline-h block:
     • Sizes the block tall (cards * ~1.15vh each) so vertical
       scroll drives horizontal card selection.
     • Sticky-pins .timeline-h-stage at top of viewport.
     • Magnetic snap: each card locks center until scroll
       crosses the midpoint to the next/previous card, then
       snaps with a smooth CSS transition. Within a card's
       zone a 10% rubber-band pull gives tactile resistance.
     • Year number jumps directly to the snapped card's year
       — no lerp, no animation, purely scroll-driven.
     • Reverses cleanly on scroll-back.
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

    // Each card occupies this many viewports of vertical scroll budget.
    // The snap triggers at ±0.5 of a card index, so effective hold per
    // card = PER_CARD_VH viewports of scroll before the next snap fires.
    const PER_CARD_VH = 1.3;

    function sizeBlock() {
      const vh = window.innerHeight;
      // (N-1) transitions + 0.5 entry/exit pad
      const heightVh = (N - 1) * PER_CARD_VH + 0.5;
      block.style.height = (heightVh * vh) + 'px';
    }
    sizeBlock();

    // ── Snap state ──────────────────────────────────────────
    let snappedIdx = 0;
    let transitioning = false;
    let snapTimer = null;
    const SNAP_MS = 420;
    const SNAP_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    yearNumEl.textContent = String(years[0]);

    function showYear(idx) {
      const y = String(years[idx]);
      if (yearNumEl.textContent !== y) yearNumEl.textContent = y;
    }

    function snapTo(idx) {
      idx = Math.max(0, Math.min(N - 1, idx));
      if (idx === snappedIdx && transitioning === false) return;
      snappedIdx = idx;
      transitioning = true;

      track.style.transition = `transform ${SNAP_MS}ms ${SNAP_EASE}`;
      track.style.transform = `translate3d(${-snappedIdx * 100}vw, 0, 0)`;
      showYear(snappedIdx);

      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        transitioning = false;
        track.style.transition = '';
      }, SNAP_MS + 20);
    }

    // ── Per-frame update ─────────────────────────────────────
    function update() {
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = Math.max(1, block.offsetHeight - vh);
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));

      // Float card index across the full range
      const floatIdx = p * (N - 1);

      // Snap boundary: Math.round snaps at exactly ±0.5 from each card
      const targetIdx = Math.max(0, Math.min(N - 1, Math.round(floatIdx)));

      if (targetIdx !== snappedIdx) {
        snapTo(targetIdx);
      } else if (!transitioning) {
        // Rubber-band: subtle pull toward current scroll position within
        // the card's hold zone, capped to ±0.4 cards so it never crosses
        // the snap boundary on its own.
        const pull = Math.max(-0.4, Math.min(0.4, (floatIdx - snappedIdx) * 0.10));
        track.style.transform = `translate3d(${-(snappedIdx + pull) * 100}vw, 0, 0)`;
      }
    }

    // ── Event wiring ─────────────────────────────────────────
    let raf = 0;
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; update(); });
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { sizeBlock(); schedule(); });
    window.addEventListener('load', () => { sizeBlock(); update(); });

    update();

    // Belt-and-braces rAF poll — keeps track in sync when scroll events
    // are swallowed (iframe / programmatic scroll edge cases).
    let lastY = -1;
    function pollLoop() {
      requestAnimationFrame(pollLoop);
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom > -vh && rect.top < vh * 2) update();
    }
    requestAnimationFrame(pollLoop);
  }
})();
