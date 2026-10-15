/**
 * Configuração do Stripe para o modelo SaaS do DeskcommCRM.
 *
 * Planos disponíveis (definidos no dashboard Stripe ou via API):
 * - Plano Basic: R$ 49,90/mês - até 3 usuários, 500 contatos
 * - Plano Pro: R$ 99,90/mês - até 10 usuários, 2.500 contatos
 * - Plano Enterprise: R$ 199,90/mês - usuários ilimitados, 10.000 contatos
 *
 * Cada plano pode ter:
 * - trial_dias: período de teste (opcional)
 * - max_assentos: limite de usuários
 * - max_canais: limite de canais de comunicação
 * - teto_ia_usd_cents: limite de gastos em IA (em cents)
 *
 * Moeda: BRL (Real Brasileiro), fixada pelo CHECK no banco de dados.
 */

export const MOEDA = "brl";

export const PLANOS_PADRAO = {
  basic: {
    nome: "Basic",
    preco_cents: 4990, // R$ 49,90
    intervalo: "month",
    trial_dias: 7,
    max_assentos: 3,
    max_canais: 5,
    teto_ia_usd_cents: 50000, // R$ 500,00 em IA
  },
  pro: {
    nome: "Pro",
    preco_cents: 9990, // R$ 99,90
    intervalo: "month",
    trial_dias: 14,
    max_assentos: 10,
    max_canais: 15,
    teto_ia_usd_cents: 200000, // R$ 2.000,00 em IA
  },
  enterprise: {
    nome: "Enterprise",
    preco_cents: 19990, // R$ 199,90
    intervalo: "month",
    trial_dias: 30,
    max_assentos: null, // ilimitado
    max_canais: null, // ilimitado
    teto_ia_usd_cents: null, // ilimitado
  },
};

export type PlanoKey = "basic" | "pro" | "enterprise";

export type PlanoDef = (typeof PLANOS_PADRAO)[PlanoKey];

export function obterPlano(key: PlanoKey): PlanoDef {
  return PLANOS_PADRAO[key];
}