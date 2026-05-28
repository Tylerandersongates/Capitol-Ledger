import { MobileShell } from "@/components/mobile-shell";
import { mobileIconButtonClass } from "@/components/mobile-ui";
import { DemoAccountButton } from "@/components/demo-auth-controls";
import { AuthFlowClient } from "@/components/auth-flow-client";
import { safeReturnPath } from "@/lib/route-guards";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignInPage({ searchParams }: { searchParams?: { resetToken?: string; returnTo?: string; verifyToken?: string } }) {
  const returnTo = safeReturnPath(searchParams?.returnTo, "/dashboard");

  return (
    <MobileShell
      minHeight="min-h-[980px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_18%_9%,rgba(34,141,255,0.24),transparent_31%),radial-gradient(circle_at_82%_18%,rgba(246,216,75,0.14),transparent_28%),linear-gradient(155deg,#061a33_0%,#020916_55%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <Link href="/" className={mobileIconButtonClass} aria-label="Back to homepage">
                <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <DemoAccountButton href={returnTo} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[14px] font-semibold text-white/60">
                Demo
              </DemoAccountButton>
            </header>

            <AuthFlowClient resetToken={searchParams?.resetToken} returnTo={returnTo} verifyToken={searchParams?.verifyToken} />

            <div className="mx-auto mb-4 mt-7 h-1.5 w-36 rounded-full bg-white/82" />
    </MobileShell>
  );
}
