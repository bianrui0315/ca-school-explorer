import type {
  DemographicValue,
  DistrictDetail,
  MetricSeries,
  Observation,
  PublicCatalog,
  PublicDataClient,
  PublicManifest,
  Reliability,
  SchoolDetail,
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

interface DistrictShardResponse {
  schemaVersion: 1;
  countyCode: string;
  districts: Record<string, { name: string; observations: RawObservation[] }>;
}

const basePath = `${import.meta.env.BASE_URL}data`;
const schoolShardCache = new Map<string, Promise<SchoolShardResponse>>();
const districtShardCache = new Map<string, Promise<DistrictShardResponse>>();

async function fetchJson<T>(path: string, cache: RequestCache = "force-cache") {
  const response = await fetch(path, { cache });
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status}): ${path}`);
  }
  return (await response.json()) as T;
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
        fetchJson<SchoolIndexResponse>(`${basePath}/${file}`, "no-cache"),
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

function schoolShard(shard: string) {
  let request = schoolShardCache.get(shard);
  if (!request) {
    request = fetchJson<SchoolShardResponse>(
      `${basePath}/schools/${shard}.json`,
    );
    schoolShardCache.set(shard, request);
  }
  return request;
}

function districtShard(countyCode: string) {
  let request = districtShardCache.get(countyCode);
  if (!request) {
    request = fetchJson<DistrictShardResponse>(
      `${basePath}/districts/${countyCode}.json`,
    );
    districtShardCache.set(countyCode, request);
  }
  return request;
}

async function loadSchool(summary: SchoolSummary, catalog: PublicCatalog) {
  const shard = await schoolShard(summary.shard);
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

async function loadDistrict(
  countyCode: string,
  districtId: string,
  catalog: PublicCatalog,
) {
  const shard = await districtShard(countyCode);
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

export const publicDataClient: PublicDataClient = {
  loadCatalog,
  loadSchool,
  loadDistrict,
};
