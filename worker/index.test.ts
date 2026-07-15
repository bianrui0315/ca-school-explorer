import { describe, expect, it, vi } from "vitest";
import { handleGeocode } from "./geocode";

function request(body: unknown, method = "POST") {
  return new Request("https://example.com/api/geocode", {
    body: method === "POST" ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
    method,
  });
}

describe("geocode worker", () => {
  it("returns a bounded California Census match", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        result: {
          addressMatches: [
            {
              addressComponents: { state: "CA" },
              coordinates: { x: -118.5828, y: 34.2929 },
              matchedAddress: "12450 MASON AVE, PORTER RANCH, CA, 91326",
            },
          ],
        },
      }),
    );

    const response = await handleGeocode(
      request({ address: "12450 Mason Ave, Porter Ranch, CA 91326" }),
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      latitude: 34.2929,
      longitude: -118.5828,
      provider: "U.S. Census Geocoder",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects unsupported methods and invalid input", async () => {
    expect((await handleGeocode(request({}, "GET"))).status).toBe(405);
    expect((await handleGeocode(request({ address: "CA" }))).status).toBe(400);
  });

  it("does not return out-of-state or missing matches", async () => {
    const outsideCalifornia = vi.fn(async () =>
      Response.json({
        result: {
          addressMatches: [
            {
              addressComponents: { state: "NV" },
              coordinates: { x: -115.1, y: 36.1 },
              matchedAddress: "LAS VEGAS, NV",
            },
          ],
        },
      }),
    );
    const noMatch = vi.fn(async () =>
      Response.json({ result: { addressMatches: [] } }),
    );

    expect(
      (
        await handleGeocode(
          request({ address: "100 Test St, Las Vegas, NV 89101" }),
          outsideCalifornia,
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await handleGeocode(
          request({ address: "Missing California address" }),
          noMatch,
        )
      ).status,
    ).toBe(404);
  });
});
