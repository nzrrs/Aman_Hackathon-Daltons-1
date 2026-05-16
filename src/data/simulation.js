import { CITIES, NEIGHBORHOODS } from './seed.js';

const MOROCCO_BOUNDS = {
  minLat: 27.5,
  maxLat: 35.95,
  minLng: -13.5,
  maxLng: -1.0,
};

const REPORTER_NAMES = [
  'Khadija S.',
  'Yassine M.',
  'Imane T.',
  'Rachid E.',
  'Salma A.',
  'Noureddine B.',
  'Meryem L.',
  'Anas F.',
];

const STATUS_POOL = ['active', 'active', 'active', 'partial', 'scheduled'];

const DESCRIPTIONS = {
  active: [
    'Coupure complète depuis tôt ce matin dans le secteur de {neighborhood}.',
    'Aucune pression aux robinets dans {neighborhood}. Les habitants utilisent des réserves.',
    'Interruption totale constatée dans {neighborhood} sur plusieurs rues.',
  ],
  partial: [
    'Débit très faible à {neighborhood}, l’eau revient par intermittence.',
    'Approvisionnement partiel dans {neighborhood}, surtout tôt le matin.',
    'Pression insuffisante dans {neighborhood}, remplissage des réservoirs difficile.',
  ],
  scheduled: [
    'Maintenance réseau annoncée à {neighborhood} avec coupure planifiée.',
    'Travaux techniques prévus dans {neighborhood} avec interruption temporaire.',
    'Intervention programmée dans {neighborhood}, service réduit pendant plusieurs heures.',
  ],
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function clampCoordinates(lat, lng) {
  return {
    lat: Math.min(MOROCCO_BOUNDS.maxLat, Math.max(MOROCCO_BOUNDS.minLat, lat)),
    lng: Math.min(MOROCCO_BOUNDS.maxLng, Math.max(MOROCCO_BOUNDS.minLng, lng)),
  };
}

function estimatedRestoreFor(status) {
  if (status === 'active') return new Date(Date.now() + randomInt(3, 18) * 3600000).toISOString();
  if (status === 'partial') return new Date(Date.now() + randomInt(1, 8) * 3600000).toISOString();
  if (status === 'scheduled') return new Date(Date.now() + randomInt(8, 36) * 3600000).toISOString();
  return null;
}

export function generateSimulatedReport() {
  const city = randomItem(CITIES);
  const neighborhoods = NEIGHBORHOODS[city.name] || ['Centre'];
  const neighborhood = randomItem(neighborhoods);
  const status = randomItem(STATUS_POOL);
  const severityPool = status === 'active' ? ['high', 'high', 'medium'] : ['medium', 'medium', 'low'];
  const jitterLat = city.lat + (Math.random() - 0.5) * 0.07;
  const jitterLng = city.lng + (Math.random() - 0.5) * 0.07;
  const { lat, lng } = clampCoordinates(jitterLat, jitterLng);
  const descriptionTemplate = randomItem(DESCRIPTIONS[status]);

  return {
    city: city.name,
    neighborhood,
    lat,
    lng,
    status,
    description: descriptionTemplate.replace('{neighborhood}', neighborhood),
    reportedBy: randomItem(REPORTER_NAMES),
    estimatedRestore: estimatedRestoreFor(status),
    severity: randomItem(severityPool),
  };
}

export function pickSimulationResolution(reports) {
  const candidates = reports.filter((report) => report.status === 'active' || report.status === 'partial');
  if (candidates.length === 0) return null;

  const weighted = candidates.flatMap((report) => (report.status === 'active' ? [report, report] : [report]));
  const target = randomItem(weighted);
  if (!target) return null;

  if (target.status === 'active' && Math.random() < 0.35) {
    return {
      id: target.id,
      city: target.city,
      neighborhood: target.neighborhood,
      patch: {
        status: 'partial',
        estimatedRestore: new Date(Date.now() + randomInt(1, 6) * 3600000).toISOString(),
      },
    };
  }

  return {
    id: target.id,
    city: target.city,
    neighborhood: target.neighborhood,
    patch: {
      status: 'resolved',
      estimatedRestore: new Date().toISOString(),
    },
  };
}
