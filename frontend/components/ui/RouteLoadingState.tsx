import { RouteFallbackFrame } from "@/components/ui/RouteFallbackFrame";

type RouteLoadingStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function RouteLoadingState({
  eyebrow,
  title,
  description,
}: RouteLoadingStateProps) {
  return (
    <RouteFallbackFrame
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-[28px] bg-white/55 dark:bg-white/5" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="h-28 animate-pulse rounded-[24px] bg-white/50 dark:bg-white/5" />
            <div className="h-28 animate-pulse rounded-[24px] bg-white/45 dark:bg-white/5" />
            <div className="h-28 animate-pulse rounded-[24px] bg-white/40 dark:bg-white/5" />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="h-36 animate-pulse rounded-[26px] bg-primary/12" />
          <div className="h-24 animate-pulse rounded-[24px] bg-cyan-400/10" />
          <div className="h-24 animate-pulse rounded-[24px] bg-amber-300/10" />
        </div>
      </div>
    </RouteFallbackFrame>
  );
}