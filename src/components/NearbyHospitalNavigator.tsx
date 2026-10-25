"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Baby, Bone, Building2, Car, CheckCircle2, Crosshair, Ear, ExternalLink, HeartPulse, Hospital,
  Layers3, LoaderCircle, LocateFixed, MapPin, MapPinned, Navigation2, RefreshCw, Route,
  Satellite, Search, ShieldCheck, Signal, Siren, Stethoscope, TriangleAlert
} from "lucide-react";

type UserLocation = { latitude: number; longitude: number; accuracy: number; timestamp: number; demoMode?: boolean };
type CareNeed = "nearest" | "emergency" | "ent" | "surgery" | "cardiac" | "pediatrics" | "maternity" | "orthopedics" | "trauma";
const BENGALURU_DEMO_LOCATION = { latitude: 12.9716, longitude: 77.5946, accuracy: 1500, timestamp: 0 } satisfies UserLocation;
type HospitalResult = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  address: string;
  operator?: string;
  emergency?: string;
  phone?: string;
  website?: string;
  osmUrl: string;
  googleMapsUri?: string;
  googlePlaceId?: string;
  dataProvider: "google" | "osm";
  specialties: string[];
  matchScore: number;
  matchStatus: "verified" | "mapped" | "unknown";
  matchEvidence: string[];
  capabilitySource?: string;
  capabilitySourceLabel?: string;
};
type RoadRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  steps: { instruction: string; distanceMeters: number; durationSeconds: number }[];
  provider: string;
};
type IndoorFeature = {
  id: string;
  kind: "room" | "corridor" | "lift" | "stairs" | "facility" | "building" | "indoor" | "hydrant" | "fire_hose" | "extinguisher" | "fire_alarm" | "aed" | "first_aid" | "emergency_exit" | "assembly" | "pharmacy";
  level: string;
  name: string;
  geometry: { lat: number; lon: number }[];
};
type IndoorData = {
  features: IndoorFeature[];
  levels: string[];
  hasIndoorPlan: boolean;
  hasBuildingFootprint: boolean;
  source: string;
  note: string;
  safetyCount?: number;
};

type LeafletMap = {
  setView: (coords: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: unknown, options?: object) => void;
  remove: () => void;
};
type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};
type LeafletLayer = {
  remove?: () => void;
  addTo: (target: LeafletMap | LeafletLayerGroup) => LeafletLayer;
  bindTooltip?: (text: string, options?: object) => LeafletLayer;
};
type LeafletGlobal = {
  map: (element: HTMLElement, options?: object) => LeafletMap;
  tileLayer: (url: string, options?: object) => LeafletLayer;
  layerGroup: () => LeafletLayerGroup;
  marker: (coords: [number, number], options?: object) => LeafletLayer;
  circle: (coords: [number, number], options?: object) => LeafletLayer;
  polyline: (coords: [number, number][], options?: object) => LeafletLayer;
  divIcon: (options: object) => object;
  latLngBounds: (coords: [number, number][]) => unknown;
};

declare global {
  interface Window { L?: LeafletGlobal; }
}


type VerifiedMapProfile = {
  id: string;
  hospital: string;
  aliases: string[];
  mapKind: "building-layout" | "campus-map" | "master-plan" | "floor-directory";
  sourceLabel: string;
  sourceUrl: string;
  mapEmbedUrl: string;
  mapPageLabel: string;
  note?: string;
  buildings: string[];
  directory: { label: string; location: string }[];
};

function mapKindBadge(profile: VerifiedMapProfile) {
  switch (profile.mapKind) {
    case "building-layout":
      return { label: "BUILDING LAYOUT", className: "bg-blue-50 text-blue-700 border border-blue-100" };
    case "campus-map":
      return { label: "CAMPUS MAP", className: "bg-emerald-50 text-emerald-700 border border-emerald-100" };
    case "master-plan":
      return { label: "MASTER PLAN", className: "bg-violet-50 text-violet-700 border border-violet-100" };
    case "floor-directory":
      return { label: "FLOOR DIRECTORY", className: "bg-amber-50 text-amber-700 border border-amber-100" };
  }
}

