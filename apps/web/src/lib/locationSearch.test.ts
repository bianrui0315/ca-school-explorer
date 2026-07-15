import { describe, expect, it, vi } from "vitest";
import type { SchoolSummary } from "../types";
import { resolveCaliforniaLocation } from "./locationSearch";

function school(id: string, city: string, zip: string, latitude: number) {
  return {
    id,
    city,
    address: { city, zip },
    latitude,
    longitude: -118.58,
  } as SchoolSummary;
}

describe("location search", () => {
  it("uses published school coordinates for exact city and ZIP searches", async () => {
    const schools = [
      school("1", "Porter Ranch", "91326", 34.29),
      school("2", "Porter Ranch", "91326", 34.31),
    ];
    const fetcher = vi.fn();

    const result = await resolveCaliforniaLocation("91326", schools, fetcher);

    expect(result.latitude).toBeCloseTo(34.3);
    expect(result.approximate).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the same-origin Worker for street addresses", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        latitude: 34.2929,
        longitude: -118.5828,
        matchedAddress: "12450 MASON AVE, PORTER RANCH, CA, 91326",
        provider: "U.S. Census Geocoder",
      }),
    );

    const result = await resolveCaliforniaLocation(
      "12450 Mason Ave, Porter Ranch, CA 91326",
      [],
      fetcher,
    );

    expect(result.approximate).toBe(false);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/geocode",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a useful Worker error", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { error: "No exact address match was found." },
        { status: 404 },
      ),
    );

    await expect(
      resolveCaliforniaLocation("Missing address", [], fetcher),
    ).rejects.toThrow("No exact address match was found.");
  });
});
