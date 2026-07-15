import type { SimilarSchoolMatch } from "../lib/similarSchools";
import type { School } from "../types";
import { Icon } from "./Icon";

interface SimilarContextProps {
  anchorId?: string;
  baselineCount: number;
  baselineReady: boolean;
  isBaselineActive: boolean;
  isLoading: boolean;
  matches: SimilarSchoolMatch[];
  onAdd: (schoolId: string) => void;
  onAnchorChange: (schoolId: string) => void;
  onUseBaseline: () => void;
  selectedSchools: School[];
}

const matchFeatures = [
  ["School level", "Elementary, middle, high, or combination"],
  ["Grade overlap", "At least half of the served grade span"],
  ["Enrollment", "Compared on a proportional scale"],
  ["EL", "English learner student share"],
  ["SWD", "Students with disabilities share"],
  ["SED", "Socioeconomically disadvantaged share"],
];

export function SimilarContext({
  anchorId,
  baselineCount,
  baselineReady,
  isBaselineActive,
  isLoading,
  matches,
  onAdd,
  onAnchorChange,
  onUseBaseline,
  selectedSchools,
}: SimilarContextProps) {
  const selectedIds = new Set(selectedSchools.map((school) => school.id));
  const baselineLabel = isLoading
    ? "Preparing peer baseline…"
    : `Use ${baselineCount}-school peer baseline`;

  return (
    <section
      className="similar-context"
      aria-labelledby="similar-context-title"
    >
      <header className="similar-context-header">
        <div>
          <p className="eyebrow">Context matching</p>
          <h2 id="similar-context-title">
            Find schools with a similar public profile
          </h2>
          <p>Outcomes are excluded from matching.</p>
        </div>

        <div className="similar-context-actions">
          <label>
            <span>Anchor school</span>
            <span className="similar-anchor-select">
              <Icon name="school" size={16} />
              <select
                aria-label="Similar context anchor school"
                disabled={selectedSchools.length === 0}
                onChange={(event) => onAnchorChange(event.target.value)}
                value={anchorId ?? ""}
              >
                {selectedSchools.length === 0 ? (
                  <option value="">Add a school first</option>
                ) : null}
                {selectedSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={15} />
            </span>
          </label>
          <button
            className={
              isBaselineActive
                ? "peer-baseline-button peer-baseline-button--active"
                : "peer-baseline-button"
            }
            disabled={!baselineReady}
            onClick={onUseBaseline}
            type="button"
          >
            <Icon name={isBaselineActive ? "check" : "users"} size={16} />
            {isBaselineActive ? "Peer baseline active" : baselineLabel}
          </button>
        </div>
      </header>

      <details className="similar-context-methodology">
        <summary>
          <Icon name="info" size={15} />
          How context matching works
          <Icon className="disclosure-chevron" name="chevronDown" size={15} />
        </summary>
        <p>
          Candidates must share the school level, compatible grade span, DASS
          status, and virtual-school setting. Remaining profile differences are
          compared using enrollment, school designations, and published EL, SWD,
          and SED percentages. No academic, attendance, discipline, graduation,
          college, or career outcome is used to find peers.
        </p>
      </details>

      {selectedSchools.length === 0 ? (
        <div className="similar-context-empty">
          <Icon name="users" size={27} />
          <strong>Add a school to find similar context peers.</strong>
        </div>
      ) : matches.length === 0 ? (
        <div className="similar-context-empty" role="status">
          <Icon name="info" size={24} />
          <strong>No compatible peer set is available for this profile.</strong>
        </div>
      ) : (
        <div className="similar-context-body">
          <div className="similar-peer-list">
            <h3>Similar context peers ({matches.length})</h3>
            <div className="similar-peer-table" role="table">
              <div className="similar-peer-table-head" role="row">
                <span role="columnheader">School</span>
                <span role="columnheader">District / city</span>
                <span role="columnheader">Profile</span>
                <span role="columnheader">Why this is a context match</span>
                <span role="columnheader">Action</span>
              </div>
              {matches.map(({ school, reasons }) => {
                const isSelected = selectedIds.has(school.id);
                return (
                  <article
                    className="similar-peer-row"
                    key={school.id}
                    role="row"
                  >
                    <div className="similar-peer-school" role="cell">
                      <span />
                      <strong>{school.name}</strong>
                    </div>
                    <div className="similar-peer-location" role="cell">
                      <strong>{school.district}</strong>
                      <span>{school.city}</span>
                    </div>
                    <div className="similar-peer-profile" role="cell">
                      <span>{school.gradeSpan}</span>
                      <span>
                        {school.enrollment?.toLocaleString() ?? "Not reported"}
                        {school.enrollment ? " students" : ""}
                      </span>
                    </div>
                    <ul className="similar-peer-reasons" role="cell">
                      {reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                    <div className="similar-peer-action" role="cell">
                      <button
                        disabled={isSelected || selectedSchools.length >= 5}
                        onClick={() => onAdd(school.id)}
                        type="button"
                      >
                        <Icon name={isSelected ? "check" : "plus"} size={14} />
                        {isSelected
                          ? "Added"
                          : selectedSchools.length >= 5
                            ? "Limit reached"
                            : "Add"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="similar-match-guide">
            <h3>What makes a match</h3>
            {matchFeatures.map(([label, description]) => (
              <div key={label}>
                <i />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </div>
            ))}
          </aside>
        </div>
      )}

      <p className="similar-context-note">
        <Icon name="info" size={15} />
        Academic outcomes are never used to find similar schools. Similarity is
        context, not a quality rating or enrollment assignment.
      </p>
    </section>
  );
}
