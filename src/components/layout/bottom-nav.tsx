"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  PlaneTakeoff,
  CalendarRange,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const items = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Request", href: "/dashboard/request", icon: PlaneTakeoff },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
];

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
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
        <button
          onClick={toggleSidebar}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <Menu className="size-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
