import type { MetricDefinition, ReferenceBasis, ReferenceMode } from "../types";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";

interface ContextPanelProps {
  metric: MetricDefinition;
  referenceBasis?: ReferenceBasis;
  referenceDescription: string;
  referenceLabel?: string;
  referenceMode: ReferenceMode;
}

const supportingSections = [
  {
    icon: "attendance" as const,
    title: "Location context",
    body: "The selected-school map uses published coordinates for orientation. Proximity never determines enrollment eligibility.",
  },
  {
    icon: "users" as const,
    title: "Similar context",
    body: "Peer sets use public institutional context only. They do not produce a quality score or determine enrollment eligibility.",
  },
];

function basisLabel(basis: ReferenceBasis | undefined, mode: ReferenceMode) {
  if (basis === "derived-district-weighted") {
    return "Calculated from official district rows, weighted by the published student denominator.";
  }
  if (basis === "derived-peer-weighted") {
    return "Calculated after matching from public school rows, weighted by each published student denominator. Suppressed values are excluded.";
  }
  if (basis === "official-county") {
    return "Official CDE county aggregate.";
  }
  if (basis === "official-state") {
    return "Official CDE statewide aggregate.";
  }
  if (mode === "district") {
    return "Official CDE district aggregate.";
  }
  return "A matching public reference may be unavailable for this metric or student group.";
}

export function ContextPanel({
  metric,
  referenceBasis,
  referenceDescription,
  referenceLabel,
  referenceMode,
}: ContextPanelProps) {
  const { t } = useI18n();
  const baselineSections = [
    {
      icon: "school" as const,
      title: referenceLabel
        ? t("{label} reference", { label: referenceLabel })
        : t("Reference context"),
      body: `${t(referenceDescription)} ${t(basisLabel(referenceBasis, referenceMode))} ${t("It is context, not a target.")}`,
    },
    ...supportingSections,
  ];
  return (
    <aside className="context-panel" aria-labelledby="context-heading">
      <div className="desktop-context">
        <h2 id="context-heading">{t("How to read this")}</h2>
        <p>
          {t(
            "Use separate evidence and context. Treat the experimental composite as an optional lens, not a school rating.",
          )}
        </p>
        {baselineSections.map((section) => (
          <section className="context-section" key={section.title}>
            <Icon name={section.icon} size={22} />
            <div>
              <h3>{t(section.title)}</h3>
              <p>{t(section.body)}</p>
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
              <strong>{t("How to read this")}</strong>
              <small>{t("Reference context, map, and caveats")}</small>
            </span>
            <Icon className="disclosure-chevron" name="chevronDown" size={20} />
          </summary>
          <div className="disclosure-body">
            {baselineSections.map((section) => (
              <section key={section.title}>
                <h3>{t(section.title)}</h3>
                <p>{t(section.body)}</p>
              </section>
            ))}
          </div>
        </details>
        <details>
          <summary>
            <Icon name="file" size={22} />
            <span>
              <strong>{t("View source details")}</strong>
              <small>
                {t("Where the data comes from and how it is calculated")}
              </small>
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
  const { t } = useI18n();
  const metricCaveat =
    metric.id === "college_going_rate_12_month"
      ? "College-going data currently end in 2022–23 and use a high-school-completer denominator that differs from the four-year graduation cohort. National Student Clearinghouse privacy blocks can make observed enrollment lower than actual enrollment."
      : metric.id === "college_career_prepared_rate"
        ? "The CCI denominator can include students from two graduation cohort types. Prepared pathways and rules can change between Dashboard releases, so read trends with the source methodology in view."
        : undefined;
  return (
    <section
      className={
        compact ? "source-details source-details--compact" : "source-details"
      }
    >
      {compact ? null : <h2>{t("Sources & notes")}</h2>}
      <p>
        {t(
          "Values are derived from official public CDE files. Source suppression is preserved, and raw files are not redistributed or relicensed.",
        )}
      </p>
      {metricCaveat ? <p className="source-caveat">{t(metricCaveat)}</p> : null}
      <a href={metric.sourceUrl} target="_blank" rel="noreferrer">
        {t(metric.sourceLabel)}
        <Icon name="external" size={14} />
      </a>
      <p className="source-caveat">
        {t(
          "This independent open-source project is not affiliated with or endorsed by the California Department of Education.",
        )}
      </p>
    </section>
  );
}
