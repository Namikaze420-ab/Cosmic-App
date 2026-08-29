import * as Astronomy from "npm:astronomy-engine@2.1.19";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const BODIES = [
  ["Sun", Astronomy.Body.Sun],
  ["Moon", Astronomy.Body.Moon],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
] as const;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed =
    origin === "http://127.0.0.1:4173" ||
    origin === "http://localhost:4173" ||
    origin.endsWith(".vercel.app");

  return {
    "Access-Control-Allow-Origin": allowed
      ? origin
      : "https://project-k90mw-git-staging-minato420ashish-1637s-projects.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeLongitude(value: number) {
  return ((value % 360) + 360) % 360;
}

function zodiac(longitude: number) {
  const normalized = normalizeLongitude(longitude);
  const index = Math.floor(normalized / 30) % 12;
  return {
    sign: SIGNS[index],
    longitude: Number(normalized.toFixed(6)),
    degree_in_sign: Number((normalized % 30).toFixed(6)),
  };
}

function planetPosition(body: Astronomy.Body, date: Date) {
  const vector = Astronomy.GeoVector(body, date, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  const placement = zodiac(ecliptic.elon);
  return {
    ...placement,
    latitude: Number(ecliptic.elat.toFixed(6)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const timestamp = typeof payload?.timestamp_utc === "string" ? payload.timestamp_utc : "";
    const date = new Date(timestamp);

    if (!timestamp || Number.isNaN(date.getTime())) {
      return json(req, { error: "timestamp_utc must be a valid ISO-8601 UTC timestamp." }, 400);
    }

    const planets = Object.fromEntries(
      BODIES.map(([name, body]) => [name, planetPosition(body, date)]),
    );

    return json(req, {
      algorithm: "astronomy-engine",
      algorithm_version: "2.1.19",
      calculation_version: "cosmic-alpha2-natal-v1",
      timestamp_utc: date.toISOString(),
      system: "western_tropical",
      reference_frame: "geocentric_true_ecliptic_of_date",
      houses: null,
      ascendant: null,
      planets,
      limitations: [
        "Planetary signs use tropical geocentric ecliptic positions.",
        "Houses and Ascendant are intentionally excluded until birth latitude/longitude are implemented and validated.",
        "Astrology is presented as a cultural/spiritual reflection framework, not a scientifically validated predictor.",
      ],
    });
  } catch (error) {
    console.error("astrology-calc failed", error instanceof Error ? error.message : error);
    return json(req, { error: "Astrology calculation failed." }, 500);
  }
});
