import React, { useMemo } from "react";
import { CATEGORIES } from "../utils/constants.js";

export const ActivityCalendar = ({ logs, theme, darkMode }) => {
  const days = useMemo(() => {
    const now = new Date(), result = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const count = logs.filter(l => l.logged_at && new Date(l.logged_at).toDateString() === ds).length;
      result.push({ date: d, count, isToday: i === 0 });
    }
    return result;
  }, [logs]);

  const { currentStreak, longestStreak } = useMemo(() => {
    let cur = 0, longest = 0, running = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i].count > 0) { running++; if (running > longest) longest = running; }
      else running = 0;
    }
    for (let i = 59; i >= 0; i--) { if (days[i].count > 0) cur++; else break; }
    return { currentStreak: cur, longestStreak: longest };
  }, [days]);

  const rows = [];
  for (let i = 0; i < days.length; i += 10) rows.push(days.slice(i, i + 10));

  const dc = n =>
    n === 0 ? (darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)") :
    n === 1 ? (darkMode ? "#1a4a2e" : "#c6efce") :
    n === 2 ? (darkMode ? "#1e6b3a" : "#5cbf7a") :
              (darkMode ? "#27ae60" : "#1e7e34");

  return (
    <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"16px", padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
        <div>
          <div style={{ fontSize:"9px", letterSpacing:"0.15em", textTransform:"uppercase", color:theme.subtext, fontWeight:"700", marginBottom:"4px" }}>Activity</div>
          <div style={{ fontSize:"13px", fontWeight:"700", color:theme.text }}>Last 60 days</div>
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"20px", fontWeight:"800", color:"#27ae60", letterSpacing:"-1px", lineHeight:1 }}>{currentStreak}</div>
            <div style={{ fontSize:"9px", color:theme.subtext, marginTop:"2px", whiteSpace:"nowrap" }}>🔥 streak</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"20px", fontWeight:"800", color:theme.text, letterSpacing:"-1px", lineHeight:1, opacity:0.4 }}>{longestStreak}</div>
            <div style={{ fontSize:"9px", color:theme.subtext, marginTop:"2px", whiteSpace:"nowrap" }}>best</div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
        {rows.map((row, wi) => (
          <div key={wi} style={{ display:"flex", gap:"3px" }}>
            {row.map((day, di) => (
              <div key={di}
                title={`${day.date.toLocaleDateString()} · ${day.count} logged`}
                style={{ flex:1, aspectRatio:"1", borderRadius:"3px", background:dc(day.count), border: day.isToday ? `1px solid ${CATEGORIES.Watched.color}` : "none", boxSizing:"border-box" }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"8px" }}>
        <span style={{ fontSize:"9px", color:theme.subtext }}>60 days ago</span>
        <div style={{ display:"flex", alignItems:"center", gap:"3px" }}>
          <span style={{ fontSize:"9px", color:theme.subtext }}>less</span>
          {[0,1,2,3].map(n => <div key={n} style={{ width:"8px", height:"8px", borderRadius:"2px", background:dc(n) }}/>)}
          <span style={{ fontSize:"9px", color:theme.subtext }}>more</span>
        </div>
        <span style={{ fontSize:"9px", color:theme.subtext }}>today</span>
      </div>
    </div>
  );
};
