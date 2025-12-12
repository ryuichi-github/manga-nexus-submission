'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Graph from 'graphology';
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useSigma,
} from '@react-sigma/core';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import '@react-sigma/core/lib/style.css';
import { MangaNode } from './DetailPanel';
import ControlPanel, { SearchableNode } from './ControlPanel';
import DiscoveryModal from './DiscoveryModal';

// ==========================================
// Settings
const LOAD_MIN_SCORE = 1.0;
const INITIAL_MIN_STRENGTH = 0.0;
const INITIAL_DISPLAY_SCORE = 6.0;
// ==========================================

// --- Types ---
type RawNode = {
  id: string;
  title: string;
  title_en?: string | null;
  image_url: string;
  score: number;
  scored_by: number;
  genres: string[];
};

type RawEdge = {
  source: string;
  target: string;
  strength: number;
};

type GraphData = {
  nodes: RawNode[];
  edges: RawEdge[];
};

type TooltipState = {
  node: RawNode;
  position: { x: number; y: number };
} | null;

type GraphViewProps = {
  selectedNodes: Set<string>;
  onToggleNode: (node: MangaNode) => void;
  onClearSelection: () => void;
  isDiscoveryOpen: boolean;
  onDiscoveryClose: () => void;
  // ▼ 追加: 親から受け取る「開く」関数
  onDiscoveryOpen: () => void;
};

// --- Helper: Get Display Title (English Priority) ---
const getDisplayTitle = (node: RawNode) => {
  return node.title_en && node.title_en.trim() !== '' ? node.title_en : node.title;
};

// --- Colors ---
const GENRE_COLORS: Record<string, string> = {
  Action: '#ef4444', Adventure: '#f97316', Comedy: '#eab308', Drama: '#8b5cf6',
  Fantasy: '#06b6d4', 'Sci-Fi': '#10b981', Suspense: '#4f46e5', Mystery: '#4f46e5',
  Romance: '#ec4899', Supernatural: '#d946ef', Horror: '#1f2937', 'Slice of Life': '#84cc16',
  Sports: '#3b82f6', Hentai: '#9f1239', Erotica: '#9f1239', 'Boys Love': '#db2777',
  'Award Winning': '#fbbf24', 
  Default: '#94a3b8',
};

const getGenreColor = (genres: string[]): string => {
  if (!genres || genres.length === 0) return GENRE_COLORS.Default;
  const primaryGenre = genres.find(g => g !== 'Award Winning');
  if (primaryGenre && GENRE_COLORS[primaryGenre]) {
    return GENRE_COLORS[primaryGenre];
  }
  if (genres.includes('Award Winning')) return '#fbbf24'; 
  return GENRE_COLORS.Default;
};

const convertToMangaNode = (raw: RawNode): MangaNode => ({
  id: raw.id,
  title: raw.title,
  title_en: raw.title_en,
  image_url: raw.image_url,
  score: raw.score,
  scored_by: raw.scored_by,
  genres: raw.genres,
  label: getDisplayTitle(raw),
  author: "", description: ""
});

