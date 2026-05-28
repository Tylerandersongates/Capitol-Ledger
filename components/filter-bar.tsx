import { Filter } from "lucide-react";

type FilterBarProps = {
  q?: string;
  type?: string;
  chamber?: string;
  party?: string;
  state?: string;
};

export function FilterBar({ q = "", type = "all", chamber = "", party = "", state = "" }: FilterBarProps) {
  return (
    <form action="/search" className="glass-card grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_150px_150px_150px_96px_auto]">
      <label className="flex min-w-0 items-center gap-2 rounded-md border border-brass/15 bg-white/7 px-3">
        <Filter className="h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Keyword, official, bill"
          className="min-w-0 flex-1 bg-transparent py-3 text-white outline-none placeholder:text-blue-100/45"
        />
      </label>
      <select name="type" defaultValue={type} className="focus-ring rounded-md border border-brass/15 bg-ink px-3 py-3 text-white">
        <option value="all">All records</option>
        <option value="members">Members</option>
        <option value="bills">Bills</option>
        <option value="votes">Votes</option>
      </select>
      <select
        name="chamber"
        defaultValue={chamber}
        className="focus-ring rounded-md border border-brass/15 bg-ink px-3 py-3 text-white"
      >
        <option value="">Any chamber</option>
        <option value="House">House</option>
        <option value="Senate">Senate</option>
      </select>
      <select name="party" defaultValue={party} className="focus-ring rounded-md border border-brass/15 bg-ink px-3 py-3 text-white">
        <option value="">Any party</option>
        <option value="Democrat">Democrat</option>
        <option value="Republican">Republican</option>
        <option value="Independent">Independent</option>
      </select>
      <input
        name="state"
        defaultValue={state}
        placeholder="State"
        maxLength={2}
        className="focus-ring rounded-md border border-brass/15 bg-ink px-3 py-3 uppercase text-white placeholder:normal-case placeholder:text-blue-100/45"
      />
      <button
        type="submit"
        className="focus-ring inline-flex h-12 items-center justify-center rounded-md bg-gradient-to-r from-brass to-rust px-4 text-sm font-semibold text-ink shadow-glow"
      >
        Apply
      </button>
    </form>
  );
}
