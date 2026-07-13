import { useDeferredValue, useMemo, useState } from "react";
import { ComparisonTable } from "./components/ComparisonTable";
import { ContextPanel } from "./components/ContextPanel";
import { ControlBar } from "./components/ControlBar";
import { Header } from "./components/Header";
import { Icon } from "./components/Icon";
import { MetricNav } from "./components/MetricNav";
import { SchoolPicker } from "./components/SchoolPicker";
import { TrendChart } from "./components/TrendChart";
import { fixtureDataset, initialSchoolIds } from "./data/fixture";
import type { MetricId, SubgroupId } from "./types";

export default function App() {
  const [selectedSchoolIds, setSelectedSchoolIds] =
    useState<string[]>(initialSchoolIds);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [metricId, setMetricId] = useState<MetricId>("ela_distance");
  const [subgroup, setSubgroup] = useState<SubgroupId>("all");
  const [startYear, setStartYear] = useState(2022);

  const schoolById = useMemo(
    () => new Map(fixtureDataset.schools.map((school) => [school.id, school])),
    [],
  );
  const selectedSchools = selectedSchoolIds.flatMap((id) => {
    const school = schoolById.get(id);
    return school ? [school] : [];
  });
  const metric = fixtureDataset.metrics.find(
    (definition) => definition.id === metricId,
  );

  if (!metric) {
    throw new Error(`Unknown metric: ${metricId}`);
  }

  const addSchool = (schoolId: string) => {
    setSelectedSchoolIds((current) =>
      current.includes(schoolId) || current.length >= 5
        ? current
        : [...current, schoolId],
    );
  };

  const removeSchool = (schoolId: string) => {
    setSelectedSchoolIds((current) => current.filter((id) => id !== schoolId));
  };

  const scrollToFreshness = () => {
    document
      .getElementById("source-details")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app" id="top">
      <Header onDataFreshness={scrollToFreshness} />
      <main>
        <section className="intro">
          <h1>Compare schools across time and context</h1>
          <p>
            See trends, subgroup outcomes, and the limits behind every number.
          </p>
        </section>

        <div className="workspace">
          <aside className="left-rail">
            <SchoolPicker
              allSchools={fixtureDataset.schools}
              onAdd={addSchool}
              onClear={() => setSelectedSchoolIds([])}
              onQueryChange={setQuery}
              onRemove={removeSchool}
              filterQuery={deferredQuery}
              query={query}
              selectedSchools={selectedSchools}
            />
            <MetricNav
              metrics={fixtureDataset.metrics}
              onSelect={setMetricId}
              selectedMetricId={metricId}
            />
          </aside>

          <ControlBar
            onStartYearChange={setStartYear}
            onSubgroupChange={setSubgroup}
            releasedAt={fixtureDataset.releasedAt}
            startYear={startYear}
            subgroup={subgroup}
            subgroups={fixtureDataset.subgroups}
          />

          <TrendChart
            baseline={fixtureDataset.districtBaseline[metric.id][subgroup]}
            endYear={2025}
            metric={metric}
            schools={selectedSchools}
            startYear={startYear}
            subgroup={subgroup}
          />

          <ComparisonTable
            baseline={fixtureDataset.districtBaseline[metric.id][subgroup]}
            endYear={2025}
            metric={metric}
            schools={selectedSchools}
            startYear={startYear}
            subgroup={subgroup}
          />

          <div id="source-details">
            <ContextPanel metric={metric} />
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <span>
          <Icon name="info" size={17} />
          Nearby does not mean assigned.
        </span>
        <span>Fixture data only · Not for school or housing decisions</span>
        <a
          href="https://github.com/bianrui0315/ca-school-explorer"
          target="_blank"
          rel="noreferrer"
        >
          Open source on GitHub
          <Icon name="external" size={13} />
        </a>
      </footer>
    </div>
  );
}
