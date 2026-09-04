import { ArrowUpRight, BookOpen, Video, Youtube } from "lucide-react";
import { MobileCard } from "@/components/mobile-ui";
import { publicBrandName } from "@/lib/brand";
import { formatDailyBriefVideoDate, type DailyBriefVideoPageData } from "@/lib/daily-brief-video";

export function DailyBriefVideo({ data }: { data: DailyBriefVideoPageData }) {
  const { episode, embedUrl, watchUrl, subscribeUrl } = data;

  return (
    <>
      <MobileCard variant="dashboard" className="overflow-hidden px-5 py-5">
        <div className="flex items-center gap-2 text-[14px] font-medium text-[#ffb12b]">
          <Youtube className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{publicBrandName}</span>
        </div>
        {episode ? (
          <div className="mb-5 mt-3">
            <p className="text-[13px] text-white/55">Latest edition · {formatDailyBriefVideoDate(episode.publishedAt)}</p>
            <h2 className="mt-2 text-[24px] font-medium leading-tight text-white">{episode.title}</h2>
          </div>
        ) : null}

        <div className={`mx-auto mt-4 min-h-[200px] w-full overflow-hidden rounded-2xl border border-white/15 bg-[#020914] ${episode?.format === "video" ? "aspect-video" : "aspect-[9/16] max-w-[225px]"}`}>
          {episode && embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${episode.title} — ${publicBrandName} Daily Brief`}
              className="h-full min-h-[200px] w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 py-5 text-center">
              <span className="mb-4 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/30 bg-[#ffb12b]/10 text-[#ffb12b]">
                <Video className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h2 className="text-[22px] font-medium leading-tight text-white">First video coming soon</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-white/60">
                What happened, why it matters, and what to watch next.
              </p>
              <span className="mt-4 rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-white/70">No subscription required</span>
            </div>
          )}
        </div>

        {watchUrl || subscribeUrl ? (
          <div className="mt-5 grid gap-3">
            {watchUrl ? (
              <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffb12b] px-4 py-3 text-[16px] font-semibold text-[#071225]">
                Watch on YouTube <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </a>
            ) : null}
            {subscribeUrl ? (
              <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white">
                Subscribe on YouTube <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
        {episode ? <p className="mt-4 text-[13px] leading-relaxed text-white/50">Press play to watch here, or open YouTube to join the conversation. YouTube&apos;s privacy policy applies to playback.</p> : null}
      </MobileCard>

      <details className="group rounded-[1.35rem] border border-white/15 bg-white/[0.035] px-5 py-4 text-white">
        <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-medium">
          <span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[#ffb12b]" aria-hidden="true" /> Transcript &amp; sources</span>
          <span className="text-[14px] text-white/50 group-open:hidden">Show</span>
          <span className="hidden text-[14px] text-white/50 group-open:inline">Hide</span>
        </summary>
        <div className="mt-4 space-y-5 border-t border-white/10 pt-4">
          <section>
            <h3 className="text-[16px] font-medium">Transcript</h3>
            <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-white/65">
              {episode?.transcript.length ? episode.transcript.map((paragraph, index) => <p key={index}>{paragraph}</p>) : (
                <p>{episode ? "The transcript for this edition has not been published yet." : "The transcript will be published with the first video."}</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="text-[16px] font-medium">Sources for this edition</h3>
            {episode?.sources.length ? (
              <ul className="mt-3 space-y-3">
                {episode.sources.map((source) => (
                  <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[16px] text-[#ffb12b] underline decoration-[#ffb12b]/40 underline-offset-4">{source.label}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a></li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[16px] leading-relaxed text-white/65">{episode ? "Source links for this edition have not been published yet." : "Official records and supporting coverage will appear here with each edition."}</p>}
          </section>
        </div>
      </details>
    </>
  );
}
