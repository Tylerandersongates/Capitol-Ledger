import type { ReactNode } from "react";

const defaultBackground =
  "bg-[radial-gradient(circle_at_18%_9%,rgba(34,141,255,0.24),transparent_31%),radial-gradient(circle_at_82%_18%,rgba(246,216,75,0.13),transparent_28%),linear-gradient(155deg,#061a33_0%,#020916_55%,#06182d_100%)]";

type MobileShellProps = {
  backgroundClassName?: string;
  children: ReactNode;
  contentClassName?: string;
  minHeight?: string;
  statusBarClassName?: string;
};

export function MobileShell({
  backgroundClassName = defaultBackground,
  children,
  contentClassName = "px-7 pb-0 pt-8",
  minHeight = "min-h-[1080px]",
  statusBarClassName = "flex items-center justify-between px-3 text-[17px] font-semibold"
}: MobileShellProps) {
  return (
    <section className="min-h-screen bg-black px-3 py-4 text-white sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-[560px] rounded-[3.35rem] border-[7px] border-neutral-900 bg-black p-2 shadow-[0_0_0_2px_rgba(255,255,255,0.34),0_35px_90px_rgba(0,0,0,0.88)]">
        <div className="relative overflow-hidden rounded-[2.75rem] border border-white/15 bg-[#031126]">
          <div className={`absolute inset-0 ${backgroundClassName}`} />
          <div className="absolute left-1/2 top-0 z-20 h-8 w-36 -translate-x-1/2 rounded-b-3xl bg-black" />

          <div className={`relative z-10 flex ${minHeight} flex-col ${contentClassName}`}>
            <MobileStatusBar className={statusBarClassName} />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileStatusBar({ className }: { className: string }) {
  return (
    <div className={className}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-white">
        <span className="flex items-end gap-0.5">
          <span className="h-1.5 w-1 rounded-sm bg-white" />
          <span className="h-2.5 w-1 rounded-sm bg-white" />
          <span className="h-3.5 w-1 rounded-sm bg-white" />
          <span className="h-[1.125rem] w-1 rounded-sm bg-white" />
        </span>
        <span className="text-lg leading-none">⌁</span>
        <span className="h-3.5 w-6 rounded border border-white bg-white/10 p-0.5">
          <span className="block h-full w-4 rounded-sm bg-white" />
        </span>
      </div>
    </div>
  );
}
