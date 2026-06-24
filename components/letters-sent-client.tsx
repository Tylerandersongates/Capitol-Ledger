"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Mail, Megaphone, Search, UserRound } from "lucide-react";
import {
  hydrateSentLetters,
  readLocalSentLetters,
  sentLettersChangedEvent,
  type SentLetterRecord
} from "@/lib/browser-letter-history";
import {
  hydrateSignedPetitions,
  readLocalSignedPetitions,
  signedPetitionsChangedEvent,
  type BrowserSignedPetitionRecord
} from "@/lib/browser-petition-history";

const panelClass =
  "rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,70,126,0.3)_0%,rgba(6,22,48,0.74)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_30px_rgba(1,8,24,0.32)]";

function formatOffice(record: SentLetterRecord) {
  const office = record.memberChamber ?? "Official";
  const district = record.memberDistrict ? `-${record.memberDistrict}` : "";
  const state = record.memberState ? `, ${record.memberState}${district}` : "";
  return `${office}${state}`;
}

function formatLedgerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

function getLastActivityLabel(letters: SentLetterRecord[], petitions: BrowserSignedPetitionRecord[]) {
  const activityTimes = [
    ...letters.map((letter) => letter.confirmedAt ?? letter.sentAt),
    ...petitions.map((petition) => petition.signedAt)
  ].sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  if (!activityTimes[0]) return "No activity";
  return formatLedgerDate(activityTimes[0]);
}

