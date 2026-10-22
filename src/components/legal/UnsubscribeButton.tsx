"use client";

import { useMutation } from "@tanstack/react-query";
import { useT } from "@/components/providers/PreferencesProvider";
import { api } from "@/lib/api-client";

export function UnsubscribeButton({ token }: { token: string }) {
  const t = useT();
  const m = useMutation({ mutationFn: () => api(`/api/email/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST" }) });
  if (m.isSuccess) return <p role="status" className="rounded-md bg-brand-50 p-3 text-sm text-brand-700">{t("unsubscribe.done")}</p>;
  return (
    <>
      <button type="button" className="btn-primary" disabled={m.isPending} onClick={() => m.mutate()}>{t("unsubscribe.confirm")}</button>
      {m.isError && <p role="alert" className="text-sm text-rose-700">{t("common.somethingWrong")}</p>}
    </>
  );
}
