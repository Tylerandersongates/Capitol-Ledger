import { AccountDeletionResult } from "@/components/account-deletion-result";
import { BrandWordmark } from "@/components/brand-wordmark";
import { MobileShell } from "@/components/mobile-shell";
import { publicBrand } from "@/lib/brand";

export const metadata = {
  title: `Account deletion status | ${publicBrand.name}`,
  description: `Check the status of a ${publicBrand.name} account-deletion request.`
};

export default function AccountDeletedPage() {
  return (
    <MobileShell minHeight="min-h-[820px]" contentClassName="px-8 pb-8 pt-8">
      <header className="mt-12">
        <BrandWordmark className="liquid-glass-wordmark inline-flex rounded-full px-4 py-2 text-[16px] font-semibold uppercase" />
      </header>

      <main className="mt-14 flex flex-1 flex-col">
        <AccountDeletionResult />
      </main>
    </MobileShell>
  );
}
