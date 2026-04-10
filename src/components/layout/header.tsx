import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Role } from "@/generated/prisma/client";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export function Header({ user }: HeaderProps) {
  const isAdmin = user.role === "ADMIN";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">
            {user.name ?? user.email}
          </p>
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className="mt-1 text-xs"
          >
            {isAdmin ? "Admin" : "Employee"}
          </Badge>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
