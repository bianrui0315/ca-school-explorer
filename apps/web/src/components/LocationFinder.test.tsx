import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import type { MetricDefinition, PublicManifest, SchoolSummary } from "../types";
import { LocationFinder } from "./LocationFinder";

vi.mock("./LocationRecommendationMap", () => ({
  LocationRecommendationMap: ({
    boundaries,
    focus,
  }: {
    boundaries: unknown[];
    focus: string;
  }) => (
    <div>
      <span>Recommendation map</span>
      <span>Map focus: {focus}</span>
      <span>Rendered boundaries: {boundaries.length}</span>
    </div>
  ),
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

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

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
    expect(screen.getByText("Evidence 2/4 · 70%")).toBeInTheDocument();
    expect(
      screen.getByText(/Primary driver: Academic performance/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Recommendation map")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to comparison" }));
    expect(onAdd).toHaveBeenCalledWith("school-1");
  });

  it("opens selected area results in the comparison", async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();
    render(
      <LocationFinder
        allSchools={[nearbySchool]}
        manifest={manifest}
        onAdd={vi.fn()}
        onCompare={onCompare}
        selectedSchoolIds={[nearbySchool.id]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Work address or California place",
      }),
      "91326",
    );
    await user.click(screen.getByRole("button", { name: "Find schools" }));
    await user.click(
      await screen.findByRole("button", { name: "Compare selected (1)" }),
    );

    expect(onCompare).toHaveBeenCalledOnce();
  });

  it("filters the nearby results by a child's grade and school type", async () => {
    const user = userEvent.setup();
    render(
      <LocationFinder
        allSchools={[nearbySchool]}
        manifest={manifest}
        onAdd={vi.fn()}
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
    await screen.findByText("Nearby Elementary");

    await user.click(screen.getByText("Personalize results"));
    await user.selectOptions(screen.getByLabelText("Child's grade"), "K");
    expect(screen.getByText("Kindergarten options")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Location school type"),
      "charter",
    );
    expect(screen.queryByText("Nearby Elementary")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No schools meet the selected grade, type, and evidence coverage in this radius.",
      ),
    ).toBeInTheDocument();
  });

  it("restores a shared search and removes stale URL settings after an edit", async () => {
    window.history.replaceState(
      {},
      "",
      "/?view=nearby&q=91326&lat=34.29&lng=-118.58&place=Shared+test&approx=1&r=10&grade=K&type=all&coverage=70&pa=1&pt=1&pc=1&pr=1#location-finder-title",
    );
    const user = userEvent.setup();
    render(
      <LocationFinder
        allSchools={[nearbySchool]}
        manifest={manifest}
        onAdd={vi.fn()}
        selectedSchoolIds={[]}
      />,
    );

    expect(await screen.findByText("Kindergarten options")).toBeInTheDocument();
    expect(
      screen.getByText("Shared search center", { exact: false }),
    ).toBeInTheDocument();

    await user.click(screen.getByText("Personalize results"));
    await user.selectOptions(
      screen.getByLabelText("Location school type"),
      "charter",
    );
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });

  it("shows an official district area for an exact street match", async () => {
    const user = userEvent.setup();
    render(
      <LocationFinder
        allSchools={[nearbySchool]}
        manifest={manifest}
        onAdd={vi.fn()}
        resolveDistricts={vi.fn(async () => ({
          districts: [
            {
              cdsCode: "19647330000000",
              districtCode: "1964733",
              geometry: {
                coordinates: [
                  [
                    [-118.7, 34.2],
                    [-118.5, 34.2],
                    [-118.5, 34.4],
                    [-118.7, 34.2],
                  ],
                ],
                type: "Polygon" as const,
              },
              gradeHigh: "12",
              gradeLow: "PK",
              name: "Los Angeles Unified",
              schoolYear: "2025-26",
              type: "Unified",
            },
          ],
          effectiveSchoolYear: "2025-26",
          sourceLabel: "CDE district areas",
          sourceUrl: "https://example.com/source",
        }))}
        resolveLocation={vi.fn(async () => ({
          approximate: false,
          latitude: 34.2929,
          longitude: -118.5828,
          matchedAddress: "12450 MASON AVE, PORTER RANCH, CA, 91326",
          provider: "U.S. Census Geocoder",
        }))}
        selectedSchoolIds={[]}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Work address or California place",
      }),
      "12450 Mason Ave, Porter Ranch, CA 91326",
    );
    await user.click(screen.getByRole("button", { name: "Find schools" }));

    expect(
      await screen.findByText("District at this address"),
    ).toBeInTheDocument();
    expect(screen.getByText("Los Angeles Unified")).toBeInTheDocument();
    expect(screen.getByText("Rendered boundaries: 1")).toBeInTheDocument();
    expect(
      screen.getByText(/does not identify an assigned school/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not endorsed or certified by the Census Bureau/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Full district" }));
    expect(screen.getByText("Map focus: district")).toBeInTheDocument();
  });
});
