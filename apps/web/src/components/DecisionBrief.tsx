import { useMemo, useState, type CSSProperties } from "react";
import {
  briefDataGapSentence,
  briefTrendStatus,
  decisionBriefMetrics,
  latestBriefEvidence,
  strongestEvidenceSentence,
  widestBriefDifference,
} from "../lib/decisionBrief";
import {
  buildDecisionBriefShareUrl,
  type DecisionBriefState,
} from "../lib/decisionBriefShare";
import {
  gradeBandForGrade,
  LOCATION_GRADE_OPTIONS,
  LOCATION_PRIORITY_LABELS,
  LOCATION_SCHOOL_TYPE_LABELS,
  scoreSchoolForBand,
  type GradeBand,
  type LocationPriority,
  type LocationSchoolMatch,
} from "../lib/locationRecommendations";
import {
  formatMetricValue,
  formatSchoolYear,
  reliabilityLabel,
} from "../lib/metrics";
import { distanceFromLocation } from "../lib/schoolDistance";
import { gradesServed } from "../lib/schoolSearch";
import type {
  MetricDefinition,
  Observation,
  PublicCatalog,
  School,
} from "../types";
import { Icon } from "./Icon";

interface DecisionBriefProps {
  catalog: PublicCatalog;
  onEditSearch: () => void;
  onOpenComparison: () => void;
  onOpenProfile: (schoolId: string) => void;
  schools: School[];
  state: DecisionBriefState;
}

const PRIORITY_ORDER: LocationPriority[] = [
  "academics",
  "attendance",
  "climate",
  "readiness",
];

function gradeLabel(grade: string) {
  return (
    LOCATION_GRADE_OPTIONS.find((option) => option.value === grade)?.label ??
    "Any grade"
  );
}

function fallbackBand(school: School): GradeBand {
  const served = new Set(gradesServed(school.gradeSpan));
  if (["9", "10", "11", "12"].some((grade) => served.has(grade))) {
    return "high";
  }
  if (["6", "7", "8"].some((grade) => served.has(grade))) {
    return "middle";
  }
  return "elementary";
}

function observationTone(status: ReturnType<typeof briefTrendStatus>) {
  if (status === "improved") return "positive";
  if (status === "declined") return "negative";
  return "neutral";
}

function primaryDriverSentence(
  match: LocationSchoolMatch | undefined,
  school: School,
  catalog: PublicCatalog,
) {
  if (!match?.primaryDriver) {
    return strongestEvidenceSentence(school, catalog.manifest);
  }
  return `${match.primaryDriver.label} is the strongest weighted driver at ${Math.round(
    match.primaryDriver.score,
  )}/100 and ${Math.round(
    match.primaryDriver.weightShare * 100,
  )}% of available weight.`;
}

function BriefMiniTrend({
  color,
  metric,
  observations,
  schoolName,
}: {
  color: string;
  metric: MetricDefinition;
  observations: Observation[];
  schoolName: string;
}) {
  const points = observations
    .filter((observation) => observation.value !== null)
    .slice(-3);
  if (points.length === 0) {
    return <span className="brief-trend-unavailable">Not available</span>;
  }
  const values = points.map((point) => point.value as number);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const coordinates = points.map((point, index) => ({
    point,
    x: points.length === 1 ? 54 : 6 + (index * 96) / (points.length - 1),
    y: 31 - (((point.value as number) - minimum) / range) * 22,
  }));
  const path = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");
  const status = briefTrendStatus(points, metric);
  const latest = points.at(-1)!;
  return (
    <span className="brief-trend-row">
      <span className="brief-trend-name">
        <i style={{ backgroundColor: color }} />
        {schoolName}
      </span>
      <svg
        aria-label={`${schoolName} ${metric.navLabel} three-year trend`}
        role="img"
        viewBox="0 0 108 40"
      >
        <path d={path} style={{ stroke: color }} />
        {coordinates.map(({ point, x, y }) => (
          <circle cx={x} cy={y} fill={color} key={point.year} r="3">
            <title>
              {formatSchoolYear(point.year)}:{" "}
              {formatMetricValue(point.value, metric)}
            </title>
          </circle>
        ))}
      </svg>
      <span
        className={`brief-trend-status brief-trend-status--${observationTone(status)}`}
      >
        {status === "insufficient" ? "1 year" : status}
      </span>
      <strong>
        {formatMetricValue(latest.value, metric, metric.unit === "points")}
      </strong>
    </span>
  );
}

