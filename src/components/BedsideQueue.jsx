import React, { useState } from "react";
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

const serif = "'Instrument Serif', 'Georgia', serif";
const mono  = "'Bebas Neue', monospace";

// ─── PROGRESS HELPERS ────────────────────────────────────────────────────────
const getProgress = log => {
  const pc = PROGRESS_CONFIG[log.media_type];
  if (!pc) return null;
  if (pc.type === "pages") {
    const cur = Number(log.current_page);
    const tot = Number(log.total_pages);
    if (!cur) return null;
    return {
      type: "pages",
      label: tot ? `Page ${cur} of ${tot}` : `Page ${cur}`,
      pct:   tot ? Math.min(100, Math.round((cur / tot) * 100)) : null,
      cur, tot,
    };
  }
  if (pc.type === "episodes") {
    const cur = Number(log.current_episode);
    const tot = Number(log.total_episodes);
    const sea = log.current_season ? `S${log.current_season} · ` : "";
    if (!cur) return null;
    return {
      type: "episodes",
      label: tot ? `${sea}Ep ${cur} of ${tot}` : `${sea}Ep ${cur}`,
      pct:   tot ? Math.min(100, Math.round((cur / tot) * 100)) : null,
      cur, tot,
    };
  }
  return null;
};

// Verdict display config for queue verdicts
const QUEUE_VERDICT = v => ({
  "Currently reading":   { label:"Currently Reading",   color:"#f1c40f", dot:true },
  "Currently watching":  { label:"Currently Watching",  color:"#9b59b6", dot:true },
  "Currently listening": { label:"Currently Listening", color:"#1abc9c", dot:true },
  "Want to read":        { label:"Want to Read",        color:"#3498db", dot:false },
  "Want to watch":       { label:"Want to Watch",       color:"#9b59b6", dot:false },
  "Want to listen":      { label:"Want to Listen",      color:"#1abc9c", dot:false },
  "Want to go":          { label:"Want to Go",          color:"#e67e22", dot:false },
}[v] || { label: v, color:"#888", dot:false });

