import React, { useState, useEffect, useRef, useMemo } from "react";
import { CATEGORIES, SUBTYPE_ICONS } from "../utils/constants.js";
import { getCat, VERDICT_MAP_COLOR, getSubtypeStyle } from "../utils/helpers.js";

export const MapTab = ({ logs, theme, darkMode, getVerdictStyle, highlightId, collections = [], hiddenCollIds = new Set() }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const [mapFilter, setMapFilter] = useState("All");
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [localHiddenCollIds, setLocalHiddenCollIds] = useState(hiddenCollIds);

  const expLogs = useMemo(() =>
    logs.filter(l => {
      if (getCat(l.media_type) !== "Experienced" || !l.lat || !l.lng) return false;
      if (mapFilter !== "All" && l.media_type !== mapFilter) return false;
      if (l.collection_id && localHiddenCollIds.has(l.collection_id)) return false;
      return true;
    }),
    [logs, mapFilter, localHiddenCollIds]
  );

  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map instance
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([30, 10], 2);
    const tile = darkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tile, { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }).addTo(leafletMap.current);
    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [mapReady]);

  // Swap tiles on dark mode change
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    leafletMap.current.eachLayer(layer => { if (layer._url) leafletMap.current.removeLayer(layer); });
    const tile = darkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tile, { attribution: "© OpenStreetMap © CARTO", maxZoom: 19 }).addTo(leafletMap.current);
  }, [darkMode]);

  // Render markers
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    expLogs.forEach(log => {
      const color = VERDICT_MAP_COLOR(log.verdict);
      const isHL = log.id === highlightId;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${isHL?18:13}px;height:${isHL?18:13}px;border-radius:50%;background:${color};border:${isHL?"3px solid #fff":"2px solid rgba(255,255,255,0.8)"};box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
        iconSize: [isHL?18:13, isHL?18:13],
        iconAnchor: [isHL?9:6.5, isHL?9:6.5],
      });
      const ss = getSubtypeStyle(log.media_type);
      const words = (log.notes || "").split(/\s+/).slice(0, 20).join(" ") + (log.notes && log.notes.split(/\s+/).length > 20 ? "…" : "");
      const popup = L.popup({ maxWidth: 220 }).setContent(`
        <div style="font-family:-apple-system,sans-serif;padding:4px 0;">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;line-height:1.3;">${log.title}</div>
          <div style="font-size:10px;color:#888;margin-bottom:6px;">${ss.icon} ${log.media_type}${log.location_venue ? ` · ${log.location_venue}` : ""}</div>
          <div style="display:inline-block;padding:2px 8px;border-radius:20px;background:${color}22;border:1px solid ${color}55;color:${color};font-size:10px;font-weight:700;">${log.verdict}</div>
          ${words ? `<div style="font-size:11px;font-style:italic;color:#666;line-height:1.5;margin-top:6px;">${words}</div>` : ""}
        </div>
      `);
      const marker = L.marker([log.lat, log.lng], { icon }).bindPopup(popup).addTo(leafletMap.current);
      if (isHL) {
        setTimeout(() => { leafletMap.current.setView([log.lat, log.lng], 14, { animate: true }); marker.openPopup(); }, 200);
      }
      markersRef.current.push(marker);
    });
  }, [expLogs, highlightId]);

  const geolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { leafletMap.current?.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true }); setLocating(false); },
      () => setLocating(false)
    );
  };

  const unmappedCount = logs.filter(l => getCat(l.media_type) === "Experienced" && (!l.lat || !l.lng)).length;

  return (
    <div style={{ position:"relative", height:"calc(100vh - 110px)", display:"flex", flexDirection:"column" }}>
      {/* Filter bar */}
      <div style={{ padding:"10px 14px", background:theme.bg, borderBottom:`1px solid ${theme.border}`, display:"flex", gap:"6px", overflowX:"auto", flexShrink:0 }}>
        {["All", ...CATEGORIES.Experienced.subtypes].map(f => {
          const active = mapFilter === f;
          const color = CATEGORIES.Experienced.color;
          const icon = SUBTYPE_ICONS[f];
          return (
            <button key={f} onClick={() => setMapFilter(f)}
              style={{ flexShrink:0, padding:"4px 10px", borderRadius:"20px", border:`1px solid ${active ? color : theme.border}`, background: active ? `${color}18` : "none", color: active ? color : theme.subtext, fontSize:"10px", fontWeight:"600", cursor:"pointer", whiteSpace:"nowrap" }}>
              {icon ? `${icon} ${f}` : "All"}
            </button>
          );
        })}
      </div>

      {/* Collection toggles */}
      {collections.length > 0 && (
        <div style={{ padding:"6px 14px", background:theme.bg, borderBottom:`1px solid ${theme.border}`, display:"flex", gap:"5px", overflowX:"auto", flexShrink:0, alignItems:"center" }}>
          <span style={{ fontSize:"9px", fontWeight:"700", color:theme.subtext, letterSpacing:"0.1em", textTransform:"uppercase", flexShrink:0 }}>Collections:</span>
          {collections.map(c => {
            const hidden = localHiddenCollIds.has(c.id);
            return (
              <button key={c.id}
                onClick={() => setLocalHiddenCollIds(prev => {
                  const next = new Set(prev);
                  if (hidden) next.delete(c.id); else next.add(c.id);
                  return next;
                })}
                style={{ flexShrink:0, fontSize:"9px", fontWeight:"600", padding:"3px 8px", borderRadius:"20px", border:`1px solid ${hidden ? theme.border : "#3498db55"}`, background: hidden ? "none" : "#3498db11", color: hidden ? theme.subtext : "#3498db", cursor:"pointer", opacity: hidden ? 0.4 : 1, textDecoration: hidden ? "line-through" : "none" }}>
                {c.emoji} {c.name}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex:1, position:"relative" }}>
        {!mapReady && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:theme.bg, zIndex:5, color:theme.subtext, fontSize:"13px" }}>Loading map…</div>
        )}
        <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>

        <button onClick={geolocate} style={{ position:"absolute", top:"12px", right:"12px", zIndex:1000, width:"36px", height:"36px", borderRadius:"10px", border:`1px solid ${theme.border}`, background:theme.card, color:theme.text, fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
          {locating ? "…" : "📍"}
        </button>

        <div style={{ position:"absolute", bottom:"50px", left:"12px", zIndex:1000, background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"10px", padding:"8px 10px", boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize:"8px", color:theme.subtext, fontWeight:"700", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px" }}>Verdict</div>
          {[["I loved it","#f1c40f"],["I liked it","#4caf50"],["Meh","#ff9800"],["I didn't like it","#e74c3c"],["Want to go","#9b59b6"]].map(([label, color]) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"3px" }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:color, flexShrink:0 }}/>
              <span style={{ fontSize:"9px", color:theme.subtext2, whiteSpace:"nowrap" }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ position:"absolute", top:"12px", left:"12px", zIndex:1000, background:theme.card, border:`1px solid ${theme.border}`, borderRadius:"20px", padding:"5px 10px", fontSize:"10px", color:theme.subtext2, boxShadow:"0 2px 8px rgba(0,0,0,0.3)" }}>
          {expLogs.length} place{expLogs.length !== 1 ? "s" : ""} mapped
          {unmappedCount > 0 && <span style={{ color:"#ff9800", marginLeft:"6px" }}>· {unmappedCount} without location</span>}
        </div>
      </div>
    </div>
  );
};
