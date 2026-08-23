import { z } from "zod";
import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import prisma from "@/lib/db";

const schema = z.object({ email: z.string().email("Please enter a valid email address.") });

export const POST = handle(async (req: Request) => {
  if (!rateLimit(`newsletter:${clientIp(req)}`, 5, 60_000)) return fail("Too many attempts.", 429);
  const { email } = schema.parse(await req.json());
  await prisma.newsletterSubscriber.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase() },
  });
  return ok({ subscribed: true, message: "You're on the list. Welcome to the world of Bias." });
});
