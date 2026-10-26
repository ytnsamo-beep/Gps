import React from 'react';
import { Compass, MapPin, HelpCircle, Navigation, History, Layers } from 'lucide-react';

interface NavbarProps {
  onOpenInfo: () => void;
  onOpenHistory: () => void;
  savedPointsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenInfo,
  onOpenHistory,
  savedPointsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo et Titre */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                Lambert<span className="text-blue-500">93</span>
              </span>
              <span className="rounded-full bg-blue-500/20 text-blue-300 px-2 py-0.5 text-[10px] font-semibold border border-blue-500/30">
                IGN • EPSG:2154
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Convertisseur géodésique GPS & Repérage Google Maps
            </p>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <History className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline">Historique</span>
            {savedPointsCount > 0 && (
              <span className="rounded-full bg-blue-600 text-white text-[10px] px-1.5 py-0.2 font-mono">
                {savedPointsCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenInfo}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Guide IGN</span>
          </button>
        </div>
      </div>
    </header>
  );
};
