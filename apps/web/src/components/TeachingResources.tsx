import { useMemo, useState, type CSSProperties } from "react";
import type {
  PublicCatalog,
  ResourceObservation,
  School,
  SchoolResources,
} from "../types";
import { Icon } from "./Icon";
import { SchoolPicker } from "./SchoolPicker";

interface TeachingResourcesProps {
  catalog: PublicCatalog;
  selectedSchools: School[];
  resources: Map<string, SchoolResources>;
  resourcesLoading: boolean;
  query: string;
  filterQuery: string;
  onQueryChange: (query: string) => void;
  onAdd: (schoolId: string) => Promise<void> | void;
  onRemove: (schoolId: string) => void;
  onClear: () => void;
}

const PREPARATION_DIMENSIONS = [
  ["fully_credentialed", "Fully credentialed"],
  ["intern", "Intern"],
  ["without_credentials_or_misassigned", "Without credentials or misassigned"],
  ["out_of_field", "Out-of-field"],
  ["unknown", "Unknown"],
] as const;

const CLASS_DIMENSIONS = [
  ["grade_k", "Kindergarten"],
  ["grade_1", "Grade 1"],
  ["grade_2", "Grade 2"],
  ["grade_3", "Grade 3"],
  ["grade_4", "Grade 4"],
  ["grade_5", "Grade 5"],
  ["grade_6", "Grade 6"],
  ["grade_other", "Other elementary"],
  ["subject_english", "English"],
  ["subject_mathematics", "Mathematics"],
  ["subject_science", "Science"],
  ["subject_social_science", "Social science"],
] as const;

const SUPPORT_DIMENSIONS = [
  ["counselor", "Counselor"],
  ["psychologist", "Psychologist"],
  ["social_worker", "Social worker"],
  ["nurse", "Nurse"],
  ["speech_language_hearing_specialist", "Speech/language/hearing specialist"],
  ["library_media_teacher", "Library media teacher"],
  ["library_services_staff", "Library services staff"],
  ["resource_specialist", "Resource specialist"],
  ["other", "Other support staff"],
] as const;

function schoolStyle(color: string) {
  return { "--school-color": color } as CSSProperties;
}

function latest(
  resources: SchoolResources | undefined,
  metricId: string,
  dimension: string,
  schoolYear?: string,
) {
  const observations = resources?.metrics[metricId]?.[dimension] ?? [];
  if (schoolYear) {
    return observations.find(
      (observation) => observation.schoolYear === schoolYear,
    );
  }
  return observations.at(-1);
}

function formatValue(
  observation: ResourceObservation | undefined,
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 1 },
) {
  return observation
    ? new Intl.NumberFormat("en-US", options).format(observation.value)
    : "Not reported";
}

function experiencePercent(resources: SchoolResources | undefined) {
  const experienced = latest(
    resources,
    "teacher_experience_count",
    "experienced",
  );
  const total = latest(resources, "teacher_experience_count", "total");
  if (!experienced || !total || total.value <= 0) {
    return undefined;
  }
  return (experienced.value * 100) / total.value;
}

function assignmentFte(
  resources: SchoolResources | undefined,
  schoolYear: string,
) {
  const observation = latest(
    resources,
    "teacher_assignment_percent",
    "fully_credentialed",
    schoolYear,
  );
  return observation?.denominator === null ||
    observation?.denominator === undefined
    ? "Not reported"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
        observation.denominator,
      );
}

function latestClassRange(resources: SchoolResources | undefined) {
  const dimensions = resources?.metrics.average_class_size ?? {};
  const observations = Object.values(dimensions)
    .map((items) => items.at(-1))
    .filter((item): item is ResourceObservation => Boolean(item));
  if (observations.length === 0) {
    return undefined;
  }
  const latestYear = observations.reduce(
    (year, item) => (item.schoolYear > year ? item.schoolYear : year),
    observations[0]!.schoolYear,
  );
  const values = observations
    .filter((item) => item.schoolYear === latestYear)
    .map((item) => item.value);
  return {
    year: latestYear,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  };
}

function SchoolColumns({ schools }: { schools: School[] }) {
  return (
    <>
      {schools.map((school) => (
        <div className="resource-school-heading" key={school.id}>
          <i style={{ background: school.color }} />
          <span>
            <strong>{school.name}</strong>
            <small>{school.district}</small>
          </span>
        </div>
      ))}
    </>
  );
}

