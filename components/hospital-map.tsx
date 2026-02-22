"use client";

import { LatLngBounds } from "leaflet";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { HospitalResult } from "@/lib/types";

interface HospitalMapProps {
  center: { latitude: number; longitude: number } | null;
  hospitals: HospitalResult[];
}

interface MapViewportProps {
  center: { latitude: number; longitude: number } | null;
  hospitals: HospitalResult[];
}

function MapViewport({ center, hospitals }: MapViewportProps) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.latitude, center.longitude], 12);
      return;
    }

    if (hospitals.length) {
      const bounds = new LatLngBounds(
        hospitals.map((hospital) => [hospital.latitude, hospital.longitude]),
      );
      map.fitBounds(bounds.pad(0.2));
      return;
    }

    map.setView([20.5937, 78.9629], 5);
  }, [center, hospitals, map]);

  return null;
}

export function HospitalMap({ center, hospitals }: HospitalMapProps) {
  const defaultCenter: [number, number] = center
    ? [center.latitude, center.longitude]
    : [20.5937, 78.9629];
  const defaultZoom = center ? 11 : 5;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      scrollWheelZoom
      className="h-[440px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} hospitals={hospitals} />

      {center ? (
        <CircleMarker
          center={[center.latitude, center.longitude]}
          pathOptions={{
            color: "#14b8a6",
            fillColor: "#2dd4bf",
            fillOpacity: 0.7,
          }}
          radius={10}
        >
          <Popup>Your selected location</Popup>
        </CircleMarker>
      ) : null}

      {hospitals.map((hospital) => (
        <CircleMarker
          key={hospital.id}
          center={[hospital.latitude, hospital.longitude]}
          pathOptions={{
            color: "#fb7185",
            fillColor: "#fda4af",
            fillOpacity: 0.65,
          }}
          radius={8}
        >
          <Popup>
            <strong>{hospital.name}</strong>
            <br />
            {hospital.address}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
