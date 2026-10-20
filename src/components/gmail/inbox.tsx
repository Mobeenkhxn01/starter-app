"use client";

import { format, formatDistanceToNow, isToday } from "date-fns";
import { Inbox as InboxIcon, Search } from "lucide-react";
import { useState } from "react";
import { ConnectGmail } from "@/components/gmail/connect-gmail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxRequestError, useInbox } from "@/hooks/use-inbox";
import type { EmailSummary } from "@/lib/gmail/types";
import { cn } from "@/lib/utils";

// Gmail snippets arrive HTML-escaped. React escapes on render, so we decode entities
// to plain text here (never use dangerouslySetInnerHTML for email content).
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};
const decode = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

/** "Jane Doe <jane@x.com>" -> "Jane Doe" */
function senderName(from: string) {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return (match?.[1] || match?.[2] || from || "Unknown sender").trim();
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return isToday(d)
    ? format(d, "p")
    : formatDistanceToNow(d, { addSuffix: true });
}

function EmailRow({ email }: { email: EmailSummary }) {
  return (
    <li className="flex flex-col gap-0.5 border-b px-4 py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "truncate text-sm",
            email.unread ? "font-semibold" : "font-medium",
          )}
        >
          {senderName(email.from)}
        </span>
        <time className="shrink-0 text-xs text-muted-foreground">
          {formatDate(email.date)}
        </time>
      </div>
      <p
        className={cn(
          "truncate text-sm",
          email.unread ? "font-medium" : "text-foreground/90",
        )}
      >
        {email.subject}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {decode(email.snippet)}
      </p>
    </li>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

function InboxSkeleton() {
  return (
    <ul className="divide-y rounded-xl border" aria-busy="true">
      {SKELETON_ROWS.map((id) => (
        <li key={id} className="flex flex-col gap-2 px-4 py-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </li>
      ))}
    </ul>
  );
}

function ErrorState({
  error,
  allowReconnect,
}: {
  error: Error;
  allowReconnect: boolean;
}) {
  const code = error instanceof InboxRequestError ? error.code : "NETWORK";
  const needsConnect =
    code === "GMAIL_NOT_CONNECTED" || code === "GMAIL_REAUTH";

  return (
    <Alert variant="destructive">
      <AlertTitle>
        {needsConnect
          ? allowReconnect
            ? "Gmail needs to be (re)connected"
            : "Gmail access is unavailable"
          : "Couldn't load your inbox"}
      </AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{error.message}</span>
        {needsConnect && allowReconnect && (
          <ConnectGmail label="Reconnect Gmail" />
        )}
      </AlertDescription>
    </Alert>
  );
}

export function Inbox({
  endpoint = "/api/gmail/messages",
  allowReconnect = true,
}: {
  endpoint?: string;
  allowReconnect?: boolean;
} = {}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const inbox = useInbox(query, endpoint);

  const emails = inbox.data?.pages.flatMap((p) => p.emails) ?? [];

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input.trim());
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Search Gmail, e.g. "from:github is:unread"'
          aria-label="Search inbox"
        />
        <Button type="submit" variant="secondary">
          <Search data-icon="inline-start" />
          Search
        </Button>
      </form>

      {inbox.isPending && <InboxSkeleton />}

      {inbox.isError && (
        <ErrorState error={inbox.error} allowReconnect={allowReconnect} />
      )}

      {inbox.isSuccess && emails.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <InboxIcon className="size-6" />
          <p className="text-sm">
            {query ? "No emails match your search." : "Your inbox is empty."}
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <ul className="rounded-xl border bg-card">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </ul>
      )}

      {inbox.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => inbox.fetchNextPage()}
          disabled={inbox.isFetchingNextPage}
          className="self-center"
        >
          {inbox.isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
    </section>
  );
}
