import { describe, expect, it } from "vitest";
import type { MetricDefinition, PublicManifest, School } from "../types";
import {
  briefDataGapSentence,
  briefTrendStatus,
  strongestEvidenceSentence,
  widestBriefDifference,
} from "./decisionBrief";

const metrics: MetricDefinition[] = [
  {
    id: "ela_distance_from_standard",
    navLabel: "ELA",
    label: "ELA distance from standard",
    shortLabel: "ELA",
    description: "ELA",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
  {
    id: "chronic_absenteeism_rate",
    navLabel: "Attendance",
    label: "Chronic absenteeism",
    shortLabel: "Attendance",
    description: "Attendance",
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
  outcomeSchoolYears: ["2022-23", "2023-24", "2024-25"],
} as PublicManifest;

function school(name: string, ela: number, attendance?: number) {
  return {
    name,
    metrics: {
      ela_distance_from_standard: {
        all: [
          {
            year: 2022,
            value: ela - 10,
            numerator: null,
            denominator: 100,
            reliability: "reliable",
            sourceSnapshotId: 1,
          },
          {
            year: 2024,
            value: ela,
            numerator: null,
            denominator: 100,
            reliability: "reliable",
            sourceSnapshotId: 1,
          },
        ],
      },
      chronic_absenteeism_rate: {
        all:
          attendance === undefined
            ? []
            : [
                {
                  year: 2024,
                  value: attendance,
                  numerator: null,
                  denominator: 100,
                  reliability: "reliable",
                  sourceSnapshotId: 1,
                },
              ],
      },
    },
  } as unknown as School;
}

describe("deterministic decision brief summaries", () => {
  it("describes strongest evidence without generating a rank", () => {
    expect(strongestEvidenceSentence(school("A", 90, 15), manifest)).toMatch(
      /Attendance is the strongest normalized signal at 15\.0%/,
    );
  });

  it("identifies the widest comparable difference", () => {
    expect(
      widestBriefDifference(
        [school("Alpha", 90, 10), school("Beta", 30, 20)],
        manifest,
      ),
    ).toContain("Alpha reports +90");
  });

  it("states missing data and trend direction explicitly", () => {
    const value = school("Alpha", 50);
    expect(briefDataGapSentence(value, manifest)).toContain("Attendance");
    expect(
      briefTrendStatus(
        value.metrics.ela_distance_from_standard!.all!,
        metrics[0]!,
      ),
    ).toBe("improved");
  });
});
