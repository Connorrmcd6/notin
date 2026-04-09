import { SignInButton } from "@/components/auth/sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">NotIn</h1>
          <p className="text-muted-foreground">Sign in to manage your leave</p>
        </div>
        <SignInButton />
        <p className="text-xs text-muted-foreground">
          Restricted to @thoughtlab.studio accounts
        </p>
      </div>
    </div>
  );
}
