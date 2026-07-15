import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  GradeBandRecommendations,
  LocationSchoolMatch,
} from "../lib/locationRecommendations";
import type { ResolvedLocation } from "../lib/locationSearch";

const BAND_COLORS = {
  elementary: "#16806a",
  middle: "#1467d8",
  high: "#6a52b3",
};

interface LocationRecommendationMapProps {
  groups: GradeBandRecommendations[];
  location: ResolvedLocation;
}

export function LocationRecommendationMap({
  groups,
  location,
}: LocationRecommendationMapProps) {
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
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);
        const bounds = L.latLngBounds([
          [location.latitude, location.longitude],
        ]);
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
        centerLabel.textContent = "Search location";
        centerPopup.className = "map-popup";
        centerPopup.append(centerName, centerLabel);
        centerMarker.bindTooltip("Search location").bindPopup(centerPopup);
        matches.forEach((match) => {
          const { school } = match;
          if (school.latitude === null || school.longitude === null) {
            return;
          }
          bounds.extend([school.latitude, school.longitude]);
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
          details.textContent = `${school.gradeSpan} · ${match.distanceMiles.toFixed(1)} mi · Evidence ${Math.round(match.score ?? 0)}/100`;
          popup.className = "map-popup";
          popup.append(name, details);
          marker.bindPopup(popup);
          marker.bindTooltip(school.name);
        });
        map.fitBounds(bounds.pad(0.18), { maxZoom: 13 });
        window.requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        if (active) {
          setError("The location map could not be loaded.");
        }
      }
    }

    void initializeMap();
    return () => {
      active = false;
      map?.remove();
    };
  }, [location, matches]);

  if (error) {
    return (
      <div className="map-fallback" role="status">
        {error}
      </div>
    );
  }
  return (
    <div
      aria-label="Location recommendation map"
      className="location-recommendation-map"
      ref={containerRef}
      role="region"
    />
  );
}
