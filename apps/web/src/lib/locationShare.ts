import {
  defaultLocationRecommendationOptions,
  type LocationPriority,
  type LocationRecommendationOptions,
  type LocationSchoolTypeFilter,
} from "./locationRecommendations";
import type { ResolvedLocation } from "./locationSearch";

export interface SharedLocationSearchState {
  location: ResolvedLocation;
  options: LocationRecommendationOptions;
  query: string;
  radius: number;
}

const VALID_RADII = new Set([5, 10, 15, 25, 50]);
const VALID_GRADES = new Set([
  "",
  "TK",
  "K",
  ...Array.from({ length: 12 }, (_, index) => String(index + 1)),
]);
const VALID_SCHOOL_TYPES = new Set<LocationSchoolTypeFilter>([
  "all",
  "district",
  "charter",
  "magnet",
]);
const VALID_COVERAGE = new Set([0.5, 0.7, 0.9, 1]);
const VALID_MULTIPLIERS = new Set([0.5, 1, 1.5, 2]);
const PRIORITY_PARAMETERS: Record<LocationPriority, string> = {
  academics: "pa",
  attendance: "pt",
  climate: "pc",
  readiness: "pr",
};

function finiteNumber(value: string | null) {
  if (value === null || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boundedText(value: string | null, maximumLength: number) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maximumLength ? trimmed : undefined;
}

export function buildLocationShareUrl(
  state: SharedLocationSearchState,
  baseUrl: string,
) {
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "location-finder-title";
  url.searchParams.set("view", "nearby");
  url.searchParams.set("q", state.query.trim());
  url.searchParams.set("lat", state.location.latitude.toFixed(6));
  url.searchParams.set("lng", state.location.longitude.toFixed(6));
  url.searchParams.set("place", state.location.matchedAddress);
  url.searchParams.set("approx", state.location.approximate ? "1" : "0");
  url.searchParams.set("r", String(state.radius));
  url.searchParams.set("grade", state.options.grade);
  url.searchParams.set("type", state.options.schoolType);
  url.searchParams.set(
    "coverage",
    String(Math.round(state.options.minimumCoverage * 100)),
  );
  Object.entries(PRIORITY_PARAMETERS).forEach(([priority, parameter]) => {
    url.searchParams.set(
      parameter,
      String(state.options.priorityMultipliers[priority as LocationPriority]),
    );
  });
  return url.toString();
}

export function parseLocationShareUrl(
  value: string,
): SharedLocationSearchState | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.searchParams.get("view") !== "nearby") {
    return undefined;
  }
  const latitude = finiteNumber(url.searchParams.get("lat"));
  const longitude = finiteNumber(url.searchParams.get("lng"));
  const radius = finiteNumber(url.searchParams.get("r"));
  const coveragePercent = finiteNumber(url.searchParams.get("coverage"));
  const query = boundedText(url.searchParams.get("q"), 160);
  const matchedAddress = boundedText(url.searchParams.get("place"), 220);
  const grade = url.searchParams.get("grade") ?? "";
  const schoolType = url.searchParams.get(
    "type",
  ) as LocationSchoolTypeFilter | null;
  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < 32.4 ||
    latitude > 42.1 ||
    longitude < -124.6 ||
    longitude > -114 ||
    radius === undefined ||
    !VALID_RADII.has(radius) ||
    coveragePercent === undefined ||
    !VALID_COVERAGE.has(coveragePercent / 100) ||
    !query ||
    !matchedAddress ||
    !VALID_GRADES.has(grade) ||
    !schoolType ||
    !VALID_SCHOOL_TYPES.has(schoolType)
  ) {
    return undefined;
  }

  const options = defaultLocationRecommendationOptions();
  options.grade = grade;
  options.minimumCoverage = coveragePercent / 100;
  options.schoolType = schoolType;
  for (const [priority, parameter] of Object.entries(PRIORITY_PARAMETERS) as [
    LocationPriority,
    string,
  ][]) {
    const multiplier = finiteNumber(url.searchParams.get(parameter));
    if (multiplier === undefined || !VALID_MULTIPLIERS.has(multiplier)) {
      return undefined;
    }
    options.priorityMultipliers[priority] = multiplier;
  }

  return {
    location: {
      approximate: url.searchParams.get("approx") === "1",
      latitude,
      longitude,
      matchedAddress,
      provider: "Shared search center",
    },
    options,
    query,
    radius,
  };
}
