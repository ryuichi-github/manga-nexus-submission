import Image from 'next/image';
import React from 'react';

export type MangaNode = {
  id: string;
  title: string;
  title_en?: string | null;
  image_url: string;
  score: number;
  scored_by: number;
  genres: string[];
  label?: string;
  author?: string;
  description?: string;
};

type DetailPanelProps = {
  selected?: MangaNode | null;
  onReset: () => void;
};

const DetailPanel: React.FC<DetailPanelProps> = ({ selected, onReset }) => {
  const handleGoogleSearch = () => {
    if (!selected) return;
    const query = selected.title_en || selected.title;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query + ' manga synopsis')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getTitles = () => {
    if (!selected) return { main: '', sub: null };
    const hasEnglishTitle = selected.title_en && selected.title_en.trim() !== '';
    if (hasEnglishTitle) {
      return { main: selected.title_en, sub: selected.title };
    } else {
      return { main: selected.title, sub: null };
    }
  };

  const { main: mainTitle, sub: subTitle } = getTitles();

  return (
    // Mobile: Padding reduced (p-4 -> p-3)
    <aside className="bg-white p-3 md:p-6 h-full flex flex-col w-full relative">
      
      {/* Mobile Handle */}
      <div className="md:hidden w-8 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

      {/* Header: Compact on mobile */}
      <div className="flex items-center justify-between mb-2 md:mb-6 flex-shrink-0">
        <h2 className="text-sm md:text-lg font-bold text-gray-800">Details</h2>
        <button onClick={onReset} className="p-1 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm"><p>Select a node</p></div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
          
          {/* Main Content Area */}
          <div className="flex flex-row md:flex-col gap-3">
            
            {/* Image: Tiny on mobile (w-16) */}
            <div className="relative w-16 h-24 md:w-full md:aspect-[2/3] md:h-auto flex-shrink-0 rounded overflow-hidden shadow-sm bg-gray-50">
              <Image
                src={selected.image_url}
                alt={mainTitle || selected.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 300px, 100px"
                priority
              />
            </div>

            {/* Info */}
            <div className="flex flex-col justify-start gap-1 min-w-0 flex-1">
              <div>
                <h3 className="text-sm md:text-xl font-bold text-gray-900 leading-tight line-clamp-2 md:line-clamp-none">
                  {mainTitle}
                </h3>
                {subTitle && <p className="text-[10px] md:text-sm text-gray-500 mt-0.5 line-clamp-1">{subTitle}</p>}
              </div>
              
              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">
                  <span className="text-xs md:text-sm font-bold">★ {selected.score}</span>
                </div>
                <span className="text-[9px] md:text-[10px] text-gray-300 border border-gray-100 px-1 py-0.5 rounded font-mono">ID:{selected.id}</span>
              </div>

              {/* Mobile Action Button (moved here for better reach) */}
              <button
                onClick={handleGoogleSearch}
                className="md:hidden mt-2 w-full flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 py-1.5 px-3 rounded text-xs font-bold active:bg-blue-100 transition-colors"
              >
                Google Synopsis
              </button>
            </div>
          </div>

          {/* Desktop Action Button (hidden on mobile) */}
          <button
            onClick={handleGoogleSearch}
            className="hidden md:flex w-full items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-2 px-4 rounded-lg text-sm font-bold transition-colors"
          >
            Search synopsis
          </button>

          {/* Details (Genres & Desc) */}
          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap gap-1">
                {selected.genres.slice(0, 5).map((genre) => (
                  <span key={genre} className="inline-block px-1.5 py-0.5 text-[10px] md:text-xs font-medium rounded bg-gray-100 text-gray-600 border border-gray-200">
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {selected.description && (
              <div>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Synopsis</p>
                <p className="text-xs md:text-sm leading-relaxed text-gray-700 whitespace-pre-line line-clamp-4 md:line-clamp-none">
                  {selected.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default DetailPanel;