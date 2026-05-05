"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { RouteFallbackFrame } from "@/components/ui/RouteFallbackFrame";

type RouteErrorStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  retryLabel?: string;
  reset: () => void;
};

export function RouteErrorState({
  eyebrow,
  title,
  description,
  retryLabel = "إعادة المحاولة",
  reset,
}: RouteErrorStateProps) {
  return (
    <RouteFallbackFrame
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="surface-card space-y-4 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">تم إيقاف هذا المسار مؤقتًا لحماية حالة التطبيق.</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              يمكنك إعادة تحميل هذا الجزء فقط دون فقدان بنية الصفحة كاملة.
            </p>
          </div>
        </div>

        <div className="surface-card flex flex-col gap-4 p-6">
          <div className="space-y-2">
            <p className="section-kicker">استعادة الاتصال</p>
            <p className="text-lg font-semibold text-foreground">أعد مزامنة الصفحة مع الخادم</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="primary-action w-full"
          >
            <RefreshCcw className="h-4 w-4" />
            {retryLabel}
          </button>
        </div>
      </div>
    </RouteFallbackFrame>
  );
}