import { redirect } from "next/navigation";

export default function BetaRedirectPage() {
  redirect("/feedback?source=live-testing");
}
