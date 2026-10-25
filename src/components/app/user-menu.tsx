"use client";

import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { signOutAction } from "@/app/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserMenu({
  fullName,
  email,
  roleLabel,
  canSignOut = true,
}: {
  fullName: string;
  email: string;
  roleLabel: string;
  /** False in development auto sign-in, where signing out would sign straight back in. */
  canSignOut?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={`Account menu for ${fullName}`}>
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials(fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium md:inline">{fullName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{fullName}</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
          <div className="text-xs text-muted-foreground">{roleLabel}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/password">
            <KeyRound aria-hidden /> Change password
          </Link>
        </DropdownMenuItem>
        {canSignOut ? (
          <DropdownMenuItem disabled={pending} onSelect={() => startTransition(() => signOutAction())}>
            <LogOut aria-hidden /> {pending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
