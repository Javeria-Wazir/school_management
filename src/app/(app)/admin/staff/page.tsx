import { PageHeader } from "@/components/app/page";
import { requireAdmin } from "@/server/auth/current";
import { listStaff } from "@/server/services/staff";
import { CreateStaffDialog, StaffTable } from "./staff-client";

export const metadata = { title: "Staff accounts" };

export default async function StaffPage() {
  const ctx = await requireAdmin();
  const staff = await listStaff(ctx);
  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Create accounts for teachers and administrators. Accounts are deactivated, never deleted, so the records they made stay traceable."
        actions={<CreateStaffDialog />}
      />
      <StaffTable staff={staff} currentUserId={ctx.user.id} />
    </>
  );
}
