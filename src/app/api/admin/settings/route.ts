import { handle, ok, requirePermission, audit } from "@/lib/api";
import { getAllSettings, updateSettings } from "@/services/settings.service";

export const GET = handle(async () => {
  const auth = await requirePermission("settings.manage");
  if ("response" in auth) return auth.response;
  return ok({ settings: await getAllSettings() });
});

export const PUT = handle(async (req: Request) => {
  const auth = await requirePermission("settings.manage");
  if ("response" in auth) return auth.response;
  const values = await req.json();
  await updateSettings(values);
  await audit(auth.session.id, "update", "settings", null, Object.keys(values).join(", "));
  return ok({ settings: await getAllSettings() });
});
