import { cache } from "react";
import { getVisitor } from "@/server/visitor";
import { createT, loadMessages } from ".";

/** Translator + visitor context for server components and route handlers. */
export const getI18n = cache(async () => {
  const visitor = await getVisitor();
  const messages = await loadMessages(visitor.locale);
  return { t: createT(messages), messages, visitor };
});
