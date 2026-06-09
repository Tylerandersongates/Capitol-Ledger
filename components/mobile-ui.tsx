import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { MobileAlertsBadge } from "@/components/mobile-alerts-badge";

type MobileCardVariant = "default" | "rust" | "dashboard" | "compact";

export const mobileViewAllClass =
  "rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-5 py-2 text-[16px] font-medium leading-none text-[#ffb62e] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_24px_rgba(1,8,24,0.42)] backdrop-blur-xl transition hover:brightness-110";

export const mobileIconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_24px_rgba(1,8,24,0.42)] backdrop-blur-xl transition hover:brightness-110";

const cardVariants: Record<MobileCardVariant, string> = {
  default:
    "rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.5)_0%,rgba(3,17,40,0.8)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_0_30px_rgba(43,141,255,0.07),0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl",
  rust:
    "rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.5)_0%,rgba(3,17,40,0.8)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_0_30px_rgba(43,141,255,0.07),0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl",
  dashboard:
    "rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.5)_0%,rgba(3,17,40,0.8)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_0_30px_rgba(43,141,255,0.07),0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl",
  compact:
    "rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.46)_0%,rgba(3,17,40,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_20px_rgba(43,141,255,0.06),0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl"
};

export function MobileCard({
  children,
  className,
  variant = "default"
}: {
  children: ReactNode;
  className?: string;
  variant?: MobileCardVariant;
}) {
  return <article className={`${cardVariants[variant]} ${className ?? ""}`}>{children}</article>;
}

export type MobileBottomNavItem = {
  active?: boolean;
  badge?: string;
  highlighted?: boolean;
  href: string;
  icon: ReactElement;
  label: string;
};

export function MobileBottomNav({
  className = "sticky bottom-0 -mx-8 mt-auto border-t border-white/12 bg-[linear-gradient(180deg,rgba(5,20,45,0.9)_0%,rgba(3,14,32,0.96)_100%)] px-8 pb-3 pt-4 backdrop-blur-xl shadow-[0_-12px_26px_rgba(1,8,24,0.38)]",
  indicatorClassName = "mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/82",
  items
}: {
  className?: string;
  indicatorClassName?: string;
  items: MobileBottomNavItem[];
}) {
  return (
    <nav className={className}>
      <div className="grid grid-cols-5 text-center text-[13px]">
        {items.map((item) => (
          <MobileBottomNavLink key={`${item.href}-${item.label}`} {...item} />
        ))}
      </div>
      <div className={indicatorClassName} />
    </nav>
  );
}

function MobileBottomNavLink({
  active = false,
  badge,
  highlighted = false,
  href,
  icon,
  label
}: MobileBottomNavItem) {
  const tone = active || highlighted ? "text-[#ffb12b]" : "text-white/58";
  const iconWrapClass = active || highlighted
    ? "bg-[linear-gradient(180deg,rgba(255,188,60,0.2)_0%,rgba(255,140,24,0.12)_100%)] border border-[#ffb12b]/32 shadow-[0_0_18px_rgba(255,177,43,0.26)]"
    : "border border-white/10 bg-white/[0.035]";
  const shouldShowAlertsBadge = href.startsWith("/alerts");

  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1.5 ${tone}`}>
      <span className={`relative grid h-9 w-9 place-items-center rounded-full [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8] ${iconWrapClass}`}>
        {icon}
        {shouldShowAlertsBadge ? (
          <MobileAlertsBadge fallbackBadge={badge} />
        ) : badge ? (
          <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rust px-1 text-[11px] font-semibold leading-none text-white">{badge}</span>
        ) : null}
      </span>
      <span className="text-[12px]">{label}</span>
    </Link>
  );
}