const VERIFIED_MAPS: VerifiedMapProfile[] = [
  {
    id: "tata-memorial-mumbai",
    hospital: "Tata Memorial Hospital, Mumbai",
    aliases: ["tata memorial hospital", "tata memorial centre parel", "tmh mumbai"],
    mapKind: "building-layout",
    sourceLabel: "Tata Memorial Hospital — Patient Information Booklet",
    sourceUrl: "https://tmc.gov.in/event/upload/12112025_5/TMH_Brochure_%20patient%20booklet.pdf",
    mapEmbedUrl: "https://tmc.gov.in/event/upload/12112025_5/TMH_Brochure_%20patient%20booklet.pdf#page=11&zoom=page-width",
    mapPageLabel: "Official building layout",
    buildings: ["Main Building (MB)", "Golden Jubilee Building (GJB)", "Annexe Building (AB)", "Homi Bhabha Building (HBB)", "Service Building (SB)"],
    directory: [
      { label: "Emergency / Casualty", location: "Main Building · Ground Floor" },
      { label: "General registration", location: "Golden Jubilee Building · Ground Floor" },
      { label: "Private registration", location: "Homi Bhabha Building · 1st Floor" },
      { label: "CT Scan", location: "Main Building Basement / GJB Basement" },
      { label: "MRI Scan", location: "GJB Basement / Main Building Basement" },
      { label: "ICU", location: "Main Building" },
      { label: "Main Operation Theatre", location: "Main Building / Homi Bhabha Building" },
    ],
  },
  {
    id: "jipmer-puducherry",
    hospital: "JIPMER, Puducherry",
    aliases: ["jipmer", "jawaharlal institute of postgraduate medical education", "jipmer hospital"],
    mapKind: "campus-map",
    sourceLabel: "JIPMER — official JIPMER Map",
    sourceUrl: "https://jipmer.edu.in/about-us/location/jipmer-map",
    mapEmbedUrl: "https://jipmer.edu.in/about-us/location/jipmer-map",
    mapPageLabel: "Official campus map",
    note: "The official map identifies the hospital, OPD block, casualty block, pharmacy/CSSD, super-speciality block, oncology centre, women & children hospital and other campus facilities.",
    buildings: ["Hospital", "O.P.D Block", "Casualty Block", "Pharmacy / C.S.S.D Block", "Super Speciality Block", "Oncology Centre", "Women / Children Hospitals", "New S.S Block", "Screening OPD"],
    directory: [],
  },
  {
    id: "kgmu-lucknow",
    hospital: "King George's Medical University, Lucknow",
    aliases: ["king george's medical university", "king georges medical university", "kgmu", "kgmu hospital"],
    mapKind: "campus-map",
    sourceLabel: "KGMU — official Campus Map",
    sourceUrl: "https://www.kgmu.org/campus_map.php",
    mapEmbedUrl: "https://www.kgmu.org/campus_map.php",
    mapPageLabel: "Official campus map with numbered buildings",
    buildings: ["Emergency and Trauma Center", "Shatabdi Hospital Phase-I", "Shatabdi Hospital Phase-II", "Main Hospital Building", "New OPD", "Queen Mary Hospital", "Cardiology Wing", "Ophthalmic Wings"],
    directory: [
      { label: "Emergency / Trauma", location: "Map No. 1" },
      { label: "Shatabdi Hospital Phase-II", location: "Map No. 2" },
      { label: "Main Hospital Building", location: "Map No. 65" },
      { label: "Old OPD", location: "Map No. 67" },
      { label: "New OPD", location: "Map No. 68" },
      { label: "Queen Mary Hospital", location: "Map No. 78" },
    ],
  },
  {
    id: "pgimer-chandigarh",
    hospital: "PGIMER, Chandigarh",
    aliases: ["pgimer", "postgraduate institute of medical education and research", "pgi chandigarh", "nehru hospital pgimer"],
    mapKind: "campus-map",
    sourceLabel: "PGIMER Chandigarh — official PGI Map",
    sourceUrl: "https://pgimer.edu.in/PGIMER_PORTAL/PGIMERPORTAL/GlobalPages/JSP/Page_Data.jsp?dep_id=7",
    mapEmbedUrl: "https://pgimer.edu.in/PGIMER_PORTAL/PGIMERPORTAL/GlobalPages/JSP/Page_Data.jsp?dep_id=7",
    mapPageLabel: "Official PGI campus map",
    buildings: ["Nehru Hospital", "Advanced Pediatric Centre", "New OPD Block", "Advanced Eye Centre", "Advanced Trauma Centre", "Advanced Cardiac Centre", "PET Centre", "Research Blocks"],
    directory: [
      { label: "Emergency Reception", location: "Emergency · 24 hours" },
      { label: "Nehru Hospital Reception", location: "Nehru Hospital" },
      { label: "Advanced Trauma Centre", location: "Trauma Centre" },
      { label: "Advanced Cardiac Centre", location: "Cardiac Centre" },
      { label: "Advanced Paediatric Centre", location: "Paediatric Centre" },
      { label: "New OPD Reception", location: "New OPD" },
    ],
  },
  {
    id: "aiims-new-delhi",
    hospital: "AIIMS New Delhi",
    aliases: ["aiims new delhi", "all india institute of medical sciences new delhi", "aiims delhi"],
    mapKind: "master-plan",
    sourceLabel: "AIIMS New Delhi — official campus/master-plan material",
    sourceUrl: "https://www.aiims.edu/images/depart/Engineering%20Services/Pics_overview_of_projects.pdf",
    mapEmbedUrl: "https://www.aiims.edu/images/depart/Engineering%20Services/Pics_overview_of_projects.pdf#page=1&zoom=page-width",
    mapPageLabel: "Official campus/master-plan map",
    note: "This is official AIIMS planning/campus material, not a live room-level wayfinding floor plan.",
    buildings: ["Hospital Block", "OPD Block", "Mother and Child Block", "Diagnostic Block", "Surgical Block", "New OPD and Offices", "Private/VVIP Ward Block"],
    directory: [],
  },
  {
    id: "ltmgh-sion-mumbai",
    hospital: "Lokmanya Tilak Municipal General Hospital, Sion Mumbai",
    aliases: ["lokmanya tilak municipal general hospital", "ltmgh", "sion hospital", "lokmanya tilak hospital"],
    mapKind: "campus-map",
    sourceLabel: "LTMGH Sion Mumbai — official Campus Map",
    sourceUrl: "https://ltmgh.com/about-ltmgh/campus-map/",
    mapEmbedUrl: "https://ltmgh.com/wp-content/uploads/2025/09/campmap.jpg",
    mapPageLabel: "Official campus/site plan",
    note: "The hospital's own Campus Map page publishes this site-plan image.",
    buildings: ["Hospital campus", "Medical college campus", "Internal roads", "Landscape / open areas"],
    directory: [],
  },
  {
    id: "ramaiah-medical-college-bengaluru",
    hospital: "Ramaiah Medical College Hospital, Bengaluru",
    aliases: ["ramaiah medical college hospital", "ms ramaiah medical college hospital", "msrmc", "ramaiah teaching hospital"],
    mapKind: "campus-map",
    sourceLabel: "Ramaiah Medical College — official Glimpse handbook",
    sourceUrl: "https://www.msrmc.ac.in/assets/frontend/ramaiah-medical-college/pdf/Glimpse-hand-book-2023.pdf",
    mapEmbedUrl: "https://www.msrmc.ac.in/assets/frontend/ramaiah-medical-college/pdf/Glimpse-hand-book-2023.pdf#page=23&zoom=page-width",
    mapPageLabel: "Official campus map · handbook",
    buildings: ["Ramaiah Medical College Hospital", "Ramaiah Memorial Hospital", "Medical College", "Dental Block", "Pharmacy Block", "Mortuary", "Artificial Limb Centre", "Parking areas"],
    directory: [],
  },
  {
    id: "bangalore-baptist-hospital",
    hospital: "Bangalore Baptist Hospital, Bengaluru",
    aliases: ["bangalore baptist hospital", "baptist hospital hebbal", "bbh bengaluru", "bbh bangalore"],
    mapKind: "floor-directory",
    sourceLabel: "Bangalore Baptist Hospital — official Floor Directory",
    sourceUrl: "https://bbh.org.in/floordirectory/",
    mapEmbedUrl: "https://bbh.org.in/floordirectory/",
    mapPageLabel: "Official floor-by-floor hospital directory",
    note: "BBH publishes a detailed official floor directory for its Main Building and Front View Building. This is a verified directory, not a drawn architectural floor plan.",
    buildings: ["Main Building", "Front View Building", "Baptist Cancer Centre", "External Services"],
    directory: [
      { label: "Emergency & Ambulance", location: "Main Building · Ground Floor" },
      { label: "ENT OPD", location: "Main Building · Ground Floor" },
      { label: "Surgery OPD", location: "Main Building · Ground Floor" },
      { label: "ICU 1", location: "Main Building · Ground Floor" },
      { label: "Operation Theatre", location: "Main Building · First Floor" },
      { label: "Cardiology / Cath Lab / CCU", location: "Main Building · Second Floor" },
      { label: "Pediatrics / NICU / PICU", location: "Front View Building · Second Floor" },
      { label: "Obstetrics & Gynaecology / Labour Room", location: "Front View Building · Third Floor" },
    ],
  },
  {
    id: "kims-bengaluru",
    hospital: "Kempegowda Institute of Medical Sciences Hospital, Bengaluru",
    aliases: ["kempegowda institute of medical sciences", "kims hospital bangalore", "kims bengaluru", "kims bangalore"],
    mapKind: "floor-directory",
    sourceLabel: "KIMS Bengaluru — official Hospital building/floor guide",
    sourceUrl: "https://www.kimsbangalore.edu.in/hospital/",
    mapEmbedUrl: "https://www.kimsbangalore.edu.in/hospital/",
    mapPageLabel: "Official building and floor directory",
    note: "KIMS publishes the department allocation for its Eastern and Western hospital blocks floor by floor. This is a verified directory rather than a graphical floor-plan drawing.",
    buildings: ["Eastern Block", "Western Block", "Hospital Cellar / Parking"],
    directory: [
      { label: "Medicine / Radiodiagnosis", location: "Eastern Block · Ground Floor" },
      { label: "Medicine Wards", location: "Eastern Block · First Floor" },
      { label: "Surgical Wards", location: "Eastern Block · Second Floor" },
      { label: "OBG Wards / OT / Labour Rooms", location: "Eastern Block · Third Floor" },
      { label: "Operation Theatre Complex / CCU", location: "Eastern Block · Fourth Floor" },
      { label: "Pediatrics / NICU / PICU", location: "Eastern Block · Fifth Floor" },
      { label: "Medicine / Orthopedics / OBG OPDs", location: "Western Block · Ground Floor" },
      { label: "Surgery / ENT / Pediatrics OPDs", location: "Western Block · First Floor" },
      { label: "Heart Centre / ICCU / Cath Lab", location: "Western Block · Second Floor" },
    ],
  },
  {
    id: "aster-whitefield-bengaluru",
    hospital: "Aster Whitefield Hospital, Bengaluru",
    aliases: ["aster whitefield", "aster whitefield hospital", "aster hospital whitefield", "aster whitefield bangalore"],
    mapKind: "building-layout",
    sourceLabel: "Aster Hospitals — official environmental-compliance architectural plans",
    sourceUrl: "https://www.asterhospitals.in/sites/default/files/2025-07/Aster%20Hospital%20Whitefield%20Half-Yearly%20EC%20%20Compliance%20Reports..%20Sep-24%20to%20Feb-25.pdf",
    mapEmbedUrl: "https://www.asterhospitals.in/sites/default/files/2025-07/Aster%20Hospital%20Whitefield%20Half-Yearly%20EC%20%20Compliance%20Reports..%20Sep-24%20to%20Feb-25.pdf#zoom=page-width",
    mapPageLabel: "Official architectural hospital floor-plan drawings",
    note: "Aster publishes approved architectural floor-plan drawings within its environmental-compliance report. These are architectural/planning documents and may not reflect every current clinical room assignment.",
    buildings: ["Basement", "Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor", "Fifth Floor", "Terrace Floor"],
    directory: [],
  },
  {
    id: "anmmch-gaya",
    hospital: "Anugrah Narayan Magadh Medical College & Hospital, Gaya",
    aliases: ["anugrah narayan magadh medical college", "anmmch", "magadh medical college hospital", "anugrah narayan magadh medical college hospital"],
    mapKind: "campus-map",
    sourceLabel: "ANMMCH Gaya — official Government of Bihar Campus Map",
    sourceUrl: "https://anmmch.bihar.gov.in/campus_map.php",
    mapEmbedUrl: "https://anmmch.bihar.gov.in/campus_map.php",
    mapPageLabel: "Official campus map",
    buildings: ["Medical college", "Hospital", "Campus roads / grounds"],
    directory: [],
  },
  {
    id: "gmc-palakkad",
    hospital: "Government Medical College, Palakkad",
    aliases: ["government medical college palakkad", "gmc palakkad", "institute of integrated medical science palakkad"],
    mapKind: "campus-map",
    sourceLabel: "Government of Kerala — GMC Palakkad institutional document",
    sourceUrl: "https://health.kerala.gov.in/assets/backend/uploads/publicrelation/1774592373_69c6217559322.pdf",
    mapEmbedUrl: "https://health.kerala.gov.in/assets/backend/uploads/publicrelation/1774592373_69c6217559322.pdf#zoom=page-width",
    mapPageLabel: "Official satellite campus map / block layout",
    buildings: ["Academic Block", "Administrative Block", "O.P. Block", "O.T. Block", "Ward Block", "Mortuary", "Electrical Station", "STP"],
    directory: [
      { label: "O.P. services", location: "O.P. Block" },
      { label: "Operation theatres", location: "O.T. Block" },
      { label: "Inpatient wards", location: "Ward Block" },
    ],
  },
];

