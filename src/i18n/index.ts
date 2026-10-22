import type { ReactNode } from "react";
import type en from "./messages/en";
import { DEFAULT_LOCALE, type Locale } from "./locales";

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Messages = DeepString<typeof en>;
export type MessageKey = Paths<typeof en>;
export type Vars = Record<string, string | number>;

// Each locale is a separate chunk: a page only loads the language it shows.
const LOADERS: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import("./messages/en"),
  es: () => import("./messages/es"),
  fr: () => import("./messages/fr"),
  de: () => import("./messages/de"),
  pt: () => import("./messages/pt"),
  it: () => import("./messages/it"),
  zh: () => import("./messages/zh"),
  ja: () => import("./messages/ja"),
  ko: () => import("./messages/ko"),
  hi: () => import("./messages/hi"),
  ar: () => import("./messages/ar"),
  ru: () => import("./messages/ru"),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  return (await (LOADERS[locale] ?? LOADERS[DEFAULT_LOCALE])()).default;
}

const lookup = (messages: Messages, key: string): string | undefined =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages) as string | undefined;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;

export type T = ((key: MessageKey, vars?: Vars) => string) & {
  /** Like t(), but placeholders can be React nodes (links inside a sentence). */
  rich: (key: MessageKey, nodes: Record<string, ReactNode>) => ReactNode[];
  /** Looks up a dynamic key (e.g. a category slug); returns the fallback if missing. */
  maybe: (key: string, fallback: string, vars?: Vars) => string;
};

export function createT(messages: Messages): T {
  const t = ((key: MessageKey, vars?: Vars) => fill(lookup(messages, key) ?? key, vars)) as T;
  t.maybe = (key, fallback, vars) => fill(lookup(messages, key) ?? fallback, vars);
  t.rich = (key, nodes) =>
    (lookup(messages, key) ?? key).split(/(\{\w+\})/g).map((part) => {
      const name = part.match(/^\{(\w+)\}$/)?.[1];
      return name && name in nodes ? nodes[name] : part;
    });
  return t;
}
