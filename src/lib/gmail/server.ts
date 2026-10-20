import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  type EmailSummary,
  GMAIL_READONLY_SCOPE,
  type GmailErrorCode,
  type InboxPage,
} from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailError extends Error {
  constructor(
    public readonly code: GmailErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GmailError";
  }
}

// ─── Response schemas (validate what Google sends us) ─────────────────
const listSchema = z.object({
  messages: z
    .array(z.object({ id: z.string(), threadId: z.string() }))
    .optional(),
  nextPageToken: z.string().optional(),
});

const metadataSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  snippet: z.string().optional().default(""),
  labelIds: z.array(z.string()).optional().default([]),
  internalDate: z.string().optional(),
  payload: z
    .object({
      headers: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .optional(),
    })
    .optional(),
});

// ─── Scope helpers ────────────────────────────────────────────────────
export function hasGmailScope(scopes: readonly string[] | undefined | null) {
  if (!scopes) return false;
  // `gmail.readonly` is enough; broader scopes also imply read access.
  return scopes.some(
    (s) =>
      s === GMAIL_READONLY_SCOPE ||
      s === "https://www.googleapis.com/auth/gmail.modify" ||
      s === "https://mail.google.com/",
  );
}

/** Used by server components to decide: show "Connect Gmail" or the inbox. */
export async function isGmailConnected(reqHeaders: Headers): Promise<boolean> {
  const accounts = await auth.api.listUserAccounts({ headers: reqHeaders });
  const google = accounts.find((a) => a.providerId === "google");
  return hasGmailScope(google?.scopes);
}

export async function getGmailAccessTokenForUser(
  userId: string,
): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: { scope: true },
  });
  if (!account || !hasGmailScope(account.scope?.split(","))) {
    throw new GmailError(
      "GMAIL_NOT_CONNECTED",
      403,
      "This user has not connected Gmail.",
    );
  }

  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: "google", userId },
    });
    if (!accessToken) throw new Error("empty token");
    return accessToken;
  } catch {
    throw new GmailError(
      "GMAIL_REAUTH",
      401,
      "Google access expired or was revoked. The user needs to reconnect Gmail.",
    );
  }
}

/**
 * Returns a valid Google access token for the current user.
 * Better Auth transparently refreshes it with the stored refresh token if expired.
 */
export async function getGmailAccessToken(
  reqHeaders: Headers,
): Promise<string> {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    throw new GmailError("UNAUTHENTICATED", 401, "You are not signed in.");
  }

  const accounts = await auth.api.listUserAccounts({ headers: reqHeaders });
  const google = accounts.find((a) => a.providerId === "google");
  if (!google || !hasGmailScope(google.scopes)) {
    throw new GmailError(
      "GMAIL_NOT_CONNECTED",
      403,
      "Gmail access has not been granted yet.",
    );
  }

  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: "google" },
      headers: reqHeaders,
    });
    if (!accessToken) throw new Error("empty token");
    return accessToken;
  } catch {
    // Refresh failed (invalid_grant): user revoked access or Testing-mode token expired (7 days).
    throw new GmailError(
      "GMAIL_REAUTH",
      401,
      "Google access expired or was revoked. Please reconnect Gmail.",
    );
  }
}

// ─── Gmail fetch helpers ──────────────────────────────────────────────
async function gmailFetch(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store", // per-user private data: never cache in Next's data cache
  });

  if (res.ok) return res.json();

  if (res.status === 401) {
    throw new GmailError(
      "GMAIL_REAUTH",
      401,
      "Google rejected the token. Please reconnect Gmail.",
    );
  }
  if (res.status === 403) {
    throw new GmailError(
      "GMAIL_FORBIDDEN",
      403,
      "Gmail refused the request. Check that the Gmail API is enabled in Google Cloud and the scope was granted.",
    );
  }
  if (res.status === 429) {
    throw new GmailError(
      "GMAIL_RATE_LIMITED",
      429,
      "Gmail rate limit hit. Try again shortly.",
    );
  }
  throw new GmailError(
    "GMAIL_UPSTREAM",
    502,
    `Gmail API error (${res.status}).`,
  );
}

function toSummary(raw: z.infer<typeof metadataSchema>): EmailSummary {
  const header = (name: string) =>
    raw.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? "";

  const ms = raw.internalDate ? Number(raw.internalDate) : Number.NaN;

  return {
    id: raw.id,
    threadId: raw.threadId,
    from: header("From"),
    subject: header("Subject") || "(no subject)",
    snippet: raw.snippet,
    date: Number.isFinite(ms) ? new Date(ms).toISOString() : null,
    unread: raw.labelIds.includes("UNREAD"),
  };
}

export interface ListInboxOptions {
  accessToken: string;
  pageToken?: string;
  maxResults?: number;
  /** Gmail search syntax, e.g. "from:github is:unread" */
  query?: string;
}

export async function listInbox({
  accessToken,
  pageToken,
  maxResults = 15,
  query,
}: ListInboxOptions): Promise<InboxPage> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: "INBOX",
  });
  if (pageToken) params.set("pageToken", pageToken);
  if (query) params.set("q", query);

  // 1. The list endpoint returns IDs only.
  const list = listSchema.parse(
    await gmailFetch(`/messages?${params}`, accessToken),
  );
  const ids = list.messages ?? [];

  // 2. Fetch lightweight metadata for each ID in parallel (no bodies/attachments).
  const meta = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Subject"]) meta.append("metadataHeaders", h);

  const settled = await Promise.allSettled(
    ids.map(async ({ id }) =>
      toSummary(
        metadataSchema.parse(
          await gmailFetch(`/messages/${id}?${meta}`, accessToken),
        ),
      ),
    ),
  );

  // If every detail call failed with the same Gmail error, surface it instead of an empty inbox.
  const rejected = settled.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (ids.length > 0 && rejected.length === ids.length) {
    const first = rejected[0].reason;
    if (first instanceof GmailError) throw first;
  }

  const emails = settled
    .filter(
      (r): r is PromiseFulfilledResult<EmailSummary> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);

  return { emails, nextPageToken: list.nextPageToken ?? null };
}
