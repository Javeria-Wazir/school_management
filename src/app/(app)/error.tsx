"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when a page fails to load. Details stay in the server log; `digest` lets an admin find them. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <h2 className="text-lg font-semibold">This page could not be loaded</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Please try again. If the problem continues, tell the administrator
        {error.digest ? (
          <>
            {" "}
            and quote reference <code className="font-mono">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
