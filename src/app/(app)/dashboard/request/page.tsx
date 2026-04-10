import { RequestForm } from "@/components/leave/request-form";

export default function RequestLeavePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Request Leave</h1>
        <p className="text-muted-foreground">
          Submit a new leave request for approval
        </p>
      </div>
      <RequestForm />
    </div>
  );
}
