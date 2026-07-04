import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SignOut  from "@/components/auth/SignOut";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  return (
    <main className="max-w-md h-screen flex flex-col items-center justify-center mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {session.user.name || "User"}!</p>
      <p className="text-muted-foreground">{session.user.email}</p>
      <SignOut />
    </main>
  );
}