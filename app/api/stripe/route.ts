import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { gerarUrlCheckout } from "@/lib/stripe/service";
import { modoDeCadastro } from "@/lib/auth/politica-de-cadastro";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planoKey, successUrl, cancelUrl } = body;

    if (!planoKey || !successUrl) {
      return fail("missing_data", "Dados incompletos: planoKey e successUrl são obrigatórios.", 400);
    }

    // Verificar se instalação está em modo de aprovação
    const comAprovacao = (await modoDeCadastro()) === "com_aprovacao";

    // Gerar URL de checkout
    const result = await gerarUrlCheckout(planoKey, successUrl, cancelUrl);

    if (!result.ok) {
      return fail("checkout_error", result.error, 400);
    }

    // Se modo aprovação, criar pedido de registro primeiro
    if (comAprovacao) {
      // O fluxo seria: criar pedido -> usuário paga -> admin aprova -> org criada
      // Por ora, redirecionamos direto para o checkout
    }

    return ok({ url: result.url }, { requestId: randomUUID() });
  } catch (error) {
    return fail("internal_error", "Erro interno ao processar checkout.", 500);
  }
}

function randomUUID() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).substr(2, 9);
}