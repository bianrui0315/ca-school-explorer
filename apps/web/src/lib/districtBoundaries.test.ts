import { describe, expect, it, vi } from "vitest";
import { lookupDistrictBoundaries } from "./districtBoundaries";

describe("district boundary lookup", () => {
  it("uses the same-origin Worker without placing coordinates in the URL", async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(input).toBe("/api/district-boundaries");
        expect(init?.method).toBe("POST");
        return Response.json({
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
                type: "Polygon",
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
        });
      },
    );

    const result = await lookupDistrictBoundaries(
      { latitude: 34.2929, longitude: -118.5828 },
      fetcher,
    );

    expect(result.districts[0]?.name).toBe("Los Angeles Unified");
    expect(result.districts[0]?.geometry?.type).toBe("Polygon");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/district-boundaries",
      expect.objectContaining({ method: "POST" }),
    );
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("34.2929");
  });

  it("surfaces an upstream boundary error", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { error: "Boundary service unavailable." },
        { status: 502 },
      ),
    );

    await expect(
      lookupDistrictBoundaries(
        { latitude: 34.2929, longitude: -118.5828 },
        fetcher,
      ),
    ).rejects.toThrow("Boundary service unavailable.");
  });
});
