import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Inbox } from "@/components/gmail/inbox";
import { buttonVariants } from "@/components/ui/button";
import { isAdminUser, userHasSharedGmail } from "@/lib/admin";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AdminUserInboxPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!(await isAdminUser(session.user.id))) notFound();

  const { userId } = await params;
  if (!(await userHasSharedGmail(userId))) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Gmail inbox</h1>
          <p className="truncate text-sm text-muted-foreground">
            {user.name} · {user.email}
          </p>
        </div>
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft data-icon="inline-start" />
          Users
        </Link>
      </header>
      <Inbox
        endpoint={`/api/admin/users/${encodeURIComponent(userId)}/messages`}
        allowReconnect={false}
      />
    </main>
  );
}
