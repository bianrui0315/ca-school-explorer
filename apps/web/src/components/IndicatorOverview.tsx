import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  calculateComposite,
  DEFAULT_INDICATOR_WEIGHTS,
  INDICATOR_IDS,
  indicatorScoresForSchool,
  type SchoolIndicatorScores,
} from "../lib/indicatorScore";
import { formatSchoolYear } from "../lib/metrics";
import type { MetricDefinition, School, SubgroupId } from "../types";

const LazySchoolMap = lazy(() =>
  import("./SchoolMap").then((module) => ({ default: module.SchoolMap })),
);

interface IndicatorOverviewProps {
  endYear: number;
  metrics: MetricDefinition[];
  schools: School[];
  subgroup: SubgroupId;
  weights: Record<string, number>;
  onWeightsChange: (weights: Record<string, number>) => void;
}

interface RadarChartProps {
  metrics: MetricDefinition[];
  series: SchoolIndicatorScores[];
}

const RADAR_WIDTH = 360;
const RADAR_HEIGHT = 330;
const RADAR_CENTER_X = 180;
const RADAR_CENTER_Y = 158;
const RADAR_RADIUS = 102;

function radarPoint(index: number, total: number, radius: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: RADAR_CENTER_X + Math.cos(angle) * radius,
    y: RADAR_CENTER_Y + Math.sin(angle) * radius,
  };
}

