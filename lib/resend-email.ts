type ResendSendInput = {
  from: string;
  subject: string;
  text: string;
  to: string;
};

type ResendSendResult = {
  id: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;

function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim();
}

export function hasResendApiKey() {
  return Boolean(resendApiKey());
}

export async function sendEmailWithResend(input: ResendSendInput): Promise<ResendSendResult> {
  const apiKey = resendApiKey();
  if (!apiKey) throw new Error("RESEND_API_KEY is required when delivery mode is resend.");

  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({
      from: input.from,
      subject: input.subject,
      text: input.text,
      to: [input.to]
    }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Resend delivery failed with status ${response.status}.`);
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<ResendSendResult>;
  return { id: payload.id ?? "queued" };
}
