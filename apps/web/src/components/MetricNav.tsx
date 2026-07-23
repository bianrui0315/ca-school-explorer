import type { MetricDefinition, MetricId } from "../types";
import { useI18n } from "../i18n";
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
  const { t } = useI18n();
  return (
    <nav className="metric-nav" aria-label={t("Comparison metrics")}>
      <h2>{t("Metrics")}</h2>
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
            <span>{t(metric.navLabel)}</span>
            <Icon className="metric-chevron" name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </nav>
  );
}
