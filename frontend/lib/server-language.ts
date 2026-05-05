import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME, normalizeLanguage } from "@/lib/language";

export function getRequestLanguage() {
  return normalizeLanguage(cookies().get(LANGUAGE_COOKIE_NAME)?.value);
}