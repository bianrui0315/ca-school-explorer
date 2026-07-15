import { lazy, Suspense, useMemo, useState } from "react";
import {
  GRADE_BAND_LABELS,
  LOCATION_EVIDENCE_WEIGHTS,
  recommendSchoolsNearLocation,
  type GradeBand,
  type LocationSchoolMatch,
} from "../lib/locationRecommendations";
import {
  resolveCaliforniaLocation,
  type ResolvedLocation,
} from "../lib/locationSearch";
import { formatMetricValue } from "../lib/metrics";
import type { PublicManifest, SchoolSummary } from "../types";
import { Icon } from "./Icon";

const LazyLocationRecommendationMap = lazy(() =>
  import("./LocationRecommendationMap").then((module) => ({
    default: module.LocationRecommendationMap,
  })),
);

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

interface LocationFinderProps {
  allSchools: SchoolSummary[];
  manifest: PublicManifest;
  onAdd: (schoolId: string) => Promise<void> | void;
  resolveLocation?: typeof resolveCaliforniaLocation;
  selectedSchoolIds: string[];
}

function evidenceItems(match: LocationSchoolMatch) {
  const weights = LOCATION_EVIDENCE_WEIGHTS[match.band];
  return Object.values(match.evidence)
    .filter(
      ({ metric, reliability, value }) =>
        reliability === "reliable" &&
        value !== null &&
        (weights[metric.id] ?? 0) > 0,
    )
    .sort(
      (left, right) =>
        (weights[right.metric.id] ?? 0) - (weights[left.metric.id] ?? 0),
    )
    .slice(0, 4);
}

function SchoolMatchCard({
  match,
  onAdd,
  selected,
  comparisonFull,
}: {
  comparisonFull: boolean;
  match: LocationSchoolMatch;
  onAdd: (schoolId: string) => Promise<void> | void;
  selected: boolean;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <article className="location-school-card">
      <div className="location-school-card-header">
        <div>
          <h4>{match.school.name}</h4>
          <p>
            {match.school.district} · {match.school.gradeSpan}
          </p>
        </div>
        <strong>{Math.round(match.score ?? 0)}</strong>
      </div>
      <div className="location-match-meta">
        <span>
          <Icon name="mapPin" size={12} />
          {match.distanceMiles.toFixed(1)} mi
        </span>
        <span>
          Evidence {match.availableCount}/{match.totalCount}
        </span>
        {!match.comparable ? <em>Limited evidence</em> : null}
      </div>
      <dl className="location-evidence-list">
        {evidenceItems(match).map(({ metric, value, year }) => (
          <div key={metric.id}>
            <dt>{metric.navLabel}</dt>
            <dd>
              {formatMetricValue(value, metric, metric.unit === "points")}
              <small>
                {year}–{String(year + 1).slice(-2)}
              </small>
            </dd>
          </div>
        ))}
      </dl>
      <button
        disabled={selected || comparisonFull || adding}
        onClick={async () => {
          setAdding(true);
          try {
            await onAdd(match.school.id);
          } finally {
            setAdding(false);
          }
        }}
        type="button"
      >
        {selected
          ? "Added to comparison"
          : comparisonFull
            ? "Comparison full"
            : adding
              ? "Adding…"
              : "Add to comparison"}
      </button>
    </article>
  );
}

function GradeBandColumn({
  band,
  matches,
  nearbyCount,
  ...cardProps
}: {
  band: GradeBand;
  comparisonFull: boolean;
  matches: LocationSchoolMatch[];
  nearbyCount: number;
  onAdd: (schoolId: string) => Promise<void> | void;
  selectedIds: Set<string>;
}) {
  return (
    <section className="location-grade-band" aria-labelledby={`band-${band}`}>
      <div className="location-grade-heading">
        <h3 id={`band-${band}`}>{GRADE_BAND_LABELS[band]} schools</h3>
        <span>{nearbyCount.toLocaleString()} considered</span>
      </div>
      {matches.length > 0 ? (
        matches.map((match) => (
          <SchoolMatchCard
            comparisonFull={cardProps.comparisonFull}
            key={match.school.id}
            match={match}
            onAdd={cardProps.onAdd}
            selected={cardProps.selectedIds.has(match.school.id)}
          />
        ))
      ) : (
        <p className="location-grade-empty">
          No schools with usable evidence were found in this radius.
        </p>
      )}
    </section>
  );
}

