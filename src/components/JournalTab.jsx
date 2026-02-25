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
  if (log.artwork && !err) {
    return (
      <img src={log.artwork} alt={log.title} onError={() => setErr(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%",
      background: `linear-gradient(145deg,${color1},${color2})`,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
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

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const CalendarView = ({ logs, darkMode, theme, onLogTap }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const pressTimer = React.useRef(null);
  const didLongPress = React.useRef(false);

  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      if (!log.logged_at) return;
      const d = new Date(log.logged_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return map;
  }, [logs]);

  const { weeks } = useMemo(() => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const startDow = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { weeks };
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); setSelectedDay(null); };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const selectedKey = selectedDay ? `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}` : null;
  const selectedLogs = selectedKey ? (logsByDate[selectedKey] || []) : [];

  // Adaptive colours
  const navBtnStyle = {
    width: 32, height: 32, borderRadius: "50%",
    border: `1px solid ${theme.border2}`,
    background: "none", color: theme.text,
    fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 12px", gap: 12 }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: theme.text, lineHeight: 1 }}>
            {new Date(year, month, 1).toLocaleString("default", { month: "long" })}
          </div>
          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 8, letterSpacing: "0.15em",
            color: theme.subtext, marginTop: 3 }}>{year}</div>
        </div>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, padding: "0 4px", marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontFamily: "'Unbounded',sans-serif", fontSize: 7,
            letterSpacing: "0.1em", color: theme.subtext, padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ padding: "0 4px" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} style={{ aspectRatio: "1" }}/>;
              const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayLogs  = logsByDate[dateKey] || [];
              const isToday  = dateKey === todayKey;
              const isSelected = selectedDay === day;
              const hasLogs  = dayLogs.length > 0;
              const topLog   = dayLogs[0];

              return (
                <div key={di}
                  onClick={() => { if (!didLongPress.current) setSelectedDay(isSelected ? null : day); }}
                  onTouchStart={() => {
                    didLongPress.current = false;
                    if (!hasLogs || !topLog?.artwork) return;
                    pressTimer.current = setTimeout(() => { didLongPress.current = true; setLightboxImg(topLog.artwork); }, 450);
                  }}
                  onTouchEnd={() => clearTimeout(pressTimer.current)}
                  onTouchMove={() => clearTimeout(pressTimer.current)}
                  onMouseDown={() => {
                    didLongPress.current = false;
                    if (!hasLogs || !topLog?.artwork) return;
                    pressTimer.current = setTimeout(() => { didLongPress.current = true; setLightboxImg(topLog.artwork); }, 450);
                  }}
                  onMouseUp={() => clearTimeout(pressTimer.current)}
                  onMouseLeave={() => clearTimeout(pressTimer.current)}
                  style={{
                    position: "relative", aspectRatio: "1", borderRadius: 5,
                    overflow: "hidden", cursor: hasLogs ? "pointer" : "default",
                    WebkitUserSelect: "none", userSelect: "none",
                    border: isSelected
                      ? `2px solid ${theme.text}`
                      : isToday
                        ? `1px solid ${theme.border2}`
                        : `1px solid ${theme.border}`,
                    background: hasLogs ? "transparent" : (darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                    boxSizing: "border-box", transition: "border-color 0.15s",
                  }}>

                  {/* Artwork fill */}
                  {hasLogs && topLog && (
                    <div style={{ position: "absolute", inset: 0 }}>
                      <CalArt log={topLog}/>
                      <div style={{ position: "absolute", inset: 0,
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)" }}/>
                    </div>
                  )}

                  {/* Day number — always white when artwork present (dark overlay ensures legibility), else use theme */}
                  <div style={{
                    position: "absolute", top: 3, left: 0, right: 0, textAlign: "center",
                    fontFamily: "'Unbounded',sans-serif", fontSize: 8, fontWeight: 700,
                    color: hasLogs ? "rgba(255,255,255,0.95)" : theme.subtext,
                    letterSpacing: "0.05em", zIndex: 2,
                  }}>
                    {day}
                  </div>

                  {/* Multi-entry badge */}
                  {dayLogs.length > 1 && (
                    <div style={{
                      position: "absolute", bottom: 3, right: 3,
                      background: "rgba(0,0,0,0.75)", borderRadius: "50%",
                      width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Unbounded',sans-serif", fontSize: 7,
                      color: "rgba(255,255,255,0.9)", zIndex: 3,
                      border: "1px solid rgba(255,255,255,0.25)",
                    }}>
                      {dayLogs.length}
                    </div>
                  )}

                  {/* Verdict colour strip */}
                  {hasLogs && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
                      background: VERDICT_COLOR(topLog.verdict), zIndex: 3, opacity: 0.9 }}/>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div style={{
          margin: "12px 10px 0",
          background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${theme.border}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 17, color: theme.text }}>
              {new Date(year, month, selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 7, color: theme.subtext,
              letterSpacing: "0.12em", marginTop: 3 }}>
              {selectedLogs.length === 0 ? "NOTHING LOGGED" : `${selectedLogs.length} ENTR${selectedLogs.length === 1 ? "Y" : "IES"}`}
            </div>
          </div>

          {selectedLogs.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center", color: theme.subtext,
              fontFamily: "'DM Serif Display',serif", fontStyle: "italic", fontSize: 14 }}>
              Nothing logged on this day
            </div>
          ) : (
            <div style={{ padding: "0 14px" }}>
              {selectedLogs.map(log => {
                const vc = VERDICT_COLOR(log.verdict);
                const ss = getSubtypeStyle(log.media_type);
                return (
                  <div key={log.id} onClick={() => onLogTap(log)}
                    style={{ display: "flex", gap: 10, padding: "12px 0",
                      borderBottom: `1px solid ${theme.border}`, cursor: "pointer" }}>
                    <div style={{ width: 3, borderRadius: 2, background: vc, flexShrink: 0, alignSelf: "stretch" }}/>
                    <MiniArt log={log} size={36}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 6, color: theme.subtext,
                        letterSpacing: "0.12em", marginBottom: 3 }}>
                        {ss.icon} {log.media_type}
                      </div>
                      <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 14, color: theme.text,
                        lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.title}
                      </div>
                      <div style={{ color: vc, fontFamily: "'Unbounded',sans-serif", fontSize: 7,
                        fontWeight: 700, letterSpacing: "0.06em" }}>
                        {VERDICT_LABEL(log.verdict)}
                      </div>
                      {log.notes && (
                        <div style={{ fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
                          fontSize: 11, color: theme.subtext, lineHeight: 1.5, marginTop: 5,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          "{log.notes.split(/\s+/).slice(0,14).join(" ")}{log.notes.split(/\s+/).length > 14 ? "…" : ""}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{
            position:"fixed", inset:0, zIndex:600,
            background:"rgba(0,0,0,0.92)",
            backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            animation:"lbIn 0.18s ease",
          }}>
          <style>{`@keyframes lbIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
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
