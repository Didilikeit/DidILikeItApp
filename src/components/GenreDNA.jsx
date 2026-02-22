import React, { useState, useMemo } from "react";
import { CATEGORIES } from "../utils/constants.js";
import { getCat } from "../utils/helpers.js";

export const GenreDNA = ({ logs, theme, statYearFilter }) => {
  const [activeTab, setActiveTab] = useState("Watched");

  const genreData = useMemo(() => {
    const result = {};
    Object.keys(CATEGORIES).forEach(cat => { result[cat] = {}; });
    logs.forEach(l => {
      if (!l.genre) return;
      if (statYearFilter !== "All" && new Date(l.logged_at).getFullYear().toString() !== statYearFilter) return;
      if (l.verdict?.startsWith("Want to") || l.verdict === "Want to go" || l.verdict?.startsWith("Currently")) return;
      const cat = getCat(l.media_type);
      result[cat][l.genre] = (result[cat][l.genre] || 0) + 1;
    });
    return result;
  }, [logs, statYearFilter]);

  const genres = useMemo(() =>
    Object.entries(genreData[activeTab] || {}).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [genreData, activeTab]
  );

  const max = genres[0]?.[1] || 1;
  const color = CATEGORIES[activeTab]?.color || "#888";

  return (
    <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"16px", padding:"16px" }}>
      <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"12px" }}>Genre DNA</div>

      <div style={{ display:"flex", gap:"4px", marginBottom:"16px", overflowX:"auto", paddingBottom:"2px" }}>
        {Object.entries(CATEGORIES).map(([cat, def]) => {
          const active = activeTab === cat;
          return (
            <button key={cat} onClick={() => setActiveTab(cat)}
              style={{ flexShrink:0, padding:"4px 10px", borderRadius:"20px", border:`1px solid ${active ? def.color : theme.border}`, background: active ? `${def.color}18` : "none", color: active ? def.color : theme.subtext, fontSize:"10px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap" }}>
              {def.icon} {cat}
            </button>
          );
        })}
      </div>

      {genres.length === 0
        ? <div style={{ textAlign:"center", padding:"20px", color:theme.subtext, fontSize:"12px" }}>No genres logged yet for {activeTab}</div>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {genres.map(([genre, count], i) => (
              <div key={genre} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"2px", height:"22px", borderRadius:"2px", background:color, flexShrink:0, opacity: 1 - (i * 0.12) }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"12px", color:theme.text, fontWeight:"600" }}>{genre}</span>
                    <span style={{ fontSize:"10px", color:theme.subtext }}>{count}</span>
                  </div>
                  <div style={{ height:"2px", background:theme.border, borderRadius:"2px", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(count/max)*100}%`, background:color, opacity:0.7, borderRadius:"2px" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};
