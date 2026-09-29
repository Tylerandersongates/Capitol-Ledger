import Image from "next/image";

import { MobileShell } from "@/components/mobile-shell";
import styles from "@/components/screen-loading.module.css";

export function ScreenLoading({ label }: { label: string }) {
  return (
    <MobileShell contentClassName="px-8 pb-8 pt-8" minHeight="min-h-[100dvh]">
      <div className="flex flex-1 flex-col items-center justify-center pb-12 pt-6 text-center" role="status" aria-live="polite">
        <div className={styles.logoStage} aria-hidden="true">
          <Image
            src="/capitol-ledger-logo.png"
            alt=""
            fill
            priority
            sizes="(max-width: 639px) 72vw, 260px"
            className={styles.logo}
          />
          <span className={styles.scanLine} />
        </div>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffb12b]">CapitolWonk</p>
        <h1 className="mt-2 text-[20px] font-semibold text-white">{label}</h1>
      </div>
    </MobileShell>
  );
}
