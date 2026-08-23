import { ok, handle } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const GET = handle(async () => {
  const session = await getSession();
  return ok({ user: session });
});
