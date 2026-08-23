import { handle, ok, fail, requirePermission, audit } from "@/lib/api";
import { listBanners, createBanner, updateBanner, deleteBanner } from "@/services/cms.service";

export const GET = handle(async () => {
  const auth = await requirePermission("cms.manage");
  if ("response" in auth) return auth.response;
  return ok({ banners: await listBanners() });
});

export const POST = handle(async (req: Request) => {
  const auth = await requirePermission("cms.manage");
  if ("response" in auth) return auth.response;
  const body = await req.json();
  try {
    const banner = body.id ? await updateBanner(String(body.id), body) : await createBanner(body);
    await audit(auth.session.id, body.id ? "update" : "create", "banner", banner.id, banner.title || banner.position);
    return ok({ banner });
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
  await deleteBanner(id);
  await audit(auth.session.id, "delete", "banner", id);
  return ok({ deleted: true });
});
