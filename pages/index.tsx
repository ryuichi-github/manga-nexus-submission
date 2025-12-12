import Head from 'next/head';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DetailPanel, { MangaNode } from '../components/DetailPanel';

// Disable SSR for GraphView as it depends on window/document objects
const GraphView = dynamic(() => import('../components/GraphView'), {
  ssr: false,
});

export default function Home() {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [lastSelectedNode, setLastSelectedNode] = useState<MangaNode | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  // Handle toggling a node's selection status
  const handleToggleNode = (node: MangaNode) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
        if (lastSelectedNode?.id === node.id) setLastSelectedNode(null);
      } else {
        next.add(node.id);
        setLastSelectedNode(node);
      }
      return next;
    });
  };

  // Clear all selected nodes
  const handleClear = () => {
    setSelectedNodes(new Set());
    setLastSelectedNode(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 fixed inset-0">
      <Head>
        <title>Manga Nexus</title>
        {/* Prevent zoom on mobile devices */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Header: Smaller on mobile, fixed height */}
      <header className="flex-none bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm z-30 absolute top-0 left-0 right-0 md:relative">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
              Manga Nexus
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 hidden md:block">
              Combine favorites to find shared recommendations.
              <span className="ml-2 font-medium text-blue-600">
                🚀 Discovery Mode is a good starting point.
              </span>
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center">
  Data Sources: <a href="https://www.kaggle.com/datasets/joshjms/kawaii" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">MangaDataset</a> & <a href="https://mimizun.com/" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">mimizun</a>
</div>
          </div>
          
          {/* Discovery Button (Header version) */}
          <button
            onClick={() => setIsDiscoveryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-md hover:shadow-lg transition-all text-xs md:text-sm font-bold"
          >
            <span className="text-base md:text-lg">🚀</span>
            <span className="hidden md:inline">Discovery Mode</span>
            <span className="md:hidden">Discovery</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative w-full h-full">
        
        {/* Graph Area: Full screen background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <GraphView 
            selectedNodes={selectedNodes} 
            onToggleNode={handleToggleNode} 
            onClearSelection={handleClear}
            isDiscoveryOpen={isDiscoveryOpen}
            onDiscoveryClose={() => setIsDiscoveryOpen(false)}
            // ▼ 追加: グラフ内のボタンからも開けるように関数を渡す
            onDiscoveryOpen={() => setIsDiscoveryOpen(true)}
          />
        </div>

        {/* Detail Panel */}
        {lastSelectedNode && (
          <div className={`
            z-20 shadow-2xl transition-transform duration-300
            /* Mobile Styles: Bottom Sheet */
            fixed bottom-0 left-0 right-0 h-[35vh] rounded-t-xl overflow-hidden bg-white border-t border-gray-200
            /* Desktop Styles: Sidebar*/
            md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:h-full md:w-[350px] md:rounded-none md:border-l md:border-t-0
          `}>
            <div className="h-full overflow-y-auto">
              <DetailPanel selected={lastSelectedNode} onReset={handleClear} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}