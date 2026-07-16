import { lazy, Suspense, useMemo, useState } from "react";
import {
  formatMetricValue,
  formatSchoolYear,
  latestObservation,
  reliabilityLabel,
} from "../lib/metrics";
import { searchSchools } from "../lib/schoolSearch";
import {
  directoryFlags,
  studentsPerReportedTeacher,
} from "../lib/schoolProfile";
import type {
  DistrictDetail,
  MetricDefinition,
  Observation,
  PublicCatalog,
  ResourceObservation,
  School,
  SchoolResources,
  SchoolSummary,
} from "../types";
import { Icon } from "./Icon";
import { TrendChart } from "./TrendChart";

const LazySchoolMap = lazy(() =>
  import("./SchoolMap").then((module) => ({ default: module.SchoolMap })),
);

interface SchoolProfileProps {
  catalog: PublicCatalog;
  comparisonIsFull: boolean;
  district?: DistrictDetail;
  isInComparison: boolean;
  onAddToComparison: () => Promise<void> | void;
  onOpenComparison: () => void;
  onOpenProfile: (schoolId: string) => void;
  onOpenResources: () => Promise<void> | void;
  resources?: SchoolResources;
  resourcesLoading: boolean;
  school: School;
}

interface SchoolProfileNotFoundProps {
  catalog: PublicCatalog;
  onOpenComparison: () => void;
  onOpenProfile: (schoolId: string) => void;
}

const ELEMENTARY_PRIORITY = [
  "ela_distance_from_standard",
  "math_distance_from_standard",
  "chronic_absenteeism_rate",
  "suspension_rate",
  "four_year_graduation_rate",
  "college_career_prepared_rate",
  "a_g_completion_rate",
  "college_going_rate_12_month",
  "four_year_dropout_rate",
];

const HIGH_SCHOOL_PRIORITY = [
  "four_year_graduation_rate",
  "college_career_prepared_rate",
  "a_g_completion_rate",
  "college_going_rate_12_month",
  "ela_distance_from_standard",
  "math_distance_from_standard",
  "four_year_dropout_rate",
  "chronic_absenteeism_rate",
  "suspension_rate",
];

const PROFILE_SECTIONS = [
  ["profile-overview", "Overview"],
  ["profile-outcomes", "Outcomes"],
  ["profile-groups", "Student groups"],
  ["profile-teaching", "Teaching"],
  ["profile-location", "Location"],
  ["profile-sources", "Sources"],
] as const;

const DEMOGRAPHIC_CONTEXT = [
  ["English Learner", "English learners", "users"],
  ["Students with Disabilities", "Students with disabilities", "school"],
  [
    "Socioeconomically Disadvantaged",
    "Socioeconomically disadvantaged",
    "users",
  ],
] as const;

function formatAddress(school: School) {
  return `${school.address.street}, ${school.address.city}, ${school.address.state} ${school.address.zip}`;
}

function formatCount(value: number | null) {
  return value === null ? "Not reported" : value.toLocaleString();
}

function metricTone(metricId: string) {
  if (metricId === "ela_distance_from_standard") return "green";
  if (metricId === "math_distance_from_standard") return "blue";
  if (metricId === "chronic_absenteeism_rate") return "purple";
  if (metricId === "suspension_rate") return "orange";
  return "navy";
}

function metricIcon(metricId: string) {
  if (metricId === "ela_distance_from_standard") return "book" as const;
  if (metricId === "math_distance_from_standard") return "pathways" as const;
  if (metricId === "chronic_absenteeism_rate") return "attendance" as const;
  if (metricId === "suspension_rate") return "school" as const;
  return "pathways" as const;
}

function metricValuePhrase(
  observation: Observation | undefined,
  metric: MetricDefinition,
) {
  if (!observation || observation.value === null) return "Not available";
  if (metric.unit === "points") {
    const absolute = Math.abs(Math.round(observation.value));
    if (observation.value === 0) return "At standard";
    return `${absolute} points ${observation.value > 0 ? "above" : "below"} standard`;
  }
  return formatMetricValue(observation.value, metric);
}

