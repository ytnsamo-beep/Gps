import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Crosshair, MapPin, Navigation, Eye, Maximize2 } from 'lucide-react';
import { GeoPoint, isWithinFranceBounds, calculateDistance } from '../utils/geo';

interface InteractiveMapProps {
  targetLocation: GeoPoint;
  userLocation: GeoPoint | null;
  onSelectLocation: (point: GeoPoint) => void;
  className?: string;
}

type TileLayerKey = 'dark' | 'osm' | 'topo' | 'satellite';

const TILE_LAYERS: Record<
  TileLayerKey,
  { name: string; url: string; attribution: string; maxZoom: number }
> = {
  dark: {
    name: 'Sombre (Carto)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Earthstar Geographics',
    maxZoom: 18,
  },
  topo: {
    name: 'Topographique',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
    maxZoom: 17,
  },
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  targetLocation,
  userLocation,
  onSelectLocation,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const targetMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('dark');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Définition de la carte
    const map = L.map(mapContainerRef.current, {
      center: [targetLocation.lat, targetLocation.lon],
      zoom: 14,
      zoomControl: false,
    });

    // Contrôle de zoom positionné en haut à droite
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Ajout de la couche de tuiles initiale
    const layerConf = TILE_LAYERS[activeLayer];
    const initialLayer = L.tileLayer(layerConf.url, {
      attribution: layerConf.attribution,
      maxZoom: layerConf.maxZoom,
    }).addTo(map);
    tileLayerRef.current = initialLayer;

    // Création d'icônes personnalisées HTML SVG sans assets PNG manquants
    const targetIcon = L.divIcon({
      className: 'custom-target-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(59, 130, 246, 0.25); border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; background: #2563eb; border: 2.5px solid #ffffff; border-radius: 9999px; box-shadow: 0 4px 12px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    // Marqueur cible (déplaçable)
    const marker = L.marker([targetLocation.lat, targetLocation.lon], {
      icon: targetIcon,
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px;">
        <strong style="color: #60a5fa; display: block; margin-bottom: 4px;">📍 Point cible sélectionné</strong>
        <span style="color: #94a3b8; font-size: 11px;">Glissez le marqueur pour ajuster</span>
      </div>
    `);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onSelectLocation({ lat: pos.lat, lon: pos.lng });
    });

    targetMarkerRef.current = marker;

    // Clic sur la carte pour repositionner le point
    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Changement de fond de carte
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);

    const layerConf = TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(layerConf.url, {
      attribution: layerConf.attribution,
      maxZoom: layerConf.maxZoom,
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Mise à jour de la position du marqueur cible
  useEffect(() => {
    if (!mapInstanceRef.current || !targetMarkerRef.current) return;
    const currentLatLng = targetMarkerRef.current.getLatLng();
    if (
      Math.abs(currentLatLng.lat - targetLocation.lat) > 0.000001 ||
      Math.abs(currentLatLng.lng - targetLocation.lon) > 0.000001
    ) {
      targetMarkerRef.current.setLatLng([targetLocation.lat, targetLocation.lon]);
      mapInstanceRef.current.panTo([targetLocation.lat, targetLocation.lon], { animate: true });
    }
  }, [targetLocation]);

  // Gestion du marqueur de position utilisateur & ligne de direction
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; background: rgba(16, 185, 129, 0.3); border-radius: 9999px;"></div>
            <div style="width: 20px; height: 20px; background: #10b981; border: 2.5px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], {
          icon: userIcon,
        })
          .addTo(map)
          .bindPopup('<strong style="color: #34d399;">Votre position GPS actuelle</strong>');
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lon]);
      }

      // Tracer une ligne en tirets entre l'utilisateur et le point cible
      const latlngs: L.LatLngExpression[] = [
        [userLocation.lat, userLocation.lon],
        [targetLocation.lat, targetLocation.lon],
      ];

      if (!lineRef.current) {
        lineRef.current = L.polyline(latlngs, {
          color: '#38bdf8',
          weight: 3,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(map);
      } else {
        lineRef.current.setLatLngs(latlngs);
      }
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (lineRef.current) {
        map.removeLayer(lineRef.current);
        lineRef.current = null;
      }
    }
  }, [userLocation, targetLocation]);

  const handleCenterTarget = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([targetLocation.lat, targetLocation.lon], 15, { animate: true });
  };

  const handleCenterFrance = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([46.6, 2.4], 6, { animate: true });
  };

  const handleCenterUser = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lon], 15, { animate: true });
  };

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    const bounds = L.latLngBounds([
      [targetLocation.lat, targetLocation.lon],
      [userLocation.lat, userLocation.lon],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  const isFrance = isWithinFranceBounds(targetLocation.lat, targetLocation.lon);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl ${className}`}>
      {/* Conteneur de la carte Leaflet */}
      <div ref={mapContainerRef} className="h-full w-full min-h-[380px] lg:min-h-[480px] z-0" />

      {/* Barre d'information flottante en haut de la carte */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-80px)] pointer-events-auto">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg text-xs text-slate-200">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-mono font-medium text-slate-100">
            {targetLocation.lat.toFixed(5)}°, {targetLocation.lon.toFixed(5)}°
          </span>
          {!isFrance && (
            <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold border border-amber-500/30">
              Hors métropole
            </span>
          )}
        </div>

        {userLocation && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-1.5 backdrop-blur-md text-xs text-emerald-300 font-medium">
            <Navigation className="h-3.5 w-3.5" />
            <span>À {Math.round(calculateDistance(userLocation, targetLocation) / 1000)} km de vous</span>
          </div>
        )}
      </div>

      {/* Boutons de contrôle rapides en bas à gauche */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleCenterTarget}
          title="Centrer sur le point sélectionné"
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white backdrop-blur shadow-md transition"
        >
          <Crosshair className="h-3.5 w-3.5 text-blue-400" />
          <span>Centrer cible</span>
        </button>

        {userLocation && (
          <>
            <button
              onClick={handleCenterUser}
              title="Centrer sur ma position GPS"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-700/60 bg-emerald-950/90 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/80 backdrop-blur shadow-md transition"
            >
              <Navigation className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ma position</span>
            </button>
            <button
              onClick={handleFitBounds}
              title="Afficher les 2 points"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 backdrop-blur shadow-md transition"
            >
              <Maximize2 className="h-3.5 w-3.5 text-sky-400" />
            </button>
          </>
        )}

        <button
          onClick={handleCenterFrance}
          title="Vue générale France"
          className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 backdrop-blur shadow-md transition"
        >
          Vue France
        </button>
      </div>

      {/* Sélecteur de couches de carte en bas à droite */}
      <div className="absolute bottom-3 right-3 z-20 pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 backdrop-blur shadow-md transition"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Fond de carte</span>
          </button>

          {showLayerMenu && (
            <div className="absolute bottom-10 right-0 w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-lg">
              <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                Choix du fond
              </div>
              {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveLayer(key);
                    setShowLayerMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                    activeLayer === key
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{TILE_LAYERS[key].name}</span>
                  {activeLayer === key && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guide d'interaction subtil */}
      <div className="absolute top-3 right-14 z-10 hidden sm:block pointer-events-none">
        <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 px-2 py-1 text-[11px] text-slate-400 backdrop-blur-sm">
          Cliquez ou glissez le repère
        </div>
      </div>
    </div>
  );
};
