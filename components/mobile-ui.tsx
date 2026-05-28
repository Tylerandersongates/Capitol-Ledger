import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

type MobileCardVariant = "default" | "rust" | "dashboard" | "compact";

export const mobileViewAllClass =
  "rounded-full border border-white/10 bg-white/8 px-5 py-2 text-[18px] font-medium leading-none text-[#ffb62e] shadow-[inset_0_0_18px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl";

export const mobileIconButtonClass =
  "grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-[#ffb12b] shadow-[inset_0_0_18px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl";

const cardVariants: Record<MobileCardVariant, string> = {
  default:
    "rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  rust:
    "rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  dashboard:
    "rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  compact:
    "rounded-[1rem] border border-white/10 bg-[#061a33]/76 shadow-[inset_0_0_20px_rgba(43,141,255,0.05),0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl"
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
  className = "sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl",
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
  const tone = active || highlighted ? "text-[#ffb12b]" : "text-white/54";

  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1.5 ${tone}`}>
      <span className="relative [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]">
        {icon}
        {badge ? <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rust text-[11px] font-semibold text-white">{badge}</span> : null}
      </span>
      <span>{label}</span>
    </Link>
  );
}
