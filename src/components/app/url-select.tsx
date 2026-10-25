"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/**
 * A filter stored in the URL (?param=value), so pages stay shareable and the server reads the filter.
 * Changing it clears the filters listed in `resets` (e.g. a new class clears the section).
 */
export function UrlSelect({
  param,
  label,
  value,
  options,
  allLabel,
  resets = [],
  className,
}: {
  param: string;
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  /** When given, an "all" option that removes the filter. */
  allLabel?: string;
  resets?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = `filter-${param}`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value ?? (allLabel ? ALL : undefined)}
        onValueChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          if (next === ALL) params.delete(param);
          else params.set(param, next);
          for (const r of resets) params.delete(r);
          startTransition(() => router.push(`${pathname}?${params.toString()}`));
        }}
      >
        <SelectTrigger id={id} className="w-full min-w-40" aria-busy={pending}>
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {allLabel ? <SelectItem value={ALL}>{allLabel}</SelectItem> : null}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
