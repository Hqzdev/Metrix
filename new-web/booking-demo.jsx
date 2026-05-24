/* Metrix — Live booking demo (interactive flow with price calculator) */

const CITIES = ["Berlin", "Lisbon", "Warsaw", "Amsterdam", "Tbilisi"];
const SPACE_OPTIONS = [
  { id: "desk",    name: "Hot desk",       price: 9,  pict: (s) => <PictDesk size={s} /> },
  { id: "meeting", name: "Meeting room",   price: 28, pict: (s) => <PictMeeting size={s} /> },
  { id: "office",  name: "Private office", price: 65, pict: (s) => <PictOffice size={s} /> },
  { id: "event",   name: "Event space",    price: 180,pict: (s) => <PictEvent size={s} /> },
];

const VENUES = {
  Berlin:    [["Mokrym Loft", "Kreuzberg"], ["Quiet Wing", "Mitte"], ["Brutal Coffee", "Friedrichshain"]],
  Lisbon:    [["Amalia Studio", "Alfama"],  ["Bairro Hub", "Bairro Alto"], ["Rio Sul", "Cais do Sodré"]],
  Warsaw:    [["Praga Atelier", "Praga"],   ["Mokotów Wing", "Mokotów"], ["Wola 31", "Wola"]],
  Amsterdam: [["Oost Loft", "Oost"],        ["Jordaan Pod", "Jordaan"],  ["Noord Atelier", "Noord"]],
  Tbilisi:   [["Vake Studio", "Vake"],      ["Marjanishvili", "Centre"], ["Saburtalo Pod", "Saburtalo"]],
};

const HOURS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];

