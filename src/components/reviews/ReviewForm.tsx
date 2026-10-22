"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { cn } from "@/lib/format";


export function ReviewForm(props: { token: string; businessName: string; profileHref: string; defaultName: string; defaultRating: number }) {
  const t = useT();
  const labels = ["", t("review.r1"), t("review.r2"), t("review.r3"), t("review.r4"), t("review.r5")];
  const [rating, setRating] = useState(props.defaultRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState(props.defaultName);

  const m = useMutation({
    mutationFn: () =>
      api<{ status: "PUBLISHED" | "PENDING_MODERATION" }>("/api/reviews", {
        method: "POST",
        json: { token: props.token, rating, comment: comment.trim() || undefined, authorName },
      }),
  });

  if (m.isSuccess) {
    return (
      <div className="mt-6 text-center" role="status">
        <p className="text-4xl text-accent-500">★</p>
        <h2 className="mt-2 text-lg font-semibold">{t("review.thanks")}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {m.data.status === "PUBLISHED" ? t("review.live", { name: props.businessName }) : t("review.pending")}
        </p>
        <Link href={props.profileHref} className="btn-primary mt-6">{t("review.viewProfile")}</Link>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rating) m.mutate();
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <fieldset>
        <legend className="label">{t("review.rating")}</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span aria-hidden="true" className={cn("text-4xl transition", (hover || rating) >= n ? "text-accent-500" : "text-ink-200")}>★</span>
              <span className="sr-only">{n === 1 ? t("review.starOne") : t("review.starOther", { count: n })}</span>
            </label>
          ))}
          <span className="ms-3 text-sm text-ink-500">{labels[hover || rating]}</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="comment" className="label">{t("review.comment")} <span className="font-normal text-ink-500">{t("review.optional")}</span></label>
        <textarea id="comment" rows={5} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="input" placeholder={t("review.commentPlaceholder")} />
        <p className="mt-1 text-end text-xs text-ink-500">{comment.length}/2000</p>
      </div>
      <div>
        <label htmlFor="authorName" className="label">{t("review.name")}</label>
        <input id="authorName" required maxLength={60} value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="input" placeholder={t("review.namePlaceholder")} />
      </div>
      {m.error && (
        <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">
          {m.error instanceof ClientApiError && m.error.code === "token_invalid" ? t("review.usedLink")
            : m.error instanceof ClientApiError && m.error.status === 429 ? m.error.message
            : t("common.somethingWrong")}
        </p>
      )}
      <button type="submit" disabled={!rating || m.isPending} className="btn-primary w-full">
        {m.isPending ? t("review.submitting") : t("review.submit")}
      </button>
      <p className="text-[11px] text-ink-500">
        {t.rich("review.confirm", { terms: <Link key="terms" href="/terms" className="underline">{t("review.terms")}</Link> })}
      </p>
    </form>
  );
}
