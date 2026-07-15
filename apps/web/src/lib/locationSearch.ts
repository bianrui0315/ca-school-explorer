import type { SchoolSummary } from "../types";
import type { LocationPoint } from "./schoolDistance";

export interface ResolvedLocation extends LocationPoint {
  matchedAddress: string;
  provider: string;
  approximate: boolean;
}

interface GeocodeApiResponse {
  error?: string;
  latitude?: number;
  longitude?: number;
  matchedAddress?: string;
  provider?: string;
}

function normalizePlace(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/,?\s+(ca|california)$/i, "")
    .replace(/\s+/g, " ");
}

function directoryCenter(
  query: string,
  schools: SchoolSummary[],
): ResolvedLocation | undefined {
  const trimmed = query.trim();
  const zipMatch = /^\d{5}$/.test(trimmed);
  const normalizedCity = normalizePlace(trimmed);
  const matches = schools.filter((school) =>
    zipMatch
      ? school.address.zip === trimmed
      : !/\d/.test(trimmed) && normalizePlace(school.city) === normalizedCity,
  );
  const mapped = matches.filter(
    (school) => school.latitude !== null && school.longitude !== null,
  );
  if (mapped.length === 0) {
    return undefined;
  }
  return {
    approximate: true,
    latitude:
      mapped.reduce((total, school) => total + (school.latitude ?? 0), 0) /
      mapped.length,
    longitude:
      mapped.reduce((total, school) => total + (school.longitude ?? 0), 0) /
      mapped.length,
    matchedAddress: zipMatch
      ? `ZIP ${trimmed} approximate school-location center`
      : `${matches[0]?.city ?? trimmed}, CA approximate school-location center`,
    provider: "CDE school directory approximation",
  };
}

export async function resolveCaliforniaLocation(
  query: string,
  schools: SchoolSummary[],
  fetcher: typeof fetch = fetch,
): Promise<ResolvedLocation> {
  const local = directoryCenter(query, schools);
  if (local) {
    return local;
  }
  const response = await fetcher("/api/geocode", {
    body: JSON.stringify({ address: query.trim() }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as GeocodeApiResponse;
  if (
    !response.ok ||
    !Number.isFinite(payload.latitude) ||
    !Number.isFinite(payload.longitude) ||
    !payload.matchedAddress
  ) {
    throw new Error(payload.error ?? "The location could not be resolved.");
  }
  return {
    approximate: false,
    latitude: payload.latitude!,
    longitude: payload.longitude!,
    matchedAddress: payload.matchedAddress,
    provider: payload.provider ?? "U.S. Census Geocoder",
  };
}
