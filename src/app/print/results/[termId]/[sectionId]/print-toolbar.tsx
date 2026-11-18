"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PrintToolbar({
  title,
  subtitle,
  official,
  blackAndWhite,
  twoUp,
  backHref,
  empty,
}: {
  title: string;
  subtitle: string;
  official: boolean;
  blackAndWhite: boolean;
  /** Two cards per A4 sheet (A5 each) instead of one full-page card. */
  twoUp: boolean;
  backHref: string;
  empty: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setParam = (name: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(name);
    else params.set(name, value);
    router.replace(`${pathname}?${params.toString()}`);
  };
  return (
    <header className="no-print sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>
            <ArrowLeft aria-hidden /> Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {official ? (
          <Badge variant="outline" className="border-emerald-500/60 text-emerald-700">
            Official
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-500/60 text-amber-700" title="Cards carry a PROVISIONAL mark until the result has final approval">
            Provisional
          </Badge>
        )}
        <div className="flex items-center gap-2">
          <Switch
            id="bw-preview"
            checked={blackAndWhite}
            onCheckedChange={(on) => setParam("bw", on ? "1" : null)}
          />
          <Label htmlFor="bw-preview" className="text-xs">
            Black &amp; white preview
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="two-up" checked={twoUp} onCheckedChange={(on) => setParam("size", on ? null : "a4")} />
          <Label htmlFor="two-up" className="text-xs">
            Two compact cards per A4 page
          </Label>
        </div>
        <Button size="sm" disabled={empty} onClick={() => window.print()}>
          <Printer aria-hidden /> Print
        </Button>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-2 text-xs text-muted-foreground">
        {twoUp
          ? "Two cards per sheet: in the print dialog choose paper size A4, Landscape, margins \"None\" and turn on \"Background graphics\". Cut along the dashed line. Save as PDF to share."
          : "In the print dialog choose paper size A4, margins \"None\" and turn on \"Background graphics\". Save as PDF to share."}
      </p>
    </header>
  );
}
