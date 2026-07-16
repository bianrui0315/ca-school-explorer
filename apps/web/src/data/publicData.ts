import type {
  DemographicValue,
  DistrictDetail,
  GeographicReferences,
  MetricSeries,
  Observation,
  PublicCatalog,
  PublicDataClient,
  PublicManifest,
  Reliability,
  ReferenceBasis,
  ReferenceDetail,
  ResourceMetricSeries,
  ResourceObservation,
  SchoolDetail,
  SchoolResources,
  SchoolSummary,
} from "../types";

type RawObservation = [
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
  number,
  number,
];

interface SchoolIndexResponse {
  schemaVersion: 1;
  schools: SchoolSummary[];
}

interface RawSchoolRecord {
  demographics: Record<string, DemographicValue>;
  observations: RawObservation[];
}

interface SchoolShardResponse {
  schemaVersion: 1;
  shard: string;
  schools: Record<string, RawSchoolRecord>;
}

type RawResourceObservation = [
  schoolYear: string,
  metricIndex: number,
  dimension: string,
  value: number,
  numerator: number | null,
  denominator: number | null,
  sourceSnapshotId: number,
  metadata: Record<string, unknown>,
];

interface ResourceShardResponse {
  schemaVersion: 1;
  shard: string;
  schools: Record<string, RawResourceObservation[]>;
}

interface DistrictShardResponse {
  schemaVersion: 1;
  countyCode: string;
  districts: Record<string, { name: string; observations: RawObservation[] }>;
}

interface ReferenceResponse {
  schemaVersion: 1;
  id: string;
  name: string;
  level: "county" | "state";
  countyCode?: string;
  observations: RawObservation[];
  basisByMetric: Record<string, ReferenceBasis>;
}

const basePath = `${import.meta.env.BASE_URL}data`;
const schoolShardCache = new Map<string, Promise<SchoolShardResponse>>();
const resourceShardCache = new Map<string, Promise<ResourceShardResponse>>();
const districtShardCache = new Map<string, Promise<DistrictShardResponse>>();
const referenceCache = new Map<string, Promise<ReferenceResponse>>();

