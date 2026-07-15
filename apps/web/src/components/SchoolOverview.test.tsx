import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  directoryFlags,
  studentsPerReportedTeacher,
} from "../lib/schoolProfile";
import type { School } from "../types";
import { SchoolOverview } from "./SchoolOverview";

function school(overrides: Partial<School> = {}): School {
  return {
    id: "19647330119622",
    name: "Porter Ranch Community",
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
      street: "12450 Mason Ave.",
      city: "Porter Ranch",
      state: "CA",
      zip: "91326",
    },
    latitude: 34.282,
    longitude: -118.593,
    enrollment: 1381,
    staff: { total: 65, teachers: 57, administrators: 3 },
    demographics: {},
    metrics: {},
    color: "#ff625e",
    ...overrides,
  };
}

describe("school overview", () => {
  it("derives a clearly labeled staffing context ratio", () => {
    expect(studentsPerReportedTeacher(school())).toBeCloseTo(24.228, 3);
    expect(
      studentsPerReportedTeacher(
        school({
          staff: { total: null, teachers: null, administrators: null },
        }),
      ),
    ).toBeUndefined();
  });

  it("shows real directory facts, address, flags, and the class-size caveat", () => {
    const selectedSchool = school({
      charter: true,
      magnet: true,
      titleI: true,
    });
    render(
      <SchoolOverview
        profileSchoolYears={["2025-26"]}
        schools={[selectedSchool]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "School overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("24.2")).toBeInTheDocument();
    expect(
      screen.getByText("12450 Mason Ave., Porter Ranch, CA 91326"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Directory designations")).toHaveTextContent(
      "CharterMagnetTitle I",
    );
    expect(screen.getByText(/not a class-size measure/i)).toBeInTheDocument();
    expect(directoryFlags(selectedSchool)).toEqual([
      "Charter",
      "Magnet",
      "Title I",
    ]);
  });
});
