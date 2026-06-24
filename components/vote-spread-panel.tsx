type VoteSpreadTotals = {
  no: number;
  notVoting: number;
  yes: number;
};

type VoteSegmentTone = "no" | "notVoting" | "yes";

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return `rgba(255,255,255,${alpha})`;

  const value = Number.parseInt(hex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildVoteSegments(totals: VoteSpreadTotals, segmentCount = 40) {
  const total = Math.max(1, totals.yes + totals.no + totals.notVoting);
  const rawCounts = [totals.yes, totals.no, totals.notVoting].map((value) => (value / total) * segmentCount);
  const segmentCounts = rawCounts.map((value) => Math.floor(value));
  let remaining = Math.max(0, segmentCount - segmentCounts.reduce((sum, value) => sum + value, 0));

  const order = rawCounts
    .map((value, index) => ({
      index,
      remainder: value - segmentCounts[index],
      value
    }))
    .sort((left, right) => right.remainder - left.remainder || right.value - left.value);

  let cursor = 0;
  while (remaining > 0 && order.length > 0) {
    segmentCounts[order[cursor % order.length].index] += 1;
    cursor += 1;
    remaining -= 1;
  }

  const [yesSegments, noSegments, notVotingSegments] = segmentCounts;
  const segments: VoteSegmentTone[] = [];
  for (let index = 0; index < yesSegments; index += 1) segments.push("yes");
  for (let index = 0; index < noSegments; index += 1) segments.push("no");
  for (let index = 0; index < notVotingSegments; index += 1) segments.push("notVoting");

  return segments.slice(0, segmentCount).map((tone, index) => {
    const color = tone === "yes" ? "#2ee596" : tone === "no" ? "#ff6b5f" : "#97a1b5";
    return {
      color,
      key: `${tone}-${index}`,
      tone
    };
  });
}

export function VoteSpreadPanel({
  centerLabel = "Vote split",
  className = "",
  noLabel = "No",
  totals,
  yesLabel = "Yes"
}: {
  centerLabel?: string;
  className?: string;
  noLabel?: string;
  totals: VoteSpreadTotals;
  yesLabel?: string;
}) {
  const segments = buildVoteSegments(totals);
  const total = Math.max(1, totals.yes + totals.no + totals.notVoting);
  const yesShare = (totals.yes / total) * 100;
  const noShare = (totals.no / total) * 100;
  const notVotingShare = (totals.notVoting / total) * 100;

  return (
    <div className={`rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.24)_0%,rgba(7,23,50,0.72)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_24px_rgba(2,10,28,0.36)] ${className}`}>
      <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
        <div>
          <div className="text-[24px] font-medium leading-none text-[#2ee596]">{totals.yes}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/56">
            {yesLabel}
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-[#2ee596]/55 text-[9px] text-[#2ee596]">✓</span>
          </div>
        </div>
        <div className="text-center text-[11px] font-medium uppercase tracking-wide text-white/44">
          {centerLabel}
        </div>
        <div className="text-right">
          <div className="text-[24px] font-medium leading-none text-[#ff6b5f]">{totals.no}</div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/56">
            {noLabel}
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-white/30 text-[9px] text-white/54">×</span>
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-white/8 bg-[#071a38]/65 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_16px_rgba(2,9,25,0.5)]">
        <div className="grid grid-cols-[repeat(40,minmax(0,1fr))] gap-1">
          {segments.map((segment) => (
            <span
              key={segment.key}
              className="h-[8px] rounded-full"
              style={{
                backgroundColor: segment.color,
                boxShadow: `0 1px 0 ${withAlpha("#ffffff", 0.12)}, 0 2px 5px ${withAlpha(segment.color, 0.38)}`
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 text-center text-[10px] font-medium uppercase tracking-[0.06em] text-white/52">
        <div>{yesShare.toFixed(0)}% {yesLabel}</div>
        <div>{notVotingShare.toFixed(0)}% Not Voting</div>
        <div>{noShare.toFixed(0)}% {noLabel}</div>
      </div>
    </div>
  );
}
