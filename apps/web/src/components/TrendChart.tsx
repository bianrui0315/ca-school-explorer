import { useSyncExternalStore } from "react";
import type {
  MetricDefinition,
  Observation,
  School,
  SubgroupId,
} from "../types";
import {
  formatMetricValue,
  formatSchoolYear,
  observationsInRange,
} from "../lib/metrics";
import { Icon } from "./Icon";

interface TrendChartProps {
  schools: School[];
  metric: MetricDefinition;
  subgroup: SubgroupId;
  baseline: Observation[];
  baselineLabel?: string;
  startYear: number;
  endYear: number;
}

interface Point {
  x: number;
  y: number;
  observation: Observation;
}

const COMPACT_QUERY = "(max-width: 860px)";

function subscribeToCompactLayout(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia(COMPACT_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function compactLayoutSnapshot() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.(COMPACT_QUERY).matches)
  );
}

function useCompactLayout() {
  return useSyncExternalStore(
    subscribeToCompactLayout,
    compactLayoutSnapshot,
    () => false,
  );
}

function niceStep(range: number) {
  const roughStep = range / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const residual = roughStep / magnitude;
  const multiplier = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return multiplier * magnitude;
}

function buildLinePath(points: Array<Point | null>) {
  let drawing = false;
  return points
    .map((point) => {
      if (!point) {
        drawing = false;
        return "";
      }
      const command = drawing ? "L" : "M";
      drawing = true;
      return `${command}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function axisLabel(value: number, metric: MetricDefinition) {
  if (metric.unit === "percent") {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }
  return value > 0 ? `+${value}` : `${value}`;
}

export function TrendChart({
  schools,
  metric,
  subgroup,
  baseline,
  baselineLabel,
  startYear,
  endYear,
}: TrendChartProps) {
  const compact = useCompactLayout();
  const width = compact ? 390 : 820;
  const height = compact ? 280 : 360;
  const margin = compact
    ? { top: 22, right: 48, bottom: 42, left: 45 }
    : { top: 28, right: 68, bottom: 48, left: 58 };
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index,
  );
  const schoolSeries = schools.map((school) => ({
    school,
    observations: observationsInRange(
      school.metrics[metric.id]?.[subgroup] ?? [],
      startYear,
      endYear,
    ),
  }));
  const baselineSeries = observationsInRange(baseline, startYear, endYear);
  const values = [
    ...schoolSeries.flatMap(({ observations }) =>
      observations.flatMap(({ value }) => (value === null ? [] : [value])),
    ),
    ...baselineSeries.flatMap(({ value }) => (value === null ? [] : [value])),
    0,
  ];

  if (schools.length === 0 || values.length === 1) {
    return (
      <section className="trend-panel trend-panel--empty">
        <Icon name="school" size={31} />
        <h2>Add a school to compare</h2>
        <p>Use the search field to select up to five schools.</p>
      </section>
    );
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = metric.unit === "percent" ? 3 : 15;
  const step = niceStep(rawMax - rawMin + padding * 2);
  const calculatedMin = Math.floor((rawMin - padding) / step) * step;
  const calculatedMax = Math.ceil((rawMax + padding) / step) * step;
  const yMin =
    metric.unit === "percent" ? Math.max(0, calculatedMin) : calculatedMin;
  const yMax =
    metric.unit === "percent" ? Math.min(100, calculatedMax) : calculatedMax;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const horizontalInset = compact ? 24 : 44;
  const usablePlotWidth = Math.max(plotWidth - horizontalInset * 2, 1);
  const xForYear = (year: number) =>
    startYear === endYear
      ? margin.left + plotWidth / 2
      : margin.left +
        horizontalInset +
        ((year - startYear) / (endYear - startYear)) * usablePlotWidth;
  const yForValue = (value: number) =>
    margin.top + ((yMax - value) / Math.max(yMax - yMin, 1)) * plotHeight;
  const ticks = Array.from(
    { length: Math.round((yMax - yMin) / step) + 1 },
    (_, index) => yMin + index * step,
  );

  const pointsFor = (observations: Observation[]) =>
    years.map((year) => {
      const observation = observations.find(
        (candidate) => candidate.year === year,
      );
      return observation?.value === null || !observation
        ? null
        : { x: xForYear(year), y: yForValue(observation.value), observation };
    });

  const baselinePoints = pointsFor(baselineSeries);

  return (
    <section className="trend-panel" aria-labelledby="trend-title">
      <header className="trend-header">
        <div>
          <div className="title-with-info">
            <h2 id="trend-title">{metric.label}</h2>
            <Icon name="info" size={17} />
          </div>
          <p>{metric.description}</p>
        </div>
      </header>

      <div className="chart-legend" aria-label="Chart legend">
        {schools.map((school) => (
          <span key={school.id}>
            <i style={{ backgroundColor: school.color }} />
            {school.name}
          </span>
        ))}
        {baselineLabel && baseline.length > 0 ? (
          <span>
            <i className="baseline-key" />
            {baselineLabel} baseline
          </span>
        ) : null}
      </div>

      <div className="chart-frame">
        <svg
          aria-labelledby="trend-chart-title trend-chart-description"
          className="trend-chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title id="trend-chart-title">
            {metric.label} from {formatSchoolYear(startYear)} to{" "}
            {formatSchoolYear(endYear)}
          </title>
          <desc id="trend-chart-description">
            A comparison of {schools.length} selected schools
            {baselineLabel ? ` and the ${baselineLabel} baseline` : ""} for the
            selected student group.
          </desc>

          {ticks.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line
                  className="grid-line"
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="axis-label axis-label--y"
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                >
                  {axisLabel(tick, metric)}
                </text>
              </g>
            );
          })}

          {years.map((year) => (
            <text
              className="axis-label axis-label--x"
              key={year}
              x={xForYear(year)}
              y={height - 14}
              textAnchor="middle"
            >
              {formatSchoolYear(year)}
            </text>
          ))}

          <path className="baseline-line" d={buildLinePath(baselinePoints)} />

          {schoolSeries.map(({ school, observations }) => {
            const points = pointsFor(observations);
            const lastPoint = [...points]
              .reverse()
              .find((point) => point !== null);
            return (
              <g key={school.id}>
                <path
                  className="school-line"
                  d={buildLinePath(points)}
                  stroke={school.color}
                />
                {points.map((point, index) =>
                  point ? (
                    <circle
                      className="chart-point"
                      cx={point.x}
                      cy={point.y}
                      fill={school.color}
                      key={`${school.id}-${point.observation.year}`}
                      r={index === points.length - 1 ? 5 : 4}
                      tabIndex={0}
                    >
                      <title>
                        {school.name}, {point.observation.year}:{" "}
                        {formatMetricValue(point.observation.value, metric)};{" "}
                        {point.observation.denominator?.toLocaleString() ??
                          "no"}{" "}
                        students
                      </title>
                    </circle>
                  ) : null,
                )}
                {lastPoint ? (
                  <text
                    className="last-value"
                    fill={school.color}
                    x={lastPoint.x + 10}
                    y={lastPoint.y + 4}
                  >
                    {formatMetricValue(lastPoint.observation.value, metric)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
