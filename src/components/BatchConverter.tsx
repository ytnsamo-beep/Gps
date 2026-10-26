import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  AlertCircle,
  Play,
  Trash2,
  MapPin,
} from 'lucide-react';
import {
  GeoPoint,
  LambertPoint,
  wgs84ToLambert93,
  lambert93ToWgs84,
  parseCoordinatesInput,
  isWithinFranceBounds,
} from '../utils/geo';

interface BatchRow {
  id: number;
  input: string;
  lat: number | null;
  lon: number | null;
  x: number | null;
  y: number | null;
  valid: boolean;
  error?: string;
}

interface BatchConverterProps {
  onSelectPoint: (point: GeoPoint) => void;
}

const SAMPLE_BATCH = `# Exemples de coordonnées GPS (une par ligne) :
48.858370, 2.294481
48.852968, 2.349902
48.636063, -1.511457
45.832622, 6.865175
43.295147, 5.374384
46.500000, 3.000000`;

export const BatchConverter: React.FC<BatchConverterProps> = ({ onSelectPoint }) => {
  const [inputText, setInputText] = useState(SAMPLE_BATCH);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [direction, setDirection] = useState<'gpsToLambert' | 'lambertToGps'>('gpsToLambert');

  const processBatch = () => {
    const lines = inputText.split('\n');
    const parsedRows: BatchRow[] = [];
    let idCounter = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      if (direction === 'gpsToLambert') {
        const point = parseCoordinatesInput(line);
        if (point) {
          try {
            const lambert = wgs84ToLambert93(point.lat, point.lon);
            parsedRows.push({
              id: idCounter++,
              input: line,
              lat: point.lat,
              lon: point.lon,
              x: lambert.x,
              y: lambert.y,
              valid: true,
            });
          } catch (err: unknown) {
            parsedRows.push({
              id: idCounter++,
              input: line,
              lat: point.lat,
              lon: point.lon,
              x: null,
              y: null,
              valid: false,
              error: 'Erreur projection',
            });
          }
        } else {
          parsedRows.push({
            id: idCounter++,
            input: line,
            lat: null,
            lon: null,
            x: null,
            y: null,
            valid: false,
            error: 'Format GPS invalide',
          });
        }
      } else {
        // Mode Lambert 93 vers GPS
        const parts = line.split(/[,;\t|\s]+/).filter(Boolean);
        if (parts.length >= 2) {
          const x = parseFloat(parts[0].replace(',', '.'));
          const y = parseFloat(parts[1].replace(',', '.'));
          if (!isNaN(x) && !isNaN(y)) {
            try {
              const gps = lambert93ToWgs84(x, y);
              parsedRows.push({
                id: idCounter++,
                input: line,
                lat: gps.lat,
                lon: gps.lon,
                x,
                y,
                valid: true,
              });
            } catch {
              parsedRows.push({
                id: idCounter++,
                input: line,
                lat: null,
                lon: null,
                x,
                y,
                valid: false,
                error: 'Erreur projection inverse',
              });
            }
          } else {
            parsedRows.push({
              id: idCounter++,
              input: line,
              lat: null,
              lon: null,
              x: null,
              y: null,
              valid: false,
              error: 'Nombres X / Y non valides',
            });
          }
        }
      }
    }

    setRows(parsedRows);
  };

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = 'ID,Latitude,Longitude,Lambert93_X,Lambert93_Y,Validite\n';
    const content = rows
      .map(
        (r) =>
          `${r.id},${r.lat !== null ? r.lat.toFixed(6) : ''},${
            r.lon !== null ? r.lon.toFixed(6) : ''
          },${r.x !== null ? r.x.toFixed(2) : ''},${r.y !== null ? r.y.toFixed(2) : ''},${
            r.valid ? 'OK' : r.error
          }`
      )
      .join('\n');

    const blob = new Blob([header + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `conversion_lambert93_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyResults = () => {
    if (rows.length === 0) return;
    const text = rows
      .filter((r) => r.valid)
      .map((r) => `X: ${r.x?.toFixed(2)} m\tY: ${r.y?.toFixed(2)} m\t(GPS: ${r.lat?.toFixed(6)}, ${r.lon?.toFixed(6)})`)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setDirection('gpsToLambert')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              direction === 'gpsToLambert'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GPS ➔ Lambert 93
          </button>
          <button
            onClick={() => setDirection('lambertToGps')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              direction === 'lambertToGps'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lambert 93 ➔ GPS
          </button>
        </div>

        <button
          onClick={() => setInputText('')}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Effacer texte</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          {direction === 'gpsToLambert'
            ? 'Collez vos coordonnées GPS (ex: "48.858370, 2.294481" par ligne) :'
            : 'Collez vos coordonnées Lambert 93 (ex: "652458.12 6862314.45" par ligne) :'}
        </label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Une ligne par point à convertir..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={processBatch}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Exécuter la conversion par lot</span>
        </button>

        {rows.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyResults}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? 'Copié !' : 'Copier les résultats'}</span>
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/50 bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Tableau des résultats */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Entrée</th>
                <th className="py-2.5 px-3">Latitude</th>
                <th className="py-2.5 px-3">Longitude</th>
                <th className="py-2.5 px-3 text-blue-300">Lambert 93 X (m)</th>
                <th className="py-2.5 px-3 text-blue-300">Lambert 93 Y (m)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50 transition">
                  <td className="py-2 px-3 text-slate-400">{row.id}</td>
                  <td className="py-2 px-3 text-slate-300 truncate max-w-[140px]">{row.input}</td>
                  <td className="py-2 px-3 text-slate-300">
                    {row.lat !== null ? row.lat.toFixed(6) : '--'}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {row.lon !== null ? row.lon.toFixed(6) : '--'}
                  </td>
                  <td className="py-2 px-3 font-semibold text-blue-400">
                    {row.x !== null ? row.x.toFixed(2) : '--'}
                  </td>
                  <td className="py-2 px-3 font-semibold text-blue-400">
                    {row.y !== null ? row.y.toFixed(2) : '--'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {row.valid && row.lat !== null && row.lon !== null ? (
                      <button
                        onClick={() => onSelectPoint({ lat: row.lat!, lon: row.lon! })}
                        title="Voir ce point sur la carte et s'orienter"
                        className="inline-flex items-center gap-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white px-2 py-0.5 text-[10px] font-sans transition"
                      >
                        <MapPin className="h-3 w-3" />
                        <span>Carte</span>
                      </button>
                    ) : (
                      <span className="text-rose-400 text-[10px]">{row.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
