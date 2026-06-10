"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { MobileCard } from "@/components/mobile-ui";
import {
  readLocalAccountProfile,
  readLocalNotificationPreferences,
  resetLocalAccountSetupState,
  writeLocalAccountProfile
} from "@/lib/browser-account-profile";
import { hasBrowserAccountCreated, markBrowserAccountCreated, setBrowserSessionAuthenticated } from "@/lib/browser-auth-state";
import { readLocalGamificationSnapshot } from "@/lib/browser-gamification";
import type { AccountLedgerSnapshot, AccountProfileSnapshot, AccountSubscriptionSnapshot, SavedFollowRecord } from "@/types/capitol";

const followsKey = "capitol-ledger:follows";
const alertsKey = "capitol-ledger:saved-alerts";
const interestsKey = "capitol-ledger:issue-interests";
const readAlertsKey = "capitol-ledger:read-alerts";
const subscriptionKey = "capitol-ledger:subscription";
const authCardAccentClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,146,255,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,177,43,0.1),transparent_30%)]";
const authInnerPanelClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,67,121,0.34)_0%,rgba(5,19,43,0.72)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(1,8,24,0.36)]";

type AuthMode = "signIn" | "create" | "forgot" | "reset" | "verify" | "success";

type AuthFormState = {
  code: string;
  confirmPassword: string;
  consent: boolean;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  password: string;
};

type AuthApiResponse = {
  authenticated?: boolean;
  configured?: boolean;
  emailDelivery?: string;
  error?: string;
  mode?: string;
  user?: {
    email: string;
    firstName?: string;
    id: string;
    lastName?: string;
    name?: string;
  };
  verificationLink?: string;
  verificationPrepared?: boolean;
};

const defaultForm: AuthFormState = {
  code: "",
  confirmPassword: "",
  consent: true,
  email: "",
  firstName: "",
  lastName: "",
  name: "",
  password: ""
};

const trustItems = ["Private district setup", "Nonpartisan records", "Source-linked alerts"];
const authPathItems = [
  { label: "Create", value: "New account" },
  { label: "Return", value: "Sign back in" },
  { label: "Sync", value: "Setup saved" }
];

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function readLocalLedger(): AccountLedgerSnapshot {
  return {
    follows: readJson<SavedFollowRecord[]>(followsKey, []),
    readAlerts: readJson<string[]>(readAlertsKey, []),
    savedAlerts: readJson<string[]>(alertsKey, []),
    issueInterests: readJson<string[]>(interestsKey, []),
    updatedAt: new Date().toISOString()
  };
}

function readLocalSubscription(): Partial<AccountSubscriptionSnapshot> {
  return readJson<Partial<AccountSubscriptionSnapshot>>(subscriptionKey, {});
}

function writeLocalLedger(snapshot: AccountLedgerSnapshot) {
  try {
    window.localStorage.setItem(followsKey, JSON.stringify(snapshot.follows));
    window.localStorage.setItem(alertsKey, JSON.stringify(snapshot.savedAlerts));
    window.localStorage.setItem(interestsKey, JSON.stringify(snapshot.issueInterests));
    window.localStorage.setItem(readAlertsKey, JSON.stringify(snapshot.readAlerts));
    window.dispatchEvent(new Event("capitol-ledger:follows-changed"));
    window.dispatchEvent(new Event("capitol-ledger:persistence-changed"));
  } catch {
    // Sign-in should continue even when browser persistence is restricted.
  }
}

