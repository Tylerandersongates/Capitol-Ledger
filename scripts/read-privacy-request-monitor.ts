#!/usr/bin/env node

import { readPrivacyRequestMonitor } from "@/lib/privacy-request-monitor";

readPrivacyRequestMonitor()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Privacy request monitor failed."}\n`);
    process.exitCode = 1;
  });
