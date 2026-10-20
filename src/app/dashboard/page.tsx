import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOut from "@/components/auth/SignOut";
import { buttonVariants } from "@/components/ui/button";
import { isAdminUser } from "@/lib/admin";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");
  const isAdmin = await isAdminUser(session.user.id);

  return (
    <main className="max-w-md h-screen flex flex-col items-center justify-center mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {session.user.name || "User"}!</p>
      <p className="text-muted-foreground">{session.user.email}</p>
      <Link href="/inbox" className={buttonVariants({ className: "w-full" })}>
        Open Gmail Inbox
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className={buttonVariants({
            variant: "outline",
            className: "w-full",
          })}
        >
          Admin Gmail Panel
        </Link>
      )}
      <SignOut />
    </main>
  );
}