export function LocationFinder({
  allSchools,
  manifest,
  onAdd,
  resolveLocation = resolveCaliforniaLocation,
  selectedSchoolIds,
}: LocationFinderProps) {
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(10);
  const [location, setLocation] = useState<ResolvedLocation>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const selectedIds = useMemo(
    () => new Set(selectedSchoolIds),
    [selectedSchoolIds],
  );
  const groups = useMemo(
    () =>
      location
        ? recommendSchoolsNearLocation(allSchools, location, radius, manifest)
        : [],
    [allSchools, location, manifest, radius],
  );

  return (
    <section
      className="location-finder"
      aria-labelledby="location-finder-title"
    >
      <div className="location-finder-intro">
        <div>
          <h2 id="location-finder-title">Find schools near a new place</h2>
          <p>
            Enter a California work address, city, or ZIP to see transparent
            evidence matches by school level.
          </p>
        </div>
        <form
          className="location-search-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (query.trim().length < 2) {
              setError("Enter a California address, city, or ZIP.");
              return;
            }
            setLoading(true);
            setError(undefined);
            try {
              setLocation(await resolveLocation(query, allSchools));
            } catch (caught) {
              setLocation(undefined);
              setError(
                caught instanceof Error
                  ? caught.message
                  : "The location could not be resolved.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="location-address-field">
            <span>Work address or place</span>
            <div>
              <Icon name="mapPin" size={17} />
              <input
                aria-label="Work address or California place"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="12450 Mason Ave, Porter Ranch, CA 91326"
                type="search"
                value={query}
              />
            </div>
          </label>
          <label className="location-radius-field">
            <span>Radius</span>
            <select
              aria-label="Location search radius"
              onChange={(event) => setRadius(Number(event.target.value))}
              value={radius}
            >
              {RADIUS_OPTIONS.map((miles) => (
                <option key={miles} value={miles}>
                  {miles} mi
                </option>
              ))}
            </select>
          </label>
          <button disabled={loading} type="submit">
            {loading ? "Finding…" : "Find schools"}
          </button>
        </form>
      </div>

      {error ? (
        <p className="location-search-error" role="alert">
          {error}
        </p>
      ) : null}

      {location ? (
        <div className="location-results">
          <div className="location-results-summary">
            <div>
              <span>Search center</span>
              <strong>{location.matchedAddress}</strong>
              <small>
                {location.provider}
                {location.approximate ? " · Approximate center" : ""}
              </small>
            </div>
            <p>
              Strongest evidence matches within <b>{radius} miles</b>. Distance
              is not part of the score and only breaks ties.
            </p>
          </div>
          <div className="location-results-layout">
            <div className="location-map-panel">
              <Suspense
                fallback={<div className="map-fallback">Loading map…</div>}
              >
                <LazyLocationRecommendationMap
                  groups={groups}
                  location={location}
                />
              </Suspense>
              <div className="location-map-legend">
                <span>
                  <i className="location-center-dot" />
                  Search location
                </span>
                <span>
                  <i className="elementary-dot" />
                  Elementary
                </span>
                <span>
                  <i className="middle-dot" />
                  Middle
                </span>
                <span>
                  <i className="high-dot" />
                  High
                </span>
              </div>
            </div>
            <div className="location-grade-grid">
              {groups.map((group) => (
                <GradeBandColumn
                  band={group.band}
                  comparisonFull={selectedSchoolIds.length >= 5}
                  key={group.band}
                  matches={group.results}
                  nearbyCount={group.nearbyCount}
                  onAdd={onAdd}
                  selectedIds={selectedIds}
                />
              ))}
            </div>
          </div>
          <details className="location-methodology">
            <summary>How these matches are ordered</summary>
            <p>
              Elementary and middle: ELA 35%, mathematics 35%, chronic absence
              20%, suspension 10%. High school: ELA 20%, mathematics 20%, A–G
              15%, graduation 15%, chronic absence 10%, dropout 10%, suspension
              10%.
            </p>
            <p>
              Only reliable latest-year all-student values count. Results need
              at least half of their evidence weight and one academic indicator
              to be marked comparable. This is an experimental local evidence
              order, not a CDE rating or a claim that one school is best for
              every child. Nearby does not mean assigned or eligible.
            </p>
          </details>
          <p className="location-privacy-note">
            Street addresses are sent to the U.S. Census Geocoder through this
            Worker and are not stored by this project. City and ZIP searches use
            approximate centers derived from published school locations.
          </p>
        </div>
      ) : null}
    </section>
  );
}
