import { z } from "zod";
import { handle, ok, fail, requireAuth } from "@/lib/api";
import prisma from "@/lib/db";

const schema = z.object({
  id: z.string().optional(),
  label: z.string().default("Home"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7),
  country: z.string().default("Pakistan"),
  city: z.string().min(2),
  area: z.string().min(2),
  address: z.string().min(5),
  postalCode: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const GET = handle(async () => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const addresses = await prisma.address.findMany({
    where: { userId: auth.session.id },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });
  return ok({ addresses });
});

export const POST = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const input = schema.parse(await req.json());
  if (input.isDefault)
    await prisma.address.updateMany({ where: { userId: auth.session.id }, data: { isDefault: false } });
  const address = await prisma.address.create({
    data: { ...input, id: undefined, postalCode: input.postalCode || null, userId: auth.session.id },
  });
  return ok({ address });
});

export const PUT = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const input = schema.parse(await req.json());
  if (!input.id) return fail("id required");
  const existing = await prisma.address.findUnique({ where: { id: input.id } });
  if (!existing || existing.userId !== auth.session.id) return fail("Address not found.", 404);
  if (input.isDefault)
    await prisma.address.updateMany({ where: { userId: auth.session.id }, data: { isDefault: false } });
  const { id, ...data } = input;
  const address = await prisma.address.update({
    where: { id },
    data: { ...data, postalCode: input.postalCode || null },
  });
  return ok({ address });
});

export const DELETE = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  await prisma.address.deleteMany({ where: { id, userId: auth.session.id } });
  return ok({ deleted: true });
});
