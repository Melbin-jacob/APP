// Runs once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { productionConfigProblems } = await import("./server/startup-checks");
  const { errors, warnings } = productionConfigProblems(process.env);
  for (const w of warnings) console.warn(JSON.stringify({ ts: new Date().toISOString(), level: "warn", type: "startup.config_warning", message: w }));
  if (errors.length) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", type: "startup.unsafe_config", errors }));
    console.error(`\nRefusing to start: unsafe production configuration.\n - ${errors.join("\n - ")}\n`);
    process.exit(1);
  }
}

/**
 * Errors while rendering pages, server components and actions (API routes
 * report their own, in route()). Emailed by error-alerts without visitor data.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
) {
  // Written as an if-block so the bundler leaves the Node-only import out of the edge build.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportError } = await import("./server/error-alerts");
    await reportError("page", err, {
      path: context.routePath ?? request.path,
      method: request.method,
      digest: (err as { digest?: string } | null)?.digest,
    });
  }
}
