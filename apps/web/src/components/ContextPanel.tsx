import type { MetricDefinition } from "../types";
import { Icon } from "./Icon";

interface ContextPanelProps {
  metric: MetricDefinition;
}

const baselineSections = [
  {
    icon: "school" as const,
    title: "Same district (shown)",
    body: "The dashed line is the district reference for the selected student group. It is not a target or a ranking.",
  },
  {
    icon: "attendance" as const,
    title: "Nearby",
    body: "Nearby schools are ordered by published school coordinates. Proximity does not determine enrollment eligibility.",
  },
  {
    icon: "users" as const,
    title: "Similar context",
    body: "Future peer sets will use grade span, school type, enrollment, and public student-population context.",
  },
];

export function ContextPanel({ metric }: ContextPanelProps) {
  return (
    <aside className="context-panel" aria-labelledby="context-heading">
      <div className="desktop-context">
        <h2 id="context-heading">How to read this</h2>
        <p>
          Use separate baselines to understand context without collapsing a
          school into one score.
        </p>
        {baselineSections.map((section) => (
          <section className="context-section" key={section.title}>
            <Icon name={section.icon} size={22} />
            <div>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </div>
          </section>
        ))}
        <SourceDetails metric={metric} />
      </div>

      <div className="mobile-context">
        <details>
          <summary>
            <Icon name="book" size={22} />
            <span>
              <strong>How to read this</strong>
              <small>
                Same-district, nearby, and similar-context baselines
              </small>
            </span>
            <Icon className="disclosure-chevron" name="chevronDown" size={20} />
          </summary>
          <div className="disclosure-body">
            {baselineSections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </details>
        <details>
          <summary>
            <Icon name="file" size={22} />
            <span>
              <strong>View source details</strong>
              <small>Where the data comes from and how it is calculated</small>
            </span>
            <Icon className="disclosure-chevron" name="chevronDown" size={20} />
          </summary>
          <div className="disclosure-body">
            <SourceDetails metric={metric} compact />
          </div>
        </details>
      </div>
    </aside>
  );
}

function SourceDetails({
  metric,
  compact = false,
}: ContextPanelProps & { compact?: boolean }) {
  return (
    <section
      className={
        compact ? "source-details source-details--compact" : "source-details"
      }
    >
      {compact ? null : <h2>Sources & notes</h2>}
      <p>
        This first version uses synthetic values shaped like public CDE data. No
        displayed value describes a real school.
      </p>
      <a href={metric.sourceUrl} target="_blank" rel="noreferrer">
        {metric.sourceLabel}
        <Icon name="external" size={14} />
      </a>
      <p className="source-caveat">
        Production releases will include source snapshots, denominators,
        suppression markers, and methodology versions.
      </p>
    </section>
  );
}
