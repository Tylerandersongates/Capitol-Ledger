import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, LockKeyhole, Search, Settings, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { isAccountDeletionEnabled } from "@/lib/account-deletion-activation";
import { publicBrand } from "@/lib/brand";

export const metadata = {
  title: publicBrand.privacyTitle,
  description: `How ${publicBrand.name} handles account, personalization, message, diagnostic, and subscription data.`
};

const policySections: Array<{
  body: string;
  link?: { href: string; label: string };
  title: string;
}> = [
  {
    title: "What we collect",
    body:
      `${publicBrand.name} stores the name, email, and account identifier you provide; optional party affiliation; state and district; policy interests; saved and followed items; alert and notification preferences; Team workspace, member, and invitation content; and product or civic activity such as read alerts, contact history, badges, streaks, and optional registration or election-participation counts.`
  },
  {
    title: "Location and district",
    body:
      "If you choose current-location district matching, location coordinates are processed on your device against the app's district map. We do not send or store those coordinates. Only the district and state you select or derive are saved to personalize civic information."
  },
  {
    title: "Purchases",
    body:
      `Paid Pro and Team upgrades offered inside the iOS app are handled by the App Store. ${publicBrand.name} receives trial, renewal, subscription status, product identifiers, transaction references, and Team seat entitlement details needed to unlock access and sync purchases to the signed-in account. Legacy web subscriptions may be handled by Stripe.`
  },
  {
    title: "Reports and diagnostics",
    body:
      "When monitoring is enabled, we use Sentry to process automatic error, crash, app-hang, watchdog-termination, and related diagnostic reports. Reports may include an error or stack trace, page or screen, app and build version, device model, operating-system details, performance context, and session or installation identifiers. Automatic reports are configured not to attach your name, email, or CapitolWonk account ID by default. Native reports can include a persistent installation identifier, and session replay is disabled."
  },
  {
    title: "Feedback and support",
    body:
      "A product or bug report you choose to submit can include its title and message, the current app page, technical context, and an optional contact email. Because those details are sent together, a voluntary report may be linked to you when you provide an email or identifying content. Product feedback is not the privacy-rights request channel."
  },
  {
    title: "Messages to officials",
    body:
      "When you prepare or send a message to an official, we process your sender email, subject, message, and selected recipient to prepare or deliver it. We keep the official, subject, a short message preview, delivery status, and account association so you can see action history and we can enforce delivery limits."
  },
  {
    title: "Third-party video",
    body:
      "When a published Daily Brief includes an embedded video and you open that page, the YouTube player may connect to YouTube and send playback request, device, and network information. No video player or automatic YouTube request is loaded while an edition has no configured video. If you choose a Subscribe or Watch link, your browser opens YouTube and Google's privacy terms apply.",
    link: { href: "https://policies.google.com/privacy", label: "Google and YouTube privacy policy" }
  },
  {
    title: "Service providers and recipients",
    body:
      "Hosting and database providers process account and request data needed to run the app. Sentry receives diagnostics and feedback. If configured, email or webhook providers receive the names, email addresses, invitations, action links, Brief content, or official-message content needed to deliver a requested feature. Apple processes in-app purchases, and Stripe may retain records for a legacy web subscription. YouTube receives traffic when you choose an outbound YouTube link and when an embedded player loads for a configured video. Providers process data under their applicable agreements and privacy terms. Your email provider and the official you contact may retain a delivered message under their own policies."
  },
  {
    title: "How data is used",
    body:
      "Data is used to run the account, personalize civic alerts and briefs, sync saved items, deliver requested messages, verify purchases, prevent misuse, troubleshoot reports, and maintain app quality."
  },
  {
    title: "What we do not do",
    body:
      `${publicBrand.name} does not sell personal data, use third-party advertising trackers, or enable Sentry session replay. Official civic data is used for public legislative context, not ad targeting.`
  },
  {
    title: "Retention and deletion",
    body:
      "Account, profile, saved-item, Team, preference, official-contact history, local subscription entitlement, and product-activity records are kept while your account is active. When the protected deletion feature is enabled, permanent account deletion is started from Settings > Your data and completed during the confirmed in-app action. It removes the account and linked records, signs out every session, and clears CapitolWonk data on the current device. When that feature is unavailable, use the Privacy requests page for the currently available assistance path. CapitolWonk retains a non-identifying deletion-completion record and, only when external cleanup is needed, a limited retry record containing the minimum provider or Team-member subscription reference. That retry record is retained only while cleanup remains pending and is erased after cleanup succeeds. An active referenced legacy Stripe plan is queued not to renew, and its CapitolWonk account metadata is detached where Stripe permits; an already-ended or missing plan requires no renewal action and may no longer permit metadata changes. CapitolWonk does not otherwise retain an account record after deletion unless a specific law requires a particular record, in which case it is limited to that legal purpose and period. Apple and Stripe may retain billing records under their own terms, and an email provider or official may independently retain a delivered message. Separately submitted Sentry feedback and diagnostics follow configured provider retention. CapitolWonk does not currently promise deletion of one individual Sentry feedback item."
  },
  {
    title: "Your choices",
    body:
      "You can avoid optional current-location matching, product feedback, official messaging, and video playback; revoke location access in iOS Settings; and change district, interest, notification, and plan settings in the app. Use Privacy requests to see the currently available first-party or verified-email path for access, export, correction, deletion assistance, consent withdrawal, or another privacy action."
  }
];

export default function PrivacyPage() {
  const accountDeletionEnabled = isAccountDeletionEnabled();

  return (
    <MobileShell
      minHeight="min-h-[1120px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/settings" className={mobileIconButtonClass} aria-label="Back to settings">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/support" className={mobileViewAllClass}>
          Support
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Privacy</div>
        <h1 className="mt-1 text-[28px] font-medium leading-tight text-white">{publicBrand.privacyTitle}</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Policy reviewed September 12, 2026. This page summarizes how {publicBrand.name} handles data for accounts, civic tracking, messages, diagnostics, video playback, and Apple purchases.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] [&>svg]:h-6 [&>svg]:w-6">
              <ShieldCheck strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[22px] font-medium leading-tight text-white">Plain-language policy</h2>
              <p className="mt-2 text-[13px] leading-snug text-white/54">
                We collect only the data needed to provide the features you use, protect the service, and resolve problems. We do not use this data to track you across other companies&apos; apps or websites.
              </p>
            </div>
          </div>
        </MobileCard>

        {policySections.map((section) => (
          <MobileCard key={section.title} variant="compact" className="px-5 py-4">
            <h2 className="text-[18px] font-semibold text-white">{section.title}</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/58">{section.body}</p>
            {section.link ? (
              <a href={section.link.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[14px] font-medium text-[#ffb12b] underline decoration-[#ffb12b]/40 underline-offset-4">
                {section.link.label}
              </a>
            ) : null}
          </MobileCard>
        ))}

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6">
              <LockKeyhole strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium leading-tight text-white">Privacy requests</h2>
              <p className="mt-2 text-[14px] leading-6 text-white/58">
                {accountDeletionEnabled
                  ? "Permanently delete your account and linked data immediately in Settings. Use the dedicated privacy-request path for access, export, correction, consent withdrawal, or help with saved account data."
                  : "Use the dedicated privacy-request path for access, export, correction, consent withdrawal, account-deletion assistance, or help with saved account data."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/privacy/request" className={mobileViewAllClass}>
                  Start request
                </Link>
                {accountDeletionEnabled ? (
                  <Link href="/settings#delete-account" className={mobileViewAllClass}>
                    Delete account
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </MobileCard>
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
