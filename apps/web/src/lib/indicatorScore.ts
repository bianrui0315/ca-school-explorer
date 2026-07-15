import type { MetricDefinition, School, SubgroupId } from "../types";

export const INDICATOR_IDS = [
  "a_g_completion_rate",
  "chronic_absenteeism_rate",
  "college_career_prepared_rate",
  "ela_distance_from_standard",
  "four_year_dropout_rate",
  "four_year_graduation_rate",
  "math_distance_from_standard",
  "suspension_rate",
] as const;

export const DEFAULT_INDICATOR_WEIGHTS: Record<string, number> = {
  a_g_completion_rate: 6,
  chronic_absenteeism_rate: 12,
  college_career_prepared_rate: 14,
  ela_distance_from_standard: 18,
  four_year_dropout_rate: 8,
  four_year_graduation_rate: 12,
  math_distance_from_standard: 18,
  suspension_rate: 12,
};

export interface SchoolIndicatorScores {
  school: School;
  values: Record<string, number | null>;
}

export interface CompositeResult {
  score: number | null;
  availableCount: number;
  availableWeight: number;
  totalCount: number;
  totalWeight: number;
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function normalizeIndicatorValue(
  value: number | null | undefined,
  metric: MetricDefinition,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  if (metric.unit === "percent") {
    return clamp(metric.direction === "lower" ? 100 - value : value);
  }
  if (metric.unit === "points") {
    return clamp(50 + value / 3);
  }
  return null;
}

export function indicatorScoresForSchool(
  school: School,
  metrics: MetricDefinition[],
  subgroup: SubgroupId,
  year: number,
): SchoolIndicatorScores {
  return {
    school,
    values: Object.fromEntries(
      metrics.map((metric) => {
        const observation = school.metrics[metric.id]?.[subgroup]?.find(
          (candidate) => candidate.year === year,
        );
        return [metric.id, normalizeIndicatorValue(observation?.value, metric)];
      }),
    ),
  };
}

export function calculateComposite(
  values: Record<string, number | null>,
  weights: Record<string, number>,
  metricIds: string[],
): CompositeResult {
  let weightedSum = 0;
  let availableWeight = 0;
  let availableCount = 0;
  let totalWeight = 0;

  metricIds.forEach((metricId) => {
    const weight = Math.max(0, weights[metricId] ?? 0);
    const value = values[metricId];
    totalWeight += weight;
    if (value === null || value === undefined) {
      return;
    }
    availableCount += 1;
    if (weight > 0) {
      weightedSum += value * weight;
      availableWeight += weight;
    }
  });

  return {
    score: availableWeight > 0 ? weightedSum / availableWeight : null,
    availableCount,
    availableWeight,
    totalCount: metricIds.length,
    totalWeight,
  };
}
