import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ComparisonTable } from "./components/ComparisonTable";
import { ContextPanel } from "./components/ContextPanel";
import { ControlBar } from "./components/ControlBar";
import { Header } from "./components/Header";
import { Icon } from "./components/Icon";
import { IndicatorOverview } from "./components/IndicatorOverview";
import { LocationFinder } from "./components/LocationFinder";
import { MetricNav } from "./components/MetricNav";
import { SchoolPicker } from "./components/SchoolPicker";
import { SchoolOverview } from "./components/SchoolOverview";
import { TrendChart } from "./components/TrendChart";
import { publicDataClient } from "./data/publicData";
import type {
  DistrictDetail,
  MetricId,
  PublicCatalog,
  PublicDataClient,
  School,
  SchoolDetail,
  SubgroupId,
} from "./types";

const INITIAL_SCHOOL_IDS = [
  "01611190130229",
  "01611190132142",
  "01611190106401",
];
const SCHOOL_COLORS = ["#ff625e", "#f2a900", "#1467d8", "#6a52b3", "#16806a"];

interface AppProps {
  dataClient?: PublicDataClient;
}

export default function App({ dataClient = publicDataClient }: AppProps) {
  const [catalog, setCatalog] = useState<PublicCatalog>();
  const [schoolDetails, setSchoolDetails] = useState<Map<string, SchoolDetail>>(
    () => new Map(),
  );
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [district, setDistrict] = useState<DistrictDetail>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [metricId, setMetricId] = useState<MetricId>(
    "ela_distance_from_standard",
  );
  const [subgroup, setSubgroup] = useState<SubgroupId>("all");
  const [startYear, setStartYear] = useState(2024);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void dataClient
      .loadCatalog()
      .then(async (loadedCatalog) => {
        const schoolById = new Map(
          loadedCatalog.schools.map((school) => [school.id, school]),
        );
        const initialSummaries = INITIAL_SCHOOL_IDS.flatMap((id) => {
          const summary = schoolById.get(id);
          return summary ? [summary] : [];
        });
        const fallbackSummaries = initialSummaries.length
          ? initialSummaries
          : loadedCatalog.schools.slice(0, 3);
        const details = await Promise.all(
          fallbackSummaries.map((summary) =>
            dataClient.loadSchool(summary, loadedCatalog),
          ),
        );
        if (!active) {
          return;
        }
        setCatalog(loadedCatalog);
        setSchoolDetails(new Map(details.map((school) => [school.id, school])));
        setSelectedSchoolIds(details.map((school) => school.id));
        const firstYear = Math.min(
          ...loadedCatalog.manifest.outcomeSchoolYears.map(Number.parseFloat),
        );
        if (Number.isFinite(firstYear)) {
          setStartYear(firstYear);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load public data.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [dataClient]);

  const schoolIndex = useMemo(
    () => new Map(catalog?.schools.map((school) => [school.id, school]) ?? []),
    [catalog],
  );
  const selectedSchools: School[] = useMemo(
    () =>
      selectedSchoolIds.flatMap((id, index) => {
        const school = schoolDetails.get(id);
        return school
          ? [{ ...school, color: SCHOOL_COLORS[index] ?? "#ff625e" }]
          : [];
      }),
    [schoolDetails, selectedSchoolIds],
  );
  const commonDistrict = selectedSchools[0]?.districtId;
  const commonCounty = selectedSchools[0]?.countyCode;
  const hasCommonDistrict = selectedSchools.every(
    (school) => school.districtId === commonDistrict,
  );

  useEffect(() => {
    let active = true;
    if (!catalog || !commonDistrict || !commonCounty || !hasCommonDistrict) {
      return () => {
        active = false;
      };
    }
    void dataClient
      .loadDistrict(commonCounty, commonDistrict, catalog)
      .then((loadedDistrict) => {
        if (active) {
          setDistrict(loadedDistrict);
        }
      })
      .catch(() => {
        if (active) {
          setDistrict(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, commonCounty, commonDistrict, dataClient, hasCommonDistrict]);

  if (error) {
    return (
      <div className="app">
        <Header />
        <main className="data-state" role="alert">
          <h1>Public data could not be loaded</h1>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="app">
        <Header />
        <main className="data-state" aria-live="polite">
          <h1>Loading California school data</h1>
          <p>Preparing the statewide school index and official indicators.</p>
        </main>
      </div>
    );
  }

  const metric =
    catalog.manifest.metrics.find((definition) => definition.id === metricId) ??
    catalog.manifest.metrics[0];
  if (!metric) {
    throw new Error("The public data manifest does not define any metrics.");
  }
  const years = catalog.manifest.outcomeSchoolYears
    .map((year) => Number.parseInt(year.slice(0, 4), 10))
    .filter(Number.isFinite);
  const endYear = Math.max(...years);
  const activeDistrict =
    hasCommonDistrict && district?.id === commonDistrict ? district : undefined;
  const baseline = activeDistrict?.metrics[metric.id]?.[subgroup] ?? [];

  const addSchool = async (schoolId: string) => {
    if (selectedSchoolIds.includes(schoolId) || selectedSchoolIds.length >= 5) {
      return;
    }
    const summary = schoolIndex.get(schoolId);
    if (!summary) {
      return;
    }
    try {
      const detail = await dataClient.loadSchool(summary, catalog);
      setSchoolDetails((current) => new Map(current).set(detail.id, detail));
      setSelectedSchoolIds((current) =>
        current.includes(detail.id) || current.length >= 5
          ? current
          : [...current, detail.id],
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load school data.",
      );
    }
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
            See subgroup outcomes, school context, and the limits behind every
            number.
          </p>
        </section>

        <LocationFinder
          allSchools={catalog.schools}
          manifest={catalog.manifest}
          onAdd={addSchool}
          selectedSchoolIds={selectedSchoolIds}
        />

        <div className="workspace">
          <aside className="left-rail">
            <SchoolPicker
              allSchools={catalog.schools}
              onAdd={addSchool}
              onClear={() => setSelectedSchoolIds([])}
              onQueryChange={setQuery}
              onRemove={(schoolId) =>
                setSelectedSchoolIds((current) =>
                  current.filter((id) => id !== schoolId),
                )
              }
              filterQuery={deferredQuery}
              query={query}
              selectedSchools={selectedSchools}
            />
            <MetricNav
              metrics={catalog.manifest.metrics}
              onSelect={setMetricId}
              selectedMetricId={metric.id}
            />
          </aside>

          <ControlBar
            generatedAt={catalog.manifest.generatedAt}
            onStartYearChange={setStartYear}
            onSubgroupChange={setSubgroup}
            release={catalog.manifest.release}
            startYear={startYear}
            subgroup={subgroup}
            subgroups={catalog.manifest.subgroups}
            years={years}
          />

          <SchoolOverview
            profileSchoolYears={catalog.manifest.profileSchoolYears}
            schools={selectedSchools}
          />

          <TrendChart
            baseline={baseline}
            baselineLabel={activeDistrict?.name}
            endYear={endYear}
            metric={metric}
            schools={selectedSchools}
            startYear={startYear}
            subgroup={subgroup}
          />

          <IndicatorOverview
            endYear={endYear}
            metrics={catalog.manifest.metrics}
            schools={selectedSchools}
            subgroup={subgroup}
          />

          <ComparisonTable
            baseline={baseline}
            baselineLabel={activeDistrict?.name}
            endYear={endYear}
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
        <span>
          Official public data · Informational use only · No school ranking
        </span>
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
