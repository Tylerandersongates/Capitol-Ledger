import type { Metadata } from "next";
import "./globals.css";
import { AccountDeletionBrowserGuard } from "@/components/account-deletion-browser-guard";
import { NativeStoreKitSyncBridge } from "@/components/native-storekit-sync-bridge";
import { SiteHeader } from "@/components/site-header";
import { publicBrandName } from "@/lib/brand";

export const metadata: Metadata = {
  title: publicBrandName,
  description: "Track federal lawmakers, bills, votes, and saved legislative updates."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AccountDeletionBrowserGuard />
        <NativeStoreKitSyncBridge />
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
