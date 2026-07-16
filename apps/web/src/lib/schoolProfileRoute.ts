export interface AppRoute {
  page: "area" | "compare" | "profile" | "resources";
  profileSchoolId?: string;
}

const PROFILE_PATH = /^\/school\/(\d{14})\/?$/;

export function routeFromPath(pathname: string): AppRoute {
  if (pathname === "/area") {
    return { page: "area" };
  }
  if (pathname === "/resources") {
    return { page: "resources" };
  }
  const profileMatch = PROFILE_PATH.exec(pathname);
  if (profileMatch?.[1]) {
    return { page: "profile", profileSchoolId: profileMatch[1] };
  }
  return { page: "compare" };
}

export function schoolProfilePath(schoolId: string) {
  if (!/^\d{14}$/.test(schoolId)) {
    throw new Error("A school profile requires a 14-digit CDS code.");
  }
  return `/school/${schoolId}`;
}
