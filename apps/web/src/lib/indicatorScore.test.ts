import type { MetricDefinition } from "../types";
import { calculateComposite, normalizeIndicatorValue } from "./indicatorScore";

function metric(
  unit: MetricDefinition["unit"],
  direction: MetricDefinition["direction"],
): MetricDefinition {
  return {
    id: "test",
    navLabel: "Test",
    label: "Test metric",
    shortLabel: "Test",
    description: "Test metric",
    unit,
    direction,
    methodologyVersion: "test-v1",
    sourceKey: "test",
    sourceLabel: "Test source",
    sourceUrl: "https://example.com",
  };
}

describe("indicator comparison scoring", () => {
  it("normalizes rate direction and academic distance without changing missing values", () => {
    expect(normalizeIndicatorValue(92, metric("percent", "higher"))).toBe(92);
    expect(normalizeIndicatorValue(12, metric("percent", "lower"))).toBe(88);
    expect(normalizeIndicatorValue(0, metric("points", "higher"))).toBe(50);
    expect(normalizeIndicatorValue(150, metric("points", "higher"))).toBe(100);
    expect(
      normalizeIndicatorValue(null, metric("percent", "higher")),
    ).toBeNull();
  });

  it("reweights only available indicators and reports coverage", () => {
    const result = calculateComposite(
      { ela: 80, math: 60, graduation: null },
      { ela: 20, math: 20, graduation: 15 },
      ["ela", "math", "graduation"],
    );

    expect(result.score).toBe(70);
    expect(result.availableCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.availableWeight).toBe(40);
    expect(result.totalWeight).toBe(55);
  });
});
