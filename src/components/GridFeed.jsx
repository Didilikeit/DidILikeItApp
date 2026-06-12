import React, { useState, useEffect } from "react";
import { getSubtypeStyle, generateCoverGradient, getCat } from "../utils/helpers.js";
import { VERDICT_PILL_STYLE } from "./EditorialCard.jsx";

// ─── FONTS ────────────────────────────────────────────────────────────────────
if (!document.getElementById("editorial-fonts")) {
  const link = document.createElement("link");
  link.id = "editorial-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Unbounded:wght@300;400;700;900&display=swap";
  document.head.appendChild(link);
}

// Aspect ratio per category: portraits for watched/read, square for music, landscape for experiences
const getAspectRatio = mediaType => {
  const cat = getCat(mediaType);
  if (cat === "Listened") return "1 / 1";
  if (cat === "Experienced") return "4 / 3";
  return "2 / 3"; // Movies, TV, Books — portrait posters
};

const VERDICT_BAND = v => ({
  "I loved it":         "linear-gradient(to bottom,#f1c40f,#e67e22)",
  "I liked it":         "linear-gradient(to bottom,#81c784,#4caf50)",
  "Meh":                "linear-gradient(to bottom,#ffb74d,#ff9800)",
  "I didn't like it":   "linear-gradient(to bottom,#e57373,#e74c3c)",
  "Want to go":         "linear-gradient(to bottom,#ce93d8,#9b59b6)",
  "Currently reading":  "linear-gradient(to bottom,#64b5f6,#1565c0)",
  "Currently watching": "linear-gradient(to bottom,#64b5f6,#1565c0)",
  "Currently listening":"linear-gradient(to bottom,#64b5f6,#1565c0)",
}[v] || "linear-gradient(to bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.04))");

const loggedOnLabel = (log) => {
  if (!log.logged_at) return null;
  const d = new Date(log.logged_at);
  const dateStr = d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const isQueue = log.verdict?.startsWith("Want to") || log.verdict === "Want to go" || log.verdict?.startsWith("Currently");
  if (isQueue) return `Added on ${dateStr}`;
  const cat = getSubtypeStyle(log.media_type)?.cat || "";
  const verb = cat==="Read" ? "Read on" : cat==="Watched" ? "Watched on"
    : cat==="Listened" ? "Listened on" : cat==="Experienced" ? "Went on" : "Logged";
  return `${verb} ${dateStr}`;
};

// ─── ARTWORK TILE ─────────────────────────────────────────────────────────────
const noSelect = {
  WebkitUserSelect: "none", userSelect: "none",
  WebkitTouchCallout: "none",
  pointerEvents: "none", // tile wrapper handles all touch events
};

const ArtworkTile = ({ log }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  if (log.artwork && !err) {
    return (
      <img src={log.artwork} alt="" onError={() => setErr(true)}
        onContextMenu={e => e.preventDefault()}
        draggable={false}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", ...noSelect }}/>
    );
  }
  return (
    <div style={{ position:"absolute", inset:0,
      background:`linear-gradient(145deg,${color1},${color2})`,
      display:"flex", alignItems:"center", justifyContent:"center", ...noSelect }}>
      <span style={{ fontSize:22, opacity:0.5 }}>{ss.icon}</span>
    </div>
  );
};

