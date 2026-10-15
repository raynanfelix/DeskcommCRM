import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { processarWebhookStripe } from "@/lib/stripe/service";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    const result = await processarWebhookStripe(payload, signature);

    if (!result.ok) {
      return fail("webhook_error", result.error, 400);
    }

    return ok({ message: "Webhook processado com sucesso" });
  } catch (error) {
    return fail("internal_error", "Erro interno ao processar webhook.", 500);
  }
}