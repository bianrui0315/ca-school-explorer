import { useMemo, useState, type CSSProperties } from "react";
import {
  gradeOptionsForSchools,
  searchSchools,
  type SchoolSearchFilters,
} from "../lib/schoolSearch";
import type { School, SchoolSummary } from "../types";
import { Icon } from "./Icon";

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
  const [pendingSchoolId, setPendingSchoolId] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const searchIsActive =
    filterQuery.trim().length >= 2 || activeFilterCount > 0;
  const matches = useMemo(
    () =>
      searchIsActive
        ? searchSchools(availableSchools, filterQuery, filters)
        : [],
    [availableSchools, filterQuery, filters, searchIsActive],
  );
  const suggestions = matches.slice(0, 8);

  const clearFilters = () => {
    setFilters({ county: "", city: "", grade: "" });
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
            aria-controls="school-suggestions"
            aria-describedby={
              searchIsActive ? "school-results-status" : undefined
            }
            aria-expanded={searchIsActive}
            aria-label="Search schools by name, district, address, or ZIP"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="School, district, address, or ZIP"
            type="search"
            value={query}
          />
        </div>

        <div className="school-filter-actions">
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
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <Icon
              className="filter-toggle-chevron"
              name="chevronDown"
              size={14}
            />
          </button>
          {activeFilterCount > 0 ? (
            <button
              className="filter-clear"
              onClick={clearFilters}
              type="button"
            >
              Reset
            </button>
          ) : null}
        </div>

        {filtersOpen ? (
          <div className="school-filter-panel" id="school-filter-panel">
            <label>
              <span>County</span>
              <select
                aria-label="County filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    county: event.target.value,
                    city: "",
                  }))
                }
                value={filters.county}
              >
                <option value="">All counties</option>
                {counties.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>City</span>
              <select
                aria-label="City filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                value={filters.city}
              >
                <option value="">All cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Grade</span>
              <select
                aria-label="Grade filter"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    grade: event.target.value,
                  }))
                }
                value={filters.grade}
              >
                <option value="">All grades</option>
                {gradeOptions.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {searchIsActive ? (
          <div className="school-suggestions">
            <div
              aria-live="polite"
              className="school-results-status"
              id="school-results-status"
              role="status"
            >
              {matches.length === 0
                ? "No matching schools"
                : `${matches.length.toLocaleString()} matching ${
                    matches.length === 1 ? "school" : "schools"
                  }`}
            </div>
            {suggestions.length > 0 ? (
              <ul id="school-suggestions" role="listbox">
                {suggestions.map((school) => (
                  <li key={school.id} role="option" aria-selected="false">
                    <button
                      type="button"
                      disabled={
                        pendingSchoolId === school.id ||
                        selectedSchools.length >= 5
                      }
                      onClick={async () => {
                        setPendingSchoolId(school.id);
                        try {
                          await onAdd(school.id);
                          onQueryChange("");
                        } finally {
                          setPendingSchoolId(undefined);
                        }
                      }}
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
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {matches.length > suggestions.length ? (
              <p>Showing the first 8 results. Add a ZIP or filter to narrow.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="section-heading-row">
        <h2 id="selected-schools-heading">
          Selected schools ({selectedSchools.length} of 5)
        </h2>
        {selectedSchools.length > 0 ? (
          <button className="text-button" type="button" onClick={onClear}>
            Clear all
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
                onClick={() => onRemove(school.id)}
                aria-label={`Remove ${school.name}`}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-selection">
          Search for a school to begin a comparison.
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
        Add school
      </button>
    </section>
  );
}
