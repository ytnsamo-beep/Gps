import React, { useState } from 'react';
import { Copy, Check, ArrowRight, AlertTriangle, MapPin } from 'lucide-react';
import {
  GeoPoint,
  LambertPoint,
  lambert93ToWgs84,
  formatDms,
  isWithinFranceBounds,
  LAMBERT_93_BOUNDS,
} from '../utils/geo';

interface LambertToGpsFormProps {
  initialLambert: LambertPoint;
  onApplyGps: (point: GeoPoint) => void;
}

export const LambertToGpsForm: React.FC<LambertToGpsFormProps> = ({
  initialLambert,
  onApplyGps,
}) => {
  const [xInput, setXInput] = useState(initialLambert.x.toFixed(2));
  const [yInput, setYInput] = useState(initialLambert.y.toFixed(2));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const xNum = parseFloat(xInput.replace(',', '.'));
  const yNum = parseFloat(yInput.replace(',', '.'));

  let gpsResult: GeoPoint | null = null;
  let errorMsg: string | null = null;

  if (!isNaN(xNum) && !isNaN(yNum)) {
    try {
      gpsResult = lambert93ToWgs84(xNum, yNum);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || 'Erreur de calcul inverse';
    }
  }

  const isFrance = gpsResult ? isWithinFranceBounds(gpsResult.lat, gpsResult.lon) : false;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApply = () => {
    if (gpsResult) {
      onApplyGps(gpsResult);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 text-xs text-indigo-300">
        💡 Entrez les coordonnées métriques <strong>Lambert 93 (X, Y)</strong> pour obtenir la latitude et la longitude GPS (WGS84) compatibles avec Google Maps et vos appareils mobiles.
      </div>

      {/* Saisie X et Y */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            X Lambert 93 (Easting en mètres)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              placeholder="Ex: 652458.12"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400">m</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">France métropole : ~100 000 à 1 250 000 m</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Y Lambert 93 (Northing en mètres)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={yInput}
              onChange={(e) => setYInput(e.target.value)}
              placeholder="Ex: 6862314.45"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400">m</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">France métropole : ~6 050 000 à 7 120 000 m</p>
        </div>
      </div>

      {/* RÉSULTAT CONVERSION INVERSE GPS */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 p-5 shadow-xl">
        <h4 className="font-bold text-slate-100 text-sm tracking-wide mb-3 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
          Coordonnées GPS converties (WGS84)
        </h4>

        {errorMsg ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        ) : gpsResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Degrés décimaux */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">Degrés décimaux (DD)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `${gpsResult!.lat.toFixed(6)}, ${gpsResult!.lon.toFixed(6)}`,
                        'dd'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                  >
                    {copiedKey === 'dd' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'dd' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="font-mono text-base sm:text-lg font-bold text-white">
                  {gpsResult.lat.toFixed(6)}, {gpsResult.lon.toFixed(6)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Format idéal pour coller dans Google Maps
                </div>
              </div>

              {/* Degrés Minutes Secondes (DMS) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">Format DMS (Marine/IGN)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `${formatDms(gpsResult!.lat, true)} ${formatDms(gpsResult!.lon, false)}`,
                        'dms'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                  >
                    {copiedKey === 'dms' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'dms' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs sm:text-sm font-semibold text-slate-200">
                  <div>{formatDms(gpsResult.lat, true)}</div>
                  <div>{formatDms(gpsResult.lon, false)}</div>
                </div>
              </div>
            </div>

            {/* Boutons d'action pour afficher sur la carte */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <button
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Afficher ce point sur la carte & boussole</span>
              </button>

              {isFrance ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300">
                  <Check className="h-3 w-3" />
                  <span>Position valide en France métropolitaine</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 text-[11px] text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Hors zone France standard</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
