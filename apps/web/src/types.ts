export const subgroupIds = [
  "all",
  "english_learners",
  "students_with_disabilities",
] as const;
export type SubgroupId = (typeof subgroupIds)[number];

export const metricIds = [
  "ela_distance",
  "chronic_absenteeism",
  "suspension_rate",
  "stability_rate",
] as const;
export type MetricId = (typeof metricIds)[number];

export type Reliability =
  | "reliable"
  | "small-sample"
  | "suppressed"
  | "not-available";

export interface Observation {
  year: number;
  value: number | null;
  denominator: number | null;
  reliability: Reliability;
}

export interface MetricDefinition {
  id: MetricId;
  navLabel: string;
  label: string;
  shortLabel: string;
  description: string;
  unit: "points" | "percent";
  direction: "higher" | "lower";
  sourceLabel: string;
  sourceUrl: string;
}

export interface School {
  id: string;
  name: string;
  district: string;
  city: string;
  gradeSpan: string;
  color: string;
  metrics: Record<MetricId, Record<SubgroupId, Observation[]>>;
}

export interface SubgroupDefinition {
  id: SubgroupId;
  label: string;
}

export interface FixtureDataset {
  label: string;
  releasedAt: string;
  years: number[];
  subgroups: SubgroupDefinition[];
  metrics: MetricDefinition[];
  districtBaseline: Record<MetricId, Record<SubgroupId, Observation[]>>;
  schools: School[];
}
