import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser, userHasSharedGmail } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  GmailError,
  getGmailAccessTokenForUser,
  listInbox,
} from "@/lib/gmail/server";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "You are not signed in." },
      401,
    );
  }
  if (!(await isAdminUser(session.user.id))) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "You are not authorized." },
      403,
    );
  }

  const { userId } = await params;
  if (!(await userHasSharedGmail(userId))) {
    return errorResponse(
      {
        code: "GMAIL_NOT_CONNECTED",
        message: "This user has not shared Gmail access.",
      },
      404,
    );
  }

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
    const accessToken = await getGmailAccessTokenForUser(userId);
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
    console.error("[admin/gmail/messages] unexpected error", err);
    return errorResponse(
      { code: "GMAIL_UPSTREAM", message: "Something went wrong." },
      500,
    );
  }
}
