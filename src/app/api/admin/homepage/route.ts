import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listSections, createSection, updateSection, deleteSection } from "@/services/cms.service";
import prisma from "@/lib/db";

export const GET = handle(async () => {
  const auth = await requirePermission("cms.manage");
  if ("response" in auth) return auth.response;
  const [sections, products, categories] = await Promise.all([
    listSections(),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return ok({ sections, products, categories });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("cms.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  try {
    const section = body.id ? await updateSection(String(body.id), body) : await createSection(body);
    await audit(auth.session.id, body.id ? "update" : "create", "homepage_section", section.id, section.type);
    return ok({ section });
  } catch (e: any) {
    if (e?.name === "ZodError") throw e;
    return fail(e.message, 400);
  }
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requirePermission("cms.manage");
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await deleteSection(id);
  await audit(auth.session.id, "delete", "homepage_section", id);
  return ok({ deleted: true });
});
