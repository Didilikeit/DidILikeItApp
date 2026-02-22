import React, { useState, useEffect, useRef } from "react";
import { getSubtypeStyle, generateCoverGradient } from "../utils/helpers.js";
import { PROGRESS_CONFIG } from "../utils/constants.js";
import { NotesModal } from "./NotesModal.jsx";

// Inject fonts once
if (!document.getElementById("bedside-fonts")) {
  const l = document.createElement("link");
  l.id = "bedside-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Bebas+Neue&display=swap";
  document.head.appendChild(l);
}

const serif = "'Instrument Serif','Georgia',serif";
const mono  = "'Bebas Neue',monospace";

// ─── PROGRESS ────────────────────────────────────────────────────────────────
const getProgress = log => {
  const pc = PROGRESS_CONFIG[log.media_type];
  if (!pc) return null;
  if (pc.type === "pages") {
    const cur = Number(log.current_page), tot = Number(log.total_pages);
    if (!cur) return null;
    return { label: tot ? `Page ${cur} of ${tot}` : `Page ${cur}`, pct: tot ? Math.min(100, Math.round((cur/tot)*100)) : null };
  }
  if (pc.type === "episodes") {
    const cur = Number(log.current_episode), tot = Number(log.total_episodes);
    const sea = log.current_season ? `S${log.current_season} · ` : "";
    if (!cur) return null;
    return { label: tot ? `${sea}Ep ${cur} of ${tot}` : `${sea}Ep ${cur}`, pct: tot ? Math.min(100, Math.round((cur/tot)*100)) : null };
  }
  return null;
};

const QUEUE_VERDICT = v => ({
  "Currently reading":   { label:"Currently Reading",   color:"#f1c40f", dot:true  },
  "Currently watching":  { label:"Currently Watching",  color:"#9b59b6", dot:true  },
  "Currently listening": { label:"Currently Listening", color:"#1abc9c", dot:true  },
  "Want to read":        { label:"Want to Read",        color:"#3498db", dot:false },
  "Want to watch":       { label:"Want to Watch",       color:"#9b59b6", dot:false },
  "Want to listen":      { label:"Want to Listen",      color:"#1abc9c", dot:false },
  "Want to go":          { label:"Want to Go",          color:"#e67e22", dot:false },
}[v] || { label: v || "–", color:"#888", dot:false });

// ─── ARTWORK ─────────────────────────────────────────────────────────────────
const ArtworkBlock = ({ log, size }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const isRead = ["Book","Comic / Graphic Novel","Short Story / Essay","Audiobook"].includes(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const dims = size === "hero" ? { w:64, h:88, fontSize:12, iconSize:28 }
             : size === "wish" ? { w:40, h:56, fontSize:10, iconSize:18 }
             :                   { w:34, h:46, fontSize:9,  iconSize:15 };

  const fallback = isRead ? (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${color1},${color2})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4px", textAlign:"center" }}>
      <div style={{ fontFamily:serif, color:"#fff", fontSize:dims.fontSize, lineHeight:1.2, wordBreak:"break-word", overflow:"hidden" }}>{log.title}</div>
    </div>
  ) : (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${ss.color}33,${ss.color}11)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontSize:dims.iconSize, opacity:0.7 }}>{ss.icon}</span>
    </div>
  );

  const vq = QUEUE_VERDICT(log.verdict);
  return (
    <div style={{ width:dims.w, height:dims.h, borderRadius:size==="hero"?"7px":"4px", overflow:"hidden", flexShrink:0, position:"relative", boxShadow:size==="hero"?"0 8px 24px rgba(0,0,0,0.6)":"0 4px 12px rgba(0,0,0,0.4)" }}>
      {log.artwork && !err ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={() => setErr(true)}/> : fallback}
      {size === "hero" && (
        <div style={{ position:"absolute", top:0, right:8, width:10, height:16, background:vq.color, clipPath:"polygon(0 0,100% 0,100% 100%,50% 85%,0 100%)", opacity:0.8 }}/>
      )}
    </div>
  );
};

