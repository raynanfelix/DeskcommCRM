"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { acessoFoiRevogado } from "@/lib/auth/vinculo-revogado";
import { createRegistrationRequest } from "@/lib/auth/registration-requests";
import { ensureTenantForUser } from "@/lib/auth/provision";
import { modoDeCadastro } from "@/lib/auth/politica-de-cadastro";
import { organizationNameSchema } from "@/lib/auth/schemas";
import { audit } from "@/lib/audit";
import { authRateLimited, AUTH_LIMITS } from "@/lib/auth/rate-limit";

export type CriarOrganizacaoResult =
  | { ok: true; orgId: string }
  | {
      ok: false;
      error:
        | "validation_error"
        | "rate_limited"
        | "provision_failed"
        | "access_revoked";
    };

/**
 * Novo cadastro SaaS: pessoa sem conta nem organização cria uma nova
 * organização (tenant) nesta instalação e fica como admin fundador.
 *
 * Diferença para `recoverOrganization`:
 * - recoverOrganization: recupera/cria org em instalação já existente (self-host),
 *   pode exigir aprovação, convite, etc.
 * - criarOrganizacao: flow "greenfield" — o usuário está Fresh, não tem org,
 *   e quer começar do zero. A organização é criada imediatamente (sem pedido de
 *  aprovação a menos que a instalação esteja em `com_aprovacao`).
 *
 * Fluxo:
 * 1) Validar nome
 * 2) Verificar que o usuário não tem organização ativa
 * 3) Verificar rate limit
 * 4) Se `com_aprovacao` -> criar pedido de aprovação (como o recoverOrganization)
 * 5) Se não `com_aprovacao` -> provisionar organização imediatamente via
 *    `ensureTenantForUser` e redirecionar para onboarding
 */
export async function criarOrganizacao(name: string): Promise<CriarOrganizacaoResult> {
  const parsed = organizationNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: "validation_error" };

  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (activeOrg) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { ok: false, error: "provision_failed" };

  // Proteção contra quem tem acesso revogado — sem isso, quem perdeu o vínculo
  // poderia criar uma org nova e fingir que é "novo usuário".
  if (await acessoFoiRevogado(authUser.id)) {
    void audit({
      action: "auth.signup_provision_recusado",
      actorUserId: authUser.id,
      metadata: { motivo: "acesso_revogado" },
    });
    return { ok: false, error: "access_revoked" };
  }

  const decisao = await modoDeCadastro();
  const comAprovacao = decisao === "com_aprovacao";

  // Rate limit para criação de org
  if (await authRateLimited("org_creation", authUser.id, AUTH_LIMITS.org_creation)) {
    return { ok: false, error: "rate_limited" };
  }

  if (comAprovacao) {
    // Modo aprovação: criar pedido de registro (igual ao recoverOrganization)
    try {
      const pedido = await createRegistrationRequest(authUser.id, parsed.data);
      if (pedido.created) {
        void audit({
          action: "registration.requested",
          actorUserId: authUser.id,
          resourceType: "registration_request",
          resourceId: pedido.id,
        });
      }
      revalidatePath("/get-started");
      redirect("/get-started");
    } catch (error) {
      void audit({
        action: "auth.signup_provision_recovery_failed",
        actorUserId: authUser.id,
        metadata: { reason: error instanceof Error ? error.message : String(error) },
      });
      return { ok: false, error: "provision_failed" };
    }
  }

  // Modo imediato: provisionar organização agora mesmo
  try {
    const provisioned = await ensureTenantForUser(
      {
        id: authUser.id,
        email: authUser.email,
        user_metadata: { ...authUser.user_metadata, org_name: parsed.data },
      },
      { source: "signup" },
    );
    if (!provisioned.organizationId) {
      return { ok: false, error: "provision_failed" };
    }
    revalidatePath("/get-started");
    redirect(`/onboarding/welcome?org=${provisioned.organizationId}`);
  } catch (error) {
    void audit({
      action: "auth.signup_provision_failed",
      actorUserId: authUser.id,
      metadata: { reason: error instanceof Error ? error.message : String(error) },
    });
    return { ok: false, error: "provision_failed" };
  }
}