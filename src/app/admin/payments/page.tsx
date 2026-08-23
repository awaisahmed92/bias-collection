import { requireAuth } from "@/lib/auth-helpers";
import { listPaymentMethods, listTransactions } from "@/services/payment.service";
import PaymentsClient from "@/components/admin/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAuth();
  const [methods, transactions] = await Promise.all([listPaymentMethods(), listTransactions({})]);
  return <PaymentsClient methods={JSON.parse(JSON.stringify(methods))} transactions={JSON.parse(JSON.stringify(transactions))} />;
}
