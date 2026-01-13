import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Command as CommandIcon, Focus, Route, 
  ZoomIn, ZoomOut, RotateCcw, Flame, X, User, MapPin,
  ArrowRight, Bookmark, Plus, Eye, EyeOff
} from 'lucide-react';

interface RawNode {
  id: string;
  label: string;
  family_id: string;
  family_name: string;
  current_city?: string;
  canEdit?: boolean;
}

interface RawEdge {
  from: string;
  to: string;
  type: 'PARENT_OF' | 'SPOUSE_OF';
}

interface SimNode {
  id: string;
  label: string;
  familyId: string;
  familyName: string;
  city?: string;
  canEdit?: boolean;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  level?: number;
  isFocus?: boolean;
  isPath?: boolean;
}

interface SimEdge {
  source: string;
  target: string;
  type: 'PARENT_OF' | 'SPOUSE_OF';
  isPath?: boolean;
}

interface Family {
  id: string;
  name: string;
}

interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  is_shared: boolean;
}

interface PathResult {
  found: boolean;
  degrees?: number;
  path?: Array<{
    id: string;
    name: string;
    family_name: string;
    relationship?: string;
  }>;
}

interface SearchResult {
  id: string;
  name: string;
  family_name: string;
  current_city?: string;
}

const COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#a855f7', '#7c3aed', '#2dd4bf'
];

