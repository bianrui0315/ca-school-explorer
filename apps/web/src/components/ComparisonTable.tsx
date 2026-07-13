import type { CSSProperties } from "react";
import {
  changeStatus,
  firstObservation,
  formatMetricValue,
  formatSchoolYear,
  latestObservation,
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
  startYear,
  endYear,
}: ComparisonTableProps) {
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
            Exact {metric.shortLabel.toLowerCase()} values for selected schools
          </caption>
          <thead>
            <tr>
              <th scope="col">School</th>
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
                  Change
                  <small>
                    {formatSchoolYear(startYear)}–{formatSchoolYear(endYear)}
                  </small>
                </th>
              ) : null}
              <th scope="col">
                Students
                <small>{formatSchoolYear(endYear)} denominator</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => {
              const observations = school.metrics[metric.id]?.[subgroup] ?? [];
              const change = metricChange(observations, startYear, endYear);
              const latest = latestObservation(observations, endYear);
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
                          {reliabilityLabel(observation)}
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
                  <td>{latest?.denominator?.toLocaleString() ?? "—"}</td>
                </tr>
              );
            })}
            {baselineLabel && baseline.length > 0 ? (
              <tr className="baseline-row">
                <th scope="row">
                  <span className="baseline-dot" />
                  <span>
                    {baselineLabel} baseline
                    <small>Same-district context</small>
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
                      <small>{reliabilityLabel(observation)}</small>
                    </td>
                  );
                })}
                {hasTrend ? (
                  <td>
                    {formatMetricValue(
                      (latestObservation(baseline, endYear)?.value ?? 0) -
                        (firstObservation(baseline, startYear)?.value ?? 0),
                      metric,
                      true,
                    )}
                  </td>
                ) : null}
                <td>
                  {latestObservation(
                    baseline,
                    endYear,
                  )?.denominator?.toLocaleString() ?? "—"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Suppressed values remain hidden. Small-sample results should be treated
        as directional, not conclusive.
      </p>
    </section>
  );
}
