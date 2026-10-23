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
