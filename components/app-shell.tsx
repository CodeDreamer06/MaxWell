"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  ChatIcon,
  HomeIcon,
  HospitalIcon,
  IntakeIcon,
  ReferralIcon,
  SettingsIcon,
} from "@/components/ui-icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/intake", label: "Intake", icon: IntakeIcon },
  { href: "/chat", label: "Chat", icon: ChatIcon },
  { href: "/hospitals", label: "Hospitals", icon: HospitalIcon },
  { href: "/referrals", label: "Referrals", icon: ReferralIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "micro-lift flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition soft-focus-ring",
        active
          ? "border-cyan-200/55 bg-cyan-200/95 text-slate-950 shadow-[0_6px_18px_rgba(109,207,251,0.3)]"
          : "border-transparent text-cyan-50/90 hover:border-cyan-100/25 hover:bg-white/10",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 lg:px-8">
        <header className="sticky top-3 z-30 mt-3 rounded-2xl border border-cyan-100/18 bg-slate-950/58 px-3 py-3 backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/intake"
              className="micro-lift flex items-center gap-2 rounded-full border border-cyan-200/20 bg-slate-900/65 px-3 py-1.5 soft-focus-ring"
            >
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="text-xs tracking-[0.17em] uppercase sm:text-sm">
                MaxWell
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <nav className="mx-auto flex max-w-full items-center justify-center gap-1 overflow-x-auto rounded-full border border-cyan-200/16 bg-slate-900/55 p-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isActive}
                    />
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="micro-lift inline-flex items-center gap-1 rounded-full border border-cyan-200/20 px-3 py-1.5 text-xs text-cyan-100/90 soft-focus-ring hover:border-cyan-100/45"
              >
                <HomeIcon className="h-3.5 w-3.5" />
                Home
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="mt-6 fade-up">{children}</main>
      </div>
    </div>
  );
}
