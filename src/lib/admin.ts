import { GMAIL_READONLY_SCOPE } from "@/lib/gmail/types";
import prisma from "@/lib/prisma";

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "admin";
}

const sharedGmailWhere = {
  gmailAdminAccessGrantedAt: { not: null },
  accounts: {
    some: {
      providerId: "google",
      scope: { contains: GMAIL_READONLY_SCOPE },
    },
  },
};

export async function listAdminSharedGmailUsers() {
  return prisma.user.findMany({
    where: sharedGmailWhere,
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });
}

export async function userHasSharedGmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...sharedGmailWhere },
    select: { id: true },
  });
  return user !== null;
}
