"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { cn } from "@/lib/format";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm(props: { token: string; businessName: string; profileHref: string; defaultName: string; defaultRating: number }) {
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
        <h2 className="mt-2 text-lg font-semibold">Thank you!</h2>
        <p className="mt-1 text-sm text-ink-500">
          {m.data.status === "PUBLISHED"
            ? `Your review is now live on ${props.businessName}'s profile.`
            : "Your review has been received and will appear once our team has checked it."}
        </p>
        <Link href={props.profileHref} className="btn-primary mt-6">View profile</Link>
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
        <legend className="label">Your rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span aria-hidden="true" className={cn("text-4xl transition", (hover || rating) >= n ? "text-accent-500" : "text-ink-200")}>★</span>
              <span className="sr-only">{n} star{n > 1 && "s"}</span>
            </label>
          ))}
          <span className="ml-3 text-sm text-ink-500">{LABELS[hover || rating]}</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="comment" className="label">Your comments <span className="font-normal text-ink-500">(optional)</span></label>
        <textarea id="comment" rows={5} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="input" placeholder="Quality of work, punctuality, value for money…" />
        <p className="mt-1 text-right text-xs text-ink-500">{comment.length}/2000</p>
      </div>
      <div>
        <label htmlFor="authorName" className="label">Name shown with your review</label>
        <input id="authorName" required maxLength={60} value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="input" placeholder="e.g. Sarah K." />
      </div>
      {m.error && (
        <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-700">
          {m.error instanceof ClientApiError ? m.error.message : "Something went wrong. Please try again."}
        </p>
      )}
      <button type="submit" disabled={!rating || m.isPending} className="btn-primary w-full">
        {m.isPending ? "Submitting…" : "Submit Review"}
      </button>
      <p className="text-[11px] text-ink-500">
        By submitting you confirm this review reflects your genuine experience. Reviews are subject to our <Link href="/terms" className="underline">Terms</Link>.
      </p>
    </form>
  );
}
