import type {
  FixtureDataset,
  MetricId,
  Observation,
  Reliability,
  School,
  SubgroupId,
} from "../types";

const YEARS = [2022, 2023, 2024, 2025] as const;
const SCHOOL_COLORS = [
  "#ff625e",
  "#f2a900",
  "#1467d8",
  "#6a52b3",
  "#16806a",
] as const;

function series(
  values: Array<number | null>,
  denominators: Array<number | null>,
  reliability?: Reliability[],
): Observation[] {
  return YEARS.map((year, index) => ({
    year,
    value: values[index] ?? null,
    denominator: denominators[index] ?? null,
    reliability:
      reliability?.[index] ??
      (values[index] === null ? "not-available" : "reliable"),
  }));
}

function metricSeries(
  allValues: Array<number | null>,
  englishLearnerValues: Array<number | null>,
  disabilityValues: Array<number | null>,
  enrollment: [number, number, number, number],
  englishLearnerEnrollment: [number, number, number, number],
  disabilityEnrollment: [number, number, number, number],
  disabilityReliability?: Reliability[],
): Record<SubgroupId, Observation[]> {
  return {
    all: series(allValues, enrollment),
    english_learners: series(englishLearnerValues, englishLearnerEnrollment),
    students_with_disabilities: series(
      disabilityValues,
      disabilityEnrollment,
      disabilityReliability,
    ),
  };
}

type SchoolSeed = Omit<School, "metrics" | "color"> & {
  colorIndex: number;
  enrollment: [number, number, number, number];
  englishLearnerEnrollment: [number, number, number, number];
  disabilityEnrollment: [number, number, number, number];
  values: Record<MetricId, [number[], number[], Array<number | null>]>;
  disabilityReliability?: Reliability[];
};

function createSchool(seed: SchoolSeed): School {
  const metrics = Object.fromEntries(
    Object.entries(seed.values).map(([metricId, values]) => [
      metricId,
      metricSeries(
        values[0],
        values[1],
        values[2],
        seed.enrollment,
        seed.englishLearnerEnrollment,
        seed.disabilityEnrollment,
        seed.disabilityReliability,
      ),
    ]),
  ) as School["metrics"];

  return {
    id: seed.id,
    name: seed.name,
    district: seed.district,
    city: seed.city,
    gradeSpan: seed.gradeSpan,
    color: SCHOOL_COLORS[seed.colorIndex] ?? SCHOOL_COLORS[0],
    metrics,
  };
}

const schools: School[] = [
  createSchool({
    id: "redwood-creek",
    name: "Redwood Creek Elementary",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "K–5",
    colorIndex: 0,
    enrollment: [392, 401, 408, 412],
    englishLearnerEnrollment: [96, 101, 104, 107],
    disabilityEnrollment: [39, 42, 45, 48],
    values: {
      ela_distance: [
        [-62, -44, -24, -12],
        [-91, -78, -59, -43],
        [-108, -96, -78, -64],
      ],
      chronic_absenteeism: [
        [14.9, 13.5, 11.2, 9.7],
        [19.8, 18.1, 15.3, 13.2],
        [21.6, 20.2, 17.9, 15.8],
      ],
      suspension_rate: [
        [1.8, 1.4, 1.1, 0.8],
        [2.4, 2.1, 1.8, 1.3],
        [2.8, 2.5, 2.2, 1.9],
      ],
      stability_rate: [
        [89.2, 90.1, 91.4, 92.3],
        [86.1, 87.2, 88.6, 90.0],
        [84.6, 85.1, 86.8, 87.9],
      ],
    },
  }),
  createSchool({
    id: "juniper-middle",
    name: "Juniper Middle School",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "6–8",
    colorIndex: 1,
    enrollment: [371, 378, 384, 389],
    englishLearnerEnrollment: [88, 91, 94, 96],
    disabilityEnrollment: [9, 16, 21, 27],
    disabilityReliability: [
      "suppressed",
      "small-sample",
      "small-sample",
      "small-sample",
    ],
    values: {
      ela_distance: [
        [-164, -132, -98, -71],
        [-191, -168, -137, -109],
        [null, -181, -151, -126],
      ],
      chronic_absenteeism: [
        [24.8, 22.6, 19.3, 16.8],
        [30.1, 27.8, 24.4, 21.5],
        [null, 32.4, 28.7, 25.9],
      ],
      suspension_rate: [
        [5.9, 5.1, 4.2, 3.6],
        [7.1, 6.5, 5.8, 5.0],
        [null, 8.2, 7.4, 6.1],
      ],
      stability_rate: [
        [82.8, 84.1, 85.7, 87.0],
        [78.2, 80.0, 81.9, 83.5],
        [null, 76.9, 78.4, 80.2],
      ],
    },
  }),
  createSchool({
    id: "harbor-view",
    name: "Harbor View Academy",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "K–8",
    colorIndex: 2,
    enrollment: [339, 345, 351, 356],
    englishLearnerEnrollment: [71, 75, 77, 80],
    disabilityEnrollment: [32, 35, 37, 40],
    values: {
      ela_distance: [
        [-112, -82, -54, -31],
        [-148, -119, -88, -61],
        [-136, -121, -99, -79],
      ],
      chronic_absenteeism: [
        [18.2, 16.1, 13.6, 11.4],
        [23.4, 21.2, 18.1, 15.5],
        [25.7, 23.5, 20.9, 18.3],
      ],
      suspension_rate: [
        [3.9, 3.2, 2.6, 2.1],
        [5.2, 4.6, 3.9, 3.2],
        [5.8, 5.1, 4.6, 3.9],
      ],
      stability_rate: [
        [86.7, 88.0, 89.2, 90.6],
        [83.0, 84.6, 86.2, 87.8],
        [81.5, 82.9, 84.8, 86.1],
      ],
    },
  }),
  createSchool({
    id: "sierra-vista",
    name: "Sierra Vista School",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "K–8",
    colorIndex: 3,
    enrollment: [482, 491, 504, 516],
    englishLearnerEnrollment: [142, 149, 154, 158],
    disabilityEnrollment: [51, 54, 57, 61],
    values: {
      ela_distance: [
        [-88, -70, -51, -37],
        [-127, -108, -91, -74],
        [-118, -109, -94, -81],
      ],
      chronic_absenteeism: [
        [20.3, 18.7, 16.8, 14.9],
        [26.0, 24.1, 21.8, 19.6],
        [27.2, 25.0, 23.1, 21.0],
      ],
      suspension_rate: [
        [4.1, 3.7, 3.1, 2.7],
        [5.4, 4.9, 4.3, 3.8],
        [6.0, 5.5, 4.8, 4.2],
      ],
      stability_rate: [
        [84.1, 85.4, 87.1, 88.6],
        [80.2, 81.8, 83.5, 85.1],
        [79.1, 80.4, 82.0, 83.7],
      ],
    },
  }),
  createSchool({
    id: "east-bay-arts",
    name: "East Bay Arts Academy",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "6–12",
    colorIndex: 4,
    enrollment: [608, 624, 641, 659],
    englishLearnerEnrollment: [118, 123, 129, 134],
    disabilityEnrollment: [67, 70, 73, 77],
    values: {
      ela_distance: [
        [-73, -55, -38, -22],
        [-109, -92, -75, -59],
        [-101, -89, -73, -62],
      ],
      chronic_absenteeism: [
        [17.1, 15.8, 14.2, 12.6],
        [22.8, 21.0, 18.9, 17.0],
        [23.9, 22.4, 20.2, 18.4],
      ],
      suspension_rate: [
        [3.3, 2.9, 2.4, 2.0],
        [4.8, 4.2, 3.6, 3.1],
        [5.0, 4.6, 4.0, 3.5],
      ],
      stability_rate: [
        [87.4, 88.8, 90.0, 91.2],
        [83.6, 85.0, 86.7, 88.1],
        [82.3, 83.7, 85.4, 86.9],
      ],
    },
  }),
];

