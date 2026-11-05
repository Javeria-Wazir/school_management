import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/server/auth/current";
import { AUDIT_AREAS, listAuditLog } from "@/server/services/audit";

export const metadata = { title: "Audit log" };

const when = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: process.env.SCHOOL_TIME_ZONE || "Asia/Karachi" });

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const ctx = await requireAdmin();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters = { area: one(params.area), actor: one(params.actor), page: one(params.page) ?? "1" };
  const { entries, page, hasMore, actors } = await listAuditLog(ctx, filters);
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (filters.area) q.set("area", filters.area);
    if (filters.actor) q.set("actor", filters.actor);
    q.set("page", String(p));
    return `/admin/audit-log?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title="Audit log" description="Every change to marks, results, students, staff and settings: who made it, when, and the reason given. Entries cannot be edited or deleted." />
      <div className="flex flex-wrap gap-3">
        <UrlSelect param="area" label="Area" value={filters.area} allLabel="All areas" resets={["page"]} options={Object.entries(AUDIT_AREAS).map(([value, label]) => ({ value, label }))} className="w-56" />
        <UrlSelect param="actor" label="Changed by" value={filters.actor} allLabel="Everyone" resets={["page"]} options={actors.map((a) => ({ value: a.id, label: a.name }))} className="w-56" />
      </div>
      {entries.length === 0 ? (
        <EmptyState title="No changes found">Try another area or person.</EmptyState>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">When</TableHead>
                    <TableHead className="w-36">By</TableHead>
                    <TableHead>What</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="align-top">
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">{when(e.occurredAt)}</TableCell>
                      <TableCell className="text-sm">{e.actorName}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">
                          {e.action} · {e.area}
                        </span>
                        {e.subject ? <span className="block text-xs text-muted-foreground">{e.subject}</span> : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.changes.length ? (
                          <ul className="space-y-0.5">
                            {e.changes.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-64 text-xs">{e.reason ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-2 text-sm">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page - 1)}>Newer</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">Page {page}</span>
              {hasMore ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page + 1)}>Older</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          </CardContent>
        </Card>
      )}
    </>
  );
}
