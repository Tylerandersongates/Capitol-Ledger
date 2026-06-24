"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SuggestionKind = "members" | "bills" | "votes";

type SearchSuggestion = {
  href: string;
  id: string;
  kind: SuggestionKind;
  label: string;
  subtitle: string;
};

type DiscoverySearchFormProps = {
  activeType: string;
  chamber?: string;
  focus?: string;
  party?: string;
  query: string;
  status?: string;
  state?: string | string[];
};

const suggestionKindLabel: Record<SuggestionKind, string> = {
  bills: "Bill",
  members: "Official",
  votes: "Vote"
};

export function DiscoverySearchForm({ activeType, chamber, focus, party, query, status, state }: DiscoverySearchFormProps) {
  const [inputValue, setInputValue] = useState(query);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  const blurTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const trimmedQuery = inputValue.trim();

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          type: activeType === "all" ? "all" : activeType,
          limit: "8"
        });

        const response = await fetch(`/api/search/suggest?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const payload = (await response.json()) as { suggestions?: SearchSuggestion[] };
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 170);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      setLoading(false);
    };
  }, [activeType, trimmedQuery]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    },
    []
  );

  const showDropdown = useMemo(
    () => isFocused && trimmedQuery.length >= 2 && (loading || suggestions.length > 0),
    [isFocused, loading, suggestions.length, trimmedQuery.length]
  );

  return (
    <div className="relative">
      <form action="/search" className="flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.76)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.24)]">
        <Search className="h-6 w-6 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
        <input
          name="q"
          value={inputValue}
          onBlur={() => {
            blurTimeoutRef.current = window.setTimeout(() => setIsFocused(false), 120);
          }}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => {
            if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
            setIsFocused(true);
          }}
          placeholder="Search bills, officials, votes..."
          className="min-w-0 flex-1 bg-transparent text-[17px] text-white outline-none placeholder:text-white/42"
          autoComplete="off"
          spellCheck={false}
        />
        <input type="hidden" name="type" value={activeType} />
        {focus ? <input type="hidden" name="focus" value={focus} /> : null}
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {chamber ? <input type="hidden" name="chamber" value={chamber} /> : null}
        {party ? <input type="hidden" name="party" value={party} /> : null}
        {Array.isArray(state)
          ? state.map((stateCode) => <input key={stateCode} type="hidden" name="state" value={stateCode} />)
          : state
            ? <input type="hidden" name="state" value={state} />
            : null}
        <button type="submit" className="rounded-xl bg-[linear-gradient(180deg,#ffe06a_0%,#ffb12b_100%)] px-4 py-2 text-[14px] font-semibold text-[#061126] shadow-[0_8px_20px_rgba(255,177,43,0.18)] transition hover:brightness-105">
          Search
        </button>
      </form>

      {showDropdown ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,39,74,0.98)_0%,rgba(5,18,42,0.98)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_38px_rgba(1,8,24,0.52)] backdrop-blur-xl">
          {loading ? (
            <div className="px-3 py-2 text-[13px] text-white/52">Finding matches...</div>
          ) : (
            <ul className="space-y-1" role="listbox" aria-label="Closest search suggestions">
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.kind}-${suggestion.id}`}>
                  <Link
                    href={suggestion.href}
                    onMouseDown={(event) => event.preventDefault()}
                    className="flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2 hover:border-white/10 hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-white">{suggestion.label}</span>
                      <span className="mt-1 block truncate text-[12px] text-white/50">{suggestion.subtitle}</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#ffb12b]">
                      {suggestionKindLabel[suggestion.kind]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
