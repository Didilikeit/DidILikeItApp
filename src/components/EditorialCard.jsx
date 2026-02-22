import React, { useState, useEffect } from "react";
import { NotesModal } from "./NotesModal.jsx";
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

// ─── VERDICT STYLES ──────────────────────────────────────────────────────────
const VERDICT_BAND = v => ({
  "I loved it":       "linear-gradient(to bottom,#f1c40f,#e67e22)",
  "I liked it":       "linear-gradient(to bottom,#81c784,#4caf50)",
  "Meh":              "linear-gradient(to bottom,#ffb74d,#ff9800)",
  "I didn't like it": "linear-gradient(to bottom,#e57373,#e74c3c)",
  "Want to go":       "linear-gradient(to bottom,#ce93d8,#9b59b6)",
}[v] || "linear-gradient(to bottom,rgba(255,255,255,0.1),rgba(255,255,255,0.03))");

export const VERDICT_PILL_STYLE = v => ({
  "I loved it":       { bg:"rgba(241,196,15,0.12)",  color:"#f1c40f",  border:"rgba(241,196,15,0.25)",  label:"★ Loved"  },
  "I liked it":       { bg:"rgba(76,175,80,0.12)",   color:"#81c784",  border:"rgba(76,175,80,0.25)",   label:"● Liked"  },
  "Meh":              { bg:"rgba(255,152,0,0.12)",   color:"#ffb74d",  border:"rgba(255,152,0,0.25)",   label:"~ Meh"    },
  "I didn't like it": { bg:"rgba(231,76,60,0.12)",   color:"#e57373",  border:"rgba(231,76,60,0.25)",   label:"✕ Didn't" },
  "Want to go":       { bg:"rgba(155,89,182,0.12)",  color:"#ce93d8",  border:"rgba(155,89,182,0.25)",  label:"📍 Want"  },
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

// ─── NOTES SLIDE PANEL ────────────────────────────────────────────────────────
const NotesSlide = ({ log, theme, darkMode, onClose, onExpand, onNotesUpdate, searchTerm }) => {
  const vp = VERDICT_PILL_STYLE(log.verdict);
  const [localNotes, setLocalNotes] = useState(log.notes || "");
  const [editing, setEditing] = useState(false);
  const handleSave = () => { onNotesUpdate?.(log.id, localNotes); setEditing(false); };
  useEffect(() => { setLocalNotes(log.notes || ""); }, [log.notes]);
  const actionBtn = { flex:1, padding:"8px 4px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.07)", background:"none", color:"#333", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", textAlign:"center" };
  return (
    <>
      <div onClick={onClose} style={{ position:"absolute", top:0, left:0, bottom:0, width:"22%", zIndex:19, cursor:"pointer" }}/>
      <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:0, right:0, bottom:0, width:"78%", background:"rgba(5,5,5,0.97)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", zIndex:20, display:"flex", flexDirection:"column", borderLeft:"1px solid rgba(255,255,255,0.07)", animation:"slideInRight 0.25s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        <div style={{ position:"absolute", top:0, left:"-24px", bottom:0, width:"24px", background:"linear-gradient(to right,transparent,rgba(5,5,5,0.97))", pointerEvents:"none" }}/>
        <div style={{ padding:"16px 14px 10px", flexShrink:0 }}>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.2em", textTransform:"uppercase", color:"#2a2a2a", marginBottom:"6px" }}>My notes</div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"16px", color:"#fff", lineHeight:"1.2", marginBottom:"4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", color:vp.color, marginBottom:"12px" }}>{vp.label}</div>
          <div style={{ height:"1px", background:"rgba(255,255,255,0.06)" }}/>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px", WebkitOverflowScrolling:"touch" }}>
          {editing ? (
            <textarea value={localNotes} onChange={e => setLocalNotes(e.target.value)} autoFocus
              style={{ width:"100%", minHeight:"140px", background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", padding:"10px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"13px", color:"rgba(255,255,255,0.8)", lineHeight:"1.8", resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
          ) : (
            <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"13px", color:"rgba(255,255,255,0.6)", lineHeight:"1.85", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {log.notes ? hl(log.notes, searchTerm) : <span style={{ color:"#222", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", letterSpacing:"0.1em" }}>NO NOTES YET</span>}
            </div>
          )}
        </div>
        <div style={{ padding:"10px 14px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
          {editing ? (
            <div style={{ display:"flex", gap:"5px", marginBottom:"8px" }}>
              <button onClick={handleSave} style={{ flex:1, padding:"8px", borderRadius:"6px", border:"none", background:"rgba(255,255,255,0.9)", color:"#000", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", cursor:"pointer" }}>SAVE</button>
              <button onClick={() => { setLocalNotes(log.notes||""); setEditing(false); }} style={{ flex:1, padding:"8px", borderRadius:"6px", border:"1px solid rgba(255,255,255,0.1)", background:"none", color:"#555", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.1em", cursor:"pointer" }}>CANCEL</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:"5px", marginBottom:"8px" }}>
              <button onClick={onClose}              style={actionBtn}>✕ CLOSE</button>
              <button onClick={onExpand}             style={actionBtn}>⛶ FULL</button>
              <button onClick={() => setEditing(true)} style={actionBtn}>✏ EDIT</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── DOTS MENU ────────────────────────────────────────────────────────────────
const DotsMenu = ({ log, theme, darkMode, onEdit, onDelete, onClose }) => (
  <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:"36px", right:"12px", zIndex:30, background:darkMode?"#1a1a1a":"#fff", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"10px", overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.6)", minWidth:"140px", animation:"fadeInDown 0.15s ease" }}>
    <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <button onClick={() => { onEdit(); onClose(); }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", borderBottom:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>✏️ Edit entry</button>
    <button onClick={() => { if(window.confirm(`Delete "${log.title}"?`)){onDelete();onClose();} }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", color:"#e74c3c", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>🗑 Delete</button>
    <button onClick={onClose} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", borderTop:"1px solid rgba(255,255,255,0.05)", color:"#444", fontSize:"11px", cursor:"pointer", textAlign:"left" }}>Cancel</button>
  </div>
);

// ─── SINGLE CARD (handles all three sizes) ───────────────────────────────────
// size = "hero" | "medium" | "small"
// isExpanded: this card is the current hero (controls layout AND notes access)
// notesOpen:  notes slide is currently shown (only meaningful when isExpanded)
// onCardTap:  fed from parent feed — handles expand/notes logic
const Card = ({
  log, size, isExpanded, notesOpen, onCardTap, onNotesClose,
  theme, darkMode, onEdit, onDelete, searchTerm, onMapClick, onNotesUpdate, pageNum,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [imgError,  setImgError]  = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const vp = VERDICT_PILL_STYLE(log.verdict);

  // Animated height — CSS transition does the work
  const height = isExpanded ? 420 : (size === "small" ? 200 : 165);

  const handleClick = () => { if (!menuOpen) onCardTap(); };

  // ── HERO LAYOUT (full-bleed) ─────────────────────────────────────────────
  if (isExpanded) return (
    <>
      {showModal && <NotesModal log={log} theme={theme} darkMode={darkMode} onClose={() => setShowModal(false)} onSave={t => { onNotesUpdate?.(log.id,t); setShowModal(false); }}/>}
      <div style={{ position:"relative", overflow:"hidden", cursor:"pointer", height, background:"#050505", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }} onClick={handleClick}>
        <div style={{ position:"absolute", inset:0, zIndex:0 }}>
          {log.artwork && !imgError ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.65) saturate(0.75)" }} onError={() => setImgError(true)}/> : <ArtworkFallback log={log} size="hero"/>}
        </div>
        <div style={{ position:"absolute", inset:0, zIndex:1, background:"linear-gradient(to bottom,rgba(5,5,5,0.05) 0%,rgba(5,5,5,0) 20%,rgba(5,5,5,0.7) 65%,rgba(5,5,5,0.98) 100%)" }}/>
        <div style={{ position:"absolute", inset:0, zIndex:2, opacity:0.35, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")", backgroundSize:"200px 200px", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:0, left:0, bottom:0, width:"3px", background:VERDICT_BAND(log.verdict), zIndex:5 }}/>
        <div style={{ position:"absolute", top:16, right:16, fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"12px", color:"rgba(255,255,255,0.15)", zIndex:6 }}>{pageNum || "01"}</div>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); onNotesClose?.(); }} style={{ position:"absolute", top:"12px", right:"36px", zIndex:10, width:"28px", height:"28px", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.12)", background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)", color:"rgba(255,255,255,0.6)", fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}>···</button>
        {menuOpen && <DotsMenu log={log} theme={theme} darkMode={darkMode} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)}/>}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"28px 20px 24px", zIndex:3 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
            <div style={{ width:"20px", height:"1px", background:"rgba(255,255,255,0.3)" }}/>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"8px", fontWeight:"400", letterSpacing:"0.2em", textTransform:"uppercase", color:"rgba(255,255,255,0.4)" }}>{ss.icon} {log.media_type}{log.creator?` · ${log.creator}`:""}{log.year_released?` · ${log.year_released}`:""}</div>
          </div>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(28px,8vw,40px)", lineHeight:"1.0", color:"#fff", letterSpacing:"-1px", marginBottom:"8px" }}>{log.title}</div>
          {log.genre && <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em", marginBottom:"12px" }}>{log.genre}</div>}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"5px 12px", borderRadius:"2px", fontFamily:"'Unbounded',sans-serif", fontSize:"8px", fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", background:vp.bg, color:vp.color, border:`1px solid ${vp.border}` }}>{vp.label}</div>
          {log.notes && !notesOpen && (
            <>
              <div style={{ marginTop:"14px", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"14px", color:"rgba(255,255,255,0.4)", lineHeight:"1.65", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", borderLeft:"2px solid rgba(255,255,255,0.1)", paddingLeft:"12px" }}>{hl(log.notes, searchTerm)}</div>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", letterSpacing:"0.15em", color:"rgba(255,255,255,0.2)", textTransform:"uppercase", marginTop:"8px" }}>tap to read →</div>
            </>
          )}
          {!log.notes && <div style={{ marginTop:"12px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", color:"rgba(255,255,255,0.15)", letterSpacing:"0.12em", cursor:"pointer" }} onClick={e => { e.stopPropagation(); onEdit(); }}>+ ADD NOTES</div>}
          {(log.location_venue || log.location_city) && (
            <div style={{ marginTop:"8px", fontSize:"11px", color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", gap:"6px" }}>
              📍 {[log.location_venue,log.location_city].filter(Boolean).join(", ")}
              {log.lat && log.lng && onMapClick && <button onClick={e => { e.stopPropagation(); onMapClick(log); }} style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"20px", color:"rgba(255,255,255,0.4)", fontSize:"8px", fontWeight:"700", padding:"1px 7px", cursor:"pointer" }}>🗺 Map</button>}
            </div>
          )}
        </div>
        {notesOpen && <NotesSlide log={log} theme={theme} darkMode={darkMode} searchTerm={searchTerm} onClose={onNotesClose} onExpand={() => { setShowModal(true); onNotesClose?.(); }} onNotesUpdate={onNotesUpdate}/>}
      </div>
    </>
  );

  // ── MEDIUM LAYOUT (artwork left) ─────────────────────────────────────────
  if (size === "medium") return (
    <>
      {showModal && <NotesModal log={log} theme={theme} darkMode={darkMode} onClose={() => setShowModal(false)} onSave={t => { onNotesUpdate?.(log.id,t); setShowModal(false); }}/>}
      <div style={{ position:"relative", display:"flex", alignItems:"stretch", height, background:"#050505", cursor:"pointer", overflow:"hidden", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }} onClick={handleClick}>
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
            <div style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"3px 9px", borderRadius:"2px", fontFamily:"'Unbounded',sans-serif", fontSize:"7px", fontWeight:"700", letterSpacing:"0.08em", textTransform:"uppercase", background:vp.bg, color:vp.color, border:`1px solid ${vp.border}`, marginBottom:log.notes?"8px":"0" }}>{vp.label}</div>
            {log.notes ? <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:"11px", color:"rgba(255,255,255,0.3)", lineHeight:"1.5", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{hl(log.notes,searchTerm)}</div>
              : <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:"7px", color:"#1e1e1e", letterSpacing:"0.1em", cursor:"pointer" }} onClick={e => { e.stopPropagation(); onEdit(); }}>+ ADD NOTES</div>}
          </div>
        </div>
      </div>
    </>
  );

  // ── SMALL LAYOUT (full-bleed two-up) ─────────────────────────────────────
  return (
    <>
      {showModal && <NotesModal log={log} theme={theme} darkMode={darkMode} onClose={() => setShowModal(false)} onSave={t => { onNotesUpdate?.(log.id,t); setShowModal(false); }}/>}
      <div style={{ position:"relative", flex:1, height, overflow:"hidden", cursor:"pointer", background:"#050505", transition:"height 0.38s cubic-bezier(0.4,0,0.2,1)" }} onClick={handleClick}>
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
    </>
  );
};

// ─── EDITORIAL FEED ───────────────────────────────────────────────────────────
// Tap any card once  → it expands to hero in place. Previous hero shrinks.
// Tap the expanded card again → notes slide opens (if notes exist).
// Nothing moves position. Everything animates height in place.
export const EditorialFeed = ({ logs, theme, darkMode, getVerdictStyle, onEdit, onDelete, searchTerm, collections, onMapClick, onNotesUpdate }) => {
  const [expandedId, setExpandedId] = useState(() => logs[0]?.id ?? null);
  const [notesOpen,  setNotesOpen]  = useState(false);

  useEffect(() => {
    if (!logs.length) { setExpandedId(null); return; }
    if (!logs.find(l => l.id === expandedId)) { setExpandedId(logs[0].id); setNotesOpen(false); }
  }, [logs]);

  if (!logs.length) return null;

  // Tap logic:
  // • Tap a collapsed card → expand it in place (previous hero shrinks, notes close).
  // • Tap the already-expanded card → open notes (never collapses on tap).
  // • Only tapping a DIFFERENT card collapses the current hero.
  const handleTap = (id) => {
    if (id !== expandedId) {
      setExpandedId(id);
      setNotesOpen(false);
    } else {
      // Already the hero — open notes if they exist (don't collapse)
      const log = logs.find(l => l.id === id);
      if (log?.notes) setNotesOpen(true);
    }
  };

  // Fixed rhythm for non-expanded cards:
  // Position in feed (excluding nothing — all cards stay) → size
  // rhythm of sizes for non-hero slots: medium, medium, small, small, medium, medium, small, small...
  const sizeAtSlot = (slotIndex) => {
    const pos = slotIndex % 4;
    return (pos === 2 || pos === 3) ? "small" : "medium";
  };

  const border = "1px solid rgba(255,255,255,0.05)";

  // Assign page numbers in list order (expanded card gets "01")
  let pageCounter = 2;
  const meta = logs.map((log, i) => {
    if (log.id === expandedId) return { size:"hero", page:"01" };
    const slotIndex = logs.slice(0,i).filter(l => l.id !== expandedId).length;
    const size = sizeAtSlot(slotIndex);
    const p = pageCounter++;
    return { size, page: p < 10 ? `0${p}` : `${p}` };
  });

  // Group consecutive smalls into pairs for side-by-side layout
  const rows = [];
  let i = 0;
  while (i < logs.length) {
    if (meta[i].size === "small" && i+1 < logs.length && meta[i+1].size === "small") {
      rows.push({ type:"pair", indices:[i, i+1] });
      i += 2;
    } else {
      rows.push({ type:"single", index:i });
      i++;
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      {rows.map((row, rowIdx) => {
        if (row.type === "pair") {
          const [ia, ib] = row.indices;
          return (
            <div key={`${logs[ia].id}-${logs[ib].id}`} style={{ display:"flex", borderBottom:border }}>
              <div style={{ flex:1, overflow:"hidden" }}>
                <Card log={logs[ia]} size={meta[ia].size} isExpanded={logs[ia].id===expandedId} notesOpen={notesOpen && logs[ia].id===expandedId}
                  onCardTap={() => handleTap(logs[ia].id)} onNotesClose={() => setNotesOpen(false)}
                  theme={theme} darkMode={darkMode} pageNum={meta[ia].page} searchTerm={searchTerm}
                  onEdit={() => onEdit(logs[ia])} onDelete={() => onDelete(logs[ia].id)} onMapClick={onMapClick} onNotesUpdate={onNotesUpdate}/>
              </div>
              <div style={{ width:"1px", background:"rgba(255,255,255,0.05)", flexShrink:0 }}/>
              <div style={{ flex:1, overflow:"hidden" }}>
                <Card log={logs[ib]} size={meta[ib].size} isExpanded={logs[ib].id===expandedId} notesOpen={notesOpen && logs[ib].id===expandedId}
                  onCardTap={() => handleTap(logs[ib].id)} onNotesClose={() => setNotesOpen(false)}
                  theme={theme} darkMode={darkMode} pageNum={meta[ib].page} searchTerm={searchTerm}
                  onEdit={() => onEdit(logs[ib])} onDelete={() => onDelete(logs[ib].id)} onMapClick={onMapClick} onNotesUpdate={onNotesUpdate}/>
              </div>
            </div>
          );
        }
        const log = logs[row.index];
        return (
          <div key={log.id} style={{ borderBottom:border }}>
            <Card log={log} size={meta[row.index].size} isExpanded={log.id===expandedId} notesOpen={notesOpen && log.id===expandedId}
              onCardTap={() => handleTap(log.id)} onNotesClose={() => setNotesOpen(false)}
              theme={theme} darkMode={darkMode} pageNum={meta[row.index].page} searchTerm={searchTerm}
              onEdit={() => onEdit(log)} onDelete={() => onDelete(log.id)} onMapClick={onMapClick} onNotesUpdate={onNotesUpdate}/>
          </div>
        );
      })}
    </div>
  );
};
