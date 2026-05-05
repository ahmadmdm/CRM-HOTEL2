"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, t } = useI18n();
  const setLanguage = useUIStore((state) => state.setLanguage);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-2xl border border-white/45 bg-white/60 p-1 text-muted-foreground shadow-sm dark:border-white/10 dark:bg-white/5",
        compact ? "h-11" : "w-fit"
      )}
      title={t("تبديل اللغة", "Switch language")}
      aria-label={t("تبديل اللغة", "Switch language")}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground">
        <Languages className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage("ar")}
        className={cn(
          "rounded-xl px-3 py-2 text-xs font-semibold transition-all",
          language === "ar" ? "bg-slate-950 text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "rounded-xl px-3 py-2 text-xs font-semibold transition-all",
          language === "en" ? "bg-slate-950 text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        English
      </button>
    </div>
  );
}