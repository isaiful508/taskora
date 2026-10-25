"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { dashboardPathFor, useAuth } from "@/lib/auth-provider";

const NAV_LINKS = {
  STUDENT: [{ href: "/dashboard/student", label: "My Projects" }],
  MENTOR: [{ href: "/dashboard/mentor", label: "Review Queue" }],
} as const;

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const links = NAV_LINKS[user.role];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 shadow-sm shadow-foreground/[0.02] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={dashboardPathFor(user.role)}
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20">
            PR
          </span>
          <span className="hidden sm:inline">Project Review</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={dashboardPathFor(user.role)}>
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserRound className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t bg-background px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
