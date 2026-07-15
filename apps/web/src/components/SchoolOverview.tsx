import type { CSSProperties } from "react";
import {
  directoryFlags,
  studentsPerReportedTeacher,
} from "../lib/schoolProfile";
import type { School } from "../types";
import { Icon } from "./Icon";

interface SchoolOverviewProps {
  schools: School[];
  profileSchoolYears: string[];
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
}: SchoolOverviewProps) {
  return (
    <section
      className="school-overview"
      aria-labelledby="school-overview-heading"
    >
      <div className="school-overview-header">
        <div>
          <p className="eyebrow">
            {profileSchoolYears.join(", ")} public directory
          </p>
          <h2 id="school-overview-heading">School overview</h2>
        </div>
        <p>
          Staffing and enrollment describe school context. They are not quality
          ratings.
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
                  <span>{school.schoolType}</span>
                </div>

                <dl className="school-profile-facts">
                  <div>
                    <dt>Enrollment</dt>
                    <dd>{formatCount(school.enrollment)}</dd>
                  </div>
                  <div>
                    <dt>Reported teachers</dt>
                    <dd>{formatCount(school.staff.teachers)}</dd>
                  </div>
                  <div>
                    <dt>Students per reported teacher</dt>
                    <dd>
                      {ratio === undefined ? "Not available" : ratio.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt>Total reported staff</dt>
                    <dd>{formatCount(school.staff.total)}</dd>
                  </div>
                </dl>

                <address>
                  <Icon name="school" size={15} />
                  <span>{formatAddress(school)}</span>
                </address>

                {flags.length > 0 ? (
                  <div
                    className="school-profile-flags"
                    aria-label="Directory designations"
                  >
                    {flags.map((flag) => (
                      <span key={flag}>{flag}</span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="school-overview-empty">
          Add a school to see its directory profile.
        </p>
      )}

      <p className="school-overview-note">
        Students per reported teacher is enrollment divided by reported teacher
        staff. It is not a class-size measure. Directory designations are shown
        for context only.
      </p>
    </section>
  );
}
