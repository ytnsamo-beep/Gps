import React, { useState, useEffect } from 'react';
import {
  Compass,
  Navigation,
  ExternalLink,
  MapPin,
  Eye,
  Globe,
  Smartphone,
  Share2,
  Check,
  LocateFixed,
  Route,
} from 'lucide-react';
import {
  GeoPoint,
  LambertPoint,
  calculateBearing,
  calculateDistance,
  formatDistance,
  getCompassDirection,
  getGoogleMapsUrls,
} from '../utils/geo';

interface CompassHUDProps {
  targetLocation: GeoPoint;
  targetLambert: LambertPoint;
  userLocation: GeoPoint | null;
  userAccuracy?: number | null;
  onRequestUserLocation: () => void;
  isLocating: boolean;
}

export const CompassHUD: React.FC<CompassHUDProps> = ({
  targetLocation,
  targetLambert,
  userLocation,
  userAccuracy,
  onRequestUserLocation,
  isLocating,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [compassSensorActive, setCompassSensorActive] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);

  // URLs d'orientation Google Maps
  const urls = getGoogleMapsUrls(targetLocation, userLocation);

  // Calcul du cap / azimut et de la distance si l'utilisateur est localisé
  const distance = userLocation ? calculateDistance(userLocation, targetLocation) : null;
  const bearing = userLocation ? calculateBearing(userLocation, targetLocation) : 0;
  const compassInfo = getCompassDirection(bearing);

  // Calcul de la rotation de l'aiguille par rapport au smartphone ou au Nord absolu
  // Si le capteur est actif, rotation = bearing - deviceHeading
  const needleRotation = compassSensorActive && deviceHeading !== null
    ? (bearing - deviceHeading + 360) % 360
    : bearing;

  // Activation de la boussole mobile (DeviceOrientation API)
  const toggleDeviceCompass = async () => {
    if (compassSensorActive) {
      setCompassSensorActive(false);
      return;
    }

    setSensorError(null);

    // Support iOS 13+ permission request
    const DevOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DevOrientation?.requestPermission === 'function') {
      try {
        const response = await DevOrientation.requestPermission();
        if (response === 'granted') {
          startOrientationListener();
        } else {
          setSensorError('Autorisation du capteur refusée');
        }
      } catch (err) {
        setSensorError('Erreur capteur d’orientation');
      }
    } else if ('ondeviceorientationabsolute' in window || 'ondeviceorientation' in window) {
      startOrientationListener();
    } else {
      setSensorError('Capteur gyroscope non disponible sur cet appareil');
    }
  };

  const startOrientationListener = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      // iOS fournit webkitCompassHeading directement
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
        heading = webkitHeading;
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        // Sur Android/Chrome alpha donne la rotation par rapport au nord
        heading = 360 - e.alpha;
      }

      if (heading !== null) {
        setDeviceHeading(Math.round(heading));
        setCompassSensorActive(true);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    setCompassSensorActive(true);
  };

  const handleShare = async () => {
    const text = `Coordonnées Lambert 93 : X=${Math.round(targetLambert.x)} m, Y=${Math.round(
      targetLambert.y
    )} m\nGPS : ${targetLocation.lat.toFixed(6)}, ${targetLocation.lon.toFixed(6)}\nLien Google Maps : ${urls.searchUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Point Lambert 93',
          text,
          url: urls.searchUrl,
        });
        return;
      } catch {
        // Annulé ou non supporté
      }
    }

    // Fallback presse-papier
    await navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl">
      {/* En-tête de section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base">
              Orientation & Google Maps
            </h3>
            <p className="text-xs text-slate-400">
              Navigation en direct, cap azimutal et Street View
            </p>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          title="Partager les coordonnées"
        >
          {copiedLink ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copié !</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              <span>Partager</span>
            </>
          )}
        </button>
      </div>

      {/* Cadran d'orientation géodésique & Boussole */}
      <div className="my-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Boussole visuelle interactive */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative h-44 w-44 rounded-full border-2 border-slate-700/80 bg-slate-950 p-2 shadow-inner flex items-center justify-center">
            {/* Graduations de boussole */}
            <div className="absolute inset-1 rounded-full border border-dashed border-slate-800 pointer-events-none" />

            {/* Repères cardinaux */}
            <span className="absolute top-2 text-[11px] font-bold text-red-500">N</span>
            <span className="absolute right-2 text-[11px] font-bold text-slate-400">E</span>
            <span className="absolute bottom-2 text-[11px] font-bold text-slate-400">S</span>
            <span className="absolute left-2 text-[11px] font-bold text-slate-400">O</span>

            {/* Aiguille rotative pointant vers la cible Lambert 93 */}
            <div
              className="relative h-full w-full flex items-center justify-center transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              {/* Flèche Nord / Cible (Rouge et Bleu) */}
              <div className="absolute top-4 w-0 h-0 border-x-8 border-x-transparent border-b-[48px] border-b-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="absolute bottom-4 w-0 h-0 border-x-8 border-x-transparent border-t-[48px] border-t-slate-700" />
              {/* Pivot central */}
              <div className="h-5 w-5 rounded-full bg-slate-200 border-2 border-blue-600 shadow-md z-10 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              </div>
            </div>

            {/* Pastille centrale d'azimut */}
            <div className="absolute bottom-1 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded-md text-[10px] font-mono text-blue-300">
              {userLocation ? `${Math.round(bearing)}°` : '0°'}
            </div>
          </div>

          {/* Bouton gyroscope mobile si disponible */}
          <button
            onClick={toggleDeviceCompass}
            className={`mt-3 flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition ${
              compassSensorActive
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-3 w-3" />
            <span>
              {compassSensorActive
                ? `Gyroscope actif (${deviceHeading ?? 0}°)`
                : 'Activer boussole smartphone'}
            </span>
          </button>
          {sensorError && (
            <p className="mt-1 text-[10px] text-amber-400 text-center">{sensorError}</p>
          )}
        </div>

        {/* Détails géodésiques & Distance */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-3">
          {userLocation ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Distance à vol d’oiseau :</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {distance !== null ? formatDistance(distance) : '--'}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/70 pt-2">
                <span className="text-xs text-slate-400">Azimut géographique (Cap) :</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-sky-400">
                    {compassInfo.arrow} {Math.round(bearing)}°
                  </span>
                  <span className="text-xs text-slate-300 font-medium">({compassInfo.label})</span>
                </div>
              </div>

              {userAccuracy && (
                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/70 pt-1.5">
                  <span>Précision GPS estimée :</span>
                  <span className="font-mono text-slate-300">± {Math.round(userAccuracy)} m</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center space-y-2.5">
              <p className="text-xs text-slate-400 leading-relaxed">
                Activez votre position GPS pour calculer la distance exacte et l’orientation vers ce point
                Lambert 93.
              </p>
              <button
                onClick={onRequestUserLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition disabled:opacity-50"
              >
                <LocateFixed className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Géolocalisation...' : 'Détecter ma position GPS'}</span>
              </button>
            </div>
          )}

          {/* Résumé textuel d'orientation */}
          <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 px-3 py-2 text-xs text-slate-300 flex items-start gap-2">
            <span className="text-blue-400 text-base leading-none">🧭</span>
            <span>
              {userLocation
                ? `Pour vous rendre sur ce repère Lambert 93, dirigez-vous à ${
                    distance !== null ? formatDistance(distance) : ''
                  } vers le ${compassInfo.label} (${Math.round(bearing)}°).`
                : 'Sélectionnez ou convertissez des coordonnées pour obtenir le cap direct.'}
            </span>
          </div>
        </div>
      </div>

      {/* BOUTONS D'ORIENTATION GOOGLE MAPS */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
          Actions Google Maps & Navigation
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Action principale : Navigation / Itinéraire direct */}
          <a
            href={urls.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition"
          >
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-white" />
              <span>Itinéraire Google Maps</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition" />
          </a>

          {/* Voir le point exact sur Google Maps */}
          <a
            href={urls.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-400" />
              <span>Repère Google Maps</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition" />
          </a>

          {/* Vue panoramique Street View 360° */}
          <a
            href={urls.streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400" />
              <span>Street View 360°</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition" />
          </a>

          {/* Google Earth 3D */}
          <a
            href={urls.earthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <span>Google Earth 3D</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-white transition" />
          </a>

          {/* Application mobile native (geo: URI) */}
          <a
            href={urls.geoUri}
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ouvrir dans l’app GPS mobile</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-white transition" />
          </a>

          {/* Géoportail officiel IGN France */}
          <a
            href={urls.geoportailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400 text-[10px] bg-slate-800 px-1 rounded">IGN</span>
              <span>Cadastre / Géoportail</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-white transition" />
          </a>
        </div>
      </div>
    </div>
  );
};
