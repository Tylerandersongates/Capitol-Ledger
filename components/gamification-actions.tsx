"use client";

import Link from "next/link";
import { useEffect, type AnchorHTMLAttributes, type ReactNode } from "react";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import type { GamificationEventType } from "@/lib/gamification";

type GamificationActionProps = {
  event: GamificationEventType;
  targetId?: string;
};

export function RecordGamificationEvent({ event, targetId }: GamificationActionProps) {
  useEffect(() => {
    recordGamificationEvent(event, targetId);
  }, [event, targetId]);

  return null;
}

export function GamificationEventLink({
  children,
  className,
  event,
  href,
  targetId
}: GamificationActionProps & {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link href={href} onClick={() => recordGamificationEvent(event, targetId)} className={className}>
      {children}
    </Link>
  );
}

export function GamificationEventAnchor({
  children,
  className,
  event,
  href,
  onClick,
  rel,
  target = "_blank",
  targetId,
  ...props
}: GamificationActionProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : rel}
      onClick={(eventObject) => {
        onClick?.(eventObject);
        recordGamificationEvent(event, targetId);
      }}
      className={className}
    >
      {children}
    </a>
  );
}
