/**
 * Outils géodésiques pour la conversion GPS (WGS84) vers Lambert 93 (EPSG:2154)
 * et calculs d'orientation vers Google Maps.
 */
import proj4 from 'proj4';

// Définition officielle IGN de la projection Lambert 93 (EPSG:2154)
// RGF93 / Lambert-93 - France métropolitaine
export const LAMBERT_93_DEF =
  '+proj=lcc +lat_1=44 +lat_2=49 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

export const WGS84_DEF = '+proj=longlat +datum=WGS84 +no_defs';

// Enregistrement des projections auprès de proj4
proj4.defs('EPSG:2154', LAMBERT_93_DEF);
proj4.defs('EPSG:4326', WGS84_DEF);

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface LambertPoint {
  x: number;
  y: number;
}

export interface DmsCoord {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

// Limites approximatives de validité pour la France métropolitaine (y compris Corse) en Lambert 93
export const LAMBERT_93_BOUNDS = {
  minX: 99000,
  maxX: 1243000,
  minY: 6049000,
  maxY: 7111000,
  minLat: 41.3,
  maxLat: 51.1,
  minLon: -5.2,
  maxLon: 9.6,
};

/**
 * Convertit des coordonnées GPS (WGS84: Latitude, Longitude) en Lambert 93 (X, Y en mètres)
 */
export function wgs84ToLambert93(lat: number, lon: number): LambertPoint {
  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Coordonnées GPS invalides');
  }
  // proj4 prend [lon, lat] pour EPSG:4326 et retourne [x, y]
  const [x, y] = proj4('EPSG:4326', 'EPSG:2154', [lon, lat]);
  return { x, y };
}

/**
 * Convertit des coordonnées Lambert 93 (X, Y en mètres) en GPS (WGS84: Latitude, Longitude)
 */
export function lambert93ToWgs84(x: number, y: number): GeoPoint {
  if (isNaN(x) || isNaN(y)) {
    throw new Error('Coordonnées Lambert 93 invalides');
  }
  const [lon, lat] = proj4('EPSG:2154', 'EPSG:4326', [x, y]);
  return { lat, lon };
}

/**
 * Vérifie si les coordonnées sont dans le domaine de validité de la France métropolitaine
 */
export function isWithinFranceBounds(lat: number, lon: number): boolean {
  return (
    lat >= LAMBERT_93_BOUNDS.minLat &&
    lat <= LAMBERT_93_BOUNDS.maxLat &&
    lon >= LAMBERT_93_BOUNDS.minLon &&
    lon <= LAMBERT_93_BOUNDS.maxLon
  );
}

/**
 * Convertit des degrés décimaux en structure Degrés Minutes Secondes (DMS)
 */
export function decimalToDms(dec: number, isLatitude: boolean): DmsCoord {
  const direction = isLatitude ? (dec >= 0 ? 'N' : 'S') : dec >= 0 ? 'E' : 'W';
  const absDec = Math.abs(dec);
  const degrees = Math.floor(absDec);
  const minutesDec = (absDec - degrees) * 60;
  const minutes = Math.floor(minutesDec);
  const seconds = Number(((minutesDec - minutes) * 60).toFixed(2));

  return { degrees, minutes, seconds, direction };
}

/**
 * Formate un angle en texte DMS (ex: 48° 51' 30.13" N)
 */
export function formatDms(dec: number, isLatitude: boolean): string {
  const dms = decimalToDms(dec, isLatitude);
  return `${dms.degrees}° ${dms.minutes}' ${dms.seconds.toFixed(2)}" ${dms.direction}`;
}

/**
 * Convertit un structure DMS en degrés décimaux
 */
export function dmsToDecimal(dms: DmsCoord): number {
  let dec = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
  if (dms.direction === 'S' || dms.direction === 'W') {
    dec = -dec;
  }
  return dec;
}

/**
 * Analyse une chaîne de caractères pour extraire des coordonnées GPS
 * Supporte : "48.8584, 2.2945", "48°51'30\"N 2°17'40\"E", "N 48 51.5, E 2 17.6", etc.
 */
