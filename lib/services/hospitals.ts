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

interface MapboxFeature {
  id: string;
  text?: string;
  place_name?: string;
  center: [number, number];
  properties?: {
    tel?: string;
    phone?: string;
    website?: string;
  };
}

export async function geocodeLocation(args: { token: string; query: string }) {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(args.query)}.json`,
  );
  url.searchParams.set("access_token", args.token);
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as { features?: MapboxFeature[] };
  const first = data.features?.[0];
  if (!first) {
    return null;
  }

  return {
    latitude: first.center[1],
    longitude: first.center[0],
    placeName: first.place_name ?? args.query,
  };
}

export async function searchNearbyHospitals(args: {
  token: string;
  latitude: number;
  longitude: number;
  limit?: number;
}) {
  const url = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/hospital.json",
  );
  url.searchParams.set("access_token", args.token);
  url.searchParams.set("proximity", `${args.longitude},${args.latitude}`);
  url.searchParams.set("types", "poi");
  url.searchParams.set("limit", String(args.limit ?? 8));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Mapbox hospital query failed: ${response.status}`);
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  const facilities = (data.features ?? []).map<HospitalResult>((feature) => {
    const [lng, lat] = feature.center;
    return {
      id: feature.id,
      name: feature.text ?? "Hospital",
      address: feature.place_name ?? "Address unavailable",
      latitude: lat,
      longitude: lng,
      distanceKm: Number(
        distanceKm(
          { lat: args.latitude, lng: args.longitude },
          { lat, lng },
        ).toFixed(1),
      ),
      phone: feature.properties?.tel ?? feature.properties?.phone ?? null,
      website: feature.properties?.website ?? null,
      openHours: null,
    };
  });

  return facilities;
}