// ─── NOTES SLIDE ─────────────────────────────────────────────────────────────
// Rendered inside a FIXED overlay so overflow:hidden on card wrappers never clips it.
// The 22% left strip is the tappable backdrop to dismiss.
const NotesSlide = ({ log, theme, darkMode, onClose, onExpand, onNotesUpdate }) => {
  const vq = QUEUE_VERDICT(log.verdict);
  const [localNotes, setLocalNotes] = useState(log.notes || "");
  const [editing, setEditing] = useState(false);
  const handleSave = () => { onNotesUpdate?.(log.id, localNotes); setEditing(false); };
  useEffect(() => { setLocalNotes(log.notes || ""); }, [log.notes]);

  const btn = {
    flex:1, padding:"8px 4px", borderRadius:"6px",
    border:"1px solid rgba(255,180,60,0.1)", background:"none",
    color:"rgba(255,180,60,0.4)", fontFamily:mono, fontSize:"9px",
    letterSpacing:"0.12em", cursor:"pointer", textAlign:"center",
  };

  return (
    // Full-screen fixed overlay — sits above everything, not clipped by any card
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
      {/* 22% tappable backdrop — tap here to dismiss */}
      <div
        onClick={onClose}
        style={{ width:"22%", flexShrink:0, cursor:"pointer", background:"transparent" }}
      />
      {/* Notes panel — 78% */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex:1,
          background:"rgba(4,3,1,0.97)",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          display:"flex", flexDirection:"column",
          borderLeft:"1px solid rgba(255,180,60,0.1)",
          animation:"bsSlideIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
          boxShadow:"-20px 0 60px rgba(0,0,0,0.8)",
        }}
      >
        <style>{`
          @keyframes bsSlideIn { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
          @keyframes bedsidePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes bedsideFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Fade edge on the left */}
        <div style={{ position:"absolute", top:0, left:"-20px", bottom:0, width:"20px", background:"linear-gradient(to right,transparent,rgba(4,3,1,0.97))", pointerEvents:"none" }}/>

        {/* Header */}
        <div style={{ padding:"20px 16px 12px", flexShrink:0 }}>
          <div style={{ fontFamily:mono, fontSize:"8px", letterSpacing:"0.22em", color:"rgba(255,180,60,0.2)", marginBottom:"8px" }}>MY NOTES</div>
          <div style={{ fontFamily:serif, fontSize:"18px", color:"#f5e8c8", lineHeight:1.2, marginBottom:"5px" }}>{log.title}</div>
          {log.creator && <div style={{ fontFamily:mono, fontSize:"8px", letterSpacing:"0.1em", color:"rgba(255,180,60,0.25)", marginBottom:"8px" }}>{log.creator}</div>}
          <div style={{ fontFamily:mono, fontSize:"8px", letterSpacing:"0.1em", color:vq.color, marginBottom:"14px", opacity:0.7 }}>{vq.label}</div>
          <div style={{ height:"1px", background:"rgba(255,180,60,0.08)" }}/>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", WebkitOverflowScrolling:"touch" }}>
          {editing ? (
            <textarea
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              autoFocus
              style={{ width:"100%", minHeight:"160px", background:"none", border:"1px solid rgba(255,180,60,0.14)", borderRadius:"10px", padding:"12px", fontFamily:serif, fontStyle:"italic", fontSize:"14px", color:"rgba(255,220,150,0.85)", lineHeight:1.85, resize:"vertical", outline:"none", boxSizing:"border-box" }}
            />
          ) : (
            <div style={{ fontFamily:serif, fontStyle:"italic", fontSize:"14px", color:"rgba(255,220,150,0.6)", lineHeight:1.85, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {log.notes || <span style={{ color:"rgba(255,180,60,0.15)", fontFamily:mono, fontSize:"8px", letterSpacing:"0.1em" }}>NO NOTES YET</span>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding:"12px 16px 20px", borderTop:"1px solid rgba(255,180,60,0.07)", flexShrink:0 }}>
          {editing ? (
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={handleSave} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:"rgba(241,196,15,0.15)", color:"#f1c40f", fontFamily:mono, fontSize:"9px", letterSpacing:"0.12em", cursor:"pointer" }}>SAVE</button>
              <button onClick={() => { setLocalNotes(log.notes||""); setEditing(false); }} style={btn}>CANCEL</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={onClose}                style={btn}>✕ CLOSE</button>
              <button onClick={onExpand}               style={btn}>⛶ FULL</button>
              <button onClick={() => setEditing(true)} style={btn}>✏ EDIT</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── DOTS MENU ────────────────────────────────────────────────────────────────
const DotsMenu = ({ log, onEdit, onDelete, onClose, darkMode }) => (
  <div onClick={e => e.stopPropagation()} style={{ position:"absolute", top:32, right:10, zIndex:30, background:darkMode?"#1a1a14":"#fff", border:"1px solid rgba(255,180,60,0.15)", borderRadius:"10px", overflow:"hidden", minWidth:"140px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)", animation:"bedsideFadeIn 0.15s ease" }}>
    <button onClick={() => { onEdit(); onClose(); }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", borderBottom:"1px solid rgba(255,180,60,0.08)", color:darkMode?"rgba(245,232,200,0.8)":"#222", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left" }}>✏️ Edit entry</button>
    <button onClick={() => { if(window.confirm(`Delete "${log.title}"?`)){onDelete();onClose();} }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", color:"#e74c3c", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left" }}>🗑 Delete</button>
    <button onClick={onClose} style={{ width:"100%", padding:"9px 14px", background:"none", border:"none", borderTop:"1px solid rgba(255,180,60,0.06)", color:"#555", fontSize:"11px", cursor:"pointer", textAlign:"left" }}>Cancel</button>
  </div>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgressBar = ({ log }) => {
  const prog = getProgress(log);
  if (!prog) return null;
  return (
    <div style={{ padding:"10px 16px 14px", borderTop:"1px solid rgba(255,180,60,0.06)", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ fontFamily:mono, fontSize:"8px", letterSpacing:"0.06em", color:"rgba(255,180,60,0.4)", whiteSpace:"nowrap" }}>{prog.label}</div>
      {prog.pct !== null && <>
        <div style={{ flex:1, height:"2px", background:"rgba(255,255,255,0.05)", borderRadius:"2px", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${prog.pct}%`, background:"linear-gradient(90deg,rgba(241,196,15,0.5),#f1c40f)", borderRadius:"2px" }}/>
        </div>
        <div style={{ fontFamily:mono, fontSize:"8px", color:"rgba(255,180,60,0.4)", whiteSpace:"nowrap" }}>{prog.pct}%</div>
      </>}
    </div>
  );
};

