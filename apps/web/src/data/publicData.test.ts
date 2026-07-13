import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicManifest, SchoolSummary } from "../types";

const school: SchoolSummary = {
  id: "01611190130229",
  name: "Alameda High",
  status: "active",
  countyCode: "01",
  county: "Alameda",
  districtId: "01611190000000",
  district: "Alameda Unified",
  shard: "01-0",
  city: "Alameda",
  gradeSpan: "9–12",
  schoolType: "High",
  schoolLevel: "High",
  charter: false,
  virtualType: "Not virtual",
  magnet: false,
  titleI: false,
  dass: false,
  address: { street: "", city: "Alameda", state: "CA", zip: "94501" },
  latitude: 37.7,
  longitude: -122.2,
  enrollment: 1_000,
  staff: { total: 50, teachers: 40, administrators: 3 },
};

const manifest: PublicManifest = {
  schemaVersion: 1,
  release: "0.2.1",
  generatedAt: "2026-07-13T22:00:00Z",
  profileSchoolYears: ["2025-26"],
  outcomeSchoolYears: ["2023-24", "2024-25"],
  schoolCount: 1,
  schoolIndexFileCount: 1,
  schoolIndexFiles: ["schools-index/00.json"],
  districtCount: 1,
  observationCount: 0,
  schoolShardCount: 1,
  districtFileCount: 1,
  metrics: [],
  subgroups: [],
  sourceSnapshots: [],
  reliabilityCodes: {},
  dataNotice: "Test data.",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("public data release caching", () => {
  it("version-stamps every asset loaded after the manifest", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const payload = url.endsWith("/manifest.json")
        ? manifest
        : url.includes("schools-index")
          ? { schemaVersion: 1, schools: [school] }
          : url.includes("/schools/")
            ? {
                schemaVersion: 1,
                shard: school.shard,
                schools: {
                  [school.id]: { demographics: {}, observations: [] },
                },
              }
            : {
                schemaVersion: 1,
                countyCode: "01",
                districts: {
                  [school.districtId]: {
                    name: school.district,
                    observations: [],
                  },
                },
              };
      return new Response(JSON.stringify(payload), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { publicDataClient } = await import("./publicData");
    const catalog = await publicDataClient.loadCatalog();
    await publicDataClient.loadSchool(school, catalog);
    await publicDataClient.loadDistrict(
      school.countyCode,
      school.districtId,
      catalog,
    );

    expect(fetchMock).toHaveBeenCalledWith("/data/manifest.json", {
      cache: "no-cache",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/data/schools-index/00.json?release=0.2.1",
      { cache: "force-cache" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/data/schools/01-0.json?release=0.2.1",
      { cache: "force-cache" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/data/districts/01.json?release=0.2.1",
      { cache: "force-cache" },
    );
  });
});
