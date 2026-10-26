import React from 'react';
import { X, Trash2, MapPin, Copy, ExternalLink, Calendar } from 'lucide-react';
import { GeoPoint, LambertPoint, getGoogleMapsUrls } from '../utils/geo';

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  lat: number;
  lon: number;
  x: number;
  y: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Historique des points enregistrés</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Aucun point enregistré pour l’instant. Vos conversions peuvent être sauvegardées en 1 clic.
            </div>
          ) : (
            items.map((item) => {
              const urls = getGoogleMapsUrls({ lat: item.lat, lon: item.lon });
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-white text-sm">{item.name}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className="text-slate-300">
                      <span className="text-slate-500 text-[10px] block">GPS WGS84 :</span>
                      {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
                    </div>
                    <div className="text-blue-300">
                      <span className="text-slate-500 text-[10px] block">Lambert 93 :</span>
                      X: {Math.round(item.x)} | Y: {Math.round(item.y)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white px-2.5 py-1 text-xs font-sans transition"
                      >
                        Charger sur la carte
                      </button>
                      <a
                        href={urls.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 text-xs font-sans transition flex items-center gap-1"
                      >
                        <span>Google Maps</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">{items.length} point(s) en mémoire</span>
            <button
              onClick={onClearAll}
              className="text-rose-400 hover:text-rose-300 transition"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