function pointsAttribute(points: Array<{ x: number; y: number }>) {
  return points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function partialRadarPath(
  points: Array<{ x: number; y: number } | null>,
  complete: boolean,
) {
  if (complete) {
    const present = points.filter(
      (point): point is { x: number; y: number } => point !== null,
    );
    return `${pointsAttribute(present)} ${present[0] ? `${present[0].x},${present[0].y}` : ""}`;
  }
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

function RadarChart({ metrics, series }: RadarChartProps) {
  if (metrics.length < 3) {
    return (
      <div className="radar-fallback">
        At least three indicators are needed for the radar view.
      </div>
    );
  }
  const axes = metrics.map((_, index) =>
    radarPoint(index, metrics.length, RADAR_RADIUS),
  );

  return (
    <>
      <svg
        aria-labelledby="radar-title radar-description"
        className="radar-chart"
        role="img"
        viewBox={`0 0 ${RADAR_WIDTH} ${RADAR_HEIGHT}`}
      >
        <title id="radar-title">All indicators comparison</title>
        <desc id="radar-description">
          {metrics.length} indicators normalized to a zero to one hundred
          comparison scale. Missing indicators are not plotted.
        </desc>
        {[25, 50, 75, 100].map((level) => (
          <polygon
            className="radar-grid"
            key={level}
            points={pointsAttribute(
              metrics.map((_, index) =>
                radarPoint(index, metrics.length, (RADAR_RADIUS * level) / 100),
              ),
            )}
          />
        ))}
        {axes.map((point, index) => (
          <line
            className="radar-axis"
            key={metrics[index]!.id}
            x1={RADAR_CENTER_X}
            x2={point.x}
            y1={RADAR_CENTER_Y}
            y2={point.y}
          />
        ))}
        {metrics.map((metric, index) => {
          const point = radarPoint(index, metrics.length, RADAR_RADIUS + 31);
          const anchor =
            point.x < RADAR_CENTER_X - 14
              ? "end"
              : point.x > RADAR_CENTER_X + 14
                ? "start"
                : "middle";
          return (
            <text
              className="radar-label"
              key={metric.id}
              textAnchor={anchor}
              x={point.x}
              y={point.y + 4}
            >
              {metric.navLabel}
            </text>
          );
        })}
        <text
          className="radar-scale"
          x={RADAR_CENTER_X + 4}
          y={RADAR_CENTER_Y - RADAR_RADIUS + 12}
        >
          100
        </text>
        <text
          className="radar-scale"
          x={RADAR_CENTER_X + 4}
          y={RADAR_CENTER_Y - RADAR_RADIUS / 2 + 4}
        >
          50
        </text>
        {series.map(({ school, values }) => {
          const points = metrics.map((metric, index) => {
            const value = values[metric.id];
            return value === null || value === undefined
              ? null
              : radarPoint(index, metrics.length, (RADAR_RADIUS * value) / 100);
          });
          const complete = points.every((point) => point !== null);
          return (
            <g key={school.id}>
              {complete ? (
                <polygon
                  className="radar-series radar-series--complete"
                  fill={school.color}
                  points={partialRadarPath(points, true)}
                  stroke={school.color}
                />
              ) : (
                <path
                  className="radar-series"
                  d={partialRadarPath(points, false)}
                  fill="none"
                  stroke={school.color}
                />
              )}
              {points.map((point, index) =>
                point ? (
                  <circle
                    className="radar-point"
                    cx={point.x}
                    cy={point.y}
                    fill={school.color}
                    key={`${school.id}-${metrics[index]!.id}`}
                    r="3.5"
                  >
                    <title>
                      {school.name}, {metrics[index]!.navLabel}:{" "}
                      {Math.round(values[metrics[index]!.id] ?? 0)}
                    </title>
                  </circle>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>
      <div className="radar-legend">
        {series.map(({ school, values }) => {
          const coverage = metrics.filter(
            (metric) => values[metric.id] !== null,
          ).length;
          return (
            <span key={school.id}>
              <i style={{ backgroundColor: school.color }} />
              <b>{school.name}</b>
              <small>
                {coverage}/{metrics.length}
              </small>
            </span>
          );
        })}
      </div>
    </>
  );
}

function DeferredSchoolMap({ schools }: { schools: School[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="deferred-map" ref={containerRef}>
      {visible ? (
        <Suspense fallback={<div className="map-fallback">Loading map…</div>}>
          <LazySchoolMap schools={schools} />
        </Suspense>
      ) : (
        <div className="map-fallback">
          Map loads when this section is visible.
        </div>
      )}
    </div>
  );
}

function normalizedWeights(
  weights: Record<string, number>,
  metricIds: string[],
) {
  const total = metricIds.reduce(
    (sum, metricId) => sum + Math.max(0, weights[metricId] ?? 0),
    0,
  );
  if (total === 0) {
    return { ...DEFAULT_INDICATOR_WEIGHTS };
  }
  const next = Object.fromEntries(
    metricIds.map((metricId) => [
      metricId,
      Math.round((Math.max(0, weights[metricId] ?? 0) / total) * 100 * 10) / 10,
    ]),
  );
  const roundedTotal = metricIds.reduce(
    (sum, metricId) => sum + (next[metricId] ?? 0),
    0,
  );
  const lastMetric = metricIds.at(-1);
  if (lastMetric) {
    next[lastMetric] = Math.max(
      0,
      Math.round(((next[lastMetric] ?? 0) + 100 - roundedTotal) * 10) / 10,
    );
  }
  return next;
}

export function IndicatorOverview({
  endYear,
  metrics,
  schools,
  subgroup,
  weights,
  onWeightsChange,
}: IndicatorOverviewProps) {
  const metricById = new Map(metrics.map((metric) => [metric.id, metric]));
  const indicatorMetrics = INDICATOR_IDS.flatMap((metricId) => {
    const metric = metricById.get(metricId);
    return metric ? [metric] : [];
  });
  const metricIds = indicatorMetrics.map((metric) => metric.id);
  const series = schools.map((school) =>
    indicatorScoresForSchool(school, indicatorMetrics, subgroup, endYear),
  );
  const totalWeight = metricIds.reduce(
    (sum, metricId) => sum + Math.max(0, weights[metricId] ?? 0),
    0,
  );

  if (schools.length === 0) {
    return null;
  }

  return (
    <section className="indicator-overview" aria-labelledby="overview-title">
      <header className="overview-header">
        <div>
          <p className="eyebrow">Latest year · {formatSchoolYear(endYear)}</p>
          <h2 id="overview-title">All indicators comparison</h2>
        </div>
        <p>
          A common 0–100 comparison scale makes indicators easier to scan. It is
          not a percentile or CDE rating.
        </p>
      </header>
      <div className="analysis-grid">
        <article className="analysis-card radar-card">
          <div className="analysis-card-header">
            <h3>{indicatorMetrics.length}-indicator profile</h3>
            <span>Higher is better</span>
          </div>
          <RadarChart metrics={indicatorMetrics} series={series} />
          <p className="analysis-note">
            Rates keep their natural 0–100 scale; lower-is-better rates are
            reversed. Academic distance maps −150 to 0, standard to 50, and +150
            to 100. Missing values are not plotted.
          </p>
        </article>

        <article className="analysis-card composite-card">
          <div className="analysis-card-header">
            <h3>Experimental composite</h3>
            <span>Not an official rating</span>
          </div>
          <div className="composite-results">
            {series.map(({ school, values }) => {
              const result = calculateComposite(values, weights, metricIds);
              const coveragePercent =
                result.totalWeight > 0
                  ? (result.availableWeight / result.totalWeight) * 100
                  : 0;
              return (
                <div className="composite-result" key={school.id}>
                  <span>
                    <i style={{ backgroundColor: school.color }} />
                    <b>{school.name}</b>
                  </span>
                  <strong>
                    {result.score === null ? "N/A" : Math.round(result.score)}
                    {result.score === null ? null : <small>/100</small>}
                  </strong>
                  <div className="coverage-bar" aria-hidden="true">
                    <span style={{ width: `${coveragePercent}%` }} />
                  </div>
                  <small>
                    Data coverage: {result.availableCount}/{result.totalCount}
                    {result.totalWeight > 0
                      ? ` · ${Math.round(coveragePercent)}% of weight`
                      : ""}
                  </small>
                </div>
              );
            })}
          </div>
          <details className="weight-controls" open>
            <summary>
              <span>Indicator weights</span>
              <b
                className={
                  Math.abs(totalWeight - 100) > 0.05
                    ? "weight-total--warning"
                    : ""
                }
              >
                {totalWeight.toFixed(totalWeight % 1 === 0 ? 0 : 1)}%
              </b>
            </summary>
            <div className="weight-list">
              {indicatorMetrics.map((metric) => (
                <label key={metric.id}>
                  <span>{metric.navLabel}</span>
                  <input
                    aria-label={`${metric.navLabel} weight`}
                    inputMode="decimal"
                    max="100"
                    min="0"
                    onChange={(event) => {
                      const value = Number.parseFloat(event.target.value);
                      onWeightsChange({
                        ...weights,
                        [metric.id]: Number.isFinite(value)
                          ? Math.min(100, Math.max(0, value))
                          : 0,
                      });
                    }}
                    step="1"
                    type="number"
                    value={weights[metric.id] ?? 0}
                  />
                  <em>%</em>
                </label>
              ))}
            </div>
            <div className="weight-actions">
              <button
                disabled={totalWeight === 0}
                onClick={() =>
                  onWeightsChange(normalizedWeights(weights, metricIds))
                }
                type="button"
              >
                Normalize to 100%
              </button>
              <button
                onClick={() =>
                  onWeightsChange({ ...DEFAULT_INDICATOR_WEIGHTS })
                }
                type="button"
              >
                Reset defaults
              </button>
            </div>
          </details>
          <p className="analysis-note">
            Missing indicators are excluded and remaining weights are
            rebalanced. Compare data coverage and grade span before comparing
            scores.
          </p>
        </article>

        <article className="analysis-card map-card">
          <div className="analysis-card-header">
            <h3>Selected schools on map</h3>
            <span>{schools.length} selected</span>
          </div>
          <DeferredSchoolMap schools={schools} />
          <div className="map-legend">
            {schools.map((school) => (
              <span key={school.id}>
                <i style={{ backgroundColor: school.color }} />
                {school.name}
              </span>
            ))}
          </div>
          <p className="map-warning">
            <b>Nearby does not mean assigned.</b> Locations are approximate and
            shown for context only. Verify attendance boundaries with the
            district.
          </p>
        </article>
      </div>
    </section>
  );
}
