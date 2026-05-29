import { redirect } from "next/navigation";

export default function BillsIndexPage() {
  redirect("/search?type=bills");
}
