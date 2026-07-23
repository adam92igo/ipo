"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import {
  filterNavByPersona,
  getDashboardNav,
  isDashboardNavActive,
} from "@/lib/navigation";
import { PERSONA_LABELS, PERSONAS } from "@/lib/dashboard-persona";
import { usePersona } from "./persona-context";

interface AppHeaderProps {
  company: { id: string; name: string; country: string } | null;
  organizationName: string;
  role: string;
  userName: string;
  userEmail: string;
}

export function AppHeader({
  company,
  organizationName,
  role,
  userName,
  userEmail,
}: AppHeaderProps) {
  const pathname = usePathname();
  const companyId = company?.id ?? null;
  const [persona, setPersona] = usePersona();
  const navigation = filterNavByPersona(getDashboardNav(companyId), persona);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card text-primary shadow-sm">
      <div className="flex min-h-18 items-stretch px-3 sm:px-4 lg:px-6">
        <div className="flex shrink-0 items-center gap-3 py-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-primary hover:bg-muted hover:text-primary focus-visible:border-primary lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="border-primary/80 bg-primary text-primary-foreground"
            >
              <SheetHeader className="border-b border-white/10 px-6 py-6 text-left">
                <SheetTitle className="font-heading text-2xl font-extrabold uppercase tracking-wide text-primary-foreground">
                  IPO Compass
                </SheetTitle>
                <SheetDescription className="font-utility text-[0.6875rem] uppercase tracking-[0.16em] text-primary-foreground/60">
                  IPO readiness command
                </SheetDescription>
              </SheetHeader>
              <div className="border-b border-white/10 px-6 py-4">
                <Select value={persona} onValueChange={(value) => setPersona(value as typeof persona)}>
                  <SelectTrigger size="sm" aria-label="Dashboard view" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONAS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {PERSONA_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <nav aria-label="Mobile navigation" className="flex flex-col px-3 py-2">
                {navigation.map((item) => {
                  const active = isDashboardNavActive(pathname, item.label, companyId);
                  return (
                    <SheetClose asChild key={item.label}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "border-l-4 border-transparent px-4 py-4 font-heading text-lg font-bold uppercase tracking-wide text-primary-foreground/75 transition-colors hover:bg-white/5 hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground",
                          active && "border-accent bg-white/5 text-primary-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/dashboard"
            aria-label="IPO Compass home"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <BrandMark decorative priority className="w-8 sm:w-9" />
            <span className="hidden sm:block">
              <span className="block font-heading text-lg font-extrabold uppercase leading-none tracking-wide">
                IPO Compass
              </span>
              <span className="mt-1 block font-utility text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground">
                IPO readiness command
              </span>
            </span>
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="ml-6 hidden min-w-0 flex-1 items-stretch justify-center lg:flex"
        >
          {navigation.map((item) => {
            const active = isDashboardNavActive(pathname, item.label, companyId);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 items-center gap-2 border-b-4 border-transparent px-3 pt-1 font-heading text-sm font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary xl:px-4 xl:text-base",
                  active && "border-accent text-primary",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden font-utility text-[0.625rem] tracking-normal 2xl:inline",
                    active ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {item.index}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 py-2 lg:ml-5">
          <Select value={persona} onValueChange={(value) => setPersona(value as typeof persona)}>
            <SelectTrigger size="sm" aria-label="Dashboard view" className="hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERSONAS.map((option) => (
                <SelectItem key={option} value={option}>
                  {PERSONA_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden max-w-40 border-l border-border pl-3 text-right xl:block">
            <p className="truncate text-sm font-semibold">{company?.name ?? "Company setup"}</p>
            <p className="truncate font-utility text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
              {company?.country ?? "France"} · {organizationName}
            </p>
          </div>
          <span
            aria-label={`Organization role: ${role}`}
            className="hidden rounded-sm border border-border px-2 py-1 font-utility text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground 2xl:inline"
          >
            {role}
          </span>
          <UserMenu userName={userName} userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
}
