"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlaneTakeoff,
  Clock,
  ShieldCheck,
  Users,
  CalendarRange,
  CalendarCheck,
  Settings,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import type { Role } from "@/generated/prisma/client";

interface AppSidebarProps {
  user: {
    role: Role;
    name?: string | null;
  };
}

const employeeNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Request Leave", href: "/dashboard/request", icon: PlaneTakeoff },
  { label: "History", href: "/dashboard/history", icon: Clock },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Settings", href: "/settings", icon: Settings },
];

const adminNav = [
  { label: "Approvals", href: "/admin", icon: ShieldCheck },
  { label: "Manage Users", href: "/admin/users", icon: Users },
  { label: "Holidays", href: "/admin/holidays", icon: CalendarCheck },
];

function NavItems({
  items,
  pathname,
}: {
  items: typeof employeeNav;
  pathname: string;
}) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton isActive={pathname === item.href}>
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NotIn" className="h-7 w-auto" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Leave</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItems items={employeeNav} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItems items={adminNav} pathname={pathname} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground">
          (Not affiliated with LinkedIn)
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