function hasCompletedSetupSignals(profile: Partial<AccountProfileSnapshot>, ledger: Partial<AccountLedgerSnapshot>) {
  const districtReady = Boolean(profile.districtCode);
  const preferences = profile.notificationPreferences ?? readLocalNotificationPreferences();
  const enabledAlertCount = [preferences.districtAlerts, preferences.voteReminders, preferences.weeklyBrief].filter(Boolean).length;
  const issueCount = Array.isArray(ledger.issueInterests)
    ? ledger.issueInterests.filter((interest) => typeof interest === "string" && interest.trim().length > 0).length
    : 0;
  const officialsReady = Array.isArray(ledger.follows)
    ? ledger.follows.some((record) => {
        if (!record || typeof record !== "object") return false;
        return "type" in record && record.type === "member" && "id" in record && typeof record.id === "string" && record.id.length > 0;
      })
    : false;
  const completeCount = [
    districtReady,
    officialsReady,
    Boolean(profile.partyAffiliation),
    issueCount > 0,
    enabledAlertCount > 0
  ].filter(Boolean).length;

  return completeCount >= 5;
}

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function hasCompletedLocalSetup() {
  return hasCompletedSetupSignals(readLocalAccountProfile(), readLocalLedger());
}

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const data = (await response.json().catch(() => ({}))) as T;

  return {
    data,
    ok: response.ok
  };
}

