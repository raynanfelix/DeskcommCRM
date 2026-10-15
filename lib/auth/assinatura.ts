/**
 * Módulo de verificação de assinatura ativa.
 *
 * Verifica se um usuário possui uma assinatura ativa neste domínio.
 * Usado para evitar que usuários criem novas organizações/planos
 * quando já possuem assinatura vigente.
 *
 * A implementação completa exigiria uma tabela `user_subscriptions`
 * com campos: user_id, status, plano_key, stripe_customer_id, etc.
 * Por ora, implementa uma verificação básica baseada em
 * `user_organizations` ativas.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Verifica se o usuário possui assinatura ativa.
 *
 * @param userId ID do usuário do Supabase Auth
 * @returns true se o usuário tem assinatura ativa, false caso contrário
 */
export async function verificarAssinaturaAtiva(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Verifica se o usuário tem organização ativa (mínima verificação)
    // Em um deployment futuro, substituir por query em tabela user_subscriptions
    const { data, error } = await supabase
      .from("user_organizations")
      .select("id, role, revoked_at")
      .eq("user_id", userId)
      .not("revoked_at", "is", null)
      .limit(1)
      .single();

    if (error || !data) {
      return false;
    }

    // Se tem organização não revogada, considera como "tem assinatura"
    // Em um futuro mais avançado, isso seria uma tabela de assinaturas pagas
    return true;
  } catch {
    return false;
  }
}