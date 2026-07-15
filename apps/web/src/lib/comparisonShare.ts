import type { PublicCatalog, ReferenceMode, SubgroupId } from "../types";

export interface SharedComparisonState {
  schoolIds: string[];
  metricId: string;
  subgroup: SubgroupId;
  startYear: number;
  referenceMode: ReferenceMode;
  weights: Record<string, number>;
}

const REFERENCE_MODES = new Set<ReferenceMode>([
  "district",
  "county",
  "california",
]);

export function buildComparisonShareUrl(
  state: SharedComparisonState,
  baseUrl: string,
) {
  const url = new URL(baseUrl);
  url.pathname = "/";
  url.search = "";
  url.hash = "top";
  url.searchParams.set("view", "compare");
  url.searchParams.set("schools", state.schoolIds.slice(0, 5).join(","));
  url.searchParams.set("metric", state.metricId);
  url.searchParams.set("subgroup", state.subgroup);
  url.searchParams.set("start", String(state.startYear));
  url.searchParams.set("reference", state.referenceMode);
  url.searchParams.set(
    "weights",
    Object.entries(state.weights)
      .filter(([, value]) => Number.isFinite(value) && value >= 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([metricId, value]) => `${metricId}:${value}`)
      .join(","),
  );
  return url.toString();
}

export function parseComparisonShareUrl(
  value: string,
  catalog: PublicCatalog,
): SharedComparisonState | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.searchParams.get("view") !== "compare") {
    return undefined;
  }

  const schoolIds = (url.searchParams.get("schools") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 5);
  const knownSchools = new Set(catalog.schools.map((school) => school.id));
  const metricId = url.searchParams.get("metric") ?? "";
  const subgroup = url.searchParams.get("subgroup") ?? "";
  const startYear = Number(url.searchParams.get("start"));
  const referenceMode = url.searchParams.get("reference") as ReferenceMode;
  const validYears = new Set(
    catalog.manifest.outcomeSchoolYears.map((year) =>
      Number.parseInt(year.slice(0, 4), 10),
    ),
  );
  if (
    schoolIds.length === 0 ||
    schoolIds.some((id) => !knownSchools.has(id)) ||
    !catalog.manifest.metrics.some((metric) => metric.id === metricId) ||
    !catalog.manifest.subgroups.some(
      (definition) => definition.id === subgroup,
    ) ||
    !validYears.has(startYear) ||
    !REFERENCE_MODES.has(referenceMode)
  ) {
    return undefined;
  }

  const knownMetrics = new Set(
    catalog.manifest.metrics.map((metric) => metric.id),
  );
  const weights: Record<string, number> = {};
  for (const pair of (url.searchParams.get("weights") ?? "").split(",")) {
    if (!pair) {
      continue;
    }
    const separator = pair.lastIndexOf(":");
    const weightMetric = pair.slice(0, separator);
    const weight = Number(pair.slice(separator + 1));
    if (
      separator <= 0 ||
      !knownMetrics.has(weightMetric) ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 100
    ) {
      return undefined;
    }
    weights[weightMetric] = weight;
  }

  return {
    schoolIds,
    metricId,
    subgroup,
    startYear,
    referenceMode,
    weights,
  };
}
