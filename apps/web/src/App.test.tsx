import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type {
  DistrictDetail,
  MetricDefinition,
  MetricSeries,
  Observation,
  PublicCatalog,
  PublicDataClient,
  SchoolDetail,
  SchoolSummary,
  SubgroupDefinition,
} from "./types";

const metrics: MetricDefinition[] = [
  {
    id: "ela_distance_from_standard",
    navLabel: "ELA",
    label: "ELA distance from standard",
    shortLabel: "ELA distance",
    description: "Points above or below standard.",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test-v1",
    sourceKey: "test_academic",
    sourceLabel: "CDE Academic Indicator Data",
    sourceUrl: "https://example.com/academic",
  },
  {
    id: "chronic_absenteeism_rate",
    navLabel: "Attendance",
    label: "Chronic absenteeism rate",
    shortLabel: "Chronic absence",
    description: "Share of students chronically absent.",
    unit: "percent",
    direction: "lower",
    methodologyVersion: "test-v1",
    sourceKey: "test_attendance",
    sourceLabel: "CDE Chronic Absenteeism Data",
    sourceUrl: "https://example.com/attendance",
  },
];

const subgroups: SubgroupDefinition[] = [
  { id: "all", label: "All students", category: "total" },
  {
    id: "english_learners",
    label: "English learners",
    category: "program",
  },
  {
    id: "students_with_disabilities",
    label: "Students with disabilities",
    category: "program",
  },
];

function summary(id: string, name: string): SchoolSummary {
  return {
    id,
    name,
    status: "active",
    countyCode: "01",
    county: "Alameda",
    districtId: "01611190000000",
    district: "Alameda Unified",
    shard: "01-0",
    city: "Alameda",
    gradeSpan: "9–12",
    schoolType: "High",
    schoolLevel: "High",
    charter: false,
    virtualType: "N",
    magnet: false,
    titleI: false,
    dass: false,
    address: {
      street: "1 Test St",
      city: "Alameda",
      state: "CA",
      zip: "94501",
    },
    latitude: 37.7,
    longitude: -122.2,
    enrollment: 500,
    staff: { total: 30, teachers: 25, administrators: 2 },
  };
}

function observation(value: number, year = 2024): Observation {
  return {
    year,
    value,
    numerator: null,
    denominator: 100,
    reliability: "reliable",
    sourceSnapshotId: 1,
  };
}

function metricSeries(ela: number, attendance: number): MetricSeries {
  return {
    ela_distance_from_standard: {
      all: [
        observation(ela - 10, 2022),
        observation(ela - 5, 2023),
        observation(ela),
      ],
      english_learners: [
        observation(ela - 30, 2022),
        observation(ela - 25, 2023),
        observation(ela - 20),
      ],
      students_with_disabilities: [
        observation(ela - 40, 2022),
        observation(ela - 35, 2023),
        observation(ela - 30),
      ],
    },
    chronic_absenteeism_rate: {
      all: [
        observation(attendance + 4, 2022),
        observation(attendance + 2, 2023),
        observation(attendance),
      ],
      english_learners: [
        observation(34.1, 2022),
        observation(32.1, 2023),
        observation(30.1),
      ],
      students_with_disabilities: [
        observation(attendance + 14, 2022),
        observation(attendance + 12, 2023),
        observation(attendance + 10),
      ],
    },
  };
}

const summaries = [
  summary("01611190130229", "Alameda High"),
  summary("01611190132142", "Encinal Junior/Senior High"),
  summary("01611190106401", "Alameda Science and Technology Institute"),
  {
    ...summary("19647339999999", "Sierra Vista School"),
    countyCode: "19",
    county: "Los Angeles",
    districtId: "19647330000000",
    district: "Los Angeles Unified",
    shard: "19-0",
    city: "Porter Ranch",
    gradeSpan: "K–8",
    address: {
      street: "12450 Mason Ave",
      city: "Porter Ranch",
      state: "CA",
      zip: "91326",
    },
  },
];

const details = new Map<string, SchoolDetail>(
  summaries.map((school, index) => [
    school.id,
    {
      ...school,
      demographics: {
        "English Learner": { count: 50, percent: 10 },
        "Students with Disabilities": { count: 40, percent: 8 },
      },
      metrics: metricSeries(80 - index * 10, 12 + index),
    },
  ]),
);

