import { NextResponse } from "next/server";

type CareNeed = "nearest" | "emergency" | "ent" | "surgery" | "cardiac" | "pediatrics" | "maternity" | "orthopedics" | "trauma";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  types?: string[];
};

type Hospital = {
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

const CARE_TERMS: Record<CareNeed, string[]> = {
  nearest: [],
  emergency: ["emergency", "accident", "critical care"],
  ent: ["ent", "ear", "nose", "throat", "otolaryngology", "otorhinolaryngology"],
  surgery: ["surgery", "general surgery", "laparoscopic", "surgical"],
  cardiac: ["cardiology", "cardiac", "cardiothoracic"],
  pediatrics: ["pediatric", "paediatric", "child care", "children"],
  maternity: ["maternity", "obstetrics", "gynaecology", "gynecology", "women"],
  orthopedics: ["orthopedic", "orthopaedic", "bone", "joint"],
  trauma: ["trauma", "accident", "emergency", "orthopaedic"],
};

const CARE_QUERY: Record<CareNeed, string> = {
  nearest: "hospital",
  emergency: "emergency hospital",
  ent: "ENT hospital ear nose throat",
  surgery: "general surgery hospital",
  cardiac: "cardiac hospital cardiology",
  pediatrics: "children hospital pediatrics",
  maternity: "maternity hospital obstetrics gynecology",
  orthopedics: "orthopedic hospital bone joint",
  trauma: "trauma emergency hospital",
};

const MANIPAL_MALLESHWARAM = {
  match: (name: string, address: string) => {
    const haystack = `${name} ${address}`.toLowerCase();
    return haystack.includes("manipal") && (haystack.includes("malleshwaram") || haystack.includes("malleswaram") || haystack.includes("northside"));
  },
  specialties: [
    "Accident and Emergency Care", "Ear Nose Throat", "General Surgery", "Laparoscopic Surgery",
    "Cardiology", "Cardiothoracic Vascular Surgery", "Orthopaedics", "Paediatric And Child Care",
    "Obstetrics and Gynaecology", "Neurology", "Neurosurgery", "ICU and Critical Care",
  ],
  source: "https://www.manipalhospitals.com/malleshwaram/specialities/",
  sourceLabel: "Manipal Hospitals official specialties",
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = 6_371_000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function formatAddress(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [street, tags["addr:suburb"], tags["addr:city"] || tags["addr:town"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean);
  return parts.join(", ") || "Address not mapped publicly";
}

function parseSpecialties(tags: Record<string, string>) {
  const values = [tags["healthcare:speciality"], tags["healthcare:specialty"], tags.speciality, tags.specialty]
    .filter(Boolean)
    .flatMap((value) => value.split(/[;,]/g))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)];
}

function evidenceFor(need: CareNeed, hospital: Pick<Hospital, "emergency" | "specialties" | "name">) {
  if (need === "nearest") return { score: 0, status: "mapped" as const, evidence: ["Ranked by distance"] };
  const evidence: string[] = [];
  let score = 0;
  if ((need === "emergency" || need === "trauma") && hospital.emergency === "yes") {
    score += 95;
    evidence.push("Emergency department mapped");
  }
  const terms = CARE_TERMS[need];
  const searchable = `${hospital.name} ${hospital.specialties.join(" ")}`.toLowerCase();
  for (const term of terms) {
    if (searchable.includes(term)) {
      score += term.length > 8 ? 55 : 35;
      const specialty = hospital.specialties.find((item) => item.toLowerCase().includes(term));
      if (specialty && !evidence.includes(`${specialty} mapped`)) evidence.push(`${specialty} mapped`);
    }
  }
  return {
    score,
    status: score > 0 ? "mapped" as const : "unknown" as const,
    evidence: evidence.length ? evidence.slice(0, 3) : ["Specialty not verified in public map data"],
  };
}

function applyVerifiedProfile(base: Hospital, careNeed: CareNeed) {
  if (!MANIPAL_MALLESHWARAM.match(base.name, base.address)) return base;
  base.specialties = [...new Set([...base.specialties, ...MANIPAL_MALLESHWARAM.specialties])];
  base.emergency = "yes";
  base.capabilitySource = MANIPAL_MALLESHWARAM.source;
  base.capabilitySourceLabel = MANIPAL_MALLESHWARAM.sourceLabel;
  const match = evidenceFor(careNeed, base);
  base.matchScore = match.score;
  base.matchStatus = careNeed === "nearest" ? "mapped" : match.score > 0 ? "verified" : "unknown";
  base.matchEvidence = careNeed === "nearest"
    ? ["Ranked by distance"]
    : match.score > 0
      ? match.evidence.map((item) => item.replace(" mapped", " verified by hospital"))
      : match.evidence;
  return base;
}


function bengaluruDemoFallback(latitude: number, longitude: number, careNeed: CareNeed): Hospital[] {
  const raw = [
    { name: "K.C. General Hospital", lat: 12.996145, lon: 77.569369, address: "Malleshwaram, Bengaluru", emergency: "yes", specialties: ["Emergency", "General Medicine", "Surgery", "Orthopedics", "Pediatrics", "Obstetrics and Gynaecology"] },
    { name: "Bangalore Baptist Hospital", lat: 13.035246, lon: 77.589892, address: "Hebbal, Bengaluru", emergency: "yes", specialties: ["Emergency", "Cardiology", "Pediatrics", "Orthopedics", "Obstetrics and Gynaecology", "ENT"] },
    { name: "Ramaiah Memorial Hospital", lat: 13.028545, lon: 77.569479, address: "New BEL Road, Bengaluru", emergency: "yes", specialties: ["Emergency", "Cardiology", "Surgery", "Orthopedics", "Pediatrics", "ENT"] },
    { name: "KIMS Hospital & Research Centre", lat: 12.95630, lon: 77.57479, address: "K.R. Road, V.V. Puram, Bengaluru", emergency: "yes", specialties: ["Medicine", "Surgery", "Obstetrics and Gynaecology", "Pediatrics", "ENT", "Orthopedics"] },
  ];
  return raw.map((item, index) => {
    const base: Hospital = {
      id: `demo-bengaluru/${index + 1}`,
      name: item.name,
      latitude: item.lat,
      longitude: item.lon,
      distanceMeters: Math.round(haversineMeters(latitude, longitude, item.lat, item.lon)),
      address: item.address,
      emergency: item.emergency,
      osmUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=16/${item.lat}/${item.lon}`,
      dataProvider: "osm",
      specialties: item.specialties,
      matchScore: 0,
      matchStatus: "mapped",
      matchEvidence: ["Built-in Bengaluru demo fallback"],
    };
    const match = evidenceFor(careNeed, base);
    base.matchScore = match.score;
    base.matchStatus = match.score > 0 ? "mapped" : "unknown";
    base.matchEvidence = match.score > 0 ? match.evidence : ["Built-in Bengaluru demo fallback"];
    return applyVerifiedProfile(base, careNeed);
  }).sort((a, b) => {
    if (careNeed === "nearest") return a.distanceMeters - b.distanceMeters;
    const ar = a.matchScore - Math.min(65, a.distanceMeters / 400);
    const br = b.matchScore - Math.min(65, b.distanceMeters / 400);
    return br - ar || a.distanceMeters - b.distanceMeters;
  });
}

async function googlePlacesSearch(latitude: number | null, longitude: number | null, radiusMeters: number, careNeed: CareNeed, searchText = "") {
  const rawApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
  const apiKey = rawApiKey && !rawApiKey.includes("YOUR_") ? rawApiKey : "";
  if (!apiKey) return null;

  const hasSearchText = Boolean(searchText.trim());
  const endpoint = careNeed === "nearest" && !hasSearchText
    ? "https://places.googleapis.com/v1/places:searchNearby"
    : "https://places.googleapis.com/v1/places:searchText";

  const hasOrigin = latitude !== null && longitude !== null;
  if (!hasSearchText && !hasOrigin) throw new Error("Live location is required for nearby hospital search");

  const requestBody = careNeed === "nearest" && !hasSearchText
    ? {
        includedTypes: ["hospital"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        regionCode: "IN",
        languageCode: "en",
        locationRestriction: {
          circle: { center: { latitude, longitude }, radius: Math.min(50_000, radiusMeters) },
        },
      }
    : {
        textQuery: hasSearchText ? `${searchText.trim()} hospital India` : CARE_QUERY[careNeed],
        includedType: "hospital",
        strictTypeFiltering: true,
        pageSize: 20,
        rankPreference: hasSearchText ? "RELEVANCE" : "DISTANCE",
        regionCode: "IN",
        languageCode: "en",
        ...(!hasSearchText && hasOrigin ? {
          locationBias: {
            circle: { center: { latitude, longitude }, radius: Math.min(50_000, radiusMeters) },
          },
        } : {}),
      };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.types",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
    const data = await response.json() as { places?: GooglePlace[] };
    const hospitals: Hospital[] = [];
    for (const place of data.places ?? []) {
      const id = place.id?.trim();
      const name = place.displayName?.text?.trim();
      const lat = Number(place.location?.latitude);
      const lon = Number(place.location?.longitude);
      if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const address = place.formattedAddress || "Address available in Google Maps";
      const base: Hospital = {
        id: `google/${id}`,
        name,
        latitude: lat,
        longitude: lon,
        distanceMeters: hasOrigin ? Math.round(haversineMeters(latitude as number, longitude as number, lat, lon)) : -1,
        address,
        osmUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}&query=${encodeURIComponent(name)}`,
        googleMapsUri: place.googleMapsUri,
        googlePlaceId: id,
        dataProvider: "google",
        specialties: [],
        matchScore: careNeed === "nearest" ? 0 : 60,
        matchStatus: "mapped",
        matchEvidence: hasSearchText
          ? [`Google Places search match for ${searchText.trim()}`]
          : careNeed === "nearest"
            ? ["Google Places · ranked by distance"]
            : [`Google Places match for ${CARE_QUERY[careNeed]}`],
      };
      hospitals.push(applyVerifiedProfile(base, careNeed));
    }
    if (hasOrigin) hospitals.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return hospitals.slice(0, 12);
  } finally {
    clearTimeout(timer);
  }
}

async function overpassFetch(query: string) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: query }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
      return await response.json() as { elements?: OverpassElement[] };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OpenStreetMap data service unavailable");
}