export function LettersSentClient() {
  const [letters, setLetters] = useState<SentLetterRecord[]>(() => readLocalSentLetters());
  const [lettersLoading, setLettersLoading] = useState(true);
  const [petitions, setPetitions] = useState<BrowserSignedPetitionRecord[]>(() => readLocalSignedPetitions());
  const [petitionsLoading, setPetitionsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function refreshLetters() {
      const records = await hydrateSentLetters();
      if (active) {
        setLetters(records);
        setLettersLoading(false);
      }
    }

    void refreshLetters();
    window.addEventListener(sentLettersChangedEvent, refreshLetters);
    window.addEventListener("focus", refreshLetters);
    window.addEventListener("pageshow", refreshLetters);
    window.addEventListener("storage", refreshLetters);

    return () => {
      active = false;
      window.removeEventListener(sentLettersChangedEvent, refreshLetters);
      window.removeEventListener("focus", refreshLetters);
      window.removeEventListener("pageshow", refreshLetters);
      window.removeEventListener("storage", refreshLetters);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshPetitions() {
      const records = await hydrateSignedPetitions();
      if (active) {
        setPetitions(records);
        setPetitionsLoading(false);
      }
    }

    void refreshPetitions();
    window.addEventListener(signedPetitionsChangedEvent, refreshPetitions);
    window.addEventListener("focus", refreshPetitions);
    window.addEventListener("pageshow", refreshPetitions);
    window.addEventListener("storage", refreshPetitions);

    return () => {
      active = false;
      window.removeEventListener(signedPetitionsChangedEvent, refreshPetitions);
      window.removeEventListener("focus", refreshPetitions);
      window.removeEventListener("pageshow", refreshPetitions);
      window.removeEventListener("storage", refreshPetitions);
    };
  }, []);

  const sentCount = useMemo(() => letters.filter((letter) => letter.deliveryStatus === "sent").length, [letters]);
  const preparedCount = Math.max(0, letters.length - sentCount);
  const totalActions = letters.length + petitions.length;
  const lastActivity = getLastActivityLabel(letters, petitions);

  return (
    <div className="space-y-4">
      <section className={`${panelClass} overflow-hidden px-4 py-4`}>
        <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/46">Action history</div>
            <div className="mt-2 text-[34px] font-medium leading-none text-[#ffb12b]">{totalActions}</div>
            <div className="mt-2 text-[13px] leading-snug text-white/56">
              {totalActions === 1 ? "Tracked record" : "Tracked records"}
            </div>
          </div>
          <div className="relative grid h-[92px] w-[92px] place-items-center rounded-full border border-[#ffb12b]/26 bg-[radial-gradient(circle,rgba(255,177,43,0.14)_0%,rgba(33,127,194,0.18)_46%,rgba(4,18,42,0.94)_76%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_26px_rgba(255,177,43,0.16)]">
            <span className="absolute inset-2 rounded-full border border-white/10" />
            <Mail className="h-10 w-10 text-[#ffca4b]" strokeWidth={1.7} aria-hidden="true" />
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-[#071225] bg-[#9563d5] text-white shadow-[0_8px_18px_rgba(1,8,24,0.35)]">
              <Megaphone className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryPill label="Messages" value={letters.length} tone="green" />
          <SummaryPill label="Comments" value={petitions.length} tone="purple" />
          <SummaryPill label="Latest" value={lastActivity} tone="blue" />
        </div>
      </section>

      <section id="letters" className={`${panelClass} scroll-mt-6 px-3 py-3`}>
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[21px] font-medium leading-none text-white">Messages to officials</h2>
          <Link
            href="/search?type=members"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.045] px-3 text-[12px] font-medium text-[#ffb12b]"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Find official
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-white/40">
          <span>{sentCount} sent</span>
          <span className="h-1 w-1 rounded-full bg-white/24" />
          <span>{preparedCount} prepared</span>
        </div>

        {lettersLoading && letters.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-5 text-[14px] text-white/54">Loading message history...</div>
        ) : letters.length ? (
          <div className="mt-3 space-y-2">
            {letters.map((letter) => (
              <LetterRow key={letter.id} letter={letter} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-5">
            <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/[0.045] text-[#ffb12b]">
                <Mail className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-white">No messages tracked yet</div>
                <p className="mt-1 text-[13px] leading-snug text-white/54">
                  Messages to your officials appear here after a draft is prepared or marked sent.
                </p>
              </div>
            </div>
            <Link
              href="/search?type=members"
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] text-[14px] font-semibold text-[#ffb12b]"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Find officials
            </Link>
          </div>
        )}
      </section>

      <section id="petitions" className={`${panelClass} scroll-mt-6 px-3 py-3`}>
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[21px] font-medium leading-none text-white">Completed public comments</h2>
          <Link
            href="/petitions"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.045] px-3 text-[12px] font-medium text-[#d5b8ff]"
          >
            <Megaphone className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Open
          </Link>
        </div>

        {petitionsLoading && petitions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-5 text-[14px] text-white/54">Loading public comments...</div>
        ) : petitions.length ? (
          <div className="mt-3 space-y-2">
            {petitions.map((petition) => (
              <PetitionRow key={petition.petitionId} petition={petition} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-5">
            <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#9563d5]/24 bg-[#9563d5]/12 text-[#d5b8ff]">
                <Megaphone className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-white">No public comments recorded yet</div>
                <p className="mt-1 text-[13px] leading-snug text-white/54">
                  Public comments marked complete on the Civic actions page appear here.
                </p>
              </div>
            </div>
            <Link
              href="/petitions"
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#9563d5]/18 bg-[#9563d5]/10 text-[14px] font-semibold text-[#d5b8ff]"
            >
              <Megaphone className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Open civic actions
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryPill({ label, tone, value }: { label: string; tone: "blue" | "gold" | "green" | "purple"; value: number | string }) {
  const toneClass = tone === "green" ? "text-[#74f49a]" : tone === "gold" ? "text-[#ffbd39]" : tone === "purple" ? "text-[#d5b8ff]" : "text-[#74a7ff]";

  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-2.5 py-2">
      <div className={`truncate text-[16px] font-medium leading-none ${toneClass}`}>{value}</div>
      <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-white/46">{label}</div>
    </div>
  );
}

function LetterRow({ letter }: { letter: SentLetterRecord }) {
  const statusSent = letter.deliveryStatus === "sent";
  const statusClass = statusSent
    ? "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#74f49a]"
    : "border-[#ffbd39]/24 bg-[#ffbd39]/10 text-[#ffcf63]";
  const StatusIcon = statusSent ? CheckCircle2 : Clock3;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#08214a] text-[#ffb12b]">
          <Mail className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold leading-tight text-white">{letter.memberName}</div>
          <div className="mt-1 truncate text-[12px] text-white/48">{formatOffice(letter)}</div>
        </div>
        <span className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold ${statusClass}`}>
          <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {statusSent ? "Sent" : "Prepared"}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-[#03152f]/64 px-3 py-2">
        <div className="line-clamp-2 text-[13px] font-medium leading-snug text-white/76">{letter.subject}</div>
        {letter.messagePreview ? <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/46">{letter.messagePreview}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12px] text-white/42">{formatLedgerDate(letter.confirmedAt ?? letter.sentAt)}</span>
        <div className="flex items-center gap-2">
          {letter.contactUrl ? (
            <a
              href={letter.contactUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] font-medium text-white/62"
            >
              Contact form
              <ExternalLink className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
            </a>
          ) : null}
          <Link
            href={`/members/${letter.memberBioguideId}`}
            className="inline-flex h-8 items-center rounded-full border border-[#ffb12b]/22 bg-[#ffb12b]/8 px-3 text-[12px] font-medium text-[#ffc75a]"
          >
            Official profile
          </Link>
        </div>
      </div>
    </article>
  );
}

function PetitionRow({ petition }: { petition: BrowserSignedPetitionRecord }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#9563d5]/20 bg-[#9563d5]/12 text-[#d5b8ff]">
          <Megaphone className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-[16px] font-semibold leading-tight text-white">{petition.title}</div>
          <div className="mt-1 truncate text-[12px] text-white/48">{petition.progressLabel ?? "Public comment"}</div>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-2 text-[11px] font-semibold text-[#74f49a]">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Commented
        </span>
      </div>

      {petition.body ? (
        <div className="mt-3 rounded-xl border border-white/8 bg-[#03152f]/64 px-3 py-2">
          <p className="line-clamp-2 text-[12px] leading-snug text-white/52">{petition.body}</p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[12px] text-white/42">{formatLedgerDate(petition.signedAt)}</span>
        <Link
          href="/petitions"
          className="inline-flex h-8 items-center rounded-full border border-[#9563d5]/22 bg-[#9563d5]/10 px-3 text-[12px] font-medium text-[#d5b8ff]"
        >
          Open
        </Link>
      </div>
    </article>
  );
}
