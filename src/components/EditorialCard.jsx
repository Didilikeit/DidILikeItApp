import React, { useState, useEffect } from "react";
import {
  hl, getSubtypeStyle, generateCoverGradient,
  collAccent, VERDICT_MAP_COLOR
} from "../utils/helpers.js";

// ─── FONTS ───────────────────────────────────────────────────────────────────
if (!document.getElementById("editorial-fonts")) {
  const link = document.createElement("link");
  link.id = "editorial-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Unbounded:wght@300;400;700;900&display=swap";
  document.head.appendChild(link);
}

// ─── DATE LABEL HELPER ────────────────────────────────────────────────────────
const loggedOnLabel = (log) => {
  if (!log.logged_at) return null;
  const d = new Date(log.logged_at);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const cat = getSubtypeStyle(log.media_type)?.cat || "";
  const verb = cat === "Read" ? "Read on"
    : cat === "Watched" ? "Watched on"
    : cat === "Listened" ? "Listened on"
    : cat === "Experienced" ? "Went on"
    : "Logged";
  return `${verb} ${dateStr}`;
};

// ─── VERDICT STYLES ──────────────────────────────────────────────────────────
const VERDICT_BAND = v => ({
  "I loved it":       "linear-gradient(to bottom,#f1c40f,#e67e22)",
  "I liked it":       "linear-gradient(to bottom,#81c784,#4caf50)",
  "Meh":              "linear-gradient(to bottom,#ffb74d,#ff9800)",
  "I didn't like it": "linear-gradient(to bottom,#e57373,#e74c3c)",
  "Want to go":       "linear-gradient(to bottom,#ce93d8,#9b59b6)",
}[v] || "linear-gradient(to bottom,rgba(255,255,255,0.1),rgba(255,255,255,0.03))");

export const VERDICT_PILL_STYLE = v => ({
  "I loved it":          { bg:"rgba(241,196,15,0.12)",  color:"#f1c40f",  border:"rgba(241,196,15,0.25)",  label:"★ Loved"      },
  "I liked it":          { bg:"rgba(76,175,80,0.12)",   color:"#81c784",  border:"rgba(76,175,80,0.25)",   label:"● Liked"      },
  "Meh":                 { bg:"rgba(255,152,0,0.12)",   color:"#ffb74d",  border:"rgba(255,152,0,0.25)",   label:"~ Meh"        },
  "I didn't like it":    { bg:"rgba(231,76,60,0.12)",   color:"#e57373",  border:"rgba(231,76,60,0.25)",   label:"✕ Didn't"     },
  "Want to go":          { bg:"rgba(155,89,182,0.12)",  color:"#ce93d8",  border:"rgba(155,89,182,0.25)",  label:"📍 Want"      },
  "Want to read":        { bg:"rgba(155,89,182,0.12)",  color:"#ce93d8",  border:"rgba(155,89,182,0.25)",  label:"⏳ Want"      },
  "Want to watch":       { bg:"rgba(155,89,182,0.12)",  color:"#ce93d8",  border:"rgba(155,89,182,0.25)",  label:"⏳ Want"      },
  "Want to listen":      { bg:"rgba(155,89,182,0.12)",  color:"#ce93d8",  border:"rgba(155,89,182,0.25)",  label:"⏳ Want"      },
  "Currently reading":   { bg:"rgba(100,181,246,0.12)", color:"#64b5f6",  border:"rgba(100,181,246,0.25)", label:"▶ Reading"    },
  "Currently watching":  { bg:"rgba(100,181,246,0.12)", color:"#64b5f6",  border:"rgba(100,181,246,0.25)", label:"▶ Watching"   },
  "Currently listening": { bg:"rgba(100,181,246,0.12)", color:"#64b5f6",  border:"rgba(100,181,246,0.25)", label:"▶ Listening"  },
}[v] || { bg:"rgba(255,255,255,0.06)", color:"#888", border:"rgba(255,255,255,0.1)", label: v || "–" });

