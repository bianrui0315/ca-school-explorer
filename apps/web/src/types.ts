export type MetricId = string;
export type SubgroupId = string;

export type Reliability =
  | "reliable"
  | "small-sample"
  | "suppressed"
  | "not-available"
  | "method-break";

export interface Observation {
  year: number;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  reliability: Reliability;
  sourceSnapshotId: number;
}

export interface MetricDefinition {
  id: MetricId;
  navLabel: string;
  label: string;
  shortLabel: string;
  description: string;
  unit: "count" | "percent" | "points" | "ratio";
  direction: "higher" | "lower" | "neutral";
  methodologyVersion: string;
  sourceKey: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface SubgroupDefinition {
  id: SubgroupId;
  label: string;
  category: "total" | "program" | "race_ethnicity" | "gender" | "grade_span";
}

export type LatestSchoolObservation = [
  year: number,
  metricIndex: number,
  value: number | null,
  denominator: number | null,
  reliabilityCode: number,
  sourceSnapshotId: number,
];

export interface SchoolSummary {
  id: string;
  name: string;
  status: string;
  countyCode: string;
  county: string;
  districtId: string;
  district: string;
  shard: string;
  city: string;
  gradeSpan: string;
  schoolType: string;
  schoolLevel: string;
  charter: boolean;
  virtualType: string;
  magnet: boolean;
  titleI: boolean;
  dass: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  latitude: number | null;
  longitude: number | null;
  enrollment: number | null;
  staff: {
    total: number | null;
    teachers: number | null;
    administrators: number | null;
  };
  latestObservations?: LatestSchoolObservation[];
}

export interface DemographicValue {
  count: number | null;
  percent: number | null;
}

export type MetricSeries = Record<MetricId, Record<SubgroupId, Observation[]>>;

export interface SchoolDetail extends SchoolSummary {
  demographics: Record<string, DemographicValue>;
  metrics: MetricSeries;
}

export interface School extends SchoolDetail {
  color: string;
}

export interface DistrictDetail {
  id: string;
  name: string;
  countyCode: string;
  metrics: MetricSeries;
}

export interface SourceSnapshot {
  id: number;
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  datasetId: string;
  schoolYear: string;
  releaseDate: string;
  retrievedAt: string;
  sha256: string;
  termsStatus: string;
}

export interface PublicManifest {
  schemaVersion: 1;
  release: string;
  generatedAt: string;
  profileSchoolYears: string[];
  outcomeSchoolYears: string[];
  schoolCount: number;
  schoolIndexFileCount: number;
  schoolIndexFiles: string[];
  districtCount: number;
  observationCount: number;
  schoolShardCount: number;
  districtFileCount: number;
  metrics: MetricDefinition[];
  subgroups: SubgroupDefinition[];
  sourceSnapshots: SourceSnapshot[];
  reliabilityCodes: Record<string, Reliability>;
  dataNotice: string;
  latestObservationEncoding?: string[];
}

export interface PublicCatalog {
  manifest: PublicManifest;
  schools: SchoolSummary[];
}

export interface PublicDataClient {
  loadCatalog: () => Promise<PublicCatalog>;
  loadSchool: (
    summary: SchoolSummary,
    catalog: PublicCatalog,
  ) => Promise<SchoolDetail>;
  loadDistrict: (
    countyCode: string,
    districtId: string,
    catalog: PublicCatalog,
  ) => Promise<DistrictDetail | undefined>;
}
