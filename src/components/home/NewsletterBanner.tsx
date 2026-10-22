"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/providers/PreferencesProvider";
import { Icon } from "@/components/ui/Icon";
import { api, ClientApiError } from "@/lib/api-client";

const BG = "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=60";

export function NewsletterBanner() {
  const t = useT();
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: (e: string) => api("/api/newsletter", { method: "POST", json: { email: e } }) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    m.mutate(email);
  };

  return (
    <section className="relative isolate my-10 overflow-hidden rounded-lg border-b-4 border-accent-500">
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${BG})` }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-ink-900/70" aria-hidden="true" />
      <div className="px-6 py-14 text-center">
        <h2 className="mx-auto max-w-2xl text-2xl font-bold text-white sm:text-3xl">
          {t("newsletter.title")}
        </h2>
        {m.isSuccess ? (
          <p className="mt-6 text-sm text-white" role="status">{t("newsletter.thanks")}</p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md items-center rounded-full bg-white p-1.5 shadow-lg">
            <Icon name="mail" className="ms-3 h-4 w-4 text-ink-500" />
            <label htmlFor="nl-email" className="sr-only">{t("newsletter.email")}</label>
            <input
              id="nl-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletter.placeholder")}
              className="flex-1 bg-transparent px-3 text-sm outline-none"
            />
            <button type="submit" disabled={m.isPending} aria-label={t("newsletter.subscribe")} className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white hover:bg-brand-600">
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
        )}
        {m.error && (
          <p className="mt-3 text-sm text-rose-200" role="alert">
            {m.error instanceof ClientApiError && m.error.status === 429 ? m.error.message : t("common.somethingWrong")}
          </p>
        )}
      </div>
    </section>
  );
}
