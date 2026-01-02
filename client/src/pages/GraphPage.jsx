import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../apiClient';

const COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#a855f7', '#7c3aed', '#2dd4bf'
];

export default function GraphPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [families, setFamilies] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  
  const dataRef = useRef({ nodes: [], edges: [], rawNodes: [], rawEdges: [] });
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const mouseRef = useRef({ x: 0, y: 0, hovered: null });
  const dragRef = useRef({ node: null, offsetX: 0, offsetY: 0 });
  const panRef = useRef({ active: false, startX: 0, startY: 0, startVX: 0, startVY: 0 });
  const simRef = useRef({ alpha: 1, running: true });

  useEffect(() => {
    async function load() {
      try {
        const [graph, fams, cits] = await Promise.all([
          api('/api/v1/tree/graph'),
          api('/api/v1/people/families'),
          api('/api/v1/people/cities')
        ]);
        
        dataRef.current.rawNodes = graph.nodes || [];
        dataRef.current.rawEdges = graph.edges || [];
        setFamilies(fams || []);
        setCities(cits || []);
        processData(graph.nodes, graph.edges, fams, '', '');
        setLoading(false);
      } catch (err) {
        console.error('Load failed:', err);
        setLoading(false);
      }
    }
    load();
  }, []);

  const processData = useCallback((rawNodes, rawEdges, familyList, famFilter, cityFilter) => {
    let nodes = [...rawNodes];
    if (famFilter) nodes = nodes.filter(n => n.family_id === famFilter);
    if (cityFilter) nodes = nodes.filter(n => n.current_city === cityFilter);

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = rawEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    const colorMap = {};
    familyList.forEach((f, i) => { colorMap[f.id] = COLORS[i % COLORS.length]; });

    const groups = {};
    nodes.forEach(n => {
      if (!groups[n.family_id]) groups[n.family_id] = [];
      groups[n.family_id].push(n);
    });

    const famKeys = Object.keys(groups);
    const clusterR = Math.min(350, 80 * Math.sqrt(famKeys.length + 1));

    const simNodes = nodes.map(n => {
      const famIdx = famKeys.indexOf(n.family_id);
      const members = groups[n.family_id] || [];
      const memIdx = members.findIndex(m => m.id === n.id);
      const famAngle = (2 * Math.PI * famIdx) / (famKeys.length || 1);
      const memAngle = (2 * Math.PI * memIdx) / (members.length || 1);
      const memR = 40 + Math.random() * 40;

      return {
        id: n.id, label: n.label || 'Unknown', familyId: n.family_id,
        familyName: n.family_name || 'Unknown', city: n.current_city, canEdit: n.canEdit,
        color: colorMap[n.family_id] || '#6366f1',
        x: Math.cos(famAngle) * clusterR + Math.cos(memAngle) * memR,
        y: Math.sin(famAngle) * clusterR + Math.sin(memAngle) * memR,
        vx: 0, vy: 0, r: 7
      };
    });

    const simEdges = edges.map(e => ({ source: e.from, target: e.to, type: e.type }));
    dataRef.current.nodes = simNodes;
    dataRef.current.edges = simEdges;
    simRef.current.alpha = 1;
    setStats({ nodes: simNodes.length, edges: simEdges.length });
  }, []);

  useEffect(() => {
    if (dataRef.current.rawNodes.length > 0) {
      processData(dataRef.current.rawNodes, dataRef.current.rawEdges, families, selectedFamily, selectedCity);
    }
  }, [selectedFamily, selectedCity, families, processData]);

  const screenToWorld = useCallback((sx, sy) => {
    const c = containerRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (sx - r.left - r.width / 2 - v.x) / v.scale, y: (sy - r.top - r.height / 2 - v.y) / v.scale };
  }, []);

  const findNode = useCallback((wx, wy) => {
    const nodes = dataRef.current.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - wx, dy = n.y - wy;
      if (dx * dx + dy * dy < (n.r + 8) * (n.r + 8)) return n;
    }
    return null;
  }, []);

  const onMouseDown = useCallback((e) => {
    const w = screenToWorld(e.clientX, e.clientY);
    const node = findNode(w.x, w.y);
    if (node) {
      dragRef.current = { node, offsetX: node.x - w.x, offsetY: node.y - w.y };
    } else {
      panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startVX: viewRef.current.x, startVY: viewRef.current.y };
    }
  }, [screenToWorld, findNode]);

  const onMouseMove = useCallback((e) => {
    const w = screenToWorld(e.clientX, e.clientY);
    if (dragRef.current.node) {
      const n = dragRef.current.node;
      n.x = w.x + dragRef.current.offsetX;
      n.y = w.y + dragRef.current.offsetY;
      n.vx = 0; n.vy = 0;
      simRef.current.alpha = Math.max(simRef.current.alpha, 0.3);
    } else if (panRef.current.active) {
      viewRef.current.x = panRef.current.startVX + (e.clientX - panRef.current.startX);
      viewRef.current.y = panRef.current.startVY + (e.clientY - panRef.current.startY);
    } else {
      mouseRef.current.hovered = findNode(w.x, w.y);
    }
  }, [screenToWorld, findNode]);

  const onMouseUp = useCallback(() => {
    dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
    panRef.current.active = false;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left - r.width / 2;
    const my = e.clientY - r.top - r.height / 2;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(4, viewRef.current.scale * delta));
    const ratio = newScale / viewRef.current.scale;
    viewRef.current.x = mx - (mx - viewRef.current.x) * ratio;
    viewRef.current.y = my - (my - viewRef.current.y) * ratio;
    viewRef.current.scale = newScale;
  }, []);

  const onClick = useCallback((e) => {
    if (panRef.current.active) return;
    const w = screenToWorld(e.clientX, e.clientY);
    setSelectedNode(findNode(w.x, w.y));
  }, [screenToWorld, findNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || loading) return;

    const ctx = canvas.getContext('2d');
    let animId;
    simRef.current.running = true;

    const resize = () => {
      const r = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const physics = () => {
      const { nodes, edges } = dataRef.current;
      const sim = simRef.current;
      if (nodes.length === 0 || sim.alpha < 0.001) return;

      for (const node of nodes) {
        if (dragRef.current.node?.id === node.id) continue;
        let fx = 0, fy = 0;

        for (const other of nodes) {
          if (other.id === node.id) continue;
          const dx = node.x - other.x, dy = node.y - other.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1 || d2 > 50000) continue;
          const d = Math.sqrt(d2);
          const f = 600 / d2;
          fx += (dx / d) * f; fy += (dy / d) * f;
        }

        for (const edge of edges) {
          let other = null;
          if (edge.source === node.id) other = nodes.find(n => n.id === edge.target);
          else if (edge.target === node.id) other = nodes.find(n => n.id === edge.source);
          if (!other) continue;
          const dx = other.x - node.x, dy = other.y - node.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = edge.type === 'SPOUSE_OF' ? 45 : 65;
          const f = (d - target) * 0.025;
          fx += (dx / d) * f; fy += (dy / d) * f;
        }

        const family = nodes.filter(n => n.familyId === node.familyId && n.id !== node.id);
        if (family.length > 0) {
          const cx = family.reduce((s, n) => s + n.x, 0) / family.length;
          const cy = family.reduce((s, n) => s + n.y, 0) / family.length;
          fx += (cx - node.x) * 0.002; fy += (cy - node.y) * 0.002;
        }

        fx -= node.x * 0.0003; fy -= node.y * 0.0003;
        node.vx = (node.vx + fx * sim.alpha) * 0.6;
        node.vy = (node.vy + fy * sim.alpha) * 0.6;
        node.x += node.vx; node.y += node.vy;
      }
      sim.alpha *= 0.995;
    };

    const render = () => {
      if (!simRef.current.running) return;
      physics();

      const r = container.getBoundingClientRect();
      const w = r.width, h = r.height;
      const v = viewRef.current;
      const { nodes, edges } = dataRef.current;
      const hovered = mouseRef.current.hovered;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
      ctx.lineWidth = 1;
      const gs = 40 * v.scale;
      const ox = ((w / 2 + v.x) % gs + gs) % gs;
      const oy = ((h / 2 + v.y) % gs + gs) % gs;
      ctx.beginPath();
      for (let x = ox; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = oy; y < h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      ctx.save();
      ctx.translate(w / 2 + v.x, h / 2 + v.y);
      ctx.scale(v.scale, v.scale);

      const nodeMap = {};
      nodes.forEach(n => nodeMap[n.id] = n);

      const connected = new Set();
      if (hovered) {
        edges.forEach(e => {
          if (e.source === hovered.id) connected.add(e.target);
          if (e.target === hovered.id) connected.add(e.source);
        });
      }

      for (const edge of edges) {
        const src = nodeMap[edge.source], tgt = nodeMap[edge.target];
        if (!src || !tgt) continue;
        const hl = hovered && (edge.source === hovered.id || edge.target === hovered.id);
        const dim = hovered && !hl;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (edge.type === 'SPOUSE_OF') {
          ctx.strokeStyle = dim ? 'rgba(236,72,153,0.05)' : hl ? 'rgba(236,72,153,0.9)' : 'rgba(236,72,153,0.35)';
          ctx.lineWidth = hl ? 2.5 : 1.5;
          ctx.setLineDash([5, 5]);
        } else {
          ctx.strokeStyle = dim ? 'rgba(148,163,184,0.04)' : hl ? 'rgba(148,163,184,0.8)' : 'rgba(148,163,184,0.2)';
          ctx.lineWidth = hl ? 2 : 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const node of nodes) {
        const isHov = hovered?.id === node.id;
        const isCon = connected.has(node.id);
        const isDim = hovered && !isHov && !isCon;
        const r = isHov ? node.r * 1.6 : isCon ? node.r * 1.2 : node.r;

        if (isHov) {
          const grad = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 18);
          grad.addColorStop(0, node.color + '50');
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 18, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isDim ? node.color + '25' : node.color;
        ctx.fill();

        if (isHov) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (node.canEdit && !isDim) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }

        if (!isDim) {
          ctx.beginPath();
          ctx.arc(node.x - r * 0.3, node.y - r * 0.3, r * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fill();
        }

        if (v.scale > 0.4 || isHov || isCon) {
          const fs = Math.round(11 / Math.max(v.scale, 0.5));
          ctx.font = (isHov ? 'bold ' : '') + fs + 'px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isDim ? 'rgba(255,255,255,0.1)' : isHov ? '#fff' : 'rgba(255,255,255,0.7)';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = isDim ? 0 : 3;
          ctx.fillText(node.label.split(' ')[0], node.x, node.y + r + 5);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => { simRef.current.running = false; window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, [loading]);

  const resetView = () => { viewRef.current = { x: 0, y: 0, scale: 1 }; };
  const reheat = () => { simRef.current.alpha = 1; };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 80px)', color: '#94a3b8', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 80px)', background: '#0f172a', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(to bottom, rgba(15,23,42,0.95), transparent)', zIndex: 100, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)} style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13, minWidth: 120 }}>
            <option value="">All Families</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', padding: '8px 12px', borderRadius: 8, fontSize: 13, minWidth: 120 }}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ color: '#64748b', fontSize: 13 }}>{stats.nodes} people • {stats.edges} connections</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ l: '+', f: () => viewRef.current.scale = Math.min(4, viewRef.current.scale * 1.3) }, { l: '−', f: () => viewRef.current.scale = Math.max(0.1, viewRef.current.scale / 1.3) }, { l: '⟲', f: resetView }, { l: '⚡', f: reheat }].map((b, i) => (
            <button key={i} onClick={b.f} style={{ width: 36, height: 36, background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>{b.l}</button>
          ))}
        </div>
      </div>

      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'grab' }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={onClick} onWheel={onWheel}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {selectedNode && (
        <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 20, minWidth: 250, zIndex: 100 }}>
          <button onClick={() => setSelectedNode(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>×</button>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedNode.color, marginBottom: 8 }} />
          <h3 style={{ color: '#f1f5f9', fontSize: 18, margin: '0 0 4px' }}>{selectedNode.label}</h3>
          <p style={{ color: '#8b5cf6', fontSize: 14, margin: '0 0 6px' }}>{selectedNode.familyName}</p>
          {selectedNode.city && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>📍 {selectedNode.city}</p>}
          <h4 style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', margin: '0 0 10px' }}>Connections</h4>
          {dataRef.current.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 6).map((e, i) => {
            const otherId = e.source === selectedNode.id ? e.target : e.source;
            const other = dataRef.current.nodes.find(n => n.id === otherId);
            if (!other) return null;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: other.color }} />
                <span style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }}>{other.label}</span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{e.type === 'SPOUSE_OF' ? 'Spouse' : e.source === selectedNode.id ? 'Parent' : 'Child'}</span>
              </div>
            );
          })}
          {selectedNode.canEdit && <button onClick={() => navigate(`/person/${selectedNode.id}`)} style={{ marginTop: 16, width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: 'white', padding: 10, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>View Details →</button>}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 20, right: 20, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 12, padding: 14, minWidth: 130, zIndex: 100 }}>
        <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', marginBottom: 10 }}>Legend</div>
        {families.slice(0, 6).map((f, i) => (
          <div key={f.id} onClick={() => setSelectedFamily(selectedFamily === f.id ? '' : f.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', color: '#cbd5e1', fontSize: 12, cursor: 'pointer', opacity: !selectedFamily || selectedFamily === f.id ? 1 : 0.4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
            <span>{f.name}</span>
          </div>
        ))}
        {families.length > 6 && <div style={{ color: '#64748b', fontSize: 11, padding: '3px 0' }}>+{families.length - 6} more</div>}
        <div style={{ height: 1, background: 'rgba(51,65,85,0.5)', margin: '10px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', color: '#cbd5e1', fontSize: 12 }}>
          <span style={{ width: 18, height: 2, background: 'rgba(148,163,184,0.5)' }} /><span>Parent-Child</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', color: '#cbd5e1', fontSize: 12 }}>
          <span style={{ width: 18, height: 2, background: 'repeating-linear-gradient(90deg, rgba(236,72,153,0.6) 0px, rgba(236,72,153,0.6) 3px, transparent 3px, transparent 6px)' }} /><span>Spouse</span>
        </div>
      </div>
    </div>
  );
}
