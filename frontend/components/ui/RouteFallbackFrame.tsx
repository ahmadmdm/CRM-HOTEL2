type RouteFallbackFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function RouteFallbackFrame({
  eyebrow,
  title,
  description,
  children,
}: RouteFallbackFrameProps) {
  return (
    <div className="relative min-h-[55vh] overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-white/92 via-[rgba(var(--surface-rgb),0.92)] to-[rgba(var(--surface-secondary-rgb),0.88)] p-6 shadow-[var(--shadow-panel)] backdrop-blur-2xl dark:border-white/10 md:p-8">
      <div className="pointer-events-none absolute inset-x-12 top-0 h-20 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-4rem] left-[-3rem] h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex min-h-[46vh] flex-col justify-between gap-8">
        <div className="space-y-3">
          <p className="section-kicker">{eyebrow}</p>
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-foreground md:text-4xl">
            {title}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}