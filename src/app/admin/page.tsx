import { ArrowLeft, Mail } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { isAdminUser, listAdminSharedGmailUsers } from "@/lib/admin";
import { auth } from "@/lib/auth";

export const metadata = { title: "Admin Gmail Access" };

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!(await isAdminUser(session.user.id))) notFound();

  const users = await listAdminSharedGmailUsers();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shared Gmail inboxes</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "user has" : "users have"}{" "}
            opted in
          </p>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft data-icon="inline-start" />
          Dashboard
        </Link>
      </header>

      {users.length ? (
        <ul className="divide-y rounded-lg border">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {user.name || user.email}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Link
                href={`/admin/users/${encodeURIComponent(user.id)}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Mail data-icon="inline-start" />
                View Gmail
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No users have shared Gmail access yet.
        </p>
      )}
    </main>
  );
}