export default function GraphPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [families, setFamilies] = useState<Family[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  
  // Pack 4 Features
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState(2);
  const [showAncestors, setShowAncestors] = useState(true);
  const [showDescendants, setShowDescendants] = useState(true);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [pathFrom, setPathFrom] = useState<SearchResult | null>(null);
  const [pathTo, setPathTo] = useState<SearchResult | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set());

  const dataRef = useRef<{ nodes: SimNode[]; edges: SimEdge[]; rawNodes: RawNode[]; rawEdges: RawEdge[] }>({ nodes: [], edges: [], rawNodes: [], rawEdges: [] });
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const mouseRef = useRef<{ x: number; y: number; hovered: SimNode | null }>({ x: 0, y: 0, hovered: null });
  const dragRef = useRef<{ node: SimNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const panRef = useRef({ active: false, startX: 0, startY: 0, startVX: 0, startVY: 0 });
  const simRef = useRef({ alpha: 1, running: true });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(open => !open);
      }
      if (e.key === 'Escape') {
        setFocusMode(false);
        setFocusPersonId(null);
        setHighlightedPath(new Set());
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [graph, fams, cits, views] = await Promise.all([
          api<{ nodes: RawNode[]; edges: RawEdge[] }>('/api/v1/tree/graph'),
          api<Family[]>('/api/v1/people/families'),
          api<string[]>('/api/v1/people/cities'),
          api<SavedView[]>('/api/v1/graph/views').catch(() => [])
        ]);
        dataRef.current.rawNodes = graph.nodes || [];
        dataRef.current.rawEdges = graph.edges || [];
        setFamilies(fams || []);
        setCities(cits || []);
        setSavedViews(views || []);
        processData(graph.nodes, graph.edges, fams, '', '');
        setLoading(false);
      } catch (err) {
        console.error('Load failed:', err);
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await api<SearchResult[]>(`/api/v1/graph/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(results || []);
      } catch (err) { console.error('Search failed:', err); }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const processData = useCallback((rawNodes: RawNode[], rawEdges: RawEdge[], familyList: Family[], famFilter: string, cityFilter: string) => {
    let nodes = [...rawNodes];
    if (famFilter) nodes = nodes.filter(n => n.family_id === famFilter);
    if (cityFilter) nodes = nodes.filter(n => n.current_city === cityFilter);
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = rawEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    const colorMap: Record<string, string> = {};
    familyList.forEach((f, i) => { colorMap[f.id] = COLORS[i % COLORS.length]; });
    const groups: Record<string, RawNode[]> = {};
    nodes.forEach(n => { if (!groups[n.family_id]) groups[n.family_id] = []; groups[n.family_id].push(n); });
    const famKeys = Object.keys(groups);
    const clusterR = Math.min(350, 80 * Math.sqrt(famKeys.length + 1));
    const simNodes: SimNode[] = nodes.map(n => {
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
        vx: 0, vy: 0, r: 7, isPath: highlightedPath.has(n.id), isFocus: n.id === focusPersonId
      };
    });
    const simEdges: SimEdge[] = edges.map(e => ({ source: e.from, target: e.to, type: e.type, isPath: highlightedPath.has(e.from) && highlightedPath.has(e.to) }));
    dataRef.current.nodes = simNodes;
    dataRef.current.edges = simEdges;
    simRef.current.alpha = 1;
    setStats({ nodes: simNodes.length, edges: simEdges.length });
  }, [highlightedPath, focusPersonId]);

  useEffect(() => {
    if (dataRef.current.rawNodes.length > 0) processData(dataRef.current.rawNodes, dataRef.current.rawEdges, families, selectedFamily, selectedCity);
  }, [selectedFamily, selectedCity, families, processData, highlightedPath]);

  useEffect(() => {
    if (!focusMode || !focusPersonId) return;
    async function loadFocusGraph() {
      try {
        const params = new URLSearchParams({ depth: focusDepth.toString(), ancestors: showAncestors.toString(), descendants: showDescendants.toString() });
        const result = await api<{ nodes: any[]; edges: any[] }>(`/api/v1/graph/focus/${focusPersonId}?${params}`);
        const rawNodes: RawNode[] = result.nodes.map(n => ({ id: n.id, label: n.label, family_id: n.family_id, family_name: n.family_name, current_city: n.current_city, canEdit: n.canEdit }));
        const rawEdges: RawEdge[] = result.edges.map(e => ({ from: e.from, to: e.to, type: e.type }));
        dataRef.current.rawNodes = rawNodes;
        dataRef.current.rawEdges = rawEdges;
        processData(rawNodes, rawEdges, families, '', '');
      } catch (err) { console.error('Focus load failed:', err); }
    }
    loadFocusGraph();
  }, [focusMode, focusPersonId, focusDepth, showAncestors, showDescendants, families]);

  const exitFocusMode = async () => {
    setFocusMode(false); setFocusPersonId(null);
    try {
      const graph = await api<{ nodes: RawNode[]; edges: RawEdge[] }>('/api/v1/tree/graph');
      dataRef.current.rawNodes = graph.nodes || [];
      dataRef.current.rawEdges = graph.edges || [];
      processData(graph.nodes, graph.edges, families, selectedFamily, selectedCity);
    } catch (err) { console.error('Reload failed:', err); }
  };

  const findPath = async () => {
    if (!pathFrom || !pathTo) return;
    setPathLoading(true);
    try {
      const result = await api<PathResult>(`/api/v1/graph/path?fromId=${pathFrom.id}&toId=${pathTo.id}`);
      setPathResult(result);
      if (result.found && result.path) setHighlightedPath(new Set(result.path.map(p => p.id)));
    } catch (err) { console.error('Path finding failed:', err); }
    finally { setPathLoading(false); }
  };

  const jumpToPerson = (personId: string) => {
    const node = dataRef.current.nodes.find(n => n.id === personId);
    if (node) { viewRef.current.x = -node.x * viewRef.current.scale; viewRef.current.y = -node.y * viewRef.current.scale; setSelectedNode(node); }
    setCommandOpen(false);
  };

  const focusOnPerson = (personId: string) => { setFocusPersonId(personId); setFocusMode(true); setCommandOpen(false); };

  const applySavedView = (view: SavedView) => {
    const filters = view.filters;
    if (filters.city) setSelectedCity(filters.city);
    if (filters.focusDepth && filters.focusPersonId) { setFocusDepth(filters.focusDepth); setFocusPersonId(filters.focusPersonId); setFocusMode(true); }
    if (filters.showAncestors !== undefined) setShowAncestors(filters.showAncestors);
    if (filters.showDescendants !== undefined) setShowDescendants(filters.showDescendants);
    setCommandOpen(false);
  };

  const saveCurrentView = async () => {
    const name = prompt('Enter a name for this view:');
    if (!name) return;
    const filters: Record<string, any> = {};
    if (selectedCity) filters.city = selectedCity;
    if (selectedFamily) filters.familyId = selectedFamily;
    if (focusMode && focusPersonId) { filters.focusPersonId = focusPersonId; filters.focusDepth = focusDepth; filters.showAncestors = showAncestors; filters.showDescendants = showDescendants; }
    try {
      const newView = await api<SavedView>('/api/v1/graph/views', { method: 'POST', body: JSON.stringify({ name, filters, isShared: false }) });
      setSavedViews(prev => [newView, ...prev]);
    } catch (err) { console.error('Failed to save view:', err); }
  };

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const c = containerRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect(); const v = viewRef.current;
    return { x: (sx - r.left - r.width / 2 - v.x) / v.scale, y: (sy - r.top - r.height / 2 - v.y) / v.scale };
  }, []);

  const findNode = useCallback((wx: number, wy: number): SimNode | null => {
    const nodes = dataRef.current.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; const dx = n.x - wx, dy = n.y - wy; if (dx * dx + dy * dy < (n.r + 8) * (n.r + 8)) return n; }
    return null;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const w = screenToWorld(e.clientX, e.clientY); const node = findNode(w.x, w.y);
    if (node) dragRef.current = { node, offsetX: node.x - w.x, offsetY: node.y - w.y };
    else panRef.current = { active: true, startX: e.clientX, startY: e.clientY, startVX: viewRef.current.x, startVY: viewRef.current.y };
  }, [screenToWorld, findNode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const w = screenToWorld(e.clientX, e.clientY);
    if (dragRef.current.node) { const n = dragRef.current.node; n.x = w.x + dragRef.current.offsetX; n.y = w.y + dragRef.current.offsetY; n.vx = 0; n.vy = 0; simRef.current.alpha = Math.max(simRef.current.alpha, 0.3); }
    else if (panRef.current.active) { viewRef.current.x = panRef.current.startVX + (e.clientX - panRef.current.startX); viewRef.current.y = panRef.current.startVY + (e.clientY - panRef.current.startY); }
    else mouseRef.current.hovered = findNode(w.x, w.y);
  }, [screenToWorld, findNode]);

  const onMouseUp = useCallback(() => { dragRef.current = { node: null, offsetX: 0, offsetY: 0 }; panRef.current.active = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault(); const c = containerRef.current; if (!c) return;
    const r = c.getBoundingClientRect(); const mx = e.clientX - r.left - r.width / 2; const my = e.clientY - r.top - r.height / 2;
    const delta = e.deltaY > 0 ? 0.9 : 1.1; const newScale = Math.max(0.1, Math.min(4, viewRef.current.scale * delta));
    const ratio = newScale / viewRef.current.scale; viewRef.current.x = mx - (mx - viewRef.current.x) * ratio; viewRef.current.y = my - (my - viewRef.current.y) * ratio; viewRef.current.scale = newScale;
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => { if (panRef.current.active) return; const w = screenToWorld(e.clientX, e.clientY); setSelectedNode(findNode(w.x, w.y)); }, [screenToWorld, findNode]);
  const onDoubleClick = useCallback((e: React.MouseEvent) => { const w = screenToWorld(e.clientX, e.clientY); const node = findNode(w.x, w.y); if (node) focusOnPerson(node.id); }, [screenToWorld, findNode]);

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container || loading) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number; simRef.current.running = true;

    const resize = () => { const r = container.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; canvas.width = r.width * dpr; canvas.height = r.height * dpr; canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);

    const physics = () => {
      const { nodes, edges } = dataRef.current; const sim = simRef.current;
      if (nodes.length === 0 || sim.alpha < 0.001) return;
      for (const node of nodes) {
        if (dragRef.current.node?.id === node.id) continue;
        let fx = 0, fy = 0;
        for (const other of nodes) { if (other.id === node.id) continue; const dx = node.x - other.x, dy = node.y - other.y; const d2 = dx * dx + dy * dy; if (d2 < 1 || d2 > 50000) continue; const d = Math.sqrt(d2); const f = 600 / d2; fx += (dx / d) * f; fy += (dy / d) * f; }
        for (const edge of edges) { let other: SimNode | undefined; if (edge.source === node.id) other = nodes.find(n => n.id === edge.target); else if (edge.target === node.id) other = nodes.find(n => n.id === edge.source); if (!other) continue; const dx = other.x - node.x, dy = other.y - node.y; const d = Math.sqrt(dx * dx + dy * dy) || 1; const target = edge.type === 'SPOUSE_OF' ? 45 : 65; const f = (d - target) * 0.025; fx += (dx / d) * f; fy += (dy / d) * f; }
        const family = nodes.filter(n => n.familyId === node.familyId && n.id !== node.id);
        if (family.length > 0) { const cx = family.reduce((s, n) => s + n.x, 0) / family.length; const cy = family.reduce((s, n) => s + n.y, 0) / family.length; fx += (cx - node.x) * 0.002; fy += (cy - node.y) * 0.002; }
        fx -= node.x * 0.0003; fy -= node.y * 0.0003; node.vx = (node.vx + fx * sim.alpha) * 0.6; node.vy = (node.vy + fy * sim.alpha) * 0.6; node.x += node.vx; node.y += node.vy;
      }
      sim.alpha *= 0.995;
    };

    const render = () => {
      if (!simRef.current.running) return; physics();
      const r = container.getBoundingClientRect(); const w = r.width, h = r.height; const v = viewRef.current;
      const { nodes, edges } = dataRef.current; const hovered = mouseRef.current.hovered;
      // Gradient background
      const bgGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
      bgGradient.addColorStop(0, '#1e1b4b'); // Deep indigo center
      bgGradient.addColorStop(0.5, '#0f172a'); // Slate middle
      bgGradient.addColorStop(1, '#020617'); // Near black edges
      ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'; ctx.lineWidth = 1;
      const gs = 40 * v.scale; const ox = ((w / 2 + v.x) % gs + gs) % gs; const oy = ((h / 2 + v.y) % gs + gs) % gs;
      ctx.beginPath(); for (let x = ox; x < w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (let y = oy; y < h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
      ctx.save(); ctx.translate(w / 2 + v.x, h / 2 + v.y); ctx.scale(v.scale, v.scale);
      const nodeMap: Record<string, SimNode> = {}; nodes.forEach(n => nodeMap[n.id] = n);
      const connected = new Set<string>(); if (hovered) edges.forEach(e => { if (e.source === hovered.id) connected.add(e.target); if (e.target === hovered.id) connected.add(e.source); });

      for (const edge of edges) {
        const src = nodeMap[edge.source], tgt = nodeMap[edge.target]; if (!src || !tgt) continue;
        const hl = hovered && (edge.source === hovered.id || edge.target === hovered.id); const dim = hovered && !hl;
        const isPathEdge = highlightedPath.has(edge.source) && highlightedPath.has(edge.target);
        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
        if (isPathEdge) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.setLineDash([]); }
        else if (edge.type === 'SPOUSE_OF') { ctx.strokeStyle = dim ? 'rgba(236,72,153,0.05)' : hl ? 'rgba(236,72,153,0.9)' : 'rgba(236,72,153,0.35)'; ctx.lineWidth = hl ? 2.5 : 1.5; ctx.setLineDash([5, 5]); }
        else { ctx.strokeStyle = dim ? 'rgba(148,163,184,0.04)' : hl ? 'rgba(148,163,184,0.8)' : 'rgba(148,163,184,0.2)'; ctx.lineWidth = hl ? 2 : 1; ctx.setLineDash([]); }
        ctx.stroke(); ctx.setLineDash([]);
      }

      for (const node of nodes) {
        const isHov = hovered?.id === node.id; const isCon = connected.has(node.id); const isDim = hovered && !isHov && !isCon;
        const isPathNode = highlightedPath.has(node.id); const isFocusCenter = node.id === focusPersonId;
        const radius = isFocusCenter ? node.r * 2 : isPathNode ? node.r * 1.8 : isHov ? node.r * 1.6 : isCon ? node.r * 1.2 : node.r;
        if (isPathNode || isFocusCenter) { const grad = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 25); grad.addColorStop(0, isFocusCenter ? '#eab30860' : '#22c55e60'); grad.addColorStop(1, 'transparent'); ctx.beginPath(); ctx.arc(node.x, node.y, radius + 25, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill(); }
        else if (isHov) { const grad = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius + 18); grad.addColorStop(0, node.color + '50'); grad.addColorStop(1, 'transparent'); ctx.beginPath(); ctx.arc(node.x, node.y, radius + 18, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill(); }
        ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, Math.PI * 2); ctx.fillStyle = isPathNode ? '#22c55e' : isFocusCenter ? '#eab308' : isDim ? node.color + '25' : node.color; ctx.fill();
        if (isFocusCenter) { ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3; ctx.stroke(); }
        else if (isPathNode) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (isHov) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (node.canEdit && !isDim) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
        if (!isDim) { ctx.beginPath(); ctx.arc(node.x - radius * 0.3, node.y - radius * 0.3, radius * 0.22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill(); }
        if (v.scale > 0.4 || isHov || isCon || isPathNode || isFocusCenter) { const fs = Math.round(11 / Math.max(v.scale, 0.5)); ctx.font = (isHov || isPathNode || isFocusCenter ? 'bold ' : '') + fs + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = isDim ? 'rgba(255,255,255,0.1)' : isHov || isPathNode || isFocusCenter ? '#fff' : 'rgba(255,255,255,0.7)'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = isDim ? 0 : 3; ctx.fillText(node.label.split(' ')[0], node.x, node.y + radius + 5); ctx.shadowBlur = 0; }
      }
      ctx.restore(); animId = requestAnimationFrame(render);
    };
    render(); return () => { simRef.current.running = false; window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, [loading, highlightedPath, focusPersonId]);

  const resetView = () => { viewRef.current = { x: 0, y: 0, scale: 1 }; };
  const reheat = () => { simRef.current.alpha = 1; };

  if (loading) return (<div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-slate-400 gap-4"><div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /><p>Loading...</p></div>);

  return (
    <div className="relative h-[calc(100vh-80px)] bg-slate-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-slate-900/95 to-transparent z-50 gap-4 flex-wrap">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => setCommandOpen(true)} className="bg-slate-800/90 border-indigo-500/30 text-slate-200 hover:bg-slate-700">
            <CommandIcon className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Search</span><kbd className="ml-2 px-1.5 py-0.5 text-xs bg-slate-700 rounded">???K</kbd>
          </Button>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)} className="bg-slate-800/90 border border-indigo-500/30 text-slate-200 px-3 py-1.5 rounded-lg text-sm" disabled={focusMode}><option value="">All Families</option>{families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="bg-slate-800/90 border border-indigo-500/30 text-slate-200 px-3 py-1.5 rounded-lg text-sm" disabled={focusMode}><option value="">All Cities</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        <div className="text-slate-500 text-sm">{stats.nodes} people ??? {stats.edges} connections{focusMode && <Badge variant="secondary" className="ml-2">Focus Mode</Badge>}{highlightedPath.size > 0 && <Badge variant="default" className="ml-2 bg-green-600">Path: {highlightedPath.size} steps</Badge>}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setPathDialogOpen(true)} title="Find Relationship"><Route className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={saveCurrentView} title="Save View"><Bookmark className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => viewRef.current.scale = Math.min(4, viewRef.current.scale * 1.3)} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => viewRef.current.scale = Math.max(0.1, viewRef.current.scale / 1.3)} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={resetView} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={reheat} title="Reheat"><Flame className="h-4 w-4" /></Button>
        </div>
      </div>

      {focusMode && (
        <div className="absolute top-16 left-3 bg-slate-800/95 border border-yellow-500/30 rounded-xl p-4 z-50 w-64">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 text-yellow-400"><Focus className="h-4 w-4" /><span className="font-medium">Focus Mode</span></div><Button variant="ghost" size="icon" onClick={exitFocusMode} className="h-6 w-6"><X className="h-4 w-4" /></Button></div>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-400">Depth: {focusDepth} hops</label><Slider value={[focusDepth]} onValueChange={v => setFocusDepth(v[0])} min={1} max={5} step={1} className="mt-1" /></div>
            <div className="flex gap-2">
              <Button variant={showAncestors ? "secondary" : "outline"} size="sm" onClick={() => setShowAncestors(!showAncestors)} className="flex-1">{showAncestors ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}Ancestors</Button>
              <Button variant={showDescendants ? "secondary" : "outline"} size="sm" onClick={() => setShowDescendants(!showDescendants)} className="flex-1">{showDescendants ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}Descendants</Button>
            </div>
          </div>
        </div>
      )}

      {pathResult?.found && pathResult.path && (
        <div className="absolute top-16 right-3 bg-slate-800/95 border border-green-500/30 rounded-xl p-4 z-50 w-72">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 text-green-400"><Route className="h-4 w-4" /><span className="font-medium">{pathResult.degrees} Degrees</span></div><Button variant="ghost" size="icon" onClick={() => { setPathResult(null); setHighlightedPath(new Set()); }} className="h-6 w-6"><X className="h-4 w-4" /></Button></div>
          <div className="space-y-2">{pathResult.path.map((person, idx) => (<div key={person.id}>{idx > 0 && <div className="text-xs text-slate-400 pl-4">??? {person.relationship}</div>}<div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-600/50" onClick={() => jumpToPerson(person.id)}><User className="h-4 w-4 text-green-400" /><div><div className="text-sm text-white">{person.name}</div><div className="text-xs text-slate-400">{person.family_name}</div></div></div></div>))}</div>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={onClick} onDoubleClick={onDoubleClick} onWheel={onWheel}><canvas ref={canvasRef} className="block" /></div>

      {selectedNode && (
        <div className="absolute bottom-5 left-5 bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-5 min-w-[280px] z-50">
          <button onClick={() => setSelectedNode(null)} className="absolute top-3 right-3 text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
          <div className="w-3 h-3 rounded-full mb-2" style={{ background: selectedNode.color }} /><h3 className="text-lg font-semibold text-white">{selectedNode.label}</h3><p className="text-violet-400 text-sm">{selectedNode.familyName}</p>{selectedNode.city && <p className="text-slate-400 text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedNode.city}</p>}
          <div className="flex gap-2 mt-4"><Button size="sm" variant="secondary" onClick={() => focusOnPerson(selectedNode.id)} className="flex-1"><Focus className="h-4 w-4 mr-1" />Focus</Button>{selectedNode.canEdit && <Button size="sm" onClick={() => navigate('/person/' + selectedNode.id)} className="flex-1">View Details</Button>}</div>
          <h4 className="text-slate-400 text-xs uppercase mt-4 mb-2">Connections</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">{dataRef.current.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 8).map((e, i) => { const otherId = e.source === selectedNode.id ? e.target : e.source; const other = dataRef.current.nodes.find(n => n.id === otherId); if (!other) return null; return (<div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/50 cursor-pointer" onClick={() => jumpToPerson(other.id)}><span className="w-2 h-2 rounded-full" style={{ background: other.color }} /><span className="text-slate-200 text-sm flex-1">{other.label}</span><span className="text-slate-500 text-xs">{e.type === 'SPOUSE_OF' ? 'Spouse' : e.source === selectedNode.id ? 'Child' : 'Parent'}</span></div>); })}</div>
        </div>
      )}

      <div className="absolute bottom-5 right-5 bg-slate-900/90 border border-slate-700/50 rounded-xl p-4 min-w-[140px] z-50">
        <div className="text-slate-400 text-xs uppercase mb-2">Legend</div>
        {families.slice(0, 6).map((f, i) => (<div key={f.id} onClick={() => setSelectedFamily(selectedFamily === f.id ? '' : f.id)} className="flex items-center gap-2 py-0.5 text-slate-300 text-sm cursor-pointer hover:text-white" style={{ opacity: !selectedFamily || selectedFamily === f.id ? 1 : 0.4 }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span>{f.name}</span></div>))}
        {families.length > 6 && <div className="text-slate-500 text-xs py-0.5">+{families.length - 6} more</div>}
        <div className="h-px bg-slate-700/50 my-2" />
        <div className="flex items-center gap-2 py-0.5 text-slate-300 text-xs"><span className="w-4 h-0.5 bg-slate-400/50" /><span>Parent-Child</span></div>
        <div className="flex items-center gap-2 py-0.5 text-slate-300 text-xs"><span className="w-4 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, rgba(236,72,153,0.6) 0px, rgba(236,72,153,0.6) 2px, transparent 2px, transparent 4px)' }} /><span>Spouse</span></div>
        <div className="text-slate-500 text-xs mt-2 italic">Double-click to focus</div>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search people or run commands..." value={searchQuery} onValueChange={setSearchQuery} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchResults.length > 0 && (<CommandGroup heading="People">{searchResults.map(person => (<CommandItem key={person.id} onSelect={() => jumpToPerson(person.id)} className="flex items-center gap-2"><User className="h-4 w-4" /><span>{person.name}</span><span className="text-muted-foreground text-sm">??? {person.family_name}</span>{person.current_city && <span className="text-muted-foreground text-xs flex items-center gap-1 ml-auto"><MapPin className="h-3 w-3" />{person.current_city}</span>}</CommandItem>))}</CommandGroup>)}
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setCommandOpen(false); setPathDialogOpen(true); }}><Route className="mr-2 h-4 w-4" /><span>Find Relationship Path</span></CommandItem>
            <CommandItem onSelect={() => { navigate('/person/new'); setCommandOpen(false); }}><Plus className="mr-2 h-4 w-4" /><span>Add New Person</span></CommandItem>
            <CommandItem onSelect={saveCurrentView}><Bookmark className="mr-2 h-4 w-4" /><span>Save Current View</span></CommandItem>
            <CommandItem onSelect={() => { exitFocusMode(); setHighlightedPath(new Set()); }}><X className="mr-2 h-4 w-4" /><span>Clear Focus & Path</span></CommandItem>
          </CommandGroup>
          {savedViews.length > 0 && (<><CommandSeparator /><CommandGroup heading="Saved Views">{savedViews.map(view => (<CommandItem key={view.id} onSelect={() => applySavedView(view)}><Bookmark className="mr-2 h-4 w-4" /><span>{view.name}</span>{view.is_shared && <Badge variant="outline" className="ml-2">Shared</Badge>}</CommandItem>))}</CommandGroup></>)}
          <CommandSeparator />
          <CommandGroup heading="Filter by City">{cities.slice(0, 5).map(city => (<CommandItem key={city} onSelect={() => { setSelectedCity(city); setCommandOpen(false); }}><MapPin className="mr-2 h-4 w-4" /><span>{city}</span></CommandItem>))}</CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Find Relationship</DialogTitle><DialogDescription>Select two people to find the shortest path between them.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-sm font-medium">From Person</label>
              <Command className="border rounded-lg mt-1"><CommandInput placeholder="Search..." onValueChange={async (q) => { if (q.length < 2) return; const results = await api<SearchResult[]>(`/api/v1/graph/search?q=${encodeURIComponent(q)}`); setSearchResults(results || []); }} /><CommandList>{searchResults.map(p => (<CommandItem key={p.id} onSelect={() => setPathFrom(p)}><User className="mr-2 h-4 w-4" />{p.name} ??? {p.family_name}</CommandItem>))}</CommandList></Command>
              {pathFrom && <div className="mt-2 p-2 bg-muted rounded-lg flex items-center gap-2"><User className="h-4 w-4" /><span>{pathFrom.name}</span><Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setPathFrom(null)}><X className="h-3 w-3" /></Button></div>}
            </div>
            <div className="flex justify-center"><ArrowRight className="h-5 w-5 text-muted-foreground" /></div>
            <div><label className="text-sm font-medium">To Person</label>
              <Command className="border rounded-lg mt-1"><CommandInput placeholder="Search..." onValueChange={async (q) => { if (q.length < 2) return; const results = await api<SearchResult[]>(`/api/v1/graph/search?q=${encodeURIComponent(q)}`); setSearchResults(results || []); }} /><CommandList>{searchResults.map(p => (<CommandItem key={p.id} onSelect={() => setPathTo(p)}><User className="mr-2 h-4 w-4" />{p.name} ??? {p.family_name}</CommandItem>))}</CommandList></Command>
              {pathTo && <div className="mt-2 p-2 bg-muted rounded-lg flex items-center gap-2"><User className="h-4 w-4" /><span>{pathTo.name}</span><Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setPathTo(null)}><X className="h-3 w-3" /></Button></div>}
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPathDialogOpen(false)}>Cancel</Button><Button onClick={() => { findPath(); setPathDialogOpen(false); }} disabled={!pathFrom || !pathTo || pathLoading}>{pathLoading ? 'Finding...' : 'Find Path'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
