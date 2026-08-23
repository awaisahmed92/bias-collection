import { ok, handle } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const POST = handle(async () => {
  clearSessionCookie();
  return ok({ loggedOut: true });
});
