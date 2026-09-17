import { MobileShell } from "@/components/mobile-shell";

export function ScreenLoading({ label }: { label: string }) {
  return (
    <MobileShell contentClassName="px-8 pb-8 pt-8" minHeight="min-h-[100dvh]">
      <div className="mt-12" role="status" aria-live="polite">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb12b]">CapitolWonk</p>
        <h1 className="mt-2 text-[24px] font-semibold text-white">{label}</h1>
        <div className="mt-8 space-y-4 animate-pulse motion-reduce:animate-none" aria-hidden="true">
          <div className="h-24 rounded-[1.35rem] border border-white/10 bg-white/[0.06]" />
          <div className="h-44 rounded-[1.35rem] border border-white/10 bg-white/[0.06]" />
          <div className="h-44 rounded-[1.35rem] border border-white/10 bg-white/[0.06]" />
        </div>
      </div>
    </MobileShell>
  );
}
