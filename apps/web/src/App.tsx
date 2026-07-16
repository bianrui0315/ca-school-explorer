import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ComparisonTable } from "./components/ComparisonTable";
import { ContextPanel } from "./components/ContextPanel";
import { ControlBar } from "./components/ControlBar";
import { DataCoverage } from "./components/DataCoverage";
import { Header, type AppPage } from "./components/Header";
import { Icon } from "./components/Icon";
import { IndicatorOverview } from "./components/IndicatorOverview";
import { LocationFinder } from "./components/LocationFinder";
import { MetricNav } from "./components/MetricNav";
import { SchoolPicker } from "./components/SchoolPicker";
import { SchoolOverview } from "./components/SchoolOverview";
import { SimilarContext } from "./components/SimilarContext";
import { TrendChart } from "./components/TrendChart";
import { TeachingResources } from "./components/TeachingResources";
import { publicDataClient } from "./data/publicData";
import {
  buildComparisonShareUrl,
  parseComparisonShareUrl,
} from "./lib/comparisonShare";
import { DEFAULT_INDICATOR_WEIGHTS } from "./lib/indicatorScore";
import {
  buildPeerMetricSeries,
  findSimilarSchools,
} from "./lib/similarSchools";
import { routeFromPath, schoolProfilePath } from "./lib/schoolProfileRoute";
import type {
  DistrictDetail,
  GeographicReferences,
  MetricId,
  PublicCatalog,
  PublicDataClient,
  ReferenceMode,
  School,
  SchoolDetail,
  SchoolResources,
  SubgroupId,
} from "./types";

const INITIAL_SCHOOL_IDS = [
  "01611190130229",
  "01611190132142",
  "01611190106401",
];
const SCHOOL_COLORS = ["#ff625e", "#f2a900", "#1467d8", "#6a52b3", "#16806a"];

const SchoolProfile = lazy(() =>
  import("./components/SchoolProfile").then((module) => ({
    default: module.SchoolProfile,
  })),
);
const SchoolProfileNotFound = lazy(() =>
  import("./components/SchoolProfile").then((module) => ({
    default: module.SchoolProfileNotFound,
  })),
);

interface AppProps {
  dataClient?: PublicDataClient;
}

