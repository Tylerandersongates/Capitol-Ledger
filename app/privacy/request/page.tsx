import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, LockKeyhole, Mail, Search, Settings } from "lucide-react";
import { PrivacyRequestForm } from "@/components/privacy-request-form";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getProductionSession } from "@/lib/auth";
import { publicBrand } from "@/lib/brand";
import { getPrivacyRequestFallbackEmail, isPrivacyRequestIntakeEnabled } from "@/lib/privacy-request-activation";

export const metadata = {
  title: `Privacy requests | ${publicBrand.name}`,
  description: `Submit and track a minimized ${publicBrand.name} privacy request.`
};

export const dynamic = "force-dynamic";

export default async function PrivacyRequestPage() {
  const intakeEnabled = isPrivacyRequestIntakeEnabled();
  const fallbackEmail = getPrivacyRequestFallbackEmail();
  const session = intakeEnabled ? await getProductionSession({ includeUnverified: true }) : null;
  const authenticated = Boolean(session?.user);

  return (
    <MobileShell
      minHeight="min-h-[1040px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/privacy" className={mobileIconButtonClass} aria-label="Back to privacy policy">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/support" className={mobileViewAllClass}>Support</Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Privacy</div>
        <h1 className="mt-1 text-[28px] font-medium leading-tight text-white">Privacy requests</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Use this channel for access, export, correction, deletion assistance, consent withdrawal, or another privacy question. Product and bug feedback goes through Support instead.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74]">
              <LockKeyhole className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[21px] font-medium leading-tight text-white">Minimized and account-linked</h2>
              <p className="mt-2 text-[13px] leading-5 text-white/54">
                The signed-in lane uses your existing account identity. It does not ask for a password, payment receipt, government ID, or diagnostic report, and it does not send the request to Sentry.
              </p>
            </div>
          </div>
        </MobileCard>

        {!intakeEnabled ? (
          <MobileCard variant="compact" className="px-5 py-5">
            <h2 className="text-[18px] font-semibold text-white">First-party intake is not active</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/58">
              The database-backed request form is disabled in this build, so no request can be submitted through it.
            </p>
            {fallbackEmail ? <EmailFallback email={fallbackEmail} /> : (
              <p className="mt-3 text-[13px] leading-5 text-[#ffd77a]">
                A verified fallback privacy mailbox has not been published. This release is not ready to advertise a privacy-request intake channel.
              </p>
            )}
          </MobileCard>
        ) : authenticated ? (
          <PrivacyRequestForm />
        ) : (
          <MobileCard variant="compact" className="px-5 py-5">
            <h2 className="text-[18px] font-semibold text-white">Sign in to use the first-party queue</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/58">
              Signing in lets CapitolWonk verify the account without collecting another identity document or asking you to re-enter your email.
            </p>
            <Link href="/sign-in?returnTo=%2Fprivacy%2Frequest" className={`${mobileViewAllClass} mt-4 inline-flex`}>
              Sign in
            </Link>
            {fallbackEmail ? <EmailFallback email={fallbackEmail} /> : null}
          </MobileCard>
        )}
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { active: true, href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function EmailFallback({ email }: { email: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
        <Mail className="h-4 w-4 text-[#ffb12b]" aria-hidden="true" />
        Unable to sign in?
      </div>
      <p className="mt-2 text-[13px] leading-5 text-white/52">Use the verified privacy mailbox:</p>
      <a href={`mailto:${email}`} className="mt-2 inline-flex break-all text-[14px] font-semibold text-[#ffb12b] underline underline-offset-4">
        {email}
      </a>
    </div>
  );
}
