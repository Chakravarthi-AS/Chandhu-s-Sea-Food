"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const hubIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#0d7a8c;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#e85d4c;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function ClickPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

type Props = {
  hubLat: number;
  hubLng: number;
  hubLabel: string;
  radiusKm: number;
  deliveryLat: number;
  deliveryLng: number;
  onPickDelivery?: (lat: number, lng: number) => void;
  interactive?: boolean;
};

export function DeliveryMap({
  hubLat,
  hubLng,
  hubLabel,
  radiusKm,
  deliveryLat,
  deliveryLng,
  onPickDelivery,
  interactive = true,
}: Props) {
  const center = useMemo(
    () => [hubLat, hubLng] as [number, number],
    [hubLat, hubLng]
  );

  return (
    <div className="map-wrap">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={interactive}
        dragging={interactive}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#0d7a8c",
            fillColor: "#12a3b8",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
        <Marker position={center} icon={hubIcon}>
          <Popup>
            <strong>Hub</strong>
            <br />
            {hubLabel}
          </Popup>
        </Marker>
        <Marker position={[deliveryLat, deliveryLng]} icon={pinIcon}>
          <Popup>Delivery pin</Popup>
        </Marker>
        {onPickDelivery && <ClickPicker onPick={onPickDelivery} />}
        <Recenter lat={deliveryLat} lng={deliveryLng} />
      </MapContainer>
    </div>
  );
}
