import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  LocateFixed,
  Sparkles,
  Info,
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';
import {
  GeoPoint,
  LambertPoint,
  wgs84ToLambert93,
  isWithinFranceBounds,
  decimalToDms,
  dmsToDecimal,
  DmsCoord,
  parseCoordinatesInput,
  PRESET_LOCATIONS,
  PresetLocation,
} from '../utils/geo';

interface GpsToLambertFormProps {
  currentPoint: GeoPoint;
  onChangePoint: (point: GeoPoint) => void;
  onRequestUserLocation: () => void;
  isLocating: boolean;
}

type InputMode = 'decimal' | 'dms' | 'paste';

export const GpsToLambertForm: React.FC<GpsToLambertFormProps> = ({
  currentPoint,
  onChangePoint,
  onRequestUserLocation,
  isLocating,
}) => {
  const [mode, setMode] = useState<InputMode>('decimal');
  const [latInput, setLatInput] = useState(currentPoint.lat.toString());
  const [lonInput, setLonInput] = useState(currentPoint.lon.toString());
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Precision des décimales pour l'affichage Lambert 93
  const [precision, setPrecision] = useState<2 | 3 | 0>(2);

  // DMS state
  const latDmsInit = decimalToDms(currentPoint.lat, true);
  const lonDmsInit = decimalToDms(currentPoint.lon, false);

  const [latDms, setLatDms] = useState<DmsCoord>(latDmsInit);
  const [lonDms, setLonDms] = useState<DmsCoord>(lonDmsInit);

  // Copie
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Synchronisation si le point change de l'extérieur (ex: clic sur carte)
  useEffect(() => {
    setLatInput(currentPoint.lat.toFixed(6));
    setLonInput(currentPoint.lon.toFixed(6));
    setLatDms(decimalToDms(currentPoint.lat, true));
    setLonDms(decimalToDms(currentPoint.lon, false));
    setPasteError(null);
  }, [currentPoint]);

  // Calcul du point Lambert 93
  let lambertResult: LambertPoint | null = null;
  let calculationError: string | null = null;

  try {
    lambertResult = wgs84ToLambert93(currentPoint.lat, currentPoint.lon);
  } catch (err: unknown) {
    calculationError = (err as Error).message || 'Erreur de calcul';
  }

  const isFrance = isWithinFranceBounds(currentPoint.lat, currentPoint.lon);

  // Mise à jour depuis l'onglet décimal
  const handleDecimalChange = (newLatStr: string, newLonStr: string) => {
    setLatInput(newLatStr);
    setLonInput(newLonStr);
    const parsedLat = parseFloat(newLatStr);
    const parsedLon = parseFloat(newLonStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLon) && Math.abs(parsedLat) <= 90 && Math.abs(parsedLon) <= 180) {
      onChangePoint({ lat: parsedLat, lon: parsedLon });
    }
  };

  // Mise à jour depuis l'onglet DMS
  const handleDmsChange = (newLatDms: DmsCoord, newLonDms: DmsCoord) => {
    setLatDms(newLatDms);
    setLonDms(newLonDms);
    const lat = dmsToDecimal(newLatDms);
    const lon = dmsToDecimal(newLonDms);
    onChangePoint({ lat, lon });
  };

  // Traitement texte collé
  const handlePasteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pasteInput.trim()) return;
    const parsed = parseCoordinatesInput(pasteInput);
    if (parsed) {
      setPasteError(null);
      onChangePoint(parsed);
      setMode('decimal');
    } else {
      setPasteError(
        'Format non reconnu. Exemples valides : "48.8584, 2.2945" ou "48°51\'30\"N 2°17\'40\"E"'
      );
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatNumber = (num: number, decimals: number) => {
    return num.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-5">
      {/* Sélecteur de mode de saisie GPS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            onClick={() => setMode('decimal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'decimal'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Degrés décimaux (DD)
          </button>
          <button
            onClick={() => setMode('dms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'dms'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Degrés Min. Sec. (DMS)
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'paste'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span>Coller texte</span>
          </button>
        </div>

        {/* Bouton GPS local */}
        <button
          onClick={onRequestUserLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/60 transition disabled:opacity-50"
        >
          <LocateFixed className={`h-3.5 w-3.5 text-emerald-400 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Détection...' : 'Ma position GPS'}</span>
        </button>
      </div>

      {/* Champs de saisie selon le mode */}
      {mode === 'decimal' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Latitude WGS84 (° Nord/Sud)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => handleDecimalChange(e.target.value, lonInput)}
                placeholder="Ex: 48.858370"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">°N</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Entre -90 et 90 (France: ~41° à 51°)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Longitude WGS84 (° Est/Ouest)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={lonInput}
                onChange={(e) => handleDecimalChange(latInput, e.target.value)}
                placeholder="Ex: 2.294481"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">°E</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Entre -180 et 180 (France: ~-5° à 10°)</p>
          </div>
        </div>
      )}

      {mode === 'dms' && (
        <div className="space-y-3.5">
          {/* Latitude DMS */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Latitude (Degrés ° / Minutes &apos; / Secondes &quot;)
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Degrés</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={latDms.degrees}
                  onChange={(e) =>
                    handleDmsChange(
                      { ...latDms, degrees: parseInt(e.target.value) || 0 },
                      lonDms
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={latDms.minutes}
                  onChange={(e) =>
                    handleDmsChange(
                      { ...latDms, minutes: parseInt(e.target.value) || 0 },
                      lonDms
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Secondes</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="59.99"
                  value={latDms.seconds}
                  onChange={(e) =>
                    handleDmsChange(
                      { ...latDms, seconds: parseFloat(e.target.value) || 0 },
                      lonDms
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Direction</label>
                <select
                  value={latDms.direction}
                  onChange={(e) =>
                    handleDmsChange(
                      { ...latDms, direction: e.target.value as 'N' | 'S' },
                      lonDms
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500"
                >
                  <option value="N">N (Nord)</option>
                  <option value="S">S (Sud)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Longitude DMS */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Longitude (Degrés ° / Minutes &apos; / Secondes &quot;)
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Degrés</label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={lonDms.degrees}
                  onChange={(e) =>
                    handleDmsChange(
                      latDms,
                      { ...lonDms, degrees: parseInt(e.target.value) || 0 }
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={lonDms.minutes}
                  onChange={(e) =>
                    handleDmsChange(
                      latDms,
                      { ...lonDms, minutes: parseInt(e.target.value) || 0 }
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Secondes</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="59.99"
                  value={lonDms.seconds}
                  onChange={(e) =>
                    handleDmsChange(
                      latDms,
                      { ...lonDms, seconds: parseFloat(e.target.value) || 0 }
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Direction</label>
                <select
                  value={lonDms.direction}
                  onChange={(e) =>
                    handleDmsChange(
                      latDms,
                      { ...lonDms, direction: e.target.value as 'E' | 'W' }
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-100 focus:border-blue-500"
                >
                  <option value="E">E (Est)</option>
                  <option value="W">O (Ouest)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'paste' && (
        <form onSubmit={handlePasteSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Coller des coordonnées (Google Maps, GPS, format texte brut)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Ex: 48.858370, 2.294481 ou 48°51'30.1&quot;N 2°17'40.1&quot;E"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow"
            >
              Convertir
            </button>
          </div>
          {pasteError && (
            <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{pasteError}</span>
            </p>
          )}
        </form>
      )}

      {/* RÉSULTATS DE CONVERSION LAMBERT 93 */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950 p-5 shadow-xl relative overflow-hidden">
        {/* Glow décoratif */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h4 className="font-bold text-slate-100 text-sm tracking-wide">
              Résultat officiel Lambert 93 (EPSG:2154)
            </h4>
          </div>

          {/* Choix de précision */}
          <div className="flex items-center gap-1 text-[11px] bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
            <span className="px-2 text-slate-400">Précision :</span>
            <button
              onClick={() => setPrecision(0)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                precision === 0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 m
            </button>
            <button
              onClick={() => setPrecision(2)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                precision === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 cm (std)
            </button>
            <button
              onClick={() => setPrecision(3)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                precision === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 mm
            </button>
          </div>
        </div>

        {calculationError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
            {calculationError}
          </div>
        ) : lambertResult ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Coordonnée X */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">X (Easting / Est)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        lambertResult!.x.toFixed(precision),
                        'x'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                    title="Copier X"
                  >
                    {copiedKey === 'x' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'x' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {formatNumber(lambertResult.x, precision)}{' '}
                  <span className="text-sm font-normal text-slate-400">m</span>
                </div>
              </div>

              {/* Coordonnée Y */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-400">Y (Northing / Nord)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        lambertResult!.y.toFixed(precision),
                        'y'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                    title="Copier Y"
                  >
                    {copiedKey === 'y' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'y' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {formatNumber(lambertResult.y, precision)}{' '}
                  <span className="text-sm font-normal text-slate-400">m</span>
                </div>
              </div>
            </div>

            {/* Bouton de copie complet X + Y */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                onClick={() =>
                  handleCopy(
                    `X = ${lambertResult!.x.toFixed(precision)} m, Y = ${lambertResult!.y.toFixed(
                      precision
                    )} m`,
                    'both'
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                {copiedKey === 'both' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-300" />
                    <span>Copier X et Y complet</span>
                  </>
                )}
              </button>

              {/* État de conformité géographique */}
              {isFrance ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300">
                  <Check className="h-3 w-3" />
                  <span>Conforme territoire France métropolitaine</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 text-[11px] text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Point hors du domaine officiel Lambert 93</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Raccourcis de lieux célèbres en France pour test instantané */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Lieux de référence en France
          </span>
          <span className="text-[11px] text-slate-400">Cliquez pour tester</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_LOCATIONS.map((loc: PresetLocation) => (
            <button
              key={loc.id}
              onClick={() => onChangePoint({ lat: loc.lat, lon: loc.lon })}
              title={`${loc.description} (${loc.lat}, ${loc.lon})`}
              className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500/60 hover:bg-slate-800 hover:text-white transition flex items-center gap-1"
            >
              <span>{loc.name}</span>
              <span className="text-[10px] text-slate-400">({loc.department})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
