"use client";

import {
  Award,
  BookOpen,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  School,
  Settings,
  UserCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavGroup, NavIcon } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  staff: Users,
  calendar: CalendarRange,
  settings: Settings,
  password: KeyRound,
  classes: School,
  subjects: BookOpen,
  students: UsersRound,
  assignments: UserCheck,
  terms: ClipboardList,
  grading: Award,
};

export function AppSidebar({ groups, schoolName, roleLabel }: { groups: NavGroup[]; schoolName: string; roleLabel: string }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={schoolName}>
              <Link href="/dashboard" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" aria-hidden />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{schoolName}</span>
                  <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                          <Icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">School Result Management</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
