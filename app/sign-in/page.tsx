import { MobileShell } from "@/components/mobile-shell";
import { mobileViewAllClass } from "@/components/mobile-ui";
import { DemoAccountButton } from "@/components/demo-auth-controls";
import { AuthFlowClient } from "@/components/auth-flow-client";
import { BrandWordmark } from "@/components/brand-wordmark";
import { getCurrentSession } from "@/lib/auth";
import { safeReturnPath } from "@/lib/route-guards";
import Image from "next/image";

const authAmbientClass =
  "bg-[radial-gradient(circle_at_16%_8%,rgba(48,129,214,0.14),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.09),transparent_30%),linear-gradient(180deg,rgba(2,10,24,0.12)_0%,rgba(1,8,21,0.62)_56%,rgba(1,6,18,0.9)_100%)]";
const authBackgroundClass = "bg-[linear-gradient(180deg,#071a34_0%,#041226_36%,#020b1c_72%,#010716_100%)]";

export default async function SignInPage({ searchParams }: { searchParams?: { email?: string; mode?: string; resetToken?: string; returnTo?: string; verifyToken?: string } }) {
  const successSession = searchParams?.mode === "success" ? await getCurrentSession() : null;
  const initialMode =
    searchParams?.mode === "create"
      ? "create"
      : searchParams?.mode === "verify"
        ? "verify"
        : searchParams?.mode === "success" && successSession
          ? "success"
          : undefined;
  const returnTo = safeReturnPath(searchParams?.returnTo, initialMode === "create" ? "/onboarding" : "/dashboard");
  const isVercelDeployment = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const allowDemoMode =
    !isVercelDeployment &&
    process.env.AUTH_DEMO_ENABLED !== "false" &&
    (process.env.AUTH_DEMO_ENABLED === "true" || process.env.NODE_ENV !== "production");

  return (
    <MobileShell
      ambientClassName={authAmbientClass}
      backgroundClassName={authBackgroundClass}
      minHeight="min-h-[1180px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative grid h-[82px] w-[82px] shrink-0 place-items-center rounded-full border-2 border-[#d59a31]/80 bg-[radial-gradient(circle,rgba(255,177,43,0.18)_0%,rgba(28,102,180,0.22)_40%,rgba(4,17,39,0.94)_72%)] shadow-[inset_0_1px_0_rgba(255,210,120,0.22),0_0_26px_rgba(255,177,43,0.24),0_0_34px_rgba(35,132,255,0.12)]">
                  <span className="absolute inset-[-5px] rounded-full border border-[#ffb12b]/42" />
                  <Image src="/capitol-ledger-logo.png" alt="" width={78} height={78} className="h-[76px] w-[76px] rounded-full object-cover" />
                </div>
                <BrandWordmark className="liquid-glass-wordmark min-w-0 rounded-full px-3 py-1.5 text-[15px] font-semibold uppercase tracking-normal" />
              </div>
              {allowDemoMode ? (
                <div className="flex shrink-0 items-center gap-2">
                  <DemoAccountButton href="/dashboard" className={`${mobileViewAllClass} px-4 py-2 text-[13px] text-white/72`}>
                    Preview
                  </DemoAccountButton>
                </div>
              ) : null}
            </header>

            <AuthFlowClient
              allowDemoMode={allowDemoMode}
              initialMode={initialMode}
              initialEmail={searchParams?.email}
              resetToken={searchParams?.resetToken}
              returnTo={returnTo}
              verifyToken={searchParams?.verifyToken}
            />

            <div className="mx-auto mb-4 mt-7 h-1.5 w-36 rounded-full bg-white/82" />
    </MobileShell>
  );
}
