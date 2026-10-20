import { ArrowLeft, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminMailboxSharing } from "@/components/gmail/admin-mailbox-sharing";
import { ConnectGmail } from "@/components/gmail/connect-gmail";
import { Inbox } from "@/components/gmail/inbox";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { isGmailConnected } from "@/lib/gmail/server";
import prisma from "@/lib/prisma";

export const metadata = { title: "Gmail Inbox" };

export default async function InboxPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) redirect("/login");

  const connected = await isGmailConnected(reqHeaders);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { gmailAdminAccessGrantedAt: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gmail Inbox</h1>
          <p className="text-sm text-muted-foreground">{session.user.email}</p>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft data-icon="inline-start" />
          Dashboard
        </Link>
      </header>

      {connected ? (
        <>
          <AdminMailboxSharing
            initiallyShared={Boolean(user?.gmailAdminAccessGrantedAt)}
          />
          <Inbox />
        </>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-xl border p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            <h2 className="font-semibold">Connect your Gmail</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This app will request <strong>read-only</strong> access to your
            Gmail (<code className="text-xs">gmail.readonly</code>). It cannot
            send, delete, or modify emails. You can revoke access anytime at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
          <ConnectGmail />
        </div>
      )}
    </main>
  );
}
