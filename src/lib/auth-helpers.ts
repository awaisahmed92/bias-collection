import { redirect } from "next/navigation";
import { getSession, isStaff, type SessionUser } from "@/lib/auth";

export { getSession, isStaff };

/** Server-component guard: redirects to login (or home for customers). */
export async function requireAuth(staffOnly = true): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (staffOnly && !isStaff(session)) redirect("/");
  return session;
}
