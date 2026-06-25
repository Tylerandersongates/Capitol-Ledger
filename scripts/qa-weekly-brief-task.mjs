const baseUrl = (
  process.env.WEEKLY_BRIEF_QA_BASE_URL ||
  process.env.AUTH_QA_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3020"
).replace(/\/$/, "");
const taskSecret = process.env.WEEKLY_BRIEF_CRON_SECRET || process.env.CAPITOL_LEDGER_TASK_SECRET || process.env.CRON_SECRET;
const shouldRunLiveDelivery = process.env.WEEKLY_BRIEF_QA_LIVE_RUN === "true";

const results = [];

function record(name, ok, detail = "") {
  results.push({ detail, name, ok });
  const marker = ok ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const data = await response.json().catch(() => ({}));

  return { data, response };
}

function hasRunnerShape(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.configured === "boolean" &&
    typeof data.dryRun === "boolean" &&
    typeof data.eligibleUsers === "number" &&
    Array.isArray(data.records)
  );
}

async function assertStatus(name, path, options, allowedStatuses) {
  const { data, response } = await request(path, options);
  const ok = allowedStatuses.includes(response.status);
  record(name, ok, `status ${response.status}${data.error ? `, ${data.error}` : data.message ? `, ${data.message}` : ""}`);
  return { data, ok, response };
}

function authHeaders() {
  return taskSecret ? { Authorization: `Bearer ${taskSecret}` } : {};
}

async function runSafeChecks() {
  if (taskSecret) {
    await assertStatus("Weekly Brief task rejects missing secret", "/api/tasks/weekly-brief?dryRun=true&limit=1", { method: "GET" }, [401]);
  } else {
    record("Weekly Brief task rejects missing secret", true, "skipped; set WEEKLY_BRIEF_CRON_SECRET for deployed QA");
  }

  const dryRun = await assertStatus(
    "Weekly Brief task dry run is production-shaped",
    "/api/tasks/weekly-brief?dryRun=true&limit=5",
    {
      headers: authHeaders(),
      method: "GET"
    },
    [200, 503]
  );

  if (dryRun.ok && dryRun.response.status === 200) {
    record("Weekly Brief task returns runner shape", hasRunnerShape(dryRun.data), `eligible users ${dryRun.data.eligibleUsers ?? "unknown"}`);
  } else if (dryRun.response.status === 503) {
    record("Weekly Brief task returns runner shape", true, "skipped because database is not configured");
  }
}

async function runLiveDeliveryCheck() {
  if (!taskSecret) {
    record("Weekly Brief live delivery run", false, "WEEKLY_BRIEF_CRON_SECRET is required");
    return;
  }

  const liveRun = await assertStatus(
    "Weekly Brief live delivery run",
    "/api/tasks/weekly-brief",
    {
      body: {
        dryRun: false,
        limit: 5
      },
      headers: authHeaders(),
      method: "POST"
    },
    [200, 503]
  );

  if (liveRun.ok && liveRun.response.status === 200) {
    record(
      "Weekly Brief live delivery records outcome",
      hasRunnerShape(liveRun.data),
      `${liveRun.data.delivered ?? 0} sent, ${liveRun.data.prepared ?? 0} queued, ${liveRun.data.failed ?? 0} failed`
    );
  }
}

async function main() {
  console.log(`Running Capitol Ledger CE Weekly Brief task QA against ${baseUrl}`);
  await runSafeChecks();

  if (shouldRunLiveDelivery) {
    await runLiveDeliveryCheck();
  } else {
    record("Weekly Brief live delivery run", true, "skipped; set WEEKLY_BRIEF_QA_LIVE_RUN=true to write delivery records");
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    console.error(`Weekly Brief task QA failed ${failures.length} check(s).`);
    process.exit(1);
  }

  console.log("Weekly Brief task QA checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
