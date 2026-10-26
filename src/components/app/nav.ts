/** Navigation entries per capability. Only pages that exist are listed; the server re-checks access on every page. */
export type NavIcon =
  | "dashboard"
  | "staff"
  | "calendar"
  | "settings"
  | "password"
  | "classes"
  | "subjects"
  | "students"
  | "assignments"
  | "terms"
  | "grading"
  | "marks"
  | "results";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavCapabilities {
  isAdmin: boolean;
  isClassTeacher: boolean;
}

export function navigationFor(caps: NavCapabilities): NavGroup[] {
  const groups: NavGroup[] = [{ label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }] }];
  const results: NavItem[] = [{ href: "/marks", label: "Marks entry", icon: "marks" }];
  if (caps.isAdmin || caps.isClassTeacher) results.push({ href: "/results", label: "Class results", icon: "results" });
  groups.push({ label: "Results", items: results });
  if (caps.isAdmin) {
    groups.push({
      label: "Academic setup",
      items: [
        { href: "/admin/classes", label: "Classes & sections", icon: "classes" },
        { href: "/admin/subjects", label: "Subjects", icon: "subjects" },
        { href: "/admin/students", label: "Students", icon: "students" },
        { href: "/admin/assignments", label: "Teacher assignments", icon: "assignments" },
        { href: "/admin/exam-terms", label: "Exam terms & marks", icon: "terms" },
        { href: "/admin/grading", label: "Grading scales", icon: "grading" },
      ],
    });
    groups.push({
      label: "Administration",
      items: [
        { href: "/admin/staff", label: "Staff accounts", icon: "staff" },
        { href: "/admin/academic-years", label: "Academic years", icon: "calendar" },
        { href: "/admin/settings", label: "School settings", icon: "settings" },
      ],
    });
  }
  return groups;
}
