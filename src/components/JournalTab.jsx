import React, { useState, useMemo } from "react";
import { getSubtypeStyle, generateCoverGradient } from "../utils/helpers.js";

if (!document.getElementById("journal-fonts")) {
  const l = document.createElement("link");
  l.id = "journal-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Unbounded:wght@300;400;700&display=swap";
  document.head.appendChild(l);
}

const VERDICT_COLOR = v => ({
  "I loved it":        "#f1c40f",
  "I liked it":        "#4caf50",
  "Meh":               "#ff9800",
  "I didn't like it":  "#e74c3c",
  "Want to go":        "#9b59b6",
  "Currently reading": "#4fc3f7",
  "Currently watching":"#4fc3f7",
  "Currently listening":"#4fc3f7",
}[v] || "#888");

const VERDICT_LABEL = v => ({
  "I loved it":       "★ Loved",
  "I liked it":       "● Liked",
  "Meh":              "~ Meh",
  "I didn't like it": "✕ Didn't like",
}[v] || v || "–");

// ─── MINI ARTWORK ─────────────────────────────────────────────────────────────
const MiniArt = ({ log, size = 44 }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  if (log.artwork && !err) {
    return (
      <img src={log.artwork} alt="" onError={() => setErr(true)}
        style={{ width: size, height: size * 1.4, objectFit: "cover", borderRadius: 5, flexShrink: 0, display: "block" }}/>
    );
  }
  return (
    <div style={{ width: size, height: size * 1.4, borderRadius: 5, flexShrink: 0,
      background: `linear-gradient(145deg,${color1},${color2})`,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4 }}>
      {ss.icon}
    </div>
  );
};

// ─── CALENDAR ART TILE ────────────────────────────────────────────────────────
const CalArt = ({ log }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const noSel = { WebkitUserSelect:"none", userSelect:"none",
    WebkitTouchCallout:"none", pointerEvents:"none" };
  if (log.artwork && !err) {
    return (
      <img src={log.artwork} alt={log.title} onError={() => setErr(true)}
        onContextMenu={e => e.preventDefault()} draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...noSel }}/>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%",
      background: `linear-gradient(145deg,${color1},${color2})`,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, ...noSel }}>
      {ss.icon}
    </div>
  );
};

// ─── TIMELINE ENTRY ───────────────────────────────────────────────────────────
const TimelineEntry = ({ log, darkMode, theme, onTap }) => {
  const ss = getSubtypeStyle(log.media_type);
  const vc = VERDICT_COLOR(log.verdict);
  const notesPreview = log.notes
    ? log.notes.split(/\s+/).slice(0, 18).join(" ") + (log.notes.split(/\s+/).length > 18 ? "…" : "")
    : null;

  return (
    <div onClick={() => onTap(log)}
      style={{ display: "flex", gap: 12, padding: "14px 0", cursor: "pointer",
        borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ width: 3, borderRadius: 3, background: vc, flexShrink: 0, minHeight: 52, alignSelf: "stretch" }}/>
      <MiniArt log={log} size={42}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.15em",
          color: theme.subtext, textTransform: "uppercase", marginBottom: 4 }}>
          {ss.icon} {log.media_type}
        </div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16, color: theme.text,
          lineHeight: 1.15, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {log.title}
        </div>
        {log.creator && (
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.1em",
            color: theme.subtext, marginBottom: 5 }}>
            {log.creator}
          </div>
        )}
        {log.verdict && (
          <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 2,
            fontFamily: "'Unbounded',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: "0.08em",
            color: vc, border: `1px solid ${vc}44`, background: `${vc}12` }}>
            {VERDICT_LABEL(log.verdict)}
          </div>
        )}
        {notesPreview && (
          <div style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
            fontSize: 12, color: theme.subtext, lineHeight: 1.6, marginTop: 7,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            "{notesPreview}"
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MONTH SECTION ────────────────────────────────────────────────────────────
const MonthSection = ({ label, logs, darkMode, theme, onTap }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ padding: "18px 16px 8px", display: "flex", alignItems: "baseline", gap: 8 }}>
      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: theme.text }}>
        {label.split(" ")[0]}
      </div>
      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 9, letterSpacing: "0.15em",
        color: theme.subtext, textTransform: "uppercase" }}>
        {label.split(" ")[1]}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 8, color: theme.subtext }}>
        {logs.length}
      </div>
    </div>
    <div style={{ padding: "0 16px" }}>
      {logs.map(log => (
        <TimelineEntry key={log.id} log={log} darkMode={darkMode} theme={theme} onTap={onTap}/>
      ))}
    </div>
  </div>
);

