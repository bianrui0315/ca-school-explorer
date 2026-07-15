import type { School } from "../types";

export function studentsPerReportedTeacher(school: School) {
  const { enrollment } = school;
  const teachers = school.staff.teachers;
  if (enrollment === null || teachers === null || teachers <= 0) {
    return undefined;
  }
  return enrollment / teachers;
}

export function directoryFlags(school: School) {
  return [
    school.charter ? "Charter" : undefined,
    school.magnet ? "Magnet" : undefined,
    school.titleI ? "Title I" : undefined,
    school.dass ? "DASS" : undefined,
  ].filter((flag): flag is string => flag !== undefined);
}
