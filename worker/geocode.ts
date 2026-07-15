const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const MAX_REQUEST_BYTES = 512;
const MAX_UPSTREAM_BYTES = 100_000;

interface CensusGeocoderResponse {
  result?: {
    addressMatches?: Array<{
      addressComponents?: { state?: string };
      coordinates?: { x?: number; y?: number };
      matchedAddress?: string;
    }>;
  };
}

export type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export async function readJsonWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
) {
  if (!body) {
    throw new Error("missing-body");
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        throw new Error("body-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function handleGeocode(
  request: Request,
  fetcher: FetchFunction = fetch,
) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST for geocoding requests." }, 405, {
      Allow: "POST",
    });
  }
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "The address request is too large." }, 413);
  }

  let body: unknown;
  try {
    body = await readJsonWithLimit(request.body, MAX_REQUEST_BYTES);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error && error.message === "body-too-large"
            ? "The address request is too large."
            : "Send a valid JSON address request.",
      },
      error instanceof Error && error.message === "body-too-large" ? 413 : 400,
    );
  }
  const address =
    typeof body === "object" && body !== null && "address" in body
      ? (body as { address?: unknown }).address
      : undefined;
  if (typeof address !== "string" || address.trim().length < 5) {
    return jsonResponse({ error: "Enter a complete California address." }, 400);
  }
  const normalizedAddress = address.trim();
  if (normalizedAddress.length > 160) {
    return jsonResponse({ error: "The address is too long." }, 400);
  }

  const upstreamUrl = new URL(CENSUS_GEOCODER_URL);
  upstreamUrl.searchParams.set("address", normalizedAddress);
  upstreamUrl.searchParams.set("benchmark", "Public_AR_Current");
  upstreamUrl.searchParams.set("format", "json");

  try {
    const response = await fetcher(upstreamUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: "census_geocoder_failure",
          status: response.status,
        }),
      );
      return jsonResponse(
        { error: "The address service is temporarily unavailable." },
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
    )) as CensusGeocoderResponse;
    const match = payload.result?.addressMatches?.[0];
    if (!match?.coordinates || !match.matchedAddress) {
      return jsonResponse(
        {
          error:
            "No exact address match was found. Try including street, city, state, and ZIP.",
        },
        404,
      );
    }
    if (match.addressComponents?.state !== "CA") {
      return jsonResponse(
        { error: "This first release supports California locations only." },
        422,
      );
    }
    const latitude = match.coordinates.y;
    const longitude = match.coordinates.x;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("invalid-upstream-coordinates");
    }
    return jsonResponse({
      latitude,
      longitude,
      matchedAddress: match.matchedAddress,
      provider: "U.S. Census Geocoder",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "census_geocoder_error",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );
    return jsonResponse(
      { error: "The address service did not respond. Please try again." },
      error instanceof DOMException && error.name === "TimeoutError"
        ? 504
        : 502,
    );
  }
}
