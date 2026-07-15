import type { MetricDefinition, School, SubgroupId } from "../types";
import { formatSchoolYear } from "../lib/metrics";

interface DataCoverageProps {
  endYear: number;
  metrics: MetricDefinition[];
  schools: School[];
  subgroup: SubgroupId;
}

function coverageForSchool(
  school: School,
  metrics: MetricDefinition[],
  subgroup: SubgroupId,
  endYear: number,
) {
  let current = 0;
  let olderOnly = 0;
  metrics.forEach((metric) => {
    const observations = school.metrics[metric.id]?.[subgroup] ?? [];
    if (
      observations.some(
        (observation) =>
          observation.year === endYear && observation.value !== null,
      )
    ) {
      current += 1;
    } else if (
      observations.some(
        (observation) =>
          observation.year < endYear && observation.value !== null,
      )
    ) {
      olderOnly += 1;
    }
  });
  return {
    current,
    olderOnly,
    unavailable: metrics.length - current - olderOnly,
  };
}

export function DataCoverage({
  endYear,
  metrics,
  schools,
  subgroup,
}: DataCoverageProps) {
  if (schools.length === 0) {
    return null;
  }
  return (
    <section className="data-coverage" aria-labelledby="coverage-heading">
      <div className="data-coverage-intro">
        <span>Data completeness</span>
        <strong id="coverage-heading">
          Published measures for {formatSchoolYear(endYear)}
        </strong>
        <small>
          Older-only means a prior public value exists. Missing and suppressed
          results remain unavailable.
        </small>
      </div>
      <div className="data-coverage-schools">
        {schools.map((school) => {
          const coverage = coverageForSchool(
            school,
            metrics,
            subgroup,
            endYear,
          );
          return (
            <article key={school.id}>
              <span>
                <i style={{ backgroundColor: school.color }} />
                {school.name}
              </span>
              <strong>
                {coverage.current}/{metrics.length} current
              </strong>
              <small>
                {coverage.olderOnly} older-only · {coverage.unavailable}{" "}
                unavailable
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
