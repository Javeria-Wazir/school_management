import { PageHeader } from "@/components/app/page";
import { requireAdmin } from "@/server/auth/current";
import { sectionsWithClassTeachers } from "@/server/services/my-class";
import { listStaff } from "@/server/services/staff";
import { CreateStaffDialog, StaffTable } from "./staff-client";

export const metadata = { title: "Staff accounts" };

export default async function StaffPage() {
  const ctx = await requireAdmin();
  const [staff, sections] = await Promise.all([listStaff(ctx), sectionsWithClassTeachers(ctx.db)]);
  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Create accounts for teachers and administrators, and choose each teacher's class. Accounts are deactivated, never deleted, so the records they made stay traceable."
        actions={<CreateStaffDialog sections={sections} />}
      />
      <StaffTable staff={staff} sections={sections} currentUserId={ctx.user.id} />
    </>
  );
}
