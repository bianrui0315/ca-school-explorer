import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { School } from "../types";

interface SchoolMapProps {
  schools: School[];
}

export function SchoolMap({ schools }: SchoolMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const locations = useMemo(
    () =>
      schools.flatMap((school) =>
        school.latitude === null || school.longitude === null
          ? []
          : [
              {
                school,
                latitude: school.latitude,
                longitude: school.longitude,
              },
            ],
      ),
    [schools],
  );

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
        locations.forEach(({ school, latitude, longitude }) => {
          bounds.extend([latitude, longitude]);
          const marker = L.circleMarker([latitude, longitude], {
            color: "#ffffff",
            fillColor: school.color,
            fillOpacity: 1,
            radius: 8,
            weight: 3,
          }).addTo(map!);
          const popup = document.createElement("div");
          const name = document.createElement("strong");
          const address = document.createElement("span");
          name.textContent = school.name;
          address.textContent = `${school.address.street}, ${school.address.city}`;
          popup.className = "map-popup";
          popup.append(name, address);
          marker.bindPopup(popup);
          marker.bindTooltip(school.name);
        });

        if (locations.length === 1) {
          map.setView([locations[0]!.latitude, locations[0]!.longitude], 13);
        } else {
          map.fitBounds(bounds.pad(0.24), { maxZoom: 14 });
        }
        window.requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        if (active) {
          setError("The interactive map could not be loaded.");
        }
      }
    }

    void initializeMap();
    return () => {
      active = false;
      map?.remove();
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="map-fallback" role="status">
        Coordinates are not available for the selected schools.
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
      aria-label="Selected schools map"
      className="school-map"
      ref={containerRef}
    />
  );
}
