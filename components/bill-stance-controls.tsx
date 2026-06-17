"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, ThumbsDown, ThumbsUp, UserCircle } from "lucide-react";

type BillStance = "support" | "oppose" | "watching";

const billStanceKey = "capitol-ledger:bill-stances";
const billStanceChangedEvent = "capitol-ledger:bill-stances-changed";
const anonymousBillStanceKey = `${billStanceKey}:anonymous`;

const stanceOptions: Array<{
  description: string;
  icon: typeof ThumbsUp;
  label: string;
  value: BillStance;
}> = [
  { description: "You support this bill", icon: ThumbsUp, label: "Support", value: "support" },
  { description: "You oppose this bill", icon: ThumbsDown, label: "Oppose", value: "oppose" },
  { description: "You are tracking before choosing", icon: Eye, label: "Watching", value: "watching" }
];

const stanceLabels: Record<BillStance, string> = {
  oppose: "Oppose",
  support: "Support",
  watching: "Watching"
};

const stanceTone: Record<BillStance, string> = {
  oppose: "text-[#ff6d7a]",
  support: "text-[#43ed74]",
  watching: "text-[#ffb12b]"
};

type AuthSessionResponse = {
  authenticated?: boolean;
  mode?: string;
  user?: {
    email?: string;
    id?: string;
  } | null;
};

function isBillStance(value: unknown): value is BillStance {
  return value === "support" || value === "oppose" || value === "watching";
}

function storageScopeFromSession(data: AuthSessionResponse | null) {
  if (!data?.authenticated || !data.user) return anonymousBillStanceKey;

  const userKey = data.user.id || data.user.email;
  if (!userKey) return anonymousBillStanceKey;

  const mode = data.mode === "demo" ? "demo" : "account";
  return `${billStanceKey}:${mode}:${encodeURIComponent(userKey.toLowerCase())}`;
}

async function resolveBillStanceStorageKey() {
  const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return anonymousBillStanceKey;

  const data = (await response.json().catch(() => null)) as AuthSessionResponse | null;
  return storageScopeFromSession(data);
}

function readBillStances(storageKey: string) {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, BillStance>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readBillStance(billId: string, storageKey: string) {
  const stance = readBillStances(storageKey)[billId];
  return isBillStance(stance) ? stance : null;
}

function writeBillStance(billId: string, stance: BillStance, storageKey: string) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...readBillStances(storageKey),
      [billId]: stance
    })
  );
  window.dispatchEvent(new Event(billStanceChangedEvent));
}

function useBillStance(billId: string) {
  const [stance, setStance] = useState<BillStance | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    resolveBillStanceStorageKey().then((nextStorageKey) => {
      if (!active) return;
      setStorageKey(nextStorageKey);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageKey) {
      setStance(null);
      return;
    }

    function refreshStance() {
      setStance(readBillStance(billId, storageKey));
    }

    refreshStance();
    window.addEventListener("storage", refreshStance);
    window.addEventListener(billStanceChangedEvent, refreshStance);

    return () => {
      window.removeEventListener("storage", refreshStance);
      window.removeEventListener(billStanceChangedEvent, refreshStance);
    };
  }, [billId, storageKey]);

  return { setStance, stance, storageKey };
}

export function BillStanceControl({ billId }: { billId: string }) {
  const { setStance, stance, storageKey } = useBillStance(billId);

  function chooseStance(nextStance: BillStance) {
    if (!storageKey) return;

    writeBillStance(billId, nextStance, storageKey);
    setStance(nextStance);
  }

  return (
    <section className="mt-6 rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.5)_0%,rgba(3,17,40,0.8)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_0_30px_rgba(43,141,255,0.07),0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-wide text-white/45">Your position</div>
          <h3 className="mt-1 text-[18px] font-medium leading-tight text-white">{stance ? stanceLabels[stance] : "Choose your stance"}</h3>
        </div>
        {stance ? <CheckCircle2 className={`h-6 w-6 ${stanceTone[stance]}`} strokeWidth={1.9} aria-hidden="true" /> : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stanceOptions.map((option) => {
          const Icon = option.icon;
          const active = stance === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={!storageKey}
              onClick={() => chooseStance(option.value)}
              className={`grid min-h-16 place-items-center rounded-2xl border px-2 py-3 text-center transition ${
                active
                  ? "border-[#ffb12b]/70 bg-[#ffb12b]/14 text-[#ffce68] shadow-[0_0_18px_rgba(255,177,43,0.16)]"
                  : "border-white/10 bg-white/[0.035] text-white/58"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              aria-label={option.description}
              aria-pressed={active}
            >
              <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              <span className="mt-1 text-[12px] font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function BillStanceDetailRow({ billId }: { billId: string }) {
  const { stance } = useBillStance(billId);

  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3">
      <span className="text-white/56">
        <UserCircle className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="text-[15px] text-white/63">Your Position</span>
      {stance ? (
        <span className={`max-w-[225px] truncate text-right text-[15px] font-semibold ${stanceTone[stance]}`}>{stanceLabels[stance]}</span>
      ) : (
        <Link href={`/bills/${billId}`} className="max-w-[225px] truncate text-right text-[15px] font-semibold text-[#ffb12b]">
          Set on bill
        </Link>
      )}
    </div>
  );
}
