import { handle, ok, requireAuth } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { fail } from "@/lib/api";
import { listNotifications, markAllRead } from "@/services/notification.service";
import prisma from "@/lib/db";

export const GET = handle(async () => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isStaff(auth.session)) return fail("Forbidden.", 403);
  const [notifications, unreadCount, subscribers] = await Promise.all([
    listNotifications({ userId: null, limit: 30 }),
    prisma.notification.count({ where: { userId: null, isRead: false } }),
    prisma.newsletterSubscriber.count(),
  ]);
  return ok({ notifications, unreadCount, subscribers });
});

export const POST = handle(async () => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isStaff(auth.session)) return fail("Forbidden.", 403);
  await markAllRead(null);
  return ok({ read: true });
});
