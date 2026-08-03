import { NextRequest, NextResponse } from "next/server";

type NominatimHit = { lat: string; lon: string; display_name: string };

async function nominatimSearch(q: string): Promise<NominatimHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  // Bias toward Tirupati / Tiruchanoor area
  url.searchParams.set("viewbox", "79.35,13.55,79.55,13.70");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "ChandhuSeaFoodDemo/1.0 (local demo; contact help@chandhuseafood.in)",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimHit[];
  return data?.[0] ?? null;
}

/** Rough pin near hub when OSM has no exact house match (common for colonies). */
function tiruchanoorFallback(q: string): {
  lat: number;
  lng: number;
  label: string;
} | null {
  const lower = q.toLowerCase();
  const local =
    lower.includes("tiruchanoor") ||
    lower.includes("tiruchanur") ||
    lower.includes("517503") ||
    lower.includes("ushodaya") ||
    lower.includes("navajeevan") ||
    lower.includes("dcc");
  if (!local && !lower.includes("tirupati")) return null;

  // Slight offset from shop hub so distance is non-zero but nearby
  let lat = 13.6125;
  let lng = 79.4512;
  if (lower.includes("ushodaya")) {
    lat = 13.6138;
    lng = 79.4525;
  } else if (lower.includes("navajeevan")) {
    lat = 13.611;
    lng = 79.4495;
  } else if (lower.includes("tirupati") && !lower.includes("tiruchan")) {
    lat = 13.6288;
    lng = 79.4192;
  }

  return {
    lat,
    lng,
    label: `Approx. location for “${q.slice(0, 80)}” (Tiruchanoor area — fine-tune on map)`,
  };
}

/** Proxy Nominatim so the browser can geocode delivery addresses. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 5) {
    return NextResponse.json(
      { error: "Enter a fuller address (area, city, pincode)." },
      { status: 400 }
    );
  }

  const queries = [
    q,
    `${q}, Tiruchanoor, Tirupati, Andhra Pradesh`,
    q.replace(/,/g, " ") + " Tirupati",
  ];

  try {
    for (const query of queries) {
      const hit = await nominatimSearch(query);
      if (hit) {
        return NextResponse.json({
          lat: Number(hit.lat),
          lng: Number(hit.lon),
          label: hit.display_name,
        });
      }
    }

    const fallback = tiruchanoorFallback(q);
    if (fallback) {
      return NextResponse.json(fallback);
    }

    return NextResponse.json(
      {
        error:
          "Address not found. Try adding Tiruchanoor / Tirupati, or tap the map.",
      },
      { status: 404 }
    );
  } catch {
    const fallback = tiruchanoorFallback(q);
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: "Could not look up address. Tap the map to set your pin." },
      { status: 500 }
    );
  }
}
