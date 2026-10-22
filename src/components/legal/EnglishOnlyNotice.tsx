import { getI18n } from "@/i18n/server";

/** Shown above legal pages that only exist in English (pending professional translation). */
export async function EnglishOnlyNotice() {
  const { t, visitor } = await getI18n();
  if (visitor.locale === "en") return null;
  return <p className="mx-auto mt-10 max-w-3xl rounded-md bg-sky-50 px-4 py-2 text-sm text-sky-800" role="note">{t("legal.englishOnly")}</p>;
}
