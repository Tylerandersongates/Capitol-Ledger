-- Add reviewer release triage for beta feedback.
ALTER TABLE "BetaFeedback" ADD COLUMN IF NOT EXISTS "releaseDecision" TEXT;

CREATE INDEX IF NOT EXISTS "BetaFeedback_releaseDecision_idx" ON "BetaFeedback"("releaseDecision");
