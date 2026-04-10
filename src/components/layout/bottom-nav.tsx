"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlaneTakeoff,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/client";

interface BottomNavProps {
  user: {
    role: Role;
  };
}

const employeeItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Request", href: "/dashboard/request", icon: PlaneTakeoff },
  { label: "History", href: "/dashboard/history", icon: Clock },
];

const adminItems = [
  { label: "Approvals", href: "/admin", icon: ShieldCheck },
  { label: "Users", href: "/admin/users", icon: Users },
];

export function BottomNav({ user }: BottomNavProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const items = isAdmin ? [...employeeItems, ...adminItems] : employeeItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
