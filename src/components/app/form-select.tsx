"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

/**
 * A select for forms that can also be left empty ("— None —"). The chosen value is submitted through
 * a hidden input, empty when nothing is chosen.
 */
export function FormSelect({
  id,
  name,
  options,
  defaultValue,
  noneLabel,
  placeholder,
  invalid,
  onValueChange,
}: {
  id: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  /** Shown when the field may be left empty. */
  noneLabel?: string;
  placeholder?: string;
  invalid?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <>
      <Select
        value={value || (noneLabel ? NONE : undefined)}
        onValueChange={(next) => {
          const v = next === NONE ? "" : next;
          setValue(v);
          onValueChange?.(v);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
          <SelectValue placeholder={placeholder ?? "Choose…"} />
        </SelectTrigger>
        <SelectContent>
          {noneLabel ? <SelectItem value={NONE}>{noneLabel}</SelectItem> : null}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </>
  );
}
