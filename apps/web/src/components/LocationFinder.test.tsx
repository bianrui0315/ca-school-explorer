import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { MetricDefinition, PublicManifest, SchoolSummary } from "../types";
import { LocationFinder } from "./LocationFinder";

vi.mock("./LocationRecommendationMap", () => ({
  LocationRecommendationMap: () => <div>Recommendation map</div>,
}));

const metrics: MetricDefinition[] = [
  {
    id: "ela_distance_from_standard",
    navLabel: "ELA",
    label: "ELA distance",
    shortLabel: "ELA distance",
    description: "Test",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
  {
    id: "math_distance_from_standard",
    navLabel: "Mathematics",
    label: "Math distance",
    shortLabel: "Math distance",
    description: "Test",
    unit: "points",
    direction: "higher",
    methodologyVersion: "test",
    sourceKey: "test",
    sourceLabel: "Test",
    sourceUrl: "https://example.com",
  },
];

const manifest = {
  metrics,
  reliabilityCodes: { "0": "reliable" },
} as unknown as PublicManifest;

const nearbySchool = {
  id: "school-1",
  name: "Nearby Elementary",
  status: "active",
  countyCode: "19",
  county: "Los Angeles",
  districtId: "district-1",
  district: "Example Unified",
  shard: "19-0",
  city: "Porter Ranch",
  gradeSpan: "K–5",
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
  latitude: 34.29,
  longitude: -118.58,
  enrollment: 500,
  staff: { total: 30, teachers: 25, administrators: 2 },
  latestObservations: [
    [2024, 0, 60, 100, 0, 1],
    [2024, 1, 45, 100, 0, 2],
  ],
} satisfies SchoolSummary;

describe("LocationFinder", () => {
  it("resolves a ZIP, shows evidence, and adds a match to comparison", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <LocationFinder
        allSchools={[nearbySchool]}
        manifest={manifest}
        onAdd={onAdd}
        selectedSchoolIds={[]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Work address or California place",
      }),
      "91326",
    );
    await user.click(screen.getByRole("button", { name: "Find schools" }));

    expect(await screen.findByText("Nearby Elementary")).toBeInTheDocument();
    expect(screen.getByText("Evidence 2/4")).toBeInTheDocument();
    expect(await screen.findByText("Recommendation map")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to comparison" }));
    expect(onAdd).toHaveBeenCalledWith("school-1");
  });
});
