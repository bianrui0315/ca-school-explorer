import type { MetricDefinition, MetricId } from "../types";
import { Icon, type IconName } from "./Icon";

function metricIcon(metricId: MetricId): IconName {
  if (metricId.includes("absenteeism")) {
    return "attendance";
  }
  if (metricId.includes("suspension")) {
    return "climate";
  }
  if (
    metricId.includes("graduation") ||
    metricId.includes("dropout") ||
    metricId.includes("a_g")
  ) {
    return "pathways";
  }
  return "book";
}

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
            <Icon name={metricIcon(metric.id)} size={21} />
            <span>{metric.navLabel}</span>
            <Icon className="metric-chevron" name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </nav>
  );
}
