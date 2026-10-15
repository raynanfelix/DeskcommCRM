"use client";

import { useState, useTransition } from "react";

import { useT } from "@/hooks/i18n/useT";
import { criarOrganizacao } from "@/app/actions/auth/criarOrganizacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MENSAGENS: Record<string, string> = {
  validation_error: "Informe um nome de empresa com 2 a 120 caracteres.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  provision_failed:
    "Não foi possível criar a organização agora. Tente novamente ou contate o suporte.",
  sucesso: "Organização criada! Redirecionando para o onboarding…",
};

export function CriarOrganizacaoForm({
  nomeSugerido,
  comAprovacao = false,
}: {
  nomeSugerido?: string;
  /** Instalação em `com_aprovacao`: o envio vira pedido, e o botão diz isso. */
  comAprovacao?: boolean;
}) {
  const t = useT();
  const [name, setName] = useState(nomeSugerido ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await criarOrganizacao(name);
      if (!result.ok) {
        setError(
          t(MENSAGENS[result.error] ?? MENSAGENS.provision_failed!),
        );
      } else {
        // Sucesso: redireciona para o onboarding da nova organização
        // O resultado contém o orgId e o próximo passo
        window.location.href = `/onboarding?org=${result.orgId}&step=welcome`;
      }
    });
  }

  return (
    <form method="post" className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-org-name">{t("Nome da empresa")}</Label>
        <Input
          id="new-org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="organization"
          autoFocus
          disabled={isPending}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={isPending || name.trim().length < 2}>
        {isPending
          ? t("Criando sua empresa…")
          : comAprovacao
            ? t("Enviar pedido de aprovação")
            : t("Continuar para o onboarding")}
      </Button>
    </form>
  );
}