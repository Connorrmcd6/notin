import { SignInButton } from "@/components/auth/sign-in-button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-xs">
        <CardHeader className="items-center justify-items-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NotIn" className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">
            Leave management
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <SignInButton />
          <p className="text-center text-xs text-muted-foreground">
            Restricted to @thoughtlab.studio accounts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
