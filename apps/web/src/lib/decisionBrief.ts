import {
  formatMetricValue,
  formatSchoolYear,
  latestObservation,
} from "./metrics";
import { normalizeIndicatorValue } from "./indicatorScore";
import type {
  MetricDefinition,
  Observation,
  PublicManifest,
  School,
} from "../types";

export const DECISION_BRIEF_METRIC_IDS = [
  "ela_distance_from_standard",
  "math_distance_from_standard",
  "chronic_absenteeism_rate",
  "suspension_rate",
  "four_year_graduation_rate",
  "four_year_dropout_rate",
  "a_g_completion_rate",
  "college_career_prepared_rate",
] as const;

export interface BriefMetricEvidence {
  metric: MetricDefinition;
  observation?: Observation;
}

export interface BriefStrongestEvidence extends BriefMetricEvidence {
  normalizedScore: number;
}

function latestYear(manifest: PublicManifest) {
  return Math.max(
    ...manifest.outcomeSchoolYears.map((schoolYear) =>
      Number.parseInt(schoolYear.slice(0, 4), 10),
    ),
  );
}

export function decisionBriefMetrics(manifest: PublicManifest) {
  const metricById = new Map(
    manifest.metrics.map((metric) => [metric.id, metric]),
  );
  return DECISION_BRIEF_METRIC_IDS.flatMap((metricId) => {
    const metric = metricById.get(metricId);
    return metric ? [metric] : [];
  });
}

export function latestBriefEvidence(
  school: School,
  metric: MetricDefinition,
  manifest: PublicManifest,
): BriefMetricEvidence {
  return {
    metric,
    observation: latestObservation(
      school.metrics[metric.id]?.all ?? [],
      latestYear(manifest),
    ),
  };
}

export function strongestBriefEvidence(
  school: School,
  manifest: PublicManifest,
): BriefStrongestEvidence | undefined {
  return decisionBriefMetrics(manifest)
    .flatMap((metric) => {
      const evidence = latestBriefEvidence(school, metric, manifest);
      const normalizedScore = normalizeIndicatorValue(
        evidence.observation?.value,
        metric,
      );
      return normalizedScore !== null &&
        evidence.observation?.reliability === "reliable"
        ? [{ ...evidence, normalizedScore }]
        : [];
    })
    .sort((left, right) => right.normalizedScore - left.normalizedScore)[0];
}

export function strongestEvidenceSentence(
  school: School,
  manifest: PublicManifest,
) {
  const evidence = strongestBriefEvidence(school, manifest);
  if (!evidence?.observation) {
    return "No reliable latest-year brief indicator is available.";
  }
  return `${evidence.metric.navLabel} is the strongest normalized signal at ${formatMetricValue(
    evidence.observation.value,
    evidence.metric,
    evidence.metric.unit === "points",
  )} (${formatSchoolYear(evidence.observation.year)}).`;
}

export function briefDataGapSentence(school: School, manifest: PublicManifest) {
  const missing = decisionBriefMetrics(manifest).filter((metric) => {
    const observation = latestBriefEvidence(
      school,
      metric,
      manifest,
    ).observation;
    return observation?.value === null || observation?.value === undefined;
  });
  if (missing.length === 0) {
    return `${school.name} reports all ${decisionBriefMetrics(manifest).length} brief indicators.`;
  }
  return `${school.name} does not report ${missing
    .map((metric) => metric.navLabel)
    .join(", ")} in the latest available brief years.`;
}

export function widestBriefDifference(
  schools: School[],
  manifest: PublicManifest,
) {
  const candidates = decisionBriefMetrics(manifest).flatMap((metric) => {
    const values = schools.flatMap((school) => {
      const observation = latestBriefEvidence(
        school,
        metric,
        manifest,
      ).observation;
      const normalized = normalizeIndicatorValue(observation?.value, metric);
      return normalized !== null && observation?.reliability === "reliable"
        ? [{ normalized, observation, school }]
        : [];
    });
    if (values.length < 2) {
      return [];
    }
    const ordered = [...values].sort(
      (left, right) => right.normalized - left.normalized,
    );
    return [
      {
        high: ordered[0]!,
        low: ordered.at(-1)!,
        metric,
        spread: ordered[0]!.normalized - ordered.at(-1)!.normalized,
      },
    ];
  });
  const widest = [...candidates].sort(
    (left, right) => right.spread - left.spread,
  )[0];
  if (!widest) {
    return "Not enough comparable latest-year evidence is available to describe a material difference.";
  }
  return `The widest normalized difference is ${widest.metric.navLabel}: ${widest.high.school.name} reports ${formatMetricValue(
    widest.high.observation.value,
    widest.metric,
    widest.metric.unit === "points",
  )}, compared with ${formatMetricValue(
    widest.low.observation.value,
    widest.metric,
    widest.metric.unit === "points",
  )} at ${widest.low.school.name}.`;
}

export function briefTrendStatus(
  observations: Observation[],
  metric: MetricDefinition,
) {
  const reliable = observations.filter(
    (observation) =>
      observation.value !== null && observation.reliability === "reliable",
  );
  if (reliable.length < 2) {
    return "insufficient" as const;
  }
  const first = reliable[0]!.value as number;
  const last = reliable.at(-1)!.value as number;
  const rawChange = last - first;
  if (Math.abs(rawChange) < 0.05 || metric.direction === "neutral") {
    return "steady" as const;
  }
  const improved =
    metric.direction === "higher" ? rawChange > 0 : rawChange < 0;
  return improved ? ("improved" as const) : ("declined" as const);
}
