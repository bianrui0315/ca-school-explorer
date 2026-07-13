import type { SubgroupDefinition, SubgroupId } from "../types";
import { Icon } from "./Icon";

interface ControlBarProps {
  releasedAt: string;
  subgroups: SubgroupDefinition[];
  subgroup: SubgroupId;
  startYear: number;
  onSubgroupChange: (subgroup: SubgroupId) => void;
  onStartYearChange: (year: number) => void;
}

export function ControlBar({
  releasedAt,
  subgroups,
  subgroup,
  startYear,
  onSubgroupChange,
  onStartYearChange,
}: ControlBarProps) {
  return (
    <section className="control-bar" aria-label="Comparison controls">
      <div className="fixture-status" role="status">
        <span className="fixture-status-icon">
          <Icon name="check" size={16} strokeWidth={2.2} />
        </span>
        <span>
          <strong>Fixture data</strong>
          <span className="fixture-detail">Synthetic demo · {releasedAt}</span>
        </span>
        <a href="#source-details">What this means</a>
      </div>

      <div className="filter-controls">
        <label className="select-control">
          <span className="visually-hidden">Student lens</span>
          <Icon name="users" size={20} />
          <select
            aria-label="Student lens"
            onChange={(event) =>
              onSubgroupChange(event.target.value as SubgroupId)
            }
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
            onChange={(event) => onStartYearChange(Number(event.target.value))}
            value={startYear}
          >
            <option value={2022}>2022–2025</option>
            <option value={2023}>2023–2025</option>
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>
      </div>
    </section>
  );
}
