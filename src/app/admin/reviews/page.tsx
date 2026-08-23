import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/db";
import ReviewsClient from "@/components/admin/ReviewsClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Record<string, string> }) {
  await requireAuth();
  const status = (searchParams.status || "ALL").toUpperCase();
  const reviews = await prisma.review.findMany({
    where: status === "ALL" ? {} : { status },
    include: { product: { select: { name: true, slug: true } }, user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <ReviewsClient reviews={JSON.parse(JSON.stringify(reviews))} status={status} />;
}
