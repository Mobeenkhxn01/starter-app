"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminMailboxSharing({
  initiallyShared,
}: {
  initiallyShared: boolean;
}) {
  const [shared, setShared] = useState(initiallyShared);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateSharing() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/gmail/admin-sharing", {
        method: shared ? "DELETE" : "POST",
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Could not update sharing settings.");
      }
      setShared(!shared);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update sharing settings.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col items-start gap-3 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold">Admin inbox access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          An authorized admin can view sender, subject, date, and message
          snippets. Email bodies and attachments are not shown. You can revoke
          this permission at any time.
        </p>
      </div>
      <Button
        type="button"
        variant={shared ? "outline" : "default"}
        onClick={updateSharing}
        disabled={pending}
      >
        {pending
          ? "Saving..."
          : shared
            ? "Stop sharing inbox"
            : "Allow admin to view inbox"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
