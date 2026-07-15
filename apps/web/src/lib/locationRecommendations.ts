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
export type LocationPriority =
  | "academics"
  | "attendance"
  | "climate"
  | "readiness";
export type LocationSchoolTypeFilter =
  | "all"
  | "district"
  | "charter"
  | "magnet";

export interface LocationRecommendationOptions {
  grade: string;
  minimumCoverage: number;
  priorityMultipliers: Record<LocationPriority, number>;
  schoolType: LocationSchoolTypeFilter;
}

export interface LocationCategoryScore {
  availableWeight: number;
  label: string;
  score: number;
  weightShare: number;
}

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
  categoryScores: Partial<Record<LocationPriority, LocationCategoryScore>>;
  comparable: boolean;
  distanceMiles: number;
  evidence: Record<string, SchoolEvidenceValue>;
  primaryDriver: LocationCategoryScore | null;
  school: SchoolSummary;
  score: number | null;
  totalCount: number;
  totalWeight: number;
  weights: Record<string, number>;
}

export interface GradeBandRecommendations {
  band: GradeBand;
  eligibleCount: number;
  nearbyCount: number;
  results: LocationSchoolMatch[];
}

export const LOCATION_PRIORITY_LABELS: Record<LocationPriority, string> = {
  academics: "Academic performance",
  attendance: "Attendance",
  climate: "School climate",
  readiness: "Graduation and college preparation",
};

export const LOCATION_GRADE_OPTIONS = [
  { label: "Any grade", value: "" },
  { label: "Transitional kindergarten", value: "TK" },
  { label: "Kindergarten", value: "K" },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: `Grade ${index + 1}`,
    value: String(index + 1),
  })),
];

export const LOCATION_SCHOOL_TYPE_LABELS: Record<
  LocationSchoolTypeFilter,
  string
> = {
  all: "All public schools",
  district: "District-operated",
  charter: "Charter",
  magnet: "Magnet",
};

export const DEFAULT_LOCATION_RECOMMENDATION_OPTIONS: LocationRecommendationOptions =
  {
    grade: "",
    minimumCoverage: 0.5,
    priorityMultipliers: {
      academics: 1,
      attendance: 1,
      climate: 1,
      readiness: 1,
    },
    schoolType: "all",
  };

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
    a_g_completion_rate: 8,
    chronic_absenteeism_rate: 10,
    college_career_prepared_rate: 12,
    ela_distance_from_standard: 20,
    four_year_dropout_rate: 8,
    four_year_graduation_rate: 12,
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

const METRIC_PRIORITIES: Record<string, LocationPriority> = {
  a_g_completion_rate: "readiness",
  chronic_absenteeism_rate: "attendance",
  college_career_prepared_rate: "readiness",
  ela_distance_from_standard: "academics",
  four_year_dropout_rate: "readiness",
  four_year_graduation_rate: "readiness",
  math_distance_from_standard: "academics",
  suspension_rate: "climate",
};

export function defaultLocationRecommendationOptions(): LocationRecommendationOptions {
  return {
    ...DEFAULT_LOCATION_RECOMMENDATION_OPTIONS,
    priorityMultipliers: {
      ...DEFAULT_LOCATION_RECOMMENDATION_OPTIONS.priorityMultipliers,
    },
  };
}

export function gradeBandForGrade(grade: string): GradeBand | undefined {
  return (Object.entries(BAND_GRADES) as [GradeBand, Set<string>][]).find(
    ([, grades]) => grades.has(grade),
  )?.[0];
}

function schoolServesBand(school: SchoolSummary, band: GradeBand) {
  return gradesServed(school.gradeSpan).some((grade) =>
    BAND_GRADES[band].has(grade),
  );
}

function schoolMatchesType(
  school: SchoolSummary,
  schoolType: LocationSchoolTypeFilter,
) {
  switch (schoolType) {
    case "district":
      return !school.charter;
    case "charter":
      return school.charter;
    case "magnet":
      return school.magnet;
    default:
      return true;
  }
}

