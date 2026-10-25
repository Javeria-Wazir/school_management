import { PageHeader } from "@/components/app/page";
import { requireAdmin } from "@/server/auth/current";
import { getSchoolSettings } from "@/server/services/settings";
import { LogoForm, SettingsForm } from "./settings-client";

export const metadata = { title: "School settings" };

export default async function SettingsPage() {
  const ctx = await requireAdmin();
  const settings = await getSchoolSettings(ctx.db);
  return (
    <>
      <PageHeader title="School settings" description="School information for report cards, and how marks and results are handled." />
      <LogoForm hasLogo={settings.hasLogo} />
      <SettingsForm settings={settings} />
    </>
  );
}
