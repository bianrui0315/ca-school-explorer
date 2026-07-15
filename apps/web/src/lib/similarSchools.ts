import type {
  MetricSeries,
  Observation,
  PublicManifest,
  SchoolDetail,
  SchoolSummary,
} from "../types";

export interface SimilarSchoolMatch {
  school: SchoolSummary;
  reasons: string[];
}

const FEATURE_WEIGHTS = {
  gradeOverlap: 0.22,
  enrollment: 0.18,
  englishLearner: 0.17,
  studentsWithDisabilities: 0.15,
  socioeconomicallyDisadvantaged: 0.18,
  schoolType: 0.04,
  charter: 0.03,
  titleI: 0.02,
  magnet: 0.01,
} as const;

const GRADE_VALUES: Record<string, number> = {
  "Pre-K": -2,
  TK: -1,
  K: 0,
};

function gradeValue(label: string) {
  const normalized = label.trim();
  if (normalized in GRADE_VALUES) {
    return GRADE_VALUES[normalized];
  }
  const value = Number.parseInt(normalized, 10);
  return Number.isFinite(value) && value >= 0 && value <= 12
    ? value
    : undefined;
}

function gradeRange(span: string) {
  const labels = span.split(/[–-]/);
  const lowLabel = labels[0];
  if (!lowLabel) {
    return undefined;
  }
  const highLabel = labels[1] ?? lowLabel;
  const low = gradeValue(lowLabel);
  const high = gradeValue(highLabel);
  if (low === undefined || high === undefined || high < low) {
    return undefined;
  }
  return { low, high };
}

function gradeOverlap(first: SchoolSummary, second: SchoolSummary) {
  const left = gradeRange(first.gradeSpan);
  const right = gradeRange(second.gradeSpan);
  if (!left || !right) {
    return undefined;
  }
  const intersection = Math.max(
    0,
    Math.min(left.high, right.high) - Math.max(left.low, right.low) + 1,
  );
  const union =
    Math.max(left.high, right.high) - Math.min(left.low, right.low) + 1;
  return intersection / union;
}

function virtualGroup(value: string) {
  return value === "V" || value === "F" ? "virtual" : "campus";
}

function normalizedDifference(
  first: number | null | undefined,
  second: number | null | undefined,
  scale: number,
) {
  if (
    first === null ||
    first === undefined ||
    second === null ||
    second === undefined
  ) {
    return undefined;
  }
  return Math.min(Math.abs(first - second) / scale, 1);
}

function enrollmentDifference(first: SchoolSummary, second: SchoolSummary) {
  if (!first.enrollment || !second.enrollment) {
    return undefined;
  }
  return Math.min(
    Math.abs(Math.log(second.enrollment / first.enrollment)) / Math.log(4),
    1,
  );
}

function contextDistance(anchor: SchoolSummary, candidate: SchoolSummary) {
  const overlap = gradeOverlap(anchor, candidate);
  if (
    anchor.schoolLevel !== candidate.schoolLevel ||
    anchor.dass !== candidate.dass ||
    virtualGroup(anchor.virtualType) !== virtualGroup(candidate.virtualType) ||
    overlap === undefined ||
    overlap < 0.5
  ) {
    return undefined;
  }

  const features: Array<[number | undefined, number]> = [
    [1 - overlap, FEATURE_WEIGHTS.gradeOverlap],
    [enrollmentDifference(anchor, candidate), FEATURE_WEIGHTS.enrollment],
    [
      normalizedDifference(
        anchor.peerContext?.englishLearnerPercent,
        candidate.peerContext?.englishLearnerPercent,
        35,
      ),
      FEATURE_WEIGHTS.englishLearner,
    ],
    [
      normalizedDifference(
        anchor.peerContext?.studentsWithDisabilitiesPercent,
        candidate.peerContext?.studentsWithDisabilitiesPercent,
        25,
      ),
      FEATURE_WEIGHTS.studentsWithDisabilities,
    ],
    [
      normalizedDifference(
        anchor.peerContext?.socioeconomicallyDisadvantagedPercent,
        candidate.peerContext?.socioeconomicallyDisadvantagedPercent,
        50,
      ),
      FEATURE_WEIGHTS.socioeconomicallyDisadvantaged,
    ],
    [
      anchor.schoolType === candidate.schoolType ? 0 : 1,
      FEATURE_WEIGHTS.schoolType,
    ],
    [anchor.charter === candidate.charter ? 0 : 1, FEATURE_WEIGHTS.charter],
    [anchor.titleI === candidate.titleI ? 0 : 1, FEATURE_WEIGHTS.titleI],
    [anchor.magnet === candidate.magnet ? 0 : 1, FEATURE_WEIGHTS.magnet],
  ];
  const available = features.filter(
    (feature): feature is [number, number] => feature[0] !== undefined,
  );
  const availableWeight = available.reduce(
    (sum, [, weight]) => sum + weight,
    0,
  );
  if (availableWeight < 0.7) {
    return undefined;
  }
  return (
    available.reduce(
      (sum, [difference, weight]) => sum + difference * weight,
      0,
    ) / availableWeight
  );
}

