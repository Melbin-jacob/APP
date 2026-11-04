"use client";

import { useEffect } from "react";

const sent = new Set<string>();

/** Sends one browser error to our own server (never a third party). Best effort. */
export function sendClientError(err: { name?: string; message: string; stack?: string; digest?: string }) {
  const key = `${err.name}:${err.message}`;
  if (sent.has(key) || sent.size >= 5) return; // a handful per page view at most
  sent.add(key);
  fetch("/api/client-errors", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...err, message: err.message.slice(0, 1000), stack: err.stack?.slice(0, 4000), path: location.pathname }),
  }).catch(() => {});
}

// Only errors from our own scripts: browser extensions and injected code
// produce noise we can't fix.
const ours = (file?: string, stack?: string) =>
  (!!file && file.startsWith(location.origin)) || (!!stack && stack.includes(`${location.origin}/_next/`));

/** Reports uncaught script errors and promise rejections from this site's code. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const err = e.error instanceof Error ? e.error : undefined;
      if (ours(e.filename, err?.stack)) sendClientError({ name: err?.name, message: e.message, stack: err?.stack });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const err = e.reason instanceof Error ? e.reason : undefined;
      if (err && ours(undefined, err.stack)) sendClientError({ name: err.name, message: err.message, stack: err.stack });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