// ─── QUEUE CARD ───────────────────────────────────────────────────────────────
// Shared component for both active (in-progress) and wishlist items.
// isExpanded: shows full hero layout. Compact when false.
// notesOpen:  notes slide visible (fixed overlay, never clipped).
// onCardTap:  parent decides expand vs notes logic.
const QueueCard = ({ log, isExpanded, notesOpen, onCardTap, onNotesClose, onEdit, onDelete, onNotesUpdate, theme, darkMode, isWishlist }) => {
  const [showModal, setShowModal] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const vq = QUEUE_VERDICT(log.verdict);

  if (isExpanded) {
    // ── EXPANDED (hero) ────────────────────────────────────────────────────────
    // No overflow:hidden on the outer wrapper — notes panel is a fixed overlay.
    return (
      <>
        {showModal && <NotesModal log={log} theme={theme} darkMode={darkMode} onClose={() => setShowModal(false)} onSave={t => { onNotesUpdate?.(log.id,t); setShowModal(false); }}/>}
        {notesOpen && <NotesSlide log={log} theme={theme} darkMode={darkMode} onClose={onNotesClose} onExpand={() => { setShowModal(true); onNotesClose?.(); }} onNotesUpdate={onNotesUpdate}/>}

        <div style={{ margin:"0 16px", background:"rgba(255,180,60,0.04)", border:"1px solid rgba(255,180,60,0.16)", borderRadius:"16px", position:"relative", cursor:"pointer" }}
          onClick={() => { if (!menuOpen) onCardTap(); }}>

          {/* Top amber glow line */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,180,60,0.4),transparent)", borderRadius:"16px 16px 0 0", pointerEvents:"none" }}/>

          {/* Dots menu */}
          <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); onNotesClose?.(); }}
            style={{ position:"absolute", top:10, right:10, zIndex:10, width:24, height:24, borderRadius:"50%", border:"1px solid rgba(255,180,60,0.16)", background:"rgba(0,0,0,0.3)", color:"rgba(255,180,60,0.45)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}>···</button>
          {menuOpen && <DotsMenu log={log} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)} darkMode={darkMode}/>}

          {/* Main content */}
          <div style={{ display:"flex", gap:14, padding:16, alignItems:"flex-start" }}>
            <ArtworkBlock log={log} size="hero"/>
            <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
              {/* Media type + creator */}
              <div style={{ fontFamily:mono, fontSize:8, letterSpacing:"0.2em", color:`${vq.color}66`, marginBottom:6 }}>
                {ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}
              </div>
              {/* Title */}
              <div style={{ fontFamily:serif, fontSize:22, color:"#f5e8c8", lineHeight:1.15, marginBottom:4 }}>{log.title}</div>
              {log.year_released && <div style={{ fontSize:10, color:"rgba(255,220,150,0.25)", marginBottom:12 }}>{log.year_released}</div>}
              {/* Status badge */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 11px", borderRadius:20, background:`rgba(255,180,60,0.07)`, border:`1px solid ${vq.color}2e`, fontFamily:mono, fontSize:8, letterSpacing:"0.12em", color:vq.color }}>
                {vq.dot && <span style={{ width:5, height:5, borderRadius:"50%", background:vq.color, boxShadow:`0 0 6px ${vq.color}`, animation:"bedsidePulse 2s ease-in-out infinite" }}/>}
                {vq.label}
              </div>
              <style>{`@keyframes bedsidePulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

              {/* Location (wishlist items) */}
              {(log.location_venue || log.location_city) && (
                <div style={{ fontSize:11, color:"rgba(230,126,34,0.5)", marginTop:8 }}>📍 {[log.location_venue,log.location_city].filter(Boolean).join(", ")}</div>
              )}

              {/* Notes preview — tapping this area also triggers notes */}
              {log.notes && !notesOpen && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,180,60,0.07)" }}>
                  <div style={{ fontFamily:serif, fontStyle:"italic", fontSize:13, color:"rgba(255,220,150,0.4)", lineHeight:1.75, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{log.notes}</div>
                  <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.15em", color:"rgba(255,180,60,0.22)", marginTop:5 }}>TAP TO READ →</div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar (in-progress items only) */}
          {!isWishlist && <ProgressBar log={log}/>}
        </div>
      </>
    );
  }

  // ── COMPACT (collapsed) ────────────────────────────────────────────────────
  return (
    <div
      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderTop:"1px solid rgba(255,180,60,0.05)", cursor:"pointer", position:"relative" }}
      onClick={() => { if (!menuOpen) onCardTap(); }}
    >
      <ArtworkBlock log={log} size={isWishlist ? "wish" : "small"}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.18em", color:"rgba(255,180,60,0.25)", marginBottom:3 }}>{ss.icon} {log.media_type}</div>
        <div style={{ fontFamily:serif, fontSize:15, color:"rgba(245,232,200,0.6)", lineHeight:1.2, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
        {log.creator && <div style={{ fontSize:10, color:"rgba(255,180,60,0.2)", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.creator}</div>}
        {isWishlist ? (
          <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.08em", padding:"2px 7px", display:"inline-block", borderRadius:20, border:`1px solid ${vq.color}22`, color:`${vq.color}55` }}>{vq.label}</div>
        ) : (
          (() => { const p = getProgress(log); return p ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ flex:1, height:"2px", background:"rgba(255,255,255,0.04)", borderRadius:2, overflow:"hidden" }}>
                {p.pct !== null && <div style={{ height:"100%", width:`${p.pct}%`, background:"rgba(241,196,15,0.4)", borderRadius:2 }}/>}
              </div>
              <div style={{ fontFamily:mono, fontSize:7, color:"rgba(255,180,60,0.25)", whiteSpace:"nowrap" }}>{p.label}</div>
            </div>
          ) : (
            <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.1em", color:`${vq.color}44` }}>{vq.label}</div>
          ); })()
        )}
      </div>
      {/* Location for wishlist compact */}
      {isWishlist && (log.location_venue || log.location_city) && (
        <div style={{ fontSize:9, color:"rgba(230,126,34,0.4)", flexShrink:0, maxWidth:80, textAlign:"right", lineHeight:1.3 }}>📍 {log.location_city || log.location_venue}</div>
      )}
      <button onClick={e => { e.stopPropagation(); setMenuOpen(v=>!v); }} style={{ width:20, height:20, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.06)", background:"none", color:"rgba(255,255,255,0.12)", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"0.5px", flexShrink:0 }}>···</button>
      {menuOpen && <DotsMenu log={log} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)} darkMode={darkMode}/>}
    </div>
  );
};

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
const SectionDivider = ({ left, right, amber = false }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px 10px" }}>
    {amber && <div style={{ width:6, height:6, borderRadius:"50%", background:"#f1c40f", boxShadow:"0 0 8px rgba(241,196,15,0.8)", animation:"bedsidePulse 2s ease-in-out infinite", flexShrink:0 }}/>}
    <div style={{ fontFamily:mono, fontSize:9, letterSpacing:"0.28em", color:amber?"rgba(255,180,60,0.45)":"rgba(255,255,255,0.1)", whiteSpace:"nowrap" }}>{left}</div>
    <div style={{ flex:1, height:1, background:amber?"rgba(255,180,60,0.08)":"rgba(255,255,255,0.04)" }}/>
    {right && <div style={{ fontFamily:mono, fontSize:9, letterSpacing:"0.1em", color:"rgba(255,255,255,0.08)", whiteSpace:"nowrap" }}>{right}</div>}
  </div>
);

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
// One expanded card at a time across ALL items (active + wishlist).
// Tap collapsed → expand. Tap expanded → open notes. Notes close via 22% backdrop or CLOSE btn.
// Expanded card never collapses by tapping itself — only another card's tap collapses it.
export const BedsideQueue = ({ logs, theme, darkMode, onEdit, onDelete, onNotesUpdate }) => {
  const active   = logs.filter(l => l.verdict?.startsWith("Currently")).sort((a,b) => new Date(b.logged_at) - new Date(a.logged_at));
  const wishlist = logs.filter(l => l.verdict?.startsWith("Want to") || l.verdict === "Want to go");
  const allItems = [...active, ...wishlist];

  // Single expanded item across both sections
  const [expandedId, setExpandedId] = useState(() => active[0]?.id ?? wishlist[0]?.id ?? null);
  const [notesOpen,  setNotesOpen]  = useState(false);

  useEffect(() => {
    if (!allItems.length) { setExpandedId(null); return; }
    if (!allItems.find(l => l.id === expandedId)) { setExpandedId(allItems[0].id); setNotesOpen(false); }
  }, [logs]);

  // Tap a collapsed card → expand it (close notes on previous).
  // Tap the already-expanded card → open notes (if notes exist). Never collapses on tap.
  const handleTap = (id) => {
    if (id !== expandedId) {
      setExpandedId(id);
      setNotesOpen(false);
    } else {
      const log = allItems.find(l => l.id === id);
      if (log?.notes) setNotesOpen(true);
    }
  };

  if (!logs.length) return null;

  return (
    <div style={{ background:"#070604" }}>
      <style>{`@keyframes bedsideFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Amber lamp glow */}
      <div style={{ height:4, background:"linear-gradient(90deg,transparent 10%,rgba(255,200,80,0.1) 40%,rgba(255,220,100,0.2) 50%,rgba(255,200,80,0.1) 60%,transparent 90%)" }}/>

      {/* ── IN PROGRESS ── */}
      {active.length > 0 && (
        <>
          <SectionDivider left="NOW · IN PROGRESS" right={`${active.length} active`} amber/>
          {active.map((log, i) => (
            <div key={log.id} style={{ marginBottom: log.id === expandedId ? 14 : 0 }}>
              <QueueCard
                log={log}
                isExpanded={log.id === expandedId}
                notesOpen={notesOpen && log.id === expandedId}
                onCardTap={() => handleTap(log.id)}
                onNotesClose={() => setNotesOpen(false)}
                onEdit={() => onEdit(log)}
                onDelete={() => onDelete(log.id)}
                onNotesUpdate={onNotesUpdate}
                theme={theme}
                darkMode={darkMode}
                isWishlist={false}
              />
            </div>
          ))}
        </>
      )}

      {/* ── NEXT UP ── */}
      {wishlist.length > 0 && (
        <>
          <SectionDivider left="NEXT UP" right={`${wishlist.length} in queue`}/>
          <div style={{ paddingBottom:8 }}>
            {wishlist.map(log => (
              <div key={log.id} style={{ marginBottom: log.id === expandedId ? 14 : 0 }}>
                <QueueCard
                  log={log}
                  isExpanded={log.id === expandedId}
                  notesOpen={notesOpen && log.id === expandedId}
                  onCardTap={() => handleTap(log.id)}
                  onNotesClose={() => setNotesOpen(false)}
                  onEdit={() => onEdit(log)}
                  onDelete={() => onDelete(log.id)}
                  onNotesUpdate={onNotesUpdate}
                  theme={theme}
                  darkMode={darkMode}
                  isWishlist={true}
                />
              </div>
            ))}
          </div>
          <div style={{ height:12 }}/>
        </>
      )}
    </div>
  );
};
