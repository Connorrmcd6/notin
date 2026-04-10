import { SignInButton } from "@/components/auth/sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="size-6" />
          </div>
          <CardTitle className="text-2xl">NotIn</CardTitle>
          <CardDescription>Sign in to manage your leave</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInButton />
          <p className="text-center text-xs text-muted-foreground">
            Restricted to @thoughtlab.studio accounts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
