import prisma from "@/lib/db";

const NON_REVENUE = ["CANCELLED", "REFUNDED"] as const;

export async function dashboardStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayAgg,
    revenueAgg,
    totalOrders,
    pendingOrders,
    totalCustomers,
    recentOrders,
    ordersLastYear,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { placedAt: { gte: startOfToday }, status: { notIn: [...NON_REVENUE] } },
    }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { notIn: [...NON_REVENUE] } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: { name: "customer" } } }),
    prisma.order.findMany({ orderBy: { placedAt: "desc" }, take: 8, include: { items: true } }),
    prisma.order.findMany({
      where: { placedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }, status: { notIn: [...NON_REVENUE] } },
      select: { placedAt: true, total: true },
    }),
  ]);

  // revenue by month (last 12)
  const months: { label: string; revenue: number; orders: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleString("en", { month: "short" }), revenue: 0, orders: 0 });
  }
  for (const o of ordersLastYear) {
    const idx = (o.placedAt.getFullYear() - now.getFullYear()) * 12 + (o.placedAt.getMonth() - now.getMonth()) + 11;
    if (idx >= 0 && idx < 12) {
      months[idx].revenue += o.total;
      months[idx].orders += 1;
    }
  }

  // top products by quantity sold
  const topRaw = await prisma.orderItem.groupBy({
    by: ["productId", "productName"],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 6,
  });

  // top categories
  const orderItems = await prisma.orderItem.findMany({
    select: { quantity: true, lineTotal: true, product: { select: { category: { select: { name: true } } } } },
  });
  const byCat = new Map<string, { qty: number; revenue: number }>();
  for (const it of orderItems) {
    const name = it.product?.category.name ?? "Uncategorized";
    const cur = byCat.get(name) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += it.lineTotal;
    byCat.set(name, cur);
  }
  const topCategories = [...byCat.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // top customers
  const topCustomersRaw = await prisma.order.groupBy({
    by: ["email", "customerFirstName", "customerLastName"],
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take: 6,
  });

  return {
    todaySales: todayAgg._sum.total ?? 0,
    todayOrders: todayAgg._count,
    totalRevenue: revenueAgg._sum.total ?? 0,
    totalOrders,
    pendingOrders,
    totalCustomers,
    months,
    topProducts: topRaw.map((t) => ({
      name: t.productName,
      qty: t._sum.quantity ?? 0,
      revenue: t._sum.lineTotal ?? 0,
    })),
    topCategories,
    topCustomers: topCustomersRaw.map((c) => ({
      email: c.email,
      name: `${c.customerFirstName} ${c.customerLastName}`,
      total: c._sum.total ?? 0,
      orders: c._count,
    })),
    recentOrders,
  };
}

export async function salesReport(from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: { placedAt: { gte: from, lte: to } },
    include: { items: true, payments: true },
    orderBy: { placedAt: "asc" },
  });

  const days: { date: string; orders: number; revenue: number; items: number }[] = [];
  const dayMap = new Map<string, (typeof days)[number]>();
  let revenue = 0,
    cancelled = 0,
    itemsSold = 0;
  for (const o of orders) {
    const key = o.placedAt.toISOString().slice(0, 10);
    if (!dayMap.has(key)) {
      const row = { date: key, orders: 0, revenue: 0, items: 0 };
      dayMap.set(key, row);
      days.push(row);
    }
    const row = dayMap.get(key)!;
    row.orders += 1;
    if (!NON_REVENUE.includes(o.status as any)) {
      row.revenue += o.total;
      revenue += o.total;
      const count = o.items.reduce((s, i) => s + i.quantity, 0);
      row.items += count;
      itemsSold += count;
    } else cancelled += 1;
  }

  const byPayment = new Map<string, { count: number; revenue: number }>();
  const byStatus = new Map<string, number>();
  for (const o of orders) {
    const pm = byPayment.get(o.paymentMethod) ?? { count: 0, revenue: 0 };
    pm.count += 1;
    if (!NON_REVENUE.includes(o.status as any)) pm.revenue += o.total;
    byPayment.set(o.paymentMethod, pm);
    byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
  }

  return {
    from,
    to,
    orders,
    days,
    summary: {
      totalOrders: orders.length,
      revenue,
      cancelled,
      itemsSold,
      avgOrderValue: orders.length - cancelled > 0 ? Math.round(revenue / (orders.length - cancelled)) : 0,
      byPayment: [...byPayment.entries()].map(([method, v]) => ({ method, ...v })),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    },
  };
}

export function salesReportCsv(report: Awaited<ReturnType<typeof salesReport>>): string {
  const header = "Order Number,Date,Customer,Email,Items,Subtotal,Discount,Shipping,Tax,Total,Status,Payment Method,Payment Status";
  const rows = report.orders.map((o) =>
    [
      o.orderNumber,
      o.placedAt.toISOString().slice(0, 10),
      `"${o.customerFirstName} ${o.customerLastName}"`,
      o.email,
      o.items.reduce((s, i) => s + i.quantity, 0),
      Math.round(o.subtotal),
      Math.round(o.couponDiscount + o.productSavings),
      Math.round(o.shippingCost),
      Math.round(o.taxTotal),
      Math.round(o.total),
      o.status,
      o.paymentMethod,
      o.paymentStatus,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
