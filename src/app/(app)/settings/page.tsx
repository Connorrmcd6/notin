import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>
      <DeleteAccountCard userEmail={session.user.email!} />
    </div>
  );
}
