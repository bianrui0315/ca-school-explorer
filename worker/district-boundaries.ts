import { type FetchFunction, jsonResponse, readJsonWithLimit } from "./geocode";

const DISTRICT_AREA_QUERY_URL =
  "https://services3.arcgis.com/fdvHcZVgB2QSRNkL/arcgis/rest/services/DistrictAreas2526/FeatureServer/0/query";
const MAX_REQUEST_BYTES = 256;
const MAX_UPSTREAM_BYTES = 500_000;
const CALIFORNIA_BOUNDS = {
  latitudeMax: 42.1,
  latitudeMin: 32.4,
  longitudeMax: -114.0,
  longitudeMin: -124.5,
};

interface DistrictAttributes {
  CDCode?: unknown;
  CDSCode?: unknown;
  DistrictName?: unknown;
  DistrictType?: unknown;
  GradeHigh?: unknown;
  GradeLow?: unknown;
  Year?: unknown;
}

interface DistrictPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

interface DistrictMultiPolygon {
  coordinates: number[][][][];
  type: "MultiPolygon";
}

type DistrictGeometry = DistrictMultiPolygon | DistrictPolygon;

interface ArcGisDistrictResponse {
  error?: { message?: unknown };
  features?: Array<{
    geometry?: unknown;
    properties?: DistrictAttributes;
  }>;
}

function coordinate(
  body: unknown,
  key: "latitude" | "longitude",
): number | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function inCalifornia(latitude: number, longitude: number) {
  return (
    latitude >= CALIFORNIA_BOUNDS.latitudeMin &&
    latitude <= CALIFORNIA_BOUNDS.latitudeMax &&
    longitude >= CALIFORNIA_BOUNDS.longitudeMin &&
    longitude <= CALIFORNIA_BOUNDS.longitudeMax
  );
}

function validPosition(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }
  const [longitude, latitude] = value;
  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    value.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  );
}

function validRing(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every((position) => validPosition(position))
  );
}

function validPolygonCoordinates(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.every((ring) => validRing(ring));
}

function validMultiPolygonCoordinates(value: unknown): value is number[][][][] {
  return (
    Array.isArray(value) &&
    value.every((polygon) => validPolygonCoordinates(polygon))
  );
}

function districtGeometry(value: unknown): DistrictGeometry | null {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return null;
  }
  const candidate = value as { coordinates?: unknown; type?: unknown };
  if (
    candidate.type === "Polygon" &&
    validPolygonCoordinates(candidate.coordinates)
  ) {
    return {
      coordinates: candidate.coordinates,
      type: "Polygon",
    };
  }
  if (
    candidate.type === "MultiPolygon" &&
    validMultiPolygonCoordinates(candidate.coordinates)
  ) {
    return {
      coordinates: candidate.coordinates,
      type: "MultiPolygon",
    };
  }
  return null;
}

function district(attributes: DistrictAttributes, geometry: unknown) {
  const cdsCode = attributes.CDSCode;
  const districtCode = attributes.CDCode;
  const name = attributes.DistrictName;
  const type = attributes.DistrictType;
  const schoolYear = attributes.Year;
  if (
    typeof cdsCode !== "string" ||
    !/^\d{14}$/.test(cdsCode) ||
    typeof districtCode !== "string" ||
    !/^\d{7}$/.test(districtCode) ||
    typeof name !== "string" ||
    typeof type !== "string" ||
    typeof schoolYear !== "string"
  ) {
    return undefined;
  }
  return {
    cdsCode,
    districtCode,
    geometry: districtGeometry(geometry),
    gradeHigh:
      typeof attributes.GradeHigh === "string" ? attributes.GradeHigh : null,
    gradeLow:
      typeof attributes.GradeLow === "string" ? attributes.GradeLow : null,
    name,
    schoolYear,
    type,
  };
}

export async function handleDistrictBoundaries(
  request: Request,
  fetcher: FetchFunction = fetch,
) {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Use POST for district boundary requests." },
      405,
      {
        Allow: "POST",
      },
    );
  }
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "The coordinate request is too large." }, 413);
  }

  let body: unknown;
  try {
    body = await readJsonWithLimit(request.body, MAX_REQUEST_BYTES);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message === "body-too-large"
            ? "The coordinate request is too large."
            : "Send a valid JSON coordinate request.",
      },
      error instanceof Error && error.message === "body-too-large" ? 413 : 400,
    );
  }
  const latitude = coordinate(body, "latitude");
  const longitude = coordinate(body, "longitude");
  if (
    latitude === undefined ||
    longitude === undefined ||
    !inCalifornia(latitude, longitude)
  ) {
    return jsonResponse({ error: "Send valid California coordinates." }, 400);
  }

  const upstreamUrl = new URL(DISTRICT_AREA_QUERY_URL);
  upstreamUrl.searchParams.set("f", "geojson");
  upstreamUrl.searchParams.set("geometry", `${longitude},${latitude}`);
  upstreamUrl.searchParams.set("geometryType", "esriGeometryPoint");
  upstreamUrl.searchParams.set("inSR", "4326");
  upstreamUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  upstreamUrl.searchParams.set(
    "outFields",
    "Year,CDCode,CDSCode,DistrictName,DistrictType,GradeLow,GradeHigh",
  );
  upstreamUrl.searchParams.set("returnGeometry", "true");
  upstreamUrl.searchParams.set("outSR", "4326");
  upstreamUrl.searchParams.set("geometryPrecision", "5");
  upstreamUrl.searchParams.set("maxAllowableOffset", "0.001");

  try {
    const response = await fetcher(upstreamUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: "cde_district_boundary_failure",
          status: response.status,
        }),
      );
      return jsonResponse(
        { error: "The official district boundary service is unavailable." },
        502,
      );
    }
    const responseLength = Number(response.headers.get("Content-Length") ?? 0);
    if (responseLength > MAX_UPSTREAM_BYTES) {
      throw new Error("upstream-body-too-large");
    }
    const payload = (await readJsonWithLimit(
      response.body,
      MAX_UPSTREAM_BYTES,
    )) as ArcGisDistrictResponse;
    if (payload.error || !Array.isArray(payload.features)) {
      throw new Error("invalid-upstream-payload");
    }
    const seen = new Set<string>();
    const districts = payload.features.flatMap((feature) => {
      const parsed = feature.properties
        ? district(feature.properties, feature.geometry)
        : undefined;
      if (!parsed || seen.has(parsed.cdsCode)) {
        return [];
      }
      seen.add(parsed.cdsCode);
      return [parsed];
    });
    districts.sort(
      (left, right) =>
        left.type.localeCompare(right.type) ||
        left.name.localeCompare(right.name),
    );
    return jsonResponse({
      districts,
      effectiveSchoolYear: "2025-26",
      sourceLabel: "CDE California School District Areas 2025-26",
      sourceUrl:
        "https://lab.data.ca.gov/dataset/california-school-district-areas-2025-26",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "cde_district_boundary_error",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );
    return jsonResponse(
      { error: "The official district boundary service did not respond." },
      error instanceof DOMException && error.name === "TimeoutError"
        ? 504
        : 502,
    );
  }
}
