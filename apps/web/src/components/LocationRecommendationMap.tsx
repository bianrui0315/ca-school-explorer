import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import type { DistrictBoundary } from "../lib/districtBoundaries";
import type {
  GradeBandRecommendations,
  LocationSchoolMatch,
} from "../lib/locationRecommendations";
import type { ResolvedLocation } from "../lib/locationSearch";
import { useI18n } from "../i18n";

const BAND_COLORS = {
  elementary: "#16806a",
  middle: "#1467d8",
  high: "#6a52b3",
};

const DISTRICT_COLORS: Record<string, string> = {
  elementary: "#0f8b8d",
  high: "#7654c4",
  unified: "#2468e5",
};

export type LocationMapFocus = "district" | "nearby";

interface LocationRecommendationMapProps {
  boundaries: DistrictBoundary[];
  focus: LocationMapFocus;
  groups: GradeBandRecommendations[];
  location: ResolvedLocation;
}

export function LocationRecommendationMap({
  boundaries,
  focus,
  groups,
  location,
}: LocationRecommendationMapProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const matches = useMemo(() => {
    const unique = new Map<string, LocationSchoolMatch>();
    groups.forEach((group) => {
      group.results.forEach((match) => {
        if (!unique.has(match.school.id)) {
          unique.set(match.school.id, match);
        }
      });
    });
    return [...unique.values()];
  }, [groups]);

  useEffect(() => {
    let active = true;
    let map: LeafletMap | undefined;

    async function initializeMap() {
      if (!containerRef.current) {
        return;
      }
      try {
        const L = await import("leaflet");
        if (!active || !containerRef.current) {
          return;
        }
        map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        map.setView([location.latitude, location.longitude], 11);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        const nearbyBounds = L.latLngBounds([
          [location.latitude, location.longitude],
        ]);
        const districtBounds = L.latLngBounds([]);
        boundaries.forEach((boundary) => {
          if (!boundary.geometry) {
            return;
          }
          const color =
            DISTRICT_COLORS[boundary.type.toLowerCase()] ?? "#2468e5";
          const feature: Feature = {
            geometry: boundary.geometry,
            properties: {
              cdsCode: boundary.cdsCode,
              name: boundary.name,
              type: boundary.type,
            },
            type: "Feature",
          };
          const layer = L.geoJSON(feature as GeoJsonObject, {
            style: {
              color,
              fillColor: color,
              fillOpacity: 0.06,
              lineCap: "round",
              lineJoin: "round",
              opacity: 0.92,
              weight: 3,
            },
          }).addTo(map!);
          const label = document.createElement("div");
          const name = document.createElement("strong");
          const details = document.createElement("span");
          name.textContent = boundary.name;
          details.textContent = `${boundary.type} · ${boundary.gradeLow ?? "?"}–${boundary.gradeHigh ?? "?"} · ${boundary.schoolYear}`;
          label.className = "map-popup";
          label.append(name, details);
          layer.bindTooltip(label, { sticky: true });
          districtBounds.extend(layer.getBounds());
        });
        const centerMarker = L.circleMarker(
          [location.latitude, location.longitude],
          {
            color: "#b5363d",
            fillColor: "#ffffff",
            fillOpacity: 1,
            radius: 10,
            weight: 4,
          },
        ).addTo(map);
        const centerPopup = document.createElement("div");
        const centerName = document.createElement("strong");
        const centerLabel = document.createElement("span");
        centerName.textContent = location.matchedAddress;
        centerLabel.textContent = t("Search location");
        centerPopup.className = "map-popup";
        centerPopup.append(centerName, centerLabel);
        centerMarker.bindTooltip(t("Search location")).bindPopup(centerPopup);
        matches.forEach((match) => {
          const { school } = match;
          if (school.latitude === null || school.longitude === null) {
            return;
          }
          nearbyBounds.extend([school.latitude, school.longitude]);
          const marker = L.circleMarker([school.latitude, school.longitude], {
            color: "#ffffff",
            fillColor: BAND_COLORS[match.band],
            fillOpacity: 0.94,
            radius: 7,
            weight: 2.5,
          }).addTo(map!);
          const popup = document.createElement("div");
          const name = document.createElement("strong");
          const details = document.createElement("span");
          name.textContent = school.name;
          details.textContent = `${school.gradeSpan} · ${match.distanceMiles.toFixed(1)} mi · ${t("Evidence")} ${Math.round(match.score ?? 0)}/100`;
          popup.className = "map-popup";
          popup.append(name, details);
          marker.bindPopup(popup);
          marker.bindTooltip(school.name);
        });
        const focusBounds =
          focus === "district" && districtBounds.isValid()
            ? districtBounds
            : nearbyBounds;
        map.fitBounds(focusBounds.pad(focus === "district" ? 0.06 : 0.18), {
          maxZoom: focus === "district" ? 11 : 13,
        });
        window.requestAnimationFrame(() => map?.invalidateSize());
      } catch (caught) {
        console.error(
          "Unable to initialize location recommendation map.",
          caught,
        );
        if (active) {
          setError(t("The location map could not be loaded."));
        }
      }
    }

    void initializeMap();
    return () => {
      active = false;
      map?.remove();
    };
  }, [boundaries, focus, location, matches, t]);

  if (error) {
    return (
      <div className="map-fallback" role="status">
        {error}
      </div>
    );
  }
  return (
    <div
      aria-label={t("Location recommendation map")}
      className="location-recommendation-map"
      ref={containerRef}
      role="region"
    />
  );
}
