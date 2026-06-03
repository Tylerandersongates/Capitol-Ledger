from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Capitol Ledger App" / "Capitol Ledger Backend Setup Recommendations.pdf"


def p(text, style):
    return Paragraph(text, style)


def bullet_items(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=10) for item in items],
        bulletType="bullet",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=7,
        bulletColor=colors.HexColor("#c8912b"),
    )


def numbered_items(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=10) for item in items],
        bulletType="1",
        start="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
        bulletColor=colors.HexColor("#c8912b"),
    )


def add_heading(story, text, styles):
    story.append(Spacer(1, 0.14 * inch))
    story.append(p(text, styles["SectionHeading"]))
    story.append(Spacer(1, 0.06 * inch))


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        rightMargin=0.62 * inch,
        leftMargin=0.62 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.52 * inch,
        title="Capitol Ledger Backend Setup Recommendations",
        author="Capitol Ledger",
    )

    base = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "CapitolTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#071528"),
            spaceAfter=6,
            alignment=TA_LEFT,
        ),
        "Subtitle": ParagraphStyle(
            "CapitolSubtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#41516a"),
            spaceAfter=12,
        ),
        "SectionHeading": ParagraphStyle(
            "CapitolSectionHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0a2342"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "CapitolBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12.3,
            textColor=colors.HexColor("#172033"),
            spaceAfter=6,
        ),
        "Small": ParagraphStyle(
            "CapitolSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.4,
            leading=10.4,
            textColor=colors.HexColor("#344054"),
        ),
        "TableHeader": ParagraphStyle(
            "CapitolTableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.7,
            leading=9.8,
            textColor=colors.white,
        ),
        "TableText": ParagraphStyle(
            "CapitolTableText",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.35,
            leading=9.6,
            textColor=colors.HexColor("#172033"),
        ),
        "TableBold": ParagraphStyle(
            "CapitolTableBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.45,
            leading=9.7,
            textColor=colors.HexColor("#0a2342"),
        ),
        "Callout": ParagraphStyle(
            "CapitolCallout",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#0a2342"),
        ),
    }

    story = []
    story.append(p("Capitol Ledger Backend Setup Recommendations", styles["Title"]))
    story.append(
        p(
            "Reference guide for outside services needed to move Capitol Ledger from demo mode toward production. Updated May 22, 2026.",
            styles["Subtitle"],
        )
    )

    recommendation = Table(
        [[p("Recommended Starter Stack", styles["Callout"])], [p("Vercel + Neon Postgres + Resend + Stripe + Vercel Cron + Upstash Redis + OpenAI API + Congress.gov API + Vercel Observability.", styles["Body"])]],
        colWidths=[7.25 * inch],
    )
    recommendation.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f6f8fb")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#d7dde8")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(recommendation)

    add_heading(story, "Best Starter Stack", styles)
    stack_rows = [
        ["Backend Need", "Recommendation", "Why"],
        ["App hosting", "Vercel", "Best fit for Next.js, environment variables, preview deployments, logs, and cron jobs."],
        ["Database", "Neon Postgres", "Managed Postgres that works well with Prisma. Branching helps test migrations safely."],
        ["Database alternative", "Supabase Postgres", "Good dashboard and backup tooling if you want a broader backend platform."],
        ["Auth email", "Resend", "Simple developer email API for verification, reset links, and future briefs."],
        ["Email alternative", "Postmark", "Strong transactional reliability if deliverability becomes the top priority."],
        ["Subscriptions", "Stripe", "Already matches Capitol Ledger checkout and webhook architecture."],
        ["Weekly Brief schedule", "Vercel Cron", "Simplest if hosting the app on Vercel."],
        ["Rate limiting", "Upstash Redis", "Good fit for auth, password reset, checkout, AI, and public API abuse protection."],
        ["AI analysis", "OpenAI API", "Best fit for bill summaries, policy lens, and plain-language pros/cons."],
        ["Government data", "Congress.gov API", "Official source for federal bills, members, committees, and summaries."],
        ["Monitoring", "Vercel Observability first", "Start simple. Add Sentry later if errors need deeper tracing."],
    ]
    table_data = [[p(cell, styles["TableHeader"]) for cell in stack_rows[0]]]
    for row in stack_rows[1:]:
        table_data.append([p(row[0], styles["TableBold"]), p(row[1], styles["TableText"]), p(row[2], styles["TableText"])])
    table = Table(table_data, colWidths=[1.42 * inch, 1.55 * inch, 4.28 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a2342")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#ffffff")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7dde8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)

    add_heading(story, "Recommended Setup Order", styles)
    story.append(
        numbered_items(
            [
                "Create the hosted Postgres database, then run the checked-in Prisma migration and `pnpm production-auth:check`.",
                "Deploy the app with HTTPS and configure core environment variables: `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, and `AUTH_COOKIE_SECURE=true`.",
                "Connect auth email through the existing webhook bridge and test verification plus password reset flows.",
                "Add the Congress.gov API key and schedule live data sync after the database is ready.",
                "Create Stripe products and prices for Pro monthly, Pro annual, Civic Team monthly, and Civic Team annual.",
                "Configure the Stripe webhook endpoint at `/api/billing/stripe/webhook`, then run `BILLING_REQUIRE_STRIPE=true pnpm billing:check`.",
                "Connect Weekly Brief delivery through the webhook bridge, add the scheduler, and run `pnpm weekly-brief:check` plus `pnpm weekly-brief:qa`.",
                "Add Upstash Redis for persistent rate limiting before heavier public traffic.",
                "Add OpenAI API once the live bill record/source pipeline is ready for generated summaries and policy analysis.",
                "Add deeper monitoring, backups, and restore drills before launch.",
            ],
            styles["Body"],
        )
    )

    add_heading(story, "Environment Checklist", styles)
    env_rows = [
        ["Area", "Important variables"],
        ["Core app", "`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_SECRET`, `AUTH_COOKIE_SECURE`"],
        ["Auth email", "`AUTH_EMAIL_DELIVERY`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_WEBHOOK_URL`, `AUTH_EMAIL_WEBHOOK_SECRET`"],
        ["Government data", "`CONGRESS_API_KEY`, `CONGRESS_SYNC_CONGRESS`, `CONGRESS_SYNC_LIMIT`, `CONGRESS_SYNC_WRITE`"],
        ["Stripe billing", "`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, four `CAPITOL_LEDGER_STRIPE_*_PRICE_ID` values"],
        ["Weekly Brief", "`WEEKLY_BRIEF_DELIVERY`, `WEEKLY_BRIEF_FROM`, `WEEKLY_BRIEF_WEBHOOK_URL`, `WEEKLY_BRIEF_WEBHOOK_SECRET`, `WEEKLY_BRIEF_CRON_SECRET`"],
        ["Future hardening", "`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `OPENAI_API_KEY`, `SENTRY_DSN`"],
    ]
    env_table = Table(
        [[p(cell, styles["TableHeader"]) for cell in env_rows[0]]]
        + [[p(row[0], styles["TableBold"]), p(row[1], styles["TableText"])] for row in env_rows[1:]],
        colWidths=[1.55 * inch, 5.7 * inch],
        repeatRows=1,
    )
    env_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a2342")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7dde8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(env_table)

    add_heading(story, "Validation Commands", styles)
    story.append(
        bullet_items(
            [
                "`pnpm production-auth:check` confirms required production database tables and columns.",
                "`pnpm production-auth:qa` checks deployed auth behavior safely.",
                "`pnpm auth-email:check` checks verification and password-reset email provider readiness.",
                "`pnpm weekly-brief:check` checks Weekly Brief provider and scheduler settings.",
                "`pnpm weekly-brief:qa` checks the scheduled brief task route.",
                "`pnpm billing:check` checks Stripe/database readiness before live checkout testing.",
                "`pnpm backend:check` gives one consolidated outside-service setup snapshot.",
                "`pnpm congress:check` checks Congress.gov key, sync settings, and civic-data schema readiness.",
            ],
            styles["Body"],
        )
    )

    add_heading(story, "What Can Wait", styles)
    story.append(
        bullet_items(
            [
                "RevenueCat or App Store subscription plumbing can wait until native iOS work begins.",
                "Sentry can wait until Vercel Observability is not enough.",
                "AI analysis should wait until official bill text, CRS summaries, votes, and source links are reliably synced.",
                "A separate job platform can wait until Vercel Cron is no longer enough.",
            ],
            styles["Body"],
        )
    )

    add_heading(story, "Reference Links", styles)
    story.append(
        bullet_items(
            [
                "Vercel environment variables: https://vercel.com/docs/environment-variables",
                "Vercel cron jobs: https://vercel.com/docs/cron-jobs/manage-cron-jobs",
                "Neon Postgres: https://neon.com/",
                "Supabase backups: https://supabase.com/docs/guides/platform/backups",
                "Resend docs: https://resend.com/docs",
                "Postmark webhooks: https://postmarkapp.com/developer/api/webhooks-api",
                "Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions",
                "Stripe subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks",
                "Congress.gov API: https://api.congress.gov/",
                "Upstash rate limiting: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview",
                "OpenAI API pricing: https://openai.com/api/pricing/",
                "Vercel Observability: https://vercel.com/docs/observability",
            ],
            styles["Small"],
        )
    )

    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    main()
