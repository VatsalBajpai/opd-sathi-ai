import { NextResponse } from "next/server";


type Coordinate = { latitude: number; longitude: number };
type OsrmStep = { distance?: number; duration?: number; name?: string; maneuver?: { type?: string; modifier?: string } };
type OsrmRoute = {
  distance?: number;
  duration?: number;
  geometry?: { coordinates?: [number, number][] };
  legs?: { steps?: OsrmStep[] }[];
};

type OsrmPayload = { code?: string; routes?: OsrmRoute[] };

function validCoordinate(point?: Coordinate) {
  return point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}


function straightLineMeters(a: Coordinate, b: Coordinate) {
  const r = 6_371_000;
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function stepText(step: OsrmStep) {
  const type = (step.maneuver?.type || "continue").replaceAll("_", " ");
  const modifier = step.maneuver?.modifier ? `${step.maneuver.modifier} ` : "";
  const road = step.name ? ` onto ${step.name}` : "";
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} ${modifier}${road}`.replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  let body: { origin?: Coordinate; destination?: Coordinate; demoMode?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!validCoordinate(body.origin) || !validCoordinate(body.destination)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const origin = body.origin as Coordinate;
  const destination = body.destination as Coordinate;
  if (body.demoMode) {
    const direct = Math.max(1, Math.round(straightLineMeters(origin, destination)));
    const roadEstimate = Math.round(direct * 1.28);
    const duration = Math.max(120, Math.round((roadEstimate / 24_000) * 3600));
    return NextResponse.json({
      distanceMeters: roadEstimate,
      durationSeconds: duration,
      coordinates: [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]],
      steps: [
        { instruction: "Demo route preview — open turn-by-turn navigation for live road directions.", distanceMeters: roadEstimate, durationSeconds: duration },
      ],
      provider: "Instant Bengaluru demo estimate",
      fallback: true,
    }, { headers: { "Cache-Control": "no-store" } });
  }
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14_000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal, headers: { "User-Agent": "OPD-Saathi-Hackathon/1.0" } });
    if (!response.ok) throw new Error(`OSRM returned ${response.status}`);
    const data = await response.json() as OsrmPayload;
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route?.geometry?.coordinates?.length) {
      return NextResponse.json({ error: "No road route found." }, { status: 404 });
    }
    const coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
    const steps = (route.legs?.[0]?.steps ?? []).filter((step) => (step.distance ?? 0) > 10).slice(0, 8).map((step) => ({
      instruction: stepText(step),
      distanceMeters: Math.round(step.distance ?? 0),
      durationSeconds: Math.round(step.duration ?? 0),
    }));
    return NextResponse.json({
      distanceMeters: Math.round(route.distance ?? 0),
      durationSeconds: Math.round(route.duration ?? 0),
      coordinates,
      steps,
      provider: "OSRM/OpenStreetMap road network",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Road routing failed", error instanceof Error ? error.message : error);
    const direct = Math.max(1, Math.round(straightLineMeters(origin, destination)));
    return NextResponse.json({
      distanceMeters: direct,
      durationSeconds: Math.max(60, Math.round((direct / 25_000) * 3600)),
      coordinates: [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]],
      steps: [{ instruction: "Road service unavailable — open turn-by-turn navigation for the live route.", distanceMeters: direct, durationSeconds: Math.max(60, Math.round((direct / 25_000) * 3600)) }],
      provider: "Demo fallback estimate (straight-line)",
      fallback: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timer);
  }
}
