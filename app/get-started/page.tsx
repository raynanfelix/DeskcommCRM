import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { marcaDaSaida } from "@/lib/branding/saida";
import { RecoverOrganizationForm } from "@/components/auth/RecoverOrganizationForm";
import { criarOrganizacaoForm } from "@/components/auth/CriarOrganizacaoForm";
import { modoDeCadastro } from "@/lib/auth/politica-de-cadastro";
import { estadoDoPedido } from "@/lib/auth/registration-requests";
import { traduzir } from "@/lib/i18n/dicionario";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

/**
 * Ponto de entrada para quem não tem organização.
 * Suporta dois fluxos:
 * 1) Recuperar/criar organização em instalação existente (self-host / MVP)
 * 2) Novo cadastro SaaS: criar uma nova organização (tenant) e conta.
 *
 * Fluxo 1 (existente): quem tem e-mail confirmado mas sem org -> tela de
 * definição de nome da empresa + formulário de recuperação/criação.
 * Fluxo 2 (SaaS): quem ainda não tem conta ou quer uma instância nova ->
 * formulário de criação de organização + plano.
 *
 * As portas de chegada são:
 * - /get-started vindo de auth flow sem organização
 * - /login sem organização prévia
 * - Qualquer usuário sem activeOrg redirecionado aqui
 */
export const dynamic = "force-dynamic";

export default async function GetStartedPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);

  // Quem já tem organização redireciona para o app
  if (activeOrg) redirect("/app/inbox");

  // O nome sugerido vem do user_metadata do Supabase Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const nomeSugerido = (authUser?.user_metadata?.org_name as string | undefined) ?? undefined;

  // Fora da árvore de `app/app/layout.tsx`, como as telas públicas: o idioma
  // vem do próprio usuário, e o formulário precisa do provider para o `useT()`.
  const t = (texto: string) => traduzir(texto, user.idioma);

  // COM APROVAÇÃO (migration 0383): a mesma tela vira pedido de aprovação.
  // Com a chave desligada, esta tela faz exatamente o que fazia antes.
  const comAprovacao = (await modoDeCadastro()) === "com_aprovacao";
  const pedido = comAprovacao ? await estadoDoPedido(user.id) : null;
  const aguardando = pedido === "pending" || pedido === "rejected";

  // Resolvedor de marca: banco vence sobre .env
  const marca = await marcaDaSaida(null);

  return (
    <IdiomaProvider locale={user.idioma}>
      <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {marca.nome}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {pedido === "pending"
                ? t("Pedido enviado")
                : pedido === "rejected"
                  ? t("Pedido não aprovado")
                  : t("Configure sua organização")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {pedido === "pending"
                ? t(
                    "Seu pedido para abrir a empresa está com quem administra esta instalação. Quando ele for aprovado, é só entrar de novo.",
                  )
                : pedido === "rejected"
                  ? t(
                      "Quem administra esta instalação não aprovou o pedido. Se você recebeu um convite, use o link que chegou no seu e-mail.",
                    )
                  : comAprovacao
                    ? t(
                        "Sua conta foi confirmada. Nesta instalação, a empresa só é criada depois da aprovação de quem administra. Confira o nome da empresa e envie o pedido.",
                      )
                    : t(
                        "Sua conta foi confirmada, mas a organização inicial ainda não foi criada. Informe o nome da sua empresa para concluir o primeiro acesso e abrir o onboarding do CRM.",
                      )}
            </p>
          </div>

          {/* Formulário: mostra recuperação SE houver pedido pendente/rejeitado OU
              ainda não houver org + comAprovacao TRUE.
              Caso contrário, mostra o formulário de criação de nova organização (SaaS). */}
          {((pedido === "pending" || pedido === "rejected") || (comAprovacao && !activeOrg))
            ? (
                //! Se há pedido pendente/rejeitado OU (aprovado mas sem org) -> mostra recuperação
                <RecoverOrganizationForm nomeSugerido={nomeSugerido} comAprovacao={comAprovacao} />
              )
            : //! Senão -> SaaS: mostrar formulário de criação de nova organização
              <criarOrganizacaoForm nomeSugerido={nomeSugerido} comAprovacao={comAprovacao} />
          }

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              "Se você recebeu um convite, não crie uma organização nova. Use o link do convite ou peça ao administrador para reenviá-lo.",
            )}
          </p>
        </div>
      </main>
    </IdiomaProvider>
  );
}