"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HospitalMap } from "@/components/hospital-map";
import type { HospitalResult } from "@/lib/types";

const mapToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export function HospitalsPanel() {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [autoLocateAttempted, setAutoLocateAttempted] = useState(false);

  const hasHospitals = hospitals.length > 0;

  const searchByQuery = useCallback(async (nextQuery: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/hospitals?q=${encodeURIComponent(nextQuery.trim())}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to fetch hospitals.");
        setHospitals([]);
        setCenter(null);
        setLoading(false);
        return;
      }

      setHospitals(data.hospitals ?? []);
      setCenter(data.center ?? null);
    } catch (requestError) {
      setError("Unable to fetch hospitals right now.");
      console.error("[MaxWell][Hospitals] Query search failed", {
        query: nextQuery,
        error: requestError,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByCoordinates = useCallback(
    async (latitude: number, longitude: number) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/hospitals?lat=${latitude}&lng=${longitude}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "Unable to fetch hospitals.");
          setLoading(false);
          return;
        }

        setHospitals(data.hospitals ?? []);
        setCenter(data.center ?? null);
      } catch (requestError) {
        setError("Unable to fetch hospitals right now.");
        console.error("[MaxWell][Hospitals] Coordinate search failed", {
          latitude,
          longitude,
          error: requestError,
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this browser.");
      return;
    }

    setGeoStatus("Detecting current location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setGeoStatus(`Using detected location (${lat}, ${lng})`);
        await fetchByCoordinates(Number(lat), Number(lng));
      },
      (geoError) => {
        console.error("[MaxWell][Hospitals] Geolocation failed", geoError);
        setGeoStatus("Geolocation failed. Falling back to manual search.");
        setError("Unable to retrieve current location.");
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 },
    );
  }, [fetchByCoordinates]);

  useEffect(() => {
    if (autoLocateAttempted) {
      return;
    }

    setAutoLocateAttempted(true);
    if (!navigator.geolocation) {
      setGeoStatus("Auto geolocation is unavailable in this browser.");
      void searchByQuery("district hospital");
      return;
    }

    setGeoStatus("Attempting automatic location detection...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetchByCoordinates(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        );
        setGeoStatus("Using your detected location for hospital search.");
      },
      () => {
        setGeoStatus("Auto geolocation unavailable. Using default search.");
        void searchByQuery("district hospital");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 180000 },
    );
  }, [autoLocateAttempted, fetchByCoordinates, searchByQuery]);

  const centerLabel = useMemo(() => {
    if (!center) {
      return "Not set";
    }
    return `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`;
  }, [center]);

  return (
    <section className="space-y-4">
      <header className="card-glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold">Nearby Hospitals & Clinics</h1>
        <p className="mt-2 text-sm text-cyan-50/75">
          Search by town/village or use your current location. MaxWell shows
          nearest facilities with distance and direction links.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter location"
            className="min-w-[240px] flex-1 rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => searchByQuery(query || "district hospital")}
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Search
          </button>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-full border border-cyan-200/45 px-4 py-2 text-sm"
          >
            Use my location
          </button>
        </div>
        {geoStatus && (
          <p className="mt-2 text-xs text-cyan-100/80">{geoStatus}</p>
        )}
      </header>

      {loading && (
        <p className="text-sm text-cyan-50/70">Loading hospitals...</p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200/35 bg-red-950/35 p-3 text-sm text-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-glass rounded-3xl p-3">
          {mapToken ? (
            <HospitalMap
              token={mapToken}
              center={center}
              hospitals={hospitals}
            />
          ) : (
            <div className="flex h-[440px] items-center justify-center rounded-2xl border border-dashed border-white/25 text-sm text-cyan-50/70">
              Map unavailable. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.
            </div>
          )}
        </div>

        <div className="card-glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Facility list</h2>
            <p className="text-xs text-cyan-50/60">Center: {centerLabel}</p>
          </div>

          {!hasHospitals && !loading && (
            <p className="text-sm text-cyan-50/70">No facilities found.</p>
          )}

          <div className="space-y-3 overflow-y-auto pr-1">
            {hospitals.map((hospital) => (
              <article
                key={hospital.id}
                className="rounded-2xl border border-white/15 bg-slate-950/40 p-3"
              >
                <h3 className="text-sm font-semibold">{hospital.name}</h3>
                <p className="mt-1 text-xs text-cyan-50/70">
                  {hospital.address}
                </p>
                <p className="mt-2 text-xs text-cyan-100/80">
                  Distance: {hospital.distanceKm ?? "n/a"} km
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {hospital.phone ? (
                    <a
                      href={`tel:${hospital.phone}`}
                      className="rounded-full border border-cyan-200/35 px-3 py-1"
                    >
                      Call
                    </a>
                  ) : (
                    <a
                      href="tel:108"
                      className="rounded-full border border-orange-200/35 px-3 py-1"
                    >
                      Call health support
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-200/35 px-3 py-1"
                  >
                    Get directions
                  </a>
                  {hospital.website && (
                    <a
                      href={hospital.website}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-blue-200/35 px-3 py-1"
                    >
                      Website
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
