"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type SearchBoxProps = {
  initialValue?: string;
  compact?: boolean;
};

export function SearchBox({ initialValue = "", compact = false }: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`glass-card flex w-full items-center gap-2 rounded-lg p-2 ${compact ? "max-w-2xl" : "max-w-3xl"}`}
    >
      <Search className="ml-2 h-5 w-5 shrink-0 text-brass" aria-hidden="true" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search senator, representative, bill, or keyword"
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base text-white outline-none placeholder:text-blue-100/45"
        aria-label="Search Capitol Ledger"
      />
      <button
        type="submit"
        className="focus-ring inline-flex h-11 items-center justify-center rounded-md bg-gradient-to-r from-civic to-aurora px-4 text-sm font-semibold text-white shadow-glow hover:from-brass hover:to-rust hover:text-ink"
      >
        Search
      </button>
    </form>
  );
}
