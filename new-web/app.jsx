/* Metrix — App entry. Wires sections + Tweaks panel for palette presets. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "bone",
  "density": "regular",
  "italicHeadlines": true
}/*EDITMODE-END*/;

// Palette presets — only Bone (light) and Ink (dark).
const PALETTES = {
  bone: {
    name: "Bone",
    swatch: ["#F2EFE8", "#14110D", "#FF5B2E"],
    vars: {
      "--bg": "#F2EFE8",
      "--bg-2": "#ECE7DC",
      "--bg-3": "#E3DDCF",
      "--ink": "#14110D",
      "--ink-2": "#5A5247",
      "--ink-3": "#8C8170",
      "--line": "#1411091a",
      "--line-2": "#14110933",
      "--card": "#FFFDF7",
      "--accent": "#FF5B2E",
      "--accent-2": "#FFE4D6",
      "--accent-ink": "#14110D",
    },
  },
  ink: {
    name: "Ink",
    swatch: ["#0E0C09", "#F2EFE8", "#FF5B2E"],
    vars: {
      "--bg": "#0E0C09",
      "--bg-2": "#171410",
      "--bg-3": "#221E18",
      "--ink": "#F2EFE8",
      "--ink-2": "#B7AE9F",
      "--ink-3": "#867C6D",
      "--line": "#ffffff14",
      "--line-2": "#ffffff2a",
      "--card": "#171410",
      "--accent": "#FF5B2E",
      "--accent-2": "#3a1f15",
      "--accent-ink": "#0E0C09",
    },
  },
};

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const palette = PALETTES[t.palette] || PALETTES.bone;

  // Apply palette as CSS variables on :root
  React.useEffect(() => {
    const root = document.documentElement;
    Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [t.palette]);

  React.useEffect(() => {
    document.body.classList.toggle("no-italic-headlines", !t.italicHeadlines);
  }, [t.italicHeadlines]);

  return (
    <React.Fragment>
      <Nav palette={t.palette} onTogglePalette={() => setTweak("palette", t.palette === "bone" ? "ink" : "bone")} />
      <Hero />
      <TrustStrip />
      <SpaceTabs />
      <HowItWorks />
      <BookingDemo />
      <B2B />
      <FAQ />
      <FooterCTA />
      <Footer />

      <TweaksPanel>
        <TweakSection label="Theme" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {Object.entries(PALETTES).map(([key, p]) => {
            const on = key === t.palette;
            return (
              <button key={key} onClick={() => setTweak("palette", key)} title={p.name} style={{
                cursor: "pointer",
                borderRadius: 10,
                padding: 4,
                background: on ? "rgba(0,0,0,0.08)" : "transparent",
                border: on ? "1.5px solid rgba(0,0,0,0.4)" : "1px solid rgba(0,0,0,0.08)",
              }}>
                <div style={{ display: "flex", gap: 2, height: 22, borderRadius: 5, overflow: "hidden", marginBottom: 4 }}>
                  {p.swatch.map((c) => (
                    <div key={c} style={{ flex: 1, background: c }} />
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 500, textAlign: "center", color: on ? "#000" : "rgba(0,0,0,0.6)" }}>{p.name}</div>
              </button>
            );
          })}
        </div>

        <TweakSection label="Headlines" />
        <TweakToggle label="Italic accent" value={t.italicHeadlines} onChange={(v) => setTweak("italicHeadlines", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
};

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
