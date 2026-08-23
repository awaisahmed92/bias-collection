import prisma from "@/lib/db";

/**
 * PaymentService — pluggable provider architecture.
 * Each provider implements initiate/refund. Gateways can be toggled per-store
 * from Admin → Payment Methods. Secret keys live in env vars, never in the DB.
 */

export interface PaymentResult {
  status: "SUCCESS" | "PENDING" | "FAILED";
  transactionId?: string;
  providerResponse?: string;
}

export interface PaymentProvider {
  key: string;
  label: string;
  initiate(order: { orderNumber: string; amount: number }, config: Record<string, any>): Promise<PaymentResult>;
  refund(payment: { transactionId: string | null; amount: number }, amount: number): Promise<PaymentResult>;
}

const codProvider: PaymentProvider = {
  key: "cod",
  label: "Cash on Delivery",
  async initiate(order) {
    return {
      status: "PENDING",
      transactionId: `COD-${order.orderNumber}`,
      providerResponse: JSON.stringify({ note: "Amount to be collected on delivery." }),
    };
  },
  async refund(payment, amount) {
    return {
      status: "SUCCESS",
      transactionId: `REF-${payment.transactionId ?? Date.now()}`,
      providerResponse: JSON.stringify({ note: `COD refund of Rs. ${amount} recorded manually.` }),
    };
  },
};

const bankTransferProvider: PaymentProvider = {
  key: "bank_transfer",
  label: "Bank Transfer",
  async initiate(order, config) {
    return {
      status: "PENDING",
      transactionId: `BT-${order.orderNumber}`,
      providerResponse: JSON.stringify({
        note: "Awaiting manual transfer confirmation.",
        bank: config.bankName || null,
        account: config.accountNumber || null,
      }),
    };
  },
  async refund(payment, amount) {
    return {
      status: "SUCCESS",
      transactionId: `REF-${payment.transactionId ?? Date.now()}`,
      providerResponse: JSON.stringify({ note: `Manual bank refund of Rs. ${amount} recorded.` }),
    };
  },
};

// Sandbox card gateway — replace the internals with Stripe/PayFast/etc. SDK calls.
const cardProvider: PaymentProvider = {
  key: "card",
  label: "Card Payment",
  async initiate(order) {
    const key = process.env.CARD_GATEWAY_KEY;
    // In production: call gateway SDK here using `key`.
    return {
      status: "SUCCESS",
      transactionId: `CARD-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      providerResponse: JSON.stringify({ sandbox: true, keyConfigured: !!key }),
    };
  },
  async refund(payment, amount) {
    return {
      status: "SUCCESS",
      transactionId: `CARD-RF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      providerResponse: JSON.stringify({ sandbox: true, refunded: amount }),
    };
  },
};

// Sandbox wallet gateway (JazzCash / EasyPaisa style).
const walletProvider: PaymentProvider = {
  key: "wallet",
  label: "Wallet Payment",
  async initiate(order) {
    const key = process.env.WALLET_GATEWAY_KEY;
    return {
      status: "SUCCESS",
      transactionId: `WLT-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
      providerResponse: JSON.stringify({ sandbox: true, keyConfigured: !!key }),
    };
  },
  async refund(payment, amount) {
    return {
      status: "SUCCESS",
      transactionId: `WLT-RF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      providerResponse: JSON.stringify({ sandbox: true, refunded: amount }),
    };
  },
};

export const paymentProviders: Record<string, PaymentProvider> = {
  cod: codProvider,
  bank_transfer: bankTransferProvider,
  card: cardProvider,
  wallet: walletProvider,
};

export async function listPaymentMethods() {
  return prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getEnabledPaymentMethods() {
  return prisma.paymentMethodConfig.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } });
}

export async function updatePaymentMethod(
  key: string,
  data: { isEnabled?: boolean; instructions?: string | null; description?: string | null; configJson?: string }
) {
  return prisma.paymentMethodConfig.update({ where: { key }, data });
}

export async function initiatePayment(
  method: string,
  order: { orderNumber: string; amount: number }
): Promise<{ method: string } & PaymentResult> {
  const config = await prisma.paymentMethodConfig.findUnique({ where: { key: method } });
  if (!config || !config.isEnabled) throw new Error("Selected payment method is not available.");
  const provider = paymentProviders[method];
  if (!provider) throw new Error(`No provider registered for "${method}".`);
  let parsed: Record<string, any> = {};
  try {
    parsed = JSON.parse(config.configJson || "{}");
  } catch {}
  const result = await provider.initiate(order, parsed);
  return { method, ...result };
}

export async function refundPayment(paymentId: string, amount?: number) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "SUCCESS" && payment.status !== "PENDING")
    throw new Error("Only successful/pending payments can be refunded.");
  const provider = paymentProviders[payment.method];
  if (!provider) throw new Error("No provider for this payment.");
  const refundAmount = Math.round(amount ?? payment.amount);
  const result = await provider.refund({ transactionId: payment.transactionId, amount: payment.amount }, refundAmount);
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED", providerResponse: result.providerResponse },
  });
  return { payment: updated, result };
}

export async function listTransactions(opts: { page?: number; limit?: number; status?: string }) {
  const { page = 1, limit = 25, status } = opts;
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  const [total, items] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { order: { select: { orderNumber: true, email: true, total: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