// ─── ARTWORK ─────────────────────────────────────────────────────────────────
const ArtworkBlock = ({ log, size = "hero" }) => {
  const [err, setErr] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const isRead = ["Book","Comic / Graphic Novel","Short Story / Essay","Audiobook"].includes(log.media_type);
  const { color1, color2 } = generateCoverGradient(log.title || "");

  const dims = size === "hero"
    ? { w:64, h:88, fontSize:28, textSize:12 }
    : { w:34, h:46, fontSize:16, textSize:9  };

  const fallback = isRead ? (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${color1},${color2})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"6px", textAlign:"center", gap:"4px" }}>
      <div style={{ fontFamily:serif, color:"#fff", fontSize:dims.textSize, lineHeight:1.2, wordBreak:"break-word", overflow:"hidden", maxHeight:"60%" }}>{log.title}</div>
    </div>
  ) : (
    <div style={{ width:"100%", height:"100%", background:`linear-gradient(145deg,${ss.color}33,${ss.color}11)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontSize:dims.fontSize, opacity:0.7 }}>{ss.icon}</span>
    </div>
  );

  return (
    <div style={{ width:dims.w, height:dims.h, borderRadius: size==="hero"?"7px":"4px", overflow:"hidden", flexShrink:0, position:"relative", boxShadow: size==="hero" ? "0 8px 24px rgba(0,0,0,0.6)" : "0 4px 12px rgba(0,0,0,0.4)" }}>
      {log.artwork && !err
        ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={() => setErr(true)}/>
        : fallback
      }
      {/* Bookmark ribbon on hero */}
      {size === "hero" && (
        <div style={{ position:"absolute", top:0, right:8, width:10, height:16, background:`linear-gradient(to bottom,${QUEUE_VERDICT(log.verdict).color},${QUEUE_VERDICT(log.verdict).color}aa)`, clipPath:"polygon(0 0,100% 0,100% 100%,50% 85%,0 100%)" }}/>
      )}
    </div>
  );
};

// ─── DOTS MENU ────────────────────────────────────────────────────────────────
const DotsMenu = ({ log, onEdit, onDelete, onClose, darkMode, theme }) => (
  <div
    onClick={e => e.stopPropagation()}
    style={{ position:"absolute", top:32, right:10, zIndex:30, background:darkMode?"#1a1a14":"#fff", border:`1px solid rgba(255,180,60,0.15)`, borderRadius:"10px", overflow:"hidden", minWidth:"140px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)", animation:"bedsideFadeIn 0.15s ease" }}
  >
    <style>{`@keyframes bedsideFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <button onClick={() => { onEdit(); onClose(); }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", borderBottom:`1px solid rgba(255,180,60,0.08)`, color:darkMode?"rgba(245,232,200,0.8)":"#222", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>✏️ Edit entry</button>
    <button onClick={() => { if (window.confirm(`Delete "${log.title}"?`)) { onDelete(); onClose(); } }} style={{ width:"100%", padding:"12px 14px", background:"none", border:"none", color:"#e74c3c", fontSize:"12px", fontWeight:"600", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:"8px" }}>🗑 Delete</button>
    <button onClick={onClose} style={{ width:"100%", padding:"9px 14px", background:"none", border:"none", borderTop:`1px solid rgba(255,180,60,0.06)`, color:"#555", fontSize:"11px", cursor:"pointer", textAlign:"left" }}>Cancel</button>
  </div>
);

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgressBar = ({ log, amber = true }) => {
  const prog = getProgress(log);
  if (!prog) return null;
  const barColor = amber
    ? "linear-gradient(90deg,rgba(241,196,15,0.5),#f1c40f)"
    : "linear-gradient(90deg,rgba(241,196,15,0.3),rgba(241,196,15,0.6))";

  return (
    <div style={{ padding:"10px 16px 12px", borderTop:"1px solid rgba(255,180,60,0.06)", display:"flex", alignItems:"center", gap:"10px" }}>
      <div style={{ fontFamily:mono, fontSize:"8px", letterSpacing:"0.06em", color:"rgba(255,180,60,0.35)", whiteSpace:"nowrap" }}>{prog.label}</div>
      {prog.pct !== null && (
        <>
          <div style={{ flex:1, height:"2px", background:"rgba(255,255,255,0.05)", borderRadius:"2px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${prog.pct}%`, background:barColor, borderRadius:"2px", transition:"width 0.4s ease" }}/>
          </div>
          <div style={{ fontFamily:mono, fontSize:"8px", color:"rgba(255,180,60,0.35)", whiteSpace:"nowrap" }}>{prog.pct}%</div>
        </>
      )}
    </div>
  );
};

// ─── HERO CARD (currently in progress — most recent) ─────────────────────────
const HeroCard = ({ log, onEdit, onDelete, onNotesUpdate, theme, darkMode, isPromoted, onPromote, onDemote, showPromote, showDemote }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ss  = getSubtypeStyle(log.media_type);
  const vq  = QUEUE_VERDICT(log.verdict);

  return (
    <>
      {showModal && (
        <NotesModal log={log} theme={theme} darkMode={darkMode}
          onClose={() => setShowModal(false)}
          onSave={t => { onNotesUpdate?.(log.id, t); setShowModal(false); }}
        />
      )}
      <div style={{ margin:"0 16px", background:"rgba(255,180,60,0.04)", border:"1px solid rgba(255,180,60,0.14)", borderRadius:"16px", overflow:"hidden", position:"relative" }}>
        {/* Top glow line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,180,60,0.35),transparent)" }}/>

        {/* Dots menu */}
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          style={{ position:"absolute", top:10, right:10, zIndex:10, width:24, height:24, borderRadius:"50%", border:"1px solid rgba(255,180,60,0.14)", background:"rgba(0,0,0,0.3)", color:"rgba(255,180,60,0.4)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"1px" }}
        >···</button>
        {menuOpen && <DotsMenu log={log} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)} darkMode={darkMode} theme={theme}/>}

        {/* Main content */}
        <div style={{ display:"flex", gap:14, padding:16, alignItems:"flex-start" }}>
          <ArtworkBlock log={log} size="hero"/>
          <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
            <div style={{ fontFamily:mono, fontSize:8, letterSpacing:"0.2em", color:`${vq.color}66`, marginBottom:5 }}>
              {ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}
            </div>
            <div style={{ fontFamily:serif, fontSize:20, color:"#f5e8c8", lineHeight:1.15, marginBottom:4 }}>{log.title}</div>
            {log.year_released && <div style={{ fontSize:10, color:"rgba(255,220,150,0.25)", marginBottom:10 }}>{log.year_released}</div>}
            {/* Status badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background:`rgba(${vq.color==="#f1c40f"?"241,196,15":"155,89,182"},0.1)`, border:`1px solid ${vq.color}33`, fontFamily:mono, fontSize:8, letterSpacing:"0.12em", color:vq.color }}>
              {vq.dot && <span style={{ width:5, height:5, borderRadius:"50%", background:vq.color, boxShadow:`0 0 6px ${vq.color}`, animation:"bedsidePulse 2s ease-in-out infinite" }}/>}
              {vq.label}
            </div>
            <style>{`@keyframes bedsidePulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            {/* Notes preview */}
            {log.notes && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,180,60,0.06)" }}>
                <div style={{ fontFamily:serif, fontStyle:"italic", fontSize:12, color:"rgba(255,220,150,0.35)", lineHeight:1.7, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden", cursor:"pointer" }} onClick={() => setShowModal(true)}>
                  {log.notes}
                </div>
                <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.15em", color:"rgba(255,180,60,0.2)", marginTop:4 }} onClick={() => setShowModal(true)}>TAP TO READ →</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar log={log} amber={true}/>

        {/* Promote/demote controls */}
        {(showPromote || showDemote) && (
          <div style={{ padding:"6px 16px 12px", display:"flex", gap:6, borderTop:"1px solid rgba(255,180,60,0.04)" }}>
            {showDemote && (
              <button onClick={onDemote} style={{ flex:1, padding:"6px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", background:"none", color:"rgba(255,255,255,0.2)", fontFamily:mono, fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>↓ MOVE DOWN</button>
            )}
            {showPromote && (
              <button onClick={onPromote} style={{ flex:1, padding:"6px", borderRadius:8, border:"1px solid rgba(255,180,60,0.15)", background:"rgba(255,180,60,0.04)", color:"rgba(255,180,60,0.5)", fontFamily:mono, fontSize:8, letterSpacing:"0.1em", cursor:"pointer" }}>↑ MOVE UP</button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─── MEDIUM CARD (other in-progress items) ────────────────────────────────────
const MediumCard = ({ log, onEdit, onDelete, onNotesUpdate, theme, darkMode, onPromote, onDemote, showPromote, showDemote }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const vq = QUEUE_VERDICT(log.verdict);

  return (
    <>
      {showModal && (
        <NotesModal log={log} theme={theme} darkMode={darkMode}
          onClose={() => setShowModal(false)}
          onSave={t => { onNotesUpdate?.(log.id, t); setShowModal(false); }}
        />
      )}
      <div style={{ borderBottom:"1px solid rgba(255,180,60,0.06)", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px" }}>
          <ArtworkBlock log={log} size="small"/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.18em", color:"rgba(255,180,60,0.25)", marginBottom:3 }}>{ss.icon} {log.media_type}</div>
            <div style={{ fontFamily:serif, fontSize:16, color:"rgba(245,232,200,0.75)", lineHeight:1.2, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
            <div style={{ fontSize:10, color:"rgba(255,180,60,0.2)", marginBottom:6 }}>{log.creator}</div>
            {/* Inline progress if available */}
            {(() => { const p = getProgress(log); return p ? (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, height:"2px", background:"rgba(255,255,255,0.04)", borderRadius:2, overflow:"hidden" }}>
                  {p.pct !== null && <div style={{ height:"100%", width:`${p.pct}%`, background:"rgba(241,196,15,0.4)", borderRadius:2 }}/>}
                </div>
                <div style={{ fontFamily:mono, fontSize:7, color:"rgba(255,180,60,0.25)", whiteSpace:"nowrap" }}>{p.label}</div>
              </div>
            ) : (
              <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 7px", borderRadius:20, border:`1px solid ${vq.color}22`, fontFamily:mono, fontSize:7, letterSpacing:"0.1em", color:`${vq.color}66` }}>
                {vq.dot && <span style={{ width:4, height:4, borderRadius:"50%", background:vq.color, animation:"bedsidePulse 2s ease-in-out infinite" }}/>}
                {vq.label}
              </div>
            ); })()}
          </div>

          {/* Promote/demote + dots */}
          <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"center", flexShrink:0 }}>
            {showPromote && (
              <button onClick={onPromote} style={{ width:22, height:22, borderRadius:"50%", border:"1px solid rgba(255,180,60,0.2)", background:"rgba(255,180,60,0.04)", color:"rgba(255,180,60,0.5)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>↑</button>
            )}
            <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }} style={{ width:22, height:22, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.06)", background:"none", color:"rgba(255,255,255,0.15)", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"0.5px" }}>···</button>
            {showDemote && (
              <button onClick={onDemote} style={{ width:22, height:22, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.06)", background:"none", color:"rgba(255,255,255,0.1)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>↓</button>
            )}
          </div>
        </div>
        {menuOpen && <DotsMenu log={log} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)} darkMode={darkMode} theme={theme}/>}
      </div>
    </>
  );
};

// ─── WISHLIST ITEM ────────────────────────────────────────────────────────────
const WishlistItem = ({ log, onEdit, onDelete, theme, darkMode, index }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ss = getSubtypeStyle(log.media_type);
  const vq = QUEUE_VERDICT(log.verdict);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", position:"relative" }}>
      <ArtworkBlock log={log} size="small"/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.14em", color:"#2a2a2a", marginBottom:3 }}>{ss.icon} {log.media_type}</div>
        <div style={{ fontFamily:serif, fontSize:15, color:"rgba(255,255,255,0.55)", lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
        {log.creator && <div style={{ fontSize:10, color:"#2a2a2a", marginTop:2 }}>{log.creator}</div>}
        {(log.location_venue || log.location_city) && (
          <div style={{ fontSize:9, color:"rgba(230,126,34,0.5)", marginTop:3 }}>📍 {[log.location_venue,log.location_city].filter(Boolean).join(", ")}</div>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
        <div style={{ fontFamily:mono, fontSize:7, letterSpacing:"0.06em", padding:"2px 7px", borderRadius:20, border:`1px solid ${vq.color}22`, color:`${vq.color}55` }}>{vq.label}</div>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }} style={{ width:20, height:20, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.06)", background:"none", color:"rgba(255,255,255,0.12)", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"0.5px" }}>···</button>
      </div>
      {menuOpen && <DotsMenu log={log} onEdit={onEdit} onDelete={onDelete} onClose={() => setMenuOpen(false)} darkMode={darkMode} theme={theme}/>}
    </div>
  );
};

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
const SectionDivider = ({ left, right, amber = false }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px 10px" }}>
    {amber && <div style={{ width:6, height:6, borderRadius:"50%", background:"#f1c40f", boxShadow:"0 0 8px rgba(241,196,15,0.8)", animation:"bedsidePulse 2s ease-in-out infinite", flexShrink:0 }}/>}
    <div style={{ fontFamily:mono, fontSize:9, letterSpacing:"0.28em", color: amber ? "rgba(255,180,60,0.45)" : "rgba(255,255,255,0.1)", whiteSpace:"nowrap" }}>{left}</div>
    <div style={{ flex:1, height:1, background: amber ? "rgba(255,180,60,0.08)" : "rgba(255,255,255,0.04)" }}/>
    {right && <div style={{ fontFamily:mono, fontSize:9, letterSpacing:"0.1em", color:"rgba(255,255,255,0.08)", whiteSpace:"nowrap" }}>{right}</div>}
  </div>
);

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export const BedsideQueue = ({ logs, theme, darkMode, onEdit, onDelete, onNotesUpdate, filter }) => {
  // Split into active (currently...) and wishlist (want to...)
  const active   = logs.filter(l => l.verdict?.startsWith("Currently")).sort((a,b) => new Date(b.logged_at) - new Date(a.logged_at));
  const wishlist = logs.filter(l => l.verdict?.startsWith("Want to") || l.verdict === "Want to go");

  // Maintain local order for active — hero is always index 0
  const [order, setOrder] = useState(() => active.map(l => l.id));

  // Sync order when active changes
  const syncedOrder = [
    ...order.filter(id => active.find(l => l.id === id)),
    ...active.filter(l => !order.includes(l.id)).map(l => l.id),
  ];

  const orderedActive = syncedOrder.map(id => active.find(l => l.id === id)).filter(Boolean);

  const promote = id => {
    setOrder(prev => {
      const i = prev.indexOf(id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i-1], next[i]] = [next[i], next[i-1]];
      return next;
    });
  };
  const demote = id => {
    setOrder(prev => {
      const i = prev.indexOf(id);
      if (i < 0 || i >= prev.length-1) return prev;
      const next = [...prev];
      [next[i], next[i+1]] = [next[i+1], next[i]];
      return next;
    });
  };

  if (logs.length === 0) return null;

  return (
    <div style={{ background:"#070604" }}>
      {/* Lamp glow */}
      <div style={{ height:4, background:"linear-gradient(90deg,transparent 10%,rgba(255,200,80,0.1) 40%,rgba(255,220,100,0.2) 50%,rgba(255,200,80,0.1) 60%,transparent 90%)" }}/>

      {/* ── IN PROGRESS ── */}
      {orderedActive.length > 0 && (
        <>
          <SectionDivider left="NOW · IN PROGRESS" right={`${orderedActive.length} active`} amber/>
          {orderedActive.map((log, i) => (
            <div key={log.id}>
              {i === 0 ? (
                <HeroCard
                  log={log} theme={theme} darkMode={darkMode}
                  onEdit={() => onEdit(log)} onDelete={() => onDelete(log.id)}
                  onNotesUpdate={onNotesUpdate}
                  showPromote={false}
                  showDemote={orderedActive.length > 1}
                  onDemote={() => demote(log.id)}
                />
              ) : (
                <>
                  {/* Separator before first medium card */}
                  {i === 1 && <div style={{ height:1, background:"rgba(255,180,60,0.04)", margin:"10px 16px 0" }}/>}
                  <MediumCard
                    log={log} theme={theme} darkMode={darkMode}
                    onEdit={() => onEdit(log)} onDelete={() => onDelete(log.id)}
                    onNotesUpdate={onNotesUpdate}
                    showPromote={true}
                    showDemote={i < orderedActive.length-1}
                    onPromote={() => promote(log.id)}
                    onDemote={() => demote(log.id)}
                  />
                </>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── WISHLIST ── */}
      {wishlist.length > 0 && (
        <>
          <SectionDivider left="NEXT UP" right={`${wishlist.length} in queue`}/>
          <div style={{ padding:"0 16px" }}>
            {wishlist.map((log, i) => (
              <WishlistItem
                key={log.id} log={log} index={i+1}
                theme={theme} darkMode={darkMode}
                onEdit={() => onEdit(log)} onDelete={() => onDelete(log.id)}
              />
            ))}
          </div>
          <div style={{ height:12 }}/>
        </>
      )}
    </div>
  );
};
