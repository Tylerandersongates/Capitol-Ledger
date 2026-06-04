import type { ReactElement } from "react";
import {
  Bell,
  Building2,
  FileText,
  Flame,
  Landmark,
  MapPin,
  Megaphone,
  Scale,
  Search,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
  Vote
} from "lucide-react";
import type { BadgeIcon, BadgeTone, GamificationBadge } from "@/lib/gamification";

export const badgeTones: Record<BadgeTone, { core: string; glow: string; shell: string; text: string }> = {
  gold: {
    shell: "from-[#f8b12a] via-[#77510d] to-[#1b1420]",
    core: "from-[#ffe06a] via-[#c47a13] to-[#17111b]",
    text: "text-[#ffd560]",
    glow: "shadow-[0_0_34px_rgba(255,177,43,0.34)]"
  },
  green: {
    shell: "from-[#9ce579] via-[#3b8d39] to-[#102218]",
    core: "from-[#c9ff9e] via-[#6ac96b] to-[#112617]",
    text: "text-[#a8ee87]",
    glow: "shadow-[0_0_34px_rgba(108,213,100,0.3)]"
  },
  blue: {
    shell: "from-[#9fc4ff] via-[#4d82de] to-[#111d3d]",
    core: "from-[#d7e7ff] via-[#6ca1ff] to-[#111e3c]",
    text: "text-[#a9ccff]",
    glow: "shadow-[0_0_34px_rgba(91,146,255,0.32)]"
  },
  purple: {
    shell: "from-[#e59bff] via-[#9349cc] to-[#211332]",
    core: "from-[#efb7ff] via-[#b46ce7] to-[#241633]",
    text: "text-[#d99bff]",
    glow: "shadow-[0_0_34px_rgba(191,102,238,0.32)]"
  }
};

export function badgeIcon(icon: BadgeIcon): ReactElement {
  const icons: Record<BadgeIcon, ReactElement> = {
    bell: <Bell />,
    building: <Building2 />,
    file: <FileText />,
    flame: <Flame />,
    landmark: <Landmark />,
    map: <MapPin />,
    megaphone: <Megaphone />,
    scale: <Scale />,
    search: <Search />,
    shield: <Shield />,
    sparkles: <Sparkles />,
    trophy: <Trophy />,
    user: <UserRound />,
    vote: <Vote />
  };

  return icons[icon];
}

export function EarnedBadgeTile({
  badge,
  size = "large",
  showDescription = false
}: {
  badge: GamificationBadge;
  showDescription?: boolean;
  size?: "medium" | "large";
}) {
  const colors = badgeTones[badge.tone];
  const tileSize = size === "medium" ? "h-24 w-24" : "h-28 w-28";
  const iconSize = size === "medium" ? "[&>svg]:h-11 [&>svg]:w-11" : "[&>svg]:h-12 [&>svg]:w-12";

  return (
    <div className={`flex flex-col items-center text-center ${showDescription ? "min-h-[236px]" : ""}`}>
      <div
        className={`mx-auto grid ${tileSize} place-items-center bg-gradient-to-br ${colors.shell} p-[3px] ${colors.glow}`}
        style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
      >
        <div
          className={`grid h-full w-full place-items-center bg-gradient-to-br ${colors.core}`}
          style={{ clipPath: "polygon(25% 8%, 75% 8%, 98% 50%, 75% 92%, 25% 92%, 2% 50%)" }}
        >
          <span className={`${colors.text} ${iconSize} [&>svg]:stroke-[1.55]`}>{badgeIcon(badge.icon)}</span>
        </div>
      </div>
      {showDescription ? (
        <div className="mt-4 flex min-h-[5.25rem] flex-col items-center justify-start px-1">
          <div className="max-w-[7.3rem] text-[16px] font-medium leading-snug text-white">
            {badge.label}
          </div>
          <div className="mt-3 max-w-[7.7rem] text-[12px] leading-snug text-white/52">
            {badge.description}
          </div>
        </div>
      ) : (
        <div className="mt-4 min-h-[3.25rem] text-[18px] font-medium leading-tight text-white">{badge.label}</div>
      )}
    </div>
  );
}

export function LockedBadgeTile({
  badge,
  progressLabel,
  showDescription = false
}: {
  badge: GamificationBadge;
  progressLabel?: string;
  showDescription?: boolean;
}) {
  return (
    <div className="flex min-h-[214px] flex-col items-center text-center">
      <div
        className="mx-auto grid h-24 w-24 place-items-center bg-gradient-to-br from-white/45 via-white/18 to-white/5 p-[3px] opacity-75"
        style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
      >
        <div
          className="grid h-full w-full place-items-center bg-gradient-to-br from-white/15 via-white/7 to-white/3 text-white/50"
          style={{ clipPath: "polygon(25% 8%, 75% 8%, 98% 50%, 75% 92%, 25% 92%, 2% 50%)" }}
        >
          <span className="[&>svg]:h-11 [&>svg]:w-11 [&>svg]:stroke-[1.5]">{badgeIcon(badge.icon)}</span>
        </div>
      </div>
      <div className="mt-4 flex min-h-[5.25rem] flex-col items-center justify-start px-1">
        <div className="max-w-[7.3rem] text-[16px] font-medium leading-snug text-white/60">
          {badge.label}
        </div>
        {progressLabel ? (
          <div className="mt-2 rounded-full border border-white/12 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold leading-none text-white/62">
            {progressLabel}
          </div>
        ) : null}
        {showDescription ? (
          <div className="mt-3 max-w-[7.7rem] text-[12px] leading-snug text-white/42">
            {badge.description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