function getVerifiedMapProfile(hospital: Pick<HospitalResult, "name" | "address"> | null) {
  if (!hospital) return null;
  const haystack = `${hospital.name} ${hospital.address}`.toLowerCase();
  return VERIFIED_MAPS.find((profile) => profile.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) ?? null;
}


const CARE_NEEDS: { id: CareNeed; label: string; short: string; Icon: typeof Hospital }[] = [
  { id: "nearest", label: "Nearest hospital", short: "Nearest", Icon: LocateFixed },
  { id: "emergency", label: "Emergency / ER", short: "Emergency", Icon: Siren },
  { id: "ent", label: "Ear, Nose & Throat", short: "ENT", Icon: Ear },
  { id: "surgery", label: "General Surgery", short: "Surgery", Icon: Stethoscope },
  { id: "cardiac", label: "Heart / Cardiac", short: "Cardiac", Icon: HeartPulse },
  { id: "pediatrics", label: "Children / Pediatrics", short: "Children", Icon: Baby },
  { id: "maternity", label: "Maternity / Women's care", short: "Maternity", Icon: Hospital },
  { id: "orthopedics", label: "Bones / Orthopedics", short: "Ortho", Icon: Bone },
  { id: "trauma", label: "Accident / Trauma", short: "Trauma", Icon: Siren },
];

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const RAW_GOOGLE_EMBED_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? "").trim();
const GOOGLE_EMBED_KEY = RAW_GOOGLE_EMBED_KEY && !RAW_GOOGLE_EMBED_KEY.includes("YOUR_") ? RAW_GOOGLE_EMBED_KEY : "";

function formatDistance(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return "GPS for distance";
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
function haversineMeters(a: UserLocation, b: { latitude: number; longitude: number }) {
  const radius = 6_371_000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}


const LOCAL_DEMO_CARE_TERMS: Record<CareNeed, string[]> = {
  nearest: [],
  emergency: ["emergency", "critical"],
  ent: ["ent", "ear", "nose", "throat"],
  surgery: ["surgery", "surgical"],
  cardiac: ["cardiology", "cardiac"],
  pediatrics: ["pediatrics", "children", "child"],
  maternity: ["obstetrics", "gynaecology", "maternity"],
  orthopedics: ["orthopedics", "orthopaedics", "bone", "joint"],
  trauma: ["trauma", "emergency", "orthopedics"],
};

function buildLocalBengaluruHospitals(current: UserLocation, careNeed: CareNeed): HospitalResult[] {
  const raw = [
    { id: "kc-general", name: "K.C. General Hospital", latitude: 12.996145, longitude: 77.569369, address: "Malleshwaram, Bengaluru", specialties: ["Emergency", "General Medicine", "Surgery", "Orthopedics", "Pediatrics", "Obstetrics and Gynaecology"] },
    { id: "bangalore-baptist", name: "Bangalore Baptist Hospital", latitude: 13.035246, longitude: 77.589892, address: "Hebbal, Bengaluru", specialties: ["Emergency", "Cardiology", "Pediatrics", "Orthopedics", "Obstetrics and Gynaecology", "ENT"] },
    { id: "ramaiah-memorial", name: "Ramaiah Memorial Hospital", latitude: 13.028545, longitude: 77.569479, address: "New BEL Road, Bengaluru", specialties: ["Emergency", "Cardiology", "Surgery", "Orthopedics", "Pediatrics", "ENT"] },
    { id: "kims-bengaluru", name: "KIMS Hospital & Research Centre", latitude: 12.95630, longitude: 77.57479, address: "K.R. Road, V.V. Puram, Bengaluru", specialties: ["Medicine", "Surgery", "Obstetrics and Gynaecology", "Pediatrics", "ENT", "Orthopedics"] },
  ];
  const terms = LOCAL_DEMO_CARE_TERMS[careNeed];
  return raw.map((item) => {
    const searchable = `${item.name} ${item.specialties.join(" ")}`.toLowerCase();
    const matchCount = terms.filter((term) => searchable.includes(term)).length;
    const matchScore = careNeed === "nearest" ? 0 : matchCount * 55 + (searchable.includes("emergency") && (careNeed === "emergency" || careNeed === "trauma") ? 90 : 0);
    const distanceMeters = Math.round(haversineMeters(current, item));
    return {
      id: `demo-bengaluru/${item.id}`,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      distanceMeters,
      address: item.address,
      emergency: "yes",
      osmUrl: `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`,
      dataProvider: "osm" as const,
      specialties: item.specialties,
      matchScore,
      matchStatus: careNeed === "nearest" ? "mapped" as const : matchCount ? "mapped" as const : "unknown" as const,
      matchEvidence: careNeed === "nearest" ? ["Built-in Bengaluru demo · ranked by distance"] : matchCount ? [`${item.specialties.filter((x) => terms.some((term) => x.toLowerCase().includes(term))).slice(0,2).join(" · ")} available in demo profile`] : ["Specialty not verified in demo profile"],
    };
  }).sort((a, b) => careNeed === "nearest" ? a.distanceMeters - b.distanceMeters : (b.matchScore - Math.min(65, b.distanceMeters / 400)) - (a.matchScore - Math.min(65, a.distanceMeters / 400)) || a.distanceMeters - b.distanceMeters);
}

function buildLocalDemoRoute(current: UserLocation, hospital: HospitalResult): RoadRoute {
  const direct = Math.max(1, Math.round(haversineMeters(current, hospital)));
  const roadEstimate = Math.round(direct * 1.28);
  const durationSeconds = Math.max(120, Math.round((roadEstimate / 24_000) * 3600));
  return {
    distanceMeters: roadEstimate,
    durationSeconds,
    coordinates: [[current.latitude, current.longitude], [hospital.latitude, hospital.longitude]],
    steps: [{ instruction: "Demo route preview — open turn-by-turn navigation for live road directions.", distanceMeters: roadEstimate, durationSeconds }],
    provider: "Built-in Bengaluru demo route",
  };
}

function loadLeaflet(): Promise<LeafletGlobal> {
  if (window.L) return Promise.resolve(window.L);
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onReady = () => window.L ? resolve(window.L) : reject(new Error("Leaflet did not load"));
    if (existing) {
      if (window.L) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      return;
    }
    script.src = LEAFLET_JS;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", () => reject(new Error("Map library failed to load")), { once: true });
    document.body.appendChild(script);
  });
}

