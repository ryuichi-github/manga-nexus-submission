import React, { useState, useEffect, useMemo } from 'react';
import { SearchableNode } from './ControlPanel';

type DiscoveryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  nodeList: SearchableNode[];
  onComplete: (selectedIds: string[]) => void;
};

const GRID_SIZE = 25; // 5x5

const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  isOpen,
  onClose,
  nodeList,
  onComplete,
}) => {
  const [displayedNodes, setDisplayedNodes] = useState<SearchableNode[]>([]);

  // Score 8.0 or higher, or Award Winning works
  const candidates = useMemo(() => {
    return nodeList.filter((n) => {
      const isHighScore = n.score >= 8.0;
      const isAwardWinning = n.genres && n.genres.includes('Award Winning');
      return isHighScore || isAwardWinning;
    });
  }, [nodeList]);

  // Function to randomly select 25 nodes
  const refreshNodes = () => {
    if (candidates.length === 0) return;
    
    // Shuffle
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    setDisplayedNodes(shuffled.slice(0, GRID_SIZE));
  };

  // Initialize when the modal is opened
  useEffect(() => {
    if (isOpen) {
      refreshNodes();
    }
  }, [isOpen, candidates]);

  const handleSelect = (node: SearchableNode) => {
    onComplete([node.id]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Discovery Mode</h3>
            <p className="text-xs text-gray-500">Select a manga you like to start exploring.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold px-2 text-xl">
            ✕
          </button>
        </div>

        {/* Content: 5x5 Grid */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {displayedNodes.map((node) => (
              <div 
                key={node.id}
                onClick={() => handleSelect(node)}
                className="group relative aspect-[2/3] cursor-pointer rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-500 hover:scale-[1.02] transition-all duration-200"
              >
                {/* Image */}
                <img 
                  src={node.image_url} 
                  alt={node.title} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay Title (Hover or Bottom) */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-6 opacity-100 transition-opacity">
                  <p className="text-white text-[10px] md:text-xs font-bold leading-tight line-clamp-2">
                    {node.title_en || node.title}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] bg-yellow-500/90 text-white px-1 rounded">★{node.score}</span>
                  </div>
                </div>

                {/* Hover Effect Layer */}
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm transform scale-90 group-hover:scale-100 transition-transform">
                    Select
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: Refresh Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center items-center gap-4 flex-shrink-0">
          <span className="text-xs text-gray-400">Don't know any of these?</span>
          <button
            onClick={refreshNodes}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-800 text-gray-600 rounded-full text-sm font-bold transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh Candidates
          </button>
        </div>

      </div>
    </div>
  );
};

export default DiscoveryModal;