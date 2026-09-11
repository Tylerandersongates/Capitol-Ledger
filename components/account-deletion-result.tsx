"use client";

import Link from "next/link";
import { CheckCircle2, LifeBuoy, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileCard, mobileViewAllClass } from "@/components/mobile-ui";
import { hasBrowserAccountDeletionReceipt } from "@/lib/browser-auth-state";

type DeletionResultState = "checking" | "confirmed" | "unconfirmed";

export function AccountDeletionResult() {
  const [state, setState] = useState<DeletionResultState>("checking");

  useEffect(() => {
    setState(hasBrowserAccountDeletionReceipt() ? "confirmed" : "unconfirmed");
  }, []);

  if (state === "checking") {
    return (
      <MobileCard variant="rust" className="px-6 py-7">
        <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-3 text-[14px] font-semibold text-white/68">
          <Loader2 className="h-5 w-5 animate-spin text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          Checking deletion status…
        </div>
      </MobileCard>
    );
  }

  if (state === "unconfirmed") {
    return (
      <MobileCard variant="rust" className="px-6 py-7">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#ffb12b]/28 bg-[#ffb12b]/12 text-[#ffcf54]">
          <TriangleAlert className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="mt-5">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ffcf54]">Deletion not confirmed</div>
          <h1 className="mt-2 text-[30px] font-medium leading-tight text-white">This page cannot confirm that your account was deleted.</h1>
          <p className="mt-4 text-[15px] leading-6 text-white/62">
            If you just attempted deletion, this tab did not receive a verified completion response. Check Settings to retry, or sign in again to see whether the account still exists.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <Link href="/settings#delete-account" className={`${mobileViewAllClass} flex h-11 items-center justify-center text-[14px]`}>
            Check or retry deletion
          </Link>
          <a href="https://apps.apple.com/account/subscriptions" className="flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-[14px] font-semibold text-white/68">
            Manage Apple subscription
          </a>
          <Link href="/support" className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] text-[14px] font-semibold text-white/68">
            <LifeBuoy className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Support
          </Link>
        </div>
      </MobileCard>
    );
  }

  return (
    <MobileCard variant="rust" className="px-6 py-7">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/12 text-[#59ee83]">
        <CheckCircle2 className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-5">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#59ee83]">Deletion complete</div>
        <h1 className="mt-2 text-[30px] font-medium leading-tight text-white">Your account was permanently deleted.</h1>
        <p className="mt-4 text-[15px] leading-6 text-white/62">
          Your CapitolWonk account and linked data were erased, all sessions were ended, and CapitolWonk data on this device was cleared.
        </p>
        <p className="mt-3 text-[14px] leading-6 text-white/54">
          Apple billing was not canceled. An active referenced legacy web plan was queued to stop renewal and detach CapitolWonk account metadata where the provider permits; an already-ended or missing plan requires no renewal action and may no longer permit metadata changes. A limited provider-cleanup record remains only while cleanup is pending or retrying and is erased after it succeeds; only a deidentified completion audit remains.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <Link href="/sign-in?mode=create" className={`${mobileViewAllClass} flex h-11 items-center justify-center text-[14px]`}>
          Create or sign in
        </Link>
        <a href="https://apps.apple.com/account/subscriptions" className="flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-[14px] font-semibold text-white/68">
          Manage Apple subscription
        </a>
        <Link href="/support" className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] text-[14px] font-semibold text-white/68">
          <LifeBuoy className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Support
        </Link>
      </div>
    </MobileCard>
  );
}
