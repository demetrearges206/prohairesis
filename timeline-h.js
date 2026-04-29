/* ============================================================
   timeline-h.js — Horizontal scroll-pinned timeline (Ch I)
   ------------------------------------------------------------
   Wraps a .timeline-h block:
     • Sizes the block tall (cards * ~1.3vh each) so vertical
       scroll drives horizontal card selection.
     • Sticky-pins .timeline-h-stage at top of viewport.
     • Magnetic snap: each card locks center until scroll
       crosses the ±0.5 midpoint to the next/previous card,
       then snaps with a smooth CSS transition.
     • Only one snap transition runs at a time — rapid scroll
       queues the final destination and fires it after the
       current transition settles (no chain-jumping glitch).
     • Within a card's zone a 10% rubber-band pull gives
       tactile resistance before the snap fires.
     • Year number jumps directly to the snapped card's year.
     • Track translate uses actual pixel widths (not vw units)
       so mobile browsers with viewport/gutter quirks stay
       correctly centered.
     • Reverses cleanly on scroll-back.
   ============================================================ */
(function () {
  const blocks = Array.from(document.querySelectorAll('.timeline-h'));
  if (!blocks.length) return;

  blocks.forEach(initTimeline);

  function initTimeline(block) {
    const stage = block.querySelector('.timeline-h-stage');
    const track = block.querySelector('[data-timeline-track]');
    const yearNumEl = block.querySelector('[data-year-num]');
    const cards = Array.from(block.querySelectorAll('.timeline-h-card'));
    if (!stage || !track || !yearNumEl || cards.length < 2) return;

    const years = cards.map(c => parseInt(c.dataset.year, 10));
    const N = cards.length;

    // Each card occupies this many viewports of vertical scroll budget.
    // Snap triggers at ±0.5 of a card index, so hold per card
    // = PER_CARD_VH viewports of scroll before the next snap fires.
    const PER_CARD_VH = 1.3;

    function sizeBlock() {
      const vh = window.innerHeight;
      const heightVh = (N - 1) * PER_CARD_VH + 0.5;
      block.style.height = (heightVh * vh) + 'px';

      // Size cards in px to match stage's actual pixel width — avoids
      // 100vw vs clientWidth divergence on iOS (browser chrome offsets).
      const w = stage.clientWidth;
      cards.forEach(c => { c.style.flex = `0 0 ${w}px`; });
    }
    sizeBlock();

    // ── Snap state ──────────────────────────────────────────
    let snappedIdx = 0;
    let transitioning = false;
    let pendingIdx = null;   // destination queued during an active transition
    let snapTimer = null;
    const SNAP_MS = 400;
    const SNAP_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    yearNumEl.textContent = String(years[0]);

    function showYear(idx) {
      const y = String(years[idx]);
      if (yearNumEl.textContent !== y) yearNumEl.textContent = y;
    }

    // Return the track's pixel offset for a given card index + fractional pull.
    function cardPx(idx) {
      return -(idx * stage.clientWidth);
    }

    function applyTranslate(px, withTransition) {
      if (withTransition) {
        track.style.transition = `transform ${SNAP_MS}ms ${SNAP_EASE}`;
      } else {
        track.style.transition = '';
      }
      track.style.transform = `translate3d(${px}px, 0, 0)`;
    }

    function afterSnap() {
      transitioning = false;
      track.style.transition = '';
      if (pendingIdx !== null && pendingIdx !== snappedIdx) {
        const next = pendingIdx;
        pendingIdx = null;
        snapTo(next);
      } else {
        pendingIdx = null;
      }
    }

    function snapTo(idx) {
      idx = Math.max(0, Math.min(N - 1, idx));
      if (transitioning) {
        // Don't interrupt the running transition — just record where to land.
        pendingIdx = idx;
        return;
      }
      if (idx === snappedIdx) return;
      snappedIdx = idx;
      transitioning = true;
      showYear(snappedIdx);
      applyTranslate(cardPx(snappedIdx), true);
      clearTimeout(snapTimer);
      snapTimer = setTimeout(afterSnap, SNAP_MS + 20);
    }

    // ── Per-frame update ─────────────────────────────────────
    function update() {
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = Math.max(1, block.offsetHeight - vh);
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));

      const floatIdx = p * (N - 1);
      const targetIdx = Math.max(0, Math.min(N - 1, Math.round(floatIdx)));

      if (targetIdx !== snappedIdx) {
        snapTo(targetIdx);
      } else if (!transitioning) {
        // Rubber-band: slight pull toward scroll position while in hold zone.
        // Capped to ±0.4 so it can never cross the ±0.5 snap boundary alone.
        const pull = Math.max(-0.4, Math.min(0.4, (floatIdx - snappedIdx) * 0.10));
        applyTranslate(cardPx(snappedIdx + pull), false);
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

    // Belt-and-braces rAF poll for environments where scroll events are
    // swallowed (iframe / programmatic scroll edge cases).
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