// ─── CALENDAR VIEW — Photo Mosaic ─────────────────────────────────────────────
const DAY_LETTERS = ["M","T","W","T","F","S","S"];

const CalendarView = ({ logs, darkMode, theme, onLogTap }) => {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [lightboxImg, setLightboxImg] = useState(null);
  const pressTimer   = React.useRef(null);
  const didLongPress = React.useRef(false);

  // Build date → logs map
  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      if (!log.logged_at) return;
      const d   = new Date(log.logged_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return map;
  }, [logs]);

  // Build week grid
  const weeks = useMemo(() => {
    const first    = new Date(year, month, 1);
    const last     = new Date(year, month + 1, 0);
    const startDow = (first.getDay() + 6) % 7;
    const cells    = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const wks = [];
    for (let i = 0; i < cells.length; i += 7) wks.push(cells.slice(i, i + 7));
    return wks;
  }, [year, month]);

  // All entries this month sorted by day for the scroll strip
  const monthEntries = useMemo(() => {
    return Object.entries(logsByDate)
      .filter(([key]) => {
        const [y, m] = key.split("-").map(Number);
        return y === year && m === month + 1;
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, ls]) => ls.map(l => ({ ...l, _dateKey: key })));
  }, [logsByDate, year, month]);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const monthName  = new Date(year, month, 1).toLocaleString("default", { month: "long" });
  const totalCount = monthEntries.length;
  const lovedCount = monthEntries.filter(l => l.verdict === "I loved it").length;

  const noSel = {
    WebkitUserSelect:"none", userSelect:"none",
    WebkitTouchCallout:"none", WebkitTapHighlightColor:"transparent",
    touchAction:"manipulation",
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{`
        @keyframes lbIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes tileIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:"14px 16px 10px", display:"flex",
        justifyContent:"space-between", alignItems:"flex-start",
        borderBottom:`1px solid ${theme.border}` }}>
        <div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26,
            color:theme.text, lineHeight:1 }}>{monthName}</div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7,
            letterSpacing:"0.15em", color:theme.subtext, marginTop:4 }}>
            {year} · {totalCount} LOGGED{lovedCount > 0 ? ` · ${lovedCount} ★` : ""}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={prevMonth}
            style={{ background:"none", border:`1px solid ${theme.border2}`, borderRadius:8,
              width:34, height:34, color:theme.subtext, fontSize:18, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <button onClick={nextMonth}
            style={{ background:"none", border:`1px solid ${theme.border2}`, borderRadius:8,
              width:34, height:34, color:theme.subtext, fontSize:18, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
        </div>
      </div>

      {/* Verdict colour bar */}
      {monthEntries.length > 0 && (
        <div style={{ display:"flex", height:3, overflow:"hidden" }}>
          {monthEntries.map((l, i) => (
            <div key={i} style={{ flex:1, background:VERDICT_COLOR(l.verdict) }}/>
          ))}
        </div>
      )}

      {/* ── DAY LABELS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)",
        padding:"8px 10px 4px" }}>
        {DAY_LETTERS.map((d, i) => (
          <div key={i} style={{ textAlign:"center", fontFamily:"'Unbounded',sans-serif",
            fontSize:6.5, letterSpacing:"0.1em", color:theme.subtext }}>{d}</div>
        ))}
      </div>

      {/* ── PHOTO MOSAIC GRID ── */}
      <div style={{ padding:"0 10px 16px" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)",
            gap:3, marginBottom:3 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ aspectRatio:"1" }}/>;

              const dateKey  = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayLogs  = logsByDate[dateKey] || [];
              const hasLogs  = dayLogs.length > 0;
              const topLog   = dayLogs[0];
              const isToday  = dateKey === todayKey;

              if (!hasLogs) {
                return (
                  <div key={di} style={{ aspectRatio:"1", borderRadius:6,
                    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
                    border: isToday
                      ? `1px solid ${theme.border2}`
                      : `1px solid ${theme.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, fontWeight:700,
                      color: isToday ? theme.subtext2 : theme.subtext, opacity: isToday ? 1 : 0.5 }}>
                      {day}
                    </div>
                  </div>
                );
              }

              return (
                <div key={di}
                  onClick={() => { if (!didLongPress.current) onLogTap(topLog); }}
                  onTouchStart={() => {
                    didLongPress.current = false;
                    if (!topLog?.artwork) return;
                    pressTimer.current = setTimeout(() => {
                      didLongPress.current = true;
                      setLightboxImg(topLog.artwork);
                    }, 450);
                  }}
                  onTouchEnd={() => clearTimeout(pressTimer.current)}
                  onTouchMove={() => clearTimeout(pressTimer.current)}
                  onMouseDown={() => {
                    didLongPress.current = false;
                    if (!topLog?.artwork) return;
                    pressTimer.current = setTimeout(() => {
                      didLongPress.current = true;
                      setLightboxImg(topLog.artwork);
                    }, 450);
                  }}
                  onMouseUp={() => clearTimeout(pressTimer.current)}
                  onMouseLeave={() => clearTimeout(pressTimer.current)}
                  style={{ aspectRatio:"1", borderRadius:6, overflow:"hidden",
                    position:"relative", cursor:"pointer",
                    border:`1px solid ${VERDICT_COLOR(topLog.verdict)}33`,
                    animation:`tileIn 0.35s cubic-bezier(0.16,1,0.3,1) ${(wi*7+di)*0.015}s both`,
                    ...noSel }}>

                  {/* Full-bleed artwork */}
                  <div style={{ position:"absolute", inset:0 }}>
                    <CalArt log={topLog}/>
                  </div>

                  {/* Gradient for text legibility */}
                  <div style={{ position:"absolute", inset:0,
                    background:"linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.75) 100%)",
                    pointerEvents:"none" }}/>

                  {/* Verdict colour strip — top */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                    background:VERDICT_COLOR(topLog.verdict), zIndex:3, pointerEvents:"none" }}/>

                  {/* Day number — top centre */}
                  <div style={{ position:"absolute", top:3, left:0, right:0,
                    textAlign:"center", fontFamily:"'Unbounded',sans-serif",
                    fontSize:7.5, fontWeight:700, color:"rgba(255,255,255,0.9)",
                    zIndex:3, pointerEvents:"none", letterSpacing:"0.04em" }}>
                    {day}
                  </div>

                  {/* Title — bottom */}
                  <div style={{ position:"absolute", bottom:3, left:3, right:3,
                    fontFamily:"'DM Serif Display',serif", fontSize:8.5, lineHeight:1.15,
                    color:"rgba(255,255,255,0.9)", zIndex:3, pointerEvents:"none",
                    overflow:"hidden", display:"-webkit-box",
                    WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                    {topLog.title}
                  </div>

                  {/* Verdict dot — top right */}
                  <div style={{ position:"absolute", top:4, right:4,
                    width:6, height:6, borderRadius:"50%",
                    background:VERDICT_COLOR(topLog.verdict),
                    boxShadow:`0 0 5px ${VERDICT_COLOR(topLog.verdict)}`,
                    zIndex:3, pointerEvents:"none" }}/>

                  {/* Multi-entry badge */}
                  {dayLogs.length > 1 && (
                    <div style={{ position:"absolute", bottom:3, right:3,
                      background:"rgba(0,0,0,0.75)", borderRadius:10,
                      padding:"1px 4px", zIndex:4, pointerEvents:"none",
                      border:"1px solid rgba(255,255,255,0.2)",
                      fontFamily:"'Unbounded',sans-serif", fontSize:5.5,
                      color:"rgba(255,255,255,0.85)" }}>
                      +{dayLogs.length - 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── SCROLLABLE MONTH STRIP ── */}
      {monthEntries.length > 0 && (
        <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:14 }}>
          <div style={{ padding:"0 16px 10px", display:"flex",
            justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7,
              letterSpacing:"0.18em", color:theme.subtext }}>
              ALL ENTRIES
            </div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7,
              color:theme.subtext }}>{totalCount}</div>
          </div>

          <div style={{ display:"flex", gap:8, overflowX:"auto",
            padding:"0 16px 16px", scrollSnapType:"x mandatory",
            WebkitOverflowScrolling:"touch" }}>
            {monthEntries.map((log, i) => {
              const ss  = getSubtypeStyle(log.media_type);
              const vc  = VERDICT_COLOR(log.verdict);
              const d   = new Date(log.logged_at);
              const day = d.getDate();
              const { color1, color2 } = generateCoverGradient(log.title || "");

              return (
                <div key={log.id || i}
                  onClick={() => onLogTap(log)}
                  style={{ flexShrink:0, width:110, height:150, borderRadius:10,
                    position:"relative", cursor:"pointer", overflow:"hidden",
                    scrollSnapAlign:"start",
                    background:`linear-gradient(145deg,${color1},${color2})`,
                    border:`1px solid ${vc}22`,
                    boxShadow:"0 4px 14px rgba(0,0,0,0.35)",
                    transition:"transform 0.2s cubic-bezier(0.16,1,0.3,1)",
                    ...noSel }}
                  onMouseEnter={e => e.currentTarget.style.transform="scale(1.04)"}
                  onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>

                  {/* Artwork */}
                  {log.artwork && (
                    <img src={log.artwork} alt="" draggable={false}
                      onContextMenu={e => e.preventDefault()}
                      style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                        objectFit:"cover", pointerEvents:"none" }}/>
                  )}

                  {/* Gradient */}
                  <div style={{ position:"absolute", inset:0,
                    background:"linear-gradient(to bottom,rgba(0,0,0,0) 30%,rgba(0,0,0,0.88) 100%)",
                    pointerEvents:"none" }}/>

                  {/* Verdict top stripe */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                    background:vc, pointerEvents:"none" }}/>

                  {/* Date badge */}
                  <div style={{ position:"absolute", top:8, left:8,
                    background:"rgba(0,0,0,0.6)", borderRadius:5, padding:"2px 6px",
                    fontFamily:"'Unbounded',sans-serif", fontSize:6, fontWeight:700,
                    color:"rgba(255,255,255,0.8)",
                    border:"1px solid rgba(255,255,255,0.12)", pointerEvents:"none" }}>
                    {day} {monthName.slice(0,3).toUpperCase()}
                  </div>

                  {/* Bottom content */}
                  <div style={{ position:"absolute", bottom:0, left:0, right:0,
                    padding:"0 8px 9px", pointerEvents:"none" }}>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:5.5,
                      letterSpacing:"0.1em", color:"rgba(255,255,255,0.35)", marginBottom:3 }}>
                      {ss.icon} {log.media_type}
                    </div>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:12,
                      lineHeight:1.2, color:"#fff",
                      overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      {log.title}
                    </div>
                    <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%",
                        background:vc, boxShadow:`0 0 4px ${vc}` }}/>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:5.5,
                        color:vc, letterSpacing:"0.06em" }}>
                        {VERDICT_LABEL(log.verdict)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position:"fixed", inset:0, zIndex:600,
            background:"rgba(0,0,0,0.92)",
            backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            animation:"lbIn 0.18s ease" }}>
          <img src={lightboxImg} alt=""
            style={{ maxWidth:"95vw", maxHeight:"90vh", objectFit:"contain",
              borderRadius:8, boxShadow:"0 20px 80px rgba(0,0,0,0.8)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", top:20, right:20, width:36, height:36, borderRadius:"50%",
            background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer" }}>✕</div>
        </div>
      )}
    </div>
  );
};

