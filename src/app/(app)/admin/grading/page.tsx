import { PageHeader } from "@/components/app/page";
import { requireAdmin } from "@/server/auth/current";
import { listGradingScales } from "@/server/services/grading";
import { getSchoolSettings } from "@/server/services/settings";
import { GradingScaleDialog, ScaleCard } from "./grading-client";

export const metadata = { title: "Grading scales" };

export default async function GradingPage() {
  const ctx = await requireAdmin();
  const [scales, settings] = await Promise.all([listGradingScales(ctx.db), getSchoolSettings(ctx.db)]);
  return (
    <>
      <PageHeader
        title="Grading scales"
        description={`Pass marks and grade bands. Percentages are rounded half-up to ${settings.decimalPlaces} decimal place${settings.decimalPlaces === 1 ? "" : "s"} before grading (School settings). A scale used by an approved result is locked.`}
        actions={<GradingScaleDialog />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {scales.map((scale) => (
          <ScaleCard key={scale.id} scale={scale} />
        ))}
      </div>
    </>
  );
}
