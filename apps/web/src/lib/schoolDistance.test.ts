import { describe, expect, it } from "vitest";
import type { SchoolSummary } from "../types";
import {
  distanceBetweenSchools,
  schoolsWithinDistance,
} from "./schoolDistance";

function school(
  id: string,
  name: string,
  latitude: number | null,
  longitude: number | null,
): SchoolSummary {
  return {
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
    longitude,
    enrollment: 500,
    staff: { total: 30, teachers: 25, administrators: 2 },
  };
}

const porterRanch = school(
  "1",
  "Porter Ranch Community",
  34.2937439,
  -118.5820123,
);
const castlebay = school(
  "2",
  "Castlebay Lane Charter",
  34.2939789,
  -118.5477003,
);
const distant = school("3", "Distant School", 34.05, -118.25);

describe("school distance", () => {
  it("calculates straight-line miles from published coordinates", () => {
    expect(distanceBetweenSchools(porterRanch, castlebay)).toBeCloseTo(1.96, 1);
    expect(
      distanceBetweenSchools(
        porterRanch,
        school("4", "Missing Coordinates", null, null),
      ),
    ).toBeUndefined();
  });

  it("filters and orders nearby schools by distance", () => {
    const results = schoolsWithinDistance(
      [distant, castlebay, porterRanch],
      porterRanch,
      10,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.school.name).toBe("Castlebay Lane Charter");
    expect(results[0]?.distanceMiles).toBeLessThan(2.1);
  });
});
