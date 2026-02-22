import React, { useState } from "react";
import { getSubtypeStyle } from "../utils/helpers.js";

export const QueueCard = ({ log, theme, darkMode, getVerdictStyle, onEdit, onDelete, onMapClick }) => {
  const [expanded, setExpanded] = useState(false);
  const vs = getVerdictStyle(log.verdict);
  const ss = getSubtypeStyle(log.media_type);

  return (
    <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"14px", overflow:"hidden" }}>
      <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
        <div style={{ width:"44px", height:"60px", borderRadius:"8px", overflow:"hidden", flexShrink:0, background:darkMode?"#1a1a1a":"#eee", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {log.artwork
            ? <img src={log.artwork} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"} />
            : <span style={{ fontSize:"20px" }}>{ss.icon}</span>}
        </div>

        <div style={{ flex:1, overflow:"hidden" }}>
          <div style={{ fontWeight:"700", fontSize:"14px", color:theme.text, lineHeight:"1.3", marginBottom:"3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{log.title}</div>
          <div style={{ fontSize:"12px", color:theme.subtext2, marginBottom:"6px" }}>{log.creator}{log.year_released ? ` · ${log.year_released}` : ""}</div>
          <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
            <span style={{ fontSize:"9px", fontWeight:"700", padding:"2px 7px", borderRadius:"20px", border:`1px solid ${vs.border}`, background:vs.bg, color:vs.color }}>{vs.emoji} {log.verdict}</span>
            {log.genre && <span style={{ fontSize:"9px", fontWeight:"600", padding:"2px 7px", borderRadius:"20px", border:`1px solid ${theme.border}`, color:theme.subtext }}>{log.genre}</span>}
            {(log.location_city || log.location_venue) && <span style={{ fontSize:"9px", fontWeight:"600", padding:"2px 7px", borderRadius:"20px", border:`1px solid ${theme.border}`, color:"#e67e22" }}>📍 {log.location_city || log.location_venue}</span>}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"5px", flexShrink:0 }}>
          {log.lat && log.lng && onMapClick && (
            <button onClick={() => onMapClick(log)} style={{ padding:"5px 8px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:"#e67e22", fontSize:"11px", cursor:"pointer" }}>🗺</button>
          )}
          <button onClick={() => onEdit()} style={{ padding:"5px 10px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:"#3498db", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>Edit</button>
          <button onClick={() => onDelete()} style={{ padding:"5px 10px", borderRadius:"8px", border:`1px solid ${theme.border}`, background:"none", color:"#e74c3c", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>Del</button>
        </div>
      </div>

      {log.notes && (
        <div style={{ borderTop:`1px solid ${theme.border}` }}>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:"9px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px" }}>💭 Thoughts</div>
            <div style={{ fontSize:"12px", color:theme.subtext2, fontStyle:"italic", lineHeight:"1.7", borderLeft:`2px solid ${theme.border2}`, paddingLeft:"10px", whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight: expanded ? "none" : "calc(1.7em * 3)", overflow: expanded ? "visible" : "hidden" }}>
              {log.notes}
            </div>
          </div>
          {log.notes.length > 80 && (
            <button onClick={() => setExpanded(v => !v)} style={{ width:"100%", padding:"8px", background:darkMode?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)", border:"none", borderTop:`1px solid ${theme.border}`, color:"#3498db", fontSize:"11px", fontWeight:"600", cursor:"pointer" }}>
              {expanded ? "↑ Show less" : "↓ Read more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