function OpenStreetMapView({
  location, hospitals, selected, route,
}: {
  location: UserLocation | null;
  hospitals: HospitalResult[];
  selected: HospitalResult | null;
  route: RoadRoute | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pointsRef = useRef<LeafletLayerGroup | null>(null);
  const routeRef = useRef<LeafletLayerGroup | null>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current || mapRef.current) return;
    loadLeaflet().then((L) => {
      if (cancelled || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current, { zoomControl: true, attributionControl: true }).setView([12.9716, 77.5946], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      pointsRef.current = L.layerGroup().addTo(map);
      routeRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }).catch(() => setMapError("Interactive map could not load. Check the internet connection."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const points = pointsRef.current;
    const routeLayer = routeRef.current;
    if (!L || !map || !points || !routeLayer) return;
    points.clearLayers();
    routeLayer.clearLayers();
    const bounds: [number, number][] = [];

    if (location) {
      const userIcon = L.divIcon({
        className: "gps-div-icon",
        html: '<div class="gps-user-marker"><span></span></div>',
        iconSize: [34, 34], iconAnchor: [17, 17],
      });
      L.circle([location.latitude, location.longitude], { radius: Math.min(location.accuracy, 250), color: "#3B82F6", weight: 1, fillColor: "#60A5FA", fillOpacity: .08 }).addTo(points);
      L.marker([location.latitude, location.longitude], { icon: userIcon }).addTo(points).bindTooltip?.("Your live location", { direction: "top" });
      bounds.push([location.latitude, location.longitude]);
    }

    hospitals.slice(0, 8).forEach((hospital, index) => {
      const active = selected?.id === hospital.id;
      const icon = L.divIcon({
        className: "hospital-div-icon",
        html: `<div class="hospital-map-pin ${active ? "hospital-map-pin-active" : ""}"><b>${index + 1}</b></div>`,
        iconSize: [34, 42], iconAnchor: [17, 40],
      });
      L.marker([hospital.latitude, hospital.longitude], { icon }).addTo(points).bindTooltip?.(hospital.name, { direction: "top" });
      bounds.push([hospital.latitude, hospital.longitude]);
    });

    if (route?.coordinates.length) {
      L.polyline(route.coordinates, { color: "#2563EB", weight: 7, opacity: .18 }).addTo(routeLayer);
      L.polyline(route.coordinates, { color: "#2563EB", weight: 4, opacity: .92, dashArray: "11 9" }).addTo(routeLayer);
      route.coordinates.forEach((point) => bounds.push(point));
    }

    if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [38, 38], maxZoom: 15 });
    else if (bounds.length === 1) map.setView(bounds[0], 14);
  }, [location, hospitals, selected, route]);

  return <div className="real-map-shell relative overflow-hidden rounded-[28px] border border-[#D9E6F3] bg-[#EAF3FB]">
    <div ref={hostRef} className="h-[430px] w-full sm:h-[520px]" aria-label="Real OpenStreetMap view showing live location and nearby hospitals" />
    {!location && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[2px]"><div className="rounded-2xl border border-white bg-white/95 px-5 py-4 text-center shadow-xl"><LocateFixed size={23} className="mx-auto text-blue-600"/><p className="mt-2 text-xs font-black text-[#284B6D]">Enable location to start</p></div></div>}
    {mapError && <div className="absolute inset-x-4 bottom-4 rounded-xl border border-rose-200 bg-white/95 p-3 text-xs font-bold text-rose-700 shadow-lg">{mapError}</div>}
  </div>;
}


function DemoCityMap({ location, hospitals, selected, route }: { location: UserLocation; hospitals: HospitalResult[]; selected: HospitalResult | null; route: RoadRoute | null }) {
  const points = [location, ...hospitals];
  const minLat = Math.min(...points.map((p) => p.latitude));
  const maxLat = Math.max(...points.map((p) => p.latitude));
  const minLon = Math.min(...points.map((p) => p.longitude));
  const maxLon = Math.max(...points.map((p) => p.longitude));
  const latSpan = Math.max(0.01, maxLat - minLat);
  const lonSpan = Math.max(0.01, maxLon - minLon);
  const xy = (lat: number, lon: number) => ({ x: 70 + ((lon - minLon) / lonSpan) * 650, y: 385 - ((lat - minLat) / latSpan) * 300 });
  const user = xy(location.latitude, location.longitude);
  const selectedPoint = selected ? xy(selected.latitude, selected.longitude) : null;
  return <div className="relative overflow-hidden rounded-[28px] border border-[#D9E6F3] bg-[#EEF6FE]">
    <svg viewBox="0 0 820 460" className="h-[430px] w-full sm:h-[520px]" role="img" aria-label="Built-in Bengaluru demo map showing hospitals and route">
      <defs>
        <pattern id="demoCityGrid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#DCE9F5" strokeWidth="1"/></pattern>
        <linearGradient id="demoCityBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F9FCFF"/><stop offset="1" stopColor="#EAF4FE"/></linearGradient>
      </defs>
      <rect width="820" height="460" fill="url(#demoCityBg)"/><rect width="820" height="460" fill="url(#demoCityGrid)"/>
      <path d="M35 105C180 85 250 155 390 125S640 65 785 105" fill="none" stroke="#D2DFEC" strokeWidth="18" strokeLinecap="round"/>
      <path d="M55 330C180 260 300 350 430 285S650 220 785 270" fill="none" stroke="#D8E5F1" strokeWidth="14" strokeLinecap="round"/>
      <path d="M190 35C210 130 165 230 225 420" fill="none" stroke="#D8E5F1" strokeWidth="12" strokeLinecap="round"/>
      <path d="M585 20C540 135 610 240 545 440" fill="none" stroke="#D8E5F1" strokeWidth="12" strokeLinecap="round"/>
      {route && selectedPoint && <><path d={`M${user.x} ${user.y} L${selectedPoint.x} ${selectedPoint.y}`} stroke="#93C5FD" strokeWidth="20" opacity=".28" strokeLinecap="round"/><path d={`M${user.x} ${user.y} L${selectedPoint.x} ${selectedPoint.y}`} stroke="#2563EB" strokeWidth="5" strokeDasharray="12 9" strokeLinecap="round" className="route-motion"/></>}
      {hospitals.map((hospital, index) => { const p = xy(hospital.latitude, hospital.longitude); const active = selected?.id === hospital.id; return <g key={hospital.id}><circle cx={p.x} cy={p.y} r={active ? 19 : 15} fill={active ? "#2563EB" : "#FFFFFF"} stroke="#2563EB" strokeWidth="3"/><text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={active ? "#FFFFFF" : "#2563EB"}>{index + 1}</text><rect x={p.x - 70} y={p.y + 23} width="140" height="25" rx="12" fill="#FFFFFF" stroke="#D7E4F0"/><text x={p.x} y={p.y + 39} textAnchor="middle" fontSize="9" fontWeight="900" fill="#36536F">{hospital.name.length > 23 ? `${hospital.name.slice(0,22)}…` : hospital.name}</text></g>; })}
      <circle cx={user.x} cy={user.y} r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="5"/><circle cx={user.x} cy={user.y} r="4" fill="#FFFFFF"/>
      <text x="32" y="42" fontSize="13" fontWeight="900" fill="#36536F">BENGALURU DEMO MAP</text><text x="32" y="61" fontSize="10" fontWeight="700" fill="#8AA0B6">Built-in hackathon fallback · not turn-by-turn navigation</text>
    </svg>
    <div className="absolute bottom-4 left-4 rounded-xl border border-white bg-white/95 px-3 py-2 text-[10px] font-black text-slate-600 shadow-lg">No external map service required</div>
  </div>;
}

function RealWorldMap({
  location, hospitals, selected, route, careNeed,
}: {
  location: UserLocation | null;
  hospitals: HospitalResult[];
  selected: HospitalResult | null;
  route: RoadRoute | null;
  careNeed: CareNeed;
}) {
  if (location?.demoMode) return <DemoCityMap location={location} hospitals={hospitals} selected={selected} route={route} />;
  const googleMode = Boolean(GOOGLE_EMBED_KEY && hospitals.some((hospital) => hospital.dataProvider === "google"));
  if (!googleMode) return <OpenStreetMapView location={location} hospitals={hospitals} selected={selected} route={route} />;

  const care = CARE_NEEDS.find((item) => item.id === careNeed)?.label ?? "hospital";
  const origin = location ? `${location.latitude},${location.longitude}` : "Bengaluru, India";
  const selectedDestination = selected?.googlePlaceId
    ? `place_id:${selected.googlePlaceId}`
    : selected ? `${selected.latitude},${selected.longitude}` : "";
  const src = selected && selectedDestination && location
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(GOOGLE_EMBED_KEY)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(selectedDestination)}&mode=driving&units=metric&region=IN`
    : selected
      ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(GOOGLE_EMBED_KEY)}&q=${encodeURIComponent(selected.name)}&center=${selected.latitude},${selected.longitude}&zoom=15&region=IN`
      : `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(GOOGLE_EMBED_KEY)}&q=${encodeURIComponent(`${care} hospitals`)}&center=${location ? `${location.latitude},${location.longitude}` : "12.9716,77.5946"}&zoom=13&region=IN`;

  return <div className="relative overflow-hidden rounded-[28px] border border-[#D9E6F3] bg-[#EAF3FB]">
    <iframe
      title="Google Maps hospital navigation"
      src={src}
      className="h-[430px] w-full border-0 sm:h-[520px]"
      loading="lazy"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
    <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/90 bg-white/95 px-3 py-2 text-[10px] font-black text-[#31516F] shadow-lg">Google Maps · live hospital view</div>
  </div>;
}

function IndoorLayout({ data, hospitalName }: { data: IndoorData; hospitalName: string }) {
  const [level, setLevel] = useState(data.levels[0] || "site");

  const visible = useMemo(() => {
    const indoor = data.features.filter((feature) => feature.kind !== "building" && feature.level.split(";").includes(level));
    const buildings = data.features.filter((feature) => feature.kind === "building");
    return indoor.length ? [...buildings, ...indoor] : buildings;
  }, [data, level]);
  const allPoints = visible.flatMap((feature) => feature.geometry);
  const minLat = Math.min(...allPoints.map((point) => point.lat));
  const maxLat = Math.max(...allPoints.map((point) => point.lat));
  const minLon = Math.min(...allPoints.map((point) => point.lon));
  const maxLon = Math.max(...allPoints.map((point) => point.lon));
  const latSpan = Math.max(.00001, maxLat - minLat);
  const lonSpan = Math.max(.00001, maxLon - minLon);
  const point = (p: { lat: number; lon: number }) => `${30 + ((p.lon - minLon) / lonSpan) * 640},${30 + ((maxLat - p.lat) / latSpan) * 360}`;
  const colors: Record<IndoorFeature["kind"], { fill: string; stroke: string; label?: string }> = {
    room: { fill: "#EAF3FF", stroke: "#6DA3EA" }, corridor: { fill: "#F7FAFD", stroke: "#AFC2D6" }, lift: { fill: "#E7F8F0", stroke: "#58B68C" }, stairs: { fill: "#F2EEFF", stroke: "#9278D7" }, facility: { fill: "#FFF5E6", stroke: "#E7A957" }, building: { fill: "#FFFFFF", stroke: "#9EB7D0" }, indoor: { fill: "#EDF5FB", stroke: "#84A9C8" },
    hydrant: { fill: "#FEE2E2", stroke: "#DC2626", label: "H" }, fire_hose: { fill: "#FEE2E2", stroke: "#B91C1C", label: "HOSE" }, extinguisher: { fill: "#FEF2F2", stroke: "#EF4444", label: "FX" }, fire_alarm: { fill: "#FFF1F2", stroke: "#F43F5E", label: "AL" }, aed: { fill: "#ECFDF5", stroke: "#059669", label: "AED" }, first_aid: { fill: "#F0FDF4", stroke: "#16A34A", label: "+" }, emergency_exit: { fill: "#F0FDF4", stroke: "#15803D", label: "EXIT" }, assembly: { fill: "#ECFDF5", stroke: "#15803D", label: "AP" }, pharmacy: { fill: "#ECFDF5", stroke: "#10B981", label: "RX" },
  };

  if (!visible.length || !Number.isFinite(minLat)) return null;
  return <div>
    {data.levels.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{data.levels.map((item) => <button key={item} type="button" onClick={() => setLevel(item)} className={`rounded-xl px-3 py-2 text-[10px] font-black ${item === level ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>Level {item}</button>)}</div>}
    <div className="overflow-hidden rounded-[24px] border border-[#DCE7F2] bg-[#F7FBFF] p-3">
      <svg viewBox="0 0 700 420" className="w-full" role="img" aria-label={`Publicly mapped building geometry for ${hospitalName}`}>
        <defs><pattern id="realIndoorGrid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#DFEAF5" strokeWidth="1"/></pattern></defs>
        <rect width="700" height="420" rx="22" fill="url(#realIndoorGrid)" />
        {visible.map((feature) => {
          const style = colors[feature.kind];
          const geometry = feature.geometry.map(point).join(" ");
          const first = feature.geometry[0];
          const x = 30 + ((first.lon - minLon) / lonSpan) * 640;
          const y = 30 + ((maxLat - first.lat) / latSpan) * 360;
          const isPoint = feature.geometry.length === 1;
          return <g key={feature.id}>
            {isPoint ? <>
              <circle cx={x} cy={y} r="12" fill={style.fill} stroke={style.stroke} strokeWidth="2.4"/>
              <text x={x} y={y + 3} textAnchor="middle" fontSize={style.label && style.label.length > 3 ? "5.8" : "7.5"} fontWeight="900" fill={style.stroke}>{style.label || "•"}</text>
            </> : <polygon points={geometry} fill={style.fill} fillOpacity={feature.kind === "building" ? .35 : .82} stroke={style.stroke} strokeWidth={feature.kind === "building" ? 3 : 2}/>}
            {feature.kind !== "building" && feature.name && <text x={x + (isPoint ? 15 : 0)} y={y - (isPoint ? 8 : 0)} fontSize="9" fontWeight="800" fill="#3E5F7D">{feature.name.slice(0, 24)}</text>}
          </g>;
        })}
      </svg>
    </div>
  </div>;
}



function OfficialHospitalMap({ profile }: { profile: VerifiedMapProfile }) {
  return <div className="space-y-4">
    <div className="overflow-hidden rounded-[26px] border border-emerald-200 bg-white shadow-[0_16px_45px_rgba(16,185,129,.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-600 px-3 py-1.5 text-[9px] font-black tracking-[.12em] text-white">OFFICIAL MAP FOUND</span>
            <span className="rounded-full border border-white bg-white/85 px-3 py-1.5 text-[9px] font-black text-slate-500">VERIFIED HOSPITAL SOURCE</span>
          </div>
          <h4 className="mt-3 text-[18px] font-black tracking-tight text-[#173B5D]">{profile.hospital}</h4>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">{profile.mapPageLabel}</p>
          {profile.note && <p className="mt-2 max-w-2xl text-[9px] leading-4 text-slate-400">{profile.note}</p>}
        </div>
        <a href={profile.sourceUrl} target="_blank" rel="noreferrer" className="secondary-btn !px-3 !py-2 text-[10px]">Open official source <ExternalLink size={12}/></a>
      </div>
      <div className="bg-[#F4F8FC] p-3 sm:p-4">
        <iframe
          title={`${profile.hospital} official building layout`}
          src={profile.mapEmbedUrl}
          className="h-[470px] w-full rounded-[20px] border border-[#D6E3EF] bg-white sm:h-[560px]"
          loading="lazy"
        />
        <p className="mt-2 text-[9px] leading-4 text-slate-400">This panel embeds the official/public source directly. If the source blocks embedding in your browser, use “Open official source” above.</p>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
      <div className="rounded-[22px] border border-[#DFE9F3] bg-[#F8FBFE] p-4">
        <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Verified map landmarks</p>
        <div className="mt-3 space-y-2">
          {profile.buildings.length ? profile.buildings.map((building, index) => <div key={building} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-black text-blue-700">{index + 1}</span>
            <span className="text-[10px] font-extrabold text-[#355470]">{building}</span>
          </div>) : <p className="rounded-xl bg-white p-3 text-[10px] leading-5 text-slate-400">Use the official map source above for labelled campus landmarks.</p>}
        </div>
      </div>
      <div className="rounded-[22px] border border-[#DFE9F3] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Verified department directory</p>
            <p className="mt-1 text-[9px] leading-4 text-slate-400">Selected wayfinding points taken from the same official patient booklet.</p>
          </div>
          <ShieldCheck size={18} className="text-emerald-600"/>
        </div>
        <div className="mt-3 divide-y divide-slate-100">
          {profile.directory.length ? profile.directory.map((item) => <div key={item.label} className="grid gap-1 py-2.5 sm:grid-cols-[.8fr_1.2fr] sm:gap-4">
            <span className="text-[10px] font-black text-[#244765]">{item.label}</span>
            <span className="text-[10px] font-semibold text-slate-500">{item.location}</span>
          </div>) : <p className="py-3 text-[10px] leading-5 text-slate-400">A verified building/floor directory was not included in the source we found. The official map is still available above.</p>}
        </div>
      </div>
    </div>
  </div>;
}

export function VerifiedHospitalLibrary() {
  const [query, setQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<VerifiedMapProfile | null>(VERIFIED_MAPS[0] ?? null);
  const normalized = query.trim().toLowerCase();
  const filtered = VERIFIED_MAPS.filter((profile) => {
    if (!normalized) return true;
    return `${profile.hospital} ${profile.mapPageLabel} ${profile.buildings.join(" ")} ${profile.directory.map((item) => `${item.label} ${item.location}`).join(" ")}`.toLowerCase().includes(normalized);
  });
  const bengaluruCount = VERIFIED_MAPS.filter((profile) => /bengaluru|bangalore/i.test(profile.hospital)).length;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[30px] border border-[#D9E8F6] bg-gradient-to-br from-white via-[#F6FBFF] to-[#EEF7FF] p-6 shadow-[0_20px_60px_rgba(34,84,132,.08)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="eyebrow mb-2"><ShieldCheck size={14}/> VERIFIED HOSPITALS</div>
          <h2 className="section-title">Maps and floor guides we can actually prove.</h2>
          <p className="mt-2 max-w-3xl text-[12px] leading-6 text-slate-500">Every hospital here links back to an official or government/public source. A campus map, architectural plan and floor directory are labelled separately so OPD Saathi never presents a directory as an exact indoor drawing.</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-center shadow-sm"><b className="block text-xl font-black text-blue-700">{VERIFIED_MAPS.length}</b><small className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total verified</small></span>
          <span className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center shadow-sm"><b className="block text-xl font-black text-emerald-700">{bengaluruCount}</b><small className="text-[9px] font-black uppercase tracking-wider text-slate-400">Bengaluru</small></span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#DFEAF5] bg-white px-4 shadow-sm">
        <Search size={16} className="shrink-0 text-blue-600"/>
        <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search hospital, city, department or map type…" className="min-w-0 flex-1 bg-transparent py-3.5 text-[12px] font-semibold text-[#284866] outline-none placeholder:text-slate-400"/>
      </div>
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><p className="text-[13px] font-black text-[#244765]">Verified hospital library</p><p className="mt-1 text-[9px] text-slate-400">{filtered.length} matching source{filtered.length === 1 ? "" : "s"}</p></div>
        <div className="max-h-[720px] space-y-2 overflow-y-auto p-2">
          {filtered.map((profile) => {
            const badge = mapKindBadge(profile);
            const active = selectedProfile?.id === profile.id;
            return <button key={profile.id} type="button" onClick={()=>setSelectedProfile(profile)} className={`w-full rounded-2xl border p-3.5 text-left transition ${active ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50"}`}>
              <div className="flex items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500"}`}><Hospital size={16}/></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-black leading-5 text-[#284866]">{profile.hospital}</span><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[8px] font-black ${badge.className}`}>{badge.label}</span><span className="mt-1.5 block text-[9px] leading-4 text-slate-400">{profile.mapPageLabel}</span></span><ArrowRight size={14} className={`mt-1 shrink-0 ${active ? "text-blue-600" : "text-slate-300"}`}/></div>
            </button>;
          })}
          {!filtered.length && <div className="p-8 text-center text-[11px] font-semibold text-slate-400">No verified hospital source matches that search.</div>}
        </div>
      </section>
      <div>{selectedProfile ? <OfficialHospitalMap profile={selectedProfile}/> : <div className="surface-card p-10 text-center text-sm text-slate-400">Choose a verified hospital to view its source.</div>}</div>
    </div>
  </div>;
}

export default function NearbyHospitalNavigator() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "tracking" | "denied" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [careNeed, setCareNeed] = useState<CareNeed>(() => {
    if (typeof window === "undefined") return "nearest";
    try {
      const requested = sessionStorage.getItem("opd-saathi-care-need") as CareNeed | null;
      if (requested && CARE_NEEDS.some((item) => item.id === requested)) {
        sessionStorage.removeItem("opd-saathi-care-need");
        return requested;
      }
    } catch { /* browser storage is optional */ }
    return "nearest";
  });
  const [rankingNote, setRankingNote] = useState("");
  const [indiaSearch, setIndiaSearch] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [selected, setSelected] = useState<HospitalResult | null>(null);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState("");
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [indoor, setIndoor] = useState<IndoorData | null>(null);
  const [indoorBusy, setIndoorBusy] = useState(false);
  const [indoorError, setIndoorError] = useState("");
  const [libraryProfile, setLibraryProfile] = useState<VerifiedMapProfile | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastSearchRef = useRef<UserLocation | null>(null);
  const lastRouteRef = useRef<UserLocation | null>(null);
  const lastRouteHospitalRef = useRef<string | null>(null);

  async function fetchHospitals(current: UserLocation, force = false, requestedNeed: CareNeed = careNeed, forceSelectTop = false) {
    if (!force && lastSearchRef.current && haversineMeters(lastSearchRef.current, current) < 600) return;
    setLoadingHospitals(true); setHospitalError("");
    if (current.demoMode) {
      const next = buildLocalBengaluruHospitals(current, requestedNeed);
      setHospitals(next);
      setRankingNote("Instant built-in Bengaluru demo results — no API key or external service required.");
      lastSearchRef.current = current;
      if (next.length && (forceSelectTop || !selected || !next.some((item) => item.id === selected.id))) {
        setSelected(next[0]);
        setIndoor({ features: [], levels: [], hasIndoorPlan: false, hasBuildingFootprint: false, source: "Built-in demo", note: "Demo hospital result. No fabricated indoor plan is shown." });
      }
      setLoadingHospitals(false);
      return;
    }
    try {
      const response = await fetch("/api/nearby-hospitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, careNeed: requestedNeed }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Hospital lookup failed");
      const next = (json.hospitals ?? []) as HospitalResult[];
      setHospitals(next);
      setRankingNote(String(json.rankingNote || ""));
      lastSearchRef.current = current;
      if (next.length && (forceSelectTop || !selected || !next.some((item) => item.id === selected.id))) {
        setSelected(next[0]);
        void fetchIndoor(next[0]);
      }
      if (!next.length) setHospitalError("No mapped hospitals were found within 12 km. Try refreshing or use an external map search.");
    } catch (error) {
      setHospitalError(error instanceof Error ? error.message : "Hospital lookup failed");
    } finally { setLoadingHospitals(false); }
  }

  async function searchIndiaHospitals() {
    const query = indiaSearch.trim();
    if (!query) return;
    setSearchBusy(true);
    setHospitalError("");
    const normalized = query.toLowerCase();
    const localProfile = VERIFIED_MAPS.find((profile) => [profile.hospital, ...profile.aliases].some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase())));
    if (localProfile) {
      setLibraryProfile(localProfile);
      setRankingNote(`Opened the verified map profile for ${localProfile.hospital}. This local library works without an API key.`);
      setSearchBusy(false);
      return;
    }
    if (/bangalore|bengaluru/.test(normalized) && !location) {
      enableBengaluruDemoLocation();
      setRankingNote("Showing the built-in Bengaluru demo hospital set. Use live GPS for real public hospital discovery.");
      setSearchBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/nearby-hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(location ?? {}), careNeed, searchText: query }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Hospital search failed");
      const next = (json.hospitals ?? []) as HospitalResult[];
      setHospitals(next);
      setRankingNote(String(json.rankingNote || ""));
      if (next.length) {
        setSelected(next[0]);
        void fetchIndoor(next[0]);
      } else {
        setHospitalError("No matching hospitals were returned. Try a hospital name, city, or broader term.");
      }
    } catch (error) {
      setHospitalError(error instanceof Error ? error.message : "Hospital search failed");
    } finally {
      setSearchBusy(false);
    }
  }

  async function fetchRoute(current: UserLocation, hospital: HospitalResult) {
    setRouteBusy(true); setRouteError("");
    if (current.demoMode) {
      setRoute(buildLocalDemoRoute(current, hospital));
      lastRouteRef.current = current;
      lastRouteHospitalRef.current = hospital.id;
      setRouteBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/route-to-hospital", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: current, destination: hospital, demoMode: Boolean(current.demoMode) }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Route unavailable");
      setRoute(json as RoadRoute);
      lastRouteRef.current = current;
      lastRouteHospitalRef.current = hospital.id;
    } catch (error) {
      setRoute(null); setRouteError(error instanceof Error ? error.message : "Route unavailable");
    } finally { setRouteBusy(false); }
  }

  async function fetchIndoor(hospital: HospitalResult) {
    const official = getVerifiedMapProfile(hospital);
    if (official || hospital.id.startsWith("demo-bengaluru/")) {
      setIndoorBusy(false);
      setIndoorError("");
      setIndoor({ features: [], levels: [], hasIndoorPlan: false, hasBuildingFootprint: false, source: official ? "Verified hospital source" : "Built-in demo", note: official ? "Official hospital map/directory is shown below." : "Demo hospital result. No fabricated indoor plan is shown." });
      return;
    }
    setIndoorBusy(true); setIndoorError(""); setIndoor(null);
    try {
      const response = await fetch("/api/indoor-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(hospital) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Indoor data unavailable");
      setIndoor(json as IndoorData);
    } catch (error) {
      setIndoorError(error instanceof Error ? error.message : "Indoor data unavailable");
    } finally { setIndoorBusy(false); }
  }

  function enableBengaluruDemoLocation() {
    const current: UserLocation = { ...BENGALURU_DEMO_LOCATION, timestamp: Date.now(), demoMode: true };
    setLocation(current);
    setLocationState("tracking");
    setLocationMessage("Demo location enabled: central Bengaluru. This is not your live GPS position.");
    void fetchHospitals(current, true, careNeed, true);
  }

  function startTracking() {
    if (!("geolocation" in navigator)) {
      setLocationState("error"); setLocationMessage("This browser does not support GPS location. Use the Bengaluru demo location below."); return;
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    setLocationState("requesting"); setLocationMessage("");
    watchRef.current = navigator.geolocation.watchPosition((position) => {
      const current: UserLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp };
      setLocation(current); setLocationState("tracking");
      void fetchHospitals(current);
    }, (error) => {
      if (error.code === 1) { setLocationState("denied"); setLocationMessage("Location permission was denied. Allow location for this site, or use the Bengaluru demo location."); }
      else { setLocationState("error"); setLocationMessage("Your location could not be determined. Check GPS/Wi-Fi, or use the Bengaluru demo location."); }
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 });
  }

  useEffect(() => () => {
    if (watchRef.current !== null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  useEffect(() => {
    if (!location || !selected) return;
    const shouldRefresh = lastRouteHospitalRef.current !== selected.id || !lastRouteRef.current || haversineMeters(lastRouteRef.current, location) > 80;
    if (shouldRefresh) void fetchRoute(location, selected);
  }, [location, selected]);

  const selectedDistance = location && selected ? haversineMeters(location, selected) : selected?.distanceMeters ?? 0;
  const arrived = Boolean(location && selected && selectedDistance <= Math.max(180, location.accuracy * 2));
  const careLabel = CARE_NEEDS.find((item) => item.id === careNeed)?.label ?? "Nearest hospital";
  const externalDirections = selected ? `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}&travelmode=driving` : "#";
  const verifiedMap = getVerifiedMapProfile(selected);

  return <div className="space-y-5">
    <section className="nearby-hero relative overflow-hidden rounded-[30px] border border-[#D8E8F7] p-6 sm:p-8">
      <div className="nearby-hero-mesh" />
      <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="eyebrow mb-3"><Satellite size={15}/> REAL-WORLD CARE NAVIGATION</div>
          <h2 className="text-[30px] font-black tracking-[-.05em] text-[#183A60] sm:text-[42px]">From where you are<br/><span className="home-hero-gradient">to the right hospital.</span></h2>
          <p className="mt-4 max-w-2xl text-[13px] leading-7 text-[#5D7892]">Choose the care you need, then use live GPS to rank nearby real hospitals by capability evidence plus distance. Road routing is real; indoor geometry is shown only when verified public mapping exists.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startTracking} disabled={locationState === "requesting"} className="primary-btn !rounded-2xl !px-6 !py-4 disabled:opacity-60">
            {locationState === "requesting" ? <LoaderCircle className="animate-spin" size={18}/> : <Crosshair size={18}/>} {locationState === "tracking" && location?.accuracy !== 1500 ? "Refresh GPS tracking" : "Use my live location"}
          </button>
          <button type="button" onClick={enableBengaluruDemoLocation} className="secondary-btn !rounded-2xl !px-5 !py-4">
            <MapPinned size={17}/> Bengaluru demo location
          </button>
        </div>
      </div>
      <div className="relative z-10 mt-6 flex flex-wrap gap-2">
        <span className="real-data-chip"><LocateFixed size={14}/> Browser GPS</span><span className="real-data-chip"><Hospital size={14}/> Google Places + OSM fallback</span><span className="real-data-chip"><Route size={14}/> Road-network route</span><span className="real-data-chip"><Layers3 size={14}/> Verified/public indoor mapping</span>
      </div>
    </section>

    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-2"><Stethoscope size={14}/> BEST HOSPITAL FOR YOUR NEED</div>
          <h3 className="section-title">What kind of care do you need?</h3>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-400">OPD Saathi ranks nearby hospitals using distance plus verified or publicly mapped capability data. It does not diagnose your condition.</p>
        </div>
        <span className="real-source-badge"><ShieldCheck size={13}/> evidence-based ranking</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {CARE_NEEDS.map(({ id, label, short, Icon }) => (
          <button key={id} type="button" onClick={() => { setCareNeed(id); if (location) void fetchHospitals(location, true, id, true); }} className={`group rounded-2xl border p-3 text-left transition ${careNeed === id ? "border-blue-300 bg-blue-50 shadow-[0_10px_30px_rgba(37,99,235,.10)]" : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50"}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${careNeed === id ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 group-hover:text-blue-600"}`}><Icon size={17}/></span>
            <span className="mt-2 block text-[11px] font-black text-[#284866]">{short}</span>
            <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{label}</span>
          </button>
        ))}
      </div>
      <form className="mt-4 flex flex-col gap-2 rounded-2xl border border-[#E0EAF5] bg-[#F8FBFE] p-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void searchIndiaHospitals(); }}>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white bg-white px-3 shadow-sm">
          <Search size={15} className="shrink-0 text-blue-600"/>
          <input value={indiaSearch} onChange={(event) => setIndiaSearch(event.target.value)} placeholder="Search any hospital or city in India — e.g. AIIMS Delhi" className="min-w-0 flex-1 bg-transparent py-3 text-[11px] font-semibold text-[#284866] outline-none placeholder:text-slate-400"/>
        </div>
        <button type="submit" disabled={searchBusy || !indiaSearch.trim()} className="secondary-btn justify-center disabled:opacity-40">{searchBusy ? <LoaderCircle size={15} className="animate-spin"/> : <Search size={15}/>} Search India</button>
      </form>
      {rankingNote && <p className="mt-3 text-[9px] leading-4 text-slate-400">{rankingNote}</p>}
    </section>

    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2"><MapPinned size={14}/> VERIFIED HOSPITAL MAP LIBRARY</div>
          <h3 className="section-title">{VERIFIED_MAPS.length} official/public maps preloaded</h3>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-400">These are hospital/institute-published campus, building-layout or master-plan sources. Choose one to preview the original source. OPD Saathi does not redraw these and call them exact.</p>
        </div>
        <span className="real-source-badge"><ShieldCheck size={13}/> source-linked</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {VERIFIED_MAPS.map((profile) => <button key={profile.id} type="button" onClick={() => setLibraryProfile((current) => current?.id === profile.id ? null : profile)} className={`rounded-2xl border p-3 text-left transition ${libraryProfile?.id === profile.id ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30"}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-black leading-5 text-[#284866]">{profile.hospital}</span>
            {(() => { const badge = mapKindBadge(profile); return <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${badge.className}`}>{badge.label}</span>; })()}
          </div>
          <span className="mt-1 block text-[9px] leading-4 text-slate-400">{profile.mapPageLabel}</span>
        </button>)}
      </div>
      {libraryProfile && <div className="mt-5"><OfficialHospitalMap profile={libraryProfile}/></div>}
    </section>

    {(locationState === "denied" || locationState === "error") && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><div className="flex flex-wrap items-center gap-3"><TriangleAlert className="shrink-0" size={20}/><span className="min-w-0 flex-1">{locationMessage}</span><button type="button" onClick={enableBengaluruDemoLocation} className="rounded-xl bg-white px-3 py-2 text-[10px] font-black text-rose-700 shadow-sm">Use Bengaluru demo</button></div></div>}

    <div className="grid items-start gap-5 2xl:grid-cols-[1.45fr_.75fr]">
      <div className="space-y-5">
        <RealWorldMap location={location} hospitals={hospitals} selected={selected} route={route} careNeed={careNeed}/>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="real-metric-card"><span className="real-metric-icon bg-blue-50 text-blue-600"><Signal size={18}/></span><div><small>GPS STATUS</small><b>{locationState === "tracking" ? "Live" : "Not started"}</b>{location && <p>±{Math.round(location.accuracy)} m accuracy</p>}</div></div>
          <div className="real-metric-card"><span className="real-metric-icon bg-emerald-50 text-emerald-600"><Hospital size={18}/></span><div><small>NEAREST MAPPED</small><b>{hospitals[0] ? formatDistance(hospitals[0].distanceMeters) : "—"}</b><p>{hospitals[0]?.name || "Enable GPS"}</p></div></div>
          <div className="real-metric-card"><span className="real-metric-icon bg-violet-50 text-violet-600"><Car size={18}/></span><div><small>ROAD ETA</small><b>{route ? formatDuration(route.durationSeconds) : "—"}</b><p>{route ? formatDistance(route.distanceMeters) : "Select a hospital"}</p></div></div>
        </div>
      </div>

      <aside className="space-y-5">
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E8EFF6] px-5 py-4"><div><p className="text-[14px] font-black text-[#204366]">Best nearby hospitals</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{careNeed === "nearest" ? "Google/OSM real place data · sorted by distance" : `Ranked for ${careLabel} · evidence + distance`}</p></div><button type="button" disabled={!location || loadingHospitals} onClick={() => location && void fetchHospitals(location, true)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40" aria-label="Refresh nearby hospitals"><RefreshCw size={15} className={loadingHospitals ? "animate-spin" : ""}/></button></div>
          <div className="max-h-[510px] overflow-y-auto p-2">
            {loadingHospitals && hospitals.length === 0 && <div className="flex items-center justify-center gap-2 p-8 text-xs font-bold text-slate-400"><LoaderCircle size={17} className="animate-spin"/> Finding real hospitals…</div>}
            {!location && hospitals.length === 0 && <div className="p-7 text-center"><LocateFixed size={25} className="mx-auto text-blue-500"/><p className="mt-3 text-xs font-black text-[#2A4B6C]">Search works without GPS — no Google key required.</p><p className="mt-2 text-[10px] leading-5 text-slate-400">Search by hospital/city, use live GPS, or click Bengaluru demo location for a guaranteed hackathon flow.</p></div>}
            {hospitalError && <p className="p-4 text-xs font-semibold leading-5 text-rose-600">{hospitalError}</p>}
            {hospitals.map((hospital, index) => <button type="button" key={hospital.id} onClick={() => { setSelected(hospital); void fetchIndoor(hospital); }} className={`hospital-result group w-full rounded-2xl p-3 text-left ${selected?.id === hospital.id ? "hospital-result-active" : ""}`}>
              <div className="flex gap-3">
                <span className={`hospital-rank ${index === 0 ? "hospital-rank-first" : ""}`}>{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className="block text-[12px] font-black leading-5 text-[#284866]">{hospital.name}</span>{getVerifiedMapProfile(hospital) && <em className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black not-italic text-emerald-700">OFFICIAL MAP</em>}{careNeed !== "nearest" && <em className={`rounded-full px-2 py-1 text-[8px] font-black not-italic ${hospital.matchStatus === "verified" ? "bg-emerald-50 text-emerald-700" : hospital.matchStatus === "mapped" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{hospital.matchStatus === "verified" ? "VERIFIED MATCH" : hospital.matchStatus === "mapped" ? "MAPPED MATCH" : "UNVERIFIED"}</em>}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-400">{hospital.address}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold text-blue-600"><MapPin size={12}/>{formatDistance(location ? haversineMeters(location, hospital) : hospital.distanceMeters)} away {hospital.emergency === "yes" && <em className="not-italic text-rose-500">· Emergency</em>}</span>
                  {careNeed !== "nearest" && <span className="mt-2 block text-[9px] font-semibold leading-4 text-slate-500">{hospital.matchEvidence.slice(0,2).join(" · ")}</span>}
                </span><ArrowRight size={15} className="mt-1 shrink-0 text-slate-300 group-hover:text-blue-500"/>
              </div>
            </button>)}
          </div>
        </section>
      </aside>
    </div>

    {selected && <section className="surface-card overflow-hidden">
      <div className="grid gap-0 xl:grid-cols-[.9fr_1.1fr]">
        <div className="border-b border-[#E6EEF6] p-6 sm:p-7 xl:border-b-0 xl:border-r">
          <div className="flex items-start justify-between gap-4"><div><div className="eyebrow mb-2"><Navigation2 size={14}/> SELECTED HOSPITAL</div><h3 className="section-title">{selected.name}</h3><p className="mt-2 text-[11px] leading-5 text-slate-400">{selected.address}</p></div><span className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700">{formatDistance(selectedDistance)}</span></div>
          {arrived && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-800"><CheckCircle2 size={18}/> You’ve arrived at {selected.name}</div><p className="mt-1 text-[10px] leading-5 text-emerald-700">Outdoor navigation is complete. OPD Saathi is now checking this hospital’s real public indoor map data below.</p></div>}
          {careNeed !== "nearest" && <div className="mt-4 rounded-2xl border border-[#DFEAF4] bg-[#F8FBFE] p-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Why this hospital ranks for {careLabel}</p><div className="mt-2 flex flex-wrap gap-2">{selected.matchEvidence.map((item)=><span key={item} className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${selected.matchStatus === "verified" ? "bg-emerald-50 text-emerald-700" : selected.matchStatus === "mapped" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{item}</span>)}</div>{selected.capabilitySource && <a href={selected.capabilitySource} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-black text-blue-600">{selected.capabilitySourceLabel || "Capability source"} <ExternalLink size={11}/></a>}</div>}
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="route-fact"><small>ROAD ETA</small><b>{routeBusy ? "Updating…" : route ? formatDuration(route.durationSeconds) : "Unavailable"}</b></div><div className="route-fact"><small>ROAD DISTANCE</small><b>{route ? formatDistance(route.distanceMeters) : formatDistance(selectedDistance)}</b></div></div>
          {routeError && <p className="mt-3 text-xs font-semibold text-rose-600">{routeError}</p>}
          {route?.steps.length ? <div className="mt-5"><p className="text-[10px] font-black uppercase tracking-[.13em] text-slate-400">Route preview</p><div className="mt-3 space-y-2">{route.steps.slice(0,4).map((step, index)=><div key={`${step.instruction}-${index}`} className="flex gap-3 rounded-xl bg-[#F7FAFD] p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-black text-blue-700">{index+1}</span><div><p className="text-[11px] font-bold leading-5 text-slate-600">{step.instruction}</p><p className="text-[9px] font-semibold text-slate-400">{formatDistance(step.distanceMeters)}</p></div></div>)}</div></div> : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-2"><a href={externalDirections} target="_blank" rel="noreferrer" className="primary-btn justify-center"><Navigation2 size={16}/> Open turn-by-turn <ExternalLink size={13}/></a><a href={selected.googleMapsUri || selected.osmUrl} target="_blank" rel="noreferrer" className="secondary-btn justify-center"><MapPin size={16}/> {selected.dataProvider === "google" ? "Open in Google Maps" : "View source map"}</a></div>
          <p className="mt-4 text-[9px] leading-4 text-slate-400">The embedded route uses public road-network data. “Open turn-by-turn” hands off to Google Maps for active navigation. Do not use this screen for emergency dispatch.</p>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="eyebrow mb-2"><Building2 size={14}/> REAL BUILDING DATA</div><h3 className="section-title">Public indoor layout</h3><p className="mt-2 max-w-xl text-[11px] leading-5 text-slate-400">Only mapped geometry is rendered. If there is no public room-level data for this hospital, OPD Saathi says so instead of inventing a floor plan.</p></div><span className="real-source-badge"><ShieldCheck size={13}/> REAL-DATA MODE</span></div>
          <div className="mt-5">
            {verifiedMap ? <OfficialHospitalMap profile={verifiedMap}/> : <>
              {indoorBusy && <div className="flex min-h-[250px] items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-400"><LoaderCircle size={17} className="animate-spin"/> Checking public indoor map data…</div>}
              {indoorError && <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-xs font-semibold text-rose-700">{indoorError}</div>}
              {indoor && !indoorBusy && (indoor.hasIndoorPlan || indoor.hasBuildingFootprint) && <><IndoorLayout key={selected.id} data={indoor} hospitalName={selected.name}/><div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[9px] leading-4 text-amber-800"><TriangleAlert size={14} className="mt-0.5 shrink-0"/><span>{indoor.hasIndoorPlan ? "Room/indoor geometry exists in public OpenStreetMap data." : "Only a real building footprint is publicly mapped; room-level indoor navigation is not available."} {indoor.note}</span></div></>}
              {indoor && !indoorBusy && !indoor.hasIndoorPlan && !indoor.hasBuildingFootprint && <div className="rounded-[24px] border border-dashed border-[#C9D9E8] bg-[#F8FBFE] p-8 text-center"><Layers3 size={30} className="mx-auto text-slate-300"/><p className="mt-4 text-sm font-black text-[#31516F]">MAP NOT FOUND</p><p className="mx-auto mt-2 max-w-md text-[11px] leading-6 text-slate-400">We could not verify a public indoor or floor map for this hospital. OPD Saathi will not fabricate one. If the hospital later publishes a floor plan or provides CAD/SVG/GeoJSON, it can be added as a verified map.</p></div>}
            </>}
          </div>
        </div>
      </div>
    </section>}

    <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-[10px] leading-5 text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/><p><b>Real-data promise:</b> GPS comes from the user’s browser. When configured, hospital discovery and the embedded map use Google Places/Google Maps; otherwise the app falls back to OpenStreetMap. Indoor geometry is only rendered from verified/public data and is never invented for a real hospital. Users should verify critical details with the hospital.</p></div>
  </div>;
}
