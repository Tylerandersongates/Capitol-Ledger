"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Crown, LayoutDashboard, Map, Search, UserRound } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/map", label: "Map", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/upgrade", label: "Pro", icon: Crown },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const [pathnameReady, setPathnameReady] = useState(false);

  useEffect(() => {
    setPathnameReady(true);
  }, []);

  if (
    !pathnameReady ||
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/alerts") ||
    pathname === "/badges" ||
    pathname === "/impact" ||
    pathname === "/map" ||
    pathname === "/upgrade" ||
    pathname === "/search" ||
    pathname === "/account" ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/beta" ||
    pathname.startsWith("/feedback") ||
    pathname === "/onboarding" ||
    pathname === "/sign-in" ||
    pathname.startsWith("/members/") ||
    pathname.startsWith("/bills/")
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brass/20 bg-vault/80 text-mist backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-normal">
          <Image
            src="/capitol-ledger-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-md border border-brass/40 bg-ink object-cover shadow-glow"
          />
          <BrandWordmark className="hidden text-sm font-semibold uppercase tracking-normal sm:inline-flex sm:text-base" />
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-transparent px-3 text-sm font-medium text-blue-100 hover:border-brass/20 hover:bg-white/10"
              >
                <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
