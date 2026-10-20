import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GMAIL_READONLY_SCOPE } from "@/lib/gmail/types";
import prisma from "@/lib/prisma";

const NO_STORE = { "Cache-Control": "private, no-store" };

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "You are not signed in." },
      { status: 401, headers: NO_STORE },
    );
  }

  const googleAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "google",
      scope: { contains: GMAIL_READONLY_SCOPE },
    },
    select: { id: true },
  });
  if (!googleAccount) {
    return NextResponse.json(
      { message: "Connect Gmail before sharing inbox access." },
      { status: 409, headers: NO_STORE },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { gmailAdminAccessGrantedAt: new Date() },
  });
  return NextResponse.json({ shared: true }, { headers: NO_STORE });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "You are not signed in." },
      { status: 401, headers: NO_STORE },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { gmailAdminAccessGrantedAt: null },
  });
  return NextResponse.json({ shared: false }, { headers: NO_STORE });
}
