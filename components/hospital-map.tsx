"use client";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import type { HospitalResult } from "@/lib/types";

interface HospitalMapProps {
  token: string;
  center: { latitude: number; longitude: number } | null;
  hospitals: HospitalResult[];
}

export function HospitalMap({ token, center, hospitals }: HospitalMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token || !mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const focus = center
      ? [center.longitude, center.latitude]
      : hospitals.length
        ? [hospitals[0].longitude, hospitals[0].latitude]
        : [78.9629, 20.5937];

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: focus as [number, number],
      zoom: center ? 10 : 4,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    if (center) {
      new mapboxgl.Marker({ color: "#2dd4bf" })
        .setLngLat([center.longitude, center.latitude])
        .setPopup(new mapboxgl.Popup().setText("Your selected location"))
        .addTo(map);
    }

    for (const hospital of hospitals) {
      new mapboxgl.Marker({ color: "#fda4af" })
        .setLngLat([hospital.longitude, hospital.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>${hospital.name}</strong><br/>${hospital.address}`,
          ),
        )
        .addTo(map);
    }

    return () => {
      map.remove();
    };
  }, [token, center, hospitals]);

  return <div ref={mapRef} className="h-[440px] w-full rounded-2xl" />;
}
