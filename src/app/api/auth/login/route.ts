import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { login, AuthError } from "@/services/auth.service";

export const POST = handle(async (req: Request) => {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) return fail("Too many attempts. Try again later.", 429);
  const body = await req.json();
  try {
    const session = await login(body);
    return ok({ user: session });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, 401);
    throw e;
  }
});
