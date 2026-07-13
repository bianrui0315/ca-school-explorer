import type { MetricDefinition, Observation } from "../types";
import {
  changeStatus,
  formatMetricValue,
  latestObservation,
  metricChange,
  reliabilityLabel,
} from "./metrics";

const lowerIsBetterMetric: MetricDefinition = {
  id: "chronic_absenteeism",
  navLabel: "Attendance",
  label: "Chronic absenteeism rate",
  shortLabel: "Chronic absence",
  description: "Test metric",
  unit: "percent",
  direction: "lower",
  sourceLabel: "Test source",
  sourceUrl: "https://example.com",
};

const observations: Observation[] = [
  { year: 2022, value: 20, denominator: 100, reliability: "reliable" },
  { year: 2023, value: 15.2, denominator: 98, reliability: "small-sample" },
  { year: 2024, value: null, denominator: null, reliability: "suppressed" },
];

describe("metric helpers", () => {
  it("formats values, signed changes, and missing data", () => {
    expect(formatMetricValue(15.2, lowerIsBetterMetric)).toBe("15.2%");
    expect(formatMetricValue(4.8, lowerIsBetterMetric, true)).toBe("+4.8%");
    expect(formatMetricValue(null, lowerIsBetterMetric)).toBe("—");
  });

  it("calculates changes and interprets direction", () => {
    expect(metricChange(observations, 2022, 2023)).toBeCloseTo(-4.8);
    expect(changeStatus(-4.8, lowerIsBetterMetric)).toBe("improved");
    expect(changeStatus(2, lowerIsBetterMetric)).toBe("declined");
  });

  it("preserves reliability and latest-year context", () => {
    expect(latestObservation(observations, 2023)?.year).toBe(2023);
    expect(reliabilityLabel(observations[1])).toBe("Small sample");
    expect(reliabilityLabel(observations[2])).toBe("Suppressed");
  });
});
