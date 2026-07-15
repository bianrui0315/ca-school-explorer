import type { LocationPoint } from "./schoolDistance";

export interface DistrictBoundary {
  cdsCode: string;
  districtCode: string;
  gradeHigh: string | null;
  gradeLow: string | null;
  name: string;
  schoolYear: string;
  type: string;
}

export interface DistrictBoundaryResult {
  districts: DistrictBoundary[];
  effectiveSchoolYear: string;
  sourceLabel: string;
  sourceUrl: string;
}

interface DistrictBoundaryApiResponse extends Partial<DistrictBoundaryResult> {
  error?: string;
}

export async function lookupDistrictBoundaries(
  location: LocationPoint,
  fetcher: typeof fetch = fetch,
): Promise<DistrictBoundaryResult> {
  const response = await fetcher("/api/district-boundaries", {
    body: JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as DistrictBoundaryApiResponse;
  if (
    !response.ok ||
    !Array.isArray(payload.districts) ||
    !payload.effectiveSchoolYear ||
    !payload.sourceLabel ||
    !payload.sourceUrl
  ) {
    throw new Error(
      payload.error ?? "The official district boundary could not be resolved.",
    );
  }
  return payload as DistrictBoundaryResult;
}
