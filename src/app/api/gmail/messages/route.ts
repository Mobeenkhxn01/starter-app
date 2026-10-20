import { NextResponse } from "next/server";
import { z } from "zod";
import { GmailError, getGmailAccessToken, listInbox } from "@/lib/gmail/server";
import type { ApiErrorBody } from "@/lib/gmail/types";

const querySchema = z.object({
  pageToken: z.string().max(2048).optional(),
  q: z.string().max(256).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(15),
});

const NO_STORE = { "Cache-Control": "private, no-store" };

function errorResponse(body: ApiErrorBody, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    pageToken: searchParams.get("pageToken") || undefined,
    q: searchParams.get("q") || undefined,
    limit: searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return errorResponse(
      { code: "BAD_REQUEST", message: "Invalid query parameters." },
      400,
    );
  }

  try {
    const accessToken = await getGmailAccessToken(request.headers);
    const page = await listInbox({
      accessToken,
      pageToken: parsed.data.pageToken,
      query: parsed.data.q,
      maxResults: parsed.data.limit,
    });
    return NextResponse.json(page, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof GmailError) {
      return errorResponse(
        { code: err.code, message: err.message },
        err.status,
      );
    }
    console.error("[gmail/messages] unexpected error", err);
    return errorResponse(
      { code: "GMAIL_UPSTREAM", message: "Something went wrong." },
      500,
    );
  }
}
