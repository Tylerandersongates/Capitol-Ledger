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
  party?: string;
  query: string;
  state?: string;
};

const suggestionKindLabel: Record<SuggestionKind, string> = {
  bills: "Bill",
  members: "Official",
  votes: "Vote"
};

export function DiscoverySearchForm({ activeType, chamber, party, query, state }: DiscoverySearchFormProps) {
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
      <form action="/search" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#031126]/88 px-4 py-3">
        <Search className="h-6 w-6 shrink-0 text-white/52" strokeWidth={1.8} aria-hidden="true" />
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
        {chamber ? <input type="hidden" name="chamber" value={chamber} /> : null}
        {party ? <input type="hidden" name="party" value={party} /> : null}
        {state ? <input type="hidden" name="state" value={state} /> : null}
        <button type="submit" className="rounded-xl bg-[#ffb12b] px-4 py-2 text-[14px] font-semibold text-[#061126]">
          Go
        </button>
      </form>

      {showDropdown ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-white/10 bg-[#031126] p-2 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
          {loading ? (
            <div className="px-3 py-2 text-[13px] text-white/52">Finding closest matches...</div>
          ) : (
            <ul className="space-y-1" role="listbox" aria-label="Closest search suggestions">
              {suggestions.map((suggestion) => (
                <li key={`${suggestion.kind}-${suggestion.id}`}>
                  <Link
                    href={suggestion.href}
                    onMouseDown={(event) => event.preventDefault()}
                    className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.05]"
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
