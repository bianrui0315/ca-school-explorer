import { handleDistrictBoundaries } from "./district-boundaries";
import { handleGeocode, jsonResponse } from "./geocode";

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/geocode") {
      return handleGeocode(request);
    }
    if (url.pathname === "/api/district-boundaries") {
      return handleDistrictBoundaries(request);
    }
    return jsonResponse({ error: "API route not found." }, 404);
  },
} satisfies ExportedHandler;
