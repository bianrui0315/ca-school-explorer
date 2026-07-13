import { formatSchoolYear } from "../lib/metrics";
import type { SubgroupDefinition, SubgroupId } from "../types";
import { Icon } from "./Icon";

interface ControlBarProps {
  generatedAt: string;
  release: string;
  subgroups: SubgroupDefinition[];
  subgroup: SubgroupId;
  startYear: number;
  years: number[];
  onSubgroupChange: (subgroup: SubgroupId) => void;
  onStartYearChange: (year: number) => void;
}

export function ControlBar({
  generatedAt,
  release,
  subgroups,
  subgroup,
  startYear,
  years,
  onSubgroupChange,
  onStartYearChange,
}: ControlBarProps) {
  const latestYear = Math.max(...years);
  const generatedLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(generatedAt));

  return (
    <section className="control-bar" aria-label="Comparison controls">
      <div className="fixture-status" role="status">
        <span className="fixture-status-icon">
          <Icon name="check" size={16} strokeWidth={2.2} />
        </span>
        <span>
          <strong>Official public data</strong>
          <span className="fixture-detail">
            Release {release} · Built {generatedLabel}
          </span>
        </span>
        <a href="#source-details">Sources</a>
      </div>

      <div className="filter-controls">
        <label className="select-control">
          <span className="visually-hidden">Student lens</span>
          <Icon name="users" size={20} />
          <select
            aria-label="Student lens"
            onChange={(event) => onSubgroupChange(event.target.value)}
            value={subgroup}
          >
            {subgroups.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>

        <label className="select-control">
          <span className="visually-hidden">Year range</span>
          <Icon name="calendar" size={20} />
          <select
            aria-label="Year range"
            disabled={years.length <= 1}
            onChange={(event) => onStartYearChange(Number(event.target.value))}
            value={startYear}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year === latestYear
                  ? formatSchoolYear(year)
                  : `${formatSchoolYear(year)}–${formatSchoolYear(latestYear)}`}
              </option>
            ))}
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>
      </div>
    </section>
  );
}
