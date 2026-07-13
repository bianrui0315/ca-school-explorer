import type { MetricDefinition, MetricId } from "../types";
import { Icon, type IconName } from "./Icon";

const metricIcons: Record<MetricId, IconName> = {
  ela_distance: "book",
  chronic_absenteeism: "attendance",
  suspension_rate: "climate",
  stability_rate: "pathways",
};

interface MetricNavProps {
  metrics: MetricDefinition[];
  selectedMetricId: MetricId;
  onSelect: (metricId: MetricId) => void;
}

export function MetricNav({
  metrics,
  selectedMetricId,
  onSelect,
}: MetricNavProps) {
  return (
    <nav className="metric-nav" aria-label="Comparison metrics">
      <h2>Metrics</h2>
      <div className="metric-nav-list">
        {metrics.map((metric) => (
          <button
            aria-current={selectedMetricId === metric.id ? "page" : undefined}
            className={
              selectedMetricId === metric.id
                ? "metric-button metric-button--active"
                : "metric-button"
            }
            key={metric.id}
            onClick={() => onSelect(metric.id)}
            type="button"
          >
            <Icon name={metricIcons[metric.id]} size={21} />
            <span>{metric.navLabel}</span>
            <Icon className="metric-chevron" name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </nav>
  );
}
