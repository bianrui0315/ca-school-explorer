import { describe, expect, it } from "vitest";
import type { MetricDefinition, PublicManifest, SchoolSummary } from "../types";
import {
  defaultLocationRecommendationOptions,
  recommendSchoolsNearLocation,
  scoreSchoolForBand,
} from "./locationRecommendations";

const metrics: MetricDefinition[] = [
  {
    id: "chronic_absenteeism_rate",
    navLabel: "Attendance",
    label: "Chronic absence",
    shortLabel: "Chronic absence",
    description: "Test",
    unit: "percent",
    direction: "lower",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
  {
    id: "ela_distance_from_standard",
    navLabel: "ELA",
    label: "ELA distance",
    shortLabel: "ELA distance",
    description: "Test",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
  {
    id: "math_distance_from_standard",
    navLabel: "Mathematics",
    label: "Math distance",
    shortLabel: "Math distance",
    description: "Test",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
  {
    id: "suspension_rate",
    navLabel: "Suspension",
    label: "Suspension rate",
    shortLabel: "Suspension rate",
    description: "Test",
    unit: "percent",
    direction: "lower",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
];

const manifest = {
  metrics,
  reliabilityCodes: { "0": "reliable", "1": "small-sample" },
} as unknown as PublicManifest;

function school(
  id: string,
  name: string,
  latitude: number,
  ela: number,
  math: number,
  overrides: Partial<SchoolSummary> = {},
): SchoolSummary {
  const base: SchoolSummary = {
    id,
    name,
    status: "active",
    countyCode: "19",
    county: "Los Angeles",
    districtId: "19647330000000",
    district: "Los Angeles Unified",
    shard: "19-0",
    city: "Porter Ranch",
    gradeSpan: "K–8",
    schoolType: "Elementary",
    schoolLevel: "Elementary",
    charter: false,
    virtualType: "N",
    magnet: false,
    titleI: false,
    dass: false,
    address: {
      street: "100 Test Ave.",
      city: "Porter Ranch",
      state: "CA",
      zip: "91326",
    },
    latitude,
    longitude: -118.58,
    enrollment: 500,
    staff: { total: 30, teachers: 25, administrators: 2 },
    latestObservations: [
      [2024, 0, 10, 100, 0, 1],
      [2024, 1, ela, 100, 0, 2],
      [2024, 2, math, 100, 0, 3],
      [2024, 3, 2, 100, 0, 4],
    ],
  };
  return { ...base, ...overrides };
}

describe("location recommendations", () => {
  it("uses grade-band weights and reports coverage", () => {
    const result = scoreSchoolForBand(
      school("1", "Strong School", 34.29, 90, 60),
      "elementary",
      2,
      manifest,
    );

    expect(result.score).toBeCloseTo(80.3, 1);
    expect(result.availableWeight).toBe(100);
    expect(result.comparable).toBe(true);
  });

  it("sorts evidence before proximity and groups schools by grades served", () => {
    const stronger = school("1", "Stronger School", 34.2, 90, 90);
    const closer = school("2", "Closer School", 34.293, 10, 10);
    const results = recommendSchoolsNearLocation(
      [closer, stronger],
      { latitude: 34.294, longitude: -118.58 },
      15,
      manifest,
    );

    expect(results[0]?.band).toBe("elementary");
    expect(results[0]?.results.map(({ school: item }) => item.name)).toEqual([
      "Stronger School",
      "Closer School",
    ]);
    expect(results[1]?.nearbyCount).toBe(2);
    expect(results[2]?.nearbyCount).toBe(0);
  });

  it("marks limited coverage as not comparable", () => {
    const limited = school("1", "Limited School", 34.29, 90, 60);
    limited.latestObservations = [[2024, 0, 5, 100, 0, 1]];

    expect(
      scoreSchoolForBand(limited, "elementary", 1, manifest).comparable,
    ).toBe(false);
  });

  it("applies exact grade, school type, and evidence coverage as eligibility filters", () => {
    const districtElementary = school(
      "1",
      "District Elementary",
      34.29,
      60,
      60,
    );
    const charterMiddle = school("2", "Charter Middle", 34.29, 60, 60, {
      charter: true,
      gradeSpan: "6–8",
      schoolLevel: "Middle",
    });
    const options = defaultLocationRecommendationOptions();
    options.grade = "6";
    options.schoolType = "charter";
    options.minimumCoverage = 0.9;
    charterMiddle.latestObservations = [
      [2024, 1, 60, 100, 0, 1],
      [2024, 2, 60, 100, 0, 2],
    ];

    const strict = recommendSchoolsNearLocation(
      [districtElementary, charterMiddle],
      { latitude: 34.29, longitude: -118.58 },
      5,
      manifest,
      3,
      options,
    );

    expect(strict).toHaveLength(1);
    expect(strict[0]?.band).toBe("middle");
    expect(strict[0]?.nearbyCount).toBe(1);
    expect(strict[0]?.eligibleCount).toBe(0);

    options.minimumCoverage = 0.7;
    const inclusive = recommendSchoolsNearLocation(
      [districtElementary, charterMiddle],
      { latitude: 34.29, longitude: -118.58 },
      5,
      manifest,
      3,
      options,
    );
    expect(inclusive[0]?.results[0]?.school.name).toBe("Charter Middle");
  });

  it("reorders results when the user changes evidence priorities", () => {
    const academicAce = school("1", "Academic Ace", 34.29, 120, 120);
    academicAce.latestObservations = [
      [2024, 0, 30, 100, 0, 1],
      [2024, 1, 120, 100, 0, 2],
      [2024, 2, 120, 100, 0, 3],
      [2024, 3, 20, 100, 0, 4],
    ];
    const attendanceAce = school("2", "Attendance Ace", 34.29, 30, 30);
    attendanceAce.latestObservations = [
      [2024, 0, 0, 100, 0, 1],
      [2024, 1, 30, 100, 0, 2],
      [2024, 2, 30, 100, 0, 3],
      [2024, 3, 0, 100, 0, 4],
    ];
    const center = { latitude: 34.29, longitude: -118.58 };

    const defaults = recommendSchoolsNearLocation(
      [attendanceAce, academicAce],
      center,
      5,
      manifest,
    );
    expect(defaults[0]?.results[0]?.school.name).toBe("Academic Ace");

    const options = defaultLocationRecommendationOptions();
    options.priorityMultipliers.academics = 0.5;
    options.priorityMultipliers.attendance = 2;
    options.priorityMultipliers.climate = 2;
    const personalized = recommendSchoolsNearLocation(
      [attendanceAce, academicAce],
      center,
      5,
      manifest,
      3,
      options,
    );
    expect(personalized[0]?.results[0]?.school.name).toBe("Attendance Ace");
    expect(personalized[0]?.results[0]?.primaryDriver?.label).toBe(
      "Attendance",
    );
  });
});