// ─── DETAIL SHEET ─────────────────────────────────────────────────────────────
const DetailSheet = ({ log, darkMode, theme, onClose, onEdit, onDelete }) => {
  const ss = getSubtypeStyle(log.media_type);
  const vc = VERDICT_COLOR(log.verdict);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const [imgErr, setImgErr] = useState(false);

  const sheetBg = darkMode ? "#080808" : "#ffffff";
  const borderCol = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}>
      <style>{`@keyframes journalSheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}/>
      <div onClick={e => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxHeight: "88vh",
          background: sheetBg, borderRadius: "20px 20px 0 0",
          border: `1px solid ${borderCol}`, borderBottom: "none",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "journalSheetUp 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}>

        {/* Hero — always has dark overlay so white text works on top */}
        <div style={{ height: 180, position: "relative", flexShrink: 0, overflow: "hidden" }}>
          {log.artwork && !imgErr
            ? <img src={log.artwork} alt="" onError={() => setImgErr(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.45) saturate(0.7)" }}/>
            : <div style={{ width: "100%", height: "100%",
                background: `linear-gradient(145deg,${color1},${color2})`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 60, opacity: 0.25 }}>{ss.icon}</span>
              </div>
          }
          <div style={{ position: "absolute", inset: 0,
            background: `linear-gradient(to bottom,rgba(0,0,0,0) 20%,${sheetBg} 100%)` }}/>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: vc }}/>

          <button onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30,
              borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 14px" }}>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
              {ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}
            </div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: "#fff", lineHeight: 1.05 }}>
              {log.title}
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap",
          borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ padding: "3px 10px", borderRadius: 3,
            border: `1px solid ${vc}44`, background: `${vc}12`,
            fontFamily: "'Unbounded',sans-serif", fontSize: 7, fontWeight: 700,
            letterSpacing: "0.08em", color: vc }}>
            {VERDICT_LABEL(log.verdict)}
          </div>
          {log.genre && (
            <div style={{ padding: "3px 10px", borderRadius: 3, border: `1px solid ${theme.border2}`,
              fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.08em", color: theme.subtext }}>
              {log.genre}
            </div>
          )}
          {log.year_released && (
            <div style={{ padding: "3px 10px", borderRadius: 3, border: `1px solid ${theme.border}`,
              fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.08em", color: theme.subtext }}>
              {log.year_released}
            </div>
          )}
          {log.logged_at && (
            <div style={{ padding: "3px 10px", borderRadius: 3, border: `1px solid ${theme.border}`,
              fontFamily: "'Unbounded',sans-serif", fontSize: 7, letterSpacing: "0.08em", color: theme.subtext }}>
              {new Date(log.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 0", WebkitOverflowScrolling: "touch" }}>
          {log.notes
            ? <div style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
                fontSize: 15, color: theme.text, lineHeight: 1.9,
                whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {log.notes}
              </div>
            : <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 8, letterSpacing: "0.15em",
                color: theme.subtext, textAlign: "center", paddingTop: 24, opacity: 0.5 }}>
                NO NOTES YET
              </div>
          }
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px 28px", borderTop: `1px solid ${theme.border}`,
          display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => { onEdit(log); onClose(); }}
            style={{ flex: 1, padding: 10, borderRadius: 8,
              border: `1px solid ${theme.border2}`, background: "none",
              color: theme.subtext, fontFamily: "'Unbounded',sans-serif",
              fontSize: 8, letterSpacing: "0.1em", cursor: "pointer" }}>
            ✏ EDIT
          </button>
          <button onClick={() => { if (window.confirm(`Delete "${log.title}"?`)) { onDelete(log.id); onClose(); } }}
            style={{ flex: 1, padding: 10, borderRadius: 8,
              border: "1px solid rgba(231,76,60,0.25)", background: "none",
              color: "#e74c3c", fontFamily: "'Unbounded',sans-serif",
              fontSize: 8, letterSpacing: "0.1em", cursor: "pointer", opacity: 0.7 }}>
            🗑 DELETE
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── JOURNAL TAB ─────────────────────────────────────────────────────────────
export const JournalTab = ({ logs, theme, darkMode, onEdit, onDelete }) => {
  const [view, setView] = useState("calendar");
  const [selectedLog, setSelectedLog] = useState(null);

  // Push history when detail sheet opens so Android back closes it
  React.useEffect(() => {
    if (selectedLog) {
      window.history.pushState({ dili: "journal-detail" }, "");
    }
  }, [selectedLog?.id]);

  React.useEffect(() => {
    const onPop = () => {
      if (selectedLog) {
        setSelectedLog(null);
        window.history.pushState({ dili: "sentinel" }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [selectedLog]);

  const byMonth = useMemo(() => {
    const map = {};
    const sorted = [...logs]
      .filter(l => l.logged_at)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    sorted.forEach(log => {
      const key = new Date(log.logged_at).toLocaleString("default", { month: "long", year: "numeric" });
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return Object.entries(map);
  }, [logs]);

  const pillBase = (active) => ({
    flex: 1, padding: "6px 0", borderRadius: 20, border: "none",
    fontWeight: 700, fontSize: 11, cursor: "pointer", transition: "all 0.18s",
    background: active ? (darkMode ? "#fff" : "#111") : "none",
    color: active ? (darkMode ? "#000" : "#fff") : theme.subtext,
  });

  return (
    <div style={{ height: "calc(100vh - 110px)", display: "flex", flexDirection: "column",
      background: theme.bg }}>
      <style>{`@keyframes journalIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", flexShrink: 0,
        borderBottom: `1px solid ${theme.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, color: theme.text, lineHeight: 1 }}>
            Journal
          </div>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 8, letterSpacing: "0.12em",
            color: theme.subtext, marginTop: 4, textTransform: "uppercase" }}>
            {logs.filter(l => l.logged_at).length} entries
          </div>
        </div>
        <div style={{ display: "flex", background: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          borderRadius: 22, padding: 3, gap: 2, width: 180 }}>
          <button style={pillBase(view === "calendar")} onClick={() => setView("calendar")}>
            📅 Calendar
          </button>
          <button style={pillBase(view === "timeline")} onClick={() => setView("timeline")}>
            📜 Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
        animation: "journalIn 0.25s ease" }}>
        {view === "calendar" && (
          <CalendarView logs={logs} darkMode={darkMode} theme={theme} onLogTap={log => setSelectedLog(log)}/>
        )}
        {view === "timeline" && (
          logs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", padding: "40px 20px", gap: 14 }}>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 48, opacity: 0.15 }}>📖</div>
              <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20,
                color: theme.subtext, textAlign: "center" }}>Nothing logged yet</div>
            </div>
          ) : (
            byMonth.map(([label, monthLogs]) => (
              <MonthSection key={label} label={label} logs={monthLogs}
                darkMode={darkMode} theme={theme} onTap={log => setSelectedLog(log)}/>
            ))
          )
        )}
      </div>

      {selectedLog && (
        <DetailSheet
          log={selectedLog} darkMode={darkMode} theme={theme}
          onClose={() => setSelectedLog(null)}
          onEdit={log => onEdit(log)}
          onDelete={id => { onDelete(id); setSelectedLog(null); }}
        />
      )}
    </div>
  );
};
