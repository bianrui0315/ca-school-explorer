import { describe, expect, it } from "vitest";
import type { PublicCatalog } from "../types";
import {
  buildComparisonShareUrl,
  parseComparisonShareUrl,
} from "./comparisonShare";

const catalog = {
  schools: [{ id: "1" }, { id: "2" }],
  manifest: {
    outcomeSchoolYears: ["2022-23", "2023-24", "2024-25"],
    metrics: [{ id: "ela_distance_from_standard" }],
    subgroups: [{ id: "all" }],
  },
} as PublicCatalog;

describe("comparison share links", () => {
  it("round-trips schools, controls, reference, and weights", () => {
    const url = buildComparisonShareUrl(
      {
        schoolIds: ["1", "2"],
        metricId: "ela_distance_from_standard",
        subgroup: "all",
        startYear: 2022,
        referenceMode: "peers",
        peerAnchorId: "1",
        weights: { ela_distance_from_standard: 18 },
      },
      "https://example.com/area?old=1",
    );

    expect(parseComparisonShareUrl(url, catalog)).toEqual({
      schoolIds: ["1", "2"],
      metricId: "ela_distance_from_standard",
      subgroup: "all",
      startYear: 2022,
      referenceMode: "peers",
      peerAnchorId: "1",
      weights: { ela_distance_from_standard: 18 },
    });
    expect(new URL(url).pathname).toBe("/");
  });

  it("requires a selected, known anchor for a peer reference", () => {
    expect(
      parseComparisonShareUrl(
        "https://example.com/?view=compare&schools=1&metric=ela_distance_from_standard&subgroup=all&start=2022&reference=peers",
        catalog,
      ),
    ).toBeUndefined();
    expect(
      parseComparisonShareUrl(
        "https://example.com/?view=compare&schools=1&metric=ela_distance_from_standard&subgroup=all&start=2022&reference=peers&peer=2",
        catalog,
      ),
    ).toBeUndefined();
  });

  it("rejects unknown schools and unsafe weight values", () => {
    expect(
      parseComparisonShareUrl(
        "https://example.com/?view=compare&schools=3&metric=ela_distance_from_standard&subgroup=all&start=2022&reference=county",
        catalog,
      ),
    ).toBeUndefined();
    expect(
      parseComparisonShareUrl(
        "https://example.com/?view=compare&schools=1&metric=ela_distance_from_standard&subgroup=all&start=2022&reference=county&weights=ela_distance_from_standard:101",
        catalog,
      ),
    ).toBeUndefined();
  });
});
