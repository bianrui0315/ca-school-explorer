import { useMemo, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n";
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
  t: (source: string, values?: Record<string, string | number>) => string,
) {
  if (!match?.primaryDriver) {
    return t(strongestEvidenceSentence(school, catalog.manifest));
  }
  return t(
    "{indicator} is the strongest weighted driver at {score}/100 and {weight}% of available weight.",
    {
      indicator: t(match.primaryDriver.label),
      score: Math.round(match.primaryDriver.score),
      weight: Math.round(match.primaryDriver.weightShare * 100),
    },
  );
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
  const { t } = useI18n();
  const points = observations
    .filter((observation) => observation.value !== null)
    .slice(-3);
  if (points.length === 0) {
    return (
      <span className="brief-trend-unavailable">{t("Not available")}</span>
    );
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
        aria-label={t("{school} {metric} three-year trend", {
          school: schoolName,
          metric: t(metric.navLabel),
        })}
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
        {status === "insufficient" ? t("1 year") : t(status)}
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
  const { t } = useI18n();
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
      setShareMessage(t("Share link copied"));
    } catch {
      setShareMessage(t("Share link ready in the address bar"));
    }
  }

  return (
    <main className="decision-brief-page" id="brief-title">
      <header className="decision-brief-heading">
        <div>
          <h1>{t("Family Decision Brief")}</h1>
          <p>{t("From a new address to an explainable school shortlist.")}</p>
        </div>
        <div className="decision-brief-actions">
          <button onClick={onEditSearch} type="button">
            <Icon name="edit" size={16} />
            {t("Edit search")}
          </button>
          <button
            className="decision-brief-share"
            onClick={() => void copyShareLink()}
            type="button"
          >
            <Icon name="link" size={16} />
            {t("Copy share link")}
          </button>
          <button onClick={() => window.print()} type="button">
            <Icon name="printer" size={16} />
            {t("Print brief")}
          </button>
          {shareMessage ? <span role="status">{shareMessage}</span> : null}
        </div>
      </header>

      <section
        className="decision-brief-context"
        aria-label={t("Search context")}
      >
        <span>
          <Icon name="mapPin" size={19} />
          <strong>{state.location.matchedAddress}</strong>
        </span>
        <span>
          <Icon name="pathways" size={19} />
          {t(gradeLabel(state.options.grade))}
        </span>
        <span>
          <Icon name="target" size={19} />
          {t("{radius} miles", { radius: state.radius })}
        </span>
        <span>
          <Icon name="school" size={19} />
          {t(LOCATION_SCHOOL_TYPE_LABELS[state.options.schoolType])}
        </span>
        <div>
          <strong>{t("Evidence priorities")}</strong>
          {PRIORITY_ORDER.map((priority) => (
            <span key={priority}>
              <Icon name="check" size={13} />
              {t(LOCATION_PRIORITY_LABELS[priority])}{" "}
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
            <h2 id="brief-schools-title">{t("Three schools to review")}</h2>
            <p>
              {t(
                "Selected from the location search. The score summarizes available evidence and is not a rank.",
              )}
            </p>
          </div>
          <button onClick={onOpenComparison} type="button">
            {t("Open full comparison")}
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
                    <dt>{t("Distance")}</dt>
                    <dd>
                      {match && Number.isFinite(match.distanceMiles)
                        ? t("{distance} miles", {
                            distance: match.distanceMiles.toFixed(1),
                          })
                        : t("Not available")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("District")}</dt>
                    <dd>{school.district}</dd>
                  </div>
                  <div>
                    <dt>{t("Grades / type")}</dt>
                    <dd>
                      {school.gradeSpan} ·{" "}
                      {t(school.charter ? "Charter" : school.schoolType)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Evidence coverage")}</dt>
                    <dd>
                      {match
                        ? t("{available} of {total} indicators", {
                            available: match.availableCount,
                            total: match.totalCount,
                          })
                        : t("Not available")}
                    </dd>
                  </div>
                </dl>
                <p>{primaryDriverSentence(match, school, catalog, t)}</p>
                <footer>
                  <span>{t("Evidence score (not a rank)")}</span>
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
            <h2 id="brief-evidence-title">{t("Latest evidence")}</h2>
            <p>
              {t(
                "Actual source values retain their reporting years and reliability state.",
              )}
            </p>
          </div>
        </div>
        <div className="decision-brief-table-scroll">
          <table className="decision-brief-table">
            <thead>
              <tr>
                <th scope="col">{t("Indicator")}</th>
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
                    {t(metric.navLabel)}
                    <small>{t(metric.shortLabel)}</small>
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
                            : t("No published year")}
                        </span>
                        <small>
                          {t(reliabilityLabel(evidence.observation))}
                        </small>
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
            <h2 id="brief-trends-title">{t("Three-year direction")}</h2>
            <p>
              {t(
                "Direction follows each indicator definition; missing years are never connected.",
              )}
            </p>
          </div>
        </div>
        <div className="decision-brief-trend-grid">
          {metrics.map((metric) => (
            <article key={metric.id}>
              <h3>{t(metric.navLabel)}</h3>
              <p>{t(metric.shortLabel)}</p>
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
            <h2 id="brief-insights-title">{t("What stands out")}</h2>
            <p>
              {t(
                "Deterministic statements derived from the values above—no generated interpretation.",
              )}
            </p>
          </div>
        </div>
        <div>
          <article>
            <Icon name="check" size={22} />
            <h3>{t("Strongest evidence")}</h3>
            <ul>
              {schools.map((school, index) => (
                <li key={school.id}>
                  <strong>{school.name}:</strong>{" "}
                  {primaryDriverSentence(matches[index], school, catalog, t)}
                </li>
              ))}
            </ul>
          </article>
          <article>
            <Icon name="target" size={22} />
            <h3>{t("Material difference")}</h3>
            <p>{t(widestBriefDifference(schools, catalog.manifest))}</p>
          </article>
          <article>
            <Icon name="warning" size={22} />
            <h3>{t("Data gaps")}</h3>
            <ul>
              {schools.map((school) => (
                <li key={school.id}>
                  {t(briefDataGapSentence(school, catalog.manifest))}
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
          <h2 id="brief-limits-title">{t("Before you decide")}</h2>
          <strong>{t("Nearby does not mean assigned or eligible.")}</strong>
          <p>
            {t(
              "District boundaries, enrollment rules, programs, admissions, and transportation can change. Confirm current options directly with each school or district. Missing and suppressed values are not estimated.",
            )}
          </p>
        </div>
        <div>
          <strong>{t("Sources & methodology")}</strong>
          <a
            href="https://github.com/bianrui0315/ca-school-explorer/blob/main/METHODOLOGY.md"
            rel="noreferrer"
            target="_blank"
          >
            {t("Read methodology")} <Icon name="external" size={12} />
          </a>
          <a href="/#source-details">{t("View source notes")}</a>
        </div>
      </aside>
    </main>
  );
}