const catalog: PublicCatalog = {
  schools: summaries,
  manifest: {
    schemaVersion: 1,
    release: "0.3.0",
    generatedAt: "2026-07-13T12:00:00Z",
    profileSchoolYears: ["2025-26"],
    outcomeSchoolYears: ["2022-23", "2023-24", "2024-25"],
    schoolCount: summaries.length,
    schoolIndexFileCount: 1,
    schoolIndexFiles: ["schools-index/00.json"],
    districtCount: 1,
    observationCount: 72,
    schoolShardCount: 1,
    districtFileCount: 1,
    metrics,
    subgroups,
    sourceSnapshots: [],
    reliabilityCodes: { "0": "reliable" },
    dataNotice: "Test data notice.",
  },
};

function createDataClient(): PublicDataClient {
  return {
    loadCatalog: async () => catalog,
    loadSchool: async (school) => {
      const detail = details.get(school.id);
      if (!detail) {
        throw new Error("Missing test school.");
      }
      return detail;
    },
    loadDistrict: async (): Promise<DistrictDetail> => ({
      id: "01611190000000",
      name: "Alameda Unified",
      countyCode: "01",
      metrics: metricSeries(40, 14),
    }),
  };
}

describe("school comparison experience", () => {
  it("renders official-data disclosure and the initial comparison", async () => {
    render(<App dataClient={createDataClient()} />);

    expect(
      await screen.findByRole("heading", {
        name: "Compare schools across time and context",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Official public data")).toBeInTheDocument();
    expect(screen.getByText("Selected schools (3 of 5)")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ELA distance from standard" }),
    ).toBeInTheDocument();
  });

  it("changes the metric and student lens", async () => {
    const user = userEvent.setup();
    render(<App dataClient={createDataClient()} />);

    await user.click(await screen.findByRole("button", { name: /Attendance/ }));
    await user.selectOptions(
      screen.getByLabelText("Student lens"),
      "english_learners",
    );

    expect(
      screen.getByRole("heading", { name: "Chronic absenteeism rate" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Student lens")).toHaveValue(
      "english_learners",
    );
    expect(screen.getAllByText("30.1%").length).toBeGreaterThan(0);
  });

  it("renders three years with inset trend endpoints by default", async () => {
    render(<App dataClient={createDataClient()} />);

    const yearRange = await screen.findByLabelText("Year range");
    expect(yearRange).toBeEnabled();
    expect(yearRange).toHaveValue("2022");
    expect(screen.getAllByText("2022–23").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2023–24").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2024–25").length).toBeGreaterThan(0);
    expect(screen.getByText("Change")).toBeInTheDocument();

    const points = document.querySelectorAll<SVGCircleElement>(".chart-point");
    expect(Number(points[0]?.getAttribute("cx"))).toBeGreaterThan(58);
    expect(Number(points[2]?.getAttribute("cx"))).toBeLessThan(752);
  });

  it("shows the experimental composite and map context", async () => {
    render(<App dataClient={createDataClient()} />);

    expect(
      await screen.findByRole("heading", { name: "All indicators comparison" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Experimental composite" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Selected schools on map" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not an official rating").length).toBe(1);
  });

  it("adds and removes schools from the comparison", async () => {
    const user = userEvent.setup();
    render(<App dataClient={createDataClient()} />);

    await screen.findByText("Selected schools (3 of 5)");
    await user.type(
      screen.getByLabelText(
        "Search schools by name, district, address, or ZIP",
      ),
      "91326",
    );
    await user.click(
      await screen.findByRole("button", { name: /Sierra Vista School/ }),
    );

    expect(screen.getByText("Selected schools (4 of 5)")).toBeInTheDocument();
    expect(screen.getAllByText("Sierra Vista School").length).toBeGreaterThan(
      1,
    );

    await user.click(
      screen.getByRole("button", { name: "Remove Alameda High" }),
    );
    expect(screen.getByText("Selected schools (3 of 5)")).toBeInTheDocument();
  });

  it("filters the statewide directory by county, city, and grade", async () => {
    const user = userEvent.setup();
    render(<App dataClient={createDataClient()} />);

    await screen.findByText("Selected schools (3 of 5)");
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.selectOptions(
      screen.getByLabelText("County filter"),
      "Los Angeles",
    );
    await user.selectOptions(
      screen.getByLabelText("City filter"),
      "Porter Ranch",
    );
    await user.selectOptions(screen.getByLabelText("Grade filter"), "6");

    expect(screen.getByText("1 matching school")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sierra Vista School/ }),
    ).toBeInTheDocument();
  });

  it("provides project links in the compact navigation", async () => {
    const user = userEvent.setup();
    render(<App dataClient={createDataClient()} />);

    await screen.findByText("Selected schools (3 of 5)");
    await user.click(screen.getByLabelText("Open navigation"));

    expect(
      screen.getByRole("navigation", { name: "Mobile project links" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Methodology" })).toHaveLength(
      2,
    );
  });
});
