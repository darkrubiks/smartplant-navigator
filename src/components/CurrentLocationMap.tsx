import { useEffect } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Popup, useMap } from "react-leaflet";
import { useLanguage } from "@/hooks/use-language";
import type { CurrentLocation } from "@/lib/geolocation";

function LocationView({ location }: { location: CurrentLocation }) {
  const map = useMap();
  const { t } = useLanguage();

  useEffect(() => {
    const bounds = L.latLng(location.latitude, location.longitude).toBounds(
      Math.max(location.accuracy * 2, 100),
    );
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: 18,
      paddingTopLeft: [40, 200],
      paddingBottomRight: [40, 300],
    });
  }, [location, map]);

  useEffect(() => {
    const zoom = L.control
      .zoom({ zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out"), position: "topright" })
      .addTo(map);
    zoom.getContainer()?.style.setProperty("margin-top", "96px");
    const scale = L.control.scale({ imperial: false, position: "topright" }).addTo(map);
    return () => {
      zoom.remove();
      scale.remove();
    };
  }, [map, t]);

  return null;
}

function CoordinateGrid() {
  const map = useMap();

  useEffect(() => {
    // Draw coordinates locally. No tile URLs or location data leave the browser.
    class CoordinateLayer extends L.GridLayer {
      createTile(coords: L.Coords) {
        const tile = document.createElement("canvas");
        tile.width = tile.height = 256;
        const context = tile.getContext("2d");
        if (!context) return tile;
        context.fillStyle = "#f1f5f9";
        context.fillRect(0, 0, 256, 256);
        context.strokeStyle = "#cbd5e1";
        context.lineWidth = 1;
        for (let offset = 0; offset < 256; offset += 64) {
          context.beginPath();
          context.moveTo(offset + 0.5, 0);
          context.lineTo(offset + 0.5, 256);
          context.moveTo(0, offset + 0.5);
          context.lineTo(256, offset + 0.5);
          context.stroke();
        }
        const corner = map.unproject(L.point(coords.x * 256, coords.y * 256), coords.z);
        context.fillStyle = "#475569";
        context.font = "12px sans-serif";
        context.fillText(`${corner.lat.toFixed(5)}°, ${corner.lng.toFixed(5)}°`, 8, 20);
        return tile;
      }
    }
    const grid = new CoordinateLayer({ tileSize: 256, noWrap: true });
    grid.addTo(map);
    return () => {
      grid.remove();
    };
  }, [map]);

  return null;
}

export function CurrentLocationMap({ location }: { location: CurrentLocation }) {
  const { t } = useLanguage();
  const position: [number, number] = [location.latitude, location.longitude];

  return (
    <MapContainer
      center={position}
      zoom={16}
      minZoom={2}
      maxZoom={20}
      fadeAnimation={false}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
    >
      <CoordinateGrid />
      <Circle
        center={position}
        radius={location.accuracy}
        pathOptions={{ color: "#1a68c7", weight: 1, fillOpacity: 0.12 }}
        interactive={false}
      />
      <CircleMarker
        center={position}
        radius={9}
        pathOptions={{ color: "white", weight: 3, fillColor: "#1a68c7", fillOpacity: 1 }}
      >
        <Popup closeButton={false}>
          <strong>{t("Your current location")}</strong>
          <br />
          {t("Latitude")}: {location.latitude.toFixed(6)}
          <br />
          {t("Longitude")}: {location.longitude.toFixed(6)}
          <br />
          {t("Accuracy: {meters} m", { meters: Math.round(location.accuracy) })}
        </Popup>
      </CircleMarker>
      <LocationView location={location} />
    </MapContainer>
  );
}