export function TeachingResources({
  catalog,
  selectedSchools,
  resources,
  resourcesLoading,
  query,
  filterQuery,
  onQueryChange,
  onAdd,
  onRemove,
  onClear,
}: TeachingResourcesProps) {
  const [classYear, setClassYear] = useState("2024-25");
  const [preparationYear, setPreparationYear] = useState("2023-24");
  const classYears = useMemo(
    () =>
      [
        ...new Set(
          [...resources.values()].flatMap((school) =>
            Object.values(school.metrics.average_class_size ?? {}).flatMap(
              (observations) => observations.map((item) => item.schoolYear),
            ),
          ),
        ),
      ].sort(),
    [resources],
  );
  const preparationYears = useMemo(
    () =>
      [
        ...new Set(
          [...resources.values()].flatMap((school) =>
            Object.values(
              school.metrics.teacher_assignment_percent ?? {},
            ).flatMap((observations) =>
              observations.map((item) => item.schoolYear),
            ),
          ),
        ),
      ].sort(),
    [resources],
  );
  const visibleClassDimensions = CLASS_DIMENSIONS.filter(([dimension]) =>
    selectedSchools.some((school) =>
      latest(
        resources.get(school.id),
        "average_class_size",
        dimension,
        classYear,
      ),
    ),
  );

  return (
    <main className="resources-page">
      <section className="resources-intro">
        <p className="eyebrow">Official teaching context</p>
        <h1>Teaching and school resources</h1>
        <p>
          Compare teacher experience, assignment context, class size, and
          student support reported in official public data.
        </p>
      </section>

      <div className="resources-workspace">
        <aside className="resources-picker">
          <SchoolPicker
            allSchools={catalog.schools}
            filterQuery={filterQuery}
            onAdd={onAdd}
            onClear={onClear}
            onQueryChange={onQueryChange}
            onRemove={onRemove}
            query={query}
            selectedSchools={selectedSchools}
          />
        </aside>

        <div className="resources-main">
          <section
            className="resource-status-strip"
            aria-label="Data reporting years"
          >
            <article>
              <span className="resource-status-icon resource-status-icon--ready">
                <Icon name="check" size={18} />
              </span>
              <span>
                <strong>Official public data</strong>
                <small>Release {catalog.manifest.release}</small>
              </span>
            </article>
            <article>
              <span className="resource-status-icon">
                <Icon name="users" size={18} />
              </span>
              <span>
                <strong>2025–26 staff experience</strong>
                <small>Latest staff data year</small>
              </span>
            </article>
            <article>
              <span className="resource-status-icon">
                <Icon name="file" size={18} />
              </span>
              <span>
                <strong>2024–25 SARC</strong>
                <small>Class size and support</small>
              </span>
            </article>
            <article>
              <span className="resource-status-icon">
                <Icon name="calendar" size={18} />
              </span>
              <span>
                <strong>2023–24 assignments</strong>
                <small>Latest preparation year</small>
              </span>
            </article>
          </section>

          {resourcesLoading ? (
            <p className="resource-loading" role="status">
              Loading teaching and resource records…
            </p>
          ) : null}

          <section className="resource-card resource-overview">
            <div className="resource-card-header">
              <div>
                <p className="eyebrow">Comparable context</p>
                <h2>At a glance</h2>
              </div>
              <span>Each row keeps its official reporting year</span>
            </div>
            <div className="resource-table-wrap">
              <div
                className="resource-grid resource-grid--overview"
                style={
                  {
                    "--school-count": Math.max(selectedSchools.length, 1),
                  } as CSSProperties
                }
              >
                <div className="resource-grid-corner">Measure</div>
                <SchoolColumns schools={selectedSchools} />
                <div className="resource-row-label">
                  <Icon name="users" size={18} />
                  <span>
                    Average teacher experience<small>2025–26 · years</small>
                  </span>
                </div>
                {selectedSchools.map((school) => (
                  <strong key={school.id}>
                    {formatValue(
                      latest(
                        resources.get(school.id),
                        "teacher_experience_average",
                        "total",
                      ),
                    )}
                  </strong>
                ))}
                <div className="resource-row-label">
                  <Icon name="school" size={18} />
                  <span>
                    Fully credentialed assignments
                    <small>2023–24 · percent</small>
                  </span>
                </div>
                {selectedSchools.map((school) => (
                  <strong key={school.id}>
                    {latest(
                      resources.get(school.id),
                      "teacher_assignment_percent",
                      "fully_credentialed",
                    )
                      ? `${formatValue(
                          latest(
                            resources.get(school.id),
                            "teacher_assignment_percent",
                            "fully_credentialed",
                          ),
                        )}%`
                      : "Not reported"}
                  </strong>
                ))}
                <div className="resource-row-label">
                  <Icon name="book" size={18} />
                  <span>
                    Reported class-size range
                    <small>Latest available · students</small>
                  </span>
                </div>
                {selectedSchools.map((school) => {
                  const range = latestClassRange(resources.get(school.id));
                  return (
                    <strong key={school.id}>
                      {range
                        ? `${range.minimum.toLocaleString()}–${range.maximum.toLocaleString()}`
                        : "Not reported"}
                    </strong>
                  );
                })}
                <div className="resource-row-label">
                  <Icon name="users" size={18} />
                  <span>
                    Pupils per academic counselor<small>2024–25 · ratio</small>
                  </span>
                </div>
                {selectedSchools.map((school) => (
                  <strong key={school.id}>
                    {formatValue(
                      latest(
                        resources.get(school.id),
                        "pupils_per_academic_counselor",
                        "all_students",
                      ),
                      { maximumFractionDigits: 0 },
                    )}
                  </strong>
                ))}
              </div>
            </div>
          </section>

          <section className="resource-card">
            <div className="resource-card-header">
              <div>
                <p className="eyebrow">2025–26</p>
                <h2>Teacher experience</h2>
              </div>
              <span>Teacher headcounts, not full-time equivalents</span>
            </div>
            <div className="resource-school-cards">
              {selectedSchools.map((school) => {
                const schoolResources = resources.get(school.id);
                const average = latest(
                  schoolResources,
                  "teacher_experience_average",
                  "total",
                );
                const districtAverage = latest(
                  schoolResources,
                  "teacher_experience_average",
                  "district",
                );
                const total = latest(
                  schoolResources,
                  "teacher_experience_count",
                  "total",
                );
                const experienced = experiencePercent(schoolResources);
                return (
                  <article
                    className="experience-card"
                    key={school.id}
                    style={schoolStyle(school.color)}
                  >
                    <header>
                      <i />
                      <span>
                        <strong>{school.name}</strong>
                        <small>{school.district}</small>
                      </span>
                    </header>
                    <div className="experience-stat">
                      <strong>{formatValue(average)}</strong>
                      <span>average years of experience</span>
                    </div>
                    <div
                      className="experience-bar"
                      aria-label={
                        experienced
                          ? `${experienced.toFixed(1)} percent experienced teachers`
                          : "Experienced teacher share not reported"
                      }
                    >
                      <i
                        style={{ width: `${Math.min(experienced ?? 0, 100)}%` }}
                      />
                    </div>
                    <dl>
                      <div>
                        <dt>Total teachers</dt>
                        <dd>
                          {formatValue(total, { maximumFractionDigits: 0 })}
                        </dd>
                      </div>
                      <div>
                        <dt>More than two years</dt>
                        <dd>
                          {experienced === undefined
                            ? "Not reported"
                            : `${experienced.toFixed(1)}%`}
                        </dd>
                      </div>
                      <div>
                        <dt>District experience</dt>
                        <dd>
                          {districtAverage
                            ? `${formatValue(districtAverage)} years`
                            : "Not reported"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="resource-card">
            <div className="resource-card-header">
              <div>
                <p className="eyebrow">Teacher preparation and placement</p>
                <h2>Assignment context</h2>
              </div>
              <label className="resource-year-select">
                <span>Data year</span>
                <select
                  value={preparationYear}
                  onChange={(event) => setPreparationYear(event.target.value)}
                >
                  {(preparationYears.length
                    ? preparationYears
                    : ["2023-24"]
                  ).map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="preparation-grid">
              {selectedSchools.map((school) => (
                <article key={school.id} style={schoolStyle(school.color)}>
                  <header>
                    <i />
                    <strong>{school.name}</strong>
                  </header>
                  {PREPARATION_DIMENSIONS.map(([dimension, label]) => {
                    const observation = latest(
                      resources.get(school.id),
                      "teacher_assignment_percent",
                      dimension,
                      preparationYear,
                    );
                    return (
                      <div className="preparation-row" key={dimension}>
                        <span>{label}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.min(observation?.value ?? 0, 100)}%`,
                            }}
                          />
                        </div>
                        <strong>
                          {observation ? `${formatValue(observation)}%` : "—"}
                        </strong>
                      </div>
                    );
                  })}
                  <small>
                    Teaching-position FTE:{" "}
                    {assignmentFte(resources.get(school.id), preparationYear)}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <section className="resource-card">
            <div className="resource-card-header">
              <div>
                <p className="eyebrow">Students per reported class</p>
                <h2>Class size</h2>
              </div>
              <label className="resource-year-select">
                <span>Data year</span>
                <select
                  value={classYear}
                  onChange={(event) => setClassYear(event.target.value)}
                >
                  {(classYears.length ? classYears : ["2024-25"]).map(
                    (year) => (
                      <option key={year}>{year}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <div className="resource-table-wrap">
              {visibleClassDimensions.length ? (
                <div
                  className="resource-comparison-table"
                  style={
                    {
                      "--school-count": Math.max(selectedSchools.length, 1),
                    } as CSSProperties
                  }
                >
                  <div className="resource-grid-corner">Grade or subject</div>
                  <SchoolColumns schools={selectedSchools} />
                  {visibleClassDimensions.flatMap(([dimension, label]) => [
                    <div
                      className="resource-row-label"
                      key={`${dimension}-label`}
                    >
                      <Icon name="book" size={17} />
                      <span>{label}</span>
                    </div>,
                    ...selectedSchools.map((school) => (
                      <strong key={`${dimension}-${school.id}`}>
                        {formatValue(
                          latest(
                            resources.get(school.id),
                            "average_class_size",
                            dimension,
                            classYear,
                          ),
                        )}
                      </strong>
                    )),
                  ])}
                </div>
              ) : (
                <p className="resource-empty">
                  No class-size values are reported for this selection and year.
                </p>
              )}
            </div>
            <p className="resource-footnote">
              Class-size bands are published with the source records. Averages
              are shown by grade or subject and are not combined into a school
              rating.
            </p>
          </section>

          <section className="resource-card">
            <div className="resource-card-header">
              <div>
                <p className="eyebrow">2024–25 · full-time equivalents</p>
                <h2>Student support</h2>
              </div>
              <span>Blank source values remain Not reported</span>
            </div>
            <div className="resource-table-wrap">
              <div
                className="resource-comparison-table"
                style={
                  {
                    "--school-count": Math.max(selectedSchools.length, 1),
                  } as CSSProperties
                }
              >
                <div className="resource-grid-corner">Role</div>
                <SchoolColumns schools={selectedSchools} />
                {SUPPORT_DIMENSIONS.flatMap(([dimension, label]) => [
                  <div
                    className="resource-row-label"
                    key={`${dimension}-label`}
                  >
                    <Icon name="users" size={17} />
                    <span>{label}</span>
                  </div>,
                  ...selectedSchools.map((school) => (
                    <strong key={`${dimension}-${school.id}`}>
                      {formatValue(
                        latest(
                          resources.get(school.id),
                          "support_staff_fte",
                          dimension,
                        ),
                      )}
                    </strong>
                  )),
                ])}
                <div className="resource-row-label resource-row-label--emphasis">
                  <Icon name="info" size={17} />
                  <span>Pupils per academic counselor</span>
                </div>
                {selectedSchools.map((school) => (
                  <strong className="resource-cell--emphasis" key={school.id}>
                    {formatValue(
                      latest(
                        resources.get(school.id),
                        "pupils_per_academic_counselor",
                        "all_students",
                      ),
                      { maximumFractionDigits: 0 },
                    )}
                  </strong>
                ))}
              </div>
            </div>
          </section>

          <section className="resource-definitions">
            <article>
              <strong>FTE (full-time equivalent)</strong>
              <p>
                One FTE represents one person working full time for the entire
                school year. Headcounts and FTE are not interchangeable.
              </p>
            </article>
            <article>
              <strong>Different reporting years</strong>
              <p>
                Staff experience is 2025–26, SARC class size and support are
                2024–25, and teacher preparation currently ends in 2023–24.
              </p>
            </article>
            <article>
              <strong>Missing data</strong>
              <p>
                Not reported means the source was blank, zero indicated no
                usable counselor ratio, or the school could not be matched to
                the current directory.
              </p>
            </article>
          </section>
        </div>

        <aside className="resources-guidance">
          <section>
            <Icon name="book" size={21} />
            <h2>How to read this</h2>
            <p>
              Use these measures alongside outcomes and school context. They
              describe conditions, not school quality by themselves.
            </p>
          </section>
          <section>
            <Icon name="calendar" size={21} />
            <h2>Different reporting years</h2>
            <p>
              The latest official files do not all describe the same year, so
              every section keeps its own date.
            </p>
          </section>
          <section>
            <Icon name="info" size={21} />
            <h2>Not a rating</h2>
            <p>
              Higher or lower is not automatically better. Program design, grade
              span, enrollment, and local context matter.
            </p>
          </section>
          <section>
            <h2>Sources &amp; notes</h2>
            <p>
              Values are derived from official CDE files. Raw files are not
              redistributed or relicensed.
            </p>
            <a
              href="https://www.cde.ca.gov/ds/ad/filesstex.asp"
              target="_blank"
              rel="noreferrer"
            >
              CDE Staff Experience Data <Icon name="external" size={12} />
            </a>
            <a
              href="https://www.cde.ca.gov/ta/ac/sa/accessdata2425.asp"
              target="_blank"
              rel="noreferrer"
            >
              CDE SARC Data <Icon name="external" size={12} />
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}
