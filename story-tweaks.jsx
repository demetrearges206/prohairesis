/* Prohairesis tweaks panel
   Exposes scroll / text shadow / text card opacity / typography
   and a chapter jump. Renders a floating panel via <TweaksPanel>.
*/

const PROHAIRESIS_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "textShadow": 0.32,
  "cardOpacity": 0,
  "parallaxStrength": 1.0,
  "grain": true,
  "fontPair": "Fraunces + Inter Tight",
  "showProgress": true,
  "mobileScale": 1.0
}/*EDITMODE-END*/;

const FONT_PAIRS = {
  "Fraunces + Inter Tight": {
    serif: `"Fraunces", Georgia, serif`,
    sans: `"Inter Tight", "Inter", system-ui, sans-serif`,
  },
  "Cormorant + JetBrains": {
    serif: `"Cormorant Garamond", Georgia, serif`,
    sans: `"JetBrains Mono", ui-monospace, monospace`,
  },
  "EB Garamond + Mono": {
    serif: `"EB Garamond", Georgia, serif`,
    sans: `"JetBrains Mono", ui-monospace, monospace`,
  },
  "Playfair + Inter": {
    serif: `"Playfair Display", Georgia, serif`,
    sans: `"Inter", system-ui, sans-serif`,
  },
};

// Make sure all the font families above are available
(function loadFonts() {
  const href = "https://fonts.googleapis.com/css2?" +
    "family=Fraunces:ital,wght@0,300..700;1,200..500&" +
    "family=Cormorant+Garamond:ital,wght@0,300..700;1,300..600&" +
    "family=EB+Garamond:ital,wght@0,400..700;1,400..700&" +
    "family=Playfair+Display:ital,wght@0,400..700;1,400..700&" +
    "family=Inter+Tight:wght@400..600&" +
    "family=Inter:wght@400..600&" +
    "family=JetBrains+Mono:wght@400;500&display=swap";
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
})();

function ProhairesisTweaks() {
  const [t, setTweak] = useTweaks(PROHAIRESIS_TWEAK_DEFAULTS);

  // Apply CSS vars whenever tweaks change
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--text-shadow-strength", String(t.textShadow));
    root.style.setProperty("--card-opacity", String(t.cardOpacity));
    root.style.setProperty("--mobile-scale", String(t.mobileScale ?? 1));

    // parallax strength: multiply data-speed by a factor via CSS custom prop
    // simpler: mutate live layers
    document.querySelectorAll(".scene .layer").forEach(el => {
      if (el.dataset.origSpeed === undefined) {
        el.dataset.origSpeed = el.dataset.speed || "0";
      }
      const orig = parseFloat(el.dataset.origSpeed);
      el.dataset.speed = String(orig * t.parallaxStrength);
    });
    // trigger a recompute
    if (window.__parallax && window.__parallax.onScroll) window.__parallax.onScroll();

    // text-card backing opacity + blur
    document.querySelectorAll(".prose").forEach(p => {
      if (t.cardOpacity > 0.01) p.classList.add("carded");
      else p.classList.remove("carded");
    });

    // typography
    const pair = FONT_PAIRS[t.fontPair] || FONT_PAIRS["Fraunces + Inter Tight"];
    root.style.setProperty("--serif", pair.serif);
    root.style.setProperty("--sans", pair.sans);

    // grain
    const grain = document.querySelector(".grain");
    if (grain) grain.style.display = t.grain ? "block" : "none";

    // progress bar
    const bar = document.querySelector(".progress-bar");
    if (bar) bar.style.display = t.showProgress ? "block" : "none";
  }, [t]);

  const jumpTo = (idx) => {
    const chapters = document.querySelectorAll(".chapter");
    if (chapters[idx]) {
      window.scrollTo({ top: chapters[idx].offsetTop, behavior: "smooth" });
    }
  };

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Text on scene" />
      <TweakSlider
        label="Drop-shadow strength"
        value={Math.round(t.textShadow * 100)}
        min={0} max={100} step={1} unit="%"
        onChange={(v) => setTweak("textShadow", v / 100)}
      />
      <TweakSlider
        label="Card backing opacity"
        value={Math.round(t.cardOpacity * 100)}
        min={0} max={80} step={1} unit="%"
        onChange={(v) => setTweak("cardOpacity", v / 100)}
      />

      <TweakSection label="Parallax" />
      <TweakSlider
        label="Depth intensity"
        value={Math.round(t.parallaxStrength * 100)}
        min={0} max={200} step={5} unit="%"
        onChange={(v) => setTweak("parallaxStrength", v / 100)}
      />

      <TweakSection label="Typography" />
      <TweakSelect
        label="Font pairing"
        value={t.fontPair}
        options={Object.keys(FONT_PAIRS)}
        onChange={(v) => setTweak("fontPair", v)}
      />

      <TweakSection label="Mobile" />
      <TweakSlider
        label="Scene zoom (phones)"
        value={Math.round((t.mobileScale ?? 1) * 100)}
        min={50} max={180} step={5} unit="%"
        onChange={(v) => setTweak("mobileScale", v / 100)}
      />

      <TweakSection label="Atmosphere" />
      <TweakToggle label="Film grain" value={t.grain} onChange={(v) => setTweak("grain", v)} />
      <TweakToggle label="Progress bar" value={t.showProgress} onChange={(v) => setTweak("showProgress", v)} />

      <TweakSection label="Jump to chapter" />
      <div style={{ display: "flex", gap: 6, padding: "4px 12px 12px", flexWrap: "wrap" }}>
        {["I", "II", "III", "IV", "V"].map((r, i) => (
          <button
            key={i}
            onClick={() => jumpTo(i)}
            style={{
              all: "unset",
              cursor: "pointer",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: ".15em",
              padding: "6px 10px",
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 4,
              color: "#e8e3d9",
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </TweaksPanel>
  );
}

// Mount the tweaks panel into a root node
(function mount() {
  const host = document.createElement("div");
  host.id = "prohairesis-tweaks-root";
  document.body.appendChild(host);
  ReactDOM.createRoot(host).render(<ProhairesisTweaks />);
})();
