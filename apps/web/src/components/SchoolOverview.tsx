import type { CSSProperties } from "react";
import { useI18n } from "../i18n";
import {
  directoryFlags,
  studentsPerReportedTeacher,
} from "../lib/schoolProfile";
import type { School } from "../types";
import { Icon } from "./Icon";

interface SchoolOverviewProps {
  schools: School[];
  profileSchoolYears: string[];
  onOpenProfile?: (schoolId: string) => void;
}

function schoolStyle(color: string) {
  return { "--school-color": color } as CSSProperties;
}

function formatCount(value: number | null) {
  return value === null ? "Not reported" : value.toLocaleString();
}

function formatAddress(school: School) {
  const cityStateZip = [
    school.address.city,
    [school.address.state, school.address.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [school.address.street, cityStateZip].filter(Boolean).join(", ");
}

export function SchoolOverview({
  schools,
  profileSchoolYears,
  onOpenProfile,
}: SchoolOverviewProps) {
  const { t } = useI18n();
  return (
    <section
      className="school-overview"
      aria-labelledby="school-overview-heading"
    >
      <div className="school-overview-header">
        <div>
          <p className="eyebrow">
            {t("{years} public directory", {
              years: profileSchoolYears.join(", "),
            })}
          </p>
          <h2 id="school-overview-heading">{t("School overview")}</h2>
        </div>
        <p>
          {t(
            "Staffing and enrollment describe school context. They are not quality ratings.",
          )}
        </p>
      </div>

      {schools.length > 0 ? (
        <div className="school-overview-grid">
          {schools.map((school) => {
            const ratio = studentsPerReportedTeacher(school);
            const flags = directoryFlags(school);
            return (
              <article
                className="school-profile-card"
                key={school.id}
                style={schoolStyle(school.color)}
              >
                <header>
                  <span className="school-profile-dot" />
                  <div>
                    <h3>{school.name}</h3>
                    <p>{school.district}</p>
                  </div>
                </header>

                <div className="school-profile-meta">
                  <span>{school.gradeSpan}</span>
                  <span>{t(school.schoolType)}</span>
                </div>

                <dl className="school-profile-facts">
                  <div>
                    <dt>{t("Enrollment")}</dt>
                    <dd>
                      {school.enrollment === null
                        ? t("Not reported")
                        : formatCount(school.enrollment)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Reported teachers")}</dt>
                    <dd>
                      {school.staff.teachers === null
                        ? t("Not reported")
                        : formatCount(school.staff.teachers)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Students per reported teacher")}</dt>
                    <dd>
                      {ratio === undefined
                        ? t("Not available")
                        : ratio.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Total reported staff")}</dt>
                    <dd>
                      {school.staff.total === null
                        ? t("Not reported")
                        : formatCount(school.staff.total)}
                    </dd>
                  </div>
                </dl>

                <address>
                  <Icon name="school" size={15} />
                  <span>{formatAddress(school)}</span>
                </address>

                {flags.length > 0 ? (
                  <div
                    className="school-profile-flags"
                    aria-label={t("Directory designations")}
                  >
                    {flags.map((flag) => (
                      <span key={flag}>{flag}</span>
                    ))}
                  </div>
                ) : null}

                {onOpenProfile ? (
                  <button
                    className="school-profile-link"
                    onClick={() => onOpenProfile(school.id)}
                    type="button"
                  >
                    {t("View school profile")}
                    <Icon name="chevronRight" size={16} />
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="school-overview-empty">
          {t("Add a school to see its directory profile.")}
        </p>
      )}

      <p className="school-overview-note">
        {t(
          "Students per reported teacher is enrollment divided by reported teacher staff. It is not a class-size measure. Directory designations are shown for context only.",
        )}
      </p>
    </section>
  );
}
