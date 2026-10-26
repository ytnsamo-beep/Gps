import React from 'react';
import { X, BookOpen, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';

interface GeodeticInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeodeticInfoModal: React.FC<GeodeticInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Guide géodésique : Lambert 93 & GPS
            </h3>
            <p className="text-xs text-slate-400">
              Norme officielle française IGN (EPSG:2154)
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="font-semibold text-white text-sm mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Qu’est-ce que le système Lambert 93 ?
            </h4>
            <p>
              Le <strong>Lambert 93 (EPSG:2154)</strong> est la projection cartographique conique conforme
              officielle de la France métropolitaine, définie par le <em>décret n°2000-1276 du 26 décembre 2000</em>.
              Il est basé sur le système géodésique de référence <strong>RGF93</strong> (Réseau Géodésique Français 1993),
              qui est quasi identique au système mondial <strong>WGS84</strong> utilisé par les puces GPS.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Paramètres géométriques IGN :</h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Ellipsoïde de référence :</span>
                <strong>GRS 1980 / WGS 84</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Méridien central :</span>
                <strong>3° Est de Greenwich</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Parallèles sécants :</span>
                <strong>44° N et 49° N</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Origine X0 / Y0 :</span>
                <strong>X=700 000 m, Y=6 600 000 m</strong>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
            <h4 className="font-semibold text-blue-200 text-sm mb-1.5 flex items-center gap-1.5">
              🧭 Comment fonctionne l’orientation sur Google Maps ?
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                <strong>Conversion géodésique stricte :</strong> les coordonnées Lambert 93 sont instantanément projetées en coordonnées angulaires WGS84 reconnues mondialement par Google Maps.
              </li>
              <li>
                <strong>Calcul d’azimut (cap) :</strong> calcul de l’angle orthodromique entre votre position actuelle et le repère cadastral ou topographique.
              </li>
              <li>
                <strong>Navigation en 1 clic :</strong> lance directement l’application Google Maps en mode itinéraire (voiture, marche ou vélo) pour vous guider sur le terrain.
              </li>
              <li>
                <strong>Street View 360° :</strong> prévisualisez l'environnement réel du point avant même de vous déplacer.
              </li>
            </ul>
          </section>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              Compris, fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