export function DecisionBrief({
  catalog,
  onEditSearch,
  onOpenComparison,
  onOpenProfile,
  schools,
  state,
}: DecisionBriefProps) {
  const [shareMessage, setShareMessage] = useState<string>();
  const metrics = useMemo(
    () => decisionBriefMetrics(catalog.manifest),
    [catalog.manifest],
  );
  const matches = useMemo(
    () =>
      schools.map((school) => {
        const distanceMiles =
          distanceFromLocation(state.location, school) ?? Number.NaN;
        const band =
          gradeBandForGrade(state.options.grade) ?? fallbackBand(school);
        return scoreSchoolForBand(
          school,
          band,
          distanceMiles,
          catalog.manifest,
          state.options,
        );
      }),
    [catalog.manifest, schools, state.location, state.options],
  );

  async function copyShareLink() {
    const shareUrl = buildDecisionBriefShareUrl(state, window.location.href);
    window.history.replaceState({}, "", shareUrl);
    try {
      await Promise.race([
        navigator.clipboard.writeText(shareUrl),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("Clipboard request timed out.")),
            1_000,
          ),
        ),
      ]);
      setShareMessage("Share link copied");
    } catch {
      setShareMessage("Share link ready in the address bar");
    }
  }

  return (
    <main className="decision-brief-page" id="brief-title">
      <header className="decision-brief-heading">
        <div>
          <h1>Family Decision Brief</h1>
          <p>From a new address to an explainable school shortlist.</p>
        </div>
        <div className="decision-brief-actions">
          <button onClick={onEditSearch} type="button">
            <Icon name="edit" size={16} />
            Edit search
          </button>
          <button
            className="decision-brief-share"
            onClick={() => void copyShareLink()}
            type="button"
          >
            <Icon name="link" size={16} />
            Copy share link
          </button>
          <button onClick={() => window.print()} type="button">
            <Icon name="printer" size={16} />
            Print brief
          </button>
          {shareMessage ? <span role="status">{shareMessage}</span> : null}
        </div>
      </header>

      <section className="decision-brief-context" aria-label="Search context">
        <span>
          <Icon name="mapPin" size={19} />
          <strong>{state.location.matchedAddress}</strong>
        </span>
        <span>
          <Icon name="pathways" size={19} />
          {gradeLabel(state.options.grade)}
        </span>
        <span>
          <Icon name="target" size={19} />
          {state.radius} miles
        </span>
        <span>
          <Icon name="school" size={19} />
          {LOCATION_SCHOOL_TYPE_LABELS[state.options.schoolType]}
        </span>
        <div>
          <strong>Evidence priorities</strong>
          {PRIORITY_ORDER.map((priority) => (
            <span key={priority}>
              <Icon name="check" size={13} />
              {LOCATION_PRIORITY_LABELS[priority]}{" "}
              {state.options.priorityMultipliers[priority]}×
            </span>
          ))}
        </div>
      </section>

      <section
        className="decision-brief-section"
        aria-labelledby="brief-schools-title"
      >
        <div className="decision-brief-section-heading">
          <div>
            <h2 id="brief-schools-title">Three schools to review</h2>
            <p>
              Selected from the location search. The score summarizes available
              evidence and is not a rank.
            </p>
          </div>
          <button onClick={onOpenComparison} type="button">
            Open full comparison
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
        <div className="decision-brief-school-grid">
          {schools.map((school, index) => {
            const match = matches[index];
            return (
              <article
                key={school.id}
                style={{ "--school-color": school.color } as CSSProperties}
              >
                <header>
                  <span>{index + 1}</span>
                  <button
                    onClick={() => onOpenProfile(school.id)}
                    type="button"
                  >
                    {school.name}
                    <Icon name="chevronRight" size={14} />
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>Distance</dt>
                    <dd>
                      {match && Number.isFinite(match.distanceMiles)
                        ? `${match.distanceMiles.toFixed(1)} miles`
                        : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt>District</dt>
                    <dd>{school.district}</dd>
                  </div>
                  <div>
                    <dt>Grades / type</dt>
                    <dd>
                      {school.gradeSpan} ·{" "}
                      {school.charter ? "Charter" : school.schoolType}
                    </dd>
                  </div>
                  <div>
                    <dt>Evidence coverage</dt>
                    <dd>
                      {match
                        ? `${match.availableCount} of ${match.totalCount} indicators`
                        : "Not available"}
                    </dd>
                  </div>
                </dl>
                <p>{primaryDriverSentence(match, school, catalog)}</p>
                <footer>
                  <span>Evidence score (not a rank)</span>
                  <strong>
                    {match?.score === null || match?.score === undefined
                      ? "—"
                      : Math.round(match.score)}
                    <small>/100</small>
                  </strong>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="decision-brief-section"
        aria-labelledby="brief-evidence-title"
      >
        <div className="decision-brief-section-heading">
          <div>
            <h2 id="brief-evidence-title">Latest evidence</h2>
            <p>
              Actual source values retain their reporting years and reliability
              state.
            </p>
          </div>
        </div>
        <div className="decision-brief-table-scroll">
          <table className="decision-brief-table">
            <thead>
              <tr>
                <th scope="col">Indicator</th>
                {schools.map((school) => (
                  <th key={school.id} scope="col">
                    {school.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.id}>
                  <th scope="row">
                    {metric.navLabel}
                    <small>{metric.shortLabel}</small>
                  </th>
                  {schools.map((school) => {
                    const evidence = latestBriefEvidence(
                      school,
                      metric,
                      catalog.manifest,
                    );
                    return (
                      <td key={school.id}>
                        <strong>
                          {formatMetricValue(
                            evidence.observation?.value,
                            metric,
                            metric.unit === "points",
                          )}
                        </strong>
                        <span>
                          {evidence.observation
                            ? formatSchoolYear(evidence.observation.year)
                            : "No published year"}
                        </span>
                        <small>{reliabilityLabel(evidence.observation)}</small>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="decision-brief-section"
        aria-labelledby="brief-trends-title"
      >
        <div className="decision-brief-section-heading">
          <div>
            <h2 id="brief-trends-title">Three-year direction</h2>
            <p>
              Direction follows each indicator definition; missing years are
              never connected.
            </p>
          </div>
        </div>
        <div className="decision-brief-trend-grid">
          {metrics.map((metric) => (
            <article key={metric.id}>
              <h3>{metric.navLabel}</h3>
              <p>{metric.shortLabel}</p>
              {schools.map((school) => (
                <BriefMiniTrend
                  color={school.color}
                  key={school.id}
                  metric={metric}
                  observations={school.metrics[metric.id]?.all ?? []}
                  schoolName={school.name}
                />
              ))}
            </article>
          ))}
        </div>
      </section>

      <section
        className="decision-brief-section decision-brief-insights"
        aria-labelledby="brief-insights-title"
      >
        <div className="decision-brief-section-heading">
          <div>
            <h2 id="brief-insights-title">What stands out</h2>
            <p>
              Deterministic statements derived from the values above—no
              generated interpretation.
            </p>
          </div>
        </div>
        <div>
          <article>
            <Icon name="check" size={22} />
            <h3>Strongest evidence</h3>
            <ul>
              {schools.map((school, index) => (
                <li key={school.id}>
                  <strong>{school.name}:</strong>{" "}
                  {primaryDriverSentence(matches[index], school, catalog)}
                </li>
              ))}
            </ul>
          </article>
          <article>
            <Icon name="target" size={22} />
            <h3>Material difference</h3>
            <p>{widestBriefDifference(schools, catalog.manifest)}</p>
          </article>
          <article>
            <Icon name="warning" size={22} />
            <h3>Data gaps</h3>
            <ul>
              {schools.map((school) => (
                <li key={school.id}>
                  {briefDataGapSentence(school, catalog.manifest)}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <aside
        className="decision-brief-limitations"
        aria-labelledby="brief-limits-title"
      >
        <Icon name="warning" size={34} />
        <div>
          <h2 id="brief-limits-title">Before you decide</h2>
          <strong>Nearby does not mean assigned or eligible.</strong>
          <p>
            District boundaries, enrollment rules, programs, admissions, and
            transportation can change. Confirm current options directly with
            each school or district. Missing and suppressed values are not
            estimated.
          </p>
        </div>
        <div>
          <strong>Sources &amp; methodology</strong>
          <a
            href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
            rel="noreferrer"
            target="_blank"
          >
            Read methodology <Icon name="external" size={12} />
          </a>
          <a href="/#source-details">View source notes</a>
        </div>
      </aside>
    </main>
  );
}
