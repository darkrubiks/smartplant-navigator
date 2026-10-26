import { useLanguage } from "@/hooks/use-language";
import { useEffect, useMemo, useRef } from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import { MapContainer, ImageOverlay, Marker, Polyline, Popup, useMap } from "react-leaflet";
import {
  getCategoryLabel,
  PLANT_HEIGHT,
  PLANT_IMAGE_URL,
  PLANT_WIDTH,
  toLatLng,
} from "@/lib/plant";
import type { Point } from "@/lib/routing";

export type BuildingMarker = {
  id: string;
  number: string;
  name: string;
  category: "industrial" | "social" | "auxiliary" | "gate";
  x: number;
  y: number;
  description?: string | null;
  department?: string | null;
  responsible?: string | null;
  phone?: string | null;
  hours?: string | null;
  dock?: string | null;
};

const bounds: LatLngBoundsExpression = [
  [0, 0],
  [PLANT_HEIGHT, PLANT_WIDTH],
];

function LocalizedMapControls() {
  const map = useMap();
  const { t } = useLanguage();
  useEffect(() => {
    map
      .getContainer()
      .querySelectorAll(".leaflet-popup-close-button")
      .forEach((button) => {
        button.setAttribute("aria-label", t("Close"));
        button.setAttribute("title", t("Close"));
      });
    const zoom = L.control
      .zoom({ zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out") })
      .addTo(map);
    return () => {
      zoom.remove();
    };
  }, [map, t]);
  return null;
}

function makeIcon(
  label: string,
  category: BuildingMarker["category"],
  variant?: "origin" | "destination",
) {
  const className = `mb-marker ${category}${variant ? " " + variant : ""}`;
  return L.divIcon({
    html: `<div class="${className}">${label}</div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function labelMarker(marker: L.Marker | null, building: BuildingMarker) {
  const element = marker?.getElement();
  element?.setAttribute("title", building.name);
  element?.setAttribute("aria-label", `${building.number} — ${building.name}`);
}

// Waze-style user arrow. The arrow is a triangle inside a blue disc.
// The parent div is rotated by `heading` (compass degrees, 0 = north / up on screen).
function makeArrowIcon(headingDeg: number) {
  const rot = Number.isFinite(headingDeg) ? headingDeg : 0;
  const svg = `
    <svg viewBox="0 0 44 44" width="44" height="44" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rot}deg); transition: transform 0.25s linear;">
      <circle cx="22" cy="22" r="20" fill="hsl(210 90% 45%)" stroke="white" stroke-width="3"/>
      <path d="M22 8 L32 30 L22 25 L12 30 Z" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: `<div class="mb-arrow">${svg}</div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function FollowCamera({
  point,
  heading,
  enabled,
  zoom,
}: {
  point?: Point;
  heading?: number;
  enabled: boolean;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !point) return;
    // Bias the target so the arrow sits ~1/3 from the bottom of the viewport.
    const size = map.getSize();
    const targetPt = map.project(toLatLng(point.x, point.y), zoom);
    const biased = L.point(targetPt.x, targetPt.y - size.y * 0.18);
    const target = map.unproject(biased, zoom);
    map.setView(target, zoom, { animate: true, duration: 0.4 });
    // heading param kept for future map-rotation support
    void heading;
  }, [point, heading, enabled, zoom, map]);
  return null;
}

function ViewControls({ center }: { center?: Point }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(toLatLng(center.x, center.y), map.getZoom(), {
        animate: true,
      });
    }
  }, [center, map]);
  return null;
}

function FitBounds({ points, trigger }: { points?: Point[]; trigger?: number }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      const b = L.latLngBounds(points.map((p) => toLatLng(p.x, p.y)));
      map.fitBounds(b, { padding: [100, 100], maxZoom: 1 });
    }
  }, [points, trigger, map]);
  return null;
}

export interface PlantMapProps {
  buildings: BuildingMarker[];
  onSelect?: (b: BuildingMarker) => void;
  onDirections?: (b: BuildingMarker) => void;
  routePath?: Point[];
  origin?: Point;
  destination?: Point;
  focusedBuilding?: BuildingMarker | null;
  fitBounds?: boolean;
  fitBoundsKey?: number;
  className?: string;
  // Real-time navigation
  userPosition?: Point;
  userHeading?: number;
  followUser?: boolean;
  followZoom?: number;
  // Editing
  editable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
}

export function PlantMap({
  buildings,
  onSelect,
  onDirections,
  routePath,
  origin,
  destination,
  focusedBuilding,
  fitBounds,
  fitBoundsKey,
  className,
  userPosition,
  userHeading,
  followUser,
  followZoom = 1,
  editable,
  onMove,
}: PlantMapProps) {
  const { language, t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const polyline = useMemo(() => routePath?.map((p) => toLatLng(p.x, p.y)) ?? [], [routePath]);

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      minZoom={-2}
      maxZoom={3}
      zoom={-1}
      className={className}
      style={{ height: "100%", width: "100%", background: "#f8fafc" }}
      zoomControl={false}
      attributionControl={false}
      ref={(m) => {
        if (m) mapRef.current = m;
      }}
    >
      <LocalizedMapControls />
      <ImageOverlay url={PLANT_IMAGE_URL} bounds={bounds} opacity={1} />

      {buildings.map((b) => {
        const isDest = destination && b.x === destination.x && b.y === destination.y;
        const isOrigin = origin && b.x === origin.x && b.y === origin.y;
        return (
          <Marker
            key={b.id}
            ref={(marker) => {
              labelMarker(marker, b);
            }}
            title={b.name}
            alt={t("Map marker")}
            position={toLatLng(b.x, b.y)}
            draggable={editable}
            icon={makeIcon(
              b.number,
              b.category,
              isDest ? "destination" : isOrigin ? "origin" : undefined,
            )}
            eventHandlers={{
              add: (event) => labelMarker(event.target as L.Marker, b),
              click: () => onSelect?.(b),
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                // toLatLng maps (x,y) → [PLANT_HEIGHT-y, x]; invert.
                const x = Math.round(ll.lng);
                const y = Math.round(PLANT_HEIGHT - ll.lat);
                onMove?.(b.id, x, y);
              },
            }}
          >
            <Popup
              minWidth={260}
              maxWidth={320}
              eventHandlers={{
                add: (event) => {
                  const closeButton = (event.target as L.Popup)
                    .getElement()
                    ?.querySelector(".leaflet-popup-close-button");
                  closeButton?.setAttribute("aria-label", t("Close"));
                  closeButton?.setAttribute("title", t("Close"));
                },
              }}
            >
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-start gap-2">
                    <span
                      className={`mb-marker ${b.category}`}
                      style={{ minWidth: 34, height: 34, fontSize: 11 }}
                    >
                      {b.number}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight">{b.name}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {getCategoryLabel(b.category)}
                      </div>
                    </div>
                  </div>
                  {b.description && (
                    <p className="mt-2 leading-relaxed text-muted-foreground">{b.description}</p>
                  )}
                </div>

                {(b.department || b.responsible || b.hours || b.dock) && (
                  <dl className="grid gap-1.5 border-t border-border pt-2 text-xs">
                    {b.department && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("Department")}</dt>
                        <dd className="text-right font-medium">{b.department}</dd>
                      </div>
                    )}
                    {b.responsible && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("Responsible")}</dt>
                        <dd className="text-right font-medium">{b.responsible}</dd>
                      </div>
                    )}
                    {b.hours && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("Hours")}</dt>
                        <dd className="text-right font-medium">{b.hours}</dd>
                      </div>
                    )}
                    {b.dock && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("Dock")}</dt>
                        <dd className="text-right font-medium">{b.dock}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="flex items-center gap-2">
                  {b.phone && (
                    <a
                      href={`tel:${b.phone}`}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-xs font-semibold hover:bg-accent"
                    >
                      {b.phone}
                    </a>
                  )}
                  {onDirections && (
                    <button
                      type="button"
                      onClick={() => onDirections(b)}
                      className="flex-1 rounded-lg bg-[var(--mb-blue)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--mb-blue-dark)]"
                    >
                      {t("Get directions")}
                    </button>
                  )}
                </div>

                {editable && (
                  <div className="border-t border-border pt-2 text-[10px] font-mono opacity-60">
                    x:{b.x} y:{b.y}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {polyline.length > 1 && (
        <>
          {/* Outer glow / casing */}
          <Polyline
            positions={polyline}
            pathOptions={{
              color: "white",
              weight: 12,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            positions={polyline}
            pathOptions={{
              color: "hsl(210 90% 45%)",
              weight: 7,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </>
      )}

      {userPosition && (
        <Marker
          position={toLatLng(userPosition.x, userPosition.y)}
          icon={makeArrowIcon(userHeading ?? 0)}
          interactive={false}
          zIndexOffset={1000}
        />
      )}

      {focusedBuilding && <ViewControls center={{ x: focusedBuilding.x, y: focusedBuilding.y }} />}
      {fitBounds && routePath && <FitBounds points={routePath} trigger={fitBoundsKey} />}
      {followUser && userPosition && (
        <FollowCamera
          point={userPosition}
          heading={userHeading}
          enabled={followUser}
          zoom={followZoom}
        />
      )}
    </MapContainer>
  );
}
