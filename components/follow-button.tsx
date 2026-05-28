"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { FollowTargetType } from "@/types/capitol";

const STORAGE_KEY = "capitol-ledger:follows";

type FollowRecord = {
  type: FollowTargetType;
  id: string;
};

type FollowButtonProps = {
  targetType: FollowTargetType;
  targetId: string;
  label: string;
};

function readFollows(): FollowRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as FollowRecord[];
  } catch {
    return [];
  }
}

function writeFollows(follows: FollowRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(follows));
  window.dispatchEvent(new Event("capitol-ledger:follows-changed"));
}

export function FollowButton({ targetType, targetId, label }: FollowButtonProps) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    setFollowing(readFollows().some((follow) => follow.type === targetType && follow.id === targetId));
  }, [targetId, targetType]);

  function toggleFollow() {
    const follows = readFollows();
    const exists = follows.some((follow) => follow.type === targetType && follow.id === targetId);
    const next = exists
      ? follows.filter((follow) => !(follow.type === targetType && follow.id === targetId))
      : [...follows, { type: targetType, id: targetId }];

    writeFollows(next);
    setFollowing(!exists);
  }

  const Icon = following ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={toggleFollow}
      className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-brass/25 bg-white/8 px-4 text-sm font-semibold text-blue-50 hover:border-brass hover:bg-white/12"
      aria-pressed={following}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {following ? "Following" : label}
    </button>
  );
}