async function fetchJson<T>(path: string, cache: RequestCache = "force-cache") {
  const response = await fetch(path, { cache });
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status}): ${path}`);
  }
  return (await response.json()) as T;
}

function releasePath(path: string, release: string) {
  return `${path}?release=${encodeURIComponent(release)}`;
}

let catalogPromise: Promise<PublicCatalog> | undefined;

function loadCatalog() {
  catalogPromise ??= fetchJson<PublicManifest>(
    `${basePath}/manifest.json`,
    "no-cache",
  ).then(async (manifest) => {
    if (manifest.schemaVersion !== 1) {
      throw new Error("Unsupported public data schema version.");
    }
    const indexes = await Promise.all(
      manifest.schoolIndexFiles.map((file) =>
        fetchJson<SchoolIndexResponse>(
          releasePath(`${basePath}/${file}`, manifest.release),
        ),
      ),
    );
    if (indexes.some((index) => index.schemaVersion !== 1)) {
      throw new Error("Unsupported public data schema version.");
    }
    return {
      manifest,
      schools: indexes.flatMap((index) => index.schools),
    };
  });
  return catalogPromise;
}

function emptyMetricSeries(catalog: PublicCatalog): MetricSeries {
  return Object.fromEntries(
    catalog.manifest.metrics.map((metric) => [
      metric.id,
      Object.fromEntries(
        catalog.manifest.subgroups.map((subgroup) => [subgroup.id, []]),
      ),
    ]),
  ) as MetricSeries;
}

function decodeObservations(
  rawObservations: RawObservation[],
  catalog: PublicCatalog,
) {
  const metrics = emptyMetricSeries(catalog);
  for (const raw of rawObservations) {
    const metric = catalog.manifest.metrics[raw[1]];
    const subgroup = catalog.manifest.subgroups[raw[2]];
    if (!metric || !subgroup) {
      continue;
    }
    const observation: Observation = {
      year: raw[0],
      value: raw[3],
      numerator: raw[4],
      denominator: raw[5],
      reliability:
        catalog.manifest.reliabilityCodes[String(raw[6])] ??
        ("not-available" as Reliability),
      sourceSnapshotId: raw[7],
    };
    metrics[metric.id]?.[subgroup.id]?.push(observation);
  }
  for (const metric of Object.values(metrics)) {
    for (const observations of Object.values(metric)) {
      observations.sort((left, right) => left.year - right.year);
    }
  }
  return metrics;
}

function schoolShard(shard: string, release: string) {
  const cacheKey = `${release}:${shard}`;
  let request = schoolShardCache.get(cacheKey);
  if (!request) {
    request = fetchJson<SchoolShardResponse>(
      releasePath(`${basePath}/schools/${shard}.json`, release),
    );
    schoolShardCache.set(cacheKey, request);
  }
  return request;
}

function districtShard(countyCode: string, release: string) {
  const cacheKey = `${release}:${countyCode}`;
  let request = districtShardCache.get(cacheKey);
  if (!request) {
    request = fetchJson<DistrictShardResponse>(
      releasePath(`${basePath}/districts/${countyCode}.json`, release),
    );
    districtShardCache.set(cacheKey, request);
  }
  return request;
}

function resourceShard(shard: string, release: string) {
  const cacheKey = `${release}:${shard}`;
  let request = resourceShardCache.get(cacheKey);
  if (!request) {
    request = fetchJson<ResourceShardResponse>(
      releasePath(`${basePath}/resources/${shard}.json`, release),
    );
    resourceShardCache.set(cacheKey, request);
  }
  return request;
}

function referenceFile(path: string, release: string) {
  const cacheKey = `${release}:${path}`;
  let request = referenceCache.get(cacheKey);
  if (!request) {
    request = fetchJson<ReferenceResponse>(
      releasePath(`${basePath}/references/${path}.json`, release),
    );
    referenceCache.set(cacheKey, request);
  }
  return request;
}

async function loadSchool(summary: SchoolSummary, catalog: PublicCatalog) {
  const shard = await schoolShard(summary.shard, catalog.manifest.release);
  const record = shard.schools[summary.id];
  if (!record) {
    throw new Error(`Published school data is missing for ${summary.id}.`);
  }
  return {
    ...summary,
    demographics: record.demographics,
    metrics: decodeObservations(record.observations, catalog),
  } satisfies SchoolDetail;
}

function decodeResources(
  rawObservations: RawResourceObservation[],
  catalog: PublicCatalog,
): ResourceMetricSeries {
  const metrics: ResourceMetricSeries = {};
  const definitions = catalog.manifest.resourceMetrics ?? [];
  for (const raw of rawObservations) {
    const definition = definitions[raw[1]];
    if (!definition) {
      continue;
    }
    const observation: ResourceObservation = {
      schoolYear: raw[0],
      dimension: raw[2],
      value: raw[3],
      numerator: raw[4],
      denominator: raw[5],
      sourceSnapshotId: raw[6],
      metadata: raw[7] ?? {},
    };
    const dimensions = (metrics[definition.id] ??= {});
    const series = (dimensions[observation.dimension] ??= []);
    series.push(observation);
  }
  for (const dimensions of Object.values(metrics)) {
    for (const observations of Object.values(dimensions)) {
      observations.sort((left, right) =>
        left.schoolYear.localeCompare(right.schoolYear),
      );
    }
  }
  return metrics;
}

async function loadSchoolResources(
  summary: SchoolSummary,
  catalog: PublicCatalog,
): Promise<SchoolResources> {
  if (!catalog.manifest.resourceShardCount) {
    return { id: summary.id, metrics: {} };
  }
  const shard = await resourceShard(summary.shard, catalog.manifest.release);
  if (shard.schemaVersion !== 1) {
    throw new Error("Unsupported school resource data version.");
  }
  return {
    id: summary.id,
    metrics: decodeResources(shard.schools[summary.id] ?? [], catalog),
  };
}

async function loadDistrict(
  countyCode: string,
  districtId: string,
  catalog: PublicCatalog,
) {
  const shard = await districtShard(countyCode, catalog.manifest.release);
  const record = shard.districts[districtId];
  if (!record) {
    return undefined;
  }
  return {
    id: districtId,
    name: record.name,
    countyCode,
    metrics: decodeObservations(record.observations, catalog),
  } satisfies DistrictDetail;
}

function decodeReference(
  response: ReferenceResponse,
  catalog: PublicCatalog,
): ReferenceDetail {
  if (response.schemaVersion !== 1) {
    throw new Error("Unsupported geographic reference data version.");
  }
  return {
    id: response.id,
    name: response.name,
    level: response.level,
    countyCode: response.countyCode,
    metrics: decodeObservations(response.observations, catalog),
    basisByMetric: response.basisByMetric,
  };
}

async function loadReferences(
  countyCode: string,
  catalog: PublicCatalog,
): Promise<GeographicReferences> {
  const [county, state] = await Promise.all([
    referenceFile(`counties/${countyCode}`, catalog.manifest.release),
    referenceFile("state", catalog.manifest.release),
  ]);
  return {
    county: decodeReference(county, catalog),
    state: decodeReference(state, catalog),
  };
}

export const publicDataClient: PublicDataClient = {
  loadCatalog,
  loadSchool,
  loadSchoolResources,
  loadDistrict,
  loadReferences,
};
