import type { SchoolSummary } from "../types";

const EARTH_RADIUS_MILES = 3958.8;

export interface NearbySchoolResult {
  school: SchoolSummary;
  distanceMiles: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceFromCoordinates(
  first: LocationPoint,
  second: LocationPoint,
) {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_MILES *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function distanceBetweenSchools(
  first: SchoolSummary,
  second: SchoolSummary,
) {
  if (
    first.latitude === null ||
    first.longitude === null ||
    second.latitude === null ||
    second.longitude === null
  ) {
    return undefined;
  }

  return distanceFromCoordinates(
    { latitude: first.latitude, longitude: first.longitude },
    { latitude: second.latitude, longitude: second.longitude },
  );
}

export function distanceFromLocation(
  center: LocationPoint,
  school: SchoolSummary,
) {
  if (school.latitude === null || school.longitude === null) {
    return undefined;
  }
  return distanceFromCoordinates(center, {
    latitude: school.latitude,
    longitude: school.longitude,
  });
}

export function schoolsWithinDistance(
  schools: SchoolSummary[],
  center: SchoolSummary,
  maximumMiles: number,
) {
  return schools
    .flatMap((school) => {
      if (school.id === center.id) {
        return [];
      }
      const distanceMiles = distanceBetweenSchools(center, school);
      return distanceMiles === undefined || distanceMiles > maximumMiles
        ? []
        : [{ school, distanceMiles }];
    })
    .sort(
      (left, right) =>
        left.distanceMiles - right.distanceMiles ||
        left.school.name.localeCompare(right.school.name),
    );
}
