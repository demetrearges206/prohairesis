/* ============================================================
   Parallax engine for Prohairesis
   - Each .scene is position:sticky inside a .chapter
   - Each .layer inside .scene gets a data-speed (float, negative = moves up as you scroll down)
   - On scroll we compute the chapter's progress through the viewport
     and translate layers by (progress * speed * 100vh)
   - Also supports data-offset (starting y in vh) and data-scale.
   ============================================================ */
(function () {
  const chapters = Array.from(document.querySelectorAll('.chapter'));

  // Auto-size each chapter's height from its prose content so nothing
  // overflows into the next chapter. We want the chapter tall enough that
  // (a) the prose fits with room at top + bottom, and (b) the sticky scene
  // stays pinned long enough for a meaningful parallax traversal.
  function sizeChapters() {
    const vh = window.innerHeight;
    chapters.forEach(ch => {
      const prose = ch.querySelector('.prose');
      if (!prose) return;
      // Temporarily unset height so we can measure true content
      ch.style.height = 'auto';
      // Sum height of ALL prose blocks (a chapter can contain more than one,
      // e.g. Ch I has prose → horizontal timeline → prose-tail) plus the
      // height of any embedded .timeline-h block (auto-sized by its own JS).
      const proses = ch.querySelectorAll('.prose');
      let proseHeight = 0;
      proses.forEach(p => { proseHeight += p.scrollHeight; });
      const timelines = ch.querySelectorAll('.timeline-h');
      timelines.forEach(t => { proseHeight += t.offsetHeight; });
      // Chapter must be at least: content height + 1 viewport of tailroom
      // so the sticky scene can scroll past the last paragraph before the
      // chapter ends (otherwise the prose would outrun the scene).
      const minHeight = proseHeight + vh * 0.6;
      // And never shorter than 4× viewport to keep parallax feeling paced
      ch.style.height = Math.max(minHeight, vh * 4) + 'px';
    });
  }
  sizeChapters();

  const layersByChapter = chapters.map(ch => {
    const scene = ch.querySelector('.scene');
    return {
      chapter: ch,
      scene,
      layers: Array.from(scene ? scene.querySelectorAll('.layer') : []).map(el => ({
        el,
        speed: parseFloat(el.dataset.speed || '0'),
        offsetY: parseFloat(el.dataset.offset || '0'), // in vh
        offsetX: parseFloat(el.dataset.offsetx || '0'), // in vw
        scale: parseFloat(el.dataset.scale || '1'),
      })),
    };
  });

  const toc = document.querySelectorAll('.toc button');
  const counter = document.querySelector('.chrome .counter .current');
  const progressBar = document.querySelector('.progress-bar');

  function onScroll() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scrollY = window.scrollY;
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - vh;
    if (progressBar) progressBar.style.width = (scrollY / maxScroll * 100) + '%';

    let activeIdx = -1;
    let activeName = '';

    layersByChapter.forEach((grp, i) => {
      const rect = grp.chapter.getBoundingClientRect();
      const top = rect.top;          // px from top of viewport
      const height = rect.height;    // total chapter height
      // progress = how far through the chapter we are (0..1)
      // when chapter top hits viewport top, progress=0; when chapter bottom hits viewport bottom, progress=1
      const progress = Math.max(-0.25, Math.min(1.25, -top / (height - vh)));

      if (top <= vh * 0.5 && top + height >= vh * 0.5) {
        activeIdx = i;
        activeName = grp.chapter.dataset.name || '';
      }

      grp.layers.forEach(L => {
        // data-speed is expressed as % of viewport height over the full chapter.
        // e.g. speed=-48 → layer drifts up by 48% of vh as the chapter scrolls past.
        const dy = progress * L.speed * vh / 100;
        const ox = L.offsetX * vw / 100;
        const oy = L.offsetY * vh / 100;
        L.el.style.transform = `translate3d(${ox}px, ${oy + dy}px, 0) scale(${L.scale})`;
      });
    });

    toc.forEach((b, i) => b.dataset.active = (i === activeIdx));
    if (counter && activeIdx >= 0) {
      counter.textContent = String(activeIdx + 1).padStart(2, '0');
    }
  }

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      onScroll();
    });
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { sizeChapters(); schedule(); });
  // Re-size once fonts + images settle (prose height can shift after layout)
  window.addEventListener('load', () => { sizeChapters(); onScroll(); });
  setTimeout(() => { sizeChapters(); onScroll(); }, 300);
  onScroll();

  // TOC clicks
  toc.forEach((b, i) => {
    b.addEventListener('click', () => {
      const target = chapters[i];
      if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    });
  });

  // Expose for tweaks panel
  window.__parallax = { onScroll };

  // ─── Halftone glitch trigger ──────────────────────────────
  // The disc-snap moment in Ch V is marked by <p class="flash">FLASH</p>.
  // When it crosses near viewport center while scrolling, we briefly turn on
  // the halftone-overlay element. Same for the "I snapped the disc" line.
  const halftone = document.getElementById('halftoneFx');
  const flashEl = document.querySelector('.chapter[data-name="V · Choice"] .flash');
  const snapEl  = Array.from(document.querySelectorAll('.chapter[data-name="V · Choice"] .shout.gentle')).find(p => /snapped the disc/i.test(p.textContent));
  if (halftone) {
    let active = false;
    let lastTrigger = 0;
    function checkGlitch() {
      const vh = window.innerHeight;
      const triggers = [flashEl, snapEl].filter(Boolean);
      let shouldShow = false;
      let intensity = 0;
      for (const el of triggers) {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        // Distance from viewport center, normalized
        const d = Math.abs(center - vh / 2) / (vh / 2);
        if (d < 0.5) {
          shouldShow = true;
          intensity = Math.max(intensity, 1 - d * 2);  // 0..1
        }
      }
      if (shouldShow !== active) {
        active = shouldShow;
        halftone.classList.toggle('active', shouldShow);
        halftone.classList.toggle('glitch', shouldShow);
      }
      if (shouldShow) {
        halftone.style.setProperty('--halftone-opacity', (intensity * 0.85).toFixed(2));
      }
    }
    // Hook into scroll
    const _origOnScroll = onScroll;
    window.__parallax.onScroll = function() { _origOnScroll(); checkGlitch(); };
    window.addEventListener('scroll', checkGlitch, { passive: true });
    window.addEventListener('load', checkGlitch);
  }
})();
