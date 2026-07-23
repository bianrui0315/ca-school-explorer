import { lazy, Suspense, useMemo, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n";
import { schoolsWithinDistance } from "../lib/schoolDistance";
import {
  gradeOptionsForSchools,
  searchSchools,
  type SchoolSearchFilters,
} from "../lib/schoolSearch";
import type { School, SchoolSummary } from "../types";
import { Icon } from "./Icon";

const LazySchoolDiscoveryMap = lazy(() =>
  import("./SchoolDiscoveryMap").then((module) => ({
    default: module.SchoolDiscoveryMap,
  })),
);

const MAX_LIST_RESULTS = 8;
const MAX_MAP_RESULTS = 20;
const NEARBY_RADII = [2, 5, 10, 25];

interface SchoolPickerProps {
  allSchools: SchoolSummary[];
  selectedSchools: School[];
  query: string;
  filterQuery: string;
  onQueryChange: (query: string) => void;
  onAdd: (schoolId: string) => Promise<void> | void;
  onRemove: (schoolId: string) => void;
  onClear: () => void;
}

interface SchoolDiscoveryResult {
  school: SchoolSummary;
  distanceMiles?: number;
}

function schoolStyle(color: string) {
  return { "--school-color": color } as CSSProperties;
}

export function SchoolPicker({
  allSchools,
  selectedSchools,
  query,
  filterQuery,
  onQueryChange,
  onAdd,
  onRemove,
  onClear,
}: SchoolPickerProps) {
  const { t } = useI18n();
  const [pendingSchoolId, setPendingSchoolId] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyCenterId, setNearbyCenterId] = useState<string>();
  const [nearbyRadius, setNearbyRadius] = useState(10);
  const [resultView, setResultView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<SchoolSearchFilters>({
    county: "",
    city: "",
    grade: "",
  });
  const selectedIds = useMemo(
    () => new Set(selectedSchools.map(({ id }) => id)),
    [selectedSchools],
  );
  const availableSchools = useMemo(
    () => allSchools.filter((school) => !selectedIds.has(school.id)),
    [allSchools, selectedIds],
  );
  const counties = useMemo(
    () =>
      [...new Set(allSchools.map((school) => school.county))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [allSchools],
  );
  const cities = useMemo(
    () =>
      [
        ...new Set(
          allSchools
            .filter(
              (school) => !filters.county || school.county === filters.county,
            )
            .map((school) => school.city),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [allSchools, filters.county],
  );
  const gradeOptions = useMemo(
    () => gradeOptionsForSchools(allSchools),
    [allSchools],
  );
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const nearbyCenter =
    selectedSchools.find((school) => school.id === nearbyCenterId) ??
    selectedSchools[selectedSchools.length - 1];
  const nearbyActive = nearbyEnabled && nearbyCenter !== undefined;
  const searchIsActive =
    filterQuery.trim().length >= 2 || activeFilterCount > 0 || nearbyActive;
  const directoryMatches = useMemo(
    () =>
      searchIsActive
        ? searchSchools(availableSchools, filterQuery, filters)
        : [],
    [availableSchools, filterQuery, filters, searchIsActive],
  );
  const results = useMemo<SchoolDiscoveryResult[]>(
    () =>
      nearbyActive
        ? schoolsWithinDistance(directoryMatches, nearbyCenter, nearbyRadius)
        : directoryMatches.map((school) => ({ school })),
    [directoryMatches, nearbyActive, nearbyCenter, nearbyRadius],
  );
  const suggestions = results.slice(0, MAX_LIST_RESULTS);
  const mapResults = results.slice(0, MAX_MAP_RESULTS);

  const clearFilters = () => {
    setFilters({ county: "", city: "", grade: "" });
  };

  const addResult = async (schoolId: string) => {
    setPendingSchoolId(schoolId);
    try {
      await onAdd(schoolId);
      if (!nearbyActive) {
        onQueryChange("");
      }
    } finally {
      setPendingSchoolId(undefined);
    }
  };

  return (
    <section
      className="school-picker"
      aria-labelledby="selected-schools-heading"
    >
      <div className="school-discovery">
        <div className="school-search-wrap">
          <Icon name="search" size={19} />
          <input
            aria-autocomplete="list"
            aria-controls={
              searchIsActive
                ? resultView === "list"
                  ? "school-suggestions"
                  : "school-discovery-map-panel"
                : undefined
            }
            aria-describedby={
              searchIsActive ? "school-results-status" : undefined
            }
            aria-expanded={searchIsActive}
            aria-label={t("Search schools by name, district, address, or ZIP")}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("School, district, address, or ZIP")}
            type="search"
            value={query}
          />
        </div>

        <div className="school-filter-actions">
          <div>
            <button
              aria-controls="school-filter-panel"
              aria-expanded={filtersOpen}
              className={
                activeFilterCount > 0
                  ? "filter-toggle filter-toggle--active"
                  : "filter-toggle"
              }
              onClick={() => setFiltersOpen((current) => !current)}
              type="button"
            >
              <Icon name="filter" size={15} />
              {t("Filters")}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              <Icon
                className="filter-toggle-chevron"
                name="chevronDown"
                size={14}
              />
            </button>
            <button
              aria-pressed={nearbyActive}
              className={
                nearbyActive
                  ? "nearby-toggle nearby-toggle--active"
                  : "nearby-toggle"
              }
              disabled={selectedSchools.length === 0}
              onClick={() => {
                if (!nearbyActive && nearbyCenter) {
                  setNearbyCenterId(nearbyCenter.id);
                }
                setNearbyEnabled(!nearbyActive);
                setResultView("list");
              }}
              type="button"
            >
              <Icon name="mapPin" size={15} />
              {t("Nearby")}
            </button>
          </div>
          {activeFilterCount > 0 ? (
            <button
              className="filter-clear"
              onClick={clearFilters}
              type="button"
            >
              {t("Reset")}
            </button>
          ) : null}
        </div>

        {filtersOpen ? (
          <div className="school-filter-panel" id="school-filter-panel">
            <label>
              <span>{t("County")}</span>
              <select
                aria-label={t("County filter")}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    county: event.target.value,
                    city: "",
                  }))
                }
                value={filters.county}
              >
                <option value="">{t("All counties")}</option>
                {counties.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("City")}</span>
              <select
                aria-label={t("City filter")}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                value={filters.city}
              >
                <option value="">{t("All cities")}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Grade")}</span>
              <select
                aria-label={t("Grade filter")}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    grade: event.target.value,
                  }))
                }
                value={filters.grade}
              >
                <option value="">{t("All grades")}</option>
                {gradeOptions.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {t(grade.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {searchIsActive ? (
          <div
            className={
              resultView === "map"
                ? "school-suggestions school-suggestions--map"
                : "school-suggestions"
            }
          >
            <div className="school-results-toolbar">
              <div
                aria-live="polite"
                className="school-results-status"
                id="school-results-status"
                role="status"
              >
                {results.length === 0
                  ? nearbyActive
                    ? t("No schools within {radius} mi", {
                        radius: nearbyRadius,
                      })
                    : t("No matching schools")
                  : nearbyActive
                    ? t(
                        results.length === 1
                          ? "{count} school within {radius} mi"
                          : "{count} schools within {radius} mi",
                        {
                          count: results.length.toLocaleString(),
                          radius: nearbyRadius,
                        },
                      )
                    : t(
                        results.length === 1
                          ? "{count} matching school"
                          : "{count} matching schools",
                        { count: results.length.toLocaleString() },
                      )}
              </div>
              <div
                aria-label={t("Search result view")}
                className="result-view-toggle"
                role="group"
              >
                <button
                  aria-pressed={resultView === "list"}
                  onClick={() => setResultView("list")}
                  type="button"
                >
                  {t("List")}
                </button>
                <button
                  aria-pressed={resultView === "map"}
                  onClick={() => setResultView("map")}
                  type="button"
                >
                  {t("Map")}
                </button>
              </div>
            </div>

            {nearbyActive && nearbyCenter ? (
              <div className="nearby-controls">
                <label>
                  <span>{t("Center")}</span>
                  <select
                    aria-label={t("Nearby center school")}
                    onChange={(event) => setNearbyCenterId(event.target.value)}
                    value={nearbyCenter.id}
                  >
                    {selectedSchools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("Radius")}</span>
                  <select
                    aria-label={t("Nearby radius")}
                    onChange={(event) =>
                      setNearbyRadius(Number.parseInt(event.target.value, 10))
                    }
                    value={nearbyRadius}
                  >
                    {NEARBY_RADII.map((radius) => (
                      <option key={radius} value={radius}>
                        {radius} mi
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {resultView === "list" && suggestions.length > 0 ? (
              <ul id="school-suggestions" role="listbox">
                {suggestions.map(({ school, distanceMiles }) => (
                  <li key={school.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      disabled={
                        pendingSchoolId === school.id ||
                        selectedSchools.length >= 5
                      }
                      onClick={() => void addResult(school.id)}
                    >
                      <span>{school.name}</span>
                      <small className="school-result-location">
                        {[school.address.street, school.address.city]
                          .filter(Boolean)
                          .join(" · ")}
                        {school.address.zip ? ` ${school.address.zip}` : ""}
                      </small>
                      <small>
                        {school.district} · {school.gradeSpan}
                      </small>
                      {distanceMiles === undefined || !nearbyCenter ? null : (
                        <small className="school-result-distance">
                          <Icon name="mapPin" size={12} />
                          {t("{distance} mi from {school}", {
                            distance: distanceMiles.toFixed(1),
                            school: nearbyCenter.name,
                          })}
                        </small>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {resultView === "map" ? (
              <div
                className="school-discovery-map-shell"
                id="school-discovery-map-panel"
              >
                <Suspense
                  fallback={
                    <div className="map-fallback">{t("Loading map…")}</div>
                  }
                >
                  <LazySchoolDiscoveryMap
                    centerSchool={nearbyActive ? nearbyCenter : undefined}
                    comparisonFull={selectedSchools.length >= 5}
                    onAdd={addResult}
                    results={mapResults}
                  />
                </Suspense>
              </div>
            ) : null}

            {resultView === "list" && results.length > suggestions.length ? (
              <p className="school-results-note">
                {t(
                  "Showing the first {count} results. Add a ZIP or filter to narrow.",
                  { count: MAX_LIST_RESULTS },
                )}
              </p>
            ) : null}
            {resultView === "map" && results.length > mapResults.length ? (
              <p className="school-results-note">
                {t(
                  "Showing the first {count} map results. Narrow the search for more detail.",
                  { count: MAX_MAP_RESULTS },
                )}
              </p>
            ) : null}
            {nearbyActive ? (
              <p className="nearby-disclaimer">
                <strong>
                  {t("Nearby does not mean assigned or eligible.")}
                </strong>{" "}
                {t(
                  "Distances are straight-line estimates from published school coordinates. Verify boundaries with the district.",
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="section-heading-row">
        <h2 id="selected-schools-heading">
          {t("Selected schools ({count} of 5)", {
            count: selectedSchools.length,
          })}
        </h2>
        {selectedSchools.length > 0 ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setNearbyEnabled(false);
              onClear();
            }}
          >
            {t("Clear all")}
          </button>
        ) : null}
      </div>

      {selectedSchools.length > 0 ? (
        <div className="selected-school-list" role="list">
          {selectedSchools.map((school) => (
            <div
              className="selected-school"
              key={school.id}
              role="listitem"
              style={schoolStyle(school.color)}
            >
              <span className="school-color" />
              <span className="selected-school-name">{school.name}</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedSchools.length === 1) {
                    setNearbyEnabled(false);
                  }
                  onRemove(school.id);
                }}
                aria-label={t("Remove {school}", { school: school.name })}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-selection">
          {t("Search for a school to begin a comparison.")}
        </p>
      )}

      <button
        className="add-school-button"
        type="button"
        disabled={selectedSchools.length >= 5}
        onClick={() =>
          document
            .querySelector<HTMLInputElement>(".school-search-wrap input")
            ?.focus()
        }
      >
        <Icon name="plus" size={19} />
        {t("Add school")}
      </button>
    </section>
  );
}
