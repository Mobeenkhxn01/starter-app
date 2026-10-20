"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { GMAIL_READONLY_SCOPE } from "@/lib/gmail/types";

export function ConnectGmail({ label = "Connect Gmail" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    // Incremental authorization: asks Google for the extra Gmail scope only now,
    // and attaches it to the already-linked Google account.
    const { error } = await authClient.linkSocial({
      provider: "google",
      scopes: [GMAIL_READONLY_SCOPE],
      callbackURL: "/inbox",
    });
    if (error) setPending(false); // on success the browser redirects to Google
  }

  return (
    <Button onClick={connect} disabled={pending}>
      <Mail data-icon="inline-start" />
      {pending ? "Redirecting to Google..." : label}
    </Button>
  );
}
