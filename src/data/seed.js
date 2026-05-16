export const CITIES = [
  { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { name: "Rabat", lat: 34.0209, lng: -6.8416 },
  { name: "Marrakech", lat: 31.6295, lng: -7.9811 },
  { name: "Fès", lat: 34.0181, lng: -5.0078 },
  { name: "Tanger", lat: 35.7595, lng: -5.8340 },
  { name: "Agadir", lat: 30.4278, lng: -9.5981 },
  { name: "Meknès", lat: 33.8935, lng: -5.5473 },
  { name: "Oujda", lat: 34.6867, lng: -1.9114 },
  { name: "El Jadida", lat: 33.2316, lng: -8.5007 },
  { name: "Béni Mellal", lat: 32.3373, lng: -6.3498 },
];

export const NEIGHBORHOODS = {
  "Casablanca": ["Hay Mohammadi", "Sidi Moumen", "Ain Chock", "Maarif", "Anfa", "Hay Hassani"],
  "Rabat": ["Yacoub El Mansour", "Hay Riad", "Agdal", "Hassan", "Souissi"],
  "Marrakech": ["Gueliz", "Médina", "Hivernage", "Daoudiate", "M'hamid"],
  "Fès": ["Médina", "Narjiss", "Saiss", "Les Orangers", "Ville Nouvelle"],
  "Tanger": ["Malabata", "Charf", "Médina", "Mesnana", "Gzenaya"],
  "Agadir": ["Talborjt", "Hay Mohammadi", "Bensergao", "Anza"],
  "Meknès": ["Médina", "Hamria", "Ain Karma", "Hay Salam"],
  "Oujda": ["Médina", "Sidi Yahia", "Lazaret", "Hay Al Qods"],
  "El Jadida": ["Médina", "Hay Al Mohammadi", "Haouzia", "Centre Ville"],
  "Béni Mellal": ["Hay Al Massira", "Centre", "Oulad Yaich"],
};

export const STATUS_CONFIG = {
  active: { label: "Panne active", color: "#ef4444", bg: "rgba(239,68,68,0.12)", dot: "#ef4444" },
  partial: { label: "Approvisionnement partiel", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  resolved: { label: "Rétabli", color: "#10b981", bg: "rgba(16,185,129,0.12)", dot: "#10b981" },
  scheduled: { label: "Coupure planifiée", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", dot: "#8b5cf6" },
  false: { label: "Faux signalement", color: "#f97316", bg: "rgba(249,115,22,0.12)", dot: "#f97316" },
  duplicate: { label: "Doublon", color: "#14b8a6", bg: "rgba(20,184,166,0.12)", dot: "#14b8a6" },
};

export const CITY_RISK_FACTORS = {
  Casablanca: { populationDensity: 88, infrastructureAge: 72, weatherStress: 63, maintenanceActivity: 55 },
  Rabat: { populationDensity: 74, infrastructureAge: 66, weatherStress: 58, maintenanceActivity: 68 },
  Marrakech: { populationDensity: 70, infrastructureAge: 62, weatherStress: 84, maintenanceActivity: 52 },
  "Fès": { populationDensity: 69, infrastructureAge: 71, weatherStress: 61, maintenanceActivity: 50 },
  Tanger: { populationDensity: 64, infrastructureAge: 58, weatherStress: 52, maintenanceActivity: 64 },
  Agadir: { populationDensity: 60, infrastructureAge: 57, weatherStress: 79, maintenanceActivity: 48 },
  "Meknès": { populationDensity: 58, infrastructureAge: 65, weatherStress: 60, maintenanceActivity: 54 },
  Oujda: { populationDensity: 56, infrastructureAge: 59, weatherStress: 77, maintenanceActivity: 46 },
  "El Jadida": { populationDensity: 55, infrastructureAge: 54, weatherStress: 57, maintenanceActivity: 61 },
  "Béni Mellal": { populationDensity: 52, infrastructureAge: 56, weatherStress: 73, maintenanceActivity: 49 },
};

let _id = 100;
const uid = () => `r${++_id}`;

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const future = (h) => new Date(Date.now() + h * 3600000).toISOString();

export const SEED_REPORTS = [
  {
    id: uid(), city: "Casablanca", neighborhood: "Hay Mohammadi",
    lat: 33.5610, lng: -7.5520, status: "active",
    description: "Aucune eau depuis ce matin. Déjà le 3ème jour cette semaine.",
    reportedBy: "Fatima B.", reportedAt: hoursAgo(3),
    estimatedRestore: future(6), upvotes: 47, comments: 12,
    severity: "high",
  },
  {
    id: uid(), city: "Casablanca", neighborhood: "Sidi Moumen",
    lat: 33.5750, lng: -7.5100, status: "active",
    description: "Pression très faible, eau trouble. Impossible de remplir les réservoirs.",
    reportedBy: "Karim O.", reportedAt: hoursAgo(1.5),
    estimatedRestore: future(10), upvotes: 23, comments: 5,
    severity: "medium",
  },
  {
    id: uid(), city: "Marrakech", neighborhood: "M'hamid",
    lat: 31.5900, lng: -8.0200, status: "active",
    description: "Quartier entier sans eau. Les familles utilisent des bidons.",
    reportedBy: "Hassan A.", reportedAt: hoursAgo(8),
    estimatedRestore: null, upvotes: 89, comments: 34,
    severity: "high",
  },
  {
    id: uid(), city: "Rabat", neighborhood: "Yacoub El Mansour",
    lat: 34.0050, lng: -6.8700, status: "partial",
    description: "Eau disponible le matin seulement, entre 6h et 10h.",
    reportedBy: "Zineb M.", reportedAt: hoursAgo(12),
    estimatedRestore: future(24), upvotes: 31, comments: 8,
    severity: "medium",
  },
  {
    id: uid(), city: "Fès", neighborhood: "Médina",
    lat: 34.0650, lng: -4.9750, status: "scheduled",
    description: "Travaux ONEE prévus. Coupure totale de 08h à 18h demain.",
    reportedBy: "ONEE Fès", reportedAt: hoursAgo(2),
    estimatedRestore: future(20), upvotes: 15, comments: 3,
    severity: "low",
  },
  {
    id: uid(), city: "Tanger", neighborhood: "Mesnana",
    lat: 35.7400, lng: -5.8800, status: "resolved",
    description: "Fuite réparée. Alimentation rétablie.",
    reportedBy: "Amine K.", reportedAt: hoursAgo(24),
    estimatedRestore: hoursAgo(4), upvotes: 19, comments: 7,
    severity: "medium",
  },
  {
    id: uid(), city: "Agadir", neighborhood: "Talborjt",
    lat: 30.4100, lng: -9.5800, status: "active",
    description: "Coupure depuis 48h. Aucune communication de RAMSA.",
    reportedBy: "Nadia R.", reportedAt: hoursAgo(6),
    estimatedRestore: null, upvotes: 62, comments: 18,
    severity: "high",
  },
  {
    id: uid(), city: "El Jadida", neighborhood: "Hay Al Mohammadi",
    lat: 33.2200, lng: -8.4900, status: "partial",
    description: "Eau sale / jaunâtre. On évite de l'utiliser pour boire.",
    reportedBy: "Youssef D.", reportedAt: hoursAgo(5),
    estimatedRestore: future(12), upvotes: 28, comments: 9,
    severity: "medium",
  },
  {
    id: uid(), city: "Meknès", neighborhood: "Hay Salam",
    lat: 33.9100, lng: -5.5100, status: "active",
    description: "Pas d'eau depuis 2 jours. Résidents font la queue à la fontaine publique.",
    reportedBy: "Samira H.", reportedAt: hoursAgo(18),
    estimatedRestore: future(4), upvotes: 41, comments: 14,
    severity: "high",
  },
  {
    id: uid(), city: "Béni Mellal", neighborhood: "Oulad Yaich",
    lat: 32.3100, lng: -6.3800, status: "scheduled",
    description: "Maintenance du réseau principal. Coupure prévue samedi 8h–20h.",
    reportedBy: "RADEEB", reportedAt: hoursAgo(1),
    estimatedRestore: future(36), upvotes: 8, comments: 2,
    severity: "low",
  },
];
