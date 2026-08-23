import { z } from "zod";
import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { notifyAdmins } from "@/services/notification.service";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const POST = handle(async (req: Request) => {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 60_000)) return fail("Too many messages. Try later.", 429);
  const input = schema.parse(await req.json());
  await notifyAdmins({
    type: "ADMIN_CONTACT",
    title: `Contact form: ${input.name}`,
    message: `${input.email} says: ${input.message}`,
  });
  return ok({ sent: true, message: "Thanks for reaching out — we usually reply within 24 hours." });
});
