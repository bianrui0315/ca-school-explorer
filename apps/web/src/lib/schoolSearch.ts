import type { SchoolSummary } from "../types";

export interface SchoolSearchFilters {
  county: string;
  city: string;
  grade: string;
}

export interface GradeOption {
  value: string;
  label: string;
}

const gradeOrder = [
  "PK",
  "TK",
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "AD",
] as const;

const gradeLabels: Record<string, string> = {
  PK: "Preschool",
  TK: "Transitional kindergarten",
  K: "Kindergarten",
  AD: "Adult education",
};

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeGrade(value: string) {
  const normalized = value.trim().toUpperCase();
  if (["P", "PS", "PREK", "PRE-K"].includes(normalized)) {
    return "PK";
  }
  if (["A", "ADULT"].includes(normalized)) {
    return "AD";
  }
  return normalized;
}

export function gradesServed(gradeSpan: string) {
  const normalizedSpan = gradeSpan
    .replace(/Pre-K/gi, "PK")
    .replace(/Transitional Kindergarten/gi, "TK")
    .replace(/Adult/gi, "AD");
  const [rawLow, rawHigh] = normalizedSpan.split(/\s*[–—-]\s*/, 2);
  const low = normalizeGrade(rawLow ?? "");
  const high = normalizeGrade(rawHigh ?? rawLow ?? "");
  const lowIndex = gradeOrder.indexOf(low as (typeof gradeOrder)[number]);
  const highIndex = gradeOrder.indexOf(high as (typeof gradeOrder)[number]);

  if (lowIndex === -1 || highIndex === -1) {
    return low && low === high ? [low] : [];
  }
  const start = Math.min(lowIndex, highIndex);
  const end = Math.max(lowIndex, highIndex);
  return gradeOrder.slice(start, end + 1);
}

export function gradeOptionsForSchools(
  schools: SchoolSummary[],
): GradeOption[] {
  const available = new Set(
    schools.flatMap((school) => gradesServed(school.gradeSpan)),
  );
  return gradeOrder.flatMap((grade) =>
    available.has(grade)
      ? [
          {
            value: grade,
            label: gradeLabels[grade] ?? `Grade ${grade}`,
          },
        ]
      : [],
  );
}

function matchesFilters(school: SchoolSummary, filters: SchoolSearchFilters) {
  return (
    (!filters.county || school.county === filters.county) &&
    (!filters.city || school.city === filters.city) &&
    (!filters.grade || gradesServed(school.gradeSpan).includes(filters.grade))
  );
}

function queryScore(school: SchoolSummary, rawQuery: string) {
  const query = normalizeText(rawQuery);
  if (!query) {
    return 0;
  }

  const name = normalizeText(school.name);
  const district = normalizeText(school.district);
  const street = normalizeText(school.address.street);
  const city = normalizeText(school.city);
  const county = normalizeText(school.county);
  const zip = normalizeText(school.address.zip);
  const id = normalizeText(school.id);
  const combined = [
    name,
    district,
    street,
    city,
    county,
    zip,
    id,
    normalizeText(school.gradeSpan),
    normalizeText(school.schoolType),
  ].join(" ");
  const tokens = query.split(" ");

  if (!tokens.every((token) => combined.includes(token))) {
    return undefined;
  }
  if (id === query || zip === query) {
    return 140;
  }
  if (name === query) {
    return 130;
  }
  if (name.startsWith(query)) {
    return 120;
  }
  if (district.startsWith(query)) {
    return 100;
  }
  if (street.startsWith(query)) {
    return 90;
  }
  if (city === query || county === query) {
    return 80;
  }
  if (name.includes(query)) {
    return 70;
  }
  if (district.includes(query)) {
    return 60;
  }
  if (`${street} ${city} ${zip}`.includes(query)) {
    return 50;
  }
  return 20;
}

export function searchSchools(
  schools: SchoolSummary[],
  query: string,
  filters: SchoolSearchFilters,
) {
  return schools
    .flatMap((school) => {
      if (!matchesFilters(school, filters)) {
        return [];
      }
      const score = queryScore(school, query);
      return score === undefined ? [] : [{ school, score }];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.school.name.localeCompare(right.school.name),
    )
    .map(({ school }) => school);
}
