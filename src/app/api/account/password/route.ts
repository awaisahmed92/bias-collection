import { handle, ok, fail, requireAuth } from "@/lib/api";
import { changePassword, AuthError } from "@/services/auth.service";

export const POST = handle(async (req: Request) => {
  const auth = await requireAuth();
  if ("response" in auth) return auth.response;
  const { currentPassword, newPassword } = await req.json();
  try {
    await changePassword(auth.session.id, currentPassword, newPassword);
    return ok({ changed: true });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, 400);
    throw e;
  }
});
