import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { School, SchoolSummary } from "../types";

export interface DiscoveryMapResult {
  school: SchoolSummary;
  distanceMiles?: number;
}

interface SchoolDiscoveryMapProps {
  centerSchool?: School;
  comparisonFull: boolean;
  onAdd: (schoolId: string) => Promise<void> | void;
  results: DiscoveryMapResult[];
}

export function SchoolDiscoveryMap({
  centerSchool,
  comparisonFull,
  onAdd,
  results,
}: SchoolDiscoveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAddRef = useRef(onAdd);
  const [error, setError] = useState<string>();
  const locations = useMemo(
    () =>
      results.flatMap(({ school, distanceMiles }) =>
        school.latitude === null || school.longitude === null
          ? []
          : [
              {
                school,
                distanceMiles,
                latitude: school.latitude,
                longitude: school.longitude,
              },
            ],
      ),
    [results],
  );

  useEffect(() => {
    onAddRef.current = onAdd;
  }, [onAdd]);

  useEffect(() => {
    let active = true;
    let map: LeafletMap | undefined;

    async function initializeMap() {
      if (!containerRef.current || locations.length === 0) {
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

        const bounds = L.latLngBounds([]);
        if (
          centerSchool?.latitude !== null &&
          centerSchool?.latitude !== undefined &&
          centerSchool.longitude !== null
        ) {
          bounds.extend([centerSchool.latitude, centerSchool.longitude]);
          const centerMarker = L.circleMarker(
            [centerSchool.latitude, centerSchool.longitude],
            {
              color: centerSchool.color,
              fillColor: "#ffffff",
              fillOpacity: 1,
              radius: 10,
              weight: 4,
            },
          ).addTo(map);
          const popup = document.createElement("div");
          const name = document.createElement("strong");
          const label = document.createElement("span");
          name.textContent = centerSchool.name;
          label.textContent = "Nearby search center";
          popup.className = "map-popup";
          popup.append(name, label);
          centerMarker.bindPopup(popup);
          centerMarker.bindTooltip(`${centerSchool.name} (center)`);
        }

        locations.forEach(({ school, distanceMiles, latitude, longitude }) => {
          bounds.extend([latitude, longitude]);
          const marker = L.circleMarker([latitude, longitude], {
            color: "#ffffff",
            fillColor: "#1467d8",
            fillOpacity: 0.92,
            radius: 7,
            weight: 2.5,
          }).addTo(map!);
          const popup = document.createElement("div");
          const name = document.createElement("strong");
          const details = document.createElement("span");
          const action = document.createElement("button");
          name.textContent = school.name;
          details.textContent = [
            school.gradeSpan,
            school.address.city,
            distanceMiles === undefined
              ? undefined
              : `${distanceMiles.toFixed(1)} mi`,
          ]
            .filter(Boolean)
            .join(" · ");
          action.className = "map-popup-action";
          action.disabled = comparisonFull;
          action.textContent = comparisonFull
            ? "Comparison full"
            : "Add to comparison";
          action.type = "button";
          action.addEventListener("click", () => {
            action.disabled = true;
            action.textContent = "Adding…";
            void Promise.resolve(onAddRef.current(school.id)).catch(() => {
              action.disabled = comparisonFull;
              action.textContent = comparisonFull
                ? "Comparison full"
                : "Add to comparison";
            });
          });
          popup.className = "map-popup";
          popup.append(name, details, action);
          marker.bindPopup(popup);
          marker.bindTooltip(school.name);
        });

        if (bounds.isValid()) {
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.setView(bounds.getCenter(), 13);
          } else {
            map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
          }
        }
        window.requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        if (active) {
          setError("The discovery map could not be loaded.");
        }
      }
    }

    void initializeMap();
    return () => {
      active = false;
      map?.remove();
    };
  }, [centerSchool, comparisonFull, locations]);

  if (locations.length === 0) {
    return (
      <div className="map-fallback" role="status">
        No mapped schools match the current search.
      </div>
    );
  }
  if (error) {
    return (
      <div className="map-fallback" role="status">
        {error}
      </div>
    );
  }
  return (
    <div
      aria-label="School discovery map"
      className="school-discovery-map"
      ref={containerRef}
      role="region"
    />
  );
}
