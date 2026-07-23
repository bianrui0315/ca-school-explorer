import { formatSchoolYear } from "../lib/metrics";
import { localeCode, useI18n } from "../i18n";
import type { ReferenceMode, SubgroupDefinition, SubgroupId } from "../types";
import { Icon } from "./Icon";

interface ControlBarProps {
  canShare: boolean;
  generatedAt: string;
  release: string;
  subgroups: SubgroupDefinition[];
  subgroup: SubgroupId;
  startYear: number;
  years: number[];
  referenceMode: ReferenceMode;
  referenceOptions: Array<{
    disabled?: boolean;
    label: string;
    value: ReferenceMode;
  }>;
  shareMessage?: string;
  onReferenceModeChange: (mode: ReferenceMode) => void;
  onShare: () => void;
  onSubgroupChange: (subgroup: SubgroupId) => void;
  onStartYearChange: (year: number) => void;
}

export function ControlBar({
  canShare,
  generatedAt,
  release,
  subgroups,
  subgroup,
  startYear,
  years,
  referenceMode,
  referenceOptions,
  shareMessage,
  onReferenceModeChange,
  onShare,
  onSubgroupChange,
  onStartYearChange,
}: ControlBarProps) {
  const { locale, t } = useI18n();
  const latestYear = Math.max(...years);
  const generatedLabel = new Intl.DateTimeFormat(localeCode(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(generatedAt));

  return (
    <section className="control-bar" aria-label={t("Comparison controls")}>
      <div className="fixture-status" role="status">
        <span className="fixture-status-icon">
          <Icon name="check" size={16} strokeWidth={2.2} />
        </span>
        <span>
          <strong>{t("Official public data")}</strong>
          <span className="fixture-detail">
            {t("Data release {release} · Generated {date}", {
              release,
              date: generatedLabel,
            })}
          </span>
        </span>
        <a href="#source-details">{t("Sources")}</a>
      </div>

      <div className="filter-controls">
        <label className="select-control">
          <span className="visually-hidden">{t("Student lens")}</span>
          <Icon name="users" size={20} />
          <select
            aria-label={t("Student lens")}
            onChange={(event) => onSubgroupChange(event.target.value)}
            value={subgroup}
          >
            {subgroups.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {t(definition.label)}
              </option>
            ))}
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>

        <label className="select-control">
          <span className="visually-hidden">{t("Year range")}</span>
          <Icon name="calendar" size={20} />
          <select
            aria-label={t("Year range")}
            disabled={years.length <= 1}
            onChange={(event) => onStartYearChange(Number(event.target.value))}
            value={startYear}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year === latestYear
                  ? formatSchoolYear(year)
                  : t("{start} to {end}", {
                      start: formatSchoolYear(year),
                      end: formatSchoolYear(latestYear),
                    })}
              </option>
            ))}
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>

        <label className="select-control select-control--reference">
          <span className="visually-hidden">{t("Reference context")}</span>
          <Icon name="school" size={20} />
          <select
            aria-label={t("Reference context")}
            onChange={(event) =>
              onReferenceModeChange(event.target.value as ReferenceMode)
            }
            value={referenceMode}
          >
            {referenceOptions.map((option) => (
              <option
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                {t(option.label)}
              </option>
            ))}
          </select>
          <Icon className="select-chevron" name="chevronDown" size={17} />
        </label>

        <button
          className="share-comparison"
          disabled={!canShare}
          onClick={onShare}
          type="button"
        >
          <Icon name="external" size={15} />
          {t("Share view")}
        </button>
        {shareMessage ? (
          <span className="comparison-share-status" role="status">
            {shareMessage}
          </span>
        ) : null}
      </div>
    </section>
  );
}
