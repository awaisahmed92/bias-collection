import prisma from "@/lib/db";
import { formatMoney } from "@/lib/utils";

/**
 * NotificationService — provider-based (EMAIL / SMS / WHATSAPP).
 * Providers log + persist notifications to the DB. Swap `send()` internals with
 * SendGrid / Twilio / WhatsApp Cloud API calls later without touching callers.
 */

export type Channel = "EMAIL" | "SMS" | "WHATSAPP";

export interface NotificationInput {
  userId?: string | null;
  channel?: Channel;
  type: string;
  title: string;
  message: string;
}

class LogProvider {
  constructor(public channel: Channel) {}
  async send(n: NotificationInput) {
    console.info(`[${this.channel}] → ${n.userId ?? "broadcast"}: ${n.title} — ${n.message}`);
  }
}

const providers: Record<Channel, LogProvider> = {
  EMAIL: new LogProvider("EMAIL"),
  SMS: new LogProvider("SMS"),
  WHATSAPP: new LogProvider("WHATSAPP"),
};

export async function notify(input: NotificationInput) {
  const channel = input.channel ?? "EMAIL";
  const row = await prisma.notification.create({ data: { ...input, channel } });
  await providers[channel].send({ ...input, channel });
  return row;
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId">) {
  // broadcast row (userId null) — admin bell reads these
  return notify({ ...input, userId: null });
}

// ── Domain events ──

export async function notifyOrderPlaced(order: {
  id: string;
  orderNumber: string;
  total: number;
  userId: string | null;
  email: string;
}) {
  if (order.userId) {
    await notify({
      userId: order.userId,
      type: "ORDER_CONFIRMED",
      title: `Order ${order.orderNumber} placed`,
      message: `Thank you! We've received your order totalling ${formatMoney(order.total)}.`,
    });
  }
  await notifyAdmins({
    type: "ADMIN_NEW_ORDER",
    title: `New order ${order.orderNumber}`,
    message: `${order.email} placed an order of ${formatMoney(order.total)}.`,
  });
}

export async function notifyOrderStatus(order: {
  orderNumber: string;
  userId: string | null;
  status: string;
  trackingNumber?: string | null;
}) {
  if (!order.userId) return;
  const map: Record<string, string> = {
    CONFIRMED: "Your order has been confirmed.",
    PROCESSING: "Your order is being prepared.",
    PACKED: "Your order is packed and ready to ship.",
    SHIPPED: `Your order has shipped${order.trackingNumber ? ` — tracking # ${order.trackingNumber}` : ""}.`,
    DELIVERED: "Your order was delivered. Enjoy!",
    CANCELLED: "Your order was cancelled.",
    RETURNED: "Your return was received.",
    REFUNDED: "Your refund was processed.",
  };
  await notify({
    userId: order.userId,
    type: `ORDER_${order.status}`,
    title: `Order ${order.orderNumber}: ${order.status}`,
    message: map[order.status] ?? `Status updated to ${order.status}.`,
  });
}

export async function notifyLowStock(items: { name: string; stock: number }[]) {
  if (!items.length) return;
  await notifyAdmins({
    type: "ADMIN_LOW_STOCK",
    title: "Low stock alert",
    message: items.map((i) => `${i.name} (${i.stock} left)`).join(", "),
  });
}

export async function listNotifications(opts: { userId?: string | null; unreadOnly?: boolean; limit?: number }) {
  const { userId, unreadOnly, limit = 30 } = opts;
  const where: any = {};
  where.userId = userId ?? null;
  if (unreadOnly) where.isRead = false;
  return prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit });
}

export async function markAllRead(userId: string | null) {
  await prisma.notification.updateMany({ where: { userId: userId ?? null, isRead: false }, data: { isRead: true } });
}
