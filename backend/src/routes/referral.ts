import type { FastifyInstance } from "fastify";
import { z } from "zod";

const bodySchema = z.object({
  wallet: z.string().min(1),
  referrerWallet: z.string().min(1),
  signature: z.string().min(1)
});

export async function referralRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/referral/bind", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, message: "参数不合法" });
    }

    const { wallet, referrerWallet } = parsed.data;
    if (wallet === referrerWallet) {
      return reply.code(400).send({ ok: false, message: "不可自关联" });
    }

    return { ok: true };
  });
}
