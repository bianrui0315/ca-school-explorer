import { describe, expect, it } from "vitest";
import type { PublicManifest, SchoolDetail, SchoolSummary } from "../types";
import { buildPeerMetricSeries, findSimilarSchools } from "./similarSchools";

function school(
  id: string,
  overrides: Partial<SchoolSummary> = {},
): SchoolSummary {
  return {
    id,
    name: `School ${id}`,
    status: "active",
    countyCode: "19",
    county: "Los Angeles",
    districtId: "1964733",
    district: "Los Angeles Unified",
    shard: "19-0",
    city: "Los Angeles",
    gradeSpan: "K–8",
    schoolType: "K-12",
    schoolLevel: "Elem-High Combo",
    charter: false,
    virtualType: "N",
    magnet: false,
    titleI: true,
    dass: false,
    address: { street: "", city: "", state: "CA", zip: "" },
    latitude: null,
    longitude: null,
    enrollment: 800,
    staff: { total: null, teachers: null, administrators: null },
    peerContext: {
      englishLearnerPercent: 20,
      studentsWithDisabilitiesPercent: 12,
      socioeconomicallyDisadvantagedPercent: 55,
    },
    ...overrides,
  };
}

describe("similar context matching", () => {
  it("orders compatible schools by public profile without using outcomes", () => {
    const anchor = school("anchor");
    const close = school("close", {
      enrollment: 760,
      peerContext: {
        englishLearnerPercent: 22,
        studentsWithDisabilitiesPercent: 13,
        socioeconomicallyDisadvantagedPercent: 52,
      },
    });
    const far = school("far", {
      enrollment: 1900,
      titleI: false,
      peerContext: {
        englishLearnerPercent: 58,
        studentsWithDisabilitiesPercent: 25,
        socioeconomicallyDisadvantagedPercent: 92,
      },
    });
    const incompatible = school("middle", {
      schoolLevel: "Middle",
      gradeSpan: "6–8",
    });

    const matches = findSimilarSchools(anchor, [far, incompatible, close]);

    expect(matches.map((match) => match.school.id)).toEqual(["close", "far"]);
    expect(matches[0]?.reasons).toContain("Same K–8 grade span");
    expect(matches[0]?.reasons.join(" ")).not.toMatch(/score|rank|academic/i);
  });

  it("excludes closed, DASS-mismatched, and virtual-mismatched schools", () => {
    const anchor = school("anchor");
    expect(
      findSimilarSchools(anchor, [
        school("closed", { status: "closed" }),
        school("dass", { dass: true }),
        school("virtual", { virtualType: "V" }),
      ]),
    ).toEqual([]);
  });
});

describe("peer reference aggregation", () => {
  const manifest = {
    metrics: [{ id: "ela" }],
    subgroups: [{ id: "all" }],
  } as PublicManifest;

  function detail(
    id: string,
    value: number | null,
    denominator: number,
    reliability: "reliable" | "suppressed" = "reliable",
  ) {
    return {
      ...school(id),
      demographics: {},
      metrics: {
        ela: {
          all: [
            {
              year: 2024,
              value,
              numerator: null,
              denominator,
              reliability,
              sourceSnapshotId: Number(id),
            },
          ],
        },
      },
    } as SchoolDetail;
  }

  it("uses denominator weighting and never reconstructs suppressed rows", () => {
    const series = buildPeerMetricSeries(
      [
        detail("1", 10, 100),
        detail("2", 30, 300),
        detail("3", null, 500, "suppressed"),
      ],
      manifest,
    );

    expect(series.ela?.all).toEqual([
      {
        year: 2024,
        value: 25,
        numerator: null,
        denominator: 400,
        reliability: "reliable",
        sourceSnapshotId: 2,
      },
    ]);
  });
});