// --- Feature 1: Tooltip ---
const Tooltip: React.FC<{ tooltip: TooltipState }> = ({ tooltip }) => {
  if (!tooltip) return null;
  const color = getGenreColor(tooltip.node.genres);
  const mainTitle = getDisplayTitle(tooltip.node);
  const subTitle = mainTitle !== tooltip.node.title ? tooltip.node.title : null;

  return (
    <div
      className="absolute z-10 p-3 rounded-xl shadow-xl bg-white/95 backdrop-blur border border-gray-100 text-sm text-gray-800 pointer-events-none flex gap-3 min-w-[280px]"
      style={{
        left: tooltip.position.x + 15,
        top: tooltip.position.y + 15,
        borderLeft: `4px solid ${color}`
      }}
    >
      <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-100 shadow-sm">
        {tooltip.node.image_url ? (
          <Image 
            src={tooltip.node.image_url} 
            alt={mainTitle} 
            fill 
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex flex-col">
          <p className="font-bold text-base text-gray-900 line-clamp-2 leading-tight">{mainTitle}</p>
          {subTitle && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{subTitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs px-2 py-0.5 rounded font-bold">
            ★ {tooltip.node.score ?? '-'}
          </span>
          <span className="text-[10px] text-gray-400">
            {tooltip.node.scored_by ? `${tooltip.node.scored_by.toLocaleString()} users` : '-'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-auto">
          {tooltip.node.genres && tooltip.node.genres.slice(0, 3).map(g => (
            <span key={g} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Interactive Graph Logic
// ==========================================
type InteractiveGraphProps = {
  selectedNodes: Set<string>;
  onToggleNode: (nodeId: string) => void;
  setTooltip: (t: TooltipState) => void;
  onClearSelection: () => void;
  minStrength: number;
  minScore: number;
  onUpdateVisibleNodes: (nodeIds: Set<string>) => void;
  assignFocusFn: (fn: (nodeId: string) => void) => void;
  selectedGenres: Set<string>;
  isAwardWinningOnly: boolean;
};

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({
  selectedNodes,
  onToggleNode,
  setTooltip,
  onClearSelection,
  minStrength,
  minScore,
  onUpdateVisibleNodes,
  assignFocusFn,
  selectedGenres,
  isAwardWinningOnly,
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const registerEvents = useRegisterEvents();

  const dragInfoRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const handleFocus = useCallback((nodeId: string) => {
    if (!graph.hasNode(nodeId)) return;
    const nodeDisplayData = sigma.getNodeDisplayData(nodeId);
    if (!nodeDisplayData) return;
    sigma.getCamera().animate(
      { 
        x: nodeDisplayData.x, 
        y: nodeDisplayData.y, 
        ratio: sigma.getCamera().ratio // Maintain current zoom
      }, 
      { duration: 800, easing: 'cubicInOut' }
    );
  }, [graph, sigma]);

  useEffect(() => {
    assignFocusFn((nodeId: string) => handleFocus(nodeId));
  }, [assignFocusFn, handleFocus]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfoRef.current) return;
      const { nodeId, startX, startY, isDragging } = dragInfoRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (!isDragging && dist > 5) {
        dragInfoRef.current.isDragging = true;
        if (!graph.hasNodeAttribute(nodeId, 'fixed')) {
          graph.setNodeAttribute(nodeId, 'fixed', true);
        }
        setTooltip(null);
        sigma.getContainer().style.cursor = 'grabbing';
      }

      if (dragInfoRef.current.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        const rect = sigma.getContainer().getBoundingClientRect();
        const mouseGraphPos = sigma.viewportToGraph({ 
          x: e.clientX - rect.left, 
          y: e.clientY - rect.top 
        });
        graph.setNodeAttribute(nodeId, 'x', mouseGraphPos.x);
        graph.setNodeAttribute(nodeId, 'y', mouseGraphPos.y);
        graph.setNodeAttribute(nodeId, 'vx', 0);
        graph.setNodeAttribute(nodeId, 'vy', 0);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragInfoRef.current) return;
      const { nodeId, isDragging } = dragInfoRef.current;

      if (isDragging) {
        if (graph.hasNode(nodeId)) {
          graph.removeNodeAttribute(nodeId, 'fixed');
        }
      } else {
        const attrs = graph.getNodeAttributes(nodeId) as RawNode;
        onToggleNode(convertToMangaNode(attrs).id);
        handleFocus(nodeId);
      }

      dragInfoRef.current = null;
      sigma.getContainer().style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    registerEvents({
      downNode: (e) => {
        if ('button' in e.event.original && (e.event.original as MouseEvent).button !== 0) return;
        e.event.original.stopPropagation();
        
        const touches = (e.event.original as any).touches;
        const clientX = touches && touches.length > 0 ? touches[0].clientX : (e.event.original as MouseEvent).clientX;
        const clientY = touches && touches.length > 0 ? touches[0].clientY : (e.event.original as MouseEvent).clientY;

        dragInfoRef.current = {
          nodeId: e.node,
          startX: clientX,
          startY: clientY,
          isDragging: false,
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      clickStage: () => {},
      enterNode: ({ node }) => {
        setHoveredNode(node);
        if (!dragInfoRef.current) sigma.getContainer().style.cursor = 'grab';
      },
      leaveNode: () => {
        setHoveredNode(null);
        if (!dragInfoRef.current) sigma.getContainer().style.cursor = 'default';
      },
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [registerEvents, sigma, graph, onToggleNode, setTooltip, onClearSelection, handleFocus]);


  useEffect(() => {
    let frameId: number;
    const animate = () => {
      if (graph.order > 0) {
        forceAtlas2.assign(graph, {
          iterations: 3,
          settings: {
            adjustSizes: true,
            gravity: 0.1,
            scalingRatio: 80,
            slowDown: 10,
            barnesHutOptimize: true,
            outboundAttractionDistribution: true,
            edgeWeightInfluence: 1, 
          }
        });
      }
      frameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frameId);
  }, [graph]);


  useEffect(() => {
    if (!hoveredNode || dragInfoRef.current?.isDragging) {
      setTooltip(null); return;
    }
    const nodeDisplay = sigma.getNodeDisplayData(hoveredNode);
    if (!nodeDisplay || nodeDisplay.hidden) {
        setTooltip(null); return;
    }
    setTooltip({
      node: graph.getNodeAttributes(hoveredNode) as RawNode,
      position: sigma.graphToViewport({ x: nodeDisplay.x, y: nodeDisplay.y }),
    });
  }, [hoveredNode, sigma, graph, setTooltip]); 


  useEffect(() => {
    const isNodeValid = (nodeId: string): boolean => {
        if (!graph.hasNode(nodeId)) return false;
        const attrs = graph.getNodeAttributes(nodeId) as RawNode;
        if ((attrs.score || 0) < minScore) return false;
        if (isAwardWinningOnly) {
           if (!attrs.genres || !attrs.genres.includes('Award Winning')) return false;
        } else {
            if (selectedGenres.size > 0) {
               const hasGenre = attrs.genres && attrs.genres.some(g => selectedGenres.has(g));
               if (!hasGenre) return false;
            }
        }
        return true;
    };

    const validEdges = new Set<string>();
    const nodesWithValidEdges = new Set<string>();

    graph.forEachEdge((edge, attrs) => {
        const w = attrs.weight || 0;
        if (w >= minStrength) {
            validEdges.add(edge);
            nodesWithValidEdges.add(graph.source(edge));
            nodesWithValidEdges.add(graph.target(edge));
        }
    });

    const activeNodes = new Set<string>();
    const selectedArray = Array.from(selectedNodes);

    if (selectedArray.length === 0) {
        graph.forEachNode((node) => {
            if (nodesWithValidEdges.has(node) && isNodeValid(node)) {
                activeNodes.add(node);
            }
        });
    } else {
        const firstId = selectedArray[0];
        if (graph.hasNode(firstId)) {
            let candidates = new Set<string>();
            graph.forEachEdge(firstId, (edge, attrs, source, target) => {
                const neighbor = source === firstId ? target : source;
                if (validEdges.has(edge) && isNodeValid(neighbor)) {
                    candidates.add(neighbor);
                }
            });
            for (let i = 1; i < selectedArray.length; i++) {
                const nextId = selectedArray[i];
                if (graph.hasNode(nextId)) {
                    const nextNeighbors = new Set<string>();
                    graph.forEachEdge(nextId, (edge, attrs, source, target) => {
                        const neighbor = source === nextId ? target : source;
                        if (validEdges.has(edge) && isNodeValid(neighbor)) {
                            nextNeighbors.add(neighbor);
                        }
                    });
                    candidates = new Set([...candidates].filter(x => nextNeighbors.has(x)));
                }
            }
            selectedArray.forEach(id => activeNodes.add(id));
            candidates.forEach(id => activeNodes.add(id));
        }
    }

    onUpdateVisibleNodes(activeNodes);

    sigma.setSetting('nodeReducer', (node, data) => {
      if (!activeNodes.has(node)) {
          return { ...data, hidden: true, label: '' };
      }
      if (selectedNodes.has(node)) {
         return { ...data, zIndex: 20, hidden: false, borderColor: '#333', borderSize: 3, label: data.label };
      }
      return { ...data, borderColor: 'transparent', borderSize: 0, zIndex: 10, hidden: false, label: data.label };
    });

    sigma.setSetting('edgeReducer', (edge, data) => {
      if (!validEdges.has(edge)) return { ...data, hidden: true };
      const ends = graph.extremities(edge);
      if (activeNodes.has(ends[0]) && activeNodes.has(ends[1])) {
         if (selectedNodes.has(ends[0]) || selectedNodes.has(ends[1])) {
             return { ...data, hidden: false, color: '#64748b', zIndex: 10, size: 2 };
         }
         return { ...data, hidden: false, color: '#e2e8f0', zIndex: 0, size: 0.5 };
      }
      return { ...data, hidden: true };
    });
  }, [selectedNodes, graph, sigma, minStrength, minScore, selectedGenres, isAwardWinningOnly, onUpdateVisibleNodes]); 

  return null;
};

const GraphLoader: React.FC<{ data: GraphData | null; setNodeList: (n: RawNode[]) => void }> = ({ data, setNodeList }) => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    if (!data) return;
    const graph = new Graph();
    const loadedNodes: RawNode[] = [];

    const allGenres = Array.from(new Set(data.nodes.flatMap(n => n.genres))).sort();
    const angleStep = (Math.PI * 2) / (allGenres.length || 1);

    data.nodes.forEach((node) => {
      if (node.score < LOAD_MIN_SCORE) return;
      if (!graph.hasNode(node.id)) {
        const primaryGenre = node.genres[0] || 'Default';
        const genreIndex = allGenres.indexOf(primaryGenre);
        const baseAngle = genreIndex >= 0 ? genreIndex * angleStep : 0;
        const jitter = (Math.random() - 0.5) * 1.0; 
        const angle = baseAngle + jitter;
        const radius = 300 + Math.random() * 800; 

        graph.addNode(node.id, {
          ...node,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          size: 3, 
          color: getGenreColor(node.genres),
          label: getDisplayTitle(node),
        });
        loadedNodes.push(node);
      }
    });
    setNodeList(loadedNodes);

    data.edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        const edgeId = `${edge.source}_${edge.target}`;
        if (!graph.hasEdge(edge.source, edge.target)) {
            graph.addEdge(edge.source, edge.target, {
              ...edge,
              id: edgeId,
              weight: edge.strength,
              type: 'line',
              color: '#e2e8f0', 
              size: 1, 
              zIndex: 0,
            });
        }
      }
    });

    graph.forEachNode((node) => {
        if (graph.degree(node) === 0) graph.dropNode(node);
    });

    const degrees = graph.nodes().map((node) => graph.degree(node));
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);

    graph.forEachNode((node) => {
      const degree = graph.degree(node);
      const ratio = (degree - minDegree) / (maxDegree - minDegree || 1);
      const size = 3 + (ratio * 12); 
      graph.setNodeAttribute(node, 'size', size);
      graph.setNodeAttribute(node, 'importance', ratio);
    });

    if (graph.order > 0) {
      forceAtlas2.assign(graph, {
        iterations: 50, 
        settings: {
          adjustSizes: true, 
          gravity: 0.5,
          scalingRatio: 60,
          slowDown: 10,
          barnesHutOptimize: true,
        }
      });
    }

    loadGraph(graph);
  }, [data, loadGraph, setNodeList]);
  return null;
};

const FitViewButton: React.FC = () => {
  const sigma = useSigma();

  const handleFit = () => {
    const graph = sigma.getGraph();
    const { width, height } = sigma.getDimensions();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let count = 0;

    graph.forEachNode((node) => {
      const data = sigma.getNodeDisplayData(node);
      if (data && !data.hidden) {
        minX = Math.min(minX, data.x);
        maxX = Math.max(maxX, data.x);
        minY = Math.min(minY, data.y);
        maxY = Math.max(maxY, data.y);
        count++;
      }
    });

    if (count === 0) return;

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const ratio = Math.max(graphWidth / width, graphHeight / height) * 1.2;
    const finalRatio = Math.min(Math.max(ratio, 0.1), 3.0);

    sigma.getCamera().animate(
      { x: midX, y: midY, ratio: finalRatio },
      { duration: 800, easing: 'cubicInOut' }
    );
  };

  return (
    <button
      onClick={handleFit}
      className="absolute top-4 right-4 z-10 bg-white p-2 rounded-lg shadow-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
      title="Fit View"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    </button>
  );
};

const ResetSelectionButton: React.FC<{ onReset: () => void; isVisible: boolean }> = ({ onReset, isVisible }) => {
  if (!isVisible) return null;
  return (
    <button
      onClick={onReset}
      className="absolute top-4 right-14 z-10 bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-xs font-bold flex items-center gap-1"
    >
      <span>✕</span>
      <span>Reset</span>
    </button>
  );
};

// ▼ 追加: Discovery Button Definition (Mobile optimized)
const DiscoveryButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      // Mobile: Bottom right (standard FAB), Desktop: Bottom left
      className="absolute z-10 
        bottom-24 right-4 
        md:bottom-6 md:left-6 md:right-auto 
        bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 md:px-5 md:py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-bold"
    >
      <span className="text-xl">🚀</span>
      <span className="hidden md:inline">Discovery Mode</span>
    </button>
  );
};

const GraphView: React.FC<GraphViewProps> = ({ 
  selectedNodes, 
  onToggleNode, 
  onClearSelection,
  isDiscoveryOpen,
  onDiscoveryClose,
  onDiscoveryOpen // 受け取り
}) => {
  const [data, setData] = useState<GraphData | null>(null);
  const [nodeList, setNodeList] = useState<SearchableNode[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  
  const [minStrength, setMinStrength] = useState<number>(INITIAL_MIN_STRENGTH);
  const [minScore, setMinScore] = useState<number>(INITIAL_DISPLAY_SCORE);
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());

  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  
  const [isAwardWinningOnly, setIsAwardWinningOnly] = useState(false);

  const focusFnRef = useRef<((nodeId: string) => void) | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const res = await fetch('/graph-data.json');
            if (!res.ok) return;
            const json = await res.json();
            setData(json);

            const genreSet = new Set<string>();
            json.nodes.forEach((n: RawNode) => {
               n.genres.forEach(g => {
                   if (g !== 'Award Winning') {
                       genreSet.add(g);
                   }
               });
            });
            setAllGenres(Array.from(genreSet).sort());
        } catch (e) { console.error(e); }
    };
    fetchData();
  }, []);

  const handleGraphToggle = (nodeId: string) => {
      const target = nodeList.find(n => n.id === nodeId);
      if (target) {
          const mangaNode: MangaNode = convertToMangaNode(target as unknown as RawNode);
          onToggleNode(mangaNode);
      }
  };

  const toggleGenreFilter = (genre: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const clearGenreFilter = () => {
    setSelectedGenres(new Set());
  };

  const toggleAwardWinningOnly = () => {
      setIsAwardWinningOnly(prev => !prev);
  };

  const handleDiscoveryComplete = (selectedIds: string[]) => {
    onClearSelection();
    setTimeout(() => {
      selectedIds.forEach(id => {
        const target = nodeList.find(n => n.id === id);
        if (target) {
            const mangaNode = convertToMangaNode(target as unknown as RawNode);
            onToggleNode(mangaNode);
        }
      });
    }, 50);
  };

  return (
    <div className="relative w-full select-none h-full [&_a]:hidden">
      <SigmaContainer
        style={{ width: '100%', height: '100%' }}
        className="bg-gray-50 shadow-inner"
        settings={{
          labelDensity: 0.07,
          labelGridCellSize: 60,
          renderEdgeLabels: false,
          defaultNodeColor: '#94a3b8',
          // renderNodeBorder: true, // Removed invalid setting
          allowInvalidContainer: true,
          minCameraRatio: 0.1,
          maxCameraRatio: 4,
        }}
      >
        <GraphLoader data={data} setNodeList={setNodeList as any} />
        {data && (
          <><InteractiveGraph 
            selectedNodes={selectedNodes} 
            onToggleNode={(id) => handleGraphToggle(id)} 
            setTooltip={setTooltip} 
            onClearSelection={onClearSelection}
            minStrength={minStrength}
            minScore={minScore}
            onUpdateVisibleNodes={setVisibleNodeIds}
            assignFocusFn={(fn) => { focusFnRef.current = fn; }}
            selectedGenres={selectedGenres}
            isAwardWinningOnly={isAwardWinningOnly}
          />
          <FitViewButton />
          <ResetSelectionButton onReset={onClearSelection} isVisible={selectedNodes.size > 0} />
          {/* ▼ 追加: Button render */}
          <DiscoveryButton onClick={onDiscoveryOpen} />
    </>
        )}
      </SigmaContainer>
      
      <Tooltip tooltip={tooltip} />

      <ControlPanel 
        nodeList={nodeList}
        selectedNodes={selectedNodes}
        visibleNodeIds={visibleNodeIds}
        onToggleNode={(id) => handleGraphToggle(id)}
        onClearSelection={onClearSelection}
        minStrength={minStrength}
        setMinStrength={setMinStrength}
        minScore={minScore}
        setMinScore={setMinScore}
        visibleCount={visibleNodeIds.size}
        focusOnNode={(id) => focusFnRef.current?.(id)}
        allGenres={allGenres}
        selectedGenres={selectedGenres}
        toggleGenreFilter={toggleGenreFilter}
        clearGenreFilter={clearGenreFilter}
        isAwardWinningOnly={isAwardWinningOnly}
        toggleAwardWinningOnly={toggleAwardWinningOnly}
      />
      <DiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={onDiscoveryClose}
        nodeList={nodeList}
        onComplete={handleDiscoveryComplete}
      />
    </div>
  );
};

export default GraphView;