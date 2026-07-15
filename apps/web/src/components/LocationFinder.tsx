import { lazy, Suspense, useMemo, useState } from "react";
import {
  defaultLocationRecommendationOptions,
  gradeBandForGrade,
  GRADE_BAND_LABELS,
  LOCATION_GRADE_OPTIONS,
  LOCATION_PRIORITY_LABELS,
  LOCATION_SCHOOL_TYPE_LABELS,
  recommendSchoolsNearLocation,
  type GradeBand,
  type LocationPriority,
  type LocationRecommendationOptions,
  type LocationSchoolMatch,
} from "../lib/locationRecommendations";
import {
  resolveCaliforniaLocation,
  type ResolvedLocation,
} from "../lib/locationSearch";
import {
  buildLocationShareUrl,
  parseLocationShareUrl,
} from "../lib/locationShare";
import { formatMetricValue } from "../lib/metrics";
import type { PublicManifest, SchoolSummary } from "../types";
import { Icon } from "./Icon";

const LazyLocationRecommendationMap = lazy(() =>
  import("./LocationRecommendationMap").then((module) => ({
    default: module.LocationRecommendationMap,
  })),
);

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
const COVERAGE_OPTIONS = [0.5, 0.7, 0.9, 1];
const PRIORITY_ORDER: LocationPriority[] = [
  "academics",
  "attendance",
  "climate",
  "readiness",
];
const PRIORITY_OPTIONS = [
  { label: "Less", value: 0.5 },
  { label: "Standard", value: 1 },
  { label: "More", value: 1.5 },
  { label: "Highest", value: 2 },
];

interface LocationFinderProps {
  allSchools: SchoolSummary[];
  manifest: PublicManifest;
  onAdd: (schoolId: string) => Promise<void> | void;
  resolveLocation?: typeof resolveCaliforniaLocation;
  selectedSchoolIds: string[];
}

function evidenceItems(match: LocationSchoolMatch) {
  return Object.values(match.evidence)
    .filter(
      ({ metric, reliability, value }) =>
        reliability === "reliable" &&
        value !== null &&
        (match.weights[metric.id] ?? 0) > 0,
    )
    .sort(
      (left, right) =>
        (match.weights[right.metric.id] ?? 0) -
        (match.weights[left.metric.id] ?? 0),
    )
    .slice(0, 4);
}

function gradeLabel(grade: string) {
  return (
    LOCATION_GRADE_OPTIONS.find((option) => option.value === grade)?.label ??
    "Any grade"
  );
}