// ─── ARTWORK FALLBACK ─────────────────────────────────────────────────────────
const ArtworkFallback = ({ log, size = "hero" }) => {
  const ss = getSubtypeStyle(log.media_type);
  const isRead = ss.cat === "Read";
  const isExp  = ss.cat === "Experienced";
  const { color1, color2 } = generateCoverGradient(log.title || "");
  return isRead ? (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${color1},${color2})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"16px", textAlign:"center", gap:"10px" }}>
      <div style={{ width:"32px", height:"2px", background:"rgba(255,255,255,0.35)", borderRadius:"2px" }}/>
      <div style={{ fontFamily:"'DM Serif Display',serif", color:"#fff", fontSize:size==="hero"?"22px":size==="medium"?"16px":"13px", lineHeight:"1.25", wordBreak:"break-word", textShadow:"0 2px 12px rgba(0,0,0,0.5)", maxHeight:"55%", overflow:"hidden" }}>{log.title}</div>
      <div style={{ width:"20px", height:"1px", background:"rgba(255,255,255,0.25)", borderRadius:"2px" }}/>
      {log.creator && <div style={{ color:"rgba(255,255,255,0.5)", fontSize:size==="hero"?"11px":"9px", fontStyle:"italic", letterSpacing:"0.06em" }}>{log.creator}</div>}
      <div style={{ width:"32px", height:"2px", background:"rgba(255,255,255,0.35)", borderRadius:"2px" }}/>
    </div>
  ) : isExp ? (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${ss.color}44,${ss.color}18)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"10px", padding:"16px", textAlign:"center" }}>
      <span style={{ fontSize:size==="hero"?"60px":size==="medium"?"44px":"36px", opacity:0.7 }}>{ss.icon}</span>
      {log.location_venue && <div style={{ color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600" }}>{log.location_venue}</div>}
      {log.location_city  && <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"11px" }}>📍 {log.location_city}</div>}
    </div>
  ) : (
    <div style={{ width:"100%", height:"100%", background:"linear-gradient(145deg,#111,#0a0a0a)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontSize:size==="hero"?"70px":size==="medium"?"50px":"40px", opacity:0.25 }}>{ss.icon}</span>
    </div>
  );
};

// ─── INLINE NOTES PREVIEW ─────────────────────────────────────────────────────
// Slides over the hero card from the right. 22% left strip = back to card.
// Tapping the notes body opens the full panel.
const NotesInline = ({ log, onClose, onOpenPanel, searchTerm }) => (
  <>
    <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    {/* 22% left strip — tap to go back to card (collapsed) */}
    <div onClick={onClose} style={{ position:"absolute", top:0, left:0, bottom:0, width:"22%", zIndex:19, cursor:"pointer" }}/>
    {/* Notes content */}
    <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:0, right:0, bottom:0, width:"78%", background:"rgba(5,5,5,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", zIndex:20, display:"flex", flexDirection:"column", borderLeft:"1px solid rgba(255,255,255,0.07)", animation:"slideInRight 0.25s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
      <div style={{ position:"absolute", top:0, left:"-20px", bottom:0, width:"20px", background:"linear-gradient(to right,transparent,rgba(5,5,5,0.97))", pointerEvents:"none" }}/>
      {/* Header */}
      <div style={{ padding:"16px 14px 10px", flexShrink:0 }}>
        <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", marginBottom:"6px" }}>MY NOTES</div>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"16px", color:"#fff", lineHeight:"1.2", marginBottom:"12px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
        <div style={{ height:"1px", background:"rgba(255,255,255,0.06)" }}/>
      </div>
      {/* Body — tap to open full panel */}
      <div onClick={onOpenPanel} style={{ flex:1, overflowY:"hidden", padding:"10px 14px", cursor:"pointer" }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"13px", color:"rgba(255,255,255,0.6)", lineHeight:"1.85", display:"-webkit-box", WebkitLineClamp:8, WebkitBoxOrient:"vertical", overflow:"hidden", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {log.notes ? hl(log.notes, searchTerm) : <span style={{ color:"#222", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em" }}>NO NOTES YET</span>}
        </div>
        {log.notes && <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", letterSpacing:"0.12em", color:"rgba(255,255,255,0.18)", textTransform:"uppercase", marginTop:"10px" }}>tap to expand →</div>}
      </div>
      {/* Footer */}
      <div style={{ padding:"10px 14px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
        <div style={{ display:"flex", gap:"5px" }}>
          <button onClick={onClose} style={{ flex:1, padding:"8px 4px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.07)", background:"none", color:"rgba(255,255,255,0.25)", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" }}>← BACK</button>
          <button onClick={onOpenPanel} style={{ flex:1, padding:"8px 4px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.07)", background:"none", color:"rgba(255,255,255,0.25)", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer" }}>⛶ FULL</button>
        </div>
      </div>
    </div>
  </>
);

// ─── FULL SIDE PANEL (fixed overlay) ─────────────────────────────────────────
// 22% left strip = back to original collapsed card state (onClose calls setExpandedId(null))
const NotesPanel = ({ log, darkMode, onClose, onNotesUpdate, searchTerm }) => {
  const vp = VERDICT_PILL_STYLE(log.verdict);
  const [localNotes, setLocalNotes] = useState(log.notes || "");
  const [editing, setEditing] = useState(false);
  const handleSave = () => { onNotesUpdate?.(log.id, localNotes); setEditing(false); };
  useEffect(() => { setLocalNotes(log.notes || ""); }, [log.notes]);
  const btn = { flex:1, padding:"8px 4px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.07)", background:"none", color:"rgba(255,255,255,0.3)", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", textAlign:"center" };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex" }}>
      <style>{`@keyframes npSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      {/* 22% left strip — tap to return to fully collapsed state */}
      <div onClick={onClose} style={{ width:"22%", flexShrink:0, cursor:"pointer", background:"transparent" }}/>
      {/* Panel */}
      <div onClick={e => e.stopPropagation()} style={{ flex:1, background:"rgba(5,5,5,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", display:"flex", flexDirection:"column", borderLeft:"1px solid rgba(255,255,255,0.07)", animation:"npSlideIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94)", boxShadow:"-20px 0 60px rgba(0,0,0,0.8)" }}>
        <div style={{ position:"absolute", top:0, left:"-20px", bottom:0, width:"20px", background:"linear-gradient(to right,transparent,rgba(5,5,5,0.97))", pointerEvents:"none" }}/>
        {/* Header */}
        <div style={{ padding:"20px 16px 12px", flexShrink:0 }}>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", marginBottom:"8px" }}>MY NOTES</div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"18px", color:"#fff", lineHeight:"1.2", marginBottom:"5px" }}>{log.title}</div>
          {log.creator && <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em", color:"rgba(255,255,255,0.25)", marginBottom:"8px" }}>{log.creator}</div>}
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em", color:vp.color, marginBottom:"14px", opacity:0.8 }}>{vp.label}</div>
          <div style={{ height:"1px", background:"rgba(255,255,255,0.07)" }}/>
        </div>
        {/* Body */}
        {editing ? (
          <textarea value={localNotes} onChange={e => setLocalNotes(e.target.value)} autoFocus
            style={{ flex:1, width:"100%", background:"none", border:"none", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"16px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"15px", color:"rgba(255,255,255,0.85)", lineHeight:"1.9", resize:"none", outline:"none", boxSizing:"border-box" }}/>
        ) : (
          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", WebkitOverflowScrolling:"touch" }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"14px", color:"rgba(255,255,255,0.65)", lineHeight:"1.85", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {log.notes ? hl(log.notes, searchTerm) : <span style={{ color:"rgba(255,255,255,0.15)", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em" }}>NO NOTES YET</span>}
            </div>
          </div>
        )}
        {/* Footer */}
        <div style={{ padding:"12px 16px 20px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
          {editing ? (
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={handleSave} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:"rgba(255,255,255,0.1)", color:"#fff", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em", cursor:"pointer" }}>SAVE</button>
              <button onClick={() => { setLocalNotes(log.notes||""); setEditing(false); }} style={btn}>CANCEL</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={onClose}                style={btn}>← BACK</button>
              <button onClick={() => setEditing(true)} style={btn}>✏ EDIT</button>
              <button onClick={() => { navigator.clipboard?.writeText(log.notes||""); }} style={btn}>📋 COPY</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── DOTS MENU ────────────────────────────────────────────────────────────────
const DotsMenu = ({ log, theme, darkMode, onEdit, onDelete, onClose }) => (
  <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"36px", right:"12px", zIndex:30, background:darkMode?"#1a1a1a":"#fff", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"10px", overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.6)", minWidth:"140px", animation:"fadeInDown 0.15s ease" }}>
    <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <button onClick={() => { onEdit(); onClose(); }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", borderBottom:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>✏️ Edit entry</button>
    <button onClick={() => { onDelete(); onClose(); }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", color:"#e74c3c", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>🗑 Delete</button>
    <button onClick={onClose} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", borderTop:"1px solid rgba(255,255,255,0.05)", color:"#444", fontSize:"11px", cursor:"pointer", textAlign:"left" }}>Cancel</button>
  </div>
);

// ─── MINIMISE BUTTON ──────────────────────────────────────────────────────────
const MinimiseBtn = ({ onMinimise }) => (
  <button
    onClick={e => { e.stopPropagation(); onMinimise(); }}
    title="Minimise"
    style={{
      position:"absolute", top:"12px", left:"12px", zIndex:15,
      width:"28px", height:"28px", borderRadius:"50%",
      border:"1px solid rgba(255,255,255,0.15)",
      background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)",
      color:"rgba(255,255,255,0.5)", fontSize:"13px",
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
      lineHeight:1,
    }}>
    ↓
  </button>
);

// ─── SINGLE CARD ─────────────────────────────────────────────────────────────
// Flow:
//   collapsed card → tap → hero (expanded)
//   hero → tap card body → inline notes slide over
//   inline notes → tap notes body → full side panel
//   full panel → tap 22% left strip → fully collapsed (back to start)
//   hero → tap minimise button (↓) → collapse to regular size
//
// notesState: null | "inline" | "panel"
const Card = ({
  log, size, isExpanded, notesState, onCardTap, onNotesInline, onNotesClose, onOpenPanel, onMinimise, onNotesUpdate,
  theme, darkMode, onEdit, onDelete, searchTerm, onMapClick, pageNum,
}) => {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [imgError,  setImgError]  = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const vp = VERDICT_PILL_STYLE(log.verdict);

  const height = isExpanded ? 420 : (size === "small" ? 200 : 165);

  // ── HERO LAYOUT ───────────────────────────────────────────────────────────
  if (isExpanded) return (
    <>
      {notesState === "panel" && (
        <NotesPanel
          log={log}
          darkMode={darkMode}
          onClose={onNotesClose}      // 22% strip or BACK btn → fully collapsed
          onNotesUpdate={onNotesUpdate}
          searchTerm={searchTerm}
        />
      )}
      <div
        style={{ position:"relative", overflow:"hidden", height, background:"#050505", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }}
        onClick={() => { if (!menuOpen && notesState === null) onNotesInline(); }}
      >
        {/* Artwork */}
        <div style={{ position:"absolute", inset:0, zIndex:0 }}>
          {log.artwork && !imgError
            ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.65) saturate(0.75)" }} onError={() => setImgError(true)}/>
            : <ArtworkFallback log={log} size="hero"/>}
        </div>
        {/* Gradients */}
        <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to bottom,rgba(5,5,5,0.05) 0%,rgba(5,5,5,0) 20%,rgba(5,5,5,0.7) 65%,rgba(5,5,5,0.98) 100%)" }}/>
        <div style={{ position:"absolute", inset:0, zIndex:2, opacity:0.35, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")", backgroundSize:"200px 200px", pointerEvents:"none" }}/>
        {/* Verdict stripe */}
        <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"3px", background:VERDICT_BAND(log.verdict), zIndex:5 }}/>
        {/* Page number */}
        <div style={{ position:"absolute", top:16, right:16, fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"12px", color:"rgba(255,255,255,0.15)", zIndex:6 }}>{pageNum || "01"}</div>

        {/* Minimise button (↓) — top left */}
        <MinimiseBtn onMinimise={onMinimise}/>

        {/* Dots menu — top right */}
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); }}
          style={{ position:"absolute", top:"12px", right:"12px", zIndex:10, width:"28px", height:"28px", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)", color:"rgba(255,255,255,0.6)", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}>···</button>
        {menuOpen && <DotsMenu log={log} theme={theme} darkMode={darkMode} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)}/>}

        {/* Main content */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"28px 20px 24px", zIndex:3 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
            <div style={{ width:"20px", height:"1px", background:"rgba(255,255,255,0.3)" }}/>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"8px", fontWeight:"400", letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.4)" }}>{ss.icon} {log.media_type}{log.creator?` · ${log.creator}`:""}{log.year_released?` · ${log.year_released}`:""}</div>
          </div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(28px,8vw,40px)", lineHeight:"1.0", color:"#fff", letterSpacing:"-1px", marginBottom:"8px" }}>{log.title}</div>
          {log.genre && <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em", marginBottom:"12px" }}>{log.genre}</div>}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"5px 12px", borderRadius:"2px", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", background:vp.bg, color:vp.color, border:`1px solid ${vp.border}` }}>{vp.label}</div>
          {loggedOnLabel(log) && (
            <div style={{ marginTop:"6px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", letterSpacing:"0.1em", color:"rgba(255,255,255,0.18)", textTransform:"uppercase" }}>{loggedOnLabel(log)}</div>
          )}
          {/* Notes teaser or add-notes prompt */}
          {log.notes ? (
            <>
              <div style={{ marginTop:"14px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"14px", color:"rgba(255,255,255,0.4)", lineHeight:"1.65", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", borderLeft:"2px solid rgba(255,255,255,0.1)", paddingLeft:"12px" }}>{hl(log.notes, searchTerm)}</div>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", letterSpacing:"0.15em", color:"rgba(255,255,255,0.2)", textTransform:"uppercase", marginTop:"8px" }}>tap to read notes →</div>
            </>
          ) : (
            <div style={{ marginTop:"12px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", color:"rgba(255,255,255,0.15)", letterSpacing:"0.12em", cursor:"pointer" }} onClick={e => { e.stopPropagation(); onEdit(); }}>+ ADD NOTES</div>
          )}
          {/* Location */}
          {(log.location_venue || log.location_city) && (
            <div style={{ marginTop:"8px", fontSize:"11px", color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", gap:"6px" }}>
              📍 {[log.location_venue,log.location_city].filter(Boolean).join(", ")}
              {log.lat && log.lng && onMapClick && <button onClick={e => { e.stopPropagation(); onMapClick(log); }} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"20px", color:"rgba(255,255,255,0.4)", fontSize:"8px", fontWeight:"700", padding:"1px 7px", cursor:"pointer" }}>🗺 Map</button>}
            </div>
          )}
        </div>

        {/* Inline notes overlay */}
        {notesState === "inline" && (
          <NotesInline
            log={log}
            onClose={onNotesClose}       // ← BACK = fully collapsed
            onOpenPanel={onOpenPanel}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </>
  );

  // ── MEDIUM LAYOUT ─────────────────────────────────────────────────────────
  if (size === "medium") return (
    <div style={{ position:"relative", display:"flex", alignItems:"stretch", height, background:"#050505", cursor:"pointer", overflow:"hidden", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }} onClick={() => { if (!menuOpen) onCardTap(); }}>
      <div style={{ width:"110px", flexShrink:0, position:"relative", overflow:"hidden" }}>
        {log.artwork && !imgError ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.7)" }} onError={() => setImgError(true)}/> : <ArtworkFallback log={log} size="medium"/>}
        <div style={{ position:"absolute", top:0, right:0, bottom:0, width:"40px", background:"linear-gradient(to right,transparent,#050505)", zIndex:2 }}/>
      </div>
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"3px", background:VERDICT_BAND(log.verdict), zIndex:5 }}/>
      <div style={{ flex:1, padding:"14px 16px 12px 10px", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:0, position:"relative" }}>
        <div style={{ position:"absolute", top:"12px", right:"36px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"10px", color:"rgba(255,255,255,0.1)", zIndex:6 }}>{pageNum}</div>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); }} style={{ position:"absolute", top:"8px", right:"10px", zIndex:10, width:"24px", height:"24px", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.5)", color:"rgba(255,255,255,0.4)", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}>···</button>
        {menuOpen && <DotsMenu log={log} theme={theme} darkMode={darkMode} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)}/>}
        <div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"400", letterSpacing:"0.18em", textTransform:"uppercase", color:"#2a2a2a", marginBottom:"6px" }}>{ss.icon} {log.media_type}</div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"20px", lineHeight:"1.1", color:"#fff", letterSpacing:"-0.3px", marginBottom:"3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
          <div style={{ fontSize:"11px", color:"#333", marginBottom:"8px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.creator}{log.year_released?` · ${log.year_released}`:""}</div>
        </div>
        <div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"3px 9px", borderRadius:"2px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.08em", textTransform:"uppercase", background:vp.bg, color:vp.color, border:`1px solid ${vp.border}`, marginBottom:log.notes?"4px":"0" }}>{vp.label}</div>
          {loggedOnLabel(log) && (
            <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.18)", fontFamily:"'Unbounded',sans-serif", letterSpacing:"0.06em", marginBottom:log.notes?"4px":"0" }}>{loggedOnLabel(log)}</div>
          )}
          {log.notes
            ? <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"11px", color:"rgba(255,255,255,0.3)", lineHeight:"1.5", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{hl(log.notes,searchTerm)}</div>
            : <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", color:"#1e1e1e", letterSpacing:"0.1em", cursor:"pointer" }} onClick={e => { e.stopPropagation(); onEdit(); }}>+ ADD NOTES</div>}
        </div>
      </div>
    </div>
  );

  // ── SMALL LAYOUT (two-up) ─────────────────────────────────────────────────
  return (
    <div style={{ position:"relative", flex:1, height, overflow:"hidden", cursor:"pointer", background:"#050505", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }} onClick={() => { if (!menuOpen) onCardTap(); }}>
      <div style={{ position:"absolute", inset:0, zIndex:0 }}>
        {log.artwork && !imgError ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.55)" }} onError={() => setImgError(true)}/> : <ArtworkFallback log={log} size="small"/>}
      </div>
      <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to bottom,transparent 20%,rgba(5,5,5,0.97) 100%)" }}/>
      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"3px", background:VERDICT_BAND(log.verdict), zIndex:5 }}/>
      <div style={{ position:"absolute", top:"10px", right:"10px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"10px", color:"rgba(255,255,255,0.12)", zIndex:4 }}>{pageNum}</div>
      <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); }} style={{ position:"absolute", top:"6px", right:"6px", zIndex:10, width:"22px", height:"22px", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.5)", color:"rgba(255,255,255,0.4)", fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}>···</button>
      {menuOpen && <DotsMenu log={log} theme={theme} darkMode={darkMode} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)}/>}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 12px 14px", zIndex:2 }}>
        <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"6px", fontWeight:"700", letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(255,255,255,0.25)", marginBottom:"4px" }}>{ss.icon} {log.media_type}</div>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"16px", lineHeight:"1.1", color:"#fff", marginBottom:"7px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{log.title}</div>
        <div style={{ display:"inline-block", padding:"3px 8px", borderRadius:"2px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.08em", textTransform:"uppercase", background:vp.bg, color:vp.color, border:`1px solid ${vp.border}` }}>{vp.label}</div>
      </div>
    </div>
  );
};

// ─── EDITORIAL FEED ───────────────────────────────────────────────────────────
//
// STATE MACHINE per expanded card:
//   null (all collapsed)
//   → tap any card → expandedId set, notesState = null  (hero, no notes)
//   → tap hero body → notesState = "inline"              (notes slide over card)
//   → tap inline notes body → notesState = "panel"       (full side panel)
//   → tap 22% strip (inline or panel) → expandedId = null, notesState = null  (fully collapsed)
//   → tap minimise (↓) on hero → expandedId = null       (fully collapsed)
//
export const EditorialFeed = ({ logs, theme, darkMode, getVerdictStyle, onEdit, onDelete, searchTerm, collections, onMapClick, onNotesUpdate }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [notesState, setNotesState] = useState(null); // null | "inline" | "panel"

  useEffect(() => {
    if (!logs.length) { setExpandedId(null); setNotesState(null); return; }
    if (expandedId && !logs.find(l => l.id === expandedId)) { setExpandedId(null); setNotesState(null); }
  }, [logs]);

  if (!logs.length) return null;

  const expand   = (id) => { setExpandedId(id); setNotesState(null); };
  const collapse = ()   => { setExpandedId(null); setNotesState(null); };

  // Tap a collapsed card → expand it
  const handleCardTap = (id) => {
    if (id !== expandedId) expand(id);
    // Tapping expanded card body is handled via onNotesInline (see Card)
  };

  // Tap hero body (when no notes open) → open inline
  const handleNotesInline = () => setNotesState("inline");

  // Tap inline notes body → open full panel
  const handleOpenPanel = () => setNotesState("panel");

  // 22% strip on inline or panel, or BACK buttons → fully collapse
  const handleNotesClose = () => collapse();

  // Minimise button → fully collapse
  const handleMinimise = () => collapse();

  const sizeAtSlot = (slotIndex) => {
    const pos = slotIndex % 4;
    return (pos === 2 || pos === 3) ? "small" : "medium";
  };

  const border = "1px solid rgba(255,255,255,0.05)";

  let pageCounter = 2;
  const meta = logs.map((log, i) => {
    if (log.id === expandedId) return { size:"hero", page:"01" };
    const slotIndex = logs.slice(0,i).filter(l => l.id !== expandedId).length;
    const size = sizeAtSlot(slotIndex);
    const p = pageCounter++;
    return { size, page: p < 10 ? `0${p}` : `${p}` };
  });

  const cardProps = (log, m) => ({
    log, size: m.size,
    isExpanded: log.id === expandedId,
    notesState: log.id === expandedId ? notesState : null,
    onCardTap:     () => handleCardTap(log.id),
    onNotesInline: () => handleNotesInline(),
    onNotesClose:  () => handleNotesClose(),
    onOpenPanel:   () => handleOpenPanel(),
    onMinimise:    () => handleMinimise(),
    theme, darkMode,
    pageNum: m.page,
    searchTerm,
    onEdit:   () => onEdit(log),
    onDelete: () => onDelete(log.id),
    onMapClick,
    onNotesUpdate,
  });

  // Flat render — every card is a direct child of the grid.
  // Small cards span 1 column (side-by-side), hero/medium span both columns.
  // No wrapper divs around pairs = no React reconciliation bugs when a small card expands.
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
      {logs.map((log, i) => {
        const m = meta[i];
        const isSmall = m.size === "small";
        const isHero  = m.size === "hero";
        return (
          <div
            key={log.id}
            style={{
              gridColumn: isSmall ? "auto" : "1 / -1",
              borderBottom: border,
              borderRight: isSmall ? "1px solid rgba(255,255,255,0.05)" : "none",
              overflow: "hidden",
              maxHeight: isHero ? "none" : (isSmall ? 200 : 165),
            }}
          >
            <Card {...cardProps(log, m)}/>
          </div>
        );
      })}
    </div>
  );
};
