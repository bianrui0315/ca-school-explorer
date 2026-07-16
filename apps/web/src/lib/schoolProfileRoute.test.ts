import { describe, expect, it } from "vitest";
import { routeFromPath, schoolProfilePath } from "./schoolProfileRoute";

describe("school profile routing", () => {
  it("recognizes stable CDS-code profile URLs", () => {
    expect(routeFromPath("/school/19647330126607")).toEqual({
      page: "profile",
      profileSchoolId: "19647330126607",
    });
    expect(routeFromPath("/school/19647330126607/")).toEqual({
      page: "profile",
      profileSchoolId: "19647330126607",
    });
  });

  it("keeps the existing application routes", () => {
    expect(routeFromPath("/")).toEqual({ page: "compare" });
    expect(routeFromPath("/area")).toEqual({ page: "area" });
    expect(routeFromPath("/brief")).toEqual({ page: "brief" });
    expect(routeFromPath("/resources")).toEqual({ page: "resources" });
    expect(routeFromPath("/school/not-a-cds-code")).toEqual({
      page: "compare",
    });
  });

  it("builds only valid profile paths", () => {
    expect(schoolProfilePath("19647330126607")).toBe("/school/19647330126607");
    expect(() => schoolProfilePath("1964733")).toThrow(/14-digit CDS code/);
  });
});
