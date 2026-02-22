"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/intake", label: "Intake" },
  { href: "/chat", label: "Chat" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/referrals", label: "Referrals" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-10 lg:px-8">
        <header className="sticky top-3 z-30 mt-3 flex items-center justify-between rounded-2xl border border-cyan-100/20 bg-slate-950/65 px-4 py-3 backdrop-blur">
          <Link href="/intake" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            <span className="text-sm tracking-[0.17em] uppercase">MaxWell</span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-cyan-200/20 bg-slate-900/60 p-1 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition",
                    isActive
                      ? "bg-cyan-300 text-slate-950"
                      : "text-cyan-50/90 hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-cyan-200/25 px-3 py-1.5 text-xs hover:border-cyan-100/50"
            >
              Home
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
