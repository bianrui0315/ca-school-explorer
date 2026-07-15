import { describe, expect, it } from "vitest";
import type { SchoolSummary } from "../types";
import {
  gradeOptionsForSchools,
  gradesServed,
  searchSchools,
  type SchoolSearchFilters,
} from "./schoolSearch";

function school(
  id: string,
  name: string,
  overrides: Partial<SchoolSummary> = {},
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
    city: "Los Angeles",
    gradeSpan: "K–8",
    schoolType: "Elementary",
    schoolLevel: "Elementary",
    charter: false,
    virtualType: "Not virtual",
    magnet: false,
    titleI: false,
    dass: false,
    address: {
      street: "100 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
    },
    latitude: 34,
    longitude: -118,
    enrollment: 500,
    staff: { total: 30, teachers: 25, administrators: 2 },
    ...overrides,
  };
}

const schools = [
  school("1", "Porter Ranch Community", {
    city: "Porter Ranch",
    gradeSpan: "K–8",
    address: {
      street: "12450 Mason Ave",
      city: "Porter Ranch",
      state: "CA",
      zip: "91326-2934",
    },
  }),
  school("2", "Alameda High", {
    countyCode: "01",
    county: "Alameda",
    districtId: "01611190000000",
    district: "Alameda Unified",
    city: "Alameda",
    gradeSpan: "9–12",
    address: {
      street: "2201 Encinal Ave",
      city: "Alameda",
      state: "CA",
      zip: "94501",
    },
  }),
];

const emptyFilters: SchoolSearchFilters = {
  county: "",
  city: "",
  grade: "",
};

describe("school discovery search", () => {
  it("matches street addresses and ZIP codes", () => {
    expect(searchSchools(schools, "Mason 91326", emptyFilters)[0]?.name).toBe(
      "Porter Ranch Community",
    );
    expect(searchSchools(schools, "94501", emptyFilters)[0]?.name).toBe(
      "Alameda High",
    );
  });

  it("combines county, city, and single-grade filters", () => {
    expect(
      searchSchools(schools, "", {
        county: "Los Angeles",
        city: "Porter Ranch",
        grade: "6",
      }).map(({ name }) => name),
    ).toEqual(["Porter Ranch Community"]);
    expect(
      searchSchools(schools, "", {
        county: "Los Angeles",
        city: "Porter Ranch",
        grade: "10",
      }),
    ).toEqual([]);
  });

  it("expands grade spans into consistent filter options", () => {
    expect(gradesServed("PK–6")).toEqual([
      "PK",
      "TK",
      "K",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(gradesServed("9–12")).toEqual(["9", "10", "11", "12"]);
    expect(gradeOptionsForSchools(schools).at(-1)).toEqual({
      value: "12",
      label: "Grade 12",
    });
  });
});
