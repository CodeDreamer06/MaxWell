import type { HospitalResult } from "@/lib/types";

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const one =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const two = 2 * Math.atan2(Math.sqrt(one), Math.sqrt(1 - one));
  return earth * two;
}

interface NominatimSearchResult {
  place_id: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
}

interface NominatimReverseResult {
  display_name?: string;
  name?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

const OSM_HEADERS = {
  "User-Agent": "MaxWell/0.1 (healthcare-assistant)",
  Accept: "application/json",
};

function sanitize(value: string) {
  return value.replaceAll('"', "");
}

function extractCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.center) {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return null;
}

function formatAddress(tags: Record<string, string> | undefined) {
  if (!tags) {
    return "Address unavailable";
  }

  const parts = [
    tags["addr:full"],
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
    tags["addr:country"],
  ]
    .map((entry) => entry?.trim())
    .filter(Boolean) as string[];

  if (parts.length) {
    return parts.join(", ");
  }

  return tags["name:en"] ?? tags.name ?? "Address unavailable";
}

export async function geocodeLocation(args: { query: string }) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", args.query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url, {
    cache: "no-store",
    headers: OSM_HEADERS,
  });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as NominatimSearchResult[];
  const first = data[0];
  if (!first) {
    return null;
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    placeName: first.display_name ?? first.name ?? args.query,
  };
}

export async function reverseGeocodeCoordinates(args: {
  latitude: number;
  longitude: number;
}) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(args.latitude));
  url.searchParams.set("lon", String(args.longitude));
  url.searchParams.set("zoom", "15");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url, {
    cache: "no-store",
    headers: OSM_HEADERS,
  });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as NominatimReverseResult;
  const first = data.display_name ?? data.name;
  if (!first) {
    return null;
  }

  return first;
}

export async function searchNearbyHospitals(args: {
  latitude: number;
  longitude: number;
  limit?: number;
}) {
  const radiusMeters = 25000;
  const query = `
[out:json][timeout:20];
(
  node["amenity"~"hospital|clinic"](around:${radiusMeters},${args.latitude},${args.longitude});
  way["amenity"~"hospital|clinic"](around:${radiusMeters},${args.latitude},${args.longitude});
  relation["amenity"~"hospital|clinic"](around:${radiusMeters},${args.latitude},${args.longitude});
  node["healthcare"="hospital"](around:${radiusMeters},${args.latitude},${args.longitude});
  way["healthcare"="hospital"](around:${radiusMeters},${args.latitude},${args.longitude});
  relation["healthcare"="hospital"](around:${radiusMeters},${args.latitude},${args.longitude});
);
out center tags qt;
`.trim();

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    cache: "no-store",
    headers: {
      ...OSM_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) {
    throw new Error(`Overpass hospital query failed: ${response.status}`);
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };
  const byIdentity = new Map<string, HospitalResult>();

  for (const element of data.elements ?? []) {
    const coordinates = extractCoordinates(element);
    if (!coordinates) {
      continue;
    }
    const tags = element.tags ?? {};
    const name =
      tags["name:en"] ?? tags.name ?? tags.operator ?? tags.brand ?? "Hospital";
    const identity = `${sanitize(name)}:${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`;
    if (byIdentity.has(identity)) {
      continue;
    }

    byIdentity.set(identity, {
      id: `${element.type}/${element.id}`,
      name,
      address: formatAddress(tags),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distanceKm: Number(
        distanceKm(
          { lat: args.latitude, lng: args.longitude },
          { lat: coordinates.latitude, lng: coordinates.longitude },
        ).toFixed(1),
      ),
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      openHours:
        tags.opening_hours ??
        tags.service_times ??
        tags["opening_hours:covid19"] ??
        null,
    });
  }

  const limit = args.limit ?? 8;
  return [...byIdentity.values()]
    .sort(
      (a, b) =>
        (a.distanceKm ?? Number.POSITIVE_INFINITY) -
        (b.distanceKm ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, limit);
}
