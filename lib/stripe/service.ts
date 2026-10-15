"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { verificarAssinaturaAtiva } from "@/lib/auth/assinatura";
import { obterPlano } from "@/lib/stripe/config";

/**
 * Gera URL de checkout Stripe para um plano.
 *
 * @param planoKey Chave do plano (basic, pro, enterprise)
 * @param successUrl URL para redirecionar após pagamento bem-sucedido
 * @param cancelUrl URL para redirecionar se usuário cancelar
 */
export async function gerarUrlCheckout(
  planoKey: "basic" | "pro" | "enterprise",
  successUrl: string,
  cancelUrl?: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const plano = obterPlano(planoKey);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "unauthenticated" };

  // Verificar se usuário já tem assinatura ativa
  const temAssinatura = await verificarAssinaturaAtiva(user.id);
  if (temAssinatura) {
    return { ok: false, error: "already_has_subscription" };
  }

  // Criar sessão de checkout Stripe
  try {
    // Em produção, isso seria feito via serverless function ou edge function
    // Aqui simulamos a chamada para a API Stripe
    const session = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planoKey,
        successUrl,
        cancelUrl,
      }),
    });

    const result = await session.json();

    if (!session.ok) {
      return { ok: false, error: result.error || "Erro ao criar sessão" };
    }

    return { ok: true, url: result.url };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido ao criar checkout",
    };
  }
}

/**
 * Rota para criar sessão de checkout no servidor.
 * Esta rota seria um edge function ou route handler puro.
 * Por ora, retorna um placeholder para ser implementado com a chave Stripe real.
 */
export async function criarSessaoCheckout(
  planoKey: "basic" | "pro" | "enterprise",
  successUrl: string,
  cancelUrl?: string,
): Promise<{ sessionId: string; url: string }> {
  const plano = obterPlano(planoKey);

  // Em um deployment real no Vercel, isso usaria a Secret Key do Stripe
  // e chamaria a API https://api.stripe.com/v1/checkout/sessions
  //
  // Exemplo de payload para a API Stripe:
  // {
  //   "payment_method_types": ["card"],
  //   "line_items": [{
  //     "price_data": {
  //       "currency": "brl",
  //       "product_data": {
  //         "name": `${plano.nome} - DeskcommCRM`,
  //       },
  //       "unit_amount": plano.preco_cents,
  //     },
  //     "quantity": 1,
  //   }],
  //   "mode": "subscription",
  //   "success_url": successUrl,
  //   "cancel_url": cancelUrl || successUrl,
  //   "customer_email": user.email,
  // }

  // Placeholder: em produção, substituir por chamada real à API Stripe
  const mockSessionId = `cs_test_mock_${planoKey}_${Date.now()}`;
  const mockUrl = `/api/stripe/return?session_id=${mockSessionId}`;

  return { sessionId: mockSessionId, url: mockUrl };
}

/**
 * Processar webhook do Stripe.
 * Esta rota recebe eventos do Stripe e atualiza o banco de dados.
 * Deve ser protegida com o endpoint secret do Stripe.
 */
export async function processarWebhookStripe(
  payload: string,
  signature: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  try {
    // Verificar assinatura do webhook
    // const event = stripe.webhooks.constructEvent(
    //   payload,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // );

    // Processar eventos comuns
    // switch (event.type) {
    //   case "checkout.session.completed":
    //     await lidarComCheckoutCompleto(event.data.object);
    //     break;
    //   case "invoice.payment_succeeded":
    //     await lidarComPagamentoSucedido(event.data.object);
    //     break;
    //   case "invoice.payment_failed":
    //     await lidarComPagamentoFalhou(event.data.object);
    //     break;
    // }

    // Por ora, apenas revalidar paths
    revalidatePath("/app/settings/billing");
    revalidatePath("/app");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao processar webhook",
    };
  }
}

/**
 * Lidar com checkout concluído - assinar o usuário no plano
 */
async function lidarComCheckoutCompleto(checkoutSession: any): Promise<void> {
  const supabase = await createClient();

  // Extrair user_id e plano do session
  // const customerId = checkoutSession.customer;
  // const planoKey = checkoutSession.metadata.planoKey;

  // Atualizar assinatura do usuário
  // await supabase
  //   .from("user_subscriptions")
  //   .upsert({
  //     user_id: /* user id */,
  //     status: "active",
  //     plano_key: planoKey,
  //     stripe_customer_id: customerId,
  //     stripe_subscription_id: checkoutSession.subscription,
  //     current_period_end: new Date(checkoutSession.current_period_end * 1000),
  //   });

  // Revalidar caminhos
  revalidatePath("/app/settings/billing");
  revalidatePath("/app");
}