function routeFromLocation() {
  return routeFromPath(
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
}

export default function App({ dataClient = publicDataClient }: AppProps) {
  const [initialRoute] = useState(routeFromLocation);
  const [activePage, setActivePage] = useState<AppPage>(initialRoute.page);
  const [profileSchoolId, setProfileSchoolId] = useState(
    initialRoute.profileSchoolId,
  );
  const [profileError, setProfileError] = useState<string>();
  const [catalog, setCatalog] = useState<PublicCatalog>();
  const [schoolDetails, setSchoolDetails] = useState<Map<string, SchoolDetail>>(
    () => new Map(),
  );
  const [schoolResources, setSchoolResources] = useState<
    Map<string, SchoolResources>
  >(() => new Map());
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [district, setDistrict] = useState<DistrictDetail>();
  const [geographicReferences, setGeographicReferences] =
    useState<GeographicReferences>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [metricId, setMetricId] = useState<MetricId>(
    "ela_distance_from_standard",
  );
  const [subgroup, setSubgroup] = useState<SubgroupId>("all");
  const [startYear, setStartYear] = useState(2024);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("district");
  const [peerAnchorId, setPeerAnchorId] = useState<string>();
  const [loadedPeerSet, setLoadedPeerSet] = useState<{
    anchorId?: string;
    details: Map<string, SchoolDetail>;
  }>(() => ({ details: new Map() }));
  const [indicatorWeights, setIndicatorWeights] = useState<
    Record<string, number>
  >(() => ({ ...DEFAULT_INDICATOR_WEIGHTS }));
  const [shareMessage, setShareMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const handlePopState = () => {
      const route = routeFromLocation();
      setActivePage(route.page);
      setProfileSchoolId(route.profileSchoolId);
      setProfileError(undefined);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(page: AppPage) {
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname =
      page === "area" ? "/area" : page === "resources" ? "/resources" : "/";
    nextUrl.search = "";
    nextUrl.hash = "";
    window.history.pushState({}, "", nextUrl);
    setActivePage(page);
    setProfileSchoolId(undefined);
    setProfileError(undefined);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function navigateToProfile(schoolId: string) {
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = schoolProfilePath(schoolId);
    nextUrl.search = "";
    nextUrl.hash = "";
    window.history.pushState({}, "", nextUrl);
    setProfileSchoolId(schoolId);
    setProfileError(undefined);
    setActivePage("profile");
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  useEffect(() => {
    let active = true;
    void dataClient
      .loadCatalog()
      .then(async (loadedCatalog) => {
        const sharedComparison =
          initialRoute.page === "profile" || typeof window === "undefined"
            ? undefined
            : parseComparisonShareUrl(window.location.href, loadedCatalog);
        const schoolById = new Map(
          loadedCatalog.schools.map((school) => [school.id, school]),
        );
        const firstYear = Math.min(
          ...loadedCatalog.manifest.outcomeSchoolYears.map(Number.parseFloat),
        );
        if (initialRoute.page === "profile") {
          const profileSummary = initialRoute.profileSchoolId
            ? schoolById.get(initialRoute.profileSchoolId)
            : undefined;
          if (!profileSummary) {
            if (active) {
              setCatalog(loadedCatalog);
              setSelectedSchoolIds([]);
              setProfileError(
                "The requested CDS code is not in the current directory.",
              );
            }
            return;
          }
          const profileDetail = await dataClient.loadSchool(
            profileSummary,
            loadedCatalog,
          );
          if (!active) {
            return;
          }
          setCatalog(loadedCatalog);
          setSchoolDetails(new Map([[profileDetail.id, profileDetail]]));
          setSelectedSchoolIds([]);
          setPeerAnchorId(profileDetail.id);
          if (Number.isFinite(firstYear)) {
            setStartYear(firstYear);
          }
          return;
        }
        const initialSummaries = INITIAL_SCHOOL_IDS.flatMap((id) => {
          const summary = schoolById.get(id);
          return summary ? [summary] : [];
        });
        const sharedSummaries = sharedComparison?.schoolIds.flatMap((id) => {
          const summary = schoolById.get(id);
          return summary ? [summary] : [];
        });
        const fallbackSummaries = sharedSummaries?.length
          ? sharedSummaries
          : initialSummaries.length
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
        setPeerAnchorId(sharedComparison?.peerAnchorId ?? details[0]?.id);
        if (sharedComparison) {
          setMetricId(sharedComparison.metricId);
          setSubgroup(sharedComparison.subgroup);
          setStartYear(sharedComparison.startYear);
          setReferenceMode(sharedComparison.referenceMode);
          setIndicatorWeights({
            ...DEFAULT_INDICATOR_WEIGHTS,
            ...sharedComparison.weights,
          });
          return;
        }
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
  }, [dataClient, initialRoute]);

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
  const profileSchool = useMemo(() => {
    if (!profileSchoolId) {
      return undefined;
    }
    const detail = schoolDetails.get(profileSchoolId);
    return detail ? { ...detail, color: "#1467d8" } : undefined;
  }, [profileSchoolId, schoolDetails]);

  useEffect(() => {
    let active = true;
    if (
      activePage !== "profile" ||
      !catalog ||
      !profileSchoolId ||
      profileSchool ||
      profileError
    ) {
      return () => {
        active = false;
      };
    }
    const summary = schoolIndex.get(profileSchoolId);
    if (!summary) {
      window.queueMicrotask(() => {
        if (active) {
          setProfileError(
            "The requested CDS code is not in the current directory.",
          );
        }
      });
      return () => {
        active = false;
      };
    }
    void dataClient
      .loadSchool(summary, catalog)
      .then((detail) => {
        if (active) {
          setSchoolDetails((current) =>
            new Map(current).set(detail.id, detail),
          );
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setProfileError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this school profile.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [
    activePage,
    catalog,
    dataClient,
    profileError,
    profileSchool,
    profileSchoolId,
    schoolIndex,
  ]);

  useEffect(() => {
    document.title =
      activePage === "area"
        ? "Area Explorer · California School Explorer"
        : activePage === "resources"
          ? "Teaching & resources · California School Explorer"
          : activePage === "profile" && profileSchool
            ? `${profileSchool.name} · California School Explorer`
            : "California School Explorer";
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) {
      description.content =
        activePage === "profile" && profileSchool
          ? `Explore official outcomes, student-group context, teaching resources, and location details for ${profileSchool.name}.`
          : "Compare California schools across time, student groups, and transparent context baselines.";
    }
  }, [activePage, profileSchool]);

  const resourceSchoolIds = useMemo(
    () =>
      activePage === "profile" && profileSchoolId
        ? [profileSchoolId]
        : selectedSchoolIds,
    [activePage, profileSchoolId, selectedSchoolIds],
  );

  useEffect(() => {
    let active = true;
    if (
      (activePage !== "resources" && activePage !== "profile") ||
      !catalog ||
      resourceSchoolIds.length === 0
    ) {
      return () => {
        active = false;
      };
    }
    const summaries = resourceSchoolIds.flatMap((schoolId) => {
      if (schoolResources.has(schoolId)) {
        return [];
      }
      const summary = schoolIndex.get(schoolId);
      return summary ? [summary] : [];
    });
    if (summaries.length === 0) {
      return () => {
        active = false;
      };
    }
    void Promise.allSettled(
      summaries.map((summary) =>
        dataClient.loadSchoolResources(summary, catalog),
      ),
    ).then((results) => {
      if (!active) {
        return;
      }
      const loaded = results.map((result, index) =>
        result.status === "fulfilled"
          ? result.value
          : { id: summaries[index]!.id, metrics: {} },
      );
      setSchoolResources((current) => {
        const next = new Map(current);
        loaded.forEach((resource) => next.set(resource.id, resource));
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [
    activePage,
    catalog,
    dataClient,
    schoolIndex,
    schoolResources,
    resourceSchoolIds,
  ]);
  const resourcesLoading =
    (activePage === "resources" || activePage === "profile") &&
    resourceSchoolIds.some((schoolId) => !schoolResources.has(schoolId));
  const effectivePeerAnchorId =
    peerAnchorId && selectedSchoolIds.includes(peerAnchorId)
      ? peerAnchorId
      : selectedSchoolIds[0];
  const peerAnchor = effectivePeerAnchorId
    ? schoolIndex.get(effectivePeerAnchorId)
    : undefined;
  const similarMatches = useMemo(
    () =>
      catalog && peerAnchor
        ? findSimilarSchools(peerAnchor, catalog.schools, 12)
        : [],
    [catalog, peerAnchor],
  );
  const peerBaselineSummaries = useMemo(
    () => similarMatches.slice(0, 6).map(({ school }) => school),
    [similarMatches],
  );

  useEffect(() => {
    let active = true;
    if (!catalog || !peerAnchor || peerBaselineSummaries.length === 0) {
      return () => {
        active = false;
      };
    }
    void Promise.allSettled(
      peerBaselineSummaries.map((summary) =>
        dataClient.loadSchool(summary, catalog),
      ),
    ).then((results) => {
      if (!active) {
        return;
      }
      const loaded = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setLoadedPeerSet({
        anchorId: peerAnchor.id,
        details: new Map(loaded.map((school) => [school.id, school])),
      });
    });
    return () => {
      active = false;
    };
  }, [catalog, dataClient, peerAnchor, peerBaselineSummaries]);

  const peerDetails = useMemo(
    () =>
      loadedPeerSet.anchorId === effectivePeerAnchorId
        ? loadedPeerSet.details
        : new Map<string, SchoolDetail>(),
    [effectivePeerAnchorId, loadedPeerSet],
  );
  const peerLoading = Boolean(
    peerAnchor &&
      peerBaselineSummaries.length > 0 &&
      loadedPeerSet.anchorId !== effectivePeerAnchorId,
  );
  const peerMetricSeries = useMemo(
    () =>
      catalog && peerDetails.size > 0
        ? buildPeerMetricSeries([...peerDetails.values()], catalog.manifest)
        : undefined,
    [catalog, peerDetails],
  );
  const peerBaselineReady =
    !peerLoading &&
    peerBaselineSummaries.length > 0 &&
    peerDetails.size === peerBaselineSummaries.length;
  const contextSchools =
    activePage === "profile" && profileSchool
      ? [profileSchool]
      : selectedSchools;
  const commonDistrict = contextSchools[0]?.districtId;
  const commonCounty = contextSchools[0]?.countyCode;
  const hasCommonDistrict = Boolean(
    commonDistrict &&
      contextSchools.every((school) => school.districtId === commonDistrict),
  );
  const hasCommonCounty = Boolean(
    commonCounty &&
      contextSchools.every((school) => school.countyCode === commonCounty),
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

  useEffect(() => {
    let active = true;
    if (!catalog || !commonCounty) {
      return () => {
        active = false;
      };
    }
    void dataClient
      .loadReferences(commonCounty, catalog)
      .then((references) => {
        if (active) {
          setGeographicReferences(references);
        }
      })
      .catch(() => {
        if (active) {
          setGeographicReferences(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [catalog, commonCounty, dataClient]);

  if (error) {
    return (
      <div className="app">
        <Header activePage={activePage} onNavigate={navigate} />
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
        <Header activePage={activePage} onNavigate={navigate} />
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
  const effectiveReferenceMode =
    selectedSchools.length > 0 &&
    referenceMode === "district" &&
    !hasCommonDistrict
      ? hasCommonCounty
        ? "county"
        : "california"
      : selectedSchools.length > 0 &&
          referenceMode === "county" &&
          !hasCommonCounty
        ? "california"
        : referenceMode;
  const countyReference = geographicReferences?.county;
  const activeReference =
    effectiveReferenceMode === "county" && hasCommonCounty
      ? countyReference?.countyCode === commonCounty
        ? countyReference
        : undefined
      : effectiveReferenceMode === "california"
        ? geographicReferences?.state
        : undefined;
  const baselineSource =
    effectiveReferenceMode === "district" ? activeDistrict : activeReference;
  const baseline =
    effectiveReferenceMode === "peers"
      ? (peerMetricSeries?.[metric.id]?.[subgroup] ?? [])
      : (baselineSource?.metrics[metric.id]?.[subgroup] ?? []);
  const baselineLabel =
    effectiveReferenceMode === "peers"
      ? `Similar peers · ${peerDetails.size} schools`
      : effectiveReferenceMode === "county" && activeReference
        ? `${activeReference.name} County`
        : baselineSource?.name;
  const baselineDescription =
    effectiveReferenceMode === "peers"
      ? "Similar-context reference"
      : effectiveReferenceMode === "district"
        ? "Same-district context"
        : effectiveReferenceMode === "county"
          ? "Countywide context"
          : "Statewide context";
  const referenceDescription =
    effectiveReferenceMode === "peers"
      ? `Built from ${peerDetails.size} public schools matched to ${peerAnchor?.name ?? "the anchor school"} using institutional profile data. Outcomes are excluded from matching.`
      : effectiveReferenceMode === "district"
        ? "Available when all selected schools belong to the same district."
        : effectiveReferenceMode === "county"
          ? "Available when all selected schools belong to the same county."
          : "California provides a consistent statewide context across selections.";
  const referenceBasis =
    effectiveReferenceMode === "peers"
      ? ("derived-peer-weighted" as const)
      : activeReference?.basisByMetric[metric.id];
  const referenceOptions = [
    {
      value: "district" as const,
      label: activeDistrict
        ? `District · ${activeDistrict.name}`
        : "Same district",
      disabled: !hasCommonDistrict,
    },
    {
      value: "county" as const,
      label:
        hasCommonCounty && selectedSchools[0]
          ? `County · ${selectedSchools[0].county}`
          : "Same county",
      disabled: !hasCommonCounty,
    },
    {
      value: "peers" as const,
      label: peerBaselineReady
        ? `Similar peers · ${peerDetails.size} schools`
        : "Similar peers",
      disabled: !peerBaselineReady,
    },
    { value: "california" as const, label: "California" },
  ];

  const addSchool = async (schoolId: string) => {
    if (selectedSchoolIds.includes(schoolId) || selectedSchoolIds.length >= 5) {
      return;
    }
    const summary = schoolIndex.get(schoolId);
    if (!summary) {
      return;
    }
    try {
      const detail =
        schoolDetails.get(schoolId) ??
        (await dataClient.loadSchool(summary, catalog));
      setSchoolDetails((current) => new Map(current).set(detail.id, detail));
      setSelectedSchoolIds((current) =>
        current.includes(detail.id) || current.length >= 5
          ? current
          : [...current, detail.id],
      );
      setShareMessage(undefined);
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
      .getElementById(
        activePage === "profile" ? "profile-sources" : "source-details",
      )
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const shareComparison = async () => {
    const shareUrl = buildComparisonShareUrl(
      {
        schoolIds: selectedSchoolIds,
        metricId: metric.id,
        subgroup,
        startYear,
        referenceMode: effectiveReferenceMode,
        peerAnchorId: effectivePeerAnchorId,
        weights: indicatorWeights,
      },
      window.location.href,
    );
    window.history.replaceState({}, "", shareUrl);
    try {
      await Promise.race([
        navigator.clipboard.writeText(shareUrl),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("Clipboard request timed out.")),
            1_000,
          ),
        ),
      ]);
      setShareMessage("Share link copied");
    } catch {
      setShareMessage("Share link ready in the address bar");
    }
  };

  return (
    <div className="app" id="top">
      <Header
        activePage={activePage}
        onDataFreshness={
          activePage === "compare" || activePage === "profile"
            ? scrollToFreshness
            : undefined
        }
        onNavigate={navigate}
      />
      {activePage === "area" ? (
        <main className="area-page">
          <LocationFinder
            allSchools={catalog.schools}
            manifest={catalog.manifest}
            onAdd={addSchool}
            onCompare={() => navigate("compare")}
            selectedSchoolIds={selectedSchoolIds}
          />
        </main>
      ) : activePage === "resources" ? (
        <TeachingResources
          catalog={catalog}
          filterQuery={deferredQuery}
          onAdd={addSchool}
          onClear={() => {
            setSelectedSchoolIds([]);
            setShareMessage(undefined);
          }}
          onQueryChange={setQuery}
          onRemove={(schoolId) => {
            setSelectedSchoolIds((current) =>
              current.filter((id) => id !== schoolId),
            );
          }}
          query={query}
          resources={schoolResources}
          resourcesLoading={resourcesLoading}
          selectedSchools={selectedSchools}
        />
      ) : activePage === "profile" ? (
        <Suspense
          fallback={
            <main className="data-state" aria-live="polite">
              <h1>Loading school profile</h1>
              <p>
                Preparing official outcomes, context, and teaching resources.
              </p>
            </main>
          }
        >
          {profileSchool ? (
            <SchoolProfile
              catalog={catalog}
              comparisonIsFull={selectedSchoolIds.length >= 5}
              district={activeDistrict}
              isInComparison={selectedSchoolIds.includes(profileSchool.id)}
              onAddToComparison={() => addSchool(profileSchool.id)}
              onOpenComparison={() => navigate("compare")}
              onOpenProfile={navigateToProfile}
              onOpenResources={async () => {
                await addSchool(profileSchool.id);
                navigate("resources");
              }}
              resources={schoolResources.get(profileSchool.id)}
              resourcesLoading={resourcesLoading}
              school={profileSchool}
            />
          ) : profileError ? (
            <SchoolProfileNotFound
              catalog={catalog}
              onOpenComparison={() => navigate("compare")}
              onOpenProfile={navigateToProfile}
            />
          ) : (
            <main className="data-state" aria-live="polite">
              <h1>Loading school profile</h1>
              <p>
                Preparing official outcomes, context, and teaching resources.
              </p>
            </main>
          )}
        </Suspense>
      ) : (
        <main className="compare-page">
          <section className="intro">
            <h1>Compare schools across time and context</h1>
            <p>
              See subgroup outcomes, school context, and the limits behind every
              number.
            </p>
          </section>

          <div className="workspace">
            <aside className="left-rail">
              <SchoolPicker
                allSchools={catalog.schools}
                onAdd={addSchool}
                onClear={() => {
                  setSelectedSchoolIds([]);
                  setShareMessage(undefined);
                }}
                onQueryChange={setQuery}
                onRemove={(schoolId) => {
                  setSelectedSchoolIds((current) =>
                    current.filter((id) => id !== schoolId),
                  );
                  setShareMessage(undefined);
                }}
                filterQuery={deferredQuery}
                query={query}
                selectedSchools={selectedSchools}
              />
              <MetricNav
                metrics={catalog.manifest.metrics}
                onSelect={(selectedMetricId) => {
                  setMetricId(selectedMetricId);
                  setShareMessage(undefined);
                }}
                selectedMetricId={metric.id}
              />
            </aside>

            <ControlBar
              canShare={selectedSchoolIds.length > 0}
              generatedAt={catalog.manifest.generatedAt}
              onReferenceModeChange={(mode) => {
                setReferenceMode(mode);
                setShareMessage(undefined);
              }}
              onShare={() => void shareComparison()}
              onStartYearChange={(year) => {
                setStartYear(year);
                setShareMessage(undefined);
              }}
              onSubgroupChange={(selectedSubgroup) => {
                setSubgroup(selectedSubgroup);
                setShareMessage(undefined);
              }}
              release={catalog.manifest.release}
              referenceMode={effectiveReferenceMode}
              referenceOptions={referenceOptions}
              shareMessage={shareMessage}
              startYear={startYear}
              subgroup={subgroup}
              subgroups={catalog.manifest.subgroups}
              years={years}
            />

            <SchoolOverview
              onOpenProfile={navigateToProfile}
              profileSchoolYears={catalog.manifest.profileSchoolYears}
              schools={selectedSchools}
            />

            <SimilarContext
              anchorId={effectivePeerAnchorId}
              baselineCount={peerBaselineSummaries.length}
              baselineReady={peerBaselineReady}
              isBaselineActive={effectiveReferenceMode === "peers"}
              isLoading={peerLoading}
              matches={similarMatches.slice(0, 6)}
              onAdd={(schoolId) => void addSchool(schoolId)}
              onAnchorChange={(schoolId) => {
                setPeerAnchorId(schoolId);
                setShareMessage(undefined);
              }}
              onUseBaseline={() => {
                setReferenceMode("peers");
                setShareMessage(undefined);
              }}
              selectedSchools={selectedSchools}
            />

            <TrendChart
              baseline={baseline}
              baselineLabel={baselineLabel}
              endYear={endYear}
              metric={metric}
              schools={selectedSchools}
              startYear={startYear}
              subgroup={subgroup}
            />

            <DataCoverage
              endYear={endYear}
              metrics={catalog.manifest.metrics}
              schools={selectedSchools}
              subgroup={subgroup}
            />

            <IndicatorOverview
              endYear={endYear}
              metrics={catalog.manifest.metrics}
              onWeightsChange={(weights) => {
                setIndicatorWeights(weights);
                setShareMessage(undefined);
              }}
              schools={selectedSchools}
              subgroup={subgroup}
              weights={indicatorWeights}
            />

            <ComparisonTable
              baseline={baseline}
              baselineDescription={baselineDescription}
              baselineLabel={baselineLabel}
              endYear={endYear}
              metric={metric}
              schools={selectedSchools}
              startYear={startYear}
              subgroup={subgroup}
            />

            <div id="source-details">
              <ContextPanel
                metric={metric}
                referenceBasis={referenceBasis}
                referenceDescription={referenceDescription}
                referenceLabel={baselineLabel}
                referenceMode={effectiveReferenceMode}
              />
            </div>
          </div>
        </main>
      )}

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