function effectiveWeights(
  band: GradeBand,
  options: LocationRecommendationOptions,
) {
  return Object.fromEntries(
    Object.entries(LOCATION_EVIDENCE_WEIGHTS[band]).map(
      ([metricId, baseWeight]) => [
        metricId,
        baseWeight * options.priorityMultipliers[METRIC_PRIORITIES[metricId]!],
      ],
    ),
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
  options: LocationRecommendationOptions = defaultLocationRecommendationOptions(),
): LocationSchoolMatch {
  const weights = effectiveWeights(band, options);
  const evidence = latestEvidenceForSchool(school, manifest);
  let weightedSum = 0;
  let availableWeight = 0;
  let availableCount = 0;
  let hasAcademicEvidence = false;
  const categoryTotals = new Map<
    LocationPriority,
    { availableWeight: number; weightedSum: number }
  >();
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
    const category = METRIC_PRIORITIES[metricId]!;
    const categoryTotal = categoryTotals.get(category) ?? {
      availableWeight: 0,
      weightedSum: 0,
    };
    categoryTotal.availableWeight += weight;
    categoryTotal.weightedSum += normalized * weight;
    categoryTotals.set(category, categoryTotal);
  });

  const totalWeight = metricIds.reduce(
    (total, metricId) => total + (weights[metricId] ?? 0),
    0,
  );
  const categoryScores = Object.fromEntries(
    [...categoryTotals.entries()].map(([category, categoryTotal]) => [
      category,
      {
        availableWeight: categoryTotal.availableWeight,
        label: LOCATION_PRIORITY_LABELS[category],
        score: categoryTotal.weightedSum / categoryTotal.availableWeight,
        weightShare:
          availableWeight > 0
            ? categoryTotal.availableWeight / availableWeight
            : 0,
      },
    ]),
  ) as Partial<Record<LocationPriority, LocationCategoryScore>>;
  const primaryDriver =
    Object.values(categoryScores).sort(
      (left, right) =>
        right.score * right.availableWeight -
          left.score * left.availableWeight ||
        right.availableWeight - left.availableWeight,
    )[0] ?? null;
  return {
    availableCount,
    availableWeight,
    band,
    categoryScores,
    comparable:
      hasAcademicEvidence &&
      totalWeight > 0 &&
      availableWeight / totalWeight >= options.minimumCoverage,
    distanceMiles,
    evidence,
    primaryDriver,
    school,
    score: availableWeight > 0 ? weightedSum / availableWeight : null,
    totalCount: metricIds.length,
    totalWeight,
    weights,
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
  options: LocationRecommendationOptions = defaultLocationRecommendationOptions(),
): GradeBandRecommendations[] {
  const nearby = schools.flatMap((school) => {
    const distanceMiles = distanceFromLocation(center, school);
    return distanceMiles === undefined ||
      distanceMiles > radiusMiles ||
      !schoolMatchesType(school, options.schoolType) ||
      (options.grade && !gradesServed(school.gradeSpan).includes(options.grade))
      ? []
      : [{ school, distanceMiles }];
  });

  const selectedBand = gradeBandForGrade(options.grade);
  const bands: readonly GradeBand[] = selectedBand
    ? [selectedBand]
    : ["elementary", "middle", "high"];
  return bands.map((band) => {
    const candidates = nearby.filter(({ school }) =>
      schoolServesBand(school, band),
    );
    const scored = candidates.map(({ school, distanceMiles }) =>
      scoreSchoolForBand(school, band, distanceMiles, manifest, options),
    );
    const eligible = scored.filter(
      (match) => match.comparable && match.score !== null,
    );
    return {
      band,
      eligibleCount: eligible.length,
      nearbyCount: candidates.length,
      results: eligible.sort(compareMatches).slice(0, limit),
    };
  });
}
