import { describe, expect, it } from "vitest";
import { defaultLocationRecommendationOptions } from "./locationRecommendations";
import { buildLocationShareUrl, parseLocationShareUrl } from "./locationShare";

describe("location finder share URLs", () => {
  it("round-trips the search center and personalization settings", () => {
    const options = defaultLocationRecommendationOptions();
    options.grade = "6";
    options.minimumCoverage = 0.9;
    options.priorityMultipliers.academics = 1.5;
    options.priorityMultipliers.attendance = 2;
    options.schoolType = "magnet";

    const url = buildLocationShareUrl(
      {
        location: {
          approximate: false,
          latitude: 34.2943,
          longitude: -118.58,
          matchedAddress: "12450 Mason Ave, Porter Ranch, CA 91326",
          provider: "Test",
        },
        options,
        query: "12450 Mason Ave",
        radius: 15,
      },
      "https://example.com/?old=value",
    );
    const restored = parseLocationShareUrl(url);

    expect(restored).toMatchObject({
      query: "12450 Mason Ave",
      radius: 15,
      location: {
        latitude: 34.2943,
        longitude: -118.58,
        matchedAddress: "12450 Mason Ave, Porter Ranch, CA 91326",
      },
      options: {
        grade: "6",
        minimumCoverage: 0.9,
        schoolType: "magnet",
        priorityMultipliers: {
          academics: 1.5,
          attendance: 2,
          climate: 1,
          readiness: 1,
        },
      },
    });
    expect(new URL(url).hash).toBe("#location-finder-title");
  });

  it("rejects out-of-state centers and unsupported settings", () => {
    const invalidCenter =
      "https://example.com/?view=nearby&q=test&lat=47.6&lng=-122.3&place=Seattle&r=10&grade=K&type=all&coverage=50&pa=1&pt=1&pc=1&pr=1";
    const invalidWeight =
      "https://example.com/?view=nearby&q=test&lat=34.2&lng=-118.5&place=California&r=10&grade=K&type=all&coverage=50&pa=9&pt=1&pc=1&pr=1";

    expect(parseLocationShareUrl(invalidCenter)).toBeUndefined();
    expect(parseLocationShareUrl(invalidWeight)).toBeUndefined();
  });
});
