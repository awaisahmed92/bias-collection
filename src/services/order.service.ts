import prisma from "@/lib/db";
import { adjustStock } from "./inventory.service";
import { notifyOrderStatus, notifyAdmins } from "./notification.service";
import { refundPayment } from "./payment.service";
import { audit } from "@/lib/api";

export async function generateOrderNumber(tx?: any): Promise<string> {
  const db = tx ?? prisma;
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const count = await db.order.count();
    const num = `BC-${year}-${String(10001 + count + (i ? Math.floor(Math.random() * 9) + 1 : 0))}`;
    const exists = await db.order.findUnique({ where: { orderNumber: num } });
    if (!exists) return num;
  }
  return `BC-${year}-${Date.now().toString(36).toUpperCase()}`;
}

export async function adminListOrders(opts: {
  q?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  const { q, status, paymentMethod, paymentStatus, from, to, page = 1, limit = 15 } = opts;
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (paymentMethod && paymentMethod !== "ALL") where.paymentMethod = paymentMethod;
  if (paymentStatus && paymentStatus !== "ALL") where.paymentStatus = paymentStatus;
  if (from) where.placedAt = { ...(where.placedAt || {}), gte: new Date(from) };
  if (to) where.placedAt = { ...(where.placedAt || {}), lte: new Date(new Date(to).setHours(23, 59, 59)) };
  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { email: { contains: q } },
      { customerFirstName: { contains: q } },
      { customerLastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true, user: { select: { email: true } } },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      history: { include: { changedBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
}

export async function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: true,
      history: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, email: true } },
    },
  });
}

const FINAL_STOCK_RESTORED = ["CANCELLED"] as const;

export async function updateOrderStatus(
  orderId: string,
  nextStatus: string,
  opts: { note?: string; trackingNumber?: string; changedById?: string }
) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("Order not found.");
  const prev = order.status;

  if (nextStatus === prev && !opts.trackingNumber) {
    if (opts.note) await appendNote(orderId, opts.note, opts.changedById);
    return getOrderById(orderId);
  }

  await prisma.$transaction(async (tx) => {
    // restore stock on cancellation (once)
    if (nextStatus === "CANCELLED" && !FINAL_STOCK_RESTORED.includes(prev as any)) {
      for (const item of order.items) {
        await adjustStock(tx, {
          productId: item.productId!,
          variantId: item.variantId,
          type: "STOCK_RETURNED",
          quantity: item.quantity,
          reference: order.orderNumber,
          note: `Order cancelled — stock restored`,
          userId: opts.changedById,
        });
        await tx.product.update({ where: { id: item.productId! }, data: { soldCount: { decrement: item.quantity } } });
      }
    }

    const paymentStatus =
      nextStatus === "DELIVERED" && order.paymentMethod === "cod" ? "PAID" : order.paymentStatus;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        paymentStatus,
        trackingNumber: opts.trackingNumber ?? order.trackingNumber,
      },
    });

    // if COD got delivered, settle its pending payment record
    if (nextStatus === "DELIVERED" && order.paymentMethod === "cod") {
      await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "SUCCESS" } });
    }

    await tx.orderStatusHistory.create({
      data: { orderId, status: nextStatus, note: opts.note || null, changedById: opts.changedById || null },
    });
  });

  await notifyOrderStatus({
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: nextStatus,
    trackingNumber: opts.trackingNumber,
  });
  await audit(opts.changedById ?? null, "status_change", "order", orderId, `${prev} → ${nextStatus}`);

  return getOrderById(orderId);
}

export async function appendNote(orderId: string, note: string, userId?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  const stamp = new Date().toLocaleString("en-GB");
  const line = `[${stamp}] ${note}`;
  await prisma.order.update({
    where: { id: orderId },
    data: { internalNotes: order.internalNotes ? `${order.internalNotes}\n${line}` : line },
  });
}

export async function refundOrder(orderId: string, amount: number | undefined, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new Error("Order not found.");
  const payment = order.payments.find((p) => p.status === "SUCCESS") ?? order.payments[0];
  if (!payment) throw new Error("No payment recorded for this order.");
  await refundPayment(payment.id, amount);
  const full = !amount || amount >= order.total;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
      status: full && order.status !== "DELIVERED" ? "REFUNDED" : order.status,
    },
  });
  await prisma.orderStatusHistory.create({
    data: { orderId, status: "REFUNDED", note: `Refund of Rs. ${(amount ?? order.total).toLocaleString()} processed`, changedById: userId },
  });
  await notifyAdmins({ type: "ADMIN_REFUND", title: `Refund for ${order.orderNumber}`, message: `Rs. ${(amount ?? order.total).toLocaleString()} refunded.` });
  await audit(userId, "refund", "order", orderId, `Rs. ${amount ?? order.total}`);
  return getOrderById(orderId);
}

export async function customerOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: { take: 4 } },
    orderBy: { placedAt: "desc" },
  });
}