function PersonalizationControls({
  options,
  onChange,
}: {
  onChange: (options: LocationRecommendationOptions) => void;
  options: LocationRecommendationOptions;
}) {
  const selectedBand = gradeBandForGrade(options.grade);
  return (
    <details className="location-personalization">
      <summary>
        <span>Personalize results</span>
        <small>
          {gradeLabel(options.grade)} ·
          {LOCATION_SCHOOL_TYPE_LABELS[options.schoolType]} ·{" "}
          {Math.round(options.minimumCoverage * 100)}%+ evidence
        </small>
      </summary>
      <div className="location-personalization-body">
        <div className="location-filter-controls">
          <label>
            <span>Child&apos;s grade</span>
            <select
              aria-label="Child's grade"
              onChange={(event) =>
                onChange({ ...options, grade: event.target.value })
              }
              value={options.grade}
            >
              {LOCATION_GRADE_OPTIONS.map((grade) => (
                <option key={grade.value || "any"} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>School type</span>
            <select
              aria-label="Location school type"
              onChange={(event) =>
                onChange({
                  ...options,
                  schoolType: event.target
                    .value as LocationRecommendationOptions["schoolType"],
                })
              }
              value={options.schoolType}
            >
              {Object.entries(LOCATION_SCHOOL_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>Minimum evidence</span>
            <select
              aria-label="Minimum evidence coverage"
              onChange={(event) =>
                onChange({
                  ...options,
                  minimumCoverage: Number(event.target.value),
                })
              }
              value={options.minimumCoverage}
            >
              {COVERAGE_OPTIONS.map((coverage) => (
                <option key={coverage} value={coverage}>
                  {Math.round(coverage * 100)}%+
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="location-priority-controls">
          <legend>Evidence priorities</legend>
          {PRIORITY_ORDER.map((priority) => {
            const disabled =
              priority === "readiness" &&
              selectedBand !== undefined &&
              selectedBand !== "high";
            return (
              <label key={priority}>
                <span>{LOCATION_PRIORITY_LABELS[priority]}</span>
                <select
                  aria-label={`${LOCATION_PRIORITY_LABELS[priority]} priority`}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({
                      ...options,
                      priorityMultipliers: {
                        ...options.priorityMultipliers,
                        [priority]: Number(event.target.value),
                      },
                    })
                  }
                  value={options.priorityMultipliers[priority]}
                >
                  {PRIORITY_OPTIONS.map((priorityOption) => (
                    <option
                      key={priorityOption.value}
                      value={priorityOption.value}
                    >
                      {priorityOption.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </fieldset>
        <button
          className="location-reset-preferences"
          onClick={() => onChange(defaultLocationRecommendationOptions())}
          type="button"
        >
          Reset preferences
        </button>
      </div>
      <p>
        Priorities multiply the published grade-band weights; they do not add
        new data or change source values.
      </p>
    </details>
  );
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
          Evidence {match.availableCount}/{match.totalCount} ·{" "}
          {Math.round((match.availableWeight / match.totalWeight) * 100)}%
        </span>
      </div>
      {match.primaryDriver ? (
        <p className="location-match-explanation">
          Primary driver: {match.primaryDriver.label} ·{" "}
          {Math.round(match.primaryDriver.score)}/100 at{" "}
          {Math.round(match.primaryDriver.weightShare * 100)}% of available
          weight
        </p>
      ) : null}
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
  eligibleCount,
  grade,
  matches,
  nearbyCount,
  ...cardProps
}: {
  band: GradeBand;
  comparisonFull: boolean;
  eligibleCount: number;
  grade: string;
  matches: LocationSchoolMatch[];
  nearbyCount: number;
  onAdd: (schoolId: string) => Promise<void> | void;
  selectedIds: Set<string>;
}) {
  return (
    <section className="location-grade-band" aria-labelledby={`band-${band}`}>
      <div className="location-grade-heading">
        <h3 id={`band-${band}`}>
          {grade
            ? `${gradeLabel(grade)} options`
            : `${GRADE_BAND_LABELS[band]} schools`}
        </h3>
        <span>
          {eligibleCount.toLocaleString()} eligible ·{" "}
          {nearbyCount.toLocaleString()} nearby
        </span>
      </div>
      {matches.length > 0 ? (
        <div
          className={`location-grade-results${grade ? " location-grade-results-row" : ""}`}
        >
          {matches.map((match) => (
            <SchoolMatchCard
              comparisonFull={cardProps.comparisonFull}
              key={match.school.id}
              match={match}
              onAdd={cardProps.onAdd}
              selected={cardProps.selectedIds.has(match.school.id)}
            />
          ))}
        </div>
      ) : (
        <p className="location-grade-empty">
          No schools meet the selected grade, type, and evidence coverage in
          this radius.
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
  const [sharedState] = useState(() =>
    typeof window === "undefined"
      ? undefined
      : parseLocationShareUrl(window.location.href),
  );
  const [query, setQuery] = useState(sharedState?.query ?? "");
  const [radius, setRadius] = useState(sharedState?.radius ?? 10);
  const [options, setOptions] = useState<LocationRecommendationOptions>(
    () => sharedState?.options ?? defaultLocationRecommendationOptions(),
  );
  const [location, setLocation] = useState<ResolvedLocation | undefined>(
    sharedState?.location,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [shareMessage, setShareMessage] = useState<string>();
  const [shareUrl, setShareUrl] = useState<string>();
  const selectedIds = useMemo(
    () => new Set(selectedSchoolIds),
    [selectedSchoolIds],
  );
  const groups = useMemo(
    () =>
      location
        ? recommendSchoolsNearLocation(
            allSchools,
            location,
            radius,
            manifest,
            3,
            options,
          )
        : [],
    [allSchools, location, manifest, options, radius],
  );
  const visibleBands = useMemo(
    () => new Set(groups.map((group) => group.band)),
    [groups],
  );

  function clearShareState() {
    setShareMessage(undefined);
    setShareUrl(undefined);
    if (typeof window === "undefined") {
      return;
    }
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("view") === "nearby") {
      currentUrl.search = "";
      currentUrl.hash = "";
      window.history.replaceState({}, "", currentUrl);
    }
  }

  function updateOptions(nextOptions: LocationRecommendationOptions) {
    setOptions(nextOptions);
    clearShareState();
  }

  async function shareSearch() {
    if (!location || typeof window === "undefined") {
      return;
    }
    const nextShareUrl = buildLocationShareUrl(
      { location, options, query, radius },
      window.location.href,
    );
    window.history.replaceState({}, "", nextShareUrl);
    setShareUrl(nextShareUrl);
    try {
      await navigator.clipboard.writeText(nextShareUrl);
      setShareMessage("Share link copied");
    } catch {
      setShareMessage("Share link ready — copy it below");
    }
  }

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
            clearShareState();
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
                onChange={(event) => {
                  setQuery(event.target.value);
                  clearShareState();
                }}
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
              onChange={(event) => {
                setRadius(Number(event.target.value));
                clearShareState();
              }}
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
        <PersonalizationControls onChange={updateOptions} options={options} />
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
            <div className="location-results-actions">
              <p>
                Evidence matches within <b>{radius} miles</b> for{" "}
                <b>{gradeLabel(options.grade).toLowerCase()}</b> at{" "}
                <b>{Math.round(options.minimumCoverage * 100)}%+ coverage</b>.
                Distance is not part of the score and only breaks ties.
              </p>
              <button onClick={() => void shareSearch()} type="button">
                <Icon name="external" size={12} />
                Copy share link
              </button>
              {shareMessage ? (
                <span className="location-share-status" role="status">
                  {shareMessage}
                </span>
              ) : null}
            </div>
          </div>
          {shareUrl && shareMessage !== "Share link copied" ? (
            <label className="location-share-fallback">
              <span>Share URL</span>
              <input
                aria-label="Location finder share URL"
                onFocus={(event) => event.target.select()}
                readOnly
                value={shareUrl}
              />
            </label>
          ) : null}
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
                {visibleBands.has("elementary") ? (
                  <span>
                    <i className="elementary-dot" />
                    Elementary
                  </span>
                ) : null}
                {visibleBands.has("middle") ? (
                  <span>
                    <i className="middle-dot" />
                    Middle
                  </span>
                ) : null}
                {visibleBands.has("high") ? (
                  <span>
                    <i className="high-dot" />
                    High
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={`location-grade-grid${groups.length === 1 ? " location-grade-grid-single" : ""}`}
            >
              {groups.map((group) => (
                <GradeBandColumn
                  band={group.band}
                  comparisonFull={selectedSchoolIds.length >= 5}
                  eligibleCount={group.eligibleCount}
                  grade={options.grade}
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
              Your priorities multiply these base weights. Only reliable
              latest-year all-student values count. Results need at least{" "}
              {Math.round(options.minimumCoverage * 100)}% of their selected
              evidence weight and one academic indicator. This is an
              experimental local evidence order, not a CDE rating or a claim
              that one school is best for every child. Nearby does not mean
              assigned or eligible.
            </p>
            <p>
              Protected characteristics are not used to rank housing locations.
              Official subgroup outcomes remain available after schools are
              added to comparison.
            </p>
          </details>
          <p className="location-privacy-note">
            Street addresses are sent to the U.S. Census Geocoder through this
            Worker and are not stored by this project. City and ZIP searches use
            approximate centers derived from published school locations. A share
            link contains the displayed search center and is created only when
            you choose Copy share link.
          </p>
        </div>
      ) : null}
    </section>
  );
}
