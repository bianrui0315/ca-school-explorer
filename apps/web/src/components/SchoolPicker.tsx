import type { CSSProperties } from "react";
import type { School } from "../types";
import { Icon } from "./Icon";

interface SchoolPickerProps {
  allSchools: School[];
  selectedSchools: School[];
  query: string;
  filterQuery: string;
  onQueryChange: (query: string) => void;
  onAdd: (schoolId: string) => void;
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
  const selectedIds = new Set(selectedSchools.map(({ id }) => id));
  const normalizedQuery = filterQuery.trim().toLowerCase();
  const suggestions = normalizedQuery
    ? allSchools.filter(
        (school) =>
          !selectedIds.has(school.id) &&
          [school.name, school.district, school.city].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          ),
      )
    : [];

  return (
    <section
      className="school-picker"
      aria-labelledby="selected-schools-heading"
    >
      <div className="school-search-wrap">
        <Icon name="search" size={19} />
        <input
          aria-autocomplete="list"
          aria-controls="school-suggestions"
          aria-expanded={suggestions.length > 0}
          aria-label="Find a school or district"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find a school or district"
          type="search"
          value={query}
        />
        {suggestions.length > 0 ? (
          <ul
            className="school-suggestions"
            id="school-suggestions"
            role="listbox"
          >
            {suggestions.map((school) => (
              <li key={school.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => {
                    onAdd(school.id);
                    onQueryChange("");
                  }}
                >
                  <span>{school.name}</span>
                  <small>
                    {school.district} · {school.gradeSpan}
                  </small>
                </button>
              </li>
            ))}
          </ul>
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
