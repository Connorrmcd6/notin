"use client";

import { signOut } from "next-auth/react";
import { LogOut, Shield, UserRound } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/generated/prisma/client";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const isAdmin = user.role === "ADMIN";
  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Popover>
      <PopoverTrigger className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium transition-colors hover:bg-muted/80">
        {initials}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="px-3 py-3">
          <p className="text-sm font-medium leading-none">
            {user.name ?? "User"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {isAdmin ? (
              <Shield className="size-3" />
            ) : (
              <UserRound className="size-3" />
            )}
            {isAdmin ? "Admin" : "Employee"}
          </div>
        </div>
        <Separator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm font-normal"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
