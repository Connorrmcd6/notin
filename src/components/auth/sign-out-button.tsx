"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/sign-in" })}
      variant="ghost"
      size="sm"
    >
      Sign out
    </Button>
  );
}
