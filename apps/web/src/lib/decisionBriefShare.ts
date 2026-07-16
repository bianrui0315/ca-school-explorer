import {
  buildLocationShareUrl,
  parseLocationShareUrl,
  type SharedLocationSearchState,
} from "./locationShare";
import { defaultLocationRecommendationOptions } from "./locationRecommendations";

export interface DecisionBriefState extends SharedLocationSearchState {
  schoolIds: string[];
}

export const PORTER_RANCH_SAMPLE_BRIEF: DecisionBriefState = {
  location: {
    approximate: true,
    latitude: 34.2937439,
    longitude: -118.5820123,
    matchedAddress: "Porter Ranch, CA 91326",
    provider: "CDE school directory approximation",
  },
  options: {
    ...defaultLocationRecommendationOptions(),
    grade: "10",
    priorityMultipliers: {
      academics: 1.5,
      attendance: 1,
      climate: 1,
      readiness: 1.5,
    },
  },
  query: "Porter Ranch, CA 91326",
  radius: 10,
  schoolIds: ["19651361996321", "19651360102475", "19647331933746"],
};

function validSchoolIds(value: string | null) {
  if (!value) {
    return undefined;
  }
  const schoolIds = [...new Set(value.split(","))];
  return schoolIds.length >= 1 &&
    schoolIds.length <= 3 &&
    schoolIds.every((schoolId) => /^\d{14}$/.test(schoolId))
    ? schoolIds
    : undefined;
}

export function buildDecisionBriefShareUrl(
  state: DecisionBriefState,
  baseUrl: string,
) {
  const url = new URL(buildLocationShareUrl(state, baseUrl));
  url.pathname = "/brief";
  url.searchParams.set("view", "brief");
  url.searchParams.set("schools", state.schoolIds.join(","));
  url.hash = "brief-title";
  return url.toString();
}

export function buildDecisionBriefEditUrl(
  state: DecisionBriefState,
  baseUrl: string,
) {
  const url = new URL(buildLocationShareUrl(state, baseUrl));
  url.pathname = "/area";
  return url.toString();
}

export function parseDecisionBriefShareUrl(
  value: string,
): DecisionBriefState | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.pathname !== "/brief" || url.searchParams.get("view") !== "brief") {
    return undefined;
  }
  const schoolIds = validSchoolIds(url.searchParams.get("schools"));
  if (!schoolIds) {
    return undefined;
  }
  const locationUrl = new URL(url);
  locationUrl.searchParams.set("view", "nearby");
  const locationState = parseLocationShareUrl(locationUrl.toString());
  return locationState ? { ...locationState, schoolIds } : undefined;
}