export function AuthFlowClient({
  allowDemoMode = false,
  initialMode,
  resetToken = "",
  returnTo = "/dashboard",
  verifyToken = ""
}: {
  allowDemoMode?: boolean;
  initialMode?: AuthMode;
  resetToken?: string;
  returnTo?: string;
  verifyToken?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : verifyToken ? "verify" : initialMode ?? "signIn");
  const [form, setForm] = useState<AuthFormState>(defaultForm);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [allowAccountCreation, setAllowAccountCreation] = useState(initialMode === "create");
  const [setupComplete, setSetupComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userRequestedAccountCreation, setUserRequestedAccountCreation] = useState(false);
  const [verificationHandled, setVerificationHandled] = useState(false);

  const heading = useMemo(() => {
    if (mode === "create") return "Create your civic command center.";
    if (mode === "forgot") return "Recover secure access.";
    if (mode === "reset") return "Set a new password.";
    if (mode === "verify") return "Verify your account.";
    if (mode === "success") return "Account ready.";
    return "Sign in to your civic command center.";
  }, [mode]);

  const body = useMemo(() => {
    if (mode === "create") return "Set up a secure profile for district alerts, saved records, subscriptions, and civic impact.";
    if (mode === "forgot") return "Enter your email and we will prepare a password reset path for the production account system.";
    if (mode === "reset") return "Choose a new password for your Capitol Ledger account.";
    if (mode === "verify") return `Open the secure verification link sent to ${form.email || "your email"}, or paste the link token below.`;
    if (mode === "success") return "Your account is ready for first-run district setup.";
    return "Track representatives, bills, alerts, and civic impact with a secure profile.";
  }, [form.email, mode]);

  useEffect(() => {
    const created = hasBrowserAccountCreated();
    const completed = hasCompletedLocalSetup();
    const shouldUseDashboardReturn = created && completed && returnTo === "/onboarding" && !userRequestedAccountCreation;

    setSetupComplete(completed);
    setAccountCreated(created && (!allowAccountCreation || shouldUseDashboardReturn));

    if (shouldUseDashboardReturn) {
      setAllowAccountCreation(false);
      if (mode === "create") setMode("signIn");
      return;
    }

    if (created && !allowAccountCreation && mode === "create") setMode("signIn");
  }, [allowAccountCreation, mode, returnTo, userRequestedAccountCreation]);

  useEffect(() => {
    if (resetToken) setMode("reset");
  }, [resetToken]);

  useEffect(() => {
    if (!verifyToken || verificationHandled) return;

    setVerificationHandled(true);
    setMode("verify");
    setPending(true);
    setStatus("Verifying secure email link...");

    postJson<{ error?: string; verified?: boolean }>("/api/auth/verify-email", {
      token: verifyToken
    })
      .then(async (result) => {
        setPending(false);
        if (!result.ok) {
          setStatus(result.data.error ?? "Verification failed.");
          return;
        }

        markBrowserAccountCreated();
        setBrowserSessionAuthenticated(true);
        setAccountCreated(true);
        await prepareFreshAccountSetup();
        setMode("success");
        setStatus("Verified.");
      })
      .catch((error: unknown) => {
        setPending(false);
        setStatus(error instanceof Error ? error.message : "Verification failed.");
      });
  }, [verificationHandled, verifyToken]);

  function updateField(field: keyof AuthFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStatus("");
  }

  function useDifferentAccount() {
    setUserRequestedAccountCreation(true);
    setAllowAccountCreation(true);
    setAccountCreated(false);
    setMode("create");
    setStatus("");
  }

  const postAuthReturnTo = setupComplete && returnTo === "/onboarding" && !userRequestedAccountCreation ? "/dashboard" : returnTo;

  async function syncLocalAccountData() {
    await fetch("/api/account/ledger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalLedger())
    }).catch(() => null);

    await fetch("/api/account/subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalSubscription())
    }).catch(() => null);

    await fetch("/api/account/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalAccountProfile())
    }).catch(() => null);

    await fetch("/api/account/gamification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalGamificationSnapshot())
    }).catch(() => null);
  }

  async function hasCompletedAccountSetup() {
    const [profileResult, ledgerResult] = await Promise.all([
      fetch("/api/account/profile", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json().catch(() => null)) as { profile?: AccountProfileSnapshot } | null;
        })
        .catch(() => null),
      fetch("/api/account/ledger", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
        })
        .catch(() => null)
    ]);

    const profile = profileResult?.profile ?? null;
    const ledger = ledgerResult?.ledger ?? null;

    if (profile) writeLocalAccountProfile(profile);
    if (ledger) writeLocalLedger(ledger);

    return hasCompletedSetupSignals(profile ?? readLocalAccountProfile(), ledger ?? readLocalLedger());
  }

  async function resolvePostAuthReturnTo(href = postAuthReturnTo) {
    if (href !== "/onboarding" || userRequestedAccountCreation) return href;
    if (setupComplete) return "/dashboard";

    const accountSetupComplete = await hasCompletedAccountSetup();
    if (!accountSetupComplete) return href;

    setSetupComplete(true);
    return "/dashboard";
  }

  async function prepareFreshAccountSetup() {
    resetLocalAccountSetupState();

    await fetch("/api/account/ledger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalLedger())
    }).catch(() => null);

    await fetch("/api/account/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalAccountProfile())
    }).catch(() => null);

    await fetch("/api/account/gamification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(readLocalGamificationSnapshot())
    }).catch(() => null);
  }

  async function startDemoAccount(href = postAuthReturnTo) {
    if (!allowDemoMode) {
      setStatus("Demo mode is disabled for this deployment.");
      return;
    }

    setPending(true);
    setStatus("Starting demo mode...");

    const response = await fetch("/api/auth/demo", {
      method: "POST"
    }).catch(() => null);

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: string } | null;
      setPending(false);
      setStatus(data?.error ?? "Demo mode could not start. Restart the preview and try again.");
      return;
    }

    markBrowserAccountCreated();
    setBrowserSessionAuthenticated(true);
    setAllowAccountCreation(false);
    setAccountCreated(true);
    void syncLocalAccountData();

    router.push(href);
    router.refresh();
  }

  async function finishProductionAuth(href = postAuthReturnTo, syncLocalData = false) {
    if (syncLocalData) await syncLocalAccountData();
    router.push(href);
    router.refresh();
  }

  async function submit() {
    if (mode === "signIn") {
      if (!isEmail(form.email)) {
        setStatus("Enter a valid email to continue.");
        return;
      }
      if (form.password.length < 6) {
        setStatus("Password must be at least 6 characters.");
        return;
      }
      setPending(true);
      const result = await postJson<AuthApiResponse>("/api/auth/sign-in", {
        email: form.email,
        password: form.password
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Sign-in failed." },
        ok: false
      }));
      setPending(false);

      if (!result.ok) {
        setStatus(result.data.error ?? "Production sign-in is not configured yet.");
        return;
      }

      markBrowserAccountCreated();
      setBrowserSessionAuthenticated(true);
      setAllowAccountCreation(false);
      setAccountCreated(true);
      await finishProductionAuth(await resolvePostAuthReturnTo());
      return;
    }

    if (mode === "create") {
      if (form.firstName.trim().length < 1) {
        setStatus("Add your first name for the account profile.");
        return;
      }
      if (form.lastName.trim().length < 1) {
        setStatus("Add your last name for the account profile.");
        return;
      }
      if (!isEmail(form.email)) {
        setStatus("Enter a valid email for account verification.");
        return;
      }
      if (form.password.length < 8) {
        setStatus("Use at least 8 characters for the password.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setStatus("Passwords need to match.");
        return;
      }
      if (!form.consent) {
        setStatus("Confirm the privacy consent to create an account.");
        return;
      }
      setPending(true);
      const result = await postJson<AuthApiResponse>("/api/auth/register", {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        name: `${form.firstName} ${form.lastName}`.trim(),
        password: form.password
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Account creation failed." },
        ok: false
      }));
      setPending(false);

      if (!result.ok) {
        setStatus(result.data.error ?? "Production account creation is not configured yet. Use demo mode for now.");
        return;
      }

      resetLocalAccountSetupState();
      markBrowserAccountCreated();
      setBrowserSessionAuthenticated(true);
      setAllowAccountCreation(false);
      setAccountCreated(true);
      setMode("verify");
      const authData = result.data as AuthApiResponse;
      setStatus(
        authData.emailDelivery === "resend"
          ? "Verification email sent. Open the secure link in your inbox to continue."
          : authData.emailDelivery === "webhook"
            ? "Verification link sent."
            : authData.verificationLink
              ? `Verification prepared. Open this link: ${authData.verificationLink}`
              : "Verification prepared. Open the secure verification link to continue."
      );
      return;
    }

    if (mode === "forgot") {
      if (!isEmail(form.email)) {
        setStatus("Enter the email tied to your account.");
        return;
      }
      setPending(true);
      const result = await postJson<{ error?: string; message?: string }>("/api/auth/password-reset", {
        email: form.email
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Password reset failed." },
        ok: false
      }));
      setPending(false);

      const resetMessage = "message" in result.data ? result.data.message : undefined;
      setStatus(result.ok ? resetMessage ?? "Password reset path prepared." : result.data.error ?? "Password reset is not configured yet.");
      return;
    }

    if (mode === "reset") {
      if (!resetToken) {
        setStatus("Password reset link is missing a token.");
        return;
      }
      if (form.password.length < 8) {
        setStatus("Use at least 8 characters for the new password.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setStatus("Passwords need to match.");
        return;
      }

      setPending(true);
      const result = await postJson<AuthApiResponse>("/api/auth/password-reset/confirm", {
        password: form.password,
        token: resetToken
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Password reset failed." },
        ok: false
      }));
      setPending(false);

      if (!result.ok) {
        setStatus(result.data.error ?? "Password reset failed.");
        return;
      }

      markBrowserAccountCreated();
      setBrowserSessionAuthenticated(true);
      setAllowAccountCreation(false);
      setAccountCreated(true);
      await finishProductionAuth(await resolvePostAuthReturnTo());
      return;
    }

    if (mode === "verify") {
      const token = form.code.trim();
      if (!token) {
        setStatus("Open the verification link from your email, or paste its token.");
        return;
      }
      setPending(true);
      const result = await postJson<{ error?: string; verified?: boolean }>("/api/auth/verify-email", {
        token
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Verification failed." },
        ok: false
      }));
      setPending(false);

      if (!result.ok) {
        setStatus(result.data.error ?? "Verification failed.");
        return;
      }

      markBrowserAccountCreated();
      setBrowserSessionAuthenticated(true);
      setAccountCreated(true);
      await prepareFreshAccountSetup();
      setMode("success");
      setStatus("Verified.");
    }
  }

  const showSecondaryCreateCta = mode !== "create" && (!accountCreated || allowAccountCreation);
  const showDifferentAccountCta = accountCreated && mode === "signIn";
  const showSecureAccessSection = showDifferentAccountCta || allowDemoMode || showSecondaryCreateCta;

  return (
    <main className="mt-7 flex flex-1 flex-col pb-8">
      <MobileCard variant="dashboard" className="relative overflow-hidden px-6 py-6">
        <div className={authCardAccentClass} />
        <section className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#ffb12b]">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Secure access
          </div>
          <h1 className="mt-5 max-w-[23rem] text-[29px] font-medium leading-tight text-white">{heading}</h1>
          <p className="mt-3 max-w-[24rem] text-[17px] leading-snug text-white/64">{body}</p>
          <div className={`${authInnerPanelClass} mt-5 px-3 py-3`}>
            <div className="grid grid-cols-3 gap-2">
              {trustItems.map((item) => (
                <div key={item} className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2 text-center">
                  <CheckCircle2 className="mx-auto h-4 w-4 text-[#43ed74]" strokeWidth={2} aria-hidden="true" />
                  <div className="mt-1 text-[10px] font-medium leading-tight text-white/58">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </MobileCard>

      <MobileCard variant="dashboard" className="relative mt-5 overflow-hidden px-5 py-5">
        <div className={authCardAccentClass} />
        <div className="relative z-10">
          {(mode === "signIn" || mode === "create") && (!accountCreated || allowAccountCreation) ? (
            <>
              <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,67,121,0.34)_0%,rgba(5,19,43,0.72)_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
                <button
                  type="button"
                  onClick={() => selectMode("signIn")}
                  className={`h-11 rounded-xl text-[16px] font-semibold transition ${mode === "signIn" ? "bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[#061126] shadow-[0_0_18px_rgba(255,177,43,0.2)]" : "text-white/58 hover:bg-white/[0.04]"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => selectMode("create")}
                  className={`h-11 rounded-xl text-[16px] font-semibold transition ${mode === "create" ? "bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[#061126] shadow-[0_0_18px_rgba(255,177,43,0.2)]" : "text-white/58 hover:bg-white/[0.04]"}`}
                >
                  Create
                </button>
              </div>

              <div className={`${authInnerPanelClass} mt-4 grid grid-cols-3 gap-2 px-3 py-3`}>
                {authPathItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/38">{item.label}</div>
                    <div className="mt-1 text-[12px] font-semibold leading-tight text-white/66">{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <>
              <Field icon={<UserRound />} label="First name" type="text" placeholder="First name" value={form.firstName} onChange={(value) => updateField("firstName", value)} />
              <Field icon={<UserRound />} label="Last name" type="text" placeholder="Last name" value={form.lastName} onChange={(value) => updateField("lastName", value)} />
            </>
          ) : null}

          {mode !== "success" && mode !== "reset" ? (
            <Field icon={<Mail />} label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(value) => updateField("email", value)} />
          ) : null}

          {mode === "signIn" || mode === "create" || mode === "reset" ? (
            <Field
              icon={<KeyRound />}
              label={mode === "reset" ? "New password" : "Password"}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              placeholder={mode === "reset" ? "New password" : "Password"}
              trailing={
                <PasswordVisibilityButton
                  active={showPassword}
                  label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                />
              }
              value={form.password}
              onChange={(value) => updateField("password", value)}
            />
          ) : null}

          {mode === "create" || mode === "reset" ? (
            <Field
              icon={<LockKeyhole />}
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={mode === "reset" ? "Confirm new password" : "Confirm password"}
              value={form.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
            />
          ) : null}

          {mode === "verify" ? (
            <Field
              icon={<ShieldCheck />}
              label="Verification token"
              type="text"
              placeholder="Paste token from your email link"
              value={form.code}
              onChange={(value) => updateField("code", value)}
            />
          ) : null}

          {mode === "signIn" ? (
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-white/50">Keeps you signed in for 30 days.</span>
              <button type="button" onClick={() => selectMode("forgot")} className="font-semibold text-[#ffb12b]">
                Forgot?
              </button>
            </div>
          ) : null}

          {mode === "create" ? (
            <button
              type="button"
              onClick={() => updateField("consent", !form.consent)}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-left text-[13px] leading-snug text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-pressed={form.consent}
            >
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${form.consent ? "border-[#43ed74]/45 bg-[#43ed74]/12 text-[#43ed74]" : "border-white/15 bg-white/5"}`}>
                {form.consent ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              I agree to create my Capitol Ledger account and use my setup choices to personalize my experience.
            </button>
          ) : null}

          {mode === "success" ? (
            <div className="rounded-2xl border border-[#43ed74]/25 bg-[#43ed74]/10 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <CheckCircle2 className="mx-auto h-9 w-9 text-[#43ed74]" strokeWidth={1.9} aria-hidden="true" />
              <div className="mt-3 text-[18px] font-semibold text-white">Verification complete</div>
              <p className="mt-2 text-[14px] leading-snug text-white/58">
                {allowDemoMode
                  ? "Finish district setup or jump into the demo dashboard."
                  : "Finish district setup or open your dashboard."}
              </p>
            </div>
          ) : null}

          {status ? (
            <div className={`rounded-xl border px-3 py-2 text-[13px] font-medium ${status.includes("Enter") || status.includes("Password") || status.includes("match") || status.includes("Confirm") ? "border-rust/35 bg-rust/10 text-[#ffb12b]" : "border-[#43ed74]/25 bg-[#43ed74]/10 text-[#43ed74]"}`}>
              {status}
            </div>
          ) : null}

          {mode === "success" ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void finishProductionAuth("/onboarding", false)}
                disabled={pending}
                className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[16px] font-semibold text-[#071225]"
              >
                Setup
              </button>
              <button
                type="button"
                onClick={() => void finishProductionAuth(postAuthReturnTo, false)}
                disabled={pending}
                className="flex h-12 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[16px] font-semibold text-white/72"
              >
                Dashboard
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={pending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)] transition hover:brightness-105 disabled:opacity-60"
            >
              {mode === "create" ? "Create account" : mode === "forgot" ? "Send reset" : mode === "reset" ? "Update password" : mode === "verify" ? "Verify" : "Sign in"}
              <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </button>
          )}

          {mode === "forgot" || mode === "reset" || mode === "verify" ? (
            <button type="button" onClick={() => selectMode("signIn")} className="w-full text-center text-[14px] font-semibold text-[#ffb12b]">
              Back to sign in
            </button>
          ) : null}
        </div>

        {showSecureAccessSection ? (
          <>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px] uppercase tracking-wide text-white/38">
              <span className="h-px bg-white/10" />
              Secure access
              <span className="h-px bg-white/10" />
            </div>

            {showDifferentAccountCta ? (
              <button type="button" onClick={useDifferentAccount} className="mt-5 w-full text-center text-[14px] font-semibold text-[#ffb12b]">
                Create a new account
              </button>
            ) : null}

            {/* TODO: Add Face ID back when real passkey/WebAuthn sign-in is implemented. */}
            {showSecondaryCreateCta ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => selectMode("create")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72"
                >
                  <UserRound className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  New account
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        </div>
      </MobileCard>

      <MobileCard variant="dashboard" className="relative mt-5 overflow-hidden px-5 py-5">
        <div className={authCardAccentClass} />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-white/[0.055] text-[#43ed74] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.32)]">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">Data handling</div>
              <h2 className="mt-1 text-[21px] font-semibold leading-none text-white">Private by design</h2>
            </div>
          </div>
          <div className={`${authInnerPanelClass} mt-5 grid gap-2 px-3 py-3`}>
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[15px] text-white/64">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-[#43ed74]/45 text-[#43ed74]">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </MobileCard>

      {allowDemoMode ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <button type="button" onClick={() => void startDemoAccount(postAuthReturnTo)} disabled={pending} className="text-[15px] font-semibold text-[#ffb12b] disabled:opacity-60">
            Continue in demo mode
          </button>
          <p className="max-w-xs text-[12px] leading-5 text-white/38">
            Demo mode starts an account session and syncs browser-saved records for investor walkthroughs.
          </p>
        </div>
      ) : null}
    </main>
  );
}

function Field({
  autoComplete,
  icon,
  label,
  onChange,
  placeholder,
  trailing,
  type,
  value
}: {
  autoComplete?: string;
  icon: ReactElement;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailing?: ReactElement;
  type: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/46">{label}</span>
      <span className="mt-2 flex h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,26,56,0.88)_0%,rgba(2,12,29,0.92)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <span className="text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{icon}</span>
        <input
          autoComplete={autoComplete}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="auth-field-input min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        {trailing ? trailing : null}
      </span>
    </label>
  );
}

function PasswordVisibilityButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/54 transition hover:bg-white/8 hover:text-white">
      {active ? <Eye className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /> : <EyeOff className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
    </button>
  );
}