export function parseCoordinatesInput(input: string): GeoPoint | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim();

  // 1. Essai décimal standard: "48.8584, 2.2945" ou "48.8584 2.2945" ou "48,8584; 2,2945"
  const commaDecimalRegex = /^([+-]?\d+(?:[.,]\d+)?)\s*[,;\t|\s]\s*([+-]?\d+(?:[.,]\d+)?)$/;
  const commaMatch = cleaned.match(commaDecimalRegex);
  if (commaMatch) {
    const lat = parseFloat(commaMatch[1].replace(',', '.'));
    const lon = parseFloat(commaMatch[2].replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  // 2. Format DMS avec lettres N/S/E/W : ex 48°51'30.2"N 2°17'39.8"E
  const dmsRegex =
    /([+-]?\d+(?:\.\d+)?)[°\s]+(\d+(?:\.\d+)?)[′'\s]+(\d+(?:\.\d+)?)?["″]?\s*([NSEWnsew])\s*[,;\s]?\s*([+-]?\d+(?:\.\d+)?)[°\s]+(\d+(?:\.\d+)?)[′'\s]+(\d+(?:\.\d+)?)?["″]?\s*([NSEWnsew])/i;
  const dmsMatch = cleaned.match(dmsRegex);
  if (dmsMatch) {
    const deg1 = parseFloat(dmsMatch[1]);
    const min1 = parseFloat(dmsMatch[2]);
    const sec1 = dmsMatch[3] ? parseFloat(dmsMatch[3]) : 0;
    const dir1 = dmsMatch[4].toUpperCase();

    const deg2 = parseFloat(dmsMatch[5]);
    const min2 = parseFloat(dmsMatch[6]);
    const sec2 = dmsMatch[7] ? parseFloat(dmsMatch[7]) : 0;
    const dir2 = dmsMatch[8].toUpperCase();

    let lat = 0;
    let lon = 0;

    if (dir1 === 'N' || dir1 === 'S') {
      lat = deg1 + min1 / 60 + sec1 / 3600;
      if (dir1 === 'S') lat = -lat;
      lon = deg2 + min2 / 60 + sec2 / 3600;
      if (dir2 === 'W') lon = -lon;
    } else {
      lon = deg1 + min1 / 60 + sec1 / 3600;
      if (dir1 === 'W') lon = -lon;
      lat = deg2 + min2 / 60 + sec2 / 3600;
      if (dir2 === 'S') lat = -lat;
    }

    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Calcule la distance orthodromique (en mètres) entre deux points WGS84 (Haversine)
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Rayon moyen de la Terre en mètres
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLon = ((point2.lon - point1.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calcule l'azimut (bearing) en degrés [0, 360[ depuis le point d'origine vers le point cible
 */
export function calculateBearing(origin: GeoPoint, target: GeoPoint): number {
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (target.lat * Math.PI) / 180;
  const dLon = ((target.lon - origin.lon) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;

  return (brng + 360) % 360;
}

/**
 * Retourne la direction cardinale textuelle (ex: "Nord-Est") à partir d'un azimut
 */
export function getCompassDirection(bearingDeg: number): {
  code: string;
  label: string;
  arrow: string;
} {
  const normalized = (bearingDeg % 360 + 360) % 360;
  const directions = [
    { code: 'N', label: 'Nord', arrow: '↑' },
    { code: 'NNE', label: 'Nord-Nord-Est', arrow: '↗' },
    { code: 'NE', label: 'Nord-Est', arrow: '↗' },
    { code: 'ENE', label: 'Est-Nord-Est', arrow: '↗' },
    { code: 'E', label: 'Est', arrow: '→' },
    { code: 'ESE', label: 'Est-Sud-Est', arrow: '↘' },
    { code: 'SE', label: 'Sud-Est', arrow: '↘' },
    { code: 'SSE', label: 'Sud-Sud-Est', arrow: '↘' },
    { code: 'S', label: 'Sud', arrow: '↓' },
    { code: 'SSW', label: 'Sud-Sud-Ouest', arrow: '↙' },
    { code: 'SW', label: 'Sud-Ouest', arrow: '↙' },
    { code: 'WSW', label: 'Ouest-Sud-Ouest', arrow: '↙' },
    { code: 'W', label: 'Ouest', arrow: '←' },
    { code: 'WNW', label: 'Ouest-Nord-Ouest', arrow: '↖' },
    { code: 'NW', label: 'Nord-Ouest', arrow: '↖' },
    { code: 'NNW', label: 'Nord-Nord-Ouest', arrow: '↖' },
  ];

  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Formate une distance pour un affichage lisible (mètres ou km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  if (meters < 100000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Liens d'orientation et de navigation Google Maps
 */
export function getGoogleMapsUrls(target: GeoPoint, userLocation?: GeoPoint | null) {
  const { lat, lon } = target;
  const targetStr = `${lat.toFixed(6)},${lon.toFixed(6)}`;

  // 1. Recherche & Point de repère standard Google Maps
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${targetStr}`;

  // 2. Itinéraire direct (Navigation)
  const directionsUrl = userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat.toFixed(6)},${userLocation.lon.toFixed(6)}&destination=${targetStr}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${targetStr}`;

  // 3. Street View 360° direct
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${targetStr}`;

  // 4. Google Earth 3D
  const earthUrl = `https://earth.google.com/web/@${targetStr},100a,800d,35y,0h,0t,0r`;

  // 5. URL d'application native mobile (geo: uri)
  const geoUri = `geo:${targetStr}?q=${targetStr}(Point Lambert 93)`;

  // 6. IGN Géoportail France officiel
  const geoportailUrl = `https://www.geoportail.gouv.fr/carte?c=${lon.toFixed(6)},${lat.toFixed(6)}&z=17&l0=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;

  return {
    searchUrl,
    directionsUrl,
    streetViewUrl,
    earthUrl,
    geoUri,
    geoportailUrl,
  };
}

/**
 * Points de repère français prédéfinis pour test immédiat
 */
export interface PresetLocation {
  id: string;
  name: string;
  city: string;
  department: string;
  lat: number;
  lon: number;
  description: string;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'eiffel',
    name: 'Tour Eiffel',
    city: 'Paris',
    department: '75',
    lat: 48.85837,
    lon: 2.294481,
    description: 'Symbole emblématique de Paris et de la France',
  },
  {
    id: 'notredame',
    name: 'Cathédrale Notre-Dame',
    city: 'Paris',
    department: '75',
    lat: 48.852968,
    lon: 2.349902,
    description: 'Point zéro des routes de France',
  },
  {
    id: 'montsaintmichel',
    name: 'Mont-Saint-Michel',
    city: 'Le Mont-Saint-Michel',
    department: '50',
    lat: 48.636063,
    lon: -1.511457,
    description: 'Merveille de Normandie inscrite au patrimoine mondial',
  },
  {
    id: 'montblanc',
    name: 'Sommet du Mont Blanc',
    city: 'Chamonix',
    department: '74',
    lat: 45.832622,
    lon: 6.865175,
    description: 'Plus haut sommet d’Europe occidentale (4 807 m)',
  },
  {
    id: 'marseille',
    name: 'Vieux-Port',
    city: 'Marseille',
    department: '13',
    lat: 43.295147,
    lon: 5.374384,
    description: 'Cœur historique et portuaire de la cité phocéenne',
  },
  {
    id: 'bourges',
    name: 'Centre géodésique Lambert (Bourges)',
    city: 'Bourges',
    department: '18',
    lat: 46.5,
    lon: 3.0,
    description: 'Origine de référence de la projection Lambert 93 (X: 700 000, Y: 6 600 000)',
  },
  {
    id: 'bordeaux',
    name: 'Place de la Bourse',
    city: 'Bordeaux',
    department: '33',
    lat: 44.84157,
    lon: -0.56994,
    description: 'Miroir d’eau et architecture classique du XVIIIe siècle',
  },
  {
    id: 'strasbourg',
    name: 'Cathédrale de Strasbourg',
    city: 'Strasbourg',
    department: '67',
    lat: 48.58182,
    lon: 7.75071,
    description: 'Chef-d’œuvre gothique en grès rose des Vosges',
  },
];
