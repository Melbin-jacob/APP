import { redirect } from "next/navigation";
import { getPrincipal } from "@/server/auth";

// Where sign-in lands when no specific page was asked for: each kind of
// account goes to the page where it manages its own details.
export default async function StartPage() {
  const user = await getPrincipal();
  if (!user) redirect("/login");
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/admin");
  if (user.role === "TRADER") redirect("/dashboard");
  redirect("/account");
}