// ─── NOTES SIDE PANEL ─────────────────────────────────────────────────────────
// Slides in from the right, full-width, so the card behind doesn't distract.
const NotesSidePanel = ({ log, onClose, onNotesUpdate }) => {
  const [localNotes, setLocalNotes] = useState(log.notes || "");
  const [editing, setEditing] = useState(false);
  const handleSave = () => { onNotesUpdate?.(log.id, localNotes); setEditing(false); };
  useEffect(() => { setLocalNotes(log.notes || ""); }, [log.notes]);

  const btn = {
    flex: 1, padding: "8px 4px", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.1)", background: "none",
    color: "rgba(255,255,255,0.5)", fontFamily: "'Unbounded',sans-serif",
    fontSize: "7px", fontWeight: "700", letterSpacing: "0.1em",
    textTransform: "uppercase", cursor: "pointer", textAlign: "center",
  };

  return (
    <>
      <style>{`
        @keyframes gridNoteSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Full-width panel — covers the card completely */}
      <div onClick={e => e.stopPropagation()}
        style={{
          position: "absolute", inset: 0,
          background: "#080808",
          zIndex: 20, display: "flex", flexDirection: "column",
          animation: "gridNoteSlide 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
        }}>

        {/* Header */}
        <div style={{ padding: "14px 16px 10px", flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Back chevron */}
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)",
              fontSize: 20, cursor: "pointer", padding: "0 4px 0 0", lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
            ‹
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Unbounded',sans-serif", fontSize: "7px", fontWeight: "700",
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)", marginBottom: "5px",
            }}>
              MY NOTES
            </div>
            <div style={{
              fontFamily: "'DM Serif Display',serif", fontSize: "17px", color: "#fff",
              lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {log.title}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", flexShrink: 0 }}/>

        {/* Body */}
        {editing ? (
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            autoFocus
            style={{
              flex: 1, width: "100%", background: "none", border: "none",
              padding: "16px", fontFamily: "'DM Serif Display',serif",
              fontStyle: "italic", fontSize: "15px",
              color: "rgba(255,255,255,0.9)", lineHeight: "1.9",
              resize: "none", outline: "none", boxSizing: "border-box",
            }}
          />
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
            <div style={{
              fontFamily: "'DM Serif Display',serif", fontStyle: "italic",
              fontSize: "15px", color: "rgba(255,255,255,0.85)", lineHeight: "1.9",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {log.notes
                ? log.notes
                : <span style={{
                    color: "rgba(255,255,255,0.2)", fontFamily: "'Unbounded',sans-serif",
                    fontSize: "8px", letterSpacing: "0.12em",
                  }}>NO NOTES YET: TAP EDIT TO ADD</span>
              }
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "10px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          {editing ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSave}
                style={{ ...btn, background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", flex: 2 }}>
                SAVE
              </button>
              <button onClick={() => { setLocalNotes(log.notes || ""); setEditing(false); }} style={btn}>
                CANCEL
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={onClose} style={btn}>← BACK</button>
              <button onClick={() => setEditing(true)} style={{ ...btn, flex: 2 }}>✏ EDIT NOTES</button>
              <button onClick={() => navigator.clipboard?.writeText(log.notes || "")} style={btn}>📋</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── EXPAND PANEL (bottom sheet) ──────────────────────────────────────────────
const ExpandPanel = ({ log, darkMode, onClose, onEdit, onDelete, onNotesUpdate, onRevisit, openNotesImmediately }) => {
  const vp = VERDICT_PILL_STYLE(log.verdict);
  const isFinished = ["I loved it","I liked it","Meh","I didn't like it"].includes(log.verdict);
  const hasTimeline = Array.isArray(log.revisits) && log.revisits.length > 1;
  const ss = getSubtypeStyle(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const [imgErr, setImgErr] = useState(false);
  // null = showing card sheet, "side" = notes panel slid over
  const [notesState, setNotesState] = useState(openNotesImmediately ? "side" : null);

  useEffect(() => {
    if (openNotesImmediately) setNotesState("side");
  }, [openNotesImmediately]);

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"flex-end" }}
      onClick={notesState ? undefined : onClose}
    >
      <style>{`
        @keyframes gridPanelUp  { from { transform:translateY(100%); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes gridScrimIn  { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* Scrim */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        animation: "gridScrimIn 0.25s ease",
      }}/>

      {/* Bottom sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxHeight: "92vh",
          background: "#080808", borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
          overflow: "hidden", display: "flex", flexDirection: "column",
          animation: "gridPanelUp 0.32s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Notes side panel — absolutely positioned over the sheet */}
        {notesState === "side" && (
          <NotesSidePanel
            log={log}
            onClose={() => setNotesState(null)}
            onNotesUpdate={onNotesUpdate}
          />
        )}

        {/* ── Hero strip ── */}
        {(() => {
          // For square artwork (albums), constrain width so it doesn't look stretched
          const heroCat = getCat(log.media_type);
          const isSquareArt = heroCat === "Listened";
          return (
        <div style={{ height:200, position:"relative", flexShrink:0, overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center", background:"#080808" }}>
          {log.artwork && !imgErr
            ? <img src={log.artwork} alt="" onError={() => setImgErr(true)}
                style={{
                  width: isSquareArt ? "auto" : "100%",
                  height: isSquareArt ? "100%" : "100%",
                  maxWidth: "100%",
                  objectFit: isSquareArt ? "contain" : "cover",
                  filter:"brightness(0.5) saturate(0.65)"
                }}/>
            : <div style={{ width:"100%", height:"100%",
                background:`linear-gradient(145deg,${color1},${color2})`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:72, opacity:0.2 }}>{ss.icon}</span>
              </div>
          }
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to bottom,rgba(8,8,8,0) 0%,rgba(8,8,8,0.88) 70%,rgba(8,8,8,1) 100%)" }}/>
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3, background:VERDICT_BAND(log.verdict) }}/>

          <button onClick={onClose}
            style={{ position:"absolute", top:14, right:14, width:32, height:32,
              borderRadius:"50%", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)",
              fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ✕
          </button>
          <button onClick={() => { onClose(); onEdit(log); }}
            style={{ position:"absolute", top:14, right:54, width:32, height:32,
              borderRadius:"50%", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
              border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.4)",
              fontSize:12, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", letterSpacing:"1px" }}>
            ···
          </button>

          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 18px 16px" }}>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.2em",
              color:"rgba(255,255,255,0.65)", marginBottom:6, textTransform:"uppercase" }}>
              {ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}
            </div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:"#fff",
              lineHeight:1.05, letterSpacing:"-0.5px" }}>
              {log.title}
            </div>
          </div>
        </div>
          );
        })()}

        {/* ── Meta row ── */}
        <div style={{ padding:"12px 18px 10px", display:"flex", alignItems:"center", gap:8,
          borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0, flexWrap:"wrap" }}>
          <div style={{ padding:"4px 10px", borderRadius:3, border:`1px solid ${vp.border}`,
            background:vp.bg, fontFamily:"'Unbounded',sans-serif", fontSize:8,
            fontWeight:700, letterSpacing:"0.1em", color:vp.color }}>
            {vp.label}
          </div>
          {log.genre && (
            <div style={{ padding:"3px 9px", borderRadius:3, border:"1px solid rgba(255,255,255,0.18)",
              fontFamily:"'Unbounded',sans-serif", fontSize:8, letterSpacing:"0.08em",
              color:"rgba(255,255,255,0.75)" }}>
              {log.genre}
            </div>
          )}
          {log.year_released && (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
              color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em" }}>
              {log.year_released}
            </div>
          )}
          {(log.location_venue || log.location_city) && (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
              color:"rgba(255,255,255,0.65)", letterSpacing:"0.06em" }}>
              📍 {[log.location_venue, log.location_city].filter(Boolean).join(", ")}
            </div>
          )}
          {loggedOnLabel(log) && (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
              color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em" }}>
              {loggedOnLabel(log)}
            </div>
          )}
          {log.recommended_by && (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8,
              color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em" }}>
              👤 Rec'd by {log.recommended_by}
            </div>
          )}
          {/* Progress bar in expand panel */}
          {log.verdict?.startsWith("Currently") && (() => {
            let pct = null, label = null;
            if (log.current_page && log.total_pages && Number(log.total_pages) > 0) {
              pct = Math.min(100, Math.round((Number(log.current_page) / Number(log.total_pages)) * 100));
              label = `Page ${log.current_page} of ${log.total_pages}`;
            } else if (log.current_episode && log.total_episodes && Number(log.total_episodes) > 0) {
              pct = Math.min(100, Math.round((Number(log.current_episode) / Number(log.total_episodes)) * 100));
              label = log.current_season ? `S${log.current_season} · Ep ${log.current_episode} of ${log.total_episodes}` : `Ep ${log.current_episode} of ${log.total_episodes}`;
            } else if (log.current_page) {
              label = `Page ${log.current_page}`;
            } else if (log.current_episode) {
              label = log.current_season ? `S${log.current_season} · Ep ${log.current_episode}` : `Ep ${log.current_episode}`;
            }
            if (!label) return null;
            const vp2 = VERDICT_PILL_STYLE(log.verdict);
            return (
              <div style={{ width:"100%", marginTop:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8, color:"rgba(255,255,255,0.75)", letterSpacing:"0.06em" }}>{label}</span>
                  {pct != null && <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8, color:"rgba(255,255,255,0.6)" }}>{pct}%</span>}
                </div>
                {pct != null && (
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.1)" }}>
                    <div style={{ height:"100%", width:`${pct}%`, borderRadius:2, background:vp2.color }}/>
                  </div>
                )}
              </div>
            );
          })()}
          <div style={{ flex:1 }}/>
          <button onClick={() => { if(window.confirm(`Delete "${log.title}"?`)) { onDelete(log.id); onClose(); } }}
            style={{ background:"none", border:"none", color:"rgba(231,76,60,0.5)",
              fontSize:14, cursor:"pointer", padding:"4px" }}>
            🗑
          </button>
        </div>

        {/* ── Verdict timeline — only after a revisit ── */}
        {hasTimeline && (
          <div style={{ padding:"14px 18px 4px", borderBottom:"1px solid rgba(255,255,255,0.06)",
            flexShrink:0, maxHeight:180, overflowY:"auto" }}>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.15em",
              color:"rgba(255,255,255,0.45)", textTransform:"uppercase", marginBottom:12 }}>
              ↻ Verdict over time
            </div>
            {log.revisits.map((r, i) => {
              const rvp = VERDICT_PILL_STYLE(r.verdict);
              const dateStr = r.date
                ? new Date(r.date).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
                : "";
              const isLast = i === log.revisits.length - 1;
              return (
                <div key={i} style={{ display:"flex", gap:11, marginBottom:isLast ? 10 : 0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:3 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:rvp.color,
                      flexShrink:0, boxShadow:isLast ? `0 0 8px ${rvp.color}88` : "none" }}/>
                    {!isLast && <span style={{ width:1, flex:1, background:"rgba(255,255,255,0.12)", margin:"4px 0" }}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0, paddingBottom:isLast ? 0 : 12 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:8, fontWeight:700,
                        letterSpacing:"0.08em", color:rvp.color }}>{rvp.label}</span>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7,
                        color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em" }}>
                        {dateStr}{i === 0 ? " · FIRST IMPRESSION" : isLast ? " · NOW" : ""}
                      </span>
                    </div>
                    {r.thoughts && (
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                        fontSize:12.5, color:"rgba(255,255,255,0.75)", lineHeight:1.6, marginTop:4,
                        whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                        {r.thoughts}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Notes preview — tap to slide open the side panel ── */}
        <div
          onClick={() => setNotesState("side")}
          style={{ flex:1, padding:"16px 18px", cursor:"pointer", overflowY:"hidden" }}
        >
          {log.notes ? (
            <>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.15em",
                color:"rgba(255,255,255,0.45)", textTransform:"uppercase", marginBottom:10 }}>
                💭 My thoughts
              </div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                fontSize:14, color:"rgba(255,255,255,0.8)", lineHeight:1.85,
                display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical",
                overflow:"hidden", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                {log.notes}
              </div>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.1em",
                color:"rgba(255,255,255,0.4)", marginTop:10, textAlign:"right" }}>
                tap to read →
              </div>
            </>
          ) : (
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:7, letterSpacing:"0.15em",
              color:"rgba(255,255,255,0.3)", textTransform:"uppercase" }}>
              💭 tap to add notes
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:"10px 18px 24px", borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", gap:8, flexShrink:0 }}>
          {onRevisit && isFinished && (
            <button onClick={() => onRevisit(log)}
              style={{ flex:1, padding:"10px", borderRadius:8,
                border:"1px solid rgba(212,168,67,0.25)", background:"none",
                color:"rgba(212,168,67,0.7)", fontFamily:"'Unbounded',sans-serif",
                fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>
              ↻ REVISIT
            </button>
          )}
          <button onClick={() => setNotesState("side")}
            style={{ flex:1, padding:"10px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.07)", background:"none",
              color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif",
              fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>
            ✏ NOTES
          </button>
          <button onClick={onClose}
            style={{ flex:1, padding:"10px", borderRadius:8,
              border:"1px solid rgba(255,255,255,0.07)", background:"none",
              color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif",
              fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>
            ← BACK
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── GRID FEED ────────────────────────────────────────────────────────────────
export const GridFeed = ({ logs, darkMode, onEdit, onDelete, onNotesUpdate, onRevisit, searchTerm = "", deepLinkNotesId, onDeepLinkConsumed, deepLinkOpenId, onDeepLinkOpenConsumed }) => {
  const [selected, setSelected] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null); // src string when showing fullscreen
  const pressTimer = React.useRef(null);
  const didLongPress = React.useRef(false);
  const GAP = 2;

  // Clear any pending long-press timer on unmount
  useEffect(() => () => clearTimeout(pressTimer.current), []);

  // Keep selected in sync when logs update (e.g. after saving a note)
  useEffect(() => {
    if (selected) {
      const updated = logs.find(l => l.id === selected.id);
      if (updated) setSelected(prev => ({ ...updated, _openNotes: prev._openNotes }));
      else setSelected(null);
    }
  }, [logs]);

  // When a card opens: push history sentinel (web) + register on __backStack (native)
  useEffect(() => {
    if (!selected) return;
    window.history.pushState({ dili: "card" }, "");
    if (!window.__backStack) window.__backStack = [];
    const dismiss = () => {
      setSelected(null);
      window.__backStack = window.__backStack.filter(h => h !== dismiss);
      window.history.pushState({ dili: "sentinel" }, "");
    };
    window.__backStack.push(dismiss);
    return () => {
      window.__backStack = window.__backStack?.filter(h => h !== dismiss);
    };
  }, [selected?.id]);

  // Web popstate — fires on browser/Chrome back, not on Capacitor native back
  useEffect(() => {
    const onPop = () => {
      if (selected) {
        setSelected(null);
        window.history.pushState({ dili: "sentinel" }, "");
      } else {
        window.history.pushState({ dili: "sentinel" }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [selected]);

  // Deep-link from search: open the entry and jump straight to notes side panel
  useEffect(() => {
    if (deepLinkNotesId) {
      const log = logs.find(l => l.id === deepLinkNotesId);
      if (log) {
        setSelected({ ...log, _openNotes: true });
        onDeepLinkConsumed?.();
      }
    }
  }, [deepLinkNotesId]);

  // Deep-link from home: open the expand panel directly
  useEffect(() => {
    if (deepLinkOpenId) {
      const log = logs.find(l => l.id === deepLinkOpenId);
      if (log) {
        setSelected(log);
        onDeepLinkOpenConsumed?.();
      }
    }
  }, [deepLinkOpenId]);

  // Early return AFTER all hooks: returning above them crashes React when
  // logs transitions to empty while the component is mounted.
  if (!logs.length) return null;

  // True masonry: assign each card to whichever column is shorter.
  // Heights are estimated from aspect ratio so we don't need to measure DOM.
  const getEstimatedHeight = (log) => {
    const cat = getCat(log.media_type);
    const colWidth = (window.innerWidth - GAP * 3) / 2;
    if (cat === "Listened") return colWidth * 1;        // 1:1
    if (cat === "Experienced") return colWidth * 0.75;  // 4:3
    return colWidth * 1.5;                              // 2:3 portrait
  };
  const col1 = [], col2 = [];
  let h1 = 0, h2 = 0;
  for (const log of logs) {
    const h = getEstimatedHeight(log) + GAP;
    if (h1 <= h2) { col1.push(log); h1 += h; }
    else          { col2.push(log); h2 += h; }
  }

  const renderCard = (log) => {
          const vp = VERDICT_PILL_STYLE(log.verdict);
          const ss = getSubtypeStyle(log.media_type);
          const isCurrent = log.verdict?.startsWith("Currently");

          // Calculate progress percentage for "Currently" entries
          let progressPct = null;
          let progressLabel = null;
          if (isCurrent) {
            if (log.current_page && log.total_pages && Number(log.total_pages) > 0) {
              progressPct = Math.min(100, Math.round((Number(log.current_page) / Number(log.total_pages)) * 100));
              progressLabel = `p.${log.current_page} / ${log.total_pages}`;
            } else if (log.current_episode && log.total_episodes && Number(log.total_episodes) > 0) {
              progressPct = Math.min(100, Math.round((Number(log.current_episode) / Number(log.total_episodes)) * 100));
              progressLabel = log.current_season
                ? `S${log.current_season} E${log.current_episode}/${log.total_episodes}`
                : `Ep ${log.current_episode}/${log.total_episodes}`;
            } else if (log.current_page) {
              progressLabel = `p.${log.current_page}`;
            } else if (log.current_episode) {
              progressLabel = log.current_season ? `S${log.current_season} E${log.current_episode}` : `Ep ${log.current_episode}`;
            }
          }

    return (
      <div key={log.id}
        onClick={() => { if (!didLongPress.current) setSelected(log); }}
              onTouchStart={() => {
                didLongPress.current = false;
                if (!log.artwork) return;
                pressTimer.current = setTimeout(() => {
                  didLongPress.current = true;
                  setLightboxImg(log.artwork);
                }, 450);
              }}
              onTouchEnd={() => clearTimeout(pressTimer.current)}
              onTouchMove={() => clearTimeout(pressTimer.current)}
              onMouseDown={() => {
                didLongPress.current = false;
                if (!log.artwork) return;
                pressTimer.current = setTimeout(() => {
                  didLongPress.current = true;
                  setLightboxImg(log.artwork);
                }, 450);
              }}
              onMouseUp={() => clearTimeout(pressTimer.current)}
              onMouseLeave={() => clearTimeout(pressTimer.current)}
              style={{ position:"relative", aspectRatio: getAspectRatio(log.media_type), cursor:"pointer",
                borderRadius:3, overflow:"hidden", background:"#0f0f0f",
                WebkitUserSelect:"none", userSelect:"none",
                WebkitTouchCallout:"none",
                WebkitTapHighlightColor:"transparent",
                touchAction:"manipulation" }}>

              <ArtworkTile log={log}/>

              {/* Bottom gradient — stronger for better legibility on light artwork */}
              <div style={{ position:"absolute", inset:0,
                background: progressPct != null
                  ? "linear-gradient(to bottom,transparent 10%,rgba(0,0,0,0.5) 45%,rgba(0,0,0,0.98) 100%)"
                  : "linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.45) 50%,rgba(0,0,0,0.95) 100%)",
                pointerEvents:"none" }}/>

              {/* Verdict/progress stripe on left */}
              <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3,
                background:VERDICT_BAND(log.verdict), pointerEvents:"none" }}/>

              {/* Content */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0,
                padding: progressPct != null ? "0 7px 5px 10px" : "0 7px 7px 10px",
                pointerEvents:"none" }}>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                  color:"rgba(255,255,255,0.6)", letterSpacing:"0.12em",
                  textTransform:"uppercase", marginBottom:3, lineHeight:1 }}>
                  {ss.icon} {log.media_type}
                </div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:11,
                  color:"#fff", lineHeight:1.2, marginBottom:4,
                  display:"-webkit-box", WebkitLineClamp:2,
                  WebkitBoxOrient:"vertical", overflow:"hidden",
                  textShadow:"0 1px 6px rgba(0,0,0,0.8)" }}>
                  {log.title}
                </div>

                {/* Progress bar + label — shown instead of verdict pill for "Currently" entries with data */}
                {progressPct != null ? (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                        color:"rgba(255,255,255,0.85)", letterSpacing:"0.06em" }}>
                        {progressLabel}
                      </span>
                      <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                        color:"rgba(255,255,255,0.7)", letterSpacing:"0.04em" }}>
                        {progressPct}%
                      </span>
                    </div>
                    {/* Track */}
                    <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,0.2)", overflow:"hidden" }}>
                      <div style={{
                        height:"100%", width:`${progressPct}%`, borderRadius:2,
                        background: vp.color,
                        transition:"width 0.3s ease",
                      }}/>
                    </div>
                  </div>
                ) : isCurrent && progressLabel ? (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:3,
                    padding:"2px 6px", borderRadius:2,
                    background:"rgba(100,181,246,0.2)", border:"1px solid rgba(100,181,246,0.4)" }}>
                    <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                      fontWeight:700, letterSpacing:"0.06em", color:"#90caf9" }}>
                      {progressLabel}
                    </span>
                  </div>
                ) : (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:3,
                    padding:"2px 6px", borderRadius:2,
                    background:vp.bg, border:`1px solid ${vp.border}` }}>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:vp.color, flexShrink:0 }}/>
                    <span style={{ fontFamily:"'Unbounded',sans-serif", fontSize:6,
                      fontWeight:700, letterSpacing:"0.06em", color:vp.color }}>
                      {vp.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes indicator dot */}
              {log.notes && (
                <div style={{ position:"absolute", top:6, right:6, width:5, height:5,
                  borderRadius:"50%", background:"rgba(255,255,255,0.45)",
                  boxShadow:"0 0 5px rgba(255,255,255,0.3)", pointerEvents:"none" }}/>
              )}
            </div>
    );
  };

  return (
    <>
      <div style={{ display:"flex", gap:GAP, padding:GAP, alignItems:"flex-start" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:GAP }}>
          {col1.map(log => renderCard(log))}
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:GAP }}>
          {col2.map(log => renderCard(log))}
        </div>
      </div>

      {selected && (
        <ExpandPanel
          log={selected}
          darkMode={darkMode}
          onClose={() => setSelected(null)}
          onEdit={onEdit}
          onDelete={(id) => { onDelete(id); setSelected(null); }}
          onNotesUpdate={onNotesUpdate}
          onRevisit={onRevisit}
          openNotesImmediately={!!selected._openNotes}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position:"fixed", inset:0, zIndex:600,
            background:"rgba(0,0,0,0.92)",
            backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            animation:"lbIn 0.18s ease",
          }}>
          <style>{`
            @keyframes lbIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
          `}</style>
          <img
            src={lightboxImg} alt=""
            style={{
              maxWidth:"95vw", maxHeight:"90vh",
              objectFit:"contain", borderRadius:8,
              boxShadow:"0 20px 80px rgba(0,0,0,0.8)",
              pointerEvents:"none",
            }}
          />
          <div style={{
            position:"absolute", top:20, right:20,
            width:36, height:36, borderRadius:"50%",
            background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(255,255,255,0.6)", fontSize:16, cursor:"pointer",
          }}>✕</div>
        </div>
      )}
    </>
  );
};

// ─── VIEW TOGGLE ─────────────────────────────────────────────────────────────
export const ViewToggle = ({ view, onChange, theme }) => (
  <div style={{ display:"flex", background: theme?.input || "rgba(255,255,255,0.06)",
    borderRadius:10, padding:3, gap:2,
    border:`1px solid ${theme?.border || "rgba(255,255,255,0.08)"}` }}>
    <button onClick={() => onChange("editorial")} title="Editorial view"
      style={{ padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer",
        background: view==="editorial" ? (theme?.card || "rgba(255,255,255,0.12)") : "none",
        color: view==="editorial" ? (theme?.text || "#fff") : (theme?.subtext || "rgba(255,255,255,0.3)"),
        fontSize:14, transition:"all 0.15s", lineHeight:1 }}>
      ▤
    </button>
    <button onClick={() => onChange("compact")} title="Grid view"
      style={{ padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer",
        background: view==="compact" ? (theme?.card || "rgba(255,255,255,0.12)") : "none",
        color: view==="compact" ? (theme?.text || "#fff") : (theme?.subtext || "rgba(255,255,255,0.3)"),
        fontSize:14, transition:"all 0.15s", lineHeight:1 }}>
      ⊞
    </button>
  </div>
);
