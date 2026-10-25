import { NextResponse } from "next/server";

type Point = { lat: number; lon: number };
type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: Point;
  geometry?: Point[];
  tags?: Record<string, string>;
};

type PublicKind =
  | "room" | "corridor" | "lift" | "stairs" | "facility" | "building" | "indoor"
  | "hydrant" | "fire_hose" | "extinguisher" | "fire_alarm" | "aed" | "first_aid"
  | "emergency_exit" | "assembly" | "pharmacy";

type PublicFeature = {
  id: string;
  kind: PublicKind;
  level: string;
  name: string;
  geometry: Point[];
};

async function queryOverpass(query: string) {
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
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
  throw lastError instanceof Error ? lastError : new Error("Indoor map service unavailable");
}

function kindFor(tags: Record<string, string>): PublicKind {
  if (tags.emergency === "fire_hydrant") return "hydrant";
  if (tags.emergency === "fire_hose") return "fire_hose";
  if (tags.emergency === "fire_extinguisher") return "extinguisher";
  if (tags.emergency === "fire_alarm_box") return "fire_alarm";
  if (tags.emergency === "defibrillator") return "aed";
  if (tags.emergency === "first_aid" || tags.emergency === "first_aid_kit") return "first_aid";
  if (tags.emergency === "assembly_point") return "assembly";
  if (tags.exit === "emergency") return "emergency_exit";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.room || tags.indoor === "room") return "room";
  if (tags.indoor === "corridor" || tags.highway === "corridor") return "corridor";
  if (tags.highway === "elevator" || tags.elevator === "yes") return "lift";
  if (tags.highway === "steps") return "stairs";
  if (tags.amenity === "toilets" || tags.amenity === "reception_desk") return "facility";
  if (tags.building) return "building";
  return "indoor";
}

function featureName(tags: Record<string, string>, kind: PublicKind) {
  const fallback: Record<PublicKind, string> = {
    room: "Room", corridor: "Corridor", lift: "Lift", stairs: "Stairs", facility: "Facility", building: "Hospital building", indoor: "Indoor feature",
    hydrant: "Fire hydrant", fire_hose: "Fire hose", extinguisher: "Fire extinguisher", fire_alarm: "Fire alarm", aed: "AED", first_aid: "First aid",
    emergency_exit: "Emergency exit", assembly: "Assembly point", pharmacy: "Pharmacy",
  };
  return tags.name || tags.ref || tags.room || tags.amenity || tags.indoor || tags.building || fallback[kind];
}

export async function POST(request: Request) {
  let body: { latitude?: number; longitude?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const query = `[out:json][timeout:14];\n(\n way(around:220,${latitude},${longitude})["building"="hospital"];\n way(around:220,${latitude},${longitude})["building"="yes"]["healthcare"="hospital"];\n way(around:220,${latitude},${longitude})["indoor"];\n way(around:220,${latitude},${longitude})["room"];\n way(around:220,${latitude},${longitude})["highway"="corridor"];\n way(around:220,${latitude},${longitude})["highway"="steps"];\n way(around:220,${latitude},${longitude})["highway"="elevator"];\n nwr(around:220,${latitude},${longitude})["amenity"="toilets"];\n nwr(around:220,${latitude},${longitude})["amenity"="reception_desk"];\n nwr(around:220,${latitude},${longitude})["amenity"="pharmacy"];\n node(around:220,${latitude},${longitude})["emergency"="fire_hydrant"];\n node(around:220,${latitude},${longitude})["emergency"="fire_hose"];\n node(around:220,${latitude},${longitude})["emergency"="fire_extinguisher"];\n node(around:220,${latitude},${longitude})["emergency"="fire_alarm_box"];\n node(around:220,${latitude},${longitude})["emergency"="defibrillator"];\n node(around:220,${latitude},${longitude})["emergency"="first_aid"];\n node(around:220,${latitude},${longitude})["emergency"="first_aid_kit"];\n node(around:220,${latitude},${longitude})["emergency"="assembly_point"];\n node(around:220,${latitude},${longitude})["exit"="emergency"];\n);\nout geom tags;`;

  try {
    const data = await queryOverpass(query);
    const features: PublicFeature[] = [];
    for (const element of data.elements ?? []) {
      const geometry = element.geometry?.length
        ? element.geometry
        : Number.isFinite(element.lat) && Number.isFinite(element.lon)
          ? [{ lat: Number(element.lat), lon: Number(element.lon) }]
          : element.center ? [element.center] : [];
      if (!geometry.length) continue;
      const tags = element.tags ?? {};
      const kind = kindFor(tags);
      features.push({
        id: `${element.type}/${element.id}`,
        kind,
        level: tags.level || (tags.building ? "site" : "0"),
        name: featureName(tags, kind),
        geometry,
      });
    }
    const planKinds = new Set<PublicKind>(["room", "corridor", "lift", "stairs", "facility", "indoor"]);
    const indoorFeatures = features.filter((feature) => planKinds.has(feature.kind));
    const levels = [...new Set(features.filter((feature) => feature.kind !== "building").map((feature) => feature.level))].sort((a, b) => Number(a) - Number(b));
    const safetyCount = features.filter((feature) => ["hydrant", "fire_hose", "extinguisher", "fire_alarm", "aed", "first_aid", "emergency_exit", "assembly"].includes(feature.kind)).length;
    return NextResponse.json({
      features,
      levels,
      hasIndoorPlan: indoorFeatures.length >= 2,
      hasBuildingFootprint: features.some((feature) => feature.kind === "building"),
      safetyCount,
      source: "OpenStreetMap public mapping",
      note: safetyCount
        ? `${safetyCount} publicly mapped safety/emergency feature${safetyCount === 1 ? "" : "s"} found. Public community mapping is not guaranteed to be hospital-authoritative.`
        : "No public safety-equipment points were found nearby. Public community-mapped geometry is not guaranteed to be hospital-authoritative.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Indoor layout lookup failed", error instanceof Error ? error.message : error);
    return NextResponse.json({
      features: [],
      levels: [],
      hasIndoorPlan: false,
      hasBuildingFootprint: false,
      safetyCount: 0,
      source: "Public indoor map unavailable",
      note: "The public indoor-data service could not be reached. OPD Saathi will show Map Not Found rather than inventing a layout.",
      fallback: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
