import { normalizeIndicatorValue } from "./indicatorScore";
import { distanceFromLocation, type LocationPoint } from "./schoolDistance";
import { gradesServed } from "./schoolSearch";
import type {
  MetricDefinition,
  PublicManifest,
  Reliability,
  SchoolSummary,
} from "../types";

export type GradeBand = "elementary" | "middle" | "high";

export interface SchoolEvidenceValue {
  denominator: number | null;
  metric: MetricDefinition;
  reliability: Reliability;
  value: number | null;
  year: number;
}

export interface LocationSchoolMatch {
  availableCount: number;
  availableWeight: number;
  band: GradeBand;
  comparable: boolean;
  distanceMiles: number;
  evidence: Record<string, SchoolEvidenceValue>;
  school: SchoolSummary;
  score: number | null;
  totalCount: number;
  totalWeight: number;
}

export interface GradeBandRecommendations {
  band: GradeBand;
  nearbyCount: number;
  results: LocationSchoolMatch[];
}

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  elementary: "Elementary",
  middle: "Middle",
  high: "High",
};

export const LOCATION_EVIDENCE_WEIGHTS: Record<
  GradeBand,
  Record<string, number>
> = {
  elementary: {
    chronic_absenteeism_rate: 20,
    ela_distance_from_standard: 35,
    math_distance_from_standard: 35,
    suspension_rate: 10,
  },
  middle: {
    chronic_absenteeism_rate: 20,
    ela_distance_from_standard: 35,
    math_distance_from_standard: 35,
    suspension_rate: 10,
  },
  high: {
    a_g_completion_rate: 15,
    chronic_absenteeism_rate: 10,
    ela_distance_from_standard: 20,
    four_year_dropout_rate: 10,
    four_year_graduation_rate: 15,
    math_distance_from_standard: 20,
    suspension_rate: 10,
  },
};

const BAND_GRADES: Record<GradeBand, Set<string>> = {
  elementary: new Set(["PK", "TK", "K", "1", "2", "3", "4", "5"]),
  middle: new Set(["6", "7", "8"]),
  high: new Set(["9", "10", "11", "12"]),
};

const ACADEMIC_METRICS = new Set([
  "ela_distance_from_standard",
  "math_distance_from_standard",
]);

function schoolServesBand(school: SchoolSummary, band: GradeBand) {
  return gradesServed(school.gradeSpan).some((grade) =>
    BAND_GRADES[band].has(grade),
  );
}

export function latestEvidenceForSchool(
  school: SchoolSummary,
  manifest: PublicManifest,
) {
  return Object.fromEntries(
    (school.latestObservations ?? []).flatMap(
      ([year, metricIndex, value, denominator, reliabilityCode]) => {
        const metric = manifest.metrics[metricIndex];
        const reliability = manifest.reliabilityCodes[String(reliabilityCode)];
        return metric && reliability
          ? [
              [
                metric.id,
                { year, value, denominator, reliability, metric },
              ] as const,
            ]
          : [];
      },
    ),
  ) as Record<string, SchoolEvidenceValue>;
}

export function scoreSchoolForBand(
  school: SchoolSummary,
  band: GradeBand,
  distanceMiles: number,
  manifest: PublicManifest,
): LocationSchoolMatch {
  const weights = LOCATION_EVIDENCE_WEIGHTS[band];
  const evidence = latestEvidenceForSchool(school, manifest);
  let weightedSum = 0;
  let availableWeight = 0;
  let availableCount = 0;
  let hasAcademicEvidence = false;
  const metricIds = Object.keys(weights);

  metricIds.forEach((metricId) => {
    const weight = weights[metricId] ?? 0;
    const value = evidence[metricId];
    if (!value || value.reliability !== "reliable") {
      return;
    }
    const normalized = normalizeIndicatorValue(value.value, value.metric);
    if (normalized === null) {
      return;
    }
    weightedSum += normalized * weight;
    availableWeight += weight;
    availableCount += 1;
    hasAcademicEvidence ||= ACADEMIC_METRICS.has(metricId);
  });

  const totalWeight = metricIds.reduce(
    (total, metricId) => total + (weights[metricId] ?? 0),
    0,
  );
  return {
    availableCount,
    availableWeight,
    band,
    comparable:
      hasAcademicEvidence &&
      totalWeight > 0 &&
      availableWeight / totalWeight >= 0.5,
    distanceMiles,
    evidence,
    school,
    score: availableWeight > 0 ? weightedSum / availableWeight : null,
    totalCount: metricIds.length,
    totalWeight,
  };
}

function compareMatches(left: LocationSchoolMatch, right: LocationSchoolMatch) {
  return (
    Number(right.comparable) - Number(left.comparable) ||
    (right.score ?? -1) - (left.score ?? -1) ||
    right.availableWeight - left.availableWeight ||
    left.distanceMiles - right.distanceMiles ||
    left.school.name.localeCompare(right.school.name)
  );
}

export function recommendSchoolsNearLocation(
  schools: SchoolSummary[],
  center: LocationPoint,
  radiusMiles: number,
  manifest: PublicManifest,
  limit = 3,
): GradeBandRecommendations[] {
  const nearby = schools.flatMap((school) => {
    const distanceMiles = distanceFromLocation(center, school);
    return distanceMiles === undefined || distanceMiles > radiusMiles
      ? []
      : [{ school, distanceMiles }];
  });

  return (["elementary", "middle", "high"] as const).map((band) => {
    const candidates = nearby.filter(({ school }) =>
      schoolServesBand(school, band),
    );
    return {
      band,
      nearbyCount: candidates.length,
      results: candidates
        .map(({ school, distanceMiles }) =>
          scoreSchoolForBand(school, band, distanceMiles, manifest),
        )
        .filter((match) => match.score !== null)
        .sort(compareMatches)
        .slice(0, limit),
    };
  });
}
