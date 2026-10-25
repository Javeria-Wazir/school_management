/** Navigation entries per capability. Only pages that exist are listed; the server re-checks access on every page. */
export type NavIcon = "dashboard" | "staff" | "calendar" | "settings" | "password";

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
}

export function navigationFor(caps: NavCapabilities): NavGroup[] {
  const groups: NavGroup[] = [{ label: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }] }];
  if (caps.isAdmin) {
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
