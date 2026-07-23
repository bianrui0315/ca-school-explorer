import type { CSSProperties } from "react";
import { useI18n } from "../i18n";
import {
  changeStatus,
  formatMetricValue,
  formatSchoolYear,
  metricChange,
  reliabilityLabel,
} from "../lib/metrics";
import type {
  MetricDefinition,
  Observation,
  School,
  SubgroupId,
} from "../types";

interface ComparisonTableProps {
  schools: School[];
  metric: MetricDefinition;
  subgroup: SubgroupId;
  baseline: Observation[];
  baselineLabel?: string;
  baselineDescription?: string;
  startYear: number;
  endYear: number;
}

function schoolStyle(color: string) {
  return { "--school-color": color } as CSSProperties;
}

export function ComparisonTable({
  schools,
  metric,
  subgroup,
  baseline,
  baselineLabel,
  baselineDescription = "Geographic context",
  startYear,
  endYear,
}: ComparisonTableProps) {
  const { t } = useI18n();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index,
  );
  const hasTrend = startYear < endYear;

  if (schools.length === 0) {
    return null;
  }

  return (
    <section
      className="table-section"
      aria-labelledby="comparison-table-heading"
    >
      <div className="table-scroll">
        <table>
          <caption id="comparison-table-heading">
            {t("Exact {metric} values for selected schools", {
              metric: t(metric.shortLabel).toLocaleLowerCase(),
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("School")}</th>
              {years.map((year) => (
                <th
                  className={
                    year === endYear ? "current-column" : "history-column"
                  }
                  key={year}
                  scope="col"
                >
                  {formatSchoolYear(year)}
                </th>
              ))}
              {hasTrend ? (
                <th scope="col">
                  {t("Change")}
                  <small>
                    {t("{start} to {end}", {
                      start: formatSchoolYear(startYear),
                      end: formatSchoolYear(endYear),
                    })}
                  </small>
                </th>
              ) : null}
              <th scope="col">
                {t("Students")}
                <small>
                  {t("{year} denominator", { year: formatSchoolYear(endYear) })}
                </small>
              </th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => {
              const observations = school.metrics[metric.id]?.[subgroup] ?? [];
              const change = metricChange(observations, startYear, endYear);
              const current = observations.find(
                (observation) => observation.year === endYear,
              );
              return (
                <tr key={school.id} style={schoolStyle(school.color)}>
                  <th scope="row">
                    <span className="school-dot" />
                    <span>
                      {school.name}
                      <small>
                        {school.gradeSpan} · {school.district}
                      </small>
                    </span>
                  </th>
                  {years.map((year) => {
                    const observation = observations.find(
                      (candidate) => candidate.year === year,
                    );
                    return (
                      <td
                        className={
                          year === endYear ? "current-column" : "history-column"
                        }
                        key={year}
                      >
                        {formatMetricValue(observation?.value, metric)}
                        <small
                          className={`reliability reliability--${observation?.reliability ?? "not-available"}`}
                        >
                          {t(reliabilityLabel(observation))}
                        </small>
                      </td>
                    );
                  })}
                  {hasTrend ? (
                    <td>
                      <span
                        className={`delta delta--${changeStatus(change, metric)}`}
                      >
                        {formatMetricValue(change, metric, true)}
                      </span>
                    </td>
                  ) : null}
                  <td>{current?.denominator?.toLocaleString() ?? "—"}</td>
                </tr>
              );
            })}
            {baselineLabel && baseline.length > 0 ? (
              <tr className="baseline-row">
                <th scope="row">
                  <span className="baseline-dot" />
                  <span>
                    {t("{label} baseline", { label: baselineLabel })}
                    <small>{t(baselineDescription)}</small>
                  </span>
                </th>
                {years.map((year) => {
                  const observation = baseline.find(
                    (candidate) => candidate.year === year,
                  );
                  return (
                    <td
                      className={
                        year === endYear ? "current-column" : "history-column"
                      }
                      key={year}
                    >
                      {formatMetricValue(observation?.value, metric)}
                      <small>{t(reliabilityLabel(observation))}</small>
                    </td>
                  );
                })}
                {hasTrend ? (
                  <td>
                    {formatMetricValue(
                      metricChange(baseline, startYear, endYear),
                      metric,
                      true,
                    )}
                  </td>
                ) : null}
                <td>
                  {baseline
                    .find((observation) => observation.year === endYear)
                    ?.denominator?.toLocaleString() ?? "—"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        {t(
          "Suppressed values remain hidden. Small-sample results should be treated as directional, not conclusive.",
        )}
      </p>
    </section>
  );
}
