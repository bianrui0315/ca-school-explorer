import type { MetricDefinition } from "../types";
import { Icon } from "./Icon";

interface ContextPanelProps {
  metric: MetricDefinition;
}

const baselineSections = [
  {
    icon: "school" as const,
    title: "Same district",
    body: "A district baseline appears only when every selected school belongs to the same district. It is context, not a target.",
  },
  {
    icon: "attendance" as const,
    title: "Location context",
    body: "The selected-school map uses published coordinates for orientation. Proximity never determines enrollment eligibility.",
  },
  {
    icon: "users" as const,
    title: "Similar context (planned)",
    body: "Future peer sets will use public institutional context without producing a single school score.",
  },
];

export function ContextPanel({ metric }: ContextPanelProps) {
  return (
    <aside className="context-panel" aria-labelledby="context-heading">
      <div className="desktop-context">
        <h2 id="context-heading">How to read this</h2>
        <p>
          Use separate evidence and context. Treat the experimental composite as
          an optional lens, not a school rating.
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
              <small>District context, map, and caveats</small>
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
}: Pick<ContextPanelProps, "metric"> & { compact?: boolean }) {
  return (
    <section
      className={
        compact ? "source-details source-details--compact" : "source-details"
      }
    >
      {compact ? null : <h2>Sources & notes</h2>}
      <p>
        Values are derived from official public CDE files. Source suppression is
        preserved, and raw files are not redistributed or relicensed.
      </p>
      <a href={metric.sourceUrl} target="_blank" rel="noreferrer">
        {metric.sourceLabel}
        <Icon name="external" size={14} />
      </a>
      <p className="source-caveat">
        This independent open-source project is not affiliated with or endorsed
        by the California Department of Education.
      </p>
    </section>
  );
}