const baselineEnrollment = [14892, 15104, 15331, 15508];

function baseline(
  allValues: number[],
  englishLearnerValues: number[],
  disabilityValues: number[],
): Record<SubgroupId, Observation[]> {
  return {
    all: series(allValues, baselineEnrollment),
    english_learners: series(englishLearnerValues, [3210, 3288, 3341, 3397]),
    students_with_disabilities: series(
      disabilityValues,
      [1782, 1821, 1860, 1904],
    ),
  };
}

export const fixtureDataset: FixtureDataset = {
  label: "Synthetic fixture data",
  releasedAt: "July 13, 2026",
  years: [...YEARS],
  subgroups: [
    { id: "all", label: "All students" },
    { id: "english_learners", label: "English learners" },
    { id: "students_with_disabilities", label: "Students with disabilities" },
  ],
  metrics: [
    {
      id: "ela_distance",
      navLabel: "Academics",
      label: "ELA distance from standard",
      shortLabel: "ELA distance",
      description: "Points above (+) or below (−) the grade-level standard.",
      unit: "points",
      direction: "higher",
      sourceLabel: "CDE Academic Indicator Data",
      sourceUrl: "https://www.cde.ca.gov/ta/ac/cm/acaddatafiles.asp",
    },
    {
      id: "chronic_absenteeism",
      navLabel: "Attendance",
      label: "Chronic absenteeism rate",
      shortLabel: "Chronic absence",
      description:
        "Share of eligible students absent for 10% or more of enrolled days.",
      unit: "percent",
      direction: "lower",
      sourceLabel: "CDE Chronic Absenteeism Data",
      sourceUrl: "https://www.cde.ca.gov/ds/ad/filesabd.asp",
    },
    {
      id: "suspension_rate",
      navLabel: "Climate",
      label: "Suspension rate",
      shortLabel: "Suspension rate",
      description:
        "Share of cumulatively enrolled students suspended at least once.",
      unit: "percent",
      direction: "lower",
      sourceLabel: "CDE Suspension Data",
      sourceUrl: "https://www.cde.ca.gov/ds/ad/filessd.asp",
    },
    {
      id: "stability_rate",
      navLabel: "Pathways",
      label: "Student stability rate",
      shortLabel: "Stability rate",
      description:
        "Share of students with continuous enrollment during the academic year.",
      unit: "percent",
      direction: "higher",
      sourceLabel: "CDE Stability Rate Data",
      sourceUrl: "https://www.cde.ca.gov/ds/ad/filessr.asp",
    },
  ],
  districtBaseline: {
    ela_distance: baseline(
      [0, 0, 0, 0],
      [-76, -72, -67, -62],
      [-98, -94, -89, -84],
    ),
    chronic_absenteeism: baseline(
      [19.4, 17.8, 15.6, 13.8],
      [25.1, 23.3, 20.8, 18.7],
      [26.8, 24.9, 22.7, 20.5],
    ),
    suspension_rate: baseline(
      [4.2, 3.7, 3.1, 2.7],
      [5.6, 5.0, 4.4, 3.8],
      [6.1, 5.6, 4.9, 4.3],
    ),
    stability_rate: baseline(
      [85.2, 86.3, 87.8, 89.1],
      [81.4, 82.8, 84.3, 86.0],
      [80.0, 81.3, 83.0, 84.7],
    ),
  },
  schools,
};

export const initialSchoolIds = [
  "redwood-creek",
  "juniper-middle",
  "harbor-view",
];