const BookingDemo = () => {
  const [city, setCity] = React.useState("Berlin");
  const [spaceId, setSpaceId] = React.useState("desk");
  const [venueIdx, setVenueIdx] = React.useState(0);
  const [startIdx, setStartIdx] = React.useState(2);
  const [hours, setHours] = React.useState(3);
  const [people, setPeople] = React.useState(1);
  const [extras, setExtras] = React.useState({ coffee: false, parking: false, screen: true });
  const [confirmed, setConfirmed] = React.useState(false);

  const space = SPACE_OPTIONS.find((s) => s.id === spaceId);
  const venue = VENUES[city][venueIdx];
  const subtotal = space.price * hours;
  const extrasCost = (extras.coffee ? 3 * hours : 0) + (extras.parking ? 4 : 0) + (extras.screen && (spaceId === "meeting" || spaceId === "office") ? 0 : 0);
  const fee = Math.round((subtotal + extrasCost) * 0.06);
  const total = subtotal + extrasCost + fee;

  const startHour = HOURS[startIdx];
  const endHour = HOURS[Math.min(startIdx + hours, HOURS.length - 1)] || "20:00";

  // Reset venue if city changes
  React.useEffect(() => { setVenueIdx(0); }, [city]);
  React.useEffect(() => { setConfirmed(false); }, [city, spaceId, venueIdx, startIdx, hours, people, extras]);

  return (
    <section id="demo" style={{ background: "var(--bg-2)", paddingBottom: 110 }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow tag-dot" style={{ marginBottom: 18 }}>Live booking</div>
            <h2 className="section-title">
              Try the bot, <em>right here.</em>
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: "40ch" }}>
            Play with the real booking surface. Every change updates the price calculator and the Telegram preview in real time. No card required.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24, alignItems: "stretch" }}>

          {/* LEFT — Booking surface */}
          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 26, minWidth: 0 }}>
            {/* Step 1 city */}
            <Field label="01  Where">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CITIES.map((c) => (
                  <Chip key={c} on={c === city} onClick={() => setCity(c)}>
                    <Pin size={12} /> {c}
                  </Chip>
                ))}
              </div>
            </Field>

            {/* Step 2 space type */}
            <Field label="02  What">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {SPACE_OPTIONS.map((s) => {
                  const on = s.id === spaceId;
                  return (
                    <button key={s.id} onClick={() => setSpaceId(s.id)} style={{
                      padding: "14px 12px", borderRadius: 14,
                      border: on ? "1.5px solid var(--ink)" : "1px solid var(--line)",
                      background: on ? "var(--ink)" : "var(--bg)",
                      color: on ? "var(--bg)" : "var(--ink)",
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                      textAlign: "left",
                      transition: "all .2s",
                    }}>
                      <span style={{ color: "currentColor" }}>{s.pict(28)}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{s.name}</span>
                      <span className="ui-mono-num" style={{ fontSize: 12, color: on ? "var(--accent)" : "var(--ink-3)", whiteSpace: "nowrap" }}>from €{s.price}/hr</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Step 3 venue */}
            <Field label="03  Which" hint={`${VENUES[city].length} venues open in ${city}`}>
              <div style={{ display: "grid", gap: 6 }}>
                {VENUES[city].map((v, i) => {
                  const on = i === venueIdx;
                  return (
                    <button key={v[0]} onClick={() => setVenueIdx(i)} style={{
                      padding: "12px 14px", borderRadius: 12,
                      border: on ? "1.5px solid var(--ink)" : "1px solid var(--line)",
                      background: on ? "var(--ink)" : "var(--card)",
                      color: on ? "var(--bg)" : "var(--ink)",
                      display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                      transition: "all .2s",
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: on ? "var(--accent)" : "var(--ink-3)" }} />
                      <strong style={{ fontFamily: "var(--display)", fontSize: 16, letterSpacing: "-0.01em", flex: 1 }}>{v[0]}</strong>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>{v[1]}</span>
                      {i === 0 && <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 4, fontWeight: 600 }}>hot</span>}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Step 4 time */}
            <Field label="04  When" hint={`Today · ${startHour} → ${endHour}`}>
              {/* Hour pills */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
                {HOURS.map((h, i) => {
                  const inRange = i >= startIdx && i < startIdx + hours;
                  const isStart = i === startIdx;
                  return (
                    <button key={h} onClick={() => setStartIdx(i)} style={{
                      flex: "0 0 auto",
                      padding: "10px 14px", borderRadius: 10,
                      background: isStart ? "var(--ink)" : inRange ? "var(--accent)" : "var(--bg)",
                      color: isStart ? "var(--bg)" : inRange ? "var(--accent-ink)" : "var(--ink)",
                      border: "1px solid " + (isStart || inRange ? "transparent" : "var(--line)"),
                      fontSize: 13, fontWeight: 500,
                      fontFamily: "var(--display)",
                      transition: "all .2s",
                    }}>
                      {h}
                    </button>
                  );
                })}
              </div>

              {/* Duration */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Duration</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 6, 8].map((d) => (
                    <Chip key={d} on={d === hours} onClick={() => setHours(d)} small>
                      {d}h
                    </Chip>
                  ))}
                </div>
              </div>
            </Field>

            {/* Step 5 people + extras */}
            <Field label="05  Extras">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg)" }}>
                  <span style={{ fontSize: 13, color: "var(--ink-2)", padding: "0 8px" }}>People</span>
                  <button onClick={() => setPeople(Math.max(1, people - 1))} style={iconBtn}>−</button>
                  <span className="ui-mono-num" style={{ fontSize: 14, fontWeight: 600, minWidth: 18, textAlign: "center" }}>{people}</span>
                  <button onClick={() => setPeople(people + 1)} style={iconBtn}>+</button>
                </div>

                <Chip on={extras.coffee} onClick={() => setExtras((x) => ({ ...x, coffee: !x.coffee }))}>
                  Coffee €3/hr
                </Chip>
                <Chip on={extras.parking} onClick={() => setExtras((x) => ({ ...x, parking: !x.parking }))}>
                  Parking €4
                </Chip>
                {(spaceId === "meeting" || spaceId === "office") && (
                  <Chip on={extras.screen} onClick={() => setExtras((x) => ({ ...x, screen: !x.screen }))}>
                    4K screen ·  free
                  </Chip>
                )}
              </div>
            </Field>
          </div>

          {/* RIGHT — Receipt panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Price calculator */}
            <div className="card" style={{ padding: 26, background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div className="eyebrow" style={{ color: "var(--accent)" }}>Receipt</div>
                  <div className="display" style={{ fontSize: 22, marginTop: 4 }}>{venue[0]}</div>
                  <div style={{ fontSize: 13, color: "#ffffffb3", marginTop: 2 }}>{venue[1]}, {city}</div>
                </div>
                <span style={{ color: "var(--bg)", opacity: 0.9 }}>{space.pict(40)}</span>
              </div>

              <Row label={`${space.name} · ${hours}h × €${space.price}`} value={`€${subtotal}`} />
              {extras.coffee && <Row label={`Coffee · ${hours}h × €3`} value={`€${3 * hours}`} />}
              {extras.parking && <Row label="Parking" value="€4" />}
              <Row label="Service fee" value={`€${fee}`} muted />

              <div style={{ height: 1, background: "#ffffff20", margin: "16px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, color: "#ffffffb3" }}>Total · {hours}h</span>
                <span className="ui-mono-num" style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--accent)" }}>
                  €{total}
                </span>
              </div>

              <button
                onClick={() => setConfirmed(true)}
                className="btn"
                style={{
                  marginTop: 18, width: "100%", justifyContent: "center",
                  background: confirmed ? "var(--ok)" : "var(--accent)",
                  color: "var(--accent-ink)",
                  padding: "16px 22px", fontSize: 16, fontWeight: 600,
                }}>
                {confirmed ? <><CheckDot color="var(--ink)" /> Booked!</> : <><PictTelegram size={16} /> Confirm via Telegram <Arrow /></>}
              </button>

              <div style={{ marginTop: 14, fontSize: 11.5, color: "#ffffff80", textAlign: "center" }}>
                Free cancellation up to 1 hour before · No card needed today
              </div>
            </div>

            {/* Mini Telegram bubble preview */}
            <div className="card" style={{ padding: 18, background: "var(--card)" }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>What you'll see in chat</div>
              {confirmed ? (
                <div style={{
                  padding: "12px 14px", borderRadius: "16px 16px 16px 4px",
                  background: "var(--accent)", color: "var(--accent-ink)",
                  fontSize: 13.5, lineHeight: 1.4, fontWeight: 500,
                  animation: "float-in .4s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <CheckDot color="var(--ink)" size={16} /> <strong>Booking confirmed</strong>
                  </div>
                  {venue[0]} · {startHour}–{endHour} · €{total} paid
                  <div style={{ marginTop: 4 }}>
                    Door code <span className="ui-mono-num" style={{ background: "var(--ink)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4 }}>{1000 + (subtotal * 7) % 9000}</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px 14px", borderRadius: "16px 16px 16px 4px",
                  background: "var(--bg-2)", color: "var(--ink)",
                  fontSize: 13.5, lineHeight: 1.4, border: "1px solid var(--line)",
                }}>
                  Holding <strong>{venue[0]}</strong> for you · {startHour} → {endHour}
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>Confirm within 5 minutes</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* --- helpers (scoped names to avoid global clashes) --- */
const iconBtn = {
  width: 26, height: 26, borderRadius: 8,
  background: "var(--bg-3)", color: "var(--ink)",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 16, fontWeight: 500,
};

const Field = ({ label, hint, children }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 12 }}>
      <div className="ui-mono-num" style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hint}</div>
    </div>
    {children}
  </div>
);

const Chip = ({ on, onClick, children, small }) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "6px 12px" : "8px 14px",
    borderRadius: 999,
    border: on ? "1.5px solid var(--ink)" : "1px solid var(--line)",
    background: on ? "var(--ink)" : "var(--bg)",
    color: on ? "var(--bg)" : "var(--ink)",
    fontSize: small ? 12.5 : 13,
    fontWeight: 500,
    transition: "all .2s",
  }}>
    {children}
  </button>
);

const Row = ({ label, value, muted }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14, color: muted ? "#ffffffb3" : "var(--bg)", gap: 12 }}>
    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    <span className="ui-mono-num" style={{ whiteSpace: "nowrap" }}>{value}</span>
  </div>
);

Object.assign(window, { BookingDemo });