function percentagePointReason(label: string, difference: number) {
  const points = Math.max(1, Math.round(difference));
  return `${label} share within ${points} ${points === 1 ? "point" : "points"}`;
}

function reasonsFor(anchor: SchoolSummary, candidate: SchoolSummary) {
  const reasons: Array<{ priority: number; text: string }> = [];
  const overlap = gradeOverlap(anchor, candidate) ?? 0;
  reasons.push({
    priority: anchor.gradeSpan === candidate.gradeSpan ? 0 : 0.1,
    text:
      anchor.gradeSpan === candidate.gradeSpan
        ? `Same ${anchor.gradeSpan} grade span`
        : `${Math.round(overlap * 100)}% grade overlap`,
  });

  if (anchor.enrollment && candidate.enrollment) {
    const difference = Math.round(
      (Math.abs(candidate.enrollment - anchor.enrollment) / anchor.enrollment) *
        100,
    );
    reasons.push({
      priority: difference / 100,
      text: `Enrollment within ${difference}%`,
    });
  }

  const demographicReasons: Array<
    [string, number | null | undefined, number | null | undefined]
  > = [
    [
      "EL",
      anchor.peerContext?.englishLearnerPercent,
      candidate.peerContext?.englishLearnerPercent,
    ],
    [
      "SWD",
      anchor.peerContext?.studentsWithDisabilitiesPercent,
      candidate.peerContext?.studentsWithDisabilitiesPercent,
    ],
    [
      "SED",
      anchor.peerContext?.socioeconomicallyDisadvantagedPercent,
      candidate.peerContext?.socioeconomicallyDisadvantagedPercent,
    ],
  ];
  for (const [label, anchorValue, candidateValue] of demographicReasons) {
    if (
      anchorValue === null ||
      anchorValue === undefined ||
      candidateValue === null ||
      candidateValue === undefined
    ) {
      continue;
    }
    const difference = Math.abs(anchorValue - candidateValue);
    reasons.push({
      priority: 0.15 + difference / 100,
      text: percentagePointReason(label, difference),
    });
  }

  if (anchor.charter && candidate.charter) {
    reasons.push({ priority: 0.4, text: "Both charter schools" });
  }
  if (anchor.titleI && candidate.titleI) {
    reasons.push({ priority: 0.41, text: "Both Title I" });
  }
  if (anchor.magnet && candidate.magnet) {
    reasons.push({ priority: 0.42, text: "Both magnet programs" });
  }
  return reasons
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3)
    .map(({ text }) => text);
}

export function findSimilarSchools(
  anchor: SchoolSummary,
  schools: SchoolSummary[],
  limit = 12,
): SimilarSchoolMatch[] {
  return schools
    .flatMap((school) => {
      if (school.id === anchor.id || school.status.toLowerCase() !== "active") {
        return [];
      }
      const distance = contextDistance(anchor, school);
      return distance === undefined
        ? []
        : [{ distance, school, reasons: reasonsFor(anchor, school) }];
    })
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.school.name.localeCompare(right.school.name),
    )
    .slice(0, Math.max(0, limit))
    .map(({ school, reasons }) => ({ school, reasons }));
}

function aggregateObservations(observations: Observation[]) {
  const byYear = new Map<number, Observation[]>();
  for (const observation of observations) {
    if (
      observation.value === null ||
      !observation.denominator ||
      observation.denominator <= 0 ||
      observation.reliability === "suppressed" ||
      observation.reliability === "not-available"
    ) {
      continue;
    }
    const rows = byYear.get(observation.year) ?? [];
    rows.push(observation);
    byYear.set(observation.year, rows);
  }
  return [...byYear.entries()]
    .sort(([left], [right]) => left - right)
    .map(([year, rows]) => {
      const denominator = rows.reduce(
        (sum, row) => sum + (row.denominator ?? 0),
        0,
      );
      const value =
        rows.reduce(
          (sum, row) => sum + (row.value ?? 0) * (row.denominator ?? 0),
          0,
        ) / denominator;
      const numerators = rows.map((row) => row.numerator);
      return {
        year,
        value: Math.round(value * 10) / 10,
        numerator: numerators.every((number) => number !== null)
          ? numerators.reduce<number>((sum, number) => sum + (number ?? 0), 0)
          : null,
        denominator,
        reliability: rows.some((row) => row.reliability === "method-break")
          ? "method-break"
          : denominator < 30
            ? "small-sample"
            : "reliable",
        sourceSnapshotId: Math.max(...rows.map((row) => row.sourceSnapshotId)),
      } satisfies Observation;
    });
}

export function buildPeerMetricSeries(
  schools: SchoolDetail[],
  manifest: Pick<PublicManifest, "metrics" | "subgroups">,
): MetricSeries {
  return Object.fromEntries(
    manifest.metrics.map((metric) => [
      metric.id,
      Object.fromEntries(
        manifest.subgroups.map((subgroup) => [
          subgroup.id,
          aggregateObservations(
            schools.flatMap(
              (school) => school.metrics[metric.id]?.[subgroup.id] ?? [],
            ),
          ),
        ]),
      ),
    ]),
  ) as MetricSeries;
}
