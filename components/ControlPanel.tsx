import React, { useMemo, useState, useEffect, useRef } from 'react';

export type SearchableNode = {
  id: string;
  title: string;
  title_en?: string | null;
  score: number;
  image_url: string;
  genres: string[];
};

type ControlPanelProps = {
  nodeList: SearchableNode[];
  selectedNodes: Set<string>;
  visibleNodeIds: Set<string>;
  onToggleNode: (nodeId: string) => void;
  onClearSelection: () => void;
  minStrength: number;
  setMinStrength: (v: number) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  visibleCount: number;
  focusOnNode: (nodeId: string) => void;
  
  allGenres: string[];
  selectedGenres: Set<string>;
  toggleGenreFilter: (genre: string) => void;
  clearGenreFilter: () => void;

  isAwardWinningOnly: boolean;
  toggleAwardWinningOnly: () => void;
};

const getDisplayTitle = (node: SearchableNode) => {
  return node.title_en && node.title_en.trim() !== '' ? node.title_en : node.title;
};

const GenreFilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  allGenres: string[];
  selectedGenres: Set<string>;
  toggleGenre: (g: string) => void;
  onClear: () => void;
}> = ({ isOpen, onClose, allGenres, selectedGenres, toggleGenre, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden pointer-events-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Genre Filter</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-2">
            {allGenres.map((genre) => (
              <label key={genre} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedGenres.has(genre)}
                  onChange={() => toggleGenre(genre)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700">{genre}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button 
            onClick={onClear}
            className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  nodeList,
  selectedNodes,
  visibleNodeIds,
  onToggleNode,
  onClearSelection,
  minStrength,
  setMinStrength,
  minScore,
  setMinScore,
  visibleCount,
  focusOnNode,
  allGenres,
  selectedGenres,
  toggleGenreFilter,
  clearGenreFilter,
  isAwardWinningOnly,
  toggleAwardWinningOnly
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsPanelOpen(false);
    }
  }, []);

  const [position, setPosition] = useState({ x: 20, y: 80 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (['INPUT', 'BUTTON', 'LABEL'].includes((e.target as HTMLElement).tagName)) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.cursor = 'grabbing';
  };

  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    const lower = searchQuery.toLowerCase();
    return nodeList
      .filter((n) => {
        const t1 = n.title.toLowerCase();
        const t2 = n.title_en?.toLowerCase() || '';
        return t1.includes(lower) || t2.includes(lower);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [searchQuery, nodeList]);

  const selectedNodeObjects = useMemo(() => {
    return nodeList.filter((n) => selectedNodes.has(n.id));
  }, [nodeList, selectedNodes]);

  const relatedNodeObjects = useMemo(() => {
    if (selectedNodes.size === 0) return [];
    return nodeList
      .filter((n) => visibleNodeIds.has(n.id) && !selectedNodes.has(n.id))
      .sort((a, b) => b.score - a.score);
  }, [nodeList, visibleNodeIds, selectedNodes]);

  const handleSelectSuggestion = (node: SearchableNode) => {
    if (!selectedNodes.has(node.id)) {
      onToggleNode(node.id);
    }
    focusOnNode(node.id);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <>
      <GenreFilterModal 
        isOpen={isGenreModalOpen} 
        onClose={() => setIsGenreModalOpen(false)}
        allGenres={allGenres}
        selectedGenres={selectedGenres}
        toggleGenre={toggleGenreFilter}
        onClear={clearGenreFilter}
      />

      <div 
        ref={panelRef}
        className={`
          absolute z-20 transition-all duration-300
          /* Important: Let clicks pass through the container itself */
          pointer-events-none
          /* Mobile: Fixed top */
          left-4 top-16 w-[calc(100vw-2rem)] max-w-sm
          /* Desktop: Free positioning */
          md:w-80 md:auto
        `}
        style={{ 
          left: typeof window !== 'undefined' && window.innerWidth >= 768 ? position.x : undefined,
          top: typeof window !== 'undefined' && window.innerWidth >= 768 ? position.y : undefined,
          opacity: isDragging.current ? 0.7 : 1 
        }}
      >
        <div className="flex flex-col gap-2">
          
          {/* 1. Search Bar (Always visible & pointer-events-auto) */}
          <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 pointer-events-auto">
            <div className="flex items-center px-3">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Search manga..."
                className="w-full px-3 py-3 rounded-lg outline-none text-sm text-gray-800 bg-transparent"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            {/* Suggestions */}
            {showSuggestions && searchQuery && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto divide-y divide-gray-50 z-30">
                {suggestions.map((node) => {
                  const mainTitle = getDisplayTitle(node);
                  const subTitle = mainTitle !== node.title ? node.title : null;
                  return (
                    <li
                      key={node.id}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors flex items-center gap-3"
                      onClick={() => handleSelectSuggestion(node)}
                    >
                      <div className="flex-shrink-0 w-8 h-10 bg-gray-200 rounded overflow-hidden">
                        <img src={node.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex justify-between items-start flex-1 min-w-0">
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-gray-900 truncate">{mainTitle}</span>
                          {subTitle && <span className="text-[10px] text-gray-400 truncate">{subTitle}</span>}
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0 ml-2 mt-0.5">★{node.score}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 2. Mobile Toggle Button (pointer-events-auto) */}
          <div className="md:hidden flex justify-start pointer-events-auto">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="bg-white/90 backdrop-blur text-gray-600 px-3 py-1.5 rounded-full shadow-md border border-gray-200 font-bold text-xs flex items-center gap-1 hover:bg-gray-50"
            >
              <span className="text-sm">{isPanelOpen ? '✕' : '⚙'}</span>
              <span>{isPanelOpen ? 'Close Filters' : 'Filters & Lists'}</span>
            </button>
          </div>

          {/* 3. Panel Content (pointer-events-auto) */}
          <div 
            onMouseDown={onMouseDown}
            className={`
              ${!isPanelOpen ? 'hidden md:flex' : 'flex'} 
              bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 flex-col 
              pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden flex-1 min-h-0 max-h-[50vh] md:max-h-[85vh]
            `}
          >
            <div className="p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar" onMouseDown={(e) => e.stopPropagation()}>
              
              {/* --- Filters --- */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 p-2 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                     onClick={toggleAwardWinningOnly}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-xs font-bold text-yellow-800">Award Winning Only</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isAwardWinningOnly ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${isAwardWinningOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className={isAwardWinningOnly ? 'opacity-50 pointer-events-none' : ''}>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-2 select-none">
                    <span>Genre Filter</span>
                    {selectedGenres.size > 0 && <span className="text-green-600 bg-green-50 px-1.5 rounded">{selectedGenres.size} selected</span>}
                  </div>
                  <button onClick={() => setIsGenreModalOpen(true)} disabled={isAwardWinningOnly} className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center disabled:bg-gray-100">
                    <span>Select Genres...</span>
                    <span className="text-gray-400">▶</span>
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-2 select-none">
                    <span>Relevance Strictness</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[10px]">
                      {minStrength < 0.15 ? 'Broad' : minStrength < 0.30 ? 'Normal' : 'Strict'}
                    </span>
                  </div>
                  <input type="range" min="0" max="0.5" step="0.01" value={minStrength} onChange={(e) => setMinStrength(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none" />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-2 select-none">
                    <span>Minimum Rating</span>
                    <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">★ {minScore.toFixed(1)}+</span>
                  </div>
                  <input type="range" min="1" max="9.5" step="0.5" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 text-xs text-center text-gray-400 select-none">
                Showing: <span className="font-bold text-gray-700 text-sm">{visibleCount}</span> manga
              </div>

              {/* --- Lists --- */}
              {(selectedNodes.size > 0 || relatedNodeObjects.length > 0) && (
                <div className="flex flex-col gap-3">
                  {/* Selected List */}
                  {selectedNodes.size > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-blue-600">Selected ({selectedNodes.size})</span>
                        <button onClick={onClearSelection} className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded font-bold transition">Clear All</button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {selectedNodeObjects.map((node) => (
                          <label key={node.id} className="flex items-center gap-2 px-2 py-1.5 bg-blue-50/50 hover:bg-blue-100 rounded cursor-pointer border border-blue-100">
                            <input type="checkbox" checked={true} onChange={() => onToggleNode(node.id)} className="accent-blue-600 cursor-pointer w-3.5 h-3.5" />
                            <span className="text-xs text-gray-700 truncate font-bold flex-1" onClick={(e) => { e.preventDefault(); focusOnNode(node.id); }}>{getDisplayTitle(node)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related List */}
                  {relatedNodeObjects.length > 0 && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-dashed border-gray-200">
                      <span className="text-xs font-bold text-gray-500 mb-1">Related ({relatedNodeObjects.length})</span>
                      <div className="flex flex-col gap-1">
                        {relatedNodeObjects.map((node) => (
                          <label key={node.id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer group transition-colors">
                            <input type="checkbox" checked={false} onChange={() => onToggleNode(node.id)} className="accent-blue-600 cursor-pointer w-3.5 h-3.5 opacity-50 group-hover:opacity-100 mt-0.5" />
                            <div className="flex-shrink-0 w-8 h-10 bg-gray-200 rounded overflow-hidden relative">
                              <img src={node.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex flex-col overflow-hidden flex-1">
                              <span className="text-xs text-gray-600 truncate group-hover:text-blue-600 transition font-medium" onClick={(e) => { e.preventDefault(); focusOnNode(node.id); }}>{getDisplayTitle(node)}</span>
                              <span className="text-[10px] text-gray-400">★{node.score}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ControlPanel;