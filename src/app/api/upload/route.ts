import { handle, ok, fail, requireAuth } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { uploadFile } from "@/services/upload.service";

export const POST = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  if (!isStaff(auth.session)) return fail("Forbidden.", 403);

  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") || "products");
  if (!(file instanceof File)) return fail("No file provided.");
  const result = await uploadFile(file, folder);
  return ok(result);
});
