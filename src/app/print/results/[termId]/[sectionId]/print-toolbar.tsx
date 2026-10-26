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
  backHref,
  empty,
}: {
  title: string;
  subtitle: string;
  official: boolean;
  blackAndWhite: boolean;
  backHref: string;
  empty: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
            onCheckedChange={(on) => {
              const params = new URLSearchParams(searchParams.toString());
              if (on) params.set("bw", "1");
              else params.delete("bw");
              router.replace(`${pathname}?${params.toString()}`);
            }}
          />
          <Label htmlFor="bw-preview" className="text-xs">
            Black &amp; white preview
          </Label>
        </div>
        <Button size="sm" disabled={empty} onClick={() => window.print()}>
          <Printer aria-hidden /> Print
        </Button>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-2 text-xs text-muted-foreground">
        In the print dialog choose paper size A4, margins &quot;None&quot; and turn on &quot;Background graphics&quot;. Save as PDF to share.
      </p>
    </header>
  );
}