async function openStreetMapSearch(latitude: number, longitude: number, radiusMeters: number, careNeed: CareNeed) {
  const query = `[out:json][timeout:14];\n(\n  nwr(around:${Math.round(radiusMeters)},${latitude},${longitude})["amenity"="hospital"];\n  nwr(around:${Math.round(radiusMeters)},${latitude},${longitude})["healthcare"="hospital"];\n);\nout center tags;`;
  const data = await overpassFetch(query);
  const seen = new Set<string>();
  const hospitals: Hospital[] = [];

  for (const element of data.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name || tags["name:en"] || tags.official_name;
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${name.toLowerCase()}|${Number(lat).toFixed(4)}|${Number(lon).toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const address = formatAddress(tags);
    const specialties = parseSpecialties(tags);
    const base: Hospital = {
      id: `${element.type}/${element.id}`,
      name,
      latitude: Number(lat),
      longitude: Number(lon),
      distanceMeters: Math.round(haversineMeters(latitude, longitude, Number(lat), Number(lon))),
      address,
      operator: tags.operator,
      emergency: tags.emergency,
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      dataProvider: "osm",
      specialties,
      matchScore: 0,
      matchStatus: "unknown",
      matchEvidence: [],
    };

    const match = evidenceFor(careNeed, base);
    base.matchScore = match.score;
    base.matchStatus = match.status;
    base.matchEvidence = match.evidence;
    hospitals.push(applyVerifiedProfile(base, careNeed));
  }

  hospitals.sort((a, b) => {
    if (careNeed === "nearest") return a.distanceMeters - b.distanceMeters;
    const aDistancePenalty = Math.min(65, a.distanceMeters / 400);
    const bDistancePenalty = Math.min(65, b.distanceMeters / 400);
    const aRank = a.matchScore - aDistancePenalty;
    const bRank = b.matchScore - bDistancePenalty;
    if (bRank !== aRank) return bRank - aRank;
    return a.distanceMeters - b.distanceMeters;
  });
  return hospitals.slice(0, 12);
}


async function nominatimHospitalSearch(searchText: string, careNeed: CareNeed, latitude: number | null, longitude: number | null) {
  const query = `${searchText.trim()} hospital India`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "12");
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "OPD-Saathi-Hackathon/1.0 (educational demo)" },
    });
    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
    const data = await response.json() as Array<{ place_id?: number; lat?: string; lon?: string; display_name?: string; name?: string; type?: string; category?: string; osm_type?: string; osm_id?: number }>;
    const results: Hospital[] = [];
    for (const item of data) {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const display = item.display_name?.trim() || item.name?.trim();
      if (!display) continue;
      const name = item.name?.trim() || display.split(",")[0].trim();
      const base: Hospital = {
        id: `nominatim/${item.place_id ?? `${lat}-${lon}`}`,
        name,
        latitude: lat,
        longitude: lon,
        distanceMeters: latitude !== null && longitude !== null ? Math.round(haversineMeters(latitude, longitude, lat, lon)) : -1,
        address: display,
        osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
        dataProvider: "osm",
        specialties: [],
        matchScore: careNeed === "nearest" ? 0 : 10,
        matchStatus: "unknown",
        matchEvidence: ["OpenStreetMap/Nominatim text-search result"],
      };
      results.push(applyVerifiedProfile(base, careNeed));
    }
    if (latitude !== null && longitude !== null) results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results.slice(0, 12);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: { latitude?: number; longitude?: number; radiusMeters?: number; careNeed?: CareNeed; searchText?: string; demoMode?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawLatitude = Number(body.latitude);
  const rawLongitude = Number(body.longitude);
  const radiusMeters = Math.min(25_000, Math.max(2_000, Number(body.radiusMeters) || 15_000));
  const careNeed: CareNeed = body.careNeed && body.careNeed in CARE_TERMS ? body.careNeed : "nearest";
  const searchText = String(body.searchText || "").trim().slice(0, 120);
  const hasValidCoordinates = Number.isFinite(rawLatitude) && Number.isFinite(rawLongitude) && Math.abs(rawLatitude) <= 90 && Math.abs(rawLongitude) <= 180;
  if (!hasValidCoordinates && !searchText) {
    return NextResponse.json({ error: "Live location is required for nearby hospital search." }, { status: 400 });
  }
  const latitude = hasValidCoordinates ? rawLatitude : null;
  const longitude = hasValidCoordinates ? rawLongitude : null;

  if (body.demoMode && latitude !== null && longitude !== null) {
    const hospitals = bengaluruDemoFallback(latitude, longitude, careNeed);
    return NextResponse.json({
      hospitals,
      source: "Built-in Bengaluru demo dataset",
      provider: "osm",
      careNeed,
      rankingNote: "Instant zero-key demo results. Use live GPS for real public hospital discovery.",
      fallback: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const configuredGoogleKey = Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim() && !process.env.GOOGLE_MAPS_API_KEY?.includes("YOUR_"));
    if (configuredGoogleKey) {
      try {
        const googleHospitals = await googlePlacesSearch(latitude, longitude, radiusMeters, careNeed, searchText);
        if (googleHospitals?.length) {
          return NextResponse.json({
            hospitals: googleHospitals,
            source: "Google Places API (New)",
            provider: "google",
            careNeed,
            rankingNote: searchText
              ? `Google Places search across India for “${searchText}”. Results are bounded by the Places API, not a complete national database dump.`
              : careNeed === "nearest"
                ? "Google Places hospitals ranked by distance from your live location."
                : `Google Places search for ${CARE_QUERY[careNeed]}, ranked by distance. Specialty relevance is a search signal, not a medical guarantee.`,
          }, { headers: { "Cache-Control": "no-store" } });
        }
      } catch (googleError) {
        console.error("Google Places lookup failed; falling back to OpenStreetMap", googleError instanceof Error ? googleError.message : googleError);
      }
    }

    if (searchText) {
      try {
        const textHospitals = await nominatimHospitalSearch(searchText, careNeed, latitude, longitude);
        if (textHospitals.length) {
          return NextResponse.json({
            hospitals: textHospitals,
            source: "OpenStreetMap Nominatim text search",
            provider: "osm",
            careNeed,
            rankingNote: `Zero-key OpenStreetMap search for “${searchText}”. Enable live location for distance and route estimates.`,
          }, { headers: { "Cache-Control": "no-store" } });
        }
      } catch (searchError) {
        console.error("Nominatim lookup failed", searchError instanceof Error ? searchError.message : searchError);
      }
    }

    if (latitude === null || longitude === null) {
      return NextResponse.json({ hospitals: [], source: "OpenStreetMap", provider: "osm", careNeed, rankingNote: "No key is required. Try a more specific hospital/city search or use the Bengaluru demo location." }, { headers: { "Cache-Control": "no-store" } });
    }
    const hospitals = await openStreetMapSearch(latitude, longitude, radiusMeters, careNeed);
    return NextResponse.json({
      hospitals,
      source: "OpenStreetMap + verified hospital profiles where available",
      provider: "osm",
      careNeed,
      rankingNote: careNeed === "nearest"
        ? "Ranked by straight-line distance. Add GOOGLE_MAPS_API_KEY to use Google Places hospital discovery."
        : "Ranked using verified/mapped capability evidence plus distance. Missing public specialty data is treated as unknown, not as absence of care.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Nearby hospital lookup failed", error instanceof Error ? error.message : error);
    if (latitude !== null && longitude !== null && haversineMeters(latitude, longitude, 12.9716, 77.5946) < 100_000) {
      const hospitals = bengaluruDemoFallback(latitude, longitude, careNeed);
      return NextResponse.json({
        hospitals,
        source: "Built-in Bengaluru demo fallback",
        provider: "osm",
        careNeed,
        rankingNote: "Public map service was unavailable, so OPD Saathi switched to its built-in Bengaluru hackathon fallback. Open external maps to verify live details.",
        fallback: true,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      hospitals: [],
      source: "Fallback mode",
      provider: "osm",
      careNeed,
      rankingNote: "Hospital data service is temporarily unavailable. Use the verified hospital library or external navigation links.",
      fallback: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
