"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlaneTakeoff,
  Clock,
  ShieldCheck,
  Users,
  CalendarDays,
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
];

const adminNav = [
  { label: "Approvals", href: "/admin", icon: ShieldCheck },
  { label: "Manage Users", href: "/admin/users", icon: Users },
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
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="size-4" />
          </div>
          <span className="text-lg font-semibold">NotIn</span>
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
          Leave Management
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
