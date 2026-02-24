import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getSubtypeStyle, generateCoverGradient } from "../utils/helpers.js";
import { CATEGORIES } from "../utils/constants.js";
import { MapTab } from "./MapTab.jsx";

// Inject fonts
if (!document.getElementById("threads-fonts")) {
  const l = document.createElement("link");
  l.id = "threads-fonts";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;0,9..144,600&family=Bebas+Neue&display=swap";
  document.head.appendChild(l);
}

const VERDICT_COLOR = v => ({
  "I loved it": "#f1c40f",
  "I liked it": "#4caf50",
  "Meh": "#ff9800",
  "I didn't like it": "#e74c3c",
}[v] || "#555");

// ─── LINK PICKER MODAL ───────────────────────────────────────────────────────
const LinkPicker = ({ sourceLog, allLogs, existingLinks, theme, darkMode, onLink, onClose }) => {
  const [search, setSearch] = useState("");
  const candidates = allLogs.filter(l =>
    l.id !== sourceLog.id &&
    !existingLinks.includes(l.id) &&
    (search.length < 2 || `${l.title} ${l.creator || ""}`.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 500, background: darkMode ? "#0d0d0d" : "#fff", borderRadius: "20px 20px 0 0", border: `1px solid ${theme.border2}`, borderBottom: "none", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ width: 36, height: 4, background: theme.border2, borderRadius: 2, margin: "12px auto 0", flexShrink: 0 }} />
        <div style={{ padding: "12px 16px", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 20, letterSpacing: "0.05em", color: theme.text, marginBottom: 4 }}>
            Connect to…
          </div>
          <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 10 }}>
            Linking from: <em style={{ color: theme.text }}>{sourceLog.title}</em>
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entries…"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border2}`, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: theme.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
          {candidates.length === 0
            ? <div style={{ textAlign: "center", padding: "20px", color: theme.subtext, fontSize: 13 }}>No entries to link</div>
            : candidates.slice(0, 30).map(log => {
              const ss = getSubtypeStyle(log.media_type);
              const vc = VERDICT_COLOR(log.verdict);
              return (
                <div key={log.id} onClick={() => { onLink(log.id); onClose(); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderBottom: `1px solid ${theme.border}`, cursor: "pointer" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: vc, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.title}</div>
                    <div style={{ fontSize: 10, color: theme.subtext }}>{ss.icon} {log.media_type}{log.creator ? ` · ${log.creator}` : ""}</div>
                  </div>
                  <span style={{ fontSize: 10, color: theme.subtext2, flexShrink: 0 }}>→</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// ─── NODE DETAIL PANEL ────────────────────────────────────────────────────────
const NodePanel = ({ log, links, allLogs, theme, darkMode, onAddLink, onRemoveLink, onClose, onEdit }) => {
  const ss = getSubtypeStyle(log.media_type);
  const vc = VERDICT_COLOR(log.verdict);
  const { color1, color2 } = generateCoverGradient(log.title || "");
  const linkedLogs = links.map(id => allLogs.find(l => l.id === id)).filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 550, display: "flex" }}
      onClick={onClose}>
      <div style={{ width: "25%", flexShrink: 0 }} />
      <div onClick={e => e.stopPropagation()}
        style={{
          flex: 1, background: darkMode ? "rgba(6,6,6,0.97)" : "rgba(252,252,252,0.97)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderLeft: `1px solid ${theme.border2}`,
          display: "flex", flexDirection: "column",
          animation: "npSlideIn 0.28s cubic-bezier(0.25,0.46,0.45,0.94)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}>
        <style>{`@keyframes npSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Artwork header */}
        <div style={{ height: 120, position: "relative", flexShrink: 0, overflow: "hidden" }}>
          {log.artwork
            ? <img src={log.artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5) saturate(0.8)" }} onError={e => e.target.style.display = "none"} />
            : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,${color1},${color2})`, opacity: 0.6 }} />
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 30%,rgba(6,6,6,0.9))" }} />
          <div style={{ position: "absolute", bottom: 10, left: 14, right: 14 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>{log.title}</div>
            {log.creator && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{log.creator}</div>}
          </div>
          <button onClick={onClose}
            style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Meta */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${vc}22`, color: vc, border: `1px solid ${vc}44` }}>{log.verdict}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "none", color: ss.color, border: `1px solid ${ss.color}44` }}>{ss.icon} {log.media_type}</span>
          </div>
          {log.notes && <div style={{ fontSize: 11, color: theme.subtext, fontStyle: "italic", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{log.notes}</div>}
        </div>

        {/* Connections */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: theme.subtext, marginBottom: 10 }}>
            Connections ({linkedLogs.length})
          </div>
          {linkedLogs.length === 0
            ? <div style={{ fontSize: 12, color: theme.subtext, fontStyle: "italic", marginBottom: 12 }}>No connections yet.</div>
            : linkedLogs.map(linked => {
              const ls = getSubtypeStyle(linked.media_type);
              const lc = VERDICT_COLOR(linked.verdict);
              return (
                <div key={linked.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: lc, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{linked.title}</div>
                    <div style={{ fontSize: 10, color: theme.subtext }}>{ls.icon} {linked.media_type}</div>
                  </div>
                  <button onClick={() => onRemoveLink(log.id, linked.id)}
                    style={{ background: "none", border: "none", color: "#e74c3c", fontSize: 13, cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
        </div>

        {/* Actions */}
        <div style={{ padding: "10px 14px 28px", borderTop: `1px solid ${theme.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onAddLink}
            style={{ flex: 2, padding: "10px", borderRadius: 10, border: `1px solid ${theme.border2}`, background: "none", color: "#3498db", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            + Connect
          </button>
          <button onClick={onEdit}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${theme.border}`, background: "none", color: theme.subtext, fontSize: 12, cursor: "pointer" }}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CANVAS CONSTELLATION ─────────────────────────────────────────────────────
const Constellation = ({ logs, links, theme, darkMode, onNodeClick, searchTerm = "" }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    nodes: [],
    pan: { x: 0, y: 0 },
    zoom: 1,
    dragging: false,
    lastTouch: null,
    lastPinchDist: null,
    hoveredId: null,
  });
  const [, forceRender] = useState(0);

  // Build nodes with physics positions
  const buildNodes = useCallback(() => {
    const existing = stateRef.current.nodes;
    const nodeMap = {};
    existing.forEach(n => { nodeMap[n.id] = n; });

    const W = canvasRef.current?.width || 800;
    const H = canvasRef.current?.height || 600;

    const nodes = logs.map((log, i) => {
      const existing = nodeMap[log.id];
      if (existing) return { ...existing, log };

      // Spiral placement for new nodes
      const angle = i * 2.399;
      const radius = 60 + Math.sqrt(i) * 80;
      return {
        id: log.id,
        log,
        x: W / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: H / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
        r: 22 + (log.verdict === "I loved it" ? 6 : 0),
      };
    });
    stateRef.current.nodes = nodes;
  }, [logs]);

  // Force-directed physics
  const runPhysics = useCallback(() => {
    const { nodes } = stateRef.current;
    if (nodes.length < 2) return;

    const linkSet = new Set(links.flatMap(({ a, b }) => [`${a}-${b}`, `${b}-${a}`]));

    nodes.forEach(n => { n.vx = 0; n.vy = 0; });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (a.r + b.r) * 3.5;
        if (dist < minDist) {
          const force = (minDist - dist) / dist * 0.4;
          a.vx -= dx * force; a.vy -= dy * force;
          b.vx += dx * force; b.vy += dy * force;
        }
      }
    }

    // Attraction along links
    links.forEach(({ a: aId, b: bId }) => {
      const a = nodes.find(n => n.id === aId);
      const b = nodes.find(n => n.id === bId);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 160;
      const force = (dist - target) / dist * 0.06;
      a.vx += dx * force; a.vy += dy * force;
      b.vx -= dx * force; b.vy -= dy * force;
    });

    // Center gravity (gentle)
    const W = canvasRef.current?.width || 800;
    const H = canvasRef.current?.height || 600;
    nodes.forEach(n => {
      n.vx += (W / 2 - n.x) * 0.003;
      n.vy += (H / 2 - n.y) * 0.003;
    });

    // Apply velocity with damping
    nodes.forEach(n => {
      n.x += n.vx * 0.5;
      n.y += n.vy * 0.5;
    });
  }, [links]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { nodes, pan, zoom, hoveredId } = stateRef.current;
    const W = canvas.width, H = canvas.height;
    const term = searchTerm.toLowerCase().trim();

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = darkMode ? "#070707" : "#f4f4f4";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    const gridSize = 60 * zoom;
    const offsetX = (pan.x % gridSize + gridSize) % gridSize;
    const offsetY = (pan.y % gridSize + gridSize) % gridSize;
    for (let x = offsetX; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = offsetY; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw links first
    const linkSet = new Set();
    links.forEach(({ a: aId, b: bId }) => {
      const key = [aId, bId].sort().join("-");
      if (linkSet.has(key)) return;
      linkSet.add(key);

      const a = nodes.find(n => n.id === aId);
      const b = nodes.find(n => n.id === bId);
      if (!a || !b) return;

      // Gradient line
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      const ca = VERDICT_COLOR(a.log.verdict);
      const cb = VERDICT_COLOR(b.log.verdict);
      grad.addColorStop(0, ca + "66");
      grad.addColorStop(1, cb + "66");
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);

      // Slight curve
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.1;
      const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.1;
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = (hoveredId === aId || hoveredId === bId) ? 2.5 : 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Arrow at midpoint
      const t = 0.5;
      const qx = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
      const qy = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
      const dx = b.x - a.x, dy = b.y - a.y;
      const angle = Math.atan2(dy, dx);
      const as = 8;
      ctx.beginPath();
      ctx.moveTo(qx + as * Math.cos(angle), qy + as * Math.sin(angle));
      ctx.lineTo(qx + as * Math.cos(angle + 2.4), qy + as * Math.sin(angle + 2.4));
      ctx.lineTo(qx + as * Math.cos(angle - 2.4), qy + as * Math.sin(angle - 2.4));
      ctx.closePath();
      ctx.fillStyle = darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
      ctx.fill();
    });

    // Draw nodes
    nodes.forEach(node => {
      const { log, x, y, r } = node;
      const vc = VERDICT_COLOR(log.verdict);
      const ss = getSubtypeStyle(log.media_type);
      const isHovered = hoveredId === node.id;
      const nr = isHovered ? r + 4 : r;
      const isMatch = !term || `${log.title} ${log.creator || ""} ${log.media_type}`.toLowerCase().includes(term);
      const dimmed = term && !isMatch;

      // Glow for loved items
      ctx.globalAlpha = dimmed ? 0.1 : 1;
      if (log.verdict === "I loved it") {
        ctx.beginPath();
        ctx.arc(x, y, nr + 10, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, nr + 10);
        glow.addColorStop(0, "#f1c40f44");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Hover glow ring
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, nr + 6, 0, Math.PI * 2);
        ctx.strokeStyle = vc + "66";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, nr, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x - nr * 0.3, y - nr * 0.3, 0, x, y, nr);
      grad.addColorStop(0, darkMode ? "#2a2a2a" : "#fff");
      grad.addColorStop(1, darkMode ? "#111" : "#e8e8e8");
      ctx.fillStyle = grad;
      ctx.fill();

      // Verdict ring
      ctx.beginPath();
      ctx.arc(x, y, nr, 0, Math.PI * 2);
      ctx.strokeStyle = vc;
      ctx.lineWidth = isHovered ? 2.5 : 1.8;
      ctx.stroke();

      // Category dot at top
      ctx.beginPath();
      ctx.arc(x + nr * 0.65, y - nr * 0.65, 4, 0, Math.PI * 2);
      ctx.fillStyle = ss.color;
      ctx.fill();

      // Icon in centre (emoji via fillText)
      ctx.font = `${Math.round(nr * 0.7)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ss.icon, x, y);

      // Title label below
      if (zoom > 0.55) {
        ctx.font = `${Math.round(Math.min(11, 11 * zoom / 0.8))}px -apple-system,sans-serif`;
        ctx.fillStyle = darkMode ? (isHovered ? "#fff" : "rgba(255,255,255,0.55)") : (isHovered ? "#111" : "rgba(0,0,0,0.5)");
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = log.title.length > 18 ? log.title.slice(0, 17) + "…" : log.title;
        ctx.fillText(label, x, y + nr + 4);
      }
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    // HUD
    const linkedCount = links.length;
    ctx.fillStyle = darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
    ctx.font = "10px -apple-system,sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${nodes.length} entries · ${linkedCount} connection${linkedCount !== 1 ? "s" : ""}`, 14, H - 14);
  }, [links, darkMode, searchTerm]);

  // Animation loop
  const loop = useCallback(() => {
    runPhysics();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [runPhysics, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    buildNodes();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [loop, buildNodes]);

  // Rebuild nodes when logs change (keep existing positions)
  useEffect(() => {
    buildNodes();
  }, [logs]);

  // Hit test
  const hitTest = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { pan, zoom, nodes } = stateRef.current;
    const cx = (clientX - rect.left - pan.x) / zoom;
    const cy = (clientY - rect.top - pan.y) / zoom;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const d = Math.sqrt((cx - n.x) ** 2 + (cy - n.y) ** 2);
      if (d <= n.r + 4) return n;
    }
    return null;
  }, []);

  // Mouse events
  const mouseState = useRef({ down: false, startX: 0, startY: 0, moved: false, panStart: null, draggingNode: null });

  const onMouseDown = e => {
    const node = hitTest(e.clientX, e.clientY);
    mouseState.current = { down: true, startX: e.clientX, startY: e.clientY, moved: false, panStart: { ...stateRef.current.pan }, draggingNode: node };
  };
  const onMouseMove = e => {
    const ms = mouseState.current;
    if (!ms.down) {
      // Hover
      const node = hitTest(e.clientX, e.clientY);
      stateRef.current.hoveredId = node?.id || null;
      canvasRef.current.style.cursor = node ? "pointer" : "grab";
      return;
    }
    const dx = e.clientX - ms.startX, dy = e.clientY - ms.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ms.moved = true;

    if (ms.draggingNode && ms.moved) {
      const { zoom, pan } = stateRef.current;
      ms.draggingNode.x += dx / zoom;
      ms.draggingNode.y += dy / zoom;
      ms.draggingNode.vx = 0;
      ms.draggingNode.vy = 0;
      ms.startX = e.clientX;
      ms.startY = e.clientY;
    } else if (!ms.draggingNode) {
      stateRef.current.pan = { x: ms.panStart.x + dx, y: ms.panStart.y + dy };
    }
  };
  const onMouseUp = e => {
    const ms = mouseState.current;
    if (!ms.moved && ms.draggingNode) {
      onNodeClick(ms.draggingNode.log);
    }
    ms.down = false;
    ms.draggingNode = null;
  };
  const onWheel = e => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const { pan, zoom } = stateRef.current;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const delta = e.deltaY * -0.001;
    const newZoom = Math.max(0.2, Math.min(3, zoom + delta * zoom));
    stateRef.current.pan = {
      x: cx - (cx - pan.x) * (newZoom / zoom),
      y: cy - (cy - pan.y) * (newZoom / zoom),
    };
    stateRef.current.zoom = newZoom;
  };

  // Touch events
  const onTouchStart = e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      stateRef.current.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      stateRef.current.lastTouch = null;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      stateRef.current.lastTouch = { x: t.clientX, y: t.clientY };
      stateRef.current.lastPinchDist = null;
      const node = hitTest(t.clientX, t.clientY);
      mouseState.current = { down: true, startX: t.clientX, startY: t.clientY, moved: false, panStart: { ...stateRef.current.pan }, draggingNode: node };
    }
  };
  const onTouchMove = e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const prev = stateRef.current.lastPinchDist;
      if (prev) {
        const scale = dist / prev;
        const newZoom = Math.max(0.2, Math.min(3, stateRef.current.zoom * scale));
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const { pan, zoom } = stateRef.current;
        stateRef.current.pan = { x: mx - (mx - pan.x) * (newZoom / zoom), y: my - (my - pan.y) * (newZoom / zoom) };
        stateRef.current.zoom = newZoom;
      }
      stateRef.current.lastPinchDist = dist;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const ms = mouseState.current;
      const dx = t.clientX - ms.startX, dy = t.clientY - ms.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ms.moved = true;

      if (ms.draggingNode && ms.moved) {
        const { zoom } = stateRef.current;
        ms.draggingNode.x += (t.clientX - ms.startX) / zoom;
        ms.draggingNode.y += (t.clientY - ms.startY) / zoom;
        ms.draggingNode.vx = 0; ms.draggingNode.vy = 0;
        ms.startX = t.clientX; ms.startY = t.clientY;
      } else if (!ms.draggingNode) {
        const lt = stateRef.current.lastTouch;
        if (lt) {
          stateRef.current.pan.x += t.clientX - lt.x;
          stateRef.current.pan.y += t.clientY - lt.y;
        }
        stateRef.current.lastTouch = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const onTouchEnd = e => {
    const ms = mouseState.current;
    if (!ms.moved && ms.draggingNode) onNodeClick(ms.draggingNode.log);
    ms.down = false; ms.draggingNode = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: "grab" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { mouseState.current.down = false; mouseState.current.draggingNode = null; }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    />
  );
};

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export const ThreadsTab = ({ logs, links, theme, darkMode, onAddLink, onRemoveLink, onEdit, mapHighlightId, getVerdictStyle, collections = [], hiddenCollIds = new Set(), hideMap = false }) => {
  const [view, setView] = useState("constellation"); // "constellation" | "map"
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [constellationSearch, setConstellationSearch] = useState("");

  // When a map highlight comes in, switch to map view
  useEffect(() => {
    if (mapHighlightId) setView("map");
  }, [mapHighlightId]);

  // Filter to only finished logs for the constellation
  const finishedLogs = useMemo(() =>
    logs.filter(l => ["I loved it", "I liked it", "Meh", "I didn't like it"].includes(l.verdict)),
    [logs]
  );

  const selectedLinks = useMemo(() => {
    if (!selectedLog) return [];
    return links
      .filter(lk => lk.a === selectedLog.id || lk.b === selectedLog.id)
      .map(lk => lk.a === selectedLog.id ? lk.b : lk.a);
  }, [selectedLog, links]);

  const handleNodeClick = useCallback((log) => {
    setSelectedLog(prev => prev?.id === log.id ? null : log);
  }, []);

  const isEmpty = finishedLogs.length === 0;

  // Toggle pill styles
  const pillBase = (active) => ({
    flex: 1, padding: "6px 0", borderRadius: 20, border: "none",
    fontWeight: 700, fontSize: 11, cursor: "pointer",
    transition: "all 0.18s",
    background: active ? (darkMode ? "#fff" : "#111") : "none",
    color: active ? (darkMode ? "#000" : "#fff") : theme.subtext,
  });

  return (
    <div style={{ height: "calc(100vh - 110px)", display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`@keyframes threadsIn { from { opacity:0; } to { opacity:1; } }`}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", flexShrink: 0, borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 26, letterSpacing: "0.05em", color: theme.text, lineHeight: 1 }}>
            {(view === "constellation" || hideMap) ? "Mind Map" : "Map"}
          </div>
          <div style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>
            {(view === "constellation" || hideMap)
              ? `${finishedLogs.length} entries · ${links.length} connection${links.length !== 1 ? "s" : ""}`
              : `Your experienced places`}
          </div>
        </div>

        {/* Toggle — only show if map is enabled */}
        {!hideMap && (
        <div style={{ display: "flex", background: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", borderRadius: 22, padding: 3, gap: 2, width: 160 }}>
          <button style={pillBase(view === "constellation")} onClick={() => { setView("constellation"); setSelectedLog(null); }}>
            🧠 Mind Map
          </button>
          <button style={pillBase(view === "map")} onClick={() => setView("map")}>
            🗺 Map
          </button>
        </div>
        )}
      </div>

      {/* ── CONSTELLATION VIEW ── */}
      {view === "constellation" && (
        <>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, padding: "6px 16px", flexShrink: 0, overflowX: "auto", borderBottom: `1px solid ${theme.border}` }}>
            {[["I loved it", "#f1c40f"], ["I liked it", "#4caf50"], ["Meh", "#ff9800"], ["I didn't like it", "#e74c3c"]].map(([v, c]) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${c}` }} />
                <span style={{ fontSize: 9, color: theme.subtext, whiteSpace: "nowrap" }}>{v}</span>
              </div>
            ))}
            {Object.entries(CATEGORIES).map(([cat, def]) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: def.color }} />
                <span style={{ fontSize: 9, color: theme.subtext, whiteSpace: "nowrap" }}>{def.icon}</span>
              </div>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ padding: "8px 16px", flexShrink: 0, borderBottom: `1px solid ${theme.border}`, position: "relative" }}>
            <span style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: theme.subtext, pointerEvents: "none" }}>🔍</span>
            <input
              value={constellationSearch}
              onChange={e => setConstellationSearch(e.target.value)}
              placeholder="Search the mind map…"
              style={{ width: "100%", padding: "7px 32px 7px 32px", borderRadius: 20, border: `1px solid ${theme.border}`, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: theme.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
            />
            {constellationSearch && (
              <button onClick={() => setConstellationSearch("")} style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: theme.subtext, cursor: "pointer", fontSize: 14 }}>✕</button>
            )}
          </div>

          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {isEmpty ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: theme.subtext }}>
                <div style={{ fontSize: 48 }}>🧠</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Nothing to map yet</div>
                <div style={{ fontSize: 13, color: theme.subtext, textAlign: "center", maxWidth: 240 }}>Log some things first, then come here to connect the dots.</div>
              </div>
            ) : (
              <Constellation
                logs={finishedLogs}
                links={links}
                theme={theme}
                darkMode={darkMode}
                onNodeClick={handleNodeClick}
                searchTerm={constellationSearch}
              />
            )}
          </div>

          {/* Node panel */}
          {selectedLog && (
            <NodePanel
              log={selectedLog}
              links={selectedLinks}
              allLogs={finishedLogs}
              theme={theme}
              darkMode={darkMode}
              onAddLink={() => setShowLinkPicker(true)}
              onRemoveLink={(aId, bId) => { onRemoveLink(aId, bId); }}
              onClose={() => setSelectedLog(null)}
              onEdit={() => { onEdit(selectedLog); setSelectedLog(null); }}
            />
          )}

          {showLinkPicker && selectedLog && (
            <LinkPicker
              sourceLog={selectedLog}
              allLogs={finishedLogs}
              existingLinks={selectedLinks}
              theme={theme}
              darkMode={darkMode}
              onLink={(targetId) => onAddLink(selectedLog.id, targetId)}
              onClose={() => setShowLinkPicker(false)}
            />
          )}
        </>
      )}

      {/* ── MAP VIEW ── */}
      {view === "map" && !hideMap && (
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapTab
            logs={logs}
            theme={theme}
            darkMode={darkMode}
            getVerdictStyle={getVerdictStyle}
            highlightId={mapHighlightId}
            collections={collections}
            hiddenCollIds={hiddenCollIds}
          />
        </div>
      )}
    </div>
  );
};
