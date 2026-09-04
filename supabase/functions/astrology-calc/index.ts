import * as Astronomy from "npm:astronomy-engine@2.1.19";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const BODIES = [
  ["Sun", Astronomy.Body.Sun], ["Moon", Astronomy.Body.Moon],
  ["Mercury", Astronomy.Body.Mercury], ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars], ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn], ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune], ["Pluto", Astronomy.Body.Pluto],
] as const;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin === "http://127.0.0.1:4173" || origin === "http://localhost:4173" || origin.endsWith(".vercel.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function normalize(value: number) { return ((value % 360) + 360) % 360; }
function rad(value: number) { return value * Math.PI / 180; }
function deg(value: number) { return value * 180 / Math.PI; }

function zodiac(longitude: number) {
  const value = normalize(longitude);
  const index = Math.floor(value / 30) % 12;
  return { sign: SIGNS[index], longitude: Number(value.toFixed(6)), degree_in_sign: Number((value % 30).toFixed(6)) };
}

function planetPosition(body: Astronomy.Body, date: Date) {
  const vector = Astronomy.GeoVector(body, date, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  return { ...zodiac(ecliptic.elon), latitude: Number(ecliptic.elat.toFixed(6)) };
}

// IAU 2006 mean obliquity polynomial. T is Julian centuries from J2000.0.
function meanObliquityDegrees(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  const arcsec = 84381.406 - 46.836769*t - 0.0001831*t*t + 0.00200340*t*t*t - 0.000000576*t**4 - 0.0000000434*t**5;
  return arcsec / 3600;
}

function ascendantLongitude(date: Date, latitude: number, longitude: number) {
  // Astronomy Engine SiderealTime is Greenwich apparent sidereal time in hours.
  // Longitude is east-positive, therefore local apparent sidereal angle is GAST + longitude.
  const gastHours = Astronomy.SiderealTime(date);
  const localSiderealDegrees = normalize(gastHours * 15 + longitude);
  const theta = rad(localSiderealDegrees);
  const phi = rad(latitude);
  const epsilonDegrees = meanObliquityDegrees(date);
  const epsilon = rad(epsilonDegrees);

  // Eastern intersection of the ecliptic and local horizon. atan2 first gives the
  // opposite horizon intersection; +180° selects the eastern (ascending) point.
  const raw = deg(Math.atan2(
    -Math.cos(theta),
    Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon),
  ));
  const longitudeDegrees = normalize(raw + 180);
  return {
    longitude: longitudeDegrees,
    gast_hours: gastHours,
    local_sidereal_degrees: localSiderealDegrees,
    mean_obliquity_degrees: epsilonDegrees,
  };
}

function equalHouses(ascLongitude: number) {
  return Array.from({ length: 12 }, (_, i) => ({ house: i + 1, ...zodiac(ascLongitude + i * 30) }));
}

function houseFor(longitude: number, ascLongitude: number) {
  return Math.floor(normalize(longitude - ascLongitude) / 30) + 1;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    const timestamp = typeof payload?.timestamp_utc === "string" ? payload.timestamp_utc : "";
    const date = new Date(timestamp);
    if (!timestamp || Number.isNaN(date.getTime())) return json(req, { error: "timestamp_utc must be a valid ISO-8601 UTC timestamp." }, 400);

    const latPresent = payload?.latitude !== undefined && payload?.latitude !== null && payload?.latitude !== "";
    const lonPresent = payload?.longitude !== undefined && payload?.longitude !== null && payload?.longitude !== "";
    if (latPresent !== lonPresent) return json(req, { error: "latitude and longitude must be supplied together." }, 400);

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (latPresent && lonPresent) {
      latitude = Number(payload.latitude); longitude = Number(payload.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return json(req, { error: "latitude must be between -90 and 90." }, 400);
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return json(req, { error: "longitude must be between -180 and 180." }, 400);
    }

    const rawPlanets = Object.fromEntries(BODIES.map(([name, body]) => [name, planetPosition(body, date)]));
    let ascendant: any = null;
    let houses: any = null;
    let siderealTime: any = null;
    let planets: any = rawPlanets;

    if (latitude !== null && longitude !== null) {
      const asc = ascendantLongitude(date, latitude, longitude);
      ascendant = { ...zodiac(asc.longitude), method: "eastern_ecliptic_horizon_intersection" };
      houses = { system: "equal_house", version: "cosmic-equal-house-v1", cusps: equalHouses(asc.longitude) };
      siderealTime = {
        greenwich_apparent_hours: Number(asc.gast_hours.toFixed(9)),
        local_apparent_degrees: Number(asc.local_sidereal_degrees.toFixed(6)),
        mean_obliquity_degrees: Number(asc.mean_obliquity_degrees.toFixed(9)),
      };
      planets = Object.fromEntries(Object.entries(rawPlanets).map(([name, placement]: any) => [name, {
        ...placement,
        equal_house: houseFor(placement.longitude, asc.longitude),
      }]));
    }

    return json(req, {
      algorithm: "astronomy-engine+cosmic-equal-house",
      algorithm_version: "astronomy-engine-2.1.19",
      calculation_version: "cosmic-alpha2-natal-v2",
      timestamp_utc: date.toISOString(),
      system: "western_tropical",
      reference_frame: "geocentric_true_ecliptic_of_date",
      observer: latitude === null ? null : { latitude, longitude },
      sidereal_time: siderealTime,
      ascendant,
      houses,
      planets,
      limitations: [
        "Planetary signs use tropical geocentric ecliptic positions.",
        "When coordinates are supplied, houses use Equal House: House 1 begins at the tropical Ascendant and subsequent cusps are exactly 30 degrees apart.",
        "This build does not calculate Placidus, Whole Sign, Koch or other house systems.",
        "Near polar latitudes the Ascendant can change very rapidly; exact birth time and coordinates are especially important.",
        "Astrology is presented as a cultural/spiritual reflection framework, not a scientifically validated predictor.",
      ],
    });
  } catch (error) {
    console.error("astrology-calc failed", error instanceof Error ? error.message : error);
    return json(req, { error: "Astrology calculation failed." }, 500);
  }
});