function MiniTrend({
  metric,
  observations,
}: {
  metric: MetricDefinition;
  observations: Observation[];
}) {
  const points = observations
    .filter((observation) => observation.value !== null)
    .slice(-3);
  if (points.length === 0) {
    return <span className="profile-no-trend">No trend</span>;
  }
  const values = points.map((point) => point.value as number);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const coordinates = points.map((point, index) => ({
    point,
    x: points.length === 1 ? 64 : 7 + (index * 114) / (points.length - 1),
    y: 31 - (((point.value as number) - minimum) / range) * 22,
  }));
  const path = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  return (
    <span
      className={`profile-mini-trend profile-tone--${metricTone(metric.id)}`}
    >
      <svg
        aria-label={`${metric.navLabel} three-year trend`}
        role="img"
        viewBox="0 0 128 40"
      >
        <path d={path} />
        {coordinates.map(({ point, x, y }) => (
          <circle cx={x} cy={y} key={point.year} r="3.5">
            <title>
              {formatSchoolYear(point.year)}:{" "}
              {formatMetricValue(point.value, metric)}
            </title>
          </circle>
        ))}
      </svg>
      <small>
        {points
          .map((point) => formatSchoolYear(point.year).slice(2))
          .join(" · ")}
      </small>
    </span>
  );
}

function resourceLatest(
  resources: SchoolResources | undefined,
  metricId: string,
  dimension: string,
) {
  return resources?.metrics[metricId]?.[dimension]?.at(-1);
}

function latestClassRange(resources: SchoolResources | undefined) {
  const dimensions = resources?.metrics.average_class_size ?? {};
  const observations = Object.values(dimensions)
    .map((items) => items.at(-1))
    .filter((item): item is ResourceObservation => Boolean(item));
  if (observations.length === 0) return undefined;
  const schoolYear = observations.reduce(
    (latestYear, observation) =>
      observation.schoolYear > latestYear ? observation.schoolYear : latestYear,
    observations[0]!.schoolYear,
  );
  const values = observations
    .filter((observation) => observation.schoolYear === schoolYear)
    .map((observation) => observation.value);
  return {
    schoolYear,
    value: `${Math.min(...values).toLocaleString()}–${Math.max(...values).toLocaleString()}`,
  };
}

