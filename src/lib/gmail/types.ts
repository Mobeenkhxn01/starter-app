// Client-safe: no server imports here.

export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

export type GmailErrorCode =
  | "UNAUTHENTICATED"
  | "GMAIL_NOT_CONNECTED" // user never granted the Gmail scope
  | "GMAIL_REAUTH" // token revoked/expired beyond refresh -> reconnect
  | "GMAIL_FORBIDDEN" // API disabled in GCP, or insufficient scope
  | "GMAIL_RATE_LIMITED"
  | "GMAIL_UPSTREAM"
  | "BAD_REQUEST";

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  /** ISO string, derived from Gmail's internalDate */
  date: string | null;
  unread: boolean;
}

export interface InboxPage {
  emails: EmailSummary[];
  nextPageToken: string | null;
}

export interface ApiErrorBody {
  code: GmailErrorCode;
  message: string;
}
