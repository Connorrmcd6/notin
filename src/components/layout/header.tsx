import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import type { Role } from "@/generated/prisma/client";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-end gap-1">
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