function SchoolProfileSearch({
  allSchools,
  onOpenProfile,
}: {
  allSchools: SchoolSummary[];
  onOpenProfile: (schoolId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () =>
      query.trim().length < 2
        ? []
        : searchSchools(allSchools, query, {
            county: "",
            city: "",
            grade: "",
          }).slice(0, 6),
    [allSchools, query],
  );
  return (
    <div className="profile-search">
      <label>
        <span className="visually-hidden">Find another school</span>
        <Icon name="search" size={18} />
        <input
          aria-autocomplete="list"
          aria-controls={
            matches.length > 0 ? "profile-search-results" : undefined
          }
          aria-expanded={matches.length > 0}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find another school"
          type="search"
          value={query}
        />
      </label>
      {matches.length > 0 ? (
        <ul id="profile-search-results" role="listbox">
          {matches.map((match) => (
            <li aria-selected="false" key={match.id} role="option">
              <button
                onClick={() => {
                  setQuery("");
                  onOpenProfile(match.id);
                }}
                type="button"
              >
                <span>{match.name}</span>
                <small>
                  {match.district} · {match.city}
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SchoolProfile({
  catalog,
  comparisonIsFull,
  district,
  isInComparison,
  onAddToComparison,
  onOpenComparison,
  onOpenProfile,
  onOpenResources,
  resources,
  resourcesLoading,
  school,
}: SchoolProfileProps) {
  const endYear = Math.max(
    ...catalog.manifest.outcomeSchoolYears.map((year) =>
      Number.parseInt(year.slice(0, 4), 10),
    ),
  );
  const hasHighSchoolOutcomes = HIGH_SCHOOL_PRIORITY.slice(0, 4).some(
    (metricId) =>
      latestObservation(school.metrics[metricId]?.all ?? [], endYear)?.value !==
        null &&
      latestObservation(school.metrics[metricId]?.all ?? [], endYear)?.value !==
        undefined,
  );
  const metricById = new Map(
    catalog.manifest.metrics.map((metric) => [metric.id, metric]),
  );
  const availableMetrics = (
    hasHighSchoolOutcomes ? HIGH_SCHOOL_PRIORITY : ELEMENTARY_PRIORITY
  ).flatMap((metricId) => {
    const metric = metricById.get(metricId);
    const latest = latestObservation(
      school.metrics[metricId]?.all ?? [],
      endYear,
    );
    return metric && latest?.value !== null && latest?.value !== undefined
      ? [metric]
      : [];
  });
  const snapshotMetrics = availableMetrics.slice(0, 4);
  const [selectedMetricId, setSelectedMetricId] = useState(
    snapshotMetrics[0]?.id ?? catalog.manifest.metrics[0]?.id ?? "",
  );
  const selectedMetric =
    availableMetrics.find((metric) => metric.id === selectedMetricId) ??
    availableMetrics[0] ??
    catalog.manifest.metrics[0];
  const subgroupOptions = selectedMetric
    ? catalog.manifest.subgroups.filter(
        (subgroup) =>
          (school.metrics[selectedMetric.id]?.[subgroup.id] ?? []).length > 0,
      )
    : [];
  const [subgroupId, setSubgroupId] = useState("all");
  const effectiveSubgroup = subgroupOptions.some(
    (subgroup) => subgroup.id === subgroupId,
  )
    ? subgroupId
    : (subgroupOptions[0]?.id ?? "all");
  const selectedObservations = selectedMetric
    ? (school.metrics[selectedMetric.id]?.[effectiveSubgroup] ?? [])
    : [];
  const selectedLatest = latestObservation(selectedObservations, endYear);
  const districtBaseline = selectedMetric
    ? (district?.metrics[selectedMetric.id]?.[effectiveSubgroup] ?? [])
    : [];
  const ratio = studentsPerReportedTeacher(school);
  const flags = directoryFlags(school);
  const [shareMessage, setShareMessage] = useState<string>();
  const teacherAverage = resourceLatest(
    resources,
    "teacher_experience_average",
    "total",
  );
  const districtTeacherAverage = resourceLatest(
    resources,
    "teacher_experience_average",
    "district",
  );
  const credentialed = resourceLatest(
    resources,
    "teacher_assignment_percent",
    "fully_credentialed",
  );
  const counselorRatio = resourceLatest(
    resources,
    "pupils_per_academic_counselor",
    "all_students",
  );
  const classRange = latestClassRange(resources);
  const sources = useMemo(() => {
    const links = [
      ...catalog.manifest.metrics.map((metric) => ({
        label: metric.sourceLabel,
        url: metric.sourceUrl,
      })),
      ...(catalog.manifest.resourceMetrics ?? []).map((metric) => ({
        label: metric.sourceLabel,
        url: metric.sourceUrl,
      })),
    ];
    return [...new Map(links.map((link) => [link.url, link])).values()];
  }, [catalog.manifest.metrics, catalog.manifest.resourceMetrics]);

  const copyProfile = async () => {
    const url = `${window.location.origin}/school/${school.id}`;
    window.history.replaceState({}, "", url);
    try {
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("Clipboard timed out.")),
            1000,
          ),
        ),
      ]);
      setShareMessage("Profile link copied");
    } catch {
      setShareMessage("Profile link is ready in the address bar");
    }
  };

  return (
    <main className="school-profile-page">
      <section className="profile-identity">
        <div className="profile-identity-copy">
          <p className="profile-breadcrumb">
            Schools <span>/</span> {school.district}
          </p>
          <h1>{school.name}</h1>
          <strong>{school.district}</strong>
          <address>
            <Icon name="mapPin" size={19} />
            {formatAddress(school)}
          </address>
          <div className="profile-identity-facts">
            <span>
              <Icon name="school" size={19} /> {school.gradeSpan}
            </span>
            <span>
              <Icon name="book" size={19} /> {school.schoolType}
            </span>
            <span>
              <Icon name="users" size={19} /> {formatCount(school.enrollment)}{" "}
              students
            </span>
            <span className="profile-teacher-fact">
              <Icon name="users" size={19} />{" "}
              {formatCount(school.staff.teachers)} reported teachers
            </span>
          </div>
          {flags.length > 0 ? (
            <div
              className="profile-directory-flags"
              aria-label="Directory designations"
            >
              {flags.map((flag) => (
                <span key={flag}>{flag}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="profile-actions">
          <SchoolProfileSearch
            allSchools={catalog.schools}
            onOpenProfile={onOpenProfile}
          />
          <div>
            <button
              className="profile-primary-action"
              disabled={!isInComparison && comparisonIsFull}
              onClick={() =>
                isInComparison ? onOpenComparison() : void onAddToComparison()
              }
              type="button"
            >
              <Icon name={isInComparison ? "chevronRight" : "plus"} size={18} />
              {isInComparison
                ? "Open comparison"
                : comparisonIsFull
                  ? "Comparison is full"
                  : "Add to compare"}
            </button>
            <button onClick={() => void copyProfile()} type="button">
              <Icon name="external" size={17} /> Copy profile link
            </button>
          </div>
          {shareMessage ? <p role="status">{shareMessage}</p> : null}
        </div>
      </section>

      <nav className="profile-section-nav" aria-label="School profile sections">
        {PROFILE_SECTIONS.map(([id, label], index) => (
          <a
            aria-current={index === 0 ? "location" : undefined}
            href={`#${id}`}
            key={id}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="profile-report" id="profile-overview">
        <section
          className="profile-status-strip"
          aria-label="Profile data years"
        >
          <div>
            <span className="profile-status-check">
              <Icon name="check" size={17} />
            </span>
            <span>
              <strong>Official public data</strong>
              <small>Release {catalog.manifest.release}</small>
            </span>
          </div>
          <div>
            <Icon name="calendar" size={19} />
            <span>
              <strong>
                {catalog.manifest.profileSchoolYears.at(-1)} directory
              </strong>
              <small>Latest available</small>
            </span>
          </div>
          <div>
            <Icon name="pathways" size={19} />
            <span>
              <strong>
                {catalog.manifest.outcomeSchoolYears[0]?.slice(0, 4)}–
                {catalog.manifest.outcomeSchoolYears.at(-1)?.slice(-2)} outcomes
              </strong>
              <small>Latest available by measure</small>
            </span>
          </div>
        </section>

        <div className="profile-overview-layout">
          <section className="profile-panel profile-outcome-snapshot">
            <header>
              <h2>Latest outcome context</h2>
              <span>
                Context, not a rating. <Icon name="info" size={16} />
              </span>
            </header>
            <div className="profile-outcome-heading" aria-hidden="true">
              <span>Measure</span>
              <span>Year</span>
              <span>Three-year trend</span>
              <span>Reliability</span>
              <span>Same district reference</span>
            </div>
            <div className="profile-outcome-rows">
              {snapshotMetrics.map((metric) => {
                const observations = school.metrics[metric.id]?.all ?? [];
                const latest = latestObservation(observations, endYear);
                const districtLatest = latestObservation(
                  district?.metrics[metric.id]?.all ?? [],
                  endYear,
                );
                return (
                  <button
                    className={`profile-outcome-row profile-tone--${metricTone(metric.id)}`}
                    key={metric.id}
                    onClick={() => {
                      setSelectedMetricId(metric.id);
                      document
                        .getElementById("profile-outcomes")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    type="button"
                  >
                    <span className="profile-outcome-measure">
                      <i>
                        <Icon name={metricIcon(metric.id)} size={20} />
                      </i>
                      <span>
                        <strong>{metric.navLabel}</strong>
                        <small>{metricValuePhrase(latest, metric)}</small>
                      </span>
                    </span>
                    <span>{latest ? formatSchoolYear(latest.year) : "—"}</span>
                    <MiniTrend metric={metric} observations={observations} />
                    <span className="profile-reliability">
                      {reliabilityLabel(latest)}
                    </span>
                    <span className="profile-district-value">
                      <small>{district?.name ?? "Same district"}</small>
                      <strong>
                        {formatMetricValue(districtLatest?.value, metric)}
                      </strong>
                    </span>
                    <Icon name="chevronRight" size={18} />
                  </button>
                );
              })}
            </div>
            <p className="profile-panel-note">
              Values retain each official reporting year. Suppressed results
              remain hidden.
            </p>
          </section>

          <aside className="profile-panel profile-school-context">
            <h2>School context</h2>
            <dl>
              <div>
                <dt>
                  Enrollment ({catalog.manifest.profileSchoolYears.at(-1)})
                </dt>
                <dd>{formatCount(school.enrollment)}</dd>
              </div>
              <div>
                <dt>
                  Reported teachers (
                  {catalog.manifest.profileSchoolYears.at(-1)})
                </dt>
                <dd>{formatCount(school.staff.teachers)}</dd>
              </div>
              <div>
                <dt>Students per reported teacher</dt>
                <dd>
                  {ratio === undefined ? "Not available" : ratio.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt>
                  Total reported staff (
                  {catalog.manifest.profileSchoolYears.at(-1)})
                </dt>
                <dd>{formatCount(school.staff.total)}</dd>
              </div>
            </dl>
            <div className="profile-context-map">
              <span>
                <Icon name="mapPin" size={17} /> School location
              </span>
              <Suspense
                fallback={<div className="map-fallback">Loading map…</div>}
              >
                <LazySchoolMap schools={[school]} />
              </Suspense>
            </div>
          </aside>
        </div>

        {selectedMetric ? (
          <section
            className="profile-panel profile-outcome-details"
            id="profile-outcomes"
          >
            <div className="profile-section-header">
              <div>
                <h2>Outcome details</h2>
                <p>
                  Explore one indicator and student group without changing this
                  profile URL.
                </p>
              </div>
              <span>Compared with {district?.name ?? "the same district"}</span>
            </div>
            <div className="profile-detail-controls">
              <label>
                <span>Indicator</span>
                <select
                  aria-label="Profile indicator"
                  onChange={(event) => setSelectedMetricId(event.target.value)}
                  value={selectedMetric.id}
                >
                  {availableMetrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.navLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Student group</span>
                <select
                  aria-label="Profile student group"
                  onChange={(event) => setSubgroupId(event.target.value)}
                  value={effectiveSubgroup}
                >
                  {subgroupOptions.map((subgroup) => (
                    <option key={subgroup.id} value={subgroup.id}>
                      {subgroup.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="profile-detail-grid">
              <TrendChart
                baseline={districtBaseline}
                baselineLabel={district?.name}
                endYear={endYear}
                metric={selectedMetric}
                schools={[school]}
                startYear={Math.max(endYear - 2, 0)}
                subgroup={effectiveSubgroup}
              />
              <aside className="profile-reading-guide">
                <h3>
                  <Icon name="book" size={20} /> How to read this
                </h3>
                <div>
                  <strong>Direction</strong>
                  <p>
                    {selectedMetric.direction === "higher"
                      ? "Higher values are generally more favorable for this measure."
                      : selectedMetric.direction === "lower"
                        ? "Lower values are generally more favorable for this measure."
                        : "This measure is descriptive and has no preferred direction."}
                  </p>
                </div>
                <div>
                  <strong>Reliability</strong>
                  <p>
                    {reliabilityLabel(selectedLatest)} based on the published
                    result.
                  </p>
                </div>
                <div>
                  <strong>Reporting year</strong>
                  <p>
                    {selectedLatest
                      ? `${formatSchoolYear(selectedLatest.year)} is the latest available year for this selection.`
                      : "No public value is available for this selection."}
                  </p>
                </div>
              </aside>
            </div>
          </section>
        ) : null}

        <section
          className="profile-panel profile-student-groups"
          id="profile-groups"
        >
          <div className="profile-section-header">
            <div>
              <h2>Student groups</h2>
              <p>
                Directory context describes who is served. It is not a quality
                measure.
              </p>
            </div>
            <span>
              <Icon name="info" size={15} /> Small groups may be suppressed to
              protect student privacy.
            </span>
          </div>
          <div className="profile-demographic-band">
            {DEMOGRAPHIC_CONTEXT.map(([key, label, icon]) => {
              const value = school.demographics[key];
              return (
                <div key={key}>
                  <i>
                    <Icon name={icon} size={22} />
                  </i>
                  <span>
                    <strong>{label}</strong>
                    <small>{catalog.manifest.profileSchoolYears.at(-1)}</small>
                  </span>
                  <b>
                    {value?.percent === null || value?.percent === undefined
                      ? "Not reported"
                      : `${value.percent.toFixed(1)}%`}
                  </b>
                </div>
              );
            })}
          </div>
          <p className="profile-panel-note">
            Use the student-group control above to review matching outcome
            evidence where published.
          </p>
        </section>

        <section
          className="profile-panel profile-teaching"
          id="profile-teaching"
        >
          <div className="profile-section-header">
            <div>
              <h2>Teaching and resources</h2>
              <p>Each measure keeps its own official reporting year.</p>
            </div>
            <button onClick={() => void onOpenResources()} type="button">
              Open full teaching comparison <Icon name="external" size={14} />
            </button>
          </div>
          {resourcesLoading ? (
            <p className="profile-resource-loading" role="status">
              Loading teaching and resource context…
            </p>
          ) : (
            <div className="profile-teaching-layout">
              <dl className="profile-teaching-facts">
                <div>
                  <dt>Average teacher experience</dt>
                  <dd>
                    {teacherAverage
                      ? `${teacherAverage.value.toFixed(1)} years`
                      : "Not reported"}
                  </dd>
                  <small>
                    {teacherAverage?.schoolYear ?? "Year unavailable"}
                  </small>
                </div>
                <div>
                  <dt>Fully credentialed assignments</dt>
                  <dd>
                    {credentialed
                      ? `${credentialed.value.toFixed(1)}%`
                      : "Not reported"}
                  </dd>
                  <small>
                    {credentialed?.schoolYear ?? "Year unavailable"}
                  </small>
                </div>
                <div>
                  <dt>Reported class-size range</dt>
                  <dd>{classRange?.value ?? "Not reported"}</dd>
                  <small>
                    {classRange?.schoolYear ?? "Year unavailable"} · students
                  </small>
                </div>
                <div>
                  <dt>Pupils per academic counselor</dt>
                  <dd>
                    {counselorRatio
                      ? Math.round(counselorRatio.value).toLocaleString()
                      : "Not reported"}
                  </dd>
                  <small>
                    {counselorRatio?.schoolYear ?? "Year unavailable"}
                  </small>
                </div>
              </dl>
              <div className="profile-teacher-comparison">
                <h3>Teacher experience context</h3>
                <p>Average reported years of experience</p>
                {[teacherAverage, districtTeacherAverage].map(
                  (observation, index) => (
                    <div key={index === 0 ? "school" : "district"}>
                      <span>{index === 0 ? school.name : school.district}</span>
                      <i>
                        <b
                          style={{
                            width: `${Math.min(((observation?.value ?? 0) / 20) * 100, 100)}%`,
                          }}
                        />
                      </i>
                      <strong>
                        {observation ? observation.value.toFixed(1) : "—"}
                      </strong>
                    </div>
                  ),
                )}
                <small>
                  Descriptive context, not a rating or class-size measure.
                </small>
              </div>
            </div>
          )}
        </section>

        <section
          className="profile-panel profile-location"
          id="profile-location"
        >
          <div className="profile-section-header">
            <div>
              <h2>Location and district</h2>
              <p>Published coordinates support orientation only.</p>
            </div>
            <span>
              <Icon name="info" size={15} /> Nearby does not mean assigned.
            </span>
          </div>
          <div className="profile-location-layout">
            <Suspense
              fallback={<div className="map-fallback">Loading map…</div>}
            >
              <LazySchoolMap schools={[school]} />
            </Suspense>
            <dl>
              <div>
                <dt>Address</dt>
                <dd>{formatAddress(school)}</dd>
              </div>
              <div>
                <dt>District</dt>
                <dd>{school.district}</dd>
              </div>
              <div>
                <dt>County</dt>
                <dd>{school.county} County</dd>
              </div>
              <div>
                <dt>CDS code</dt>
                <dd>{school.id}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="profile-panel profile-sources" id="profile-sources">
          <div className="profile-section-header">
            <div>
              <h2>Sources and limitations</h2>
              <p>
                Official files are shown with their actual reporting years and
                suppression rules.
              </p>
            </div>
            <span>
              Updated{" "}
              {new Date(catalog.manifest.generatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="profile-source-layout">
            <div>
              <h3>Primary sources</h3>
              {sources.map((source) => (
                <a
                  href={source.url}
                  key={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.label} <Icon name="external" size={13} />
                </a>
              ))}
            </div>
            <div>
              <h3>Read with care</h3>
              <p>
                Missing and suppressed values are never reconstructed as zero.
                Different sections may use different reporting years. School
                context does not establish causation, assignment, or enrollment
                eligibility.
              </p>
              <p>
                This independent open-source project is not affiliated with or
                endorsed by the California Department of Education.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SchoolProfileNotFound({
  catalog,
  onOpenComparison,
  onOpenProfile,
}: SchoolProfileNotFoundProps) {
  return (
    <main className="profile-not-found">
      <Icon name="school" size={38} />
      <h1>School profile not found</h1>
      <p>
        This CDS code is not in the current public-school directory. Search for
        another school or return to comparison.
      </p>
      <SchoolProfileSearch
        allSchools={catalog.schools}
        onOpenProfile={onOpenProfile}
      />
      <button onClick={onOpenComparison} type="button">
        Return to comparison
      </button>
    </main>
  );
}
