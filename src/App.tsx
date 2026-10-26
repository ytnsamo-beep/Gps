/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Route,
  ArrowRightLeft,
  FileSpreadsheet,
  Save,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { InteractiveMap } from './components/InteractiveMap';
import { CompassHUD } from './components/CompassHUD';
import { GpsToLambertForm } from './components/GpsToLambertForm';
import { LambertToGpsForm } from './components/LambertToGpsForm';
import { BatchConverter } from './components/BatchConverter';
import { GeodeticInfoModal } from './components/GeodeticInfoModal';
import { HistoryModal, HistoryItem } from './components/HistoryModal';
import {
  GeoPoint,
  LambertPoint,
  wgs84ToLambert93,
  isWithinFranceBounds,
  getGoogleMapsUrls,
} from './utils/geo';

type ActiveTab = 'gpsToLambert' | 'lambertToGps' | 'batch';

export default function App() {
  // Point cible actuel (défaut : Tour Eiffel, Paris)
  const [targetLocation, setTargetLocation] = useState<GeoPoint>({
    lat: 48.85837,
    lon: 2.294481,
  });

  // Position GPS de l'utilisateur (si autorisée)
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Onglet actif
  const [activeTab, setActiveTab] = useState<ActiveTab>('gpsToLambert');

  // Modales
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Historique sauvegardé en localStorage
  const [savedItems, setSavedItems] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('lambert93_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Coordonnées Lambert 93 dérivées de la cible
  let targetLambert: LambertPoint;
  try {
    targetLambert = wgs84ToLambert93(targetLocation.lat, targetLocation.lon);
  } catch {
    targetLambert = { x: 648259, y: 6862272 };
  }

  // Demander la position GPS de l'utilisateur
  const handleRequestUserLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n’est pas prise en charge par votre navigateur.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setUserLocation(coords);
        setUserAccuracy(position.coords.accuracy);
        setIsLocating(false);
        showToast(`Position GPS détectée avec précision de ±${Math.round(position.coords.accuracy)}m`);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Veuillez autoriser l’accès à votre position pour activer la boussole.');
        } else if (error.code === error.TIMEOUT) {
          setGeoError('Délai d’attente dépassé pour la capture GPS.');
        } else {
          setGeoError('Impossible d’obtenir votre position GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  // Sauvegarder le point actuel
  const handleSaveCurrentPoint = () => {
    const isFrance = isWithinFranceBounds(targetLocation.lat, targetLocation.lon);
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      name: `Repère ${targetLocation.lat.toFixed(4)}°, ${targetLocation.lon.toFixed(4)}°`,
      timestamp: Date.now(),
      lat: targetLocation.lat,
      lon: targetLocation.lon,
      x: targetLambert.x,
      y: targetLambert.y,
    };

    const updated = [newItem, ...savedItems.slice(0, 29)];
    setSavedItems(updated);
    try {
      localStorage.setItem('lambert93_history', JSON.stringify(updated));
    } catch {}
    showToast('Coordonnées enregistrées dans votre historique !');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = savedItems.filter((i) => i.id !== id);
    setSavedItems(updated);
    try {
      localStorage.setItem('lambert93_history', JSON.stringify(updated));
    } catch {}
  };

  const handleClearAllHistory = () => {
    setSavedItems([]);
    try {
      localStorage.removeItem('lambert93_history');
    } catch {}
  };

  const gmapsUrls = getGoogleMapsUrls(targetLocation, userLocation);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 rounded-xl border border-blue-500/40 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur text-xs font-semibold text-blue-200 flex items-center gap-2 animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barre de navigation */}
      <Navbar
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        savedPointsCount={savedItems.length}
      />

      {/* Bannière principale */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-blue-950/20 via-slate-950 to-slate-950 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Convertisseur GPS en <span className="text-blue-500">Lambert 93</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Convertissez instantanément vos coordonnées géographiques mondiales (WGS84) vers le système
              officiel français (EPSG:2154), repérez-vous sur carte interactive et orientez-vous avec Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveCurrentPoint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition shadow-sm"
              title="Enregistrer ce point en favori"
            >
              <Save className="h-4 w-4 text-blue-400" />
              <span>Enregistrer point</span>
            </button>

            <a
              href={gmapsUrls.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition"
            >
              <Route className="h-4 w-4" />
              <span>S’orienter sur Google Maps</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* Message d'erreur GPS éventuel */}
        {geoError && (
          <div className="max-w-7xl mx-auto mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>{geoError}</span>
            </div>
            <button
              onClick={() => setGeoError(null)}
              className="text-amber-400 hover:text-amber-200 text-[11px] underline ml-2"
            >
              Fermer
            </button>
          </div>
        )}
      </section>

      {/* Contenu principal en grille 2 colonnes */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLONNE GAUCHE (5 colonnes) : Convertisseur & Saisie */}
          <div className="lg:col-span-5 space-y-5">
            {/* Onglets de mode */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-md flex items-center">
              <button
                onClick={() => setActiveTab('gpsToLambert')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'gpsToLambert'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>GPS ➔ Lambert 93</span>
              </button>
              <button
                onClick={() => setActiveTab('lambertToGps')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'lambertToGps'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Lambert 93 ➔ GPS</span>
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'batch'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Par lot (CSV)</span>
              </button>
            </div>

            {/* Carte de saisie dynamique */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
              {activeTab === 'gpsToLambert' && (
                <GpsToLambertForm
                  currentPoint={targetLocation}
                  onChangePoint={setTargetLocation}
                  onRequestUserLocation={handleRequestUserLocation}
                  isLocating={isLocating}
                />
              )}

              {activeTab === 'lambertToGps' && (
                <LambertToGpsForm
                  initialLambert={targetLambert}
                  onApplyGps={(point) => {
                    setTargetLocation(point);
                    setActiveTab('gpsToLambert');
                    showToast('Point appliqué sur la carte et le convertisseur !');
                  }}
                />
              )}

              {activeTab === 'batch' && (
                <BatchConverter
                  onSelectPoint={(point) => {
                    setTargetLocation(point);
                    setActiveTab('gpsToLambert');
                    showToast('Point du lot affiché sur la carte !');
                  }}
                />
              )}
            </div>

            {/* Informations synthétiques & Rappels légaux */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Info className="h-4 w-4 text-blue-400" />
                <span>Standard géodésique officiel</span>
              </div>
              <p className="leading-relaxed">
                Le système <strong>Lambert 93 (RGF93 / EPSG:2154)</strong> est le seul système légal en
                France métropolitaine pour les plans cadastraux, géomètres-experts, travaux publics (BTP) et
                SIG. Le méridien central est à <strong>3° Est</strong> et l'origine est fixée à <strong>Bourges</strong>.
              </p>
            </div>
          </div>

          {/* COLONNE DROITE (7 colonnes) : Carte Interactive & Boussole d'orientation Google Maps */}
          <div className="lg:col-span-7 space-y-5">
            {/* Carte Leaflet interactive */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>Repérage cartographique en direct</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Déplacez le repère pour recalculer instantanément
                </span>
              </div>

              <InteractiveMap
                targetLocation={targetLocation}
                userLocation={userLocation}
                onSelectLocation={(newPoint) => {
                  setTargetLocation(newPoint);
                }}
              />
            </div>

            {/* Hub d'orientation Google Maps & Boussole */}
            <CompassHUD
              targetLocation={targetLocation}
              targetLambert={targetLambert}
              userLocation={userLocation}
              userAccuracy={userAccuracy}
              onRequestUserLocation={handleRequestUserLocation}
              isLocating={isLocating}
            />
          </div>
        </div>

        {/* Section FAQ & Cas d'usages professionnels */}
        <section className="mt-12 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span>Pourquoi convertir ses coordonnées GPS en Lambert 93 ?</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-2">
              <h3 className="font-bold text-white text-sm text-blue-400">1. Cadastre & Urbanisme</h3>
              <p>
                Toutes les parcelles cadastrales françaises, permis de construire et plans de géomètres sont
                exprimés en coordonnées métriques Lambert 93. La conversion permet de localiser une borne ou une
                limite de propriété sur le terrain.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-2">
              <h3 className="font-bold text-white text-sm text-emerald-400">2. Orientation sur Google Maps</h3>
              <p>
                Google Maps et les smartphones fonctionnent exclusivement en coordonnées angulaires WGS84
                (Latitude, Longitude). Cette application effectue la passerelle mathématique exacte pour vous
                guider directement avec le GPS de votre téléphone.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-2">
              <h3 className="font-bold text-white text-sm text-purple-400">3. Précision centimétrique</h3>
              <p>
                Grâce au moteur de projection officiel IGN (librairie Proj4), le calcul garantit une fidélité
                totale des distances et angles, avec affichage au centimètre ou au millimètre près selon vos
                besoins.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Compass className="h-4 w-4 text-blue-500" />
            <span className="font-semibold text-white">Lambert 93 & Google Maps</span>
            <span>&mdash; Conforme IGN France & RGF93</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsInfoOpen(true)}
              className="hover:text-blue-400 transition"
            >
              Documentation IGN
            </button>
            <a
              href="https://geodesie.ign.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition flex items-center gap-1"
            >
              <span>Site officiel géodésie IGN</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modales */}
      <GeodeticInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={savedItems}
        onSelect={(item) => {
          setTargetLocation({ lat: item.lat, lon: item.lon });
          setActiveTab('gpsToLambert');
          showToast(`Point "${item.name}" chargé !`);
        }}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
