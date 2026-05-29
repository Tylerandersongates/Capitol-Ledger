"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { MobileCard } from "@/components/mobile-ui";
import { readLocalAccountProfile } from "@/lib/browser-account-profile";
import { hasBrowserAccountCreated, markBrowserAccountCreated } from "@/lib/browser-auth-state";
import { readLocalGamificationSnapshot } from "@/lib/browser-gamification";
import type { AccountLedgerSnapshot, AccountSubscriptionSnapshot, SavedFollowRecord } from "@/types/capitol";

const followsKey = "capitol-ledger:follows";
const alertsKey = "capitol-ledger:saved-alerts";
const interestsKey = "capitol-ledger:issue-interests";
const readAlertsKey = "capitol-ledger:read-alerts";
const subscriptionKey = "capitol-ledger:subscription";

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

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
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

export function AuthFlowClient({ resetToken = "", returnTo = "/dashboard", verifyToken = "" }: { resetToken?: string; returnTo?: string; verifyToken?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : verifyToken ? "verify" : "signIn");
  const [form, setForm] = useState<AuthFormState>(defaultForm);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [allowAccountCreation, setAllowAccountCreation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    if (mode === "verify") return `Enter the demo verification code sent to ${form.email || "your email"}.`;
    if (mode === "success") return "Your demo account state is ready to carry saved records into onboarding.";
    return "Track representatives, bills, alerts, and civic impact with a secure profile.";
  }, [form.email, mode]);

  useEffect(() => {
    const created = hasBrowserAccountCreated();
    setAccountCreated(created && !allowAccountCreation);
    if (created && !allowAccountCreation && mode === "create") setMode("signIn");
  }, [allowAccountCreation, mode]);

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
        setAccountCreated(true);
        await syncLocalAccountData();
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
    setAllowAccountCreation(true);
    setAccountCreated(false);
    setMode("create");
    setStatus("");
  }

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

  async function startDemoAccount(href = returnTo) {
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
    setAllowAccountCreation(false);
    setAccountCreated(true);
    void syncLocalAccountData();

    router.push(href);
    router.refresh();
  }

  async function finishProductionAuth(href = returnTo) {
    await syncLocalAccountData();
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
        setStatus(result.data.error ?? "Production sign-in is not configured yet. Use demo mode for investor walkthroughs.");
        return;
      }

      markBrowserAccountCreated();
      setAllowAccountCreation(false);
      setAccountCreated(true);
      await finishProductionAuth();
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

      markBrowserAccountCreated();
      setAllowAccountCreation(false);
      setAccountCreated(true);
      await syncLocalAccountData();
      setMode("verify");
      const authData = result.data as AuthApiResponse;
      setStatus(
        authData.emailDelivery === "webhook"
          ? "Verification link sent."
          : authData.verificationLink
            ? `Verification prepared. Demo link: ${authData.verificationLink}`
            : "Verification prepared. Use 1234 for this demo build."
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
      setAllowAccountCreation(false);
      setAccountCreated(true);
      await finishProductionAuth();
      return;
    }

    if (mode === "verify") {
      if (form.code.trim().length < 4) {
        setStatus("Enter the 4 digit demo code.");
        return;
      }
      setPending(true);
      const result = await postJson<{ error?: string; verified?: boolean }>("/api/auth/verify-email", {
        code: form.code
      }).catch((error: unknown) => ({
        data: { error: error instanceof Error ? error.message : "Verification failed." },
        ok: false
      }));
      setPending(false);

      if (!result.ok) {
        setStatus(result.data.error ?? "Verification failed.");
        return;
      }

      setMode("success");
      setStatus("Verified.");
    }
  }

  return (
    <main className="mt-8 flex flex-1 flex-col">
      <section className="text-center">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-rust/35 bg-[#ffb12b]/10 shadow-[0_0_44px_rgba(255,177,43,0.25)]">
          <img src="/capitol-ledger-logo.png" alt="" className="h-24 w-24 rounded-full object-cover" />
        </div>
        <div className="mt-6 text-[18px] font-semibold uppercase tracking-[0.24em] text-white">
          Capitol <span className="text-[#ffb12b]">Ledger</span>
        </div>
        <h1 className="mt-7 text-[31px] font-medium leading-tight text-white">{heading}</h1>
        <p className="mx-auto mt-4 max-w-sm text-[17px] leading-snug text-white/62">{body}</p>
      </section>

      <MobileCard className="mt-8 px-5 py-5">
        {(mode === "signIn" || mode === "create") && (!accountCreated || allowAccountCreation) ? (
          <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => selectMode("signIn")}
              className={`h-11 rounded-xl text-[16px] font-semibold ${mode === "signIn" ? "bg-[#ffb12b] text-[#061126]" : "text-white/58"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => selectMode("create")}
              className={`h-11 rounded-xl text-[16px] font-semibold ${mode === "create" ? "bg-[#ffb12b] text-[#061126]" : "text-white/58"}`}
            >
              Create
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {mode === "create" ? (
            <>
              <Field icon={<UserRound />} label="First name" type="text" placeholder="First name" value={form.firstName} onChange={(value) => updateField("firstName", value)} />
              <Field icon={<UserRound />} label="Last name" type="text" placeholder="Last name" value={form.lastName} onChange={(value) => updateField("lastName", value)} />
            </>
          ) : null}

          {mode !== "success" && mode !== "reset" ? (
            <Field icon={<Mail />} label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(value) => updateField("email", value)} />
          ) : null}

          {mode === "signIn" || mode === "create" || mode === "reset" ? (
            <Field
              icon={<KeyRound />}
              label={mode === "reset" ? "New password" : "Password"}
              type={showPassword ? "text" : "password"}
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
              placeholder={mode === "reset" ? "Confirm new password" : "Confirm password"}
              value={form.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
            />
          ) : null}

          {mode === "verify" ? (
            <Field icon={<ShieldCheck />} label="Verification code" type="text" placeholder="1234" value={form.code} onChange={(value) => updateField("code", value)} />
          ) : null}

          {mode === "signIn" ? (
            <div className="flex items-center justify-between text-[14px]">
              <label className="flex items-center gap-2 text-white/58">
                <span className="grid h-5 w-5 place-items-center rounded border border-rust/45 bg-rust/10 text-[#ffb12b]">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
                Remember me
              </label>
              <button type="button" onClick={() => selectMode("forgot")} className="font-semibold text-[#ffb12b]">
                Forgot?
              </button>
            </div>
          ) : null}

          {mode === "create" ? (
            <button
              type="button"
              onClick={() => updateField("consent", !form.consent)}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-[13px] leading-snug text-white/58"
              aria-pressed={form.consent}
            >
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${form.consent ? "border-[#43ed74]/45 bg-[#43ed74]/12 text-[#43ed74]" : "border-white/15 bg-white/5"}`}>
                {form.consent ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              Use my district, saved ledger, and alerts to personalize Capitol Ledger.
            </button>
          ) : null}

          {mode === "success" ? (
            <div className="rounded-2xl border border-[#43ed74]/25 bg-[#43ed74]/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-[#43ed74]" strokeWidth={1.9} aria-hidden="true" />
              <div className="mt-3 text-[18px] font-semibold text-white">Verification complete</div>
              <p className="mt-2 text-[14px] leading-snug text-white/58">Finish district setup or jump into the demo dashboard with your saved records synced.</p>
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
                onClick={() => void finishProductionAuth("/onboarding")}
                disabled={pending}
                className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[16px] font-semibold text-[#071225]"
              >
                Setup
              </button>
              <button
                type="button"
                onClick={() => void finishProductionAuth(returnTo)}
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)] disabled:opacity-60"
            >
              {mode === "create" ? "Create account" : mode === "forgot" ? "Send reset" : mode === "reset" ? "Update password" : mode === "verify" ? "Verify" : "Continue"}
              <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            </button>
          )}

          {mode === "forgot" || mode === "reset" || mode === "verify" ? (
            <button type="button" onClick={() => selectMode("signIn")} className="w-full text-center text-[14px] font-semibold text-[#ffb12b]">
              Back to sign in
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[12px] uppercase tracking-wide text-white/38">
          <span className="h-px bg-white/10" />
          Secure access
          <span className="h-px bg-white/10" />
        </div>

        {accountCreated && mode === "signIn" ? (
          <button type="button" onClick={useDifferentAccount} className="mt-5 w-full text-center text-[14px] font-semibold text-[#ffb12b]">
            Use a different account
          </button>
        ) : null}

        <div className={`mt-5 grid gap-3 ${accountCreated && !allowAccountCreation ? "grid-cols-1" : "grid-cols-2"}`}>
          <button
            type="button"
            onClick={() => void startDemoAccount(returnTo)}
            disabled={pending}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72 disabled:opacity-60"
          >
            <Fingerprint className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            Face ID
          </button>
          {(!accountCreated || allowAccountCreation) ? (
            <button
              type="button"
              onClick={() => selectMode("create")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72"
            >
              <UserRound className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
              New account
            </button>
          ) : null}
        </div>
      </MobileCard>

      <MobileCard className="mt-5 px-5 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#43ed74]" strokeWidth={1.8} aria-hidden="true" />
          <h2 className="text-[20px] font-medium leading-none">Private by design</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {trustItems.map((item) => (
            <div key={item} className="flex items-center gap-3 text-[15px] text-white/64">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-[#43ed74]/45 text-[#43ed74]">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </MobileCard>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <button type="button" onClick={() => void startDemoAccount(returnTo)} disabled={pending} className="text-[15px] font-semibold text-[#ffb12b] disabled:opacity-60">
          Continue in demo mode
        </button>
        <p className="max-w-xs text-[12px] leading-5 text-white/38">
          Demo mode starts an account session and syncs browser-saved records for investor walkthroughs.
        </p>
      </div>
    </main>
  );
}

function Field({
  icon,
  label,
  onChange,
  placeholder,
  trailing,
  type,
  value
}: {
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
      <span className="text-[14px] font-semibold text-white/58">{label}</span>
      <span className="mt-2 flex h-13 items-center gap-3 rounded-2xl border border-white/10 bg-[#031126]/88 px-4 py-3">
        <span className="text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/38"
        />
        {trailing ? trailing : null}
      </span>
    </label>
  );
}

function PasswordVisibilityButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/54 transition hover:bg-white/8 hover:text-white">
      {active ? <EyeOff className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /> : <Eye className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
    </button>
  );
}
