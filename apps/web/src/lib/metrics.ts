import type { MetricDefinition, Observation } from "../types";

export function observationsInRange(
  observations: Observation[],
  startYear: number,
  endYear: number,
) {
  return observations.filter(
    ({ year }) => year >= startYear && year <= endYear,
  );
}

export function latestObservation(
  observations: Observation[],
  endYear: number,
) {
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    const observation = observations[index];
    if (observation && observation.year <= endYear) {
      return observation;
    }
  }
  return undefined;
}

export function firstObservation(
  observations: Observation[],
  startYear: number,
) {
  return observations.find(({ year }) => year >= startYear);
}

export function metricChange(
  observations: Observation[],
  startYear: number,
  endYear: number,
) {
  const first = firstObservation(observations, startYear);
  const latest = latestObservation(observations, endYear);
  if (first?.value === null || latest?.value === null || !first || !latest) {
    return null;
  }
  return latest.value - first.value;
}

export function formatMetricValue(
  value: number | null | undefined,
  metric: MetricDefinition,
  signed = false,
) {
  if (value === null || value === undefined) {
    return "—";
  }
  const digits = metric.unit === "percent" ? 1 : 0;
  const sign = signed && value > 0 ? "+" : "";
  const suffix = metric.unit === "percent" ? "%" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

export function formatSchoolYear(year: number) {
  return `${year}\u2013${String(year + 1).slice(-2)}`;
}

export function reliabilityLabel(observation: Observation | undefined) {
  switch (observation?.reliability) {
    case "reliable":
      return "Reliable";
    case "small-sample":
      return "Small sample";
    case "suppressed":
      return "Suppressed";
    case "method-break":
      return "Method change";
    default:
      return "Not available";
  }
}

export function changeStatus(change: number | null, metric: MetricDefinition) {
  if (change === null || change === 0) {
    return "neutral";
  }
  const improved = metric.direction === "higher" ? change > 0 : change < 0;
  return improved ? "improved" : "declined";
}